---
author: flow-machine-draft
created_at: 2026-11-21T15:30:29.822Z
---
# 设计记录（Design Record）— 2026-11-21-prompt-microdesign-pack

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按 docs/ROADMAP.md「mattpocock/skills 吸收路线」批 1，把五条提示词微设计直接织入阶段提示词源码：brainstorm.js 两处（design 模板 8.5「测试 seam 约定」节+提问措辞「是=接受推荐」）、execute.js 三处（代码审查三层优先级/DEBUG 前缀/变异自证）、verify.js+verify-probes.js 一处（风险节回退门+爆炸半径字段），另建 out-of-scope 沉淀位。8.5 节采用 7.5 生命周期契约表的条件必填+豁免短语模式（不进 stage-contract-spec 硬门禁），使联动面收敛在模板×骨架×帮助文案×章节契约测试四处。提示词为数据源不是逻辑，改后机械再生 docs/prompt 镜像与 prompt 金档（设计内的快照维护通道）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无函数签名变化。可见行为变化：①design-init 生成的 design.md 骨架新增「## 测试 seam 约定」一节（十三章节→十四章节）；②brainstorm/execute/verify 阶段注入 prompt 文本更新（docs/prompt 镜像与金档同步）；③verify-probes --init 骨架「变更风险等级」节 TODO 槽新增回退门/爆炸半径两占位。CLI 命令面零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用：提示词模板为静态数据源，无事件顺序语义。8.5 节对存量已生成的 design.md 无追溯力——存量变更不受影响（骨架「已存在不覆盖」幂等保护），仅新变更按新模板作答。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   src/stages/*.js 为共享源码文件，多会话并行改同一文件有冲突风险——本变更各插入点互不相邻、按文件分批 Edit；提交用显式 pathspec，不夹带并行会话文件。镜像与金档再生在源码提交面稳定后执行，随同一提交入库。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   每处 Edit 独立幂等（提示词字符串替换），中断恢复重跑即可；金档再生有专用环境变量通道（SILLYSPEC_REGEN_PROMPT_GOLDEN=1），不会误触发。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不跨仓：docs/prompt 镜像只反映本仓 src/stages 源码。out-of-scope 目录为本仓 docs 新增子目录，纯静态文档无运行时语义。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：8.5 节做成必填硬门禁会拦存量形态的 design.md（骨架幂等不覆盖旧文件），且 plan 阶段 validateDesignForPlan 联动改造扩大面——已放弃：改为 7.5 同款「条件必填+紧邻豁免短语」软模式，硬校验留待真实使用反馈后再评估。次风险：prompt 文本膨胀与「文本经济学」改造方向（批 3c）相逆——本批为点状织入（每处 2-6 行），膨胀可控；系统瘦身归批 3。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 提问分型补「是=接受推荐」措辞；design 模板插 8.5「测试 seam 约定」节 |
| 修改 | src/design-facts.js | generateDesignSkeleton 加 8.5 节骨架行+「十三章节」注释改「十四章节」 |
| 修改 | src/index.js | design-init 帮助文案「十三章节」→「十四章节」（3 处） |
| 修改 | src/stages/execute.js | 代码审查三层优先级；DEBUG 前缀铁律；反例测试核对补变异自证 |
| 修改 | src/stages/verify.js | 风险节补「回退门+爆炸半径」两字段要求 |
| 修改 | src/verify-probes.js | 骨架「变更风险等级」TODO 槽补两字段占位 |
| 修改 | test/design-facts.test.mjs | THIRTEEN_SECTIONS→FOURTEEN_SECTIONS 契约扩断言 |
| 修改 | test/prompt-golden.json | 金档再生（SILLYSPEC_REGEN_PROMPT_GOLDEN=1，随同一提交入库） |
| 修改 | docs/prompt/*（_extract.mjs 再生） | 镜像同步（brainstorm/execute/verify 对应 md 与 _extracted.json） |
| 新增 | docs/sillyspec/out-of-scope/README.md | 目录用途说明 |
| 新增 | docs/sillyspec/out-of-scope/mattpocock-skills-full-adoption.md | 首个被拒概念文件 |
