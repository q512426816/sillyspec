---
id: task-07
title: '测试补全——NEW test/pass-eligibility.test.mjs + 8 个既有测试文件就近断言'
title_zh: '测试补全——NEW test/pass-eligibility.test.mjs + 8 个既有测试文件就近断言'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08', 'FR-09', 'FR-10', 'FR-11']
decision_ids: ['D-001@v2', 'D-002@v1', 'D-003@v1', 'D-004@v1', 'D-005@v2', 'D-006@v1', 'D-007@v1', 'D-008@v1', 'D-011@v1', 'D-012@v1']
allowed_paths:
  - NEW:test/pass-eligibility.test.mjs
  - test/cross-repo-verify.test.mjs
  - test/verify-handover-structured.test.mjs
  - test/verify-conclusion-slot.test.mjs
  - test/acceptance-matrix-probe.test.mjs
  - test/probe7-anchor-testfile.test.mjs
  - test/task-review-adopt.test.mjs
  - test/stage-review-checklist.test.mjs
  - test/design-facts.test.mjs
  - test/stage-contract.test.mjs
target_files:
  - NEW:test/pass-eligibility.test.mjs
  - test/cross-repo-verify.test.mjs
  - test/verify-handover-structured.test.mjs
  - test/verify-conclusion-slot.test.mjs
  - test/acceptance-matrix-probe.test.mjs
  - test/probe7-anchor-testfile.test.mjs
  - test/task-review-adopt.test.mjs
  - test/stage-review-checklist.test.mjs
  - test/design-facts.test.mjs
  - test/stage-contract.test.mjs
goal: >
  为批次 A 全部语义与门补齐确定性测试面：新增 test/pass-eligibility.test.mjs 承载四事实封顶、豁免洞分层、severity、fix.sql 双门、integrationRan 判定表等核心断言，另在 8 个既有测试文件就近补断言，把 FR-01~11 的行为契约钉进测试，防「假 PASS」因果链回归。
implementation:
  - 'NEW:test/pass-eligibility.test.mjs——封顶四态（FR-01 GWT1）：结论=PASS 且四事实条件各构造一态独立触发——①facts.integrationRan=not-ran ②handover blocking 级行>0 ③worktree/design 清单含 db/*.sql 而 facts.dbScriptDeclarations 未声明该文件 ④matrixPartialRows>0 且 handover 零行（任意级）——断言 ok=false、errors 逐条列触发行（triggered[].fact 四枚举各命中一次）、文案含修复指引（改写 PASS WITH NOTES 并补「## 移交项（结构化）」）'
  - '同文件——全清态（FR-01 GWT2）：四条件全部不成立 + conclusion=PASS → ok=true 放行；结论非 PASS（NOTES/FAIL）时四条件在场也不封顶（未触发场景行为零变化）'
  - '同文件——facts 双源口径（FR-01 GWT3/GWT4）：factsExpected=true 而 facts 缺失 → 全条件按触发处理（fail-closed），报错文案含「重跑 verify-probes」出路；factsExpected=false（存量未跑管线）→ 沿用兼容口径返回 ok 不误伤'
  - '同文件——豁免洞分层三态（FR-02 GWT1/GWT2）：explicit risk_level + unit-sufficient + NOTES → 不要求集成证据；explicit + integration/deployment-critical + NOTES 且结构化 handover 缺失、集成证据不齐 → error（二选一通道缺位）；同判级 + NOTES + 携带结构化 handover → 放行'
  - '同文件——integrationRan 判定表（FR-02 GWT3 / D-006）：quality-scan 实测记录 test_strategy=skip → not-ran；module / evidence-auto 来源 → ran；回执 sourceTag=build/unit（mvn compile、JUnitCore 纯单测形态）→ 不计入已跑；未标类默认 build → not-ran（fail-closed 侧）'
  - '同文件——severity 面（FR-06 GWT1~GWT3）：四列表 db-script/env-blocked → 默认 blocking、manual-acceptance/other → 默认 advisory；降级 blocking→advisory 缺理由文法「（降级：<理由>，依据 <file:line 或 D-xxx>）」→ 回退按 blocking 处理；存量三列表格行（无 severity 列）→ 零迁移按类型缺省映射；db-script handover 行与 db 声明门互斥不可同真（写 db-script = 承认未执行 ⇒ 封顶 + 兜底门拦截）'
  - '同文件——Runtime Evidence 收口（FR-03 GWT1）：判级 integration/deployment-critical 且 facts.runtimeEndpointExcluded=true（服务端点行命中「不涉及」文法）+ 无对应 handover → 计入事实面触发封顶；有对应 handover → 不计入；骨架注释含 Controller 直调冒烟降级路径提示（GWT2）'
  - '同文件——fix.sql 双门（FR-05 GWT2 / D-012）：apply 文件集 ∩ db/*.sql ⊄ parseDbScriptDeclarations(verifyMd) 声明集 → apply 尾声阻断；verify 之后新增 db/*.sql（verify-result 无对应声明）→ archive --confirm 前置校验兜底阻断；声明齐备（引用文件名，有 log 路径走四条件校验）→ 双门放行'
  - 'test/cross-repo-verify.test.mjs 就近补断言（FR-07 GWT1/GWT2）：主仓 test_strategy=skip + 跨仓无自配 commands.test → mergeCrossRepoResults 前短路通过（不再 npm test fallback 假败）；跨仓自配 commands.test → 仍执行；跨仓 own local.yaml test_strategy=skip 逐仓生效'
  - 'test/verify-handover-structured.test.mjs 就近补断言（FR-06）：parseHandoverRows 四列表头（类型/条目/复跑或验收条件/severity）解析 severity 列值；存量三列表格样例零迁移回归（缺省按类型映射）；backfill 后 facts.handover.items[] 带 severity 字段落盘；db-script 行与声明门互锁断言'
  - 'test/verify-conclusion-slot.test.mjs 就近补断言（FR-01 Then 文案）：封顶触发的 error 文案含触发行枚举与「改写 PASS WITH NOTES + 补『## 移交项（结构化）』」修复指引（结论槽值 PASS 被封顶改写、NOTES 放行的联动口径）'
  - 'test/acceptance-matrix-probe.test.mjs 就近补断言（FR-04 GWT1/GWT2）：矩阵存在 partial/uncovered 行且 facts.handover 零有效行（任意 severity）→ validateAcceptanceMatrix error「部分实现必须有移交去向」；存在任意级 handover 行 → 该分支放行，封顶与否交由 blocking 行（条件②④分工）'
  - 'test/probe7-anchor-testfile.test.mjs 就近补断言（FR-09）：buildAcceptanceHints 多根（主仓根 + local.yaml repos 注册跨仓仓根）下测试文件内容可读、命中不再恒空——矩阵不因跨仓恒预填 partial'
  - 'test/task-review-adopt.test.mjs 就近补断言（FR-08）：writtenBy=adoptTaskReviewMechanics 写入进 isExplicitReviewWrite 白名单；prefetchDiffFileSet 并跨仓 diff 源后，跨仓 task review verdict=pass → tasks.md 自动勾选生效'
  - 'test/stage-review-checklist.test.mjs 就近补断言（FR-11）：涉及角色/字典命中时清单含「以生产查询口径可解析到目标结果」条目；涉及新页面/前端路由时含「用户入口 × 菜单/注册 DML 对账」条目——快照随 task-06 的 stages prompt 源（brainstorm/verify）同步更新'
  - 'test/design-facts.test.mjs 就近补断言（FR-10）：design 清单无「## <repo> 仓变更」段头且行含跨仓注册路径 → 降 warning 提示补段头，不再按主仓根逼 NEW: 前缀'
acceptance:
  - 'npm test 全量通过（含 NEW:test/pass-eligibility.test.mjs 与 8 个既有测试文件增量断言，断言净增 +60~80）'
  - '四事实条件各一态触发 error（含触发行枚举 + 修复指引文案）与全清 PASS 态放行断言在册（FR-01 四态）'
  - '存量兼容断言在册：factsExpected=false 返回 ok、三列 handover 零迁移按类型映射、未触发事实条件的存量场景行为零变化'
  - 'explicit + integration-critical + NOTES 无 handover → error 断言在册（豁免洞分层；unit-sufficient 免证据 / 有 handover 放行两态同册）'
  - 'apply 集 ∩ db/*.sql ⊄ 声明集 → apply 尾声与 archive --confirm 双阻断断言在册；verify 后新增 sql 的兜底时序态覆盖'
  - 'severity 类型缺省映射、降级理由文法缺失回退 blocking、db-script 互斥断言在册'
  - 'npm run lint（check-syntax）通过'
  - 'escape 路径可达断言：被拦出路的报错文案含「重跑质量扫描 / 降级 NOTES / 重跑 verify-probes」指引（R-01/R-07）'
verify:
  - npm test
  - npm run lint
constraints:
  - '只写测试不改实现：发现实现缺陷回写 task-01~06 对应卡，禁止改断言迁就实现（AGENTS.md 核心规则 11）'
  - '断言逐条从 requirements.md GWT 派生（每条 GWT 至少落一断言），走导出接口 + facts 输入的纯函数面，不做实现内部白盒耦合'
  - '确定性纪律：mkdtempSync 临时目录 + test.after 清理；不依赖真实 git/DB/网络；console.warn 捕获替换后 finally 还原（沿用本仓既有风格）'
  - '跨平台：路径一律 path.join，不硬编码分隔符；正则容忍 CRLF/LF（全局硬约束 6）'
  - '断言增量控制在 +60~80（plan 口径），不夹带与本变更无关的测试重构/重命名；测试文件风格沿用 node:test + assert/strict'
  - '改动面限于 allowed_paths 9 个测试文件，不动 src/ 与 docs/；本任务为测试任务不填 related_tests'
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
