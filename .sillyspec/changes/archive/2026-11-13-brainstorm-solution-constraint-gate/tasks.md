---
author: flow-machine-draft
created_at: 2026-11-13T13:36:46.471Z
---
# 任务注册表（Tasks）— 2026-11-13-brainstorm-solution-constraint-gate

- [x] task-01: `src/stages/brainstorm.js`「提出 2-3 种方案」prompt 操作开头新增「先固守约束」：汇总 `[用户]` 需求点 / accepted 决策 / 用户硬边界为编号 C1..Cn，逐方案逐条满足，不满足者不得进对比表（验证：通读该 step prompt 与 FR-01 逐条对表）
- [x] task-02: 同节新增单方案如实上报（仅 1 个合格时只报 1 个 + 淘汰方案违反编号）与约束冲突处理（先提冲突取舍、禁造假选项）（验证：通读与 FR-02/FR-03 对表）
- [x] task-03: 同节新增提交前自检表（逐方案×逐约束打勾；取舍轴差异检查，同位置必须合并）（验证：通读与 FR-04 对表）
- [x] task-04: 新增 `test/brainstorm-solution-constraint-gate.test.mjs`，断言四组新规则文案 + 镜像与 `_extracted.json` 一致（验证：`node --test test/brainstorm-solution-constraint-gate.test.mjs` 通过）
- [x] task-05: 运行 `node docs/prompt/_extract.mjs` 刷新 `docs/prompt/_extracted.json`，并逐字同步 `docs/prompt/brainstorm.md`（验证：脚本执行成功 + `git diff` 仅含预期文本）
- [x] task-06: 回归新增测试与既有 `test/brainstorm-interaction-refine.test.mjs` 等相关用例（验证：全部通过，全量套件归 CI）
