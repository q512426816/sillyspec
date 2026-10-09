---
author: agent-main-rejected-write
created_at: 2026-10-09T15:30:00.000Z
---
# 决策记录（Decisions）— 2026-10-09-rejected-write-side

## D-001@v1: 写侧供料——死路走 rejected 通道的指令落点
- type: process
- status: confirmed
- source: user
- question: 防复潮 rejected 通道写侧断供，供料指令落在哪一层？
- answer: 产生侧指令（brainstorm 提出方案步+对账步）与收割面底稿定性（flow 收割提示行+skill 指引）四个落点；机器收割器、蒸馏器、needsWait 闸原样不动——语义归 agent、机械转写归收割器、闸门已有只缺指令
- normalized_requirement: 落选/放弃方案必须以独立 rejected 条目落盘（否决理由+复潮条件必填），禁止只埋在所选/主条目 answer 散文里
- impacts: [FR-01, FR-02, FR-03, FR-04]
- evidence: src/stages/brainstorm.js 提出方案步第 6 条与对账步补记句；src/flow.js 槽4 收割提示行；.claude/skills/sillyspec-flow/SKILL.md 直接干活节
- priority: P1
- 锚点: src/stages/brainstorm.js:223

## D-002@v1: 收割器机器自动拆 rejected 条目
- type: process
- status: rejected
- source: code
- question: 落选方案的 rejected 拆条能否由 harvestSlot4Decision 机械完成？
- answer: 不采用——拆条留在 agent 侧（D-001 路线）
- normalized_requirement: 不适用：rejected 条目无实现落点
- impacts: [FR-03]
- evidence: src/flow-parity.js harvestSlot4Decision（纯机械转写，无语义）
- priority: P2
- 否决理由: 收割器是纯机械转写器，判不了「放弃方案」分界；槽4 模板问题文本每变更一字不差，照抄进条目零检索价值
- 复潮条件: 槽4 作答先结构化（如模板化字段）使「放弃方案」出现可稳定解析的机械判据时可复潮

## D-003@v1: distill 侧从 confirmed 散文解析死路自动拆条
- type: process
- status: rejected
- source: code
- question: 死路拆条能否后移到归档蒸馏的纯函数层？
- answer: 不采用——语义判断后移到无 LLM 的层是更差的位置
- normalized_requirement: 不适用：rejected 条目无实现落点
- impacts: [FR-04]
- evidence: src/decision-distill.js 入选规则（纯函数，无语义面）
- priority: P2
- 否决理由: 把语义判断后移到无 LLM 的纯函数层，散文「放弃方案①②③」形态解析脆弱，误拆漏拆都无兜底
- 复潮条件: decisions.md 作答全面结构化后（拆条在写侧完成成为前提），蒸馏层才有机械判据——彼时本方案反而无必要

## D-004@v1: 只修厚道不动轻量道
- type: process
- status: rejected
- source: user
- question: 覆盖范围是否可只改 brainstorm 一条道？
- answer: 不采用——两道同修
- normalized_requirement: 不适用：rejected 条目无实现落点
- impacts: [FR-03]
- evidence: 会话裁决（用户问「轻量变更和厚流程都要调整的吧」确认两道同修）
- priority: P2
- 否决理由: 两道死路埋法同构（轻量收割模板必然埋散文），只修一半防复潮覆盖减半且 agent 行为指引不一致
- 复潮条件: 轻量道废弃或槽4 收割机制下线时本裁定点自然消失
