---
id: task-03
title: 'probe7 partial/uncovered 联动（validateAcceptanceMatrix 分支读 facts.handover）+ Runtime Evidence 不涉及收口与降级路径提示'
title_zh: 'probe7 partial/uncovered 联动（validateAcceptanceMatrix 分支读 facts.handover）+ Runtime Evidence 不涉及收口与降级路径提示'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: ['task-01', 'task-02']
blocks: ['task-07']
requirement_ids: [FR-03, FR-04]
decision_ids: ['D-003@v1', 'D-004@v1']
allowed_paths:
  - src/stage-contract.js
  - src/verify-probes.js
  - test/acceptance-matrix-gate.test.mjs
target_files:
  - src/stage-contract.js
  - src/verify-probes.js
  - test/acceptance-matrix-gate.test.mjs
expects_from:
  task-01:
    - contract: verify-facts-producer
      needs: ['facts.handover[].severity', 'facts.runtimeEndpointExcluded']
  task-02:
    - contract: pass-eligibility-validator
      needs: ['evaluatePassEligibility', 'factsExpected']
related_tests:
  - test/acceptance-matrix-gate.test.mjs
goal: >
  给 validateAcceptanceMatrix（src/stage-contract.js:833-880）加「矩阵存在 partial/uncovered 行且
  facts.handover 零有效行（任意 severity）→ error」联动分支（D-003：部分实现必须有移交去向；handover
  数据读 facts、本体 MD 槽解析充当防篡改锚点 X-05），并完成 Runtime Evidence 收口的消费侧与骨架
  降级路径提示（D-004：判级 integration/deployment-critical 时 facts.runtimeEndpointExcluded 计入
  封顶事实面）——「不涉及」空填与部分实现无移交去向两条静默通道被封住；行识别文法的解析与写入归
  task-01 producer，本任务只做骨架提示与消费侧。
implementation:
  - '依据 design.md §3（D-003/D-004、X-05/X-18）与 requirements FR-03/FR-04，先读 src/stage-contract.js 的 validateAcceptanceMatrix（:833-880）、extractAcceptanceMatrixSlots（:795-822，rows[].verdict 已白名单四枚举）、isIrStrictVerifyChange（:562）与 :1076 注册面；src/verify-probes.js 的 parseHandoverRows（:1569，task-01 扩四列后 items 含 severity）与 backfillFactsFromMdAndTests 首次 backfill 已写 facts.handover 的时序（:1622-1625）'
  - 'stage-contract.js validateAcceptanceMatrix 加联动分支：矩阵段在场且 rows 中 verdict 为 partial/uncovered 的行数 >0 时，读 changeDir/verify-facts.json 的 facts.handover（task-01 四列产出，任意 severity 的有效行计数）——零有效行 → errors.push（文案逐条列 partial/uncovered 触发行 + 修复指引「补『## 移交项（结构化）』有效行、或修正判定、或降级 PASS WITH NOTES」；facts 缺失时附「重跑 verify-probes」出路）；有效行 ≥1 → 本分支放行，封顶与否归 FR-01 条件②的 blocking 行判定（④管有去向、②管去向是否 blocking）'
  - '分支的 factsExpected 口径复用 task-02 判定式（isIrStrictVerifyChange(changeDir) || verify-facts.json 在场，同 checkProbeConsistency 口径）：false（存量未跑管线）→ 分支空转零行为变化；true 而 facts 缺失 → 按零有效行 fail-closed 处理'
  - '消费侧接线（FR-03）：在 task-02 交付的 evaluatePassEligibility 条件面追加 runtime-endpoint-excluded 事实——changeRiskProfile 判级为 integration/deployment-critical 且 facts.runtimeEndpointExcluded === true 且 handover 零有效行（第一版存在性口径；验收项 ↔ handover 逐行关联 advisory 归 R-05 后续）→ 触发封顶 error（triggered[] 增对应 fact 枚举与 detail）；判级低于该档或字段缺失（additive 可选字段）→ 不触发，存量 facts 零迁移兼容'
  - 'verify-probes.js generateVerifyResultSkeleton 的 Runtime Evidence 节（:1900-1901）注释追加降级路径提示，原文照录 design §3.2：「服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及」——以独立注释行追加、不以「不涉及」收尾、不进表格行，避免命中 task-01 producer 的行识别文法（X-18）；保留既有口径句（「未涉及的行写『不涉及』」）不删'
  - '适配被打爆的既有夹具：test/acceptance-matrix-gate.test.mjs 2.3「全填放行」夹具（makeChange strict=true → factsExpected=true，含 partial+uncovered 行且无 handover）按新契约最小适配——夹具补 verify-facts.json（handover.items ≥1 行）使「正常流不误伤」断言语义在新契约下仍成立；非改断言避错，是新行为契约的夹具同步；新分支完整断言面归 task-07（plan W5）'
  - 'npm test 与 npm run lint 全绿后收尾（AGENTS.md 规则 8 实证口径）'
acceptance:
  - '矩阵含 partial/uncovered 行且 facts.handover 零有效行（任意 severity）→ runValidators verify 阻断（ok=false），error 文案含触发行清单与修复指引（FR-04 第一态）'
  - '存在任意 severity 的 handover 有效行 → 该分支放行，封顶与否由 blocking 行决定（FR-04 第二态；与 FR-01 条件②④分工不重叠）'
  - 'factsExpected=true 而 verify-facts.json 缺失 → 分支按零有效行 fail-closed 拦下且文案含「重跑 verify-probes」出路；factsExpected=false 存量变更 → 分支零行为变化'
  - '判级 integration/deployment-critical 且 facts.runtimeEndpointExcluded=true 且 handover 零有效行 → 封顶校验触发；判级不符或字段缺失 → 不触发（FR-03 第一态，additive 兼容）'
  - '新生成骨架的 Runtime Evidence 节注释含降级路径提示原文（Controller 直调冒烟 / 基础设施恢复复跑——不要空填不涉及）（FR-03 第二态）'
  - 'npm test 全量通过（含适配后的 test/acceptance-matrix-gate.test.mjs）且 npm run lint 通过'
verify:
  - 'npm test'
  - 'npm run lint'
constraints:
  - '不动 requiresEvidence（:646-652 分层归 task-02）与 :1076 validators 注册数组——分支并入 validateAcceptanceMatrix 本体，不新增注册行（task-02 的 validatePassEligibility 注册形态不受影响）'
  - 'handover 数据只读 facts.handover，不在本 validator 重复解析 MD 移交项表（防篡改锚点由本体矩阵 MD 槽解析承担，X-05）；runtimeEndpointExcluded 的行识别文法解析与 facts 写入归 task-01 producer，本任务不重复实现'
  - '分层单向：stage-contract.js 不 import verify-probes.js（维持 verify-probes → stage-contract 单向，不造静态 import 环）'
  - '不做逐行强关联硬门（验收项 ID ↔ handover 条目文本命中）——存在性门槛起步，逐行关联纯 advisory（R-05）'
  - '新分支的测试断言增量归 task-07；本任务对 test/acceptance-matrix-gate.test.mjs 只做被打爆夹具的最小适配（新契约下的夹具同步），禁止改断言语义来「凑过」（AGENTS.md 规则 11）'
  - '纯 JavaScript（ESM）零新依赖；Windows/Linux/macOS 兼容（CRLF/LF 容忍，读文件沿既有 utf8 口径）'
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
