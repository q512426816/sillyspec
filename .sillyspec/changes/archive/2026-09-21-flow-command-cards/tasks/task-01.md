---
id: task-01
title: '卡资产七张+注入器 injectCommandCards'
title_zh: '卡资产七张+注入器 injectCommandCards'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 01:10:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001, D-002]
allowed_paths:
  - src/command-cards.js
  - test/command-cards.test.mjs
  - assets/command-cards/
  - .npmignore
target_files:
  - NEW:src/command-cards.js
  - NEW:test/command-cards.test.mjs
  - NEW:assets/command-cards/run-brainstorm.md
  - NEW:assets/command-cards/run-plan.md
  - NEW:assets/command-cards/run-execute.md
  - NEW:assets/command-cards/run-verify.md
  - NEW:assets/command-cards/run-archive.md
  - NEW:assets/command-cards/run-quick.md
  - NEW:assets/command-cards/status.md
goal: >
  交付流程命令卡的全部离线能力：七张卡资产（四段契约）+ injectCommandCards 注入器
  （尾部锚行三态幂等，Grill 修订版基准=落盘正文 sha）+ 单测 + .npmignore 发布防线锚。
implementation:
  - 写七张卡资产 assets/command-cards/*.md：frontmatter 仅 name/description；正文四段=何时用（一行判据）/生命周期速查（逐字命令块）/防坑清单（每卡 2-5 条实测坑）/边界声明（步骤内容跑 sillyspec run <stage> 取实时渲染）
  - run-quick 卡防坑清单对照 954946ae 修复后语义逐条锚定源码：--done 显式 --linked-changes 有效（src/run/complete-handlers.js:1273 起 mergeGuardLinkedChanges）、四参数 --req/--cause/--solution/--result、--input 启动必带、SILLYSPEC_SESSION_ID 每命令导出、worktree 双 flag --allow-worktree-cwd+--spec-dir、显式 pathspec 提交禁 git add -A、倒推 B 模式 --files 边界
  - 写 src/command-cards.js：导出 COMMAND_CARD_TARGETS {zcode, claude} / COMMAND_CARD_NAMES 七名 / injectCommandCards(projectDir, {tools, force, version})；readCardAssets 用 new URL('../assets/command-cards/', import.meta.url) readdir（npm 全局/checkout 双形态）；三态四分支=无→写 / 锚在且剥离锚行重算正文 sha 一致且与包资产一致→no-op（mtime 不动）/ 一致但包资产不同→覆盖 / 锚缺或 sha 不符→warn 跳过（force 覆盖）；writeAtomicSync LF 落盘；返回 {written, updated, skipped, warnings}
  - 写 test/command-cards.test.mjs：mkdtemp 临时项目目录，断言——注入产生 7 卡双落点（FR-01/03）、同参重跑 no-op 且 mtime 不变（FR-02）、手改正文后重跑 warn 跳过、force 覆盖、外来同名无锚行跳过、资产目录 readdir 非空且七名齐全（发布白屏本地防线）、卡内容四段契约各含关键锚词（FR-04）
  - .npmignore 尾部加注释锚「不要忽略 assets/（init 从该目录复制命令卡）」同 .claude/skills 先例（不新增 package.json files，Grill P1-2）
acceptance:
  - node test/command-cards.test.mjs 全绿（三态四分支逐态断言）
  - run-quick 卡防坑清单每条有源码依据（954946ae 后语义），review 时逐条锚定
  - .npmignore 含 assets/ 注释锚且未新增 files 字段
verify:
  - node test/command-cards.test.mjs
  - npm test（全量回归）
constraints:
  - 不动 src/init.js（task-02 范围）
  - 卡文不镜像步骤提示内容（D-001：CLI 实时渲染层，卡只承载 bootstrap 层）
  - 管理面只在尾部锚行单点（frontmatter 不承载，Grill P1-3 判据源唯一）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
