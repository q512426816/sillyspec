---
author: flow-machine-draft
created_at: 2026-10-15T02:10:38.710Z
---
# 需求规格（Requirements）— 2026-10-15-harvest-title-clarify

## 功能需求

### FR-01: 收割生成的 D-001 标题不含「槽4/收割」等机制词，直接说明内容（设计期风险与放弃方案）与底稿性质

- harvestSlot4Decision 合成 decisions.md 时，D-001 条目标题必须为 `## D-001@v1: 设计期风险与放弃方案（底稿）`，标题中禁止出现「槽4」「收割」字样。

#### 场景：主路径

- Given 变更目录有含「风险与死路」节实质作答的 design.md 且无 decisions.md
- When 调用 harvestSlot4Decision
- Then 生成的 decisions.md 含 `## D-001@v1: 设计期风险与放弃方案（底稿）`，且标题行不含「槽4」「收割」

### FR-02: 机器合成出处仍可追溯（frontmatter author: flow-machine-draft 保留）

- 收割生成的 decisions.md frontmatter 必须保留 `author: flow-machine-draft`（机器合成出处以此承载，标题不再重复）。

#### 场景：主路径

- Given harvestSlot4Decision 执行收割
- When 读取生成的 decisions.md 头部 frontmatter
- Then `author: flow-machine-draft` 在场

### FR-03: 测试补新标题断言并跑绿；历史归档件与存量 knowledge 不回改

- 本变更必须新增收割条目标题断言测试并跑绿；必须禁止回改 `.sillyspec/changes/archive/` 下历史 decisions.md 与已蒸馏 knowledge 的旧标题（历史原样保留，新旧标题自然共存）。

#### 场景：主路径

- Given 旧标题存量存在于归档件与 knowledge
- When 本变更交付
- Then 测试面覆盖新标题断言且绿，diff 面不触及 archive 与 knowledge 中的旧标题条目

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/slot4-distill-fix.test.mjs「③ 收割条目标题自解释（无机制词+frontmatter 出处保留）」
FR-02: test/slot4-distill-fix.test.mjs「③ 收割条目标题自解释（无机制词+frontmatter 出处保留）」
FR-03: 不适用：不回改是本变更 diff 面约束（收口 scope audit 直接可见），产品行为无可测面；标题断言补齐由 FR-01/02 绑定用例承担
