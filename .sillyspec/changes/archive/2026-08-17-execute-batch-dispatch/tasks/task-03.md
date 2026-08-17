---
id: task-03
title: docs sync for execute batch dispatch (five artifacts)
title_zh: "#3 文档同步五件——extract 再生 / execute.md 镜像 / index.html / SKILL.md / stages.md"
author: qinyi
created_at: 2026-08-17 16:48:08
priority: P1
depends_on: [task-01]
requirement_ids: [NFR-01]
allowed_paths:
  - docs/prompt/_extracted.json
  - docs/prompt/execute.md
  - docs/prompt/index.html
  - .claude/skills/sillyspec-execute/SKILL.md
  - .sillyspec/docs/sillyspec/modules/stages.md
goal: 按 CLAUDE.md 同步规则完成 execute batch 调度文档同步（NFR-01）——prompt 镜像三处与 SKILL.md、模块文档 stages.md 同 prompt 源码新语义一致。
implementation: |
  五步顺序执行（前提：task-01 已落地）：
  1. node docs/prompt/_extract.mjs —— 再生 docs/prompt/_extracted.json（execute 步骤 prompt 从源码重提取）
  2. docs/prompt/execute.md —— Step 5 镜像中「执行方式 / 任务摘要（按需读取完整蓝图）/ 调度要求」等
     变动段落 prompt 正文以 _extracted.json 为准逐字替换；禁手改措辞、禁凭记忆转写；
     Task Review Gate 段与调度要求 4 应无 diff（task-01 未触及，出现 diff 即查漂移）
  3. node docs/prompt/_build-site.mjs —— 再生 docs/prompt/index.html 第三镜像
  4. .claude/skills/sillyspec-execute/SKILL.md 调度描述段落核对：workdir 切换节「每个 task 独立子代理」
     类表述与 batch 新语义一致（默认独立子代理 + 可选 batch ≤3）；保持对外纯净——
     禁内部编号（D-xxx/FR-xxx）、禁源码路径/行号、禁「路径A」等内部术语
  5. .sillyspec/docs/sillyspec/modules/stages.md —— 变更索引追加条目（execute 模块卡片 +
     变更名 2026-08-17-execute-batch-dispatch + 一句话变更说明）
acceptance:
  - execute.md 变动段落与 _extracted.json 逐字一致；Task Review Gate 段零改动
  - index.html 与镜像同步再生（三处一致）
  - SKILL.md 调度描述与 prompt 新语义一致且无内部路径/编号/术语泄漏
  - stages.md 变更索引含本变更条目
verify: node docs/prompt/_extract.mjs 重跑后 git diff 为空（幂等=镜像与源码一致）+ npm test（doc-ref-check 等 docs 关联校验零回归）
constraints: prompt 正文唯一数据源是 src/stages/execute.js + extract 产出，禁手改镜像措辞；SKILL.md 进 npm 且 init 复制到用户项目，对外纯净性是硬约束；只动 allowed_paths 5 文件，不触 src/test。
---
