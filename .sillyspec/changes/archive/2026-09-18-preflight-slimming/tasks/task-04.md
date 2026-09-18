---
id: task-04
title: '引导文案——stages/execute.js 任务步与 templates/prompts/taskcard-rules.md 加「中间验证定向优先」固定行 + stages/brainstorm.js/plan.js 产出步 preflight 声明 + docs/prompt 三件镜像同步'
title_zh: '引导文案——stages/execute.js 任务步与 templates/prompts/taskcard-rules.md 加「中间验证定向优先」固定行 + stages/brainstorm.js/plan.js 产出步 preflight 声明 + docs/prompt 三件镜像同步'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 21:12:40
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/execute.js
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - templates/prompts/taskcard-rules.md
  - docs/prompt/brainstorm.md
  - docs/prompt/plan.md
  - docs/prompt/_extracted.json
target_files:
  - src/stages/execute.js
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - templates/prompts/taskcard-rules.md
  - docs/prompt/brainstorm.md
  - docs/prompt/plan.md
  - docs/prompt/_extracted.json
goal: >
  测选路引导与 preflight 声明落位——execute 任务步与 taskcard-rules 加「中间验证定向优先」固定行；
  三 stages 产出步 preflightValidators 声明单点归属本 task；docs/prompt 三件镜像三步流水线同步。
implementation:
  - src/stages/execute.js 任务步 prompt（动态构建锚 :292）加固定行「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」
  - templates/prompts/taskcard-rules.md verify 段加同款定向优先引导行
  - 三 stages 产出型步骤加 preflightValidators 声明——单点归属本 task（计划评审 gap①：task-02 只做渲染机制不碰 stages 定义）：brainstorm 产出步对应 design-file-list+四件套规则；plan 生成计划步对应 postcheck 轻子集；execute 任务步对应本 task allowed_paths 越界速查
  - docs/prompt 三件镜像三步流水线同步：brainstorm.md/plan.md 文案更新+ _extracted.json 再生成（同批次落盘防镜像测试红 R-05）
acceptance:
  - execute 任务步 prompt 与 taskcard-rules.md verify 段均含定向优先引导行（逐字一致）
  - 三 stages 产出步带 preflightValidators 声明且能被 task-02 渲染机制消费（{PREFLIGHT_FAILURES} 通路有内容）
  - docs/prompt/_extracted.json 与 brainstorm.md/plan.md 镜像一致（流水线再生成无漂移）
verify:
  - node --test test/execute-prompt-mainrepo-docs.test.mjs test/brainstorm-plan-contract.test.mjs test/stage-review.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 七文件；LF 行尾；兼容 Windows/Linux/macOS
  - 不改 test_strategy 默认值与语义（D-004：module-zero-hit→skip 不动）
  - L1 机械门存在性与拦截逻辑零触碰（D-005 守恒红线）
  - 不新增测试文件（引导行在场断言归 task-05）；镜像三件同批次落盘
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
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
