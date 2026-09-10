---
id: task-01
title: 'single-source review checklists'
title_zh: '审查清单单源化'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-001@1]
allowed_paths:
  - NEW:src/stage-review-checklist.js
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - src/stages/execute.js
  - NEW:test/stage-review-checklist.test.mjs
target_files:
  - NEW:src/stage-review-checklist.js
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - src/stages/execute.js
  - NEW:test/stage-review-checklist.test.mjs
goal: >
  三 stage 审查清单从 src/stages/*.js 的 prompt 文本抽为新文件 src/stage-review-checklist.js
  导出常量 REVIEW_CHECKLISTS = { brainstorm: string[], plan: string[], execute: string[] }；
  stages 三件（brainstorm/plan/execute）改为 import 渲染，prompt 输出与迁移前逐字节等价；
  新增一致性测试钉死——本 task 是 review-dispatch worker_prompt 与 prompt 渲染同源的前置件
  （事前给的 == 事后查的，FR-05 / design 模块设计 src/stage-review-checklist.js 段）。
implementation:
  - 先定位三处清单原文（grep 锚点）：src/stages/brainstorm.js「审查执行方式」段下方交叉审查清单（三层检查 + 交叉点抽取）、src/stages/plan.js「审查清单（读取 plan.md 的 plan_level，逐条核对）」下方 - [ ] 条目、src/stages/execute.js QA 段「以下三项始终必查」三条
  - 逐字迁移为字符串数组写入 src/stage-review-checklist.js 并导出 REVIEW_CHECKLISTS——不改任何条目文字/标点/全半角/markdown 记号（下游 plan-postcheck 等可能字面引用）
  - stages 三件原文本位置改为模板拼接渲染，如 ${REVIEW_CHECKLISTS.plan.map((item) => '- [ ] ' + item).join('\n')} 等价形态——缩进、换行、条目前后缀与迁移前逐字符一致，保证 prompt 逐字节等价
  - 新增 test/stage-review-checklist.test.mjs：断言三键均非空 string[]；每个 stage 的 prompt 渲染产物包含该 stage 全部条目字面；内嵌迁移前清单快照与常量逐条比对（钉死「迁移=逐字」，防未来漂移）
  - 迁移前 grep test/ 确认无清单条目字面断言（2026-09-10 实查无命中，仍保留该步作为流程闸）
acceptance:
  - node --test test/stage-review-checklist.test.mjs 全绿
  - npm test（node test/run-tests.mjs）全绿，既有 stages 相关测试无回归
  - 三个 stage 的 prompt 渲染输出与迁移前逐字等价（一致性测试内嵌迁移前快照逐条比对通过）
  - REVIEW_CHECKLISTS 三键（brainstorm/plan/execute）齐全且均为非空 string[]，形态满足 task-03 消费契约
verify:
  - node --test test/stage-review-checklist.test.mjs
  - npm test（含既有 stages 相关套，确认 prompt 渲染无漂移回归）
constraints:
  - 逐字迁移禁改写条目文字/语义/标点（含全半角、空格、- [ ] 与加粗等 markdown 记号）；下游可能字面断言，迁移前先 grep test/ 确认
  - 只做「抽常量 + 改引 + 一致性测试」，不改清单内容本身、不动 stage-review/gate 逻辑与 prompt 其余段落（在途区分等属 task-05/06）
  - 三 stage prompt 中清单段以外的文本零改动——渲染产物逐字节等价是硬约束
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
