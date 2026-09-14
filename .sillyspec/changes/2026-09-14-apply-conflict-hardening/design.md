---
author: qinyi
created_at: 2026-09-14 14:05:00
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-14-apply-conflict-hardening

## 背景

2026-09-14-quick-exit-tiered-gates 归档 apply 后，12 个交付文件在主仓被并行会话的工作区级 git 操作冲掉（新文件删除、修改回退），靠 smoke 测试才暴露（troubleshooting §64）。代码级归因：自动主路径（patch + `git apply --3way` 隐含 `--index`）与脏重叠三方合并（mergeDirtyOverlapThreeWay）已覆盖大部分面，真实缺口两条——①merge clean 写回（worktree-apply.js:143 writeFileSync）不进暂存区，是全链路唯一未暂存的自动写点；②apply 与活跃 quick 会话的在途文件集可重叠落地，无前置拦截。人工 rescue 路径落地未暂存是本次事故实际路径（护栏=提示文案收窄）。

## 设计目标

1. merge 写回全部进暂存区（含该批新增文件），消灭唯一自动缺口（D-001 前半）；
2. apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，patch∪merge 全落盘面），使 apply 后丢失/篡改可检测（D-001 后半）；
3. apply 前对活跃 quick 会话 guard.json 文件集做相交 fail-closed 检测，非空交集拒绝 apply、--force 显式解锁留痕（D-002）；
4. rescue 提示补「落地后立即 git add 锁定」指引（D-003）；
5. doctor 既有检查项形态新增 manifest 漂移检测（advisory，D-005）；ROADMAP 记 D-004 观察项。

## 非目标

- 不做文件所有权登记表（claims+心跳）——裸 git 拦不住，单独做收益不抵复杂度，复潮条件记 ROADMAP（D-004）；
- 不改自动主路径（patch+--3way 已含 --index，零缺口）；
- 不新增命令/步骤/占位符（doctor 检查项为既有形态内追加）；
- 漂移检测 advisory 起步，升 blocking 另立变更（D-3 先例）；
- 不拦截并行会话自身的 git 操作（超出工具边界，§64 已如实声明盲区）；
- manifest 检测面=**CLI 落盘面**（patch/merge/3way 三出口）——rescue 人工落地文件不进 manifest（本次事故实际路径），人工面的收窄靠 D-003 指引（立即 git add），宣称「apply 后丢失可检测」以此边界为限。

## 拆分判断

不拆分：三段改动（写回收口/相交拦截/检测面）共享同一事故根因与验收语境，拆开产生中间态不一致。不批量：无重复模式。规模判 large 依据：跨 worktree/change-management/core-engine 三模块 + 新检测面 + fail-closed 语义决策（虽文件数少于上一变更，但语义判据选道按 D-006 条款「有需落盘的设计决策」走完整流程）。

## 总体方案

**Wave 1 信号与收口**：mergeDirtyOverlapThreeWay 写回循环内、每个 clean 合并文件写盘后收集；批末统一 `git add -- <显式 pathspec>`（safeGit 数组形式）。applyWorktree **三条成功出口统一调 writeApplyManifest**（withMainRepoLock 锁内）写 apply-manifest.json 到变更目录：`{ schemaVersion: 1, change, appliedAt, baseHash, files: [{path, sha256}] }`——①patch 主路径成功尾声（:1281 区域）；②applyByMerge 成功点（显式 --merge :1026 与 ENOBUFS 自动降级 :1358-1364 两条提前 return 出口——Grill gap 修正：原稿只覆盖主路径漏此面）；③mergeDirtyOverlap 写回后的主流程继续。files 按各出口实际落盘清单（patch 面∪merge 写回面）；CLI 全权写，agent 勿手改（verify-facts 同款契约）。

**Wave 2 相交拦截**：src/quicklog.js 新导出 `collectActiveQuickGuardFiles(specBase, opts)`——活跃判定显式化：guard 目录存在即活跃（quick --done 完成时清理 guard，完成态天然退出）∪ 7 天僵尸窗口兜底（异常残留不钉死，collectGuardReservedQuicklogIds 同款口径），返回 `Map<会话ID, allowedFiles[]>`（排除自身 change 的 quick 会话）。**预检内嵌 applyWorktree 自身**（全部入口自动覆盖：CLI `apply` 命令与 src/index.js:2902? assess 自动 apply 均经 applyWorktree——Grill 复核修正：complete-handlers.js 无 applyWorktree 调用，归档遇未 apply 变更只保留 worktree 提示人工，原「archive 内置 apply」锚点作废）：锁内调用 → 与本次 apply 文件集（**changedFiles∪newPatchFiles**，result 实际字段——Grill 修正：原稿 newFiles 悬空）求交集 → 非空即抛结构化错误（fail-closed exit 1）：列出冲突会话×文件对、串行化指引（等对方 --done 或显式 --force）；`--force` **新 CLI flag**（src/index.js:2724-2727 apply 分支解析 + usage 文案 + opts 透传 :2758-2759——Grill 阻断 1：现无该 flag）解锁并在 result 对象留 `overlapForced` 痕迹。**入口区分机制（Grill 复审项 18 定案）**：applyWorktree opts 新增 `autoApply` 标记——assess 自动入口（src/index.js:2902?）置 true，CLI apply 入口缺省 false。交集非空时三分支：opts.force → 放行+result.overlapForced 留痕；opts.autoApply → **软跳过自动落盘**（result.overlapSkipped=true + warning 指引人工评估，不抛错——无人值守不越权也不阻断审计流）；其余 → 抛结构化错误 exit 1（人工入口给完整拦截信息与 --force 指引）。勿用 changes.last_active 当活跃判定（非周期心跳，D-002）。

**Wave 3 检测面与规则面**：doctor-diagnostics.js 既有检查项（dimensions 数组 :958 形态）追加 apply-manifest 漂移检查——扫描面=**活跃 changes/*/apply-manifest.json ∪ 归档 changes/archive/*/apply-manifest.json**（统一口径，R-03 对齐），按 **appliedAt 降序**取前 5；双态比对算子（Grill gap 修正：git blob hash 是 sha1 与指纹 sha256 异构，不可直接比）——**两态均算内容 sha256**：worktree 态=readFile 后 sha256；staged 态=`git show :<path>` 内容 sha256。判定矩阵：worktree≠manifest → 落盘面漂移（丢失/被改）；staged≠manifest → 暂存面漂移（index 被动过）；文件缺失 → 丢失。advisory 告警行含变更名×文件×期望/实际短 hash。ROADMAP.md 记 D-004 观察项（所有权登记不做+复潮条件）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/worktree-apply.js | ①mergeDirtyOverlapThreeWay 写回批末补 git add（:143 区域）②applyWorktree 成功尾声写 apply-manifest.json（锁内）③guard 相交 fail-closed 预检（锁内，--force 解锁留 result.overlapForced）④rescue 输出补 git add 指引行。数据流：producer=本文件（写回+manifest）→ consumers=doctor-diagnostics.js（漂移检测读 manifest）、apply 调用方（result 对象） |
| 修改 | src/index.js | apply 命令分支新增 --force flag 解析（:2724-2727 区域）+ usage 文案（:2721/:2673）+ opts 透传（:2758-2759）——Grill 阻断 1：--force 现无 CLI 入口。数据流：producer=flag 解析 → applyWorktree opts.force → consumer=Wave 2 预检解锁）+ assess 入口置 opts.autoApply=true（:2902，软跳过语义） |
| 修改 | src/quicklog.js | 新导出 collectActiveQuickGuardFiles（活跃 guard allowedFiles 收集，口径与 collectGuardReservedQuicklogIds 同源；排除指定 change 自身）。数据流：producer=guard.json 盘面 → 本函数 → consumer=worktree-apply.js 预检 |
| 修改 | src/doctor-diagnostics.js | 既有检查项形态追加 apply-manifest 漂移检查（advisory：两态内容 sha256 vs 指纹三分支矩阵；活跃∪归档 glob 收集按 appliedAt 降序取前 5） |
| 修改 | .sillyspec/ROADMAP.md | D-004 观察项一行（所有权登记不做；复潮条件=本护栏落地后仍实际损失 ≥2 次） |
| 修改 | docs/sillyspec/troubleshooting.md | §64 标题状态「护栏结论已立项方向」→「已修复/落档」（Wave 3 收尾时按实际落地态更新） |
| 新增 | NEW:test/apply-conflict-hardening.test.mjs | 四块：merge 写回后 staged 断言（含新增文件）；manifest 生成/篡改检测（改一字节后 doctor 检查告警）；guard 相交四态（空集放行/交集拦截 exit 1/--force 放行留痕/autoApply 软跳过+warning）；rescue 文案含指引 |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.md | 模块卡记录写回收口/manifest/相交拦截 |
| 修改 | .sillyspec/docs/sillyspec/modules/change-management.md | 模块卡记录 collectActiveQuickGuardFiles 导出 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块卡记录 doctor 漂移检查项 |

## 接口定义

```js
// src/quicklog.js
export function collectActiveQuickGuardFiles(specBase, { excludeChange, sessionsDir } = {})
// 返回 Map<quickSessionId, string[]>（该会话 guard.allowedFiles；无 guard/无声明→空数组）
// 活跃口径：guard 存在且 7 天内（复用 collectGuardReservedQuicklogIds 僵尸窗口）

// src/worktree-apply.js（内部）
function writeApplyManifest({ projectRoot, specBase, changeName, baseHash, files })
// files: [{path, sha256}]；写入 <changeDir>/apply-manifest.json（已存在则覆盖——重放 apply 以最新为准）
function checkGuardOverlap({ activeGuards, applyFiles /* changedFiles∪newPatchFiles */, selfChange })
// 返回 { overlaps: [{sessionId, file}], blocked: boolean }

// manifest schema
{ schemaVersion: 1, change: string, appliedAt: ISO8601, baseHash: string,
  files: [{ path: string, sha256: string }] }
// 哈希口径（plan-review GAP-1 定案，AGENTS.md 规则 13 Windows 兼容）：manifest 的 sha256 一律算
// **staged blob 内容**（git show :<path>，autocrlf 归一后的 LF 规范态）——写侧在 git add 后取值，
// 与 doctor 的 staged 态比对天然同基；doctor 的 worktree 态比对先做 CRLF→LF 归一再算 sha256
// （防 autocrlf=true 工作区 CRLF 与 blob LF 恒异的误报）
```

## 生命周期契约表

不涉及生命周期契约（本变更不新增或修改任何流程事件定义与状态流转；apply/guard/doctor 检查沿用既有链路）。

## 数据模型

无 schema/DB 变更。apply-manifest.json 为变更目录内新文档产物（不进 DB、不加表）。

## 兼容策略（brownfield 必填）

- 存量变更目录无 manifest：doctor 检查按存在性跳过（零输出零告警）；
- 无活跃 quick 会话/活跃会话无 guard 声明：相交为空集，apply 行为与现状完全一致；
- `--force` 未传且无交集：零行为变化；有交集时从「默默落地互冲」变为「拒绝+指引」——这是本变更的目的性变化，非回归；
- merge 写回 add 失败（git 异常）：不阻断 apply 本身（fail-open 到现状+warning），manifest 仍如实记录实际落盘面；
- doctor 检查 advisory：不改变 doctor 现有退出码语义。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 相交误判（对方 quick 会话声明了文件但实际已搁置）阻断 apply | P1 | 7 天僵尸窗口收窄活跃面 + --force 显式解锁 + 拦截信息列全会话×文件对供人判断 |
| R-02 | manifest 与实际落盘面的口径差（apply 后又有其他合法写入） | P2 | doctor 比对含 staged∪worktree 双态 + advisory 不阻断；manifest 记录 appliedAt 时点语义 |
| R-03 | 归档已含 manifest 的变更随目录移动路径变化 | P2 | doctor 扫描面=活跃∪归档两目录 glob 统一收集（目录移动即换扫描桶，manifest 自身 change 字段仅作显示名），与 Wave 3 口径一致 |
| R-04 | 测试对真实 git 仓库形态的依赖（staged 断言需真暂存） | P2 | 测试用临时 init 仓（仓内既有 e2e 先例），不 mock git |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1/2；总体方案 Wave 1；接口定义 writeApplyManifest；文件清单 worktree-apply 行 | 已覆盖 |
| D-002@v1 | 设计目标 3；总体方案 Wave 2；接口定义 collectActiveQuickGuardFiles/checkGuardOverlap。Grill 锚点修正：第二入口=src/index.js:2902? assess 自动 apply（原「archive 内置 apply」为幻觉锚点，complete-handlers 无此调用）；决策语义不变（全部 apply 入口覆盖） | 已覆盖（锚点修正） |
| D-003@v1 | 设计目标 4；总体方案 Wave 1④；文件清单 worktree-apply 行 | 已覆盖 |
| D-004@v1 | 非目标第 1 条；文件清单 ROADMAP.md 行 | 已覆盖 |
| D-005@v1 | 设计目标 2/5；总体方案 Wave 1 manifest 落点+Wave 3 doctor 形态；兼容策略第 1 条 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-001@v1~D-005@v1（决策追踪表逐条覆盖，无未解决项）
- [x] 生命周期关键词核对：含 apply/lock/guard 等词但均非生命周期事件——已写紧邻豁免短语「不涉及生命周期契约」
- [x] UI 原型分级核对：纯 CLI/后端变更，无任何界面文件——跳过原型（Step 5 已声明）
- [x] 字段数据流标注：manifest 与 guard 收集两条 producer→consumer 链已在文件清单交代
- [x] 源码锚点核对：worktree-apply.js:143/:111/:1068/:539/:157、quicklog collectGuardReservedQuicklogIds 均为本会话实测
