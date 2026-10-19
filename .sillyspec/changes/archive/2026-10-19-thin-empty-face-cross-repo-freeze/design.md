---
author: flow-machine-draft
created_at: 2026-10-19T06:57:21.406Z
---
# 设计记录（Design Record）— 2026-10-19-thin-empty-face-cross-repo-freeze

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

生产实证（消防工作区 4e9eb05b）：thin 变更的真实代码全在跨仓，主仓冻结面为空时 flow done 的 patch 子步直接短路跳过，归档永久缺 patch 两件。本次在空面分支接入已有的 `reconcileCrossRepoPlan`（collectPatch + cross_baselines 3c 档），把跨仓交付面以 JSON-only 形态留档：只写 `change-patch.json` 的 `scopeAudit.repos[]`（含 patch 正文/sha256），不写 `change.patch`——主仓面确为空，混入跨仓正文会让按主仓 cwd 解析 hunk 的读方错位。各仓均无交付（仅声明未动占位行）时维持原空面跳过。配套把「冻结件存在性复查」从「两件齐」放宽为「JSON 在场且 repos 有正文」，避免重入误报缺件，并把 verify-result 回执改成跨仓表述。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/flow-parity.js` 新增 `inspectFreezeArtifacts(changeDir)` → `{ hasJson, hasText, repoPatchCount, complete }`（读侧探针，纯函数）。
- `writeCloseTraceArtifacts(...)` 新增可选参数 `patchStatus`：显式 `'ok' | 'failed'`，缺省沿用「patchText 非空=ok」旧口径——既有调用方零行为变化。
- `renderVerifyReceipt(...)` 行为变更：无顶级 patchSha256 但 `scopeAudit.repos[]` 有 patch 正文时输出「跨仓 N 仓（diff 见 change-patch.json scopeAudit.repos[]；主仓面为空）」，否则维持原表述。
- `flow done` patch 子步：空面+规范跨仓标注+跨仓有交付时新增 JSON-only 留档分支；change-patch.json 顶级 `files=[]`、`totals={0,0,0}`、`patchStatus='ok'`，`scopeAudit.repos[]` 原样携带各仓锚点/计数/patch/patchSha256。
- 无新命令、无新端点。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   跨仓窗口以 flow start 记录的 `cross_baselines` 为锚（首写者胜），迟到提交只要落在窗口内仍被采集；锚缺失时 collectRepoActual 回退既有 B/C 档（HEAD~1/HEAD+工作树），与现有跨仓冻结同源。重入收口时 JSON-only 判完整，不重复重冻结。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   冻结写盘沿用 `writeCloseTraceArtifacts` 的整文件覆盖（收口为单写者：flow done 独占 patch 子步）；`inspectFreezeArtifacts` 只读。与并行会话的跨仓写并发沿用现有 `cross_baselines` 窗口/token 归因语义，不新增共享状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   JSON-only 写盘成功后才 mark('patch')；写盘中断（JSON 损坏/缺失）时存在性复查判缺件并按既有漂移同款重冻结。归档后目录搬走，无法重入——与既有冻结件同生命周期。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   跨仓条目只来自 `local.yaml repos` 注册表 + design 规范标注的仓键；未标注文件仍走主仓口径。JSON-only 分支仅在主仓 ownFiles 为空且声明面有 repo 标注时触发，单仓/纯文档变更零影响。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：JSON-only 形态对下游读方是新语义——若某读方仍假设「change.patch 必在场」会误判缺件；本次已同步改本仓存在性复查与 verify 回执，平台读侧由后续独立变更适配（消费 repos 元数据）。放弃方案：①把跨仓正文拼进 change.patch——混仓 diff 的 hunk 会按主仓路径解析，读方错位；②对「全规范跨仓标注+空面」直接阻断要求签收——该工作区跨仓交付是常态，阻断等于对常态路径收税，且不产生审计证据。

**已声明的边界（显式裁决面）**：冻结面归属是文件级而非 hunk 级——baseline..HEAD 中并行会话对同一文件的提交会以整文件 diff 混入本变更 change.patch（本仓本轮实证：2026-10-19-thin-order-canon 对 `src/flow.js` 的改动混入）。缓解：AGENTS.md 规则 11 的显式 pathspec 提交保证本变更自身提交只含自身 hunks；收口评审按 git log/show 核对归属。彻底修复（按归属提交逐笔生成 patch）会改变所有 thin 变更的冻结口径，需独立变更立项，不在本次范围。另：`change-patch.json` 损坏时即使 change.patch 在场也判缺件（元数据不可信 → 重冻结），JSON-only 重冻结会清理残留的旧 change.patch。
