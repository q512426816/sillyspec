---
author: flow-machine-draft
created_at: 2026-10-05T14:07:36.085Z
---
# 需求规格（Requirements）— 2026-10-05-input-format-copy

## 功能需求

### FR-01: 4 处教学点全部带过门格式（独立一行『成功标准：』+ 每行一条『- 可验证标准』的教学形态）；紧凑内联旧形态零残留

- flow start 的全部 CLI 教学点（run/command.js 空态引导、flow.js 重试提示、flow.js 用法行、hooks/worktree-guard.js 三处 stage 提示）必须带过门格式教学（与 index.js:224 / AGENTS.md 同口径：动机与背景在前；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』）；禁止保留紧凑内联形态「<动机；成功标准：每行一条可验证标准>」（extractSuccessCriteria 实测提取 0 条，照抄必弹 exit 2）。

#### 场景：主路径

- Given: agent 从 status 空态引导/flow 用法行/重试提示/hook stage 提示任一处看到 --input 教学
- When: 照教学形态构造 --input 并跑 flow start
- Then: 成功标准提取 ≥1 条（过清晰度门，不弹 exit 2）

### FR-02: quick 会话的 --input "<一句话任务描述>"（另一语义门）与 run --done --input "用户原话" 不受影响

- 另一语义门的 --input 教学（quick 会话一句话描述、run --done 用户原话）必须保持原样——它们不过成功标准门，格式要求不适用。

#### 场景：主路径

- Given: 源级回归测试扫描
- When: 断言两类 --input 教学仍在场
- Then: quick/run --done 的 --input 教学原文保留

### FR-03: 源级回归测试锁定：flow start 教学行不再出现无格式/紧凑内联形态

- 必须有源级回归测试锁定：紧凑内联形态零残留、4 处教学点带格式、另一语义门不受影响。

#### 场景：主路径

- Given: 仓内源码
- When: 回归测试执行
- Then: 三组断言成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/input-format-copy.test.mjs「① 紧凑内联旧形态零残留 + ② 4 处教学点均带独立一行『成功标准：』教学」
FR-02: test/input-format-copy.test.mjs「③ 另一语义门的 --input 不受影响」
FR-03: test/input-format-copy.test.mjs「① + ② + ③ 三组断言齐备」
