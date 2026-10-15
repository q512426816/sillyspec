---
author: flow-machine-draft
created_at: 2026-10-15T10:52:47.115Z
---
# 决策记录（Decisions）— 2026-10-15-plan-review-focus

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 锚点：src/stage-review-checklist.js
- 答案：- **最大风险：盲区清单的填写质量不可机械验证**（与上一变更同款风险）。盲区是"没人想到要声明的东西"，agent 填不出真盲区时会写占位行。缓解：①要求每条必须带承接落点（task 的 acceptance/测试）——空承接的行在审查步会被抓；②「已检查，无」显式出口让"没找到"合法，降低编造动机；③审查计划步把"每行有承接测试"列为复查项，双层。 - **次风险：≤5 条上限被当作目标凑满**。缓解：模板文本明确"上限不是配额——写不出第 4 条就停，宁缺毋滥"；审查复查项盯"编造低价值行"。 - **与既有「禁止泛泛风险分析」约束的表观张力**：Review Focus 行若写成"并发场景需注意"就是泛泛风险分析——文本里明确要求行=具体输入/条件+可判定预期行为，与泛泛风险互斥；这条张力是设计意图（盲区行是具体化的风险，不是风险登记表的复制）。 - **放弃的方案**： - *在 `src/stage-review-checklist.js` 加三条清单项*：快照测试与字面引用面（plan-postcheck/worker_prompt）使任何改动都要连锁更新多处——收益不成比例；prompt 侧独立小节零连锁。 - *给 plan-postcheck 加 Review Focus 在场性 warning*：向后兼容面（存量在途变更的 plan.md 无此节会新增告警噪声）+ 需要新代码与测试；留作观察一批后再决定是否机械化的后续决策。 - *把 Review Focus 放进 TaskCard frontmatter 新字段*：卡片 frontmatter 被 plan-postcheck 硬校验（缺字段阻断），新字段=格式破坏性变更；plan.md 一节零 schema 面。
