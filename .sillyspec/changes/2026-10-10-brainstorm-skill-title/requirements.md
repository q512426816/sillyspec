---
author: flow-machine-draft
created_at: 2026-10-10T00:43:10.552Z
---
# 需求规格（Requirements）— 2026-10-10-brainstorm-skill-title

## 功能需求

### FR-01: .claude/skills/sillyspec-brainstorm/SKILL.md 含变更标题指引：一句中文概括、≤50 字、建议 ~20 字，并说明标题提取自 proposal/design 首行 H1

- `.claude/skills/sillyspec-brainstorm/SKILL.md` 必须含一条变更标题指引：面板显示用标题为总结一句中文概括、≤50 字、建议 ~20 字，并必须说明该标题由 CLI 从 proposal.md / design.md 首行 H1 提取。

#### 场景：主路径

Given brainstorm skill 存在于 `.claude/skills/sillyspec-brainstorm/SKILL.md` / When agent 读 skill 执行头脑风暴 / Then 铁律段含上述标题口径指引，agent 写四件套 H1 简述时按 ≤50 字中文概括组织。

### FR-02: 纯文档改动，不触 src/test

- 本变更必须仅触及 `.claude/skills/sillyspec-brainstorm/SKILL.md` 与变更目录工件，禁止改动 `src/` 与 `test/` 下任何文件。

#### 场景：主路径

Given 本变更提交面 / When `git show --name-only` 核对 / Then 仅含 skill 文档与变更目录路径，无 src/test 路径。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯 skill 文档指引增补，无代码路径可测；核验面为文档内容本身（grep 命中「变更标题（面板显示用）」与「≤50 字」口径即达标）
FR-02: 不适用：纯文档改动声明，无测试逻辑；核验面为提交面路径清单（无 src/test 条目）
