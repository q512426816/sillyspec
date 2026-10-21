---
author: flow-machine-draft
created_at: 2026-10-21T06:18:15.804Z
---
# 需求规格（Requirements）— 2026-10-21-flow-skill-askuser

## 功能需求

### FR-01: .claude/skills/sillyspec-flow/SKILL.md 出现「交互规范」节，含 AskUserQuestion 强制句与禁编号列表句，语义与 sillyspec-brainstorm 同版

- 轻量变更 skill 指令文件（`.claude/skills/sillyspec-flow/SKILL.md`，skills 复制源即本仓 `.claude/skills/`）必须包含「## 交互规范」节，节文必须与 `.claude/skills/sillyspec-brainstorm/SKILL.md` 同名节语义同版：当需要用户从多个选项中做出选择时，必须使用内置 AskUserQuestion 工具将选项以参数传入；禁止用编号列表让用户手动输入数字。
- 节位必须置于 frontmatter 之后、正文首节「## 何时使用」之前，与 brainstorm/commit/auto/explore 等既有 skill 的节序形态一致。

#### 场景：多选项决策走问询工具

- Given 轻量变更流程中出现需用户从多个选项做选择的时机（如 flow start 选道同意门两选一、批准通道选择）
- When agent 按 sillyspec-flow SKILL.md 指引行事
- Then 选项必须经 AskUserQuestion 工具以参数传入让用户作答，SKILL.md 不得引导编号列表手动输入数字

### FR-02: 纯 markdown 指令文档变更，无代码行为——测试不适用：无逻辑可断言，验收靠文档审阅

- 本变更改动面必须限于 `.claude/skills/sillyspec-flow/SKILL.md` 单文件追加一节，禁止触及任何代码/测试文件；验证方式必须为文档审阅（与 brainstorm 同名节逐句对照），自动化测试面不适用。

#### 场景：单文件追加零代码面

- Given 仓库现状 sillyspec-flow/SKILL.md 无「交互规范」节
- When 追加该节并逐句对照 brainstorm 同名节
- Then 措辞语义一致，git diff 面仅此单文件追加

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯 markdown 指令文档追加一节，无逻辑可断言（仓库无断言「交互规范」内容的既有测试面；验收靠与 brainstorm 同名节逐句对照审阅）
FR-02: 不适用：本条即测试不适用的声明本身——改动面禁止触及代码，验收靠 git diff 面审阅（单文件追加）
