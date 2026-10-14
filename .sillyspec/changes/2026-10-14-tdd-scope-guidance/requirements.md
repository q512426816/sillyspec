---
author: flow-machine-draft
created_at: 2026-10-14T01:01:21.282Z
---
# 需求规格（Requirements）— 2026-10-14-tdd-scope-guidance

## 功能需求

### FR-01: TDD 声明面全部带分层适用：纯逻辑严格先写测试、行为契约断言用户可见行为、视觉样式与纯配置不写测试（记「不适用：理由」）——覆盖 testcase-design 单一源、规则 3 三实例（agents-instruction 模板/AGENTS.md/CLAUDE.md）、execute 阶段提示词、dispatch 双后端、flow 命令卡

- TDD 声明面必须带分层适用引导：纯逻辑必须先写测试再实现；行为契约必须断言用户可见行为（禁止为样式类/className 写断言）；视觉样式与纯配置/文档禁止写测试（测试绑定必须记「不适用：理由」，验收靠规范与人工）。一句话判据必须在场：能写成「当 X 发生时，用户应看到/发生 Y」→ 写测试；只能描述成「看起来更精致」→ 不写。

#### 场景：主路径

Given agent 在 execute/轻量道拿到含 testcase-design include 的提示词 → When 任务触及视觉样式或纯配置层 → Then 提示词明示该层不写测试、绑定记「不适用：理由」；When 任务触及纯逻辑 → Then 明示严格 test-first。

### FR-02: 机器门零改动（只动引导措辞，不动 src/flow.js 门逻辑）

- 本变更必须保持机器门零改动：禁止触碰 src/flow.js 任何门逻辑（实测门/文档校验/冻结面流程行为必须逐字节不变），仅允许引导措辞面变更。

#### 场景：主路径

Given 本变更两笔提交（99eaf0a7 起）→ When 审计其提交面 → Then pathspec 不含 src/flow.js（工作树中 src/flow.js 的 M 归属并行会话 2026-10-14-turbo-guide-tier-copy，非本变更）。

### FR-03: 新增范围断言测试与既有注入测试（execute/quick-testcase-design-include 等）全绿

- 新增 test/tdd-scope-guidance.test.mjs 必须断言：单一源按层适用块与一句话判据在场、标题与 7 条检查逐字保留、规则 3 三实例尾注、execute/dispatch 双后端/flow 命令卡限定、docs/prompt 提取副本同步；既有注入测试（execute/quick-testcase-design-include、verify-probes-assertion-quality、input-teach-copyable、quick-retired）必须零回归。

#### 场景：主路径

Given 上述措辞面落盘 → When 逐文件断言 → When 跑既有注入测试 → Then 新增 23 断言全过且既有测试全绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/tdd-scope-guidance.test.mjs「单一源含按层适用块＋标题与7条检查不破＋规则3三实例尾注＋execute·dispatch·flow卡限定＋提取副本同步」
FR-02: 不适用：约束型 FR——以提交面为证（两笔提交 pathspec 均不含 src/flow.js，工作树 src/flow.js 改动归属并行会话 turbo-guide-tier-copy），无自动化断言面
FR-03: test/tdd-scope-guidance.test.mjs「全部通过（23 断言）」；回归面 test/execute-testcase-design-include.test.mjs、test/quick-testcase-design-include.test.mjs、test/verify-probes-assertion-quality.test.mjs、test/input-teach-copyable.test.mjs、test/quick-retired.test.mjs（全绿零回归）
