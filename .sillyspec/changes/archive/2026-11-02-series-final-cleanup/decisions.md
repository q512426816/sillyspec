# 决策记录

## D-001@v1 unmapped 降权参与推迟——模板底稿不清零不解禁
状态：implemented
变更：2026-11-02-series-final-cleanup
锚点：src/knowledge-match.js:133
理由：4A/4B 实证停车场主体是模板底稿（本仓 47 条、平台 173 条，全是 harvestSlot4Decision 产的 process 级流程取舍）；distill 持续产出使「模板清零」成移动靶。本变更先落底稿资格门（deathPath 不赋模板标题条目），使停车场回涨不再影响防复潮席位。
复潮条件：底稿资格门落地（本变更）+ 停车场真实残量（非模板类）≤5 条 + 全量 eval 五面不回归。满足后可按 4A 审查修正版的「逐条兜底通道」方案解禁（不解禁路由行、不进 DF 分母）。
落地层：测试（test/knowledge-rank-denoise.test.mjs「底稿资格门」用例）+ 接口（knowledge-match.js deathPath 排除条件）。
