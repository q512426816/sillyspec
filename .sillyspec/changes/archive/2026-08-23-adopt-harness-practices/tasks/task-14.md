---
id: task-14
title: 'docs/prompt 镜像同步（brainstorm/verify/archive/quick 四处 + README.md 占位符表；_extract.mjs sanity 断言）'
title_zh: 'docs/prompt 镜像同步（brainstorm/verify/archive/quick 四处 + README.md 占位符表；_extract.mjs sanity 断言）'
author: 'qinyi'
created_at: 2026-08-23 13:46:07
priority: P1
depends_on: ['task-01', 'task-03', 'task-08', 'task-13']
blocks: []
requirement_ids: [FR-01, FR-03, FR-08, FR-12]
decision_ids: [D-008@v1]
allowed_paths:
  - docs/prompt/_extracted.json
  - docs/prompt/brainstorm.md
  - docs/prompt/verify.md
  - docs/prompt/archive.md
  - docs/prompt/quick.md
  - docs/prompt/README.md
goal: >
  把 task-01/03/08/13 对 brainstorm/verify/archive/quick 四个 stage 源文件的 prompt 改动机械同步到 docs/prompt/ 镜像（_extracted.json + 四处 stage.md）并更新 README 占位符表，
  兑现 R-06 漂移应对——镜像与源逐字一致是 prompt 参考目录的保真前提（AC-3）。
implementation:
  - 记录四阶段改动的新旧锚点字符串——brainstorm Step6 四字段模板与 Step2 decisions 库路由段、archive decision-distill 步骤与末步 git add 清单、quick 新警告文案与 step3 四子字段提示、verify 检查选择指引与护栏新条目
  - 跑 node docs/prompt/_extract.mjs 刷新 _extracted.json，用 node 一行断言做 sanity——每个新锚点字符串在 JSON 中出现、对应旧字符串已消失（防提取静默失败）
  - 跑 node docs/prompt/_sync.mjs brainstorm verify archive quick 同步四处 stage.md 的 fence——只替换既有 fence，缺 fence 或找不到标题行的步骤列出后人工补
  - 更新 docs/prompt/README.md——阶段总览表 archive 步骤数、动态块占位符表补 evidence-auto 推荐占位符行、CLI 注入框架节补 decisionHits 注入说明
acceptance:
  - node docs/prompt/_verify.mjs 中 brainstorm/verify/archive/quick 四静态阶段逐字一致全绿（无 miss）
  - sillyspec docs check 全绿（AC-3；镜像内 file:line 引用有效）
  - README 占位符总表与 src/run/prompt.js 实际注入项一一对应，无缺行无陈旧行
verify:
  - node docs/prompt/_verify.mjs（静态阶段应为全绿）
  - sillyspec docs check
constraints:
  - 只改镜像六文件，不改 src——stage 源码问题回对应 task 修，禁止改镜像措辞迁就
  - stage.md prompt 正文与 _extracted.json 逐字一致，禁人工改写
  - 同步走 _extract/_sync/_verify 全流水线并带新旧字符串 sanity 断言——跑了脚本不等于同步完成；全程 LF 行尾（整文件 CRLF 曾致 _verify 提取 0 块）
---
