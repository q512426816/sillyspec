# Spec: knowledge 词汇通道（常读词汇旁路注入 + ADR 三条件门）

Status: ready-for-agent
Published: 2026-11-22（mattpocock-absorb 工作树，to-spec 产出）

## Problem Statement

SillySpec 仓的域词汇（术语与定义）散落在 knowledge 各文件里，只有检索命中才注入——agent 会话没主动检索时拿不到术语基准，导致对话中术语漂移、每个会话重新定义一遍；维护者为让术语被看到，只能把定义复制进多条知识条目，形成复制漂移。今天用 Matt 的 grill-with-docs 跑真实需求的实证：GLOSSARY 里四个术语（吸收/批次/纪律原语/前沿）一旦定义，后续对话零歧义——语言先行是真实收益，不是理论。

## Solution

knowledge 增设「词汇通道」：维护一份常读词汇文件，CLI 在知识注入时点**无条件旁路注入**（不经三层检索匹配、不占命中名额）；词汇文件缺失时静默继续（绿地仓零仪式成本）；配套 ADR 三条件门（难逆+无上下文会惊讶+真权衡，缺一跳过）防决策记录通胀。

## User Stories

1. As a 变更执行 agent, I want 每步知识注入时点都附带常读术语基准, so that 我无需主动检索就能用对域词汇
2. As a 变更执行 agent, I want 词汇基准在 Wave 级子代理 prompt 里同样在场, so that 子代理与主代理共享同一套语言
3. As a 新会话 agent, I want 冷启动即拿到词汇基准, so that 首步就避免术语误用
4. As a 维护者, I want 词汇集中一处单一源维护, so that 改一个定义所有会话立即生效
5. As a 维护者, I want 词汇文件缺失时系统静默继续, so that 绿地仓/轻量仓无仪式成本
6. As a 维护者, I want 词汇注入有行数上限与超限留痕, so that 词汇膨胀不会无声吃掉 prompt 预算
7. As a 维护者, I want 词汇旁路与检索命中在遥测里可区分, so that 观测面不混淆两个通道
8. As a 记录决策的 agent, I want 记决策时有三条件提示（难逆+惊讶+真权衡）, so that 我不为不满足条件的决定写决策记录
9. As a 评审 agent, I want 决策提示面引导我复核三条件, so that 我知道哪些决策值得惊讶
10. As a 后续会话 agent, I want 词汇通道的加入不削弱停车场防复潮, so that 被否决的重复提案仍被拦截

## Implementation Decisions

1. 词汇通道是知识注入的**旁路**：不进三层匹配（路由 tag/词片/停车场），不占 top-3 文件名额，不进命中分母
2. 词汇来源：knowledge 目录单一词汇文件，术语+定义行式；**缺失→跳过注入且不告警**（proceed silently，消费端纪律）
3. 注入形态：独立小节（词汇基准段），与「命中知识」段并列；行数上限截断，超限一次性留痕
4. 覆盖面：阶段级注入与 Wave 级注入同挂
5. ADR 三条件门挂决策记录提示面（提示词纪律，不设机器硬拦——三条件是语义判断）
6. 既有路由表/匹配算法/停车场机制零改动（既有行为零回归；D-001 边界：不取代 knowledge，是旁路补充）
7. 遥测：词汇注入记独立 type，与检索命中可区分

## Testing Decisions

- 只测外部行为：注入函数输出的 section 文本形态（词汇段在场/缺失静默/截断/不挤占 top-3），不测内部解析细节
- 接缝（用户已确认）：主接缝=阶段级注入纯函数；次接缝=Wave 级注入函数；弱接缝=决策提示文本验收
- 先例：既有知识注入测试族（段形态断言、按名计数）
- 「重构后行为不变则测试不动」：词汇旁路是新增行为，既有测试零修改即绿是回归线

## Out of Scope

- GLOSSARY 取代 knowledge 通道（D-001 已否决，不重开）
- 多上下文词汇映射（GLOSSARY-MAP 形态）
- agent 侧主动写词汇文件（domain-modeling 写面=agent 纪律，非 CLI 机制）
- T2 retro 环境轴（随件在链路收尾做）、T3/T4/T5（体验报告沉淀）
- 词汇的语义检索/向量召回

## Further Notes

- 本 spec 由 mattpocock/skills 的 to-spec 流程产出（吸收工作树实验场）；正式收口走 SillySpec 变更（spec 面转写为 FR+design 四节）
- 接缝讨论与 grilling 全过程见会话记录；差距矩阵见同目录 gap-matrix.md（T1 项）
- Wave 面词汇注入不落 vocab-inject 遥测（票 02 设计选择：旁路零遥测参与，观测以阶段级为准）
- Matt 原版参考锚：domain-modeling 三条件门（:68-74）、proceed silently（setup/domain.md:11）、GLOSSARY 惰性消费——见 inventories.md
