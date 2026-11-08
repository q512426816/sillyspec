---
author: flow-machine-draft
created_at: 2026-11-08T03:50:26.627Z
---
# 需求规格（Requirements）— 2026-11-08-hindsight-tasks-ratio-retire

## 功能需求

### FR-01: markHindsight 不再因 tasks 改写率产生标记与 reasons；HINDSIGHT_THRESHOLDS 移除 tasksRewriteRatio

- **必须**：`markHindsight` 判定面移除 tasksRewriteRatio 通路——无论 tasks 改写率多高，单独不再构成标记理由；`HINDSIGHT_THRESHOLDS` 导出对象删除 `tasksRewriteRatio` 键。
- **必须**：design 改写比（>0.5）、评审盲维（≥2）、实测失败（≥2）三路判定保持不变。

#### 场景：主路径

Given 收口时 tasksRewriteRatio=0.9 且其余三路均未超阈，When 调用 markHindsight，Then 返回 marked=false、不写标记文件。

#### 场景：组合超阈

Given tasksRewriteRatio=0.9 且 designRewriteRatio=0.8，When 调用 markHindsight，Then 标记成立且 reasons 只含 design 一路（不含 tasks 改写率字样）。

### FR-02: 旧标记文件（含 tasksRewriteRatio 字段）被 readHindsightHint/readHindsightMark 读取渲染不崩

- **必须**：存量 `.runtime/route-hindsight.json`（reasons 含「tasks 机器预填稿改写率」、metrics 含 tasksRewriteRatio）被 `readHindsightHint` / `readHindsightMark` 读取时正常返回结构化对象与提示文案，不抛错不崩溃（reasons 原样透传，metrics 额外字段不破坏渲染）。

#### 场景：存量标记

Given .runtime 下存在旧格式标记文件（含 tasksRewriteRatio），When flow start 读标记渲染同意门，Then 文案正常输出、门行为不变。

### FR-03: computeHindsightMetrics 返回面不再以 tasksRewriteRatio 参与判定（计算与字段保留为观测面）

- **必须**：`computeHindsightMetrics` 仍计算并返回 `tasksRewriteRatio`（观测面保留——D-003 自校准回路的未来重定阈依据），该字段不再被任何判定面消费；`raw` 面不变。

#### 场景：主路径

Given 有首版快照与终稿，When 调用 computeHindsightMetrics，Then 返回对象含 tasksRewriteRatio 数值（计算口径不变），且 markHindsight 对其不判定。

### FR-04: test/route-hindsight.test.mjs、test/prestage-consent-gate.test.mjs、test/flow-clarity-probe.test.mjs 全绿

- **必须**：三个测试文件按新口径改写断言后全部通过（route-hindsight 阈值/标记面、prestage 门构造面改 design 通路、flow-clarity-probe 实测断言改为不再因 tasks 改写率标记）。

#### 场景：回归

Given 判定面退役落盘，When 运行三测试文件，Then 全部用例通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/route-hindsight.test.mjs「阈值边界 + 标记判定（tasksRewriteRatio 通路退役）」
FR-02: test/route-hindsight.test.mjs「readHindsightHint/readHindsightMark 旧标记兼容」
FR-03: test/route-hindsight.test.mjs「computeHindsightMetrics 观测面保留（计算断言不变）」
FR-04: test/prestage-consent-gate.test.mjs「同意门（design 通路构造）」+ test/flow-clarity-probe.test.mjs「收口实测不再因 tasks 改写率标记」
