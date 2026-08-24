---
id: task-01
title: add-decision-anchor-touch-injection
title_zh: 决策锚点触碰提示（computeDecisionTouches+双渲染点）
author: qinyi
created_at: 2026-08-24 02:45:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [G1]
decision_ids: [D-001@v1, D-003@v1]
allowed_paths:
  - src/docs-debt.js
  - src/docs-check.js
  - src/run/prompt.js
  - src/stages/execute.js
  - test/decision-touch.test.mjs
goal: execute 期注入决策锚点触碰提示——改到决策锚定文件时立即呈现「触碰 N 条决策锚点」事实（advisory 无触碰零输出），复用 docs-debt 事实管道在双渲染点呈现
implementation:
  - docs-debt.js 新增导出 computeDecisionTouches(changedFiles, knowledgeRoot)——唯一真相形态返回 touches 数组（id/title/anchorFile/touchedFile/file）与 empty 布尔；仅 implemented 条目参与（对齐 docs-check.js:793 先例），「锚点：未记录」跳过，decisions 库缺失则 empty=true
  - 锚点 :行号/:符号 后缀剥离复用 docs-check.js:710 私有函数 anchorFilePath——私有改导出且不改行为，勿复刻正则防口径漂移
  - run/prompt.js 既有 DOCS_DEBT 渲染处（:502-550 区）追加触碰事实行——次渲染点，重入/reset 场景 changedFiles 非空时呈现；既有占位符与注入逐字不变（只追加渲染分支）
  - execute.js buildWavePrompt（:758 起，Wave 步 prompt 构建）复用同一 facts 计算追加渲染——主渲染点（D-003，单过流程该时刻 changedFiles 恒空，不扩 Wave 步则特性失效）；changedFiles 口径与 DOCS_DEBT 同源（porcelain 未提交 ∪ baseline..HEAD），无新占位符
  - 事实行格式 [decision-touch] 本次变更触碰 N 条决策锚点——含决策 id/标题/锚点文件/触碰文件与「需复核」提示；≤5 条截断加省略号（R-05），无触碰零输出
  - 新增 test/decision-touch.test.mjs——精确/子路径前缀匹配、后缀剥离、仅 implemented 过滤、未记录跳过、空库 empty、零触碰空数组与双渲染点注入全覆盖
acceptance:
  - AC-1 computeDecisionTouches 回归全绿——触碰（精确/子路径/:行号剥离）、仅 implemented 过滤、未记录跳过、空库 empty、零触碰空数组
  - AC-2 双渲染点实测——Wave 步有触碰输出事实行（≤5 条截断+省略号）、无触碰零输出；第 4 步渲染点重入场景同源事实
  - AC-5 computeDocsDebt 与既有调用方逐字不变（只增导出），docs-debt 既有测试零回归
verify:
  - node --check src/docs-debt.js && node --check src/docs-check.js && node --check src/run/prompt.js && node --check src/stages/execute.js
  - node --test test/decision-touch.test.mjs
  - node --test test/docs-debt.test.mjs test/prompt-placeholders.test.mjs test/execute-prompt-spec-root-placeholder.test.mjs（既有 docs-debt 与 prompt 相关测试零回归）
constraints:
  - computeDocsDebt 与既有调用方逐字不变（只增导出）；anchorFilePath 仅加 export 不改行为
  - advisory 零阻断——无触碰零输出，不新增 prompt 占位符
  - 路径 POSIX 化在 computeDecisionTouches 入口完成（调用方不重复处理）
  - 前缀匹配粒度为文件或其子路径（R-03）；事实行 ≤5 条截断（R-05）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
