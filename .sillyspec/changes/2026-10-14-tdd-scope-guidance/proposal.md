---
author: flow-machine-draft
created_at: 2026-10-14T01:01:21.282Z
---
# 提案书（Proposal）— 2026-10-14-tdd-scope-guidance

## 动机

任务原话转写：指引声明 TDD 但未限定适用范围——规则 3 执行顺序与 execute/dispatch 提示词都无差别要求先写测试，下游 agent 会把 test-first 执行到视觉样式层与纯配置面，产出断言 className 式负资产测试（用户原话：前端 TDD 很多地方做测试是多余的，TDD 范围我们还得再引导下；分层模型=纯逻辑先行/行为契约断言用户所见/样式与纯配置不写，上轮讨论已确认）。

成功标准：
- TDD 声明面全部带分层适用：纯逻辑严格先写测试、行为契约断言用户可见行为、视觉样式与纯配置不写测试（记「不适用：理由」）——覆盖 testcase-design 单一源、规则 3 三实例（agents-instruction 模板/AGENTS.md/CLAUDE.md）、execute 阶段提示词、dispatch 双后端、flow 命令卡
- 机器门零改动（只动引导措辞，不动 src/flow.js 门逻辑）
- 新增范围断言测试与既有注入测试（execute/quick-testcase-design-include 等）全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. TDD 声明面全部带分层适用：纯逻辑严格先写测试、行为契约断言用户可见行为、视觉样式与纯配置不写测试（记「不适用：理由」）——覆盖 testcase-design 单一源、规则 3 三实例（agents-instruction 模板/AGENTS.md/CLAUDE.md）、execute 阶段提示词、dispatch 双后端、flow 命令卡
2. 机器门零改动（只动引导措辞，不动 src/flow.js 门逻辑）
3. 新增范围断言测试与既有注入测试（execute/quick-testcase-design-include 等）全绿

## 成功标准（可验证）

1. TDD 声明面全部带分层适用：纯逻辑严格先写测试、行为契约断言用户可见行为、视觉样式与纯配置不写测试（记「不适用：理由」）——覆盖 testcase-design 单一源、规则 3 三实例（agents-instruction 模板/AGENTS.md/CLAUDE.md）、execute 阶段提示词、dispatch 双后端、flow 命令卡
2. 机器门零改动（只动引导措辞，不动 src/flow.js 门逻辑）
3. 新增范围断言测试与既有注入测试（execute/quick-testcase-design-include 等）全绿
