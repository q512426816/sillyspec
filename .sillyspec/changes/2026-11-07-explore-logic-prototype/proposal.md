---
author: flow-machine-draft
created_at: 2026-11-07T12:59:56.828Z
---
# 提案书（Proposal）— 2026-11-07-explore-logic-prototype

## 动机

任务原话转写：探索粗选件原型扩逻辑原型触发面

动机与背景：对照 mattpocock /prototype skill 三方分析（主分析+独立+证伪）终局结论——SillySpec 原型体系 UI-only，状态机/流程/时序类歧义缺「做能跑的东西给用户看」的通道；explore 粗选件框架天然适配（手绘合法/不进变更目录/仅用户明确要求），零下游配套。需求已含决策：方案经三方对照后由用户逐条审阅批准。

成功标准：
- explore prompt 触发面含「状态机/流程/时序类歧义文字问答装不下」形态
- 逻辑形含三要素（纯逻辑模块/状态面板每步重渲染/领域语言标注）+ 非 JS 项目复刻失真声明 + 不进变更目录（UI 契约件专属）
- 对比判据含结构性分歧要求（布局/信息层级/流转结构）与真实数据密度要求
- 粗选件定位不变：手绘合法、不进变更目录、仅用户明确要求触发
- brainstorm.js 零改动；docs/prompt 提取与 explore.md 同步一致
- .claude/skills/sillyspec-explore/SKILL.md 同步（含 description 触发词）
- explore 相关既有测试面跑绿（change-exists-validation / cli-top-level-aliases / default-no-dir-and-affinity）

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. explore prompt 触发面含「状态机/流程/时序类歧义文字问答装不下」形态
2. 逻辑形含三要素（纯逻辑模块/状态面板每步重渲染/领域语言标注）+ 非 JS 项目复刻失真声明 + 不进变更目录（UI 契约件专属）
3. 对比判据含结构性分歧要求（布局/信息层级/流转结构）与真实数据密度要求
4. 粗选件定位不变：手绘合法、不进变更目录、仅用户明确要求触发
5. brainstorm.js 零改动；docs/prompt 提取与 explore.md 同步一致
6. .claude/skills/sillyspec-explore/SKILL.md 同步（含 description 触发词）
7. explore 相关既有测试面跑绿（change-exists-validation / cli-top-level-aliases / default-no-dir-and-affinity）

## 成功标准（可验证）

1. explore prompt 触发面含「状态机/流程/时序类歧义文字问答装不下」形态
2. 逻辑形含三要素（纯逻辑模块/状态面板每步重渲染/领域语言标注）+ 非 JS 项目复刻失真声明 + 不进变更目录（UI 契约件专属）
3. 对比判据含结构性分歧要求（布局/信息层级/流转结构）与真实数据密度要求
4. 粗选件定位不变：手绘合法、不进变更目录、仅用户明确要求触发
5. brainstorm.js 零改动；docs/prompt 提取与 explore.md 同步一致
6. .claude/skills/sillyspec-explore/SKILL.md 同步（含 description 触发词）
7. explore 相关既有测试面跑绿（change-exists-validation / cli-top-level-aliases / default-no-dir-and-affinity）
