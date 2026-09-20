---
author: qinyi
created_at: 2026-09-20 16:20:18
scale: large
---

# 设计文档（Design）— 2026-09-20-scope-audit-cross-repo

scope-audit 分仓对账：跨仓文件从「⊘ 本表不含」升级为按仓真实对账，`--json` 契约扩仓库维度（供 SillyHub 平台消费的第一交付物）。

## 背景

外部平台（SillyHub，C:/Users/qinyi/IdeaProjects/multi-agent-platform）的变更中心页调用本 CLI `sillyspec scope-audit --change <c> --json` 出对账卡。实证案例 workspace f85a6650（EHS_BACK，多仓变更，清单分三段：主仓 20 文件 / sub-grid-security 13 / spdemo 9）：scope-audit 实际侧只采主仓 git，跨仓条目恒显 untouched（对账卡「⚠️ 计划未动 22」恰为 22=13+9 两个跨仓段全部文件），用户无法判断跨仓文件到底做没做。完整复盘见外仓文档 docs/sillyspec/finished/scope-audit-cross-repo-blindness.md（multi-agent-platform 仓）。

现状（v3.29.3 已落地能力）：
- 计划侧 `parseFileChangeListDetailed`（src/change-list.js:217）已识别跨仓子段/`cross-repo:` 前缀，行级带 `repo` 字段；CLI 文本表有「ℹ️ 跨仓 N 文件」注记（src/scope-audit.js:1023-1027、:1374）。但实际侧只跑主仓 git——跨仓行 verdict 恒 'untouched'（src/scope-audit.js:1056-1068 补行分支）。
- `reconcileCrossRepoDeclarations`（src/cross-repo-reconcile.js:61）已有 per-repo 对账能力（按 local.yaml repos 注册表解析仓根、在该仓取 actual、主仓同款三类差集），消费点 src/verify-postcheck.js:2918、渲染 src/run/gates.js:1074；其锚点是 HEAD~1..HEAD 最近提交窗口——头注释明示锚点限制（只反映最近一笔，精确范围要 task 卡锡点）。
- execute-runs 的 task review（`<runtimeRoot>/execute-runs/<runId>/tasks/task-NN/review.json`）每个 task 带 `repo`/`base`/`head` 锡点（validateReviewSchema 强制 base/head 非空，src/task-review.js:252-265；跨仓 task 每次 --done 由 stampCrossRepoHeadCommits 自动补 head 锡点，src/run/gates.js:462-472；apply 时 validateCrossRepoNoOp 用 git cat-file 校验 head 真实性，src/worktree-apply.js:904-957）。**task review 是 S0-S3 全档硬门禁**（enforceReviewJsonGate + generateTaskReviewDrafts 草稿兜底），与阶段评审（stage-review，S0/S1 轻仪无产物）是两套体系——锚点取 task review，「execute 走过即有」。

## 设计目标

1. scope-audit 对跨仓计划条目**按仓取 actual**：跨仓行出真实 verdict/additions/deletions/kind，不再恒 untouched。
2. `--json` 输出契约扩仓库维度（**第一交付物**，平台侧按此开发消费方）：行级跨仓行真实三态 + 信封级 per-repo 汇总（含锚点与三态计数），主仓行形状逐字段不变（additive）。
3. 锚点分级：execute task reviews base..head 封闭区间 > HEAD~1..HEAD 窗口 > HEAD 未提交窗口（降级注记）> 仓不可达（degraded 一行不炸整体）。
4. 复用/重构 cross-repo-reconcile 的 per-repo 采集为**共享内核**，scope-audit 与 verify-postcheck 双侧消费，防两份口径漂移。
5. 纯读 advisory 定位不变（D-006 精神）：不写门禁状态、不落进度库；异常并入 degradedReason。

## 非目标

- 平台侧改造（daemon 投影、后端 schema、前端按仓分组 UI）——multi-agent-platform 仓独立变更，等本契约定型后开。
- 不改 cross-repo-reconcile 的声明侧口径：verify 侧仍消费 task 卡 target_files（collectDeclaredTargetFiles），scope-audit 侧消费 design.md 清单（parseFileChangeListDetailed）——两声明面不同，共享的是「per-repo actual 采集」半边。
- 不做多 task 卡级别的声明对账升级（scope-audit 只按 design 清单，不读 task 卡声明）。
- 不冻结跨仓内容进主仓 scope-audit.patch（D-002@v1：跨仓冻结载体 = reviews 锡点 + 该仓 commit 区间，见「总体方案 Wave 2」）。
- 存量旧快照（跨仓行恒 untouched、无 repos 字段）不做实时回算——「快照说什么是什么」契约不破，旧快照跨仓段照旧 ⊘ + 注记。

## 拆分判断

单功能模块（scope-audit 跨仓对账 + 契约扩维），不拆分、不批量：核心改动集中在 2 个源文件（cross-repo-reconcile.js / scope-audit.js）+ 3 处小改（verify-postcheck 注记文案 / gates 渲染 / index.js 帮助文案），一个变更内交付。

## 总体方案

### Wave 1：共享 per-repo 采集内核（src/cross-repo-reconcile.js）

新增导出 `collectRepoActual({ repoKey, specBase, cwd, runtimeRoot, changeName })`——仓注册解析→仓根→锚点分级→actual 文件集，单一真相源：

```
锚点解析（按序取首个可得）：
A 档 reviews-range   resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName }) →
                    读 tasks/task-NN/review.json（readReview），review.repo === repoKey 的
                    条目按各自 base..head 区间取 diff --name-only 文件集（有 diffPaths 的按
                    diffPaths 收窄——统一 commit 模式语义），多 task 求并集；再 ∪ 该仓
                    status --porcelain --untracked-files=all（未提交尾巴）。
                    行数锚 = 各区间最早 base（封闭区间不漂：base/head 是收尾时点封死的 commit）。
B 档 head~1-window  无可用 reviews（execute 未跑 / review 缺失 / run 归属断裂）→
                    diff HEAD~1..HEAD ∪ status（现行 reconcile 口径），label 注记降级。
C 档 head-uncommitted-window  仓可达且 git 可用但 B 档 diff 不可得（HEAD~1 不存在——
                    单 commit 仓/空仓）→ 仅 status 未提交窗口，label 注记降级。
失败态 degraded     仓未注册 / 路径不可达 / 非 git 仓（diff 与 status 双失败）→
                    degradedReason 非空，无 actual，不炸整体（cross-repo-reconcile 现行同款边界）。
```

- 仓根解析/路径归一/大小写折叠/porcelain 解析全沿 cross-repo-reconcile 现行本地实现（normalizeRepoPath/pathKey/parsePorcelain），不另造口径。
- **行数采集不进内核**（评审 G3 定稿）：内核只产锚点与文件集；`collectNumstatByPath`（src/scope-audit.js:103 导出）由 **scope-audit 集成层**对内核产物跑（该仓根 + 锚点 commit 作 baseRef）——内核不 import scope-audit（否则内核←scope-audit↔内核循环 import），verify 侧不需要 stats 零影响。A 档行数窗口 = 最早 base..该仓工作树，同文件后续演进会计入（与主仓开放区间行数同语义，不另造精确档）。
- 预执行形态（主仓 execute 三信号全无，src/scope-audit.js:761 预执行判定）**不调内核**——B/C 档 status 会捕到跨仓仓他人脏文件，预执行视图跨仓行保持清单形态（untouched + crossRepo 标注）。

`reconcileCrossRepoDeclarations` 重构为消费内核（声明差集逻辑不动）：**签名增量可选参数 `{ runtimeRoot, changeName }`**（评审 G2：A 档 reviews 解析入参；缺省 null → 跳 A 档走 B 档，向后兼容现有调用），src/verify-postcheck.js:2918 调用点传参贯通（verify 侧锚点升级为分级受益——②类假信号面收窄），返回值增量携带 `anchor: { source, base, head, label }`（advisory 定位不变）。

### Wave 2：scope-audit 集成（src/scope-audit.js）

`computeFullFlowAudit` 非预执行分支：
1. 计划侧 `plannedEntries`（已有 `.repo` 字段）按 repoKey 分组，每组调 `collectRepoActual`（锚点+文件集），行数由集成层对内核产物跑 `collectNumstatByPath(repoPath, files, { baseRef: anchor.base })`（仅 A 档锚点 base 非空可采；B/C 档 anchor.base=null → 行数 null 降级档，degradedStat 该仓根兜底）。
2. 该仓 actual 文件集 × 该组声明面做主仓同款三类差集（`pathMatches` 双向容差，glob/目录前缀兼容）→ 跨仓行真实 `{ path, planned, additions, deletions, kind, verdict, crossRepo }`；行数未命中走 degradedStat **该仓根**兜底。
3. degraded 仓（内核失败态）：该组跨仓行退回 ⊘ 形态（untouched + crossRepo + 降级注记进 note），repos[] 对应条目 `degradedReason` 非空。
4. 命中面汇总进信封 `repos[]`（见接口定义）；totals 含跨仓行（多仓变更合计数值随之变化——这正是期望：现状 22 行恒 0/0 是失真）。
5. settled 快照语义（D-002@v1）：主仓快照冻结优先逻辑不动；跨仓行与 repos[] 跟随结果对象自动冻结进 execute --done 新快照（complete.js `...snap` 展开，落盘链零改动）；**查询面读快照时跨仓照快照**——settled 两条回放 return（src/scope-audit.js:993-1007/:1009-1025）增量透传 `snap.repos`（读侧兼容：旧快照无该键 → 不输出 repos，走「存量旧快照」分支）；**needsStats 行数补采（:977-991）跳过 crossRepo 行**——补采对主仓根跑，跨仓行 null 档会被主仓盘面误判成 `{0,0,'deleted'}` 伪数据（评审 G1：违反「不出伪数据」原则），跨仓行数维持快照冻结值。存量旧快照（无 repos、跨仓行恒 untouched）：照旧输出 + note「快照冻结于跨仓对账上线前，跨仓段未对账」。
6. 冻结 patch（buildFrozenPatch）保持主仓单仓；`--file` 跨仓行路由：跳过主仓冻结 patch 捷径（跨仓不在主仓 patch 内，避免误报「窗口外文件」），优先按快照/结果锚 `git diff <base>..<head> -- <file>` 在该仓执行（A 档封闭区间 = 跨仓版冻结档），A 档不可得退该仓实时窗口（B 档 HEAD diff，note 注明含后续演进），C 档（仅 status 面、无 diff 锚）不跑 diff 注记看文件本体。

`renderScopeAuditTable`：跨仓行 label 从「⊘ 跨仓（本表不含）」改为真实三态带仓标（`✓ 计划内 [sub-grid-security]` 形态，degraded 仓保留 ⊘）；表尾「ℹ️ 跨仓 N 文件」段升级为 per-repo 汇总行（仓 key / 锚点档 label / 三态计数 + 行数）；degraded 仓逐仓一行降级原因。

`getFileDiff`：按入参 filePath 在结果 rows 中命中 `crossRepo` 行 → 路由该仓（见上 6）。

### Wave 3：消费面小改 + 文档

- src/verify-postcheck.js:2926 notes 文案「（锚点=该仓最近提交窗口）」改为按内核 anchor.label 动态输出。
- src/run/gates.js printCrossRepoReconcile：明细行补锚点档标签。
- src/index.js scope-audit 帮助文案（:119、:1422）补跨仓按仓对账说明。
- 模块文档 .sillyspec/docs/sillyspec/modules/core-engine.md 同步（scope-audit/cross-repo-reconcile 能力面更新）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/cross-repo-reconcile.js | 新增导出 collectRepoActual 共享采集内核（仓解析→锚点分级 A/B/C/degraded→actual 文件集；行数不进内核）；reconcileCrossRepoDeclarations 重构为消费内核并增量返回 anchor 字段（producer=collectRepoActual → reconcileCrossRepoDeclarations/cross-repo-reconcile 消费点 → verify-postcheck notes/run/gates 渲染） |
| 修改 | src/scope-audit.js | computeFullFlowAudit 跨仓组按仓真实对账（行级 verdict/additions/deletions 真实化）；信封 repos[]（producer=collectRepoActual → computeFullFlowAudit 组装 → --json 序列化 / renderScopeAuditTable 渲染 / execute --done 快照冻结 → consumer=平台 daemon 投影）；renderScopeAuditTable per-repo 汇总段；getFileDiff 跨仓仓路由 |
| 修改 | src/verify-postcheck.js | reconcile 调用点传参贯通（runtimeRoot/changeName 喂 A 档 reviews 解析，评审 G2）+ notes 文案锚点档动态化 |
| 修改 | src/run/gates.js | printCrossRepoReconcile 明细行补锚点档标签 |
| 修改 | src/index.js | scope-audit 命令帮助文案补跨仓对账说明（:119/:1422） |
| 新增 | NEW:test/scope-audit-cross-repo.test.mjs | 专项测试：collectRepoActual 锚点四态（真 git 夹具造 reviews base..head / 无 reviews B 档 / 单 commit 仓 C 档 / 坏仓 degraded）+ 跨仓行真实三态 + degraded 四边界（未注册/不可达/非 git/双失败）+ 单仓变更逐字节等价 + 双仓 e2e 三仓合并表 |
| 修改 | test/scope-audit.test.mjs | 「改进点 2 ⊘ 标注」两项（:1337/:1399 附近）断言按新形态更新（跨仓行真实三态替代恒 ⊘——行为升级，断言目标本就是「跨仓不恒 untouched」的中间态） |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块文档同步：scope-audit 跨仓真实对账 + cross-repo-reconcile 共享内核 + 契约字段 |

不涉及生命周期契约（本变更不改阶段流程/文件生命周期/DB schema，仅 CLI 只读命令输出与 advisory 对账逻辑）。

## 接口定义

### collectRepoActual（src/cross-repo-reconcile.js 新增导出）

```js
/**
 * @param {{ repoKey: string, specBase: string, cwd: string, runtimeRoot?: string|null,
 *           changeName?: string|null }} args
 *   runtimeRoot：平台模式与 specBase 分离时传 execute-runs 读取根；changeName：A 档 reviews
 *   解析入参——任一缺省 → 跳 A 档走 B 档（向后兼容现行调用）。
 *   行数采集不进内核（防循环 import，评审 G3）——stats 由调用方（scope-audit 集成层）
 *   对返回 files 跑 collectNumstatByPath(repoPath, files, { baseRef: anchor.base })。
 * @returns {{
 *   repo: string, repoPath: string|null,
 *   anchor: { source: 'reviews-range'|'head~1-window'|'head-uncommitted-window'|'degraded',
 *             base: string|null, head: string|null, label: string },
 *   files: string[],                       // 该仓 actual 文件集（相对该仓根，正斜杠）——原始集，
 *                                          //   不做 filterDeliverableFiles 过滤（过滤归调用方：
 *                                          //   verify 侧保持在 reconcile 内、scope-audit 集成层自滤）
 *   degradedReason: string|null            // 非空时 anchor.source='degraded'、files=[]；异常兜底
 *                                          //   形态文案「内核采集异常: <msg首行>」（纯读 fail-soft 绝不 throw）
 * }}
 */
export function collectRepoActual({ repoKey, specBase, cwd, runtimeRoot = null, changeName = null })
```

同步函数（内核内 git 调用全 sync gitQuiet，与现行模块一致）；anchor.label 为人类可读档位描述（渲染面直接用）。

### computeChangeScopeAudit 返回值增量（--json 契约 v2）

**行级**（跨仓行，模式 full-flow 且非预执行、非 degraded 仓）：

| 字段 | 类型 | 语义 | 缺省行为 |
|---|---|---|---|
| `crossRepo` | string | 该行所属 repoKey——语义从 v1「⊘ 本表不含标记」升级为「已按仓对账」；degraded 仓/预执行/旧快照行保持 v1 ⊘ 语义（恒 untouched） | 无跨仓归属则无此字段（主仓行零变化） |
| `verdict` | 'planned'\|'unplanned'\|'untouched' | **真实三态**（该仓 actual × 声明面差集），不再恒 'untouched' | degraded 仓恒 'untouched'（⊘ 形态） |
| `additions`/`deletions`/`kind` | number\|null / string | 该仓锚点窗口行数与档位（kind: binary/new/modified/deleted，与主仓同枚举） | 锚点不可得 → null/null（降级档） |
| `planned` | string\|null | design 清单 operation（与主仓行同语义） | — |

**信封级** `repos[]`（**仅当计划侧含跨仓条目且非预执行形态时输出**——单仓变更/预执行视图零新增字段，与 v1 逐字节等价；行级跨仓字段同此限定）：

| 字段 | 类型 | 语义 | 缺省行为 |
|---|---|---|---|
| `repos[].key` | 'main'\|repoKey | 仓标识；main 条目始终首位（主仓汇总） | — |
| `repos[].repoPath` | string\|null | 仓根绝对路径（跨仓解析自注册表；main=null 不冗余） | 仓不可达 null |
| `repos[].anchor` | { source, base, head, label } | 锚点档（main 条目 = 主仓 baseAnchor 包装：source='main-<form>'，base=baseAnchor） | degraded 档 source='degraded'、base/head=null |
| `repos[].totals` | { files, additions, deletions, planned, unplanned, untouched } | 该仓行合计与三态计数（main 条目只计主仓行） | — |
| `repos[].degraded` | boolean | 该仓是否降级 | false |
| `repos[].degradedReason` | string\|null | 降级原因。**三类判据**（评审 G4 定稿，与现行合并判定对齐）：①「repo key 未注册」——parseRepoRegistry 无该 key；②「注册路径不可达」——registry 命中但 existsSync 假；③「git 不可用/非仓库」——diff 与 status 双源失败合并判定（不单独拆「非 git 仓」：worktree 仓 .git 为文件、bare/非仓在双源失败形态上不可区分，拆分无判据）；另有异常兜底第四形态「内核采集异常: \<msg首行\>」（纯读 fail-soft 绝不 throw） | null |

**信封级既有字段**：`totals` 语义不变（全表合计，多仓变更数值随跨仓行真实化而变化）；`mode/ok/degradedReason/baseAnchor/rows/excluded/note/gateProfile` 不变。

**完整 JSON 示例**（f85a6650 类三仓变更，节选）：

```json
{
  "command": "scope-audit",
  "change": "2026-09-15-ehs-reward-punishment",
  "mode": "full-flow",
  "ok": true,
  "degradedReason": null,
  "baseAnchor": "214151b2...",
  "totals": { "files": 46, "additions": 6040, "deletions": 340 },
  "rows": [
    { "path": "src/main/java/.../RewardController.java", "planned": "修改", "additions": 210, "deletions": 18, "kind": "modified", "verdict": "planned" },
    { "path": "src/test/java/.../RewardIT.java", "planned": null, "additions": 96, "deletions": 0, "kind": "new", "verdict": "unplanned" },
    { "path": "pkg/reward/service.go", "planned": "新增", "additions": 430, "deletions": 0, "kind": "new", "verdict": "planned", "crossRepo": "sub-grid-security" },
    { "path": "pkg/reward/legacy.go", "planned": null, "additions": 55, "deletions": 12, "kind": "modified", "verdict": "unplanned", "crossRepo": "sub-grid-security" },
    { "path": "app/demo/page.tsx", "planned": "修改", "additions": 0, "deletions": 0, "kind": "modified", "verdict": "untouched", "crossRepo": "spdemo" }
  ],
  "repos": [
    { "key": "main", "repoPath": null,
      "anchor": { "source": "main-post-apply", "base": "214151b2...", "head": null, "label": "post-apply 主仓锚" },
      "totals": { "files": 22, "additions": 5300, "deletions": 310, "planned": 20, "unplanned": 2, "untouched": 0 },
      "degraded": false, "degradedReason": null },
    { "key": "sub-grid-security", "repoPath": "E:/PZwangge/sub-grid-security",
      "anchor": { "source": "reviews-range", "base": "a1b2c3d...", "head": "e4f5a6b...", "label": "reviews base..head（execute task 锡点，2 task 区间并集）" },
      "totals": { "files": 14, "additions": 740, "deletions": 30, "planned": 13, "unplanned": 1, "untouched": 0 },
      "degraded": false, "degradedReason": null },
    { "key": "spdemo", "repoPath": "E:/PZwangge/spdemo",
      "anchor": { "source": "head~1-window", "base": null, "head": null, "label": "HEAD~1..HEAD 最近提交窗口（降级——无可用 reviews）" },
      "totals": { "files": 10, "additions": 0, "deletions": 0, "planned": 9, "unplanned": 1, "untouched": 0 },
      "degraded": false, "degradedReason": null }
  ],
  "excluded": { "foreignDeclared": [] },
  "note": "计划侧含 22 个跨仓文件（repo：sub-grid-security、spdemo）——已按 local.yaml repos 注册表分仓对账（各仓锚点档见 repos[].anchor）"
}
```

（spdemo 为 B 档降级锚示例——anchor.base=null，该仓行行数 null 降级档不计入合计（totals.additions=0），文件集与三态判定不受影响。）

degraded 示例（仓未注册）：`repos[]` 对应条目 `{ "key": "spdemo", "repoPath": null, "anchor": { "source": "degraded", "base": null, "head": null, "label": "degraded" }, "totals": { "files": 9, "additions": 0, "deletions": 0, "planned": 0, "unplanned": 0, "untouched": 9 }, "degraded": true, "degradedReason": "repo key「spdemo」未在 local.yaml repos 注册——跨仓对账不可达，请人工到对应仓核对" }`，该组 rows 行退 ⊘ 形态（verdict 恒 untouched + crossRepo）。

**数据流**（契约字段 producer→consumer 全链）：producer=collectRepoActual（anchor/files，跨仓仓）→ scope-audit 集成层组装（行数 = collectNumstatByPath 对该仓根+锚点；rows 跨仓行 + repos[] 信封）→ 消费①：CLI `--json`（src/index.js:1491 `...saResult` 展开，平台 daemon 投影读 rows[].crossRepo/verdict/repos[]）；消费②：renderScopeAuditTable 文本表（行 label + per-repo 汇总段）；消费③：execute --done 快照冻结（src/run/complete.js:913 `...snap` 展开进 scope-audit.json，含 repos[]——归档后查询面经 readScopeSnapshot 原样回放，settled 回放 return 增量透传 snap.repos）；消费④：getFileDiff --file 跨仓行（读结果锚路由该仓）。verify 侧 notes/渲染为旁支消费（anchor.label；调用点传 runtimeRoot/changeName 贯通 A 档）。

### reconcileCrossRepoDeclarations 返回值增量

每 repo 条目新增 `anchor: { source, base, head, label }`（内核透传）；既有字段（matched/missing/undeclared/scaffoldCount/degradedReason 等）形状不变——src/run/gates.js 渲染与 verify notes 兼容零改（文案动态化属 Wave 3 小改）。

## 生命周期契约表

不涉及生命周期契约（本变更是 CLI 只读对账命令的输出扩展，无 session/lease/daemon/状态迁移；「execute --done / archive 收尾」仅作为只读时点被引用，不改其行为）。

## 数据模型

无 DB schema 变更。快照文件 scope-audit.json 结构随结果对象增量（rows 跨仓行新形态 + repos[] 新键），旧快照读取兼容（缺 repos 键 → 不输出；跨仓行恒 untouched 形态照旧回放）。

## 兼容策略（brownfield 必填）

1. **单仓变更零回归**：计划侧无跨仓条目 → 不调内核、不输出 repos[]、行级零新字段——`--json` 与 v1 逐字节等价（专项回归测试断言 JSON.stringify 全等）。
2. **未配置/未注册**：local.yaml 无 repos 段或 key 未注册 → 跨仓子段不识别（parseFileChangeListDetailed fail-closed 现行行为），按主仓路径解析——行为同改进点 2 之前的 v1；已识别但未注册的场景（registry 有其他 key、design 用了未注册 key）不成立——repoKeys 只认注册表。
3. **旧行为回退路径**：跨仓真实对账整体包在 try/catch（D-006 fail-soft）——内核异常 → 跨仓组退 v1 ⊘ 形态 + degradedReason 注记，主仓表不受影响。
4. **不改变的接口**：computeChangeScopeAudit 入参签名、renderScopeAuditTable 入参、getFileDiff 入参、buildFrozenPatch 行为（主仓单仓）、patchSha256 校验链、verify 侧 reconcileCrossRepoDeclarations 既有字段。
5. **多平台**：路径处理全程正斜杠归一（toPosix/normalizeRepoPath），仓根 isAbsolute/resolve 兼容 Windows 盘符与相对路径注册，跨平台大小写折叠（win32/darwin foldCase）沿现行实现。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | A 档区间并集混入跨仓仓他人 commit（区间内并行演进同文件） | P2 | review.diffPaths 有则收窄；无 diffPaths 时 anchorLabel 注明「区间含该仓并行演进可能」——advisory 展示层如实标注，不假装精确；对比现状（恒 untouched 全盲）是严格改进 |
| R-02 | 行数窗口（最早 base..工作树）含跨仓仓后续演进 | P2 | 与主仓开放区间行数同语义（现状亦然），anchorLabel 注明；A 档文件集本身封闭不漂 |
| R-03 | 多仓 totals 语义变化打破平台既有消费方 | P1 | 契约 additive：平台旧消费读 rows 逐行投影不受影响（跨仓行 verdict 从恒 untouched 变真实正是修复目标）；信封 totals 语义文档化「全表合计含跨仓」；平台侧新消费按 repos[] 分组——外仓独立变更承接 |
| R-04 | 内核重构动 verify 侧既有对账（回归面） | P1 | reconcileCrossRepoDeclarations 声明差集逻辑不动，只换采集半边；既有 verify 测试（cross-repo-reconcile 相关）全量回归；锚点升级对 verify 是假信号收窄（advisory 定位不变） |
| R-05 | 预执行形态误采跨仓仓脏文件 | P1 | 预执行判定优先：三信号全无时不调内核，跨仓行保持清单形态（Wave 1 显式规则） |
| R-06 | execute-runs reviews 读取在平台模式 runtimeRoot 分离时读错根 | P1 | runtimeRoot 传参对齐 resolveRuntimeRoot(platformOpts, specBase) 现行口径（与 B3 pathspec 兜底同源先例） |
| R-07 | 旧快照跨仓段不可回算造成「同变更先后查询结果不一致」困惑 | P2 | note 明示「快照冻结于跨仓对账上线前」；存量变更需要跨仓真实态时按 reviews 锡点人工到对应仓 git diff（锚点已冻在 execute-runs） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Wave 1（共享内核+锚点分级）；接口定义 collectRepoActual；R-04/R-05 | 已覆盖 |
| D-002@v1 | 总体方案 Wave 2 第 5/6 条（快照自动继承/patch 主仓单仓/--file 锡点区间 diff）；数据模型；R-07 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@v1（D-001/D-002 均入决策追踪表）
- [x] 生命周期关键词豁免短语已紧邻标题（「不涉及生命周期契约」）
- [x] UI 原型分级核对：纯 CLI 后端与 JSON 契约，无界面变化——跳过 HTML 原型（Step 5 已声明，用户确认）
- [x] 跨仓清单写法核对：本变更文件全部在主仓（sillyspec），无需按仓分段
- [ ] ⚠️ 自审存疑①：A 档多 task 区间「最早 base」作行数锚——若两 task base 相距很远，中间他人演进全计入行数窗口。已用 R-02 登记（与主仓开放区间同语义），plan 阶段如需可改逐区间精确档（复杂度 vs 收益，倾向保持简单档）
- [ ] ⚠️ 自审存疑②：`--file` 跨仓行在「快照冻结态 + A 档」双源可用时的优先序（快照锚 = 冻结时点区间，实时 A 档 = 同一区间——理论上一致；若跨仓仓被 rebase/reset 区间消失，快照锚也 diff 不出。按「先快照锚、失败退实时」实现，plan 阶段定）
