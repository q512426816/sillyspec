---
author: qinyi
created_at: 2026-09-10 10:23:15
scale: large
---

# 设计文档（Design）— 2026-09-10-change-scope-audit

## 背景

变更收尾时（execute --done / verify --done / archive --confirm）用户与 agent 缺一份「计划改动 × 实际改动」的机械对账视图：

- 实际改动文件收集链路已成熟（`resolveReconcileActualFiles` 三源并集 / `auditQuickCompletion` 窗口归属），但只出文件清单不出 +/- 行数；
- 计划侧（design.md 文件变更清单）从未与实际侧做过文件级三态对账（计划外=scope creep / 计划未动=遗漏均不可见）；
- 对账能力绑死在阶段 --done 时点，执行中途无法随时查看；
- quick 流程的窗口归属审计（baseline 快照/他者退栈/软归属）只在 --done 输出一次且无行数。

用户与本变更三轮设计讨论收敛：纯函数单一真相 + 独立命令随时查 + 阶段点薄注入（方案 C，用户亲提）。

## 设计目标

1. `sillyspec scope-audit --change <name|quick-session-id> [--json]` 随时输出变更范围对账（人类可读表 + JSON 机器面）。
2. full-flow 模式：design.md 文件清单 × 实际改动 → 文件级三态（✓ 计划内 / ⚠️ 计划外 / ⚠️ 计划未动）+ numstat 真实行数。
3. quick 模式：guard.json 声明 × 审计窗口 → 归属状态表（已声明 / 软归属 / ⚠️ 未声明 / 他者声明排除面）+ 行数。
4. execute --done 打全表；verify --done 打一行漂移确认；archive --confirm prompt 注入全表；quick --done 审计输出升级行数。
5. 全部输出 advisory，不新增任何门禁状态（D-006）。

## 非目标

- 计划侧行数估算（含 LLM 大概值）——D-001 否决，不做。
- ⚠️ 项阻断/警告门禁——advisory only（D-006）。
- plan 阶段 T-shirt 尺寸规模标记——后续独立变更。
- 改动 `auditQuickCompletion` 既有判定语义（quick 模式只消费其结果并上行数，门禁行为零变化）。

## 拆分判断

单变更不做批量拆分：核心是一个纯函数 + 围绕它的四个薄消费点，拆开会造成「函数与消费点跨变更漂移」（消费点注入空表/旧接口）。Wave 内按依赖序：Wave 1 纯函数+测试（无消费方），Wave 2 命令路由+三处注入+quick 行数（全消费 Wave 1 接口）。

## 总体方案

### Wave 1：核心纯函数（新模块 src/scope-audit.js）

`computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts })`，mode 自动判定：

- **quick 模式**：changeName 匹配 `quick-<hex>` 会话（`locateQuickSessionGuard` 命中）→ 读 guard.json，重跑 `auditQuickCompletion` 同款窗口归属（baseline 剔除/他者退栈/软归属；该函数已 export、纯读无副作用——子代理 Grill C-1 实证：safeGit 只读、无文件/DB 写，仅 console 输出），实际侧行数按其文件清单取 numstat。quick 无 merge-base 锚：行数对未提交工作区采集（tracked → `git diff HEAD --numstat`；untracked → `wc -l`），baseAnchor 记 `quick-window:<sessionId>`。
- **full-flow 模式**：`resolveReconcileActualFiles`（双形态：worktree 存活 A / post-apply B；verify-postcheck.js:2289，本变更**补 export**——现状未导出且返回结构无锚，Grill B-1）出实际文件集 + **返回结构新增 `baseAnchor` 字段**（形态 A = meta 锚点 commit：baselineCommit>actualBaseHash>baseHash；形态 B = merge-base hash 或 null）——numstat 基点即 baseAnchor，`collectNumstatByPath({ baseRef })` 的 baseRef 与结果 `baseAnchor` 字段产出来源于此（B-1 修复：导出 + 锚外露 + 文件清单补 verify-postcheck.js 行）。计划侧解析 design.md 文件变更清单**复用既有 `src/change-list.js`**（design 清单解析单一真相：normalizePath 去反引号/括注 + 组合单元格拆分；Grill G-3——不自研解析，零双实现）。

行数三档（D-002）：tracked 改动 → numstat；untracked 新文件 → `wc -l` 记全 + 行；binary（numstat 两列 `-`）→ 显 `BIN`。

三态判定（full-flow）：实际文件 ∈ 计划清单 → ✓；实际 ∉ 清单 → ⚠️ 计划外；清单文件无实际改动 → ⚠️ 计划未动。计划侧解析失败/无清单 → 降级「实际侧 only」视图（不产三态列）。

quick 提交后（窗口已 commit、status 空、QUICKLOG 有条目）→ 明确提示降级读 QUICKLOG 条目文件行（记录态），不出空表冒充实时。

返回结构（--json 直接序列化）：`{ mode, ok, degradedReason, baseAnchor, totals: { files, additions, deletions }, rows: [{ path, planned|declared, additions, deletions, kind: 'binary'|'new'|'modified'|'deleted', verdict|attribution }], excluded: { foreignDeclared: [...] } }`。

### Wave 2：命令与四消费点

- **命令路由**：index.js 新增 `case 'scope-audit'`（对齐 verify-probes / module-impact 先例：用法错 exit 2 + assertSafeChangeName、--change 必填、--json 可选、运行错 fail-soft exit 1）。
- **execute --done 全表 + 快照**：complete.js execute 阶段完成路径打印全表 + ⚠️ 出口指引一行（补 design.md 声明或 --output 注明原因）+ 落 `.runtime/scope-audit-<change>.json` 快照。**注入点锚两路径必经的共享完成区**（completeStep :609 completeStageGates 后 + continueStep :1332 wait 解除完成——Grill G-2：单锚 completeStep 会漏 wait 解除路径致 verify 假漂移；实现取两路径收敛点或两处同调一 helper）。
- **verify --done 一行**：verify 完成输出区一行 `变更范围：N 文件 +X/-Y（vs execute 时点：一致|漂移 M 文件）`——读 execute 快照对比；漂移过滤面 = filterDeliverableFiles **追加排除 `.sillyspec/docs/**`**（verify 阶段合法文档同步不计漂移——Grill C-5：该过滤器本就保留 docs 子树）。
- **archive --confirm 全表**：stages/archive.js「确认归档」步 prompt 增 `{SCOPE_AUDIT_TABLE}` 占位，run/prompt.js 注入（对齐 ARCHIVE_IMPACT_AUDIT :995 先例，fail-soft 降级单行指引）。
- **quick --done 行数**：complete-handlers.js quick 收尾文件行/审计行输出区（attributedFiles/softTestFiles 消费区 :1196-1255——Grill G-1：文件行不在 printQuickAuditReview，该函数只打 status/reasons/hints）并上 numstat 行数，同一采集函数。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/scope-audit.js | 纯函数 computeChangeScopeAudit + renderScopeAuditTable（人类可读渲染）+ collectNumstatByPath（numstat/wc-l/BIN 三档采集，quick 与 full-flow 共用） |
| 新增 | test/scope-audit.test.mjs | 三态判定/归属分档/行数三档/降级路径/并行会话退栈不进表 夹具测试 |
| 修改 | src/verify-postcheck.js | resolveReconcileActualFiles 补 export + 返回结构新增 baseAnchor 字段（锚外露，B-1；既有调用方零影响——纯增量字段） |
| 修改 | src/index.js | 新增 case 'scope-audit' 命令路由（--change/--json，用法错 exit 2、运行错 fail-soft exit 1） |
| 修改 | src/run/complete.js | execute/verify 阶段完成路径（completeStep 与 continueStep 两路径收敛点）打印全表/一行漂移 + 落/读 .runtime/scope-audit-<change>.json 快照 |
| 修改 | src/run/complete-handlers.js | quick 收尾文件行/审计行（:1196-1255 消费区）并上 numstat 行数（import collectNumstatByPath） |
| 修改 | src/stages/archive.js | 「确认归档」步 prompt 增 {SCOPE_AUDIT_TABLE} 占位符 |
| 修改 | src/run/prompt.js | {SCOPE_AUDIT_TABLE} 注入（fail-soft，对齐 ARCHIVE_IMPACT_AUDIT :995 先例） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 归档时按实际归属更新（scope-audit.js 归属模块 paths） |

无对外字段/DTO/事件 payload 新增（CLI 内部函数与 console 输出），无数据流标注需求。

## 接口定义

```js
// src/scope-audit.js
computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts })
// → { mode: 'quick'|'full-flow', ok: boolean, degradedReason: string|null,
//     baseAnchor: string|null,          // full-flow：resolveReconcileActualFiles 新增返回字段（B-1）；
//                                       // quick：'quick-window:<sessionId>'（行数对未提交工作区采集）
//     totals: { files, additions, deletions },
//     rows: Array<{ path, planned?,          // full-flow: '新增'|'修改'|'删除'|null（change-list.js 解析产物）
//                   declared?,               // quick: boolean
//                   additions, deletions,    // number；binary 为 null
//                   kind: 'binary'|'new'|'modified'|'deleted',
//                   verdict?,                // full-flow: 'planned'|'unplanned'|'untouched'
//                   attribution? }>,         // quick: 'declared'|'soft'|'undeclared'
//     excluded: { foreignDeclared: Array<{ file, sessions }> },
//     note?: string }                        // 降级说明（quick 已提交等）

renderScopeAuditTable(result)   // → string（人类可读表，含汇总行与 ⚠️ 标记）
collectNumstatByPath(cwd, paths, { baseRef })  // → Map<path, {additions, deletions, kind}>
                                               // baseRef：full-flow=baseAnchor hash；quick='HEAD'（未提交窗口）

// src/verify-postcheck.js 既有函数增量（B-1 修复，纯增量零行为变化）：
// resolveReconcileActualFiles 补 export；返回结构新增 baseAnchor（形态 A=meta 锚 commit，形态 B=merge-base hash|null）
```

消费契约：index.js 命令 / complete.js 两处 / run/prompt.js 注入 / complete-handlers.js quick 行数，全部只 import scope-audit.js 三个导出 + verify-postcheck 的 resolveReconcileActualFiles，禁止各自实现采集。计划侧解析只走 change-list.js，禁止自研表格解析。

## 生命周期契约表

不涉及生命周期契约（纯只读展示层，无 session/lease/daemon 状态变更；quick 会话仅读 guard.json 不写）。

## 数据模型

无 schema 变更。新增运行时快照文件 `.sillyspec/.runtime/scope-audit-<change>.json`（execute --done 写、verify --done 读对比、archive 后随 .runtime 清理惯例），结构即 computeChangeScopeAudit 返回值。

## 兼容策略（brownfield 必填）

- 未跑 scope-audit 命令时一切行为不变（新命令零侵入）。
- 三处注入 fail-soft：computeChangeScopeAudit 异常/降级时输出单行提示不阻断阶段完成（execute/verify/archive 完成路径零新增 block 面，D-006）。
- 旧变更无 design.md 文件清单 → 降级实际侧 only 视图；guard.json 缺失的 quick 会话 id → 提示会话不存在，exit 1。
- quick --done 既有审计门禁行为零变化（只加行数列）；printQuickAuditReview 签名不变。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | design.md 清单表解析脆（手写表格格式漂移：列序/反引号/相对路径混写） | P1 | 解析复用既有 src/change-list.js（design 清单解析单一真相：normalizePath + 组合单元格拆分），零自研零双实现（Grill G-3）；change-list 也解析不出 → 降级实际侧 only + degradedReason，不误判三态 |
| R-02 | numstat 基点与文件清单基点不一致（并行会话推 HEAD）导致行数含他者改动 | P0 | resolveReconcileActualFiles 补 export + 返回 baseAnchor（B-1 修复），numstat 基点即 baseAnchor；quick 模式对未提交工作区采集（HEAD 基点=未提交窗口语义自洽）；测试夹具含并行提交场景 |
| R-03 | 大变更 numstat 输出量（数百文件）拖慢 --done | P2 | numstat 单次 git 调用（非逐文件）；表超 60 行截断显示 + 「完整表跑 scope-audit」指引 |
| R-04 | quick 窗口行数含未提交的他者 WIP（同文件并发） | P1 | 行数只对归属本会话的文件采集（退栈后清单）；排除面 foreignDeclared 照现有审计口径单列 |
| R-05 | execute/verify 快照对比窗口内 verify 阶段合法文档同步被误报「漂移」 | P2 | 漂移行只列文件数不阻断；过滤面 = filterDeliverableFiles 追加排除 .sillyspec/docs/**（verify 合法文档同步不计漂移，Grill C-5） |
| R-06 | 多会话并行下 execute 时点目标文件被并行改动（Grill 实测 archive.js/prompt.js 当前干净，但并行随时可能写入） | P1 | execute 前 git status 重读最新态；Edit 前重读文件；冲突时以功能合并不覆盖他者改动 |
| R-07 | quick 模式重跑 auditQuickCompletion 的既有 console 输出（并发 warn 等）混入 scope-audit 结果 | P2 | 人类可读面接受混行（advisory 信息不有害）；--json 面只序列化结构化结果不受影响 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 非目标（不做估算行数）；总体方案三态仅文件级 | 已覆盖 |
| D-002@v1 | 总体方案行数三档；R-02 基点锚定 | 已覆盖 |
| D-003@v1 | 总体方案（纯函数+命令+三注入同源）；接口定义消费契约 | 已覆盖 |
| D-004@v1 | 总体方案 quick 模式（复用窗口归属+QUICKLOG 降级）；文件清单 quick-audit.js 行 | 已覆盖 |
| D-005@v1 | 总体方案 Wave 2 四消费点分工 | 已覆盖 |
| D-006@v1 | 设计目标 5；兼容策略 fail-soft 零新增门禁 | 已覆盖 |

无未解决决策。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@v1（六条全引用）
- [x] 生命周期豁免短语已写（「不涉及生命周期契约」紧邻标题）
- [x] UI 原型：不涉及前端文件，跳过
- [x] 无「⚠️ 自审存疑」项——R-01 解析脆化已有降级路径兜底
