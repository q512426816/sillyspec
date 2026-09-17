---
id: task-01
title: 'facts 管线 producer 扩写——backfillFactsFromMdAndTests 增 integrationRan/dbScriptDeclarations/矩阵摘要，parseHandoverRows 三列扩四列+缺省映射，parseDbScriptDeclarations 新函数，verify-facts-schema additive 登记'
title_zh: 'facts 管线 producer 扩写——backfillFactsFromMdAndTests 增 integrationRan/dbScriptDeclarations/矩阵摘要，parseHandoverRows 三列扩四列+缺省映射，parseDbScriptDeclarations 新函数，verify-facts-schema additive 登记'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: []
blocks: ['task-02', 'task-03', 'task-04', 'task-05']
requirement_ids: [FR-01, FR-06]
decision_ids: [D-011@v1, D-005@v2]
allowed_paths:
  - src/verify-probes.js
  - src/verify-facts-schema.js
  - src/run/gates.js
target_files:
  - src/verify-probes.js
  - src/verify-facts-schema.js
provides:
  - contract: verify-facts-producer
    fields:
      - facts.integrationRan
      - facts.dbScriptDeclarations
      - facts.matrixPartialRows
      - facts.runtimeEndpointExcluded
      - 'facts.handover[].severity'
      - parseDbScriptDeclarations
expects_from: []
goal: >
  为 PASS 结论封顶（task-02 validatePassEligibility）生产 facts 事实面：backfillFactsFromMdAndTests
  在首次 backfill 时点扩写 integrationRan / dbScriptDeclarations / matrixPartialRows /
  runtimeEndpointExcluded，parseHandoverRows 三列扩四列（severity 类型缺省映射 + 降级理由文法），
  verify-facts-schema additive 登记五字段——「已知未验证区」变机器可读，生产-消费时序锚定
  （design 总体方案 §1 实现纪律 D-011）。
implementation:
  - 'parseHandoverRows（src/verify-probes.js:1569）三列正则扩四列：第 4 列 severity（blocking|advisory），存量三列表格行零迁移兼容——缺省按类型映射 db-script/env-blocked→blocking、manual-acceptance/other→advisory（D-005@v2 / FR-06）；显式 blocking 降级 advisory 必须命中理由文法（降级：<理由>，依据 <file:line 或 D-xxx>），失配按 blocking 处理（fail-closed）；items 条目增 severity 字段，type/item/condition 既有字段与类型归一逻辑不动（既有字段级 equal 断言零回归）'
  - '新增私有函数 parseDbScriptDeclarations(md)（src/verify-probes.js，X-03 文法）：回执槽（## 集成验证回执）条目 command 含 db/<file>.sql，或声明行「已对目标库执行：db/<file>.sql」→ 产出 string[]；回执文法复用 parseEvidenceSlots 现成解析，不自造第二套'
  - 'backfillFactsFromMdAndTests（src/verify-probes.js:1591）扩写：四个新字段全部在函数主路径无条件产出（X-08 时序纪律——首次 backfill = gates.js:627 收尾前置调用、无 testCheckResult 时点；误挂 gates.js:743 二次回填的 testCheckResult 分支则 task-02 validator 消费时点读不到、恒误拦）'
  - 'facts.integrationRan："ran"|"not-ran"，按 D-006 判定表——quality-scan 实测记录自 specBase 推导自读（specBase/changeName 自 factsPath 目录上推，路径规则同 run/verify-quality-scan.js:36 qualityScanRecordPath：specBase/.runtime/verify-quality-scan-<changeName>.json，不依赖调用方传参）。已跑 = 记录在场且 commands.test 实跑且 test_strategy ∈ {full, module, evidence-auto}，或回执槽 runtimeEvidence 存在命令来源含跨层调用（起服务/HTTP/进程对进程）的条目；未跑 = test_strategy=skip / 无任何实测记录 / 回执仅 compile·lint·纯单测（JUnitCore 直跑单测类）来源；evidence-auto 降级 module 已跑子集按 module 档算已跑；记录缺失（X-01：--done 亲测替代扫描场景时序不可得）→ not-ran，producer 侧输入缺失 fail-open 注记不阻断'
  - 'facts.dbScriptDeclarations = parseDbScriptDeclarations(verifyMd) 产出 string[]'
  - 'facts.matrixPartialRows：消费 stage-contract.extractAcceptanceMatrixSlots（src/stage-contract.js:795）统计 verdict ∈ {partial, uncovered} 行数——取数经动态 import 后传参（conclusion 先例；verify-probes 不写 import-from 静态语句、不造 import 环，全局硬约束 3），落点形态 execute 期定：verify-probes 顶层 await import 动态绑定（零 gates 改动）或调用侧 gates 接线动态 import 后经 opts 传入（仅一行级透传）'
  - 'facts.runtimeEndpointExcluded（X-18 文法）：verifyMd「## Runtime Evidence」节（骨架 :1900）内匹配「行含 端点|请求-响应|服务端点 关键词且以 不涉及 收尾」的表格行，至少一行命中 → true，无节/无命中 → false；解析与写入属 producer 侧，骨架注释改动归 task-03'
  - 'validateFactsV2（src/verify-facts-schema.js:169）additive 登记五字段在场校验：integrationRan ∈ {ran, not-ran}、dbScriptDeclarations 为 string[]、matrixPartialRows 为非负整数、runtimeEndpointExcluded 为 boolean、handover.items[].severity ∈ {blocking, advisory}——字段不在场一律不报错（缺省不炸，D-011 故障面），schemaVersion 保持 2'
  - '回执 command 来源分类枚举 cross-layer|build|unit：只认命令来源声明不解析日志内容（X-10），未定类默认 build（fail-closed 侧）——与 task-02 change-risk-profile sourceTag 同一分类规则，两侧口径一致不重造'
acceptance:
  - 首次 backfill（无 testCheckResult，对应 gates 收尾前置时点）后 verify-facts.json 含四个新字段且 handover items 带 severity——task-02 validator 消费时点已就位（生产-消费时序锚定）
  - parseHandoverRows：四列表格解析出 severity；三列表格行零迁移兼容按类型缺省映射；blocking 降 advisory 缺理由文法 → 仍按 blocking（fail-closed）
  - parseDbScriptDeclarations：回执条目 command 含 db/x.sql 与「已对目标库执行：db/x.sql」声明行两类均命中；无声明 → []
  - Runtime Evidence 节「服务端点…不涉及」表格行命中 → facts.runtimeEndpointExcluded=true；节缺失/无命中 → false
  - validateFactsV2 对五新字段在场时类型/枚举校验通过、缺省不炸——存量 facts（无新字段）零迁移通过，schemaVersion 仍为 2
  - 既有测试零回归：test/verify-handover-structured.test.mjs 与 test/verify-facts-v2.test.mjs 全绿
verify:
  - npm test
  - node --test test/verify-handover-structured.test.mjs
  - node --test test/verify-facts-v2.test.mjs
  - npm run lint
constraints:
  - 五新字段全部 additive 可选：缺省不炸、facts.schemaVersion 不动（FACTS_SCHEMA_VERSION=2）；底稿创建唯一入口仍是 verify-probes --init——无 facts 不凭空建，存量变更兼容 skip 口径不动
  - 时序纪律 X-08：四字段必须在首次 backfill 时点产出（写函数主路径，不挂 testCheckResult 分支）；quality-scan 记录自 specBase 推导自读，不加调用方传参依赖
  - 分层单向（全局硬约束 3）：verify-probes 不新增 import-from stage-contract 静态语句；extractAcceptanceMatrixSlots 经动态 import（若选调用侧传参形态才动 src/run/gates.js，且仅一行级动态 import + 透传，不碰门禁语义）
  - 存量三列 handover 零迁移；降级理由文法（降级：<理由>，依据 <file:line 或 D-xxx>）失配按 blocking；理由文法抽查面（checkProbeConsistency）属消费侧后续任务
  - 回执来源分类只认命令来源声明（X-10）不解析日志内容；未定类默认 build
  - 零新依赖、纯 JavaScript（ESM）、Node >= 22.13；Windows/Linux/macOS 兼容（路径 posix 化、CRLF 归一同 parseHandoverRows 既有风格）
  - 不做 validator 消费侧（task-02）、不做骨架渲染与 prompt 改动（task-03/06）、不新增测试断言（task-07 统一落 test/pass-eligibility.test.mjs 与既有文件增量）
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
