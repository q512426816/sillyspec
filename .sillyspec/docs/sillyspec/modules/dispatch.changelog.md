# dispatch 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-08-07-sillyhub-mcp-dispatch | 新建派发抽象层（probe/strategy/backends×2）+ dispatch CLI 子命令 + execute buildWavePrompt 接入。双后端 fallback，无 MCP 配置零回归。SillyHub 后端为路径A stub。
- ql-20260812-006-d70c | execute 测试用例设计引导注入：新增 `templates/prompts/testcase-design.md` 单一源（6 条检查 + FIRST/金字塔/AAA 一行带过），经 `{{include: testcase-design}}` 注入 renderLocalInstruction「子代理 prompt 要点」+ renderSillyHubInstruction worker_prompt 覆写（SillyHub worker 不见 wave prompt，必须自包含）。复用 P2.2.3 include 机制（resolvePromptIncludes 运行时解析）防双写漂移。
| 2026-09-10 | 2026-09-10-review-dispatch（P2） | src/review-dispatch.js 归属本模块：runReviewDispatch 三链（create/status/kill）+ probe 三层前置消费 + 在途记录状态机（O_EXCL/终态即清）+ artifacts 双通道回收；D-007 显式例外与防泛化护栏落卡定位段。gate 在途区分在 stage-review.js（core-engine）。 |
