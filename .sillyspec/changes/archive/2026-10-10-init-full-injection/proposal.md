---
author: flow-machine-draft
created_at: 2026-10-10T01:32:29.576Z
---
# 提案书（Proposal）— 2026-10-10-init-full-injection

## 动机

任务原话转写：init 注入 Agent 指引时，AGENTS.md 已存在的仓只追加一小段受管块（INJECTION_CONTENT：读 scan 文档/grep 验方法/progress show），agent 拿不到流程规则与核心约束，注入形同虚设；且小段内容陈旧（progress show 描述过时、未提 flow/核心规则）。

用户决策：不管什么情况，init 都写入完整指引（templates/agents-instruction.md 全文），INJECTION_CONTENT 小段方案连同代码删除。

成功标准：
- AGENTS.md 已存在（无标记）时，追加的受管块内容为完整模板全文（用户原文字节保留在块外）
- gemini/opencode（GEMINI.md / INSTRUCTIONS.md）同样注入完整指引，版本标记幂等（同版本跳过、异版本刷新块）
- codex/gemini/opencode 老安装的旧 ## SillySpec 小段重跑 init 时迁移为完整受管段，不双段
- INJECTION_CONTENT 常量删除（旧文本仅保留于旧段迁移函数内作精确匹配用）
- package.json 版本 bump：已装仓重跑 init 经版本差触发受管段升级为完整内容（2026-09-25-thin-release-pack 实证教训：只改模板不升版本=传播零效果）
- test/init-agents-injection.test.mjs 及相关测试全绿，lint 通过

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. AGENTS.md 已存在（无标记）时，追加的受管块内容为完整模板全文（用户原文字节保留在块外）
2. gemini/opencode（GEMINI.md / INSTRUCTIONS.md）同样注入完整指引，版本标记幂等（同版本跳过、异版本刷新块）
3. codex/gemini/opencode 老安装的旧 ## SillySpec 小段重跑 init 时迁移为完整受管段，不双段
4. INJECTION_CONTENT 常量删除（旧文本仅保留于旧段迁移函数内作精确匹配用）
5. package.json 版本 bump：已装仓重跑 init 经版本差触发受管段升级为完整内容（2026-09-25-thin-release-pack 实证教训：只改模板不升版本=传播零效果）
6. test/init-agents-injection.test.mjs 及相关测试全绿，lint 通过

## 成功标准（可验证）

1. AGENTS.md 已存在（无标记）时，追加的受管块内容为完整模板全文（用户原文字节保留在块外）
2. gemini/opencode（GEMINI.md / INSTRUCTIONS.md）同样注入完整指引，版本标记幂等（同版本跳过、异版本刷新块）
3. codex/gemini/opencode 老安装的旧 ## SillySpec 小段重跑 init 时迁移为完整受管段，不双段
4. INJECTION_CONTENT 常量删除（旧文本仅保留于旧段迁移函数内作精确匹配用）
5. package.json 版本 bump：已装仓重跑 init 经版本差触发受管段升级为完整内容（2026-09-25-thin-release-pack 实证教训：只改模板不升版本=传播零效果）
6. test/init-agents-injection.test.mjs 及相关测试全绿，lint 通过
