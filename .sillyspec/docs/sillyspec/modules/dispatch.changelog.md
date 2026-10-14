# dispatch 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-08-07-sillyhub-mcp-dispatch | 新建派发抽象层（probe/strategy/backends×2）+ dispatch CLI 子命令 + execute buildWavePrompt 接入。双后端 fallback，无 MCP 配置零回归。SillyHub 后端为路径A stub。
- ql-20260812-006-d70c | execute 测试用例设计引导注入：新增 `templates/prompts/testcase-design.md` 单一源（6 条检查 + FIRST/金字塔/AAA 一行带过），经 `{{include: testcase-design}}` 注入 renderLocalInstruction「子代理 prompt 要点」+ renderSillyHubInstruction worker_prompt 覆写（SillyHub worker 不见 wave prompt，必须自包含）。复用 P2.2.3 include 机制（resolvePromptIncludes 运行时解析）防双写漂移。
| 2026-09-10 | 2026-09-10-review-dispatch（P2） | src/review-dispatch.js 归属本模块：runReviewDispatch 三链（create/status/kill）+ probe 三层前置消费 + 在途记录状态机（O_EXCL/终态即清）+ artifacts 双通道回收；D-007 显式例外与防泛化护栏落卡定位段。gate 在途区分在 stage-review.js（core-engine）。 |
| 2026-10-12 | 2026-10-12-review-probe-injection | dogfood 实证驱动（fire-equipment 会话复盘）：三个生产缺陷（dva 双注册、MyBatis 别名冲 |
| 2026-10-14 | 2026-10-14-tdd-scope-guidance | TDD 分层适用引导：templates/prompts/testcase-design.md 单一源头部加「按层适用」块（纯逻辑严格先行/行为契约断用户所见/视觉样式与纯配置不写，一句话判据「当 X 发生时用户应看到/发生 Y」）——经既有 include 机制自动流入三派发路径；local-agent.js 写模式行 TDD 措辞带按层限定；机器门零改动；新增 test/tdd-scope-guidance.test.mjs。 |
