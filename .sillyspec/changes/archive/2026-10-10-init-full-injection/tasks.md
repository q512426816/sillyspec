---
author: flow-machine-draft
created_at: 2026-10-10T01:32:29.576Z
---
# 任务注册表（Tasks）— 2026-10-10-init-full-injection

- [x] task-01: AGENTS.md 已存在（无标记）时，追加的受管块内容为完整模板全文（用户原文字节保留在块外）
- [x] task-02: gemini/opencode（GEMINI.md / INSTRUCTIONS.md）同样注入完整指引，版本标记幂等（同版本跳过、异版本刷新块）
- [x] task-03: codex/gemini/opencode 老安装的旧 ## SillySpec 小段重跑 init 时迁移为完整受管段，不双段
- [x] task-04: INJECTION_CONTENT 常量删除（旧文本仅保留于旧段迁移函数内作精确匹配用）
- [x] task-05: package.json 版本 bump：已装仓重跑 init 经版本差触发受管段升级为完整内容（2026-09-25-thin-release-pack 实证教训：只改模板不升版本=传播零效果）
- [x] task-06: test/init-agents-injection.test.mjs 及相关测试全绿，lint 通过
