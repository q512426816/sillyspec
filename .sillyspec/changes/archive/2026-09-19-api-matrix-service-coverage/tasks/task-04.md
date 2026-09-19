---
id: task-04
title: 'covered-service verdict: five test groups + assertion sync + full suite'
title_zh: 'covered-service 五组测试用例与断言同步 + npm test 全量收口'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 06:32:08
priority: P0
depends_on: [task-01, task-02, task-03]
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - test/api-coverage-matrix.test.mjs
  - test/acceptance-matrix-probe.test.mjs
target_files:
  - test/api-coverage-matrix.test.mjs
  - test/acceptance-matrix-probe.test.mjs
goal: >
  为 covered-service 第五判定枚举收测试闭环（Wave2，依赖 Wave1 判定层 task-01 与文案面 task-02、
  预检器 task-03 落地后执行）：test/api-coverage-matrix.test.mjs 新增五组用例，锁定 FR-01 三行为
  （计分子放行 / 缺测试锚点 error / advisory 承接计数）与 FR-02 的 probe7 验收矩阵联动不误报；
  同步六处依赖旧「四选一 / covered 分子 / <待填：四选一>」字面的既有断言到五枚举口径；
  最终 npm test 全量 + npm run lint 收口，存量纯四枚举文档行为逐字不变。
implementation:
  - '前置：读 design.md 总体方案 Wave1/Wave3 与本卡 constraints。复用 api-coverage-matrix.test.mjs 既有辅助器：judgeWith({ rows, face, facts, ... })（矩阵面一律经 extractApiCoverageMatrixSlots 真实解析构造）、matrixMd(rows, opts)（五列表「| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |」）、EP/FACE apiFace 夹具、NO_HANDOVER_FACTS()/HANDOVER_FACTS()；断言风格沿用 assert.ok + JSON.stringify 实际值诊断消息；临时文件沿用文件头 mk()/test.after 清理纪律'
  - '锚点口径备忘：covered-service 行证据须含 matrixEvidenceHasAnchor 三形态之一的测试锚点（`.test.` 测试文件名 / file:line / 反引号包裹路径或测试名）——与 covered 行的 design接口表#、权限矩阵[] 等 API 锚点形态不同口径，且不做 design接口表# 解析级核对（design Wave1.3，复用既有函数禁第二套文法）'
  - '用例①（FR-01 计分子放行）：TWO_FACE() 两端点文档全标 covered-service（两行证据分别用 `.test.` 形态与 file:line 形态测试锚点，如「test/order-service.test.mjs 承接 POST 行为」与 `test/order-service.test.mjs:42`）× facts 零移交（NO_HANDOVER_FACTS()）→ 断言 ok===true 且 errors 为空（covered-service 行计入分子，「covered+covered-service 分子 == 有效分母」等式满足放行）；同组加 covered+covered-service 各一行的混排变体，同样 ok=true'
  - '用例②（FR-01 缺测试锚点 error）：同构文档把 covered-service 行证据换成无锚点纯文字（如「由 service 层测试锁定」——不含 `.test.` / file:line / 反引号）→ 断言 ok===false 且 errors 含该行端点标签（如 POST /api/b）与锚点缺失违规文案（具体字面以 task-01 anchorViolations 分支落地为准，参照既有锚点违规断言的子串风格）；covered 行缺锚点行为不变作对照'
  - '用例③（FR-01 advisory 计数）：含 N≥1 行 covered-service（证据带锚点）的文档 → 断言 ok===true 且 warnings.some 同时含 [advisory] 与承接计数文案（design Wave1.4 口径「N 端点由 service 层测试承接（非端点级）……（不阻断）」，按 fixture 行数断言 N，如 N=1/N=2，具体字面以 task-01 落地为准备子串）；对照零 covered-service 行文档（BOTH_COVERED_ROWS()）不出该 advisory'
  - '用例④（FR-02 / D-002，probe7 联动回归）：构造探针 7 验收矩阵段 md——段头「#### 探针 7：验收×测试覆盖矩阵」，表头「| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |」（形态参照 src/verify-probes.js:1943 表头与 acceptance-matrix-probe.test.mjs :226-230 round-trip），其中一行判定 covered-service、证据含测试锚点 → 经 extractAcceptanceMatrixSlots（扩展 ../src/stage-contract.js 既有 import）断言 unfilled===0 且 missingEvidence===0——Wave1.1 白名单两消费点认新值 + Wave1.2 matrixEvidenceMissing 扩展后 covered-service 行走锚点要求分支、不落「无证据要求」分支不误报'
  - '用例④顺手断言（plan Grill R2-8，封顶结构性证据）：调 backfillFactsFromMdAndTests（../src/verify-probes.js 导出；内部 :2930 置 facts.matrixPartialRows = countMatrixPartialRows(md)，:2855 只数 partial/uncovered 行）——mkdtemp 临时目录 factsPath + verifyMd=上述含 covered-service 行矩阵，读回 verify-facts.json 断言 matrixPartialRows===0（PASS 封顶条件④消费该值——src/stage-contract.js:1387，0 即 covered-service 不触发封顶的结构性证据；tmp 目录无 design.md 走空面落盘 fail-soft 不炸）'
  - '用例⑤（向后兼容回归）：纯四枚举文档行为不变由既有用例 1-7 天然锁定（covered/partial/uncovered/non-testable 组合均已覆盖）——不新造重复用例，本组即 npm test 全量绿收口；若既有用例红，先判是六处断言同步遗漏（文案字面已变、断言未跟）还是判定面行为变化（后者回 task-01 修实现，禁改测试凑绿）'
  - '断言同步六处（行号为改动前文件态；新用例组建议追加文件末尾「// 8. covered-service 第五枚举」组段，同步点按字面搜索「四选一」/「covered 分子」定位防行号漂移）——api-coverage-matrix.test.mjs:118（用例 2 夹具行）与 :201（用例 3f 夹具）：<待填：四选一> → <待填：五选一>（task-02 改 renderApiCoverageMatrixLines 预填占位 src/verify-probes.js:2504/:2507 后夹具对齐真实骨架字面；unfilled 判定按白名单成员缺失——src/stage-contract.js:872/:1062，占位字面变化不影响断言值 unfilled:1）'
  - 'api-coverage-matrix.test.mjs:155（用例 3b 断言）：子串「covered 分子 1」→「covered+covered-service 分子 1」（task-01 改缺覆盖 error 分子口径文案 src/stage-contract.js:1229，design Wave1.4——分子口径文案改动即碎，plan Grill R2-1 发现）'
  - 'api-coverage-matrix.test.mjs:204（用例 3f 断言）：判定未填 error 断言子串「四选一」→「五选一」（task-01 改 unfilled error 文案 src/stage-contract.js:1175 为「五选一 covered/covered-service/partial/uncovered/non-testable」，design Wave1.5）'
  - 'api-coverage-matrix.test.mjs:332-333（用例 7b）：断言子串「| GET /api/a | <待填：四选一> |」→「| GET /api/a | <待填：五选一> |」，:333 断言消息内同字面一并同步（task-02 改 ensureApiCoverageMatrixSection 复用 render 的预填占位，两处字面同源）'
  - 'acceptance-matrix-probe.test.mjs:213（probe7 图例断言）：includes「covered / partial / uncovered / non-testable」→ task-02 落地于 src/verify-probes.js:1929 口径注记 / :1930 预填说明的五枚举字面（预期「covered / covered-service / partial / uncovered / non-testable」，以实际落盘字面为准），断言消息「四枚举图例在场」→「五枚举图例在场」；:203 判定槽占位零匹配断言不动（probe7 全预填，改前改后均为 0）'
  - '全量收口：npm test 全量（node test/run-tests.mjs，含五组新用例与既有回归）+ npm run lint 语法检查（node test/check-syntax.mjs）——命令与括注之间必须留字词分隔，全角括号紧跟命令会被命令存在性校验的 \S+ 吞进 script 名（plan postcheck 实证）'
acceptance:
  - 'FR-01 对照（plan 全局验收 3 前三行为）：用例①②③ 绿——covered-service 计分子放行（ok=true 零 errors，等式满足）+ 缺测试锚点进 error + advisory 承接计数 warnings 在场且 N 与 fixture 行数一致'
  - 'FR-02 / D-002 对照（plan 全局验收 3 第四行为）：用例④ 绿——验收矩阵 covered-service 行 unfilled=0 / missingEvidence=0 不误报，backfill 后 facts.matrixPartialRows=0（移交/封顶不触发的结构性证据）'
  - 'plan 全局验收 1：npm test 全量通过（五组新用例 + 全部既有用例）且 npm run lint 通过'
  - 'plan 全局验收 2：纯四枚举文档行为逐字不变——既有用例 1-7 断言语义零改动，仅六处文案字面/夹具占位同步，判定面断言值（unfilled 计数/错误条数/ok 布尔）不变'
verify:
  - npm test
  - npm run lint
constraints:
  - '存量四枚举文档校验行为逐字不变（plan 全局硬约束）：既有用例 1-7 断言语义零改动——判定面行为（ok/errors/warnings 结构与值）不变，仅同步依赖旧文案字面的六处子串/夹具'
  - 'covered-service 锚点校验复用 matrixEvidenceHasAnchor 三形态（`.test.` / file:line / 反引号），禁第二套解析文法——测试只断言既有三形态口径，不发明新锚点形态'
  - '零新正则零路径拼接（Windows/macOS/Linux 无差）：新用例断言用 includes/deepEqual 子串与结构断言，临时文件沿用 mkdtempSync + test.after 清理纪律'
  - '零 facts schema 变更：用例④ 断言读既有 facts.matrixPartialRows 字段，不新增字段；stage-contract 零 import verify-probes 铁律不破——测试侧经两模块各自导出函数调用'
  - '测试红窗在 task-04 收口是设计内状态：Wave1/2 文案落地后至断言同步前 npm test 短暂红属预期（字面已变、断言未跟），本 task 全量收口转绿；禁止为转绿回退 task-01/02 的文案改动或放宽/删改既有断言语义（非测试逻辑有误时禁改测试凑绿——判定面行为异常回 task-01 修实现）'
  - '不做 service 承接占比上限断言（advisory 观察面，D-001 故障面条款）；不动回执门禁/集成证据门/写端点权限 advisory 的既有断言'
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
