---
id: task-04
title: '文档镜像同步——docs/prompt 三 md + 技能 SKILL 三份 + troubleshooting gate_snapshot 段'
title_zh: '文档镜像同步——docs/prompt 三 md + 技能 SKILL 三份 + troubleshooting gate_snapshot 段'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 08:59:25
priority: P1
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-02, FR-04]
decision_ids: [D-002@v2, D-005@v2, D-003@v1, D-004@v1]
allowed_paths:
  - src/stages/verify.js
  - docs/prompt/execute.md
  - docs/prompt/verify.md
  - docs/prompt/plan.md
  - .claude/skills/sillyspec-execute/SKILL.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .claude/skills/sillyspec-plan/SKILL.md
  - docs/sillyspec/troubleshooting.md
target_files:
  - src/stages/verify.js
  - docs/prompt/execute.md
  - docs/prompt/verify.md
  - .claude/skills/sillyspec-execute/SKILL.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .claude/skills/sillyspec-plan/SKILL.md
  - docs/sillyspec/troubleshooting.md
goal: >
  把 task-01~03 落地后的最终行为同步到 agent 面文档镜像（prompt 镜像/技能 SKILL/坑文档），
  防 agent 按旧口径行事（旧「必须并行」指令/旧「file:line 必须」预填口径/缺 commands 配置指引）。
implementation:
  - 'src/stages/verify.js:163（D-004@v1 边界扩容）：「covered/partial 附测试锚点（`.test.` 文件或 file:line）」改三形态+行号可省——「covered/partial 附测试锚点（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名，行号可省）」'
  - 'docs/prompt/verify.md:214 镜像 fence 手改与 verify.js 逐字同步（不跑 _extract.mjs——_extracted.json 正被并行会话占用，流水线刷新留后续）'
  - 'docs/prompt/execute.md 与 .claude/skills/sillyspec-execute/SKILL.md：同步隐式 Wave 串行语义（无显式 Wave 划分 → 单隐式 Wave 串行执行指令；显式 Wave 并行语义不变）——execute.md 示例 fence 本身零漂移（默认 3 Wave 走显式路径），仅在 fence 外元信息处补一句说明'
  - 'docs/prompt/verify.md 与 .claude/skills/sillyspec-verify/SKILL.md：探针7 证据锚点三形态口径（file:line / `.test.` 文件名 / 反引号路径，行号可省）+ gate_snapshot.commands 配置指引（快照内生成物供给链）'
  - 'docs/prompt/plan.md 与 .claude/skills/sillyspec-plan/SKILL.md：无任务区 plan 的执行语义表述核对（「自动串行」现为真实行为）；显式 Wave 共享文件硬拦提示保留'
  - 'docs/sillyspec/troubleshooting.md：坑③（gitignore 生成物）供给链口径补命令面——gate_snapshot.copy 之外新增 gate_snapshot.commands（含活链接警示与「只放生成物命令」建议），配置示例扩 commands'
acceptance:
  - '七份镜像与代码行为零漂移（三形态措辞一致、串行语义一致、commands 配置示例与 config-schema 一致）'
  - '不引入与代码不符的表述（逐处对照 src 实文核验）'
verify:
  - 'npm test（docs 镜像有 _verify.mjs 一致性校验时全量回归覆盖）'
constraints:
  - '只改文档镜像，不改 src/test'
  - '镜像段落改动最小化（对齐措辞，不重排章节）'
---
