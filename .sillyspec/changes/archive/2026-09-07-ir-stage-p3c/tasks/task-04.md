---
id: task-04
title: '测试套件 test/design-facts.test.mjs（双源一致/核验分级/骨架契约/幂等/注入）'
title_zh: '测试套件 test/design-facts.test.mjs（双源一致/核验分级/骨架契约/幂等/注入）'
author: 'qinyi'
created_at: 2026-09-07 05:10:51
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - test/design-facts.test.mjs
  - test/run-complete-step-brainstorm.test.mjs
target_files:
  - NEW:test/design-facts.test.mjs
goal: >
  测试套件——双源一致/核验分级/骨架契约/接线红路径/注入。
implementation:
  - 新建 test/design-facts.test.mjs：parseDecisionDomains 双源一致（同 fixture 与 distill 解析对比）+ 最高版过滤/superseded 剔除；validateDecisionModuleRefs 分级全分支（幻觉 ERROR/NEW: 豁免/NEW:带空格 ERROR/域差异双向 WARNING/全缺失汇总/无 map skipped）；generateDesignSkeleton 章节标题契约（对 stage-contract-spec 目标定义逐标题断言）+ 决策追踪表预填 + 设计目标章节含非目标；接线级红路径（临时 change fixture：幻觉 id + 有效 module-map → completeStep 路径或直调钩子函数断言 exit 1 语义）
  - 回归 test/run-complete-step-brainstorm.test.mjs（接线点存量测试）
acceptance:
  - 新断言全绿 + 既有零回归 + npm test（module 子集）全绿
verify:
  - node --test test/design-facts.test.mjs && npm test
constraints:
  - node:test 风格；不弱化断言

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
