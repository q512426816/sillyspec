---
author: flow-machine-draft
created_at: 2026-11-19T14:57:14.905Z
---
# 设计记录（Design Record）— 2026-11-19-pitfall-trio-closeout

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

倒推 B 模式收编：三个收口链路坑的修复已在 2026-11-19 会话落盘（代码+测试全绿），因平台自动提交包装层干扰提交链断裂，本变更如实登记收口。三处修复：

1. **归档幂等自愈**（src/run/complete-handlers.js + src/flow.js）：runArchiveChain 在 destDir 已存在时读归档件 flow-state 的 substeps，全 done 即判定上次归档实际完成（外层超时中断形态）→ 自愈收口（unregisterChange+worktree 清理+返回），源目录残留提示手工清理；cmdFlowDone 的「源目录被误删」报错分支检测归档完备性并附「直接提交归档件」指引。
2. **漂移归因对齐**（src/flow-parity.js）：detectPatchDrift 与 deliveryFaceAnchoredAfter 的 own 判定从「提交消息含变更名」放宽为「具名或 /task-\d+/i」——与 buildCommitAttribution（2026-11-08-bare-commit-attribution-narrow）同口径，token 返工提交触发自动重冻结。
3. **模板占位形改写**（design-facts.js / index.js×2 / taskcard.js / verify-probes.js / quick-audit.js 六生成点 + docs-check.js 回滚）：教学引用示例从带数字形态（src/foo.js:123）改为占位形态（src/foo.js:<行号>）——占位符不是数字/标识符，REF_RE（要求 `:\d+`）与 SYMBOL_REF_RE（要求 `::标识符`）天然不匹配。首轮落盘的「collectDocRefs 全局豁免 foo.js」方案被收口实测门否决（foo.js 是开放世界通用夹具名——docs-check-symbol-anchor/docs-fix-capability 等既有 fixture 用 foo.js 做真实测试数据，全局豁免全打红），回滚为扫描器零豁免+模板改形，foo.js 真名引用语义完整保留。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `collectDocRefs(md)` 返回集合：首轮曾加占位名豁免（foo.js 不入引用面），实测门否决后回滚为零豁免——行为与 2026-11-18 前完全一致；模板占位形改写（六生成点）让新变更文档不再产生假失效，存量假失效继续由 `.sillyspec/docs-check-baseline` 基线豁免覆盖（gate 90 ≤ 基线 94）。
- `detectPatchDrift({cwd,change,freezeHead})` / `deliveryFaceAnchoredAfter({cwd,change,anchorSha})`：own 归因口径放宽（+task-NN token），返回结构不变（ownCommits/ownFiles/governanceOnly/touchedPromiseFace）。
- `runArchiveChain(...)`：destDir 已存在分支新增完备性判定与自愈收口路径，返回值语义不变（成功返回 destDir）。
- patch 子步 skip 分支：新增冻结时点披露输出行（无返回结构变化）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   漂移检测按提交链顺序扫描 log，token 归因是逐提交独立判定，乱序合并不影响（amend/rebase 残留已有 patch-id 等价剔除兜底）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   归档自愈读 flow-state 是幂等读（全 done 判定）；两执行体同时收口同一变更的竞争由既有 destDir 原子性兜底（其一先完成、另一读到的 flow-state 已全 done 同样自愈返回，无重复注销副作用——unregisterChange 幂等）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   外层超时被杀是本设计的正主场景——归档目录写全后源目录残留只是提示不清理（恢复锚点保留）；半写归档（子步未全 done）维持硬错防误吞。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   占位豁免按文件名全局生效（foo.js 是 CLI 模板约定占位符，非仓特定）；真实仓库存在 foo.js 时其真实引用经裸名候选或如实失效，豁免只让渡教学占位面（坑文件已披露）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **风险**：归档自愈把「同名冲突」误判为「已完成」——防线是 flow-state 子步全 done 判定（同名新建变更不会带全 done 的 flow-state）；漂移归因放宽可能把他侧 task-NN 提交误认 own——共享主仓下他侧提交带 token 的形态本就该按 token 归属（协议证据），与 buildCommitAttribution 口径一致，非新增暴露。
- **死路（坑 2026-11-13-flow-done-patch-refreeze 方向②）**：scopeAudit 按 hunk/token 重认领的归属面重算属冻结件装配重构，本轮不动——并行会话提交并入他侧提交的 untouched 误记仍存，规避纪律（以 git diff 实际面复核、不采信 untouched 标记）继续有效。
- 平台自动提交包装层改写提交消息致 CLI 归属失败的根族（坑 2026-11-18-worktree-apply-then-done-empty-freeze-face）不在本变更射程——平台侧待修。
