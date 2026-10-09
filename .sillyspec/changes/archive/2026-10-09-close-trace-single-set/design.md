---
author: flow-machine-draft
created_at: 2026-10-09T06:51:08.912Z
---
# 设计记录（Design Record）— 2026-10-09-close-trace-single-set

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

收口留痕从四件套（change.patch + change-patch.json + scope-audit.json + scope-audit.patch）收敛为单套：唯一写入咽喉 writeCloseTraceArtifacts（src/flow-parity.js）改为只写 change.patch + change-patch.json，原 scope-audit.json 的对账面数据作为 scopeAudit 子对象并入 change-patch.json。选这个方向的关键是顶级键原位不动——CLI 内 fr-index（FR 覆盖）、knowledge-graph（交付边）、flow.js（漂移 freezeHead / verify 收据）与平台 assets.py/parser.py 读的全是顶级字段（files/head/totals 等），一个都不用改；只有 scope-audit.js 读链的四个职责小函数（快照/冻结 patch/证据信号/sha 伴生件）加「新形态优先、旧名兜底」一层。scope-audit.json/scope-audit.patch 停写，读侧旧名兼容链保留兜 247 个存量归档（四件套 19 / thin 双件 155 / heavy 双件 72 / 残缺 1）。平台侧（multi-agent-platform）后端主读路径本就是 change-patch.json/change.patch 优先、无需动逻辑，前端 structured-views 新增 change-patch.json 结构化分支（复用 ScopeAuditView 渲染 scopeAudit 子对象）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 文件格式：change-patch.json 新增 scopeAudit 键（对象：mode/ok/degradedReason/baseAnchor/totals/rows/excluded/closedBy[/repos]）；patchSha256/patchStatus/savedAt 维持顶级（不进子对象）。scope-audit.json / scope-audit.patch 停写（读侧兼容保留）。
- writeCloseTraceArtifacts：入参签名不变（snapObj 仍传对账面主体），返回值不变（patchStatus/patchSha256）；落盘从四件变两件。
- 读链顺序（scope-audit.js）：readScopeSnapshot = change-patch.json.scopeAudit → 旧 scope-audit.json → .runtime 快照；--file 冻结切片 = change.patch → scope-audit.patch（旧 heavy 兜底）；execute 证据信号 = scopeAudit 子对象存在（旧 scope-audit.json 并存判定）；getFileDiff sha 伴生件改读 change-patch.json。
- run/complete.js printVerifyScopeDrift：读序同 readScopeSnapshot。
- 平台：structured-views.tsx 新增 change-patch.json 分发分支；schema.py ChangePatchMeta 契约注释补 scopeAudit 子对象说明；回退链保留（其他仓镜像归档仍为旧形态）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

两件落盘非原子，中途崩溃可能只落一件——读侧本就 fail-open（缺失→下一源→实时区间，不出伪数据）；scopeAudit 缺失时旧名兜底再 thin 回放，方向单调不回环。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

writeCloseTraceArtifacts 仍单咽喉、整文件覆盖写；同一 change 并发收口被流程层禁止（session 所有权拦截，既有机制），本变更不新增并发面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

幂等重跑（disposition-drift 再冻结）自嵌入排除清单保留全部四个文件名（旧轮冻结件里可能还有 scope-audit.*，防自引用循环），仅注释说明是 legacy 防护；heavy 通道重跑实际侧整体排除 .sillyspec/changes/，无自嵌入面。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

改动收敛在单变更目录产物 + 读链；平台仓镜像只读不受影响；跨仓改动（multi-agent-platform）独立交付且只加分支不删回退，不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：读侧兼容链遗漏某个旧形态消费点导致回放退化（如 --file 切片漏了旧 heavy 形态）——对策：三类存量形态各自钉兼容测试 + 收口全量回归（732 文件全绿）。放弃方案①（scope-audit 命名幸存）：CLI 5 个模块 + 平台 3 处读取 + 约 14 个测试文件全要改名换路径，改动面大一圈，无对应收益。放弃方案②（一次性迁移存量 247 归档）：重写历史冻结记录风险高，且平台镜像服务其他仓的旧归档不受本仓迁移控制，回退链反正删不掉——用户已确认不动存量。放弃方案③（全新命名 close-trace.*）：所有读方（含平台）全部改名，存量归档 100% 走回退链，纯增 churn。
