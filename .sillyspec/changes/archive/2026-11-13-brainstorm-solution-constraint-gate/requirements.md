---
author: flow-machine-draft
created_at: 2026-11-13T13:36:46.471Z
---
# 需求规格（Requirements）— 2026-11-13-brainstorm-solution-constraint-gate

## 功能需求

### FR-01: src/stages/brainstorm.js「提出 2-3 种方案」步骤 prompt 新增硬约束准入门槛：每个候选方案必须逐条满足已确认需求点（[用户]）、decisions.md 中 status=accepted 的 normalized_requirement 与用户硬边界，不满足者不得列入对比表

- 系统必须在生成候选方案前，把前置阶段已确认需求点（`[用户]`）、`decisions.md` 中 `status: accepted` 的 `normalized_requirement` 以及用户显式硬边界汇总为编号硬约束清单（C1..Cn）；每个候选方案必须逐条满足全部硬约束，任一不满足的方案禁止作为候选列入对比表。

#### 场景：主路径

- Given 前置阶段已产出 N 条 `[用户]` 需求点与 M 条 accepted 决策
- When 执行「提出 2-3 种方案」步骤
- Then 输出先给出编号硬约束清单 C1..Cn，每个候选方案附逐条满足矩阵，且不存在带 ✗ 的候选方案

### FR-02: 仅 1 个方案满足全部硬约束时，如实只报 1 个并列出淘汰方案各自违反的约束编号，禁止凑数补到 2-3 个

- 当穷尽可行实现路径后只有 1 个方案满足全部硬约束时，系统必须如实只报这 1 个方案，并列出被淘汰方案各自违反的约束编号；禁止为凑足 2-3 个而纳入不满足约束的方案。

#### 场景：单方案边界

- Given 可行的实现路径中仅 1 条满足全部 C1..Cn
- When 组织方案对比
- Then 对比表只含 1 个候选，并附「淘汰方案 × 违反约束编号」列表，不出现凑数方案

### FR-03: 约束间真实冲突时先提出冲突与取舍建议，禁止构造故意违反约束的假选项

- 当两条及以上硬约束实际无法同时满足时，系统必须先向用户提出约束冲突（冲突编号、各自代价、建议取舍），禁止构造一个故意违反某条硬约束的假选项来充作备选。

#### 场景：约束冲突

- Given C2 与 C5 在现有代码基础上无法同时满足
- When 生成方案
- Then 输出显式标注冲突（C2 × C5）并给出取舍建议，方案列表不含故意违反 C2 或 C5 的假选项

### FR-04: 新增提交前自检表（逐方案×逐约束打勾、取舍轴差异检查）

- 系统必须在提交方案前执行自检表：逐方案 × 逐硬约束打勾，任一 ✗ 的方案禁止进入对比表；两两方案必须在至少一个工程取舍轴（实现路径 / 依赖引入 / 改动面 / 运行成本 / 迁移成本 / 可维护性 / 失败代价）上位置不同，否则必须合并。

#### 场景：凑数方案自检

- Given 方案 B 与方案 A 在全部取舍轴上位置相同，或方案 B 对某约束打 ✗
- When 提交前跑自检表
- Then 方案 B 被合并或剔除，不进入对比表

### FR-05: node docs/prompt/_extract.mjs 刷新 _extracted.json，docs/prompt/brainstorm.md 镜像逐字同步

- 修改 prompt 后必须运行 `node docs/prompt/_extract.mjs` 刷新 `docs/prompt/_extracted.json`，并保证 `docs/prompt/brainstorm.md` 的提示词正文与源码逐字一致。

#### 场景：镜像同步

- Given 源码 prompt 已变更
- When 运行提取脚本并同步镜像
- Then `_extracted.json` 与 `docs/prompt/brainstorm.md` 均反映新文案，且镜像与源码逐字一致

### FR-06: 相关测试用例跑绿且覆盖上述新规则文案

- 必须新增测试用例，断言「提出 2-3 种方案」prompt 含硬约束准入门槛、单方案如实上报、冲突处理与提交前自检表文案，并保证相关测试用例全部通过。

#### 场景：回归

- Given 新文案已落盘
- When 运行新增测试与既有 brainstorm 相关测试
- Then 全部通过，且新测试对新规则关键句有断言

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-solution-constraint-gate.test.mjs「硬约束准入门槛文案存在」
FR-02: test/brainstorm-solution-constraint-gate.test.mjs「单方案如实上报与禁凑数文案存在」
FR-03: test/brainstorm-solution-constraint-gate.test.mjs「约束冲突处理文案存在」
FR-04: test/brainstorm-solution-constraint-gate.test.mjs「提交前自检表文案存在」
FR-05: test/brainstorm-solution-constraint-gate.test.mjs「镜像与提取产物同步」
FR-06: test/brainstorm-solution-constraint-gate.test.mjs「相关测试全部通过」
