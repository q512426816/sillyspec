---
author: flow-machine-draft
created_at: 2026-11-04T00:08:40.461Z
---
# 设计记录（Design Record）— 2026-11-04-archive-baseline-entry

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 src/decision-distill.js 的 distillIntoKnowledge 注入「叙事基线条目」：parseDecisions 后构造 buildBaselineEntry（读 design 做法概述段、flow-state 标题、change-patch 交付面，模块匹配派生域），合格即以 D-000@v1 人工条目同构形态进 batch，走既有 入选/幂等/发号/写入 机器（零新写入路径）。存量回放经同一函数的 baselineOnly 参数只写基线不碰人工存量（src/archive-baseline-replay.js 编排扫描/门控/幂等预扫，词表参数化）。排序去重挂 src/knowledge-match.js 的 scoredHuman 比较器（同文件内原编号 D-000 者降位）。选此方案而非复活槽4 收割/归档检索通道的原因：槽4 已于 2026-11-02-slot4-harvest-retire 下线（产物全模板底稿致停车场膨胀，刚治理完）；检索通道（B）被评审与数据实测双重否决（D-002 边界治理成本/双通道维护/与蒸馏重复）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `distillIntoKnowledge(changeDir, knowledgeRoot, headHash, moduleIndex, opts)` 增第五参 `{ baselineOnly?: boolean }`（缺省 undefined=既有行为+基线注入）；基线注入本身是新增输出（合格变更多一条 D-000 条目）。
- 新导出 `buildBaselineEntry(changeDir, knowledgeRoot, parsedEntries, moduleIndex)`（decision-distill.js，供测试/回放复用）与 `parseDesignOverview(changeDir)`。
- 新模块 `src/archive-baseline-replay.js`：`planBaselineReplay(archiveRoot, knowledgeRoot, { signals })`（纯读规划）+ `applyBaselineReplay(archiveRoot, knowledgeRoot, { signals, headHashOf })`（写盘执行，逐变更调 baselineOnly 蒸馏）。
- `matchByRouting` 内 scoredHuman 比较器增同文件基线降位（消费侧行为变化：同文件基线排在人工条目后；跨文件序不变）。
- CLI 命令面无变化（回放经脚本调用，不新增顶层动词）。
- 知识条目格式零新字段（复用 状态/变更/原编号/锚点/文件/理由 既有行；基线识别 = 原编号 D-000@ 约定）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   基线与人工条目共用 同变更+号+原编号 幂等键，谁先谁后蒸馏均收敛到同一段（applyEntryToSections 原位更新）；回放对已含基线变更预扫跳过，迟到重放零重复。归档时序（change-patch.json 先于蒸馏生成）是既有前提，不新增假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   与既有蒸馏同面：域文件 store 读写非事务，并发蒸馏存在既有竞态（发号撞号窗口已有 mintMax 批内计数缓解，doctor 可见）；基线不扩大该面（每变更恒 1 条、号固定 D-000 复用路径不新发号撞车）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   回放逐变更独立提交（单变更失败 continue 留痕，不阻断批次）；中断重入靠幂等预扫跳过已完成者。蒸馏中途崩溃与既有语义同（半态文件下轮同键原位更新收敛）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   基线锚点取 仓相对路径（relative(仓根, changeDir) 计算，非硬编码）；模块匹配用各仓自管 _module-map.yaml；回放入口的 archiveRoot/knowledgeRoot 均参数传入——机制代码不含任何具体仓路径（规约 00：词表亦参数，缺省空=全量，无内置中文/英文词常量）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：基线条目量增致检索噪音（合格变更每变更 +1 条）——缓解：排序降位（同文件基线永居人工条目后）+ 词片回退的逐文件 corroborate 上限既有约束；量级实测门控后约 +15~20%（评审子代理数据面：821 归档中带做法概述段 436、信号词命中约 170）。放弃的方案：① 复活槽4 收割加背景槽——前提失效（机制已下线）且会复刻停车场膨胀（合成条目无域归属）；② 归档 design 直接进检索语料（通道 B）——平台侧需重开 D-002@v1 边界、双通道维护、与蒸馏重复，且原始文本排序质量无证据优势（评审否决）；③ changelog 行携带症状词（C）——依赖 agent 主动写词，与 decisions 空壳同源的软面假设（数据实证该变更 changelog 行零症状词）；④ A2 decisions 硬门——机制化产出后冗余，且信号词触发判定违反规约 00 开放世界条。
