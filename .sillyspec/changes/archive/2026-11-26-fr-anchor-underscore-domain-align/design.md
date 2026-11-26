---
author: flow-machine-draft
created_at: 2026-11-26T01:27:58.575Z
---
# 设计记录（Design Record）— 2026-11-26-fr-anchor-underscore-domain-align

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

词表对齐（charset 补下划线），不改任何流程结构：FR 全局 id 的域段取自模块 id（`resolveTouchedDomains` 命中的模块目录名，`tool_gateway`/`frontend_components` 等下划线形态属正常产出），发号侧字符串拼接不设字符集，而九处解析/校验正则的域字符类均不含 `_`——补齐即可，单调放宽（任何此前通过的锚仍然通过，仅新增合法形态）。改四处：

1. `src/test-bindings.js`：ANCHOR_RE（FR 分支 `[A-Za-z0-9-]+` → `[A-Za-z0-9_-]+`）、frEntryExists 两处标题扫描（523/550 同步）。
2. `src/fr-index.js`：FR_SECTION_RE（`[a-z0-9-]` → `[a-z0-9_-]`，注释同步「含连字符」→「含连字符/下划线」）、FR_GLOBAL_ID_RE 同步、退役理由令牌扫描（:199）、索引节头扫描（:777）。
3. `src/knowledge-graph.js`：FR 节头解析（:233）与承接引用 supersede 扫描（:241）。
4. 新增 `test/fr-anchor-underscore.test.mjs`：FR-01/02/03 三组先红后绿用例（ANCHOR_RE/normalizeRow/upsertFrBindings、四侧词表解析与重读不丢节、既有形态零回归）。

测试先行：新增用例先实证红（现状 ANCHOR_RE 拒 FR-tool_gateway-001、FR_SECTION_RE 不识别带下划线节头），实现后转绿。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 导出正则常量 `ANCHOR_RE`（test-bindings）、`FR_SECTION_RE`（fr-index）字符类放宽：新增 `_` 为合法域字符；正则形态/捕获组序不变（FR_SECTION_RE 三组结构与 splitKnowledgeSections 对齐，m[3]=标题 勿动）。
- 行为变化：此前被拒的 `FR-<域含下划线>-NNN` 锚现在通过校验并可提升/解析；带下划线域的知识文件节此前被 FR_SECTION_RE 静默跳过，现在被正常解析（重读/幂等/承接面受益）。
- CLI 命令面、文件格式（knowledge/fr/<域>.md 结构）、函数签名均无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   纯词表放宽，无状态与时序面；解析与校验均为单次输入上的纯函数，乱序不适用。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   与现状一致：知识文件写侧沿用既有 joinKnowledgeFile 原子性约定，本变更不改写路径；词表放宽不新增并发面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   幂等面受益：此前带下划线节被 FR_SECTION_RE 跳过会导致重读丢节，现在解析完整，重入/重跑归档更安全（正是本变更修复的病根之一）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   词表按 id 形态匹配、与仓/工作区无关；`FR-tool_gateway-001` 与 `FR-tool-gateway-001` 仍是不同 id（`_` 与 `-` 不等价），不产生跨域串写。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：词表放宽是否误放行（如把本应非法的形态放进合法枚举）——`_` 与既有 `-` 同为模块目录名的构成字符（路径段名），放行面与发号产出面一一对应，无误放空间；括号量化不变（`+`），无回溯爆炸面。死路：曾考虑在发号侧把域规范化（下划线→连字符）而非放宽校验——放弃：`tool_gateway` 与 `tool-gateway` 会映射为同一 id 造成跨模块编号串台（模块 id 本身带下划线是文件系统事实），且已落盘的知识文件（如 multi-agent-platform 仓 fr/tool_gateway.md 已有 FR-tool_gateway-001..004 节头）是既成事实，规范化会与存量不兼容。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/test-bindings.js | ANCHOR_RE 与 frEntryExists 两处标题扫描域字符类补下划线 |
| 修改 | src/fr-index.js | FR_SECTION_RE / FR_GLOBAL_ID_RE / 退役理由令牌扫描 / 索引节头扫描补下划线，注释同步 |
| 修改 | src/knowledge-graph.js | FR 节头解析与承接引用 supersede 扫描补下划线 |
| 新增 | test/fr-anchor-underscore.test.mjs | 三组先红后绿用例（提升链路 / 词表两侧同源与重读不丢节 / 既有形态零回归） |
