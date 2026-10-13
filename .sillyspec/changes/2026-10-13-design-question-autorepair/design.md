---
author: flow-machine-draft
created_at: 2026-10-13T01:38:53.883Z
---
# 设计记录（Design Record）— 2026-10-13-design-question-autorepair

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/flow-draft.js 的 verifyThinDocsV2（v2 工件校验唯一消费点）：design 四节校验里「问题行不在场→拒收」改为「问题行不在场且节标题在场→机器回填」——回填后落盘（writeAtomicSync）再继续原有校验，回填事件进返回值新增的 repairs 列表，flow.js artifacts 子步渲染留痕。sess_dcb57f25 实证（横幅 53 秒前看过、模板原文 3 秒前读过仍整文件改述 8 条）表明该失败是 Write 整文件重写的生成模式滑误，事前提示（横幅/文件内）都是概率性防护；确定防线只有锚对比，修的是被拦后的恢复面：从打回人工重写变机器原位修复。改哪里：flow-draft.js（校验+回填）、flow.js（repairs 渲染，仅输出面）、test/thin-docs-v2.test.mjs（测试①改新语义+新增回填用例）。为什么选这个方案：防篡改语义不丢——改写仍到不了归档（回填后进归档的就是锚文本，与人工恢复等价），且 agent 书写内容零丢失。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

verifyThinDocsV2({ changeDir, ledger, skipDesign }) 签名不变；返回值从 { violations, advisories } 扩为 { violations, advisories, repairs }（additive，既有消费方零感知）。新增模块内辅助 charBigramSimilarity（去空白字符 bigram Jaccard，不导出）。flow.js flow done artifacts 子步新增 repairs 渲染（🔧 前缀）。行为变化：design 问题行漂移从「拒收+30 字截断文案」变为「机器按 ledger.anchor.designQuestions 逐字回填+repairs 留痕」；节被删/节未作答/design.md 缺失仍拒收，文案带问题完整原文。命令/端点/文件格式：无变化。v1 指纹轨（verifyMarkers）不动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。校验按节循环、每问独立判定在场；回填逐问应用、每次应用后重算节边界索引（插入会使后续行号位移），同节多问漂移（实证形态：boundaries 四问全漂）互不干扰；已被回填的原问题行进候选排除集，不会被下一问的替换再命中。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

回填写盘走 writeAtomicSync（临时文件+rename 原子替换），并发读者只会看到旧版或新版完整文件，无半写态。change 目录归单变更所有（AGENTS.md 任务记录隔离），跨变更不会同写同一 design.md；本变更不加锁。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。回填在单次 verify 调用内完成（内存改行→一次落盘），中断只可能发生在落盘前（文件保持原样，重跑重新回填）或落盘后（已是恢复态，重跑零二次写=幂等，FR-04 钉死）。写盘失败（权限等）捕获降级：不出 repairs、出带完整原文的拒收文案，不抛异常阻断 CLI。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。只动 ledger.schemaVersion===2 且非 skipDesign（adopted brainstorm 豁免）的 change 目录内 design.md；锚源优先 ledger.anchor.designQuestions、缺省回退 DESIGN_QUESTIONS 常量（既有口径不变）；相似度替换候选仅限该节节体内、排除任何锚问题行与标题行，不跨节不跨文件。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：相似度替换误伤答案行（把 agent 写的答案当改述行替换掉=数据丢失）。缓解：替换阈值 0.5（字符 bigram Jaccard）——改述行由问题衍生物构成、相似度天然高于任何答案行；候选排除集（锚问题行/标题/已用行）；测试钉死「答案行保留」断言。定位不到（低于阈值）走节首插入路径，永不删除任何行。试过放弃的方案：①把提示加回模板文件（10-05 的修法，10-07 thin-tasks-v3 已删）——实证会话里原文 3 秒前刚读过仍被改述，散文提示对生成模式滑误无效；②锚对比放宽为模糊匹配——防篡改语义丢失（软问题会被静默放过）；③整文件机器重生成 design——等于替 agent 重写书写面，违背 v2「书写面归 agent」契约。均否。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-draft.js | verifyThinDocsV2 加 charBigramSimilarity + 问题行机器回填（原位替换/节首插入、写失败降级文案带全文）+ repairs 返回；节被删/改写拒收文案带完整原文 |
| 修改 | src/flow.js | flow done artifacts 子步渲染 repairs 留痕行（🔧 前缀，空值防护） |
| 修改 | test/thin-docs-v2.test.mjs | 测试①改回填新语义；新增⑦（双路径/幂等）⑦b（四问全改述实证形态）；测试④补节被删文案带全文断言 |
