---
id: task-02
title: 'validatePassEligibility 注册壳+纯函数+factsExpected 判定，requiresEvidence :646-652 三处分层，change-risk-profile auditRuntimeReceipt sourceTag'
title_zh: 'validatePassEligibility 注册壳+纯函数+factsExpected 判定，requiresEvidence :646-652 三处分层，change-risk-profile auditRuntimeReceipt sourceTag'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: ['task-01']
blocks: ['task-03', 'task-06', 'task-07']
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v2, D-002@v1, D-006@v1, D-010@v1, D-011@v1]
allowed_paths:
  - src/stage-contract.js
  - src/change-risk-profile.js
target_files:
  - src/stage-contract.js
  - src/change-risk-profile.js
provides:
  - contract: pass-eligibility-validator
    fields:
      - evaluatePassEligibility
      - factsExpected
expects_from:
  task-01:
    - contract: verify-facts-producer
      needs:
        - facts.integrationRan
        - facts.dbScriptDeclarations
        - facts.matrixPartialRows
        - facts.runtimeEndpointExcluded
        - 'facts.handover[].severity'
goal: >
  在 verify validators 注册 facts 锚定的集中式封顶 validatePassEligibility（结论=PASS 时四个
  已知未验证区任一在场即 error，与 validateAcceptanceMatrix 同构），requiresEvidence
  （stage-contract.js:646-652）做 risk_level 豁免洞三处分层，auditRuntimeReceipt 增 sourceTag
  回执来源分类——「要不要集成证据」与「能不能写 PASS」解耦（design 总体方案 §1/§2）。
implementation:
  - '新增导出 validatePassEligibility(cwd, changeName, context)（src/stage-contract.js）注册壳：与 validateAcceptanceMatrix（:833）同三参签名同构——壳内 resolveChangeDir 定位 changeDir、读 verify-result.md 结论（extractVerifyConclusionSlot）、读 verify-facts.json（缺失容 null）、detectChangeRisk 组装 changeRiskProfile、算 factsExpected，组装 args 后调 evaluatePassEligibility 纯函数；注册进 contracts.verify.validators（:1069-1077，追加于 validateAcceptanceMatrix 之后）——注册即覆盖 gates / machine-interface 全部 runValidators 调用方（D-010）'
  - '新增纯函数 evaluatePassEligibility(args)（X-09 双层形态：零 MD 解析、零 IO，消费 task-01 契约字段）：factsExpected 判定式 = isIrStrictVerifyChange（:562 现成）|| verify-facts.json 在场（含探针子节判别，同 checkProbeConsistency「有 facts 无探针子节」口径）'
  - 'factsExpected=false（存量未跑管线）→ 沿用存量兼容口径返回 ok 不误伤；factsExpected=true 而 facts 缺失 → 全条件按触发处理（双源 fail-closed，D-011），报错附「重跑 verify-probes」出路（R-07）；结论 ≠ PASS → 直接 ok（封顶只管 PASS）'
  - '四条件判定（结论=PASS 且任一成立 → error，逐条列触发行 + 修复指引「改写 PASS WITH NOTES 并补 ## 移交项（结构化）」）：① facts.integrationRan=not-ran（时序口径 X-01：validator 时点只认已落盘 quality-scan 记录，被拦出路=重跑质量扫描步或降级 NOTES，不算失败）；② facts.handover.items 中 severity=blocking 行数 > 0；③ verify 时点文件集（design.md 文件清单——design-facts 已解析 ∪ worktree changed files）∩ db/**/*.sql 存在未进 facts.dbScriptDeclarations 的文件（D-012：apply manifest 此时不存在，apply/archive 兜底门归 task-04）；④ facts.matrixPartialRows > 0 且 handover 零有效行（任意 severity）——④管「有去向」、②管「去向是否 blocking」'
  - 'runtimeEndpointExcluded 附加条件：changeRiskProfile.level ∈ {integration-critical, deployment-critical} 且 facts.runtimeEndpointExcluded=true 且无对应 handover → 计入事实面（FR-03 / D-004，仅判级时计入）'
  - '返回 { ok, errors, triggered: [{fact, detail}] }，fact 枚举 integration-not-run / blocking-handover-present / db-script-undeclared / matrix-partial-no-handover；error 文案含 escape 出路（降级 NOTES / 重跑 verify-probes / 重跑质量扫描步——全局验收 8）'
  - 'requiresEvidence 三处分层（src/stage-contract.js:646-652，D-002）：① explicit + 降级 unit-sufficient → 维持免证据（关键词误伤逃生保留）；② explicit 且仍 integration/deployment-critical + PASS WITH NOTES → 必须携带结构化 handover（blocking 级计入封顶口径同条件②）或齐全集成证据，二选一，缺 → error；③ 非显式（关键词判级）原判定式行为一字不动（防 PASS WITH NOTES 绕证据门控）'
  - 'auditRuntimeReceipt 增可选入参 opts.sourceTag（src/change-risk-profile.js:398，向后兼容缺省 build——fail-closed：宁可触发封顶要求 handover）：分类打标在本文件内按回执 command 来源实现（auditRuntimeReceipt / checkIntegrationEvidence :312/:325 调用链），sourceTag ∈ {build, unit} 的回执不作集成实测绿判据；打标依据 = 命令来源声明（quality-scan 记录的命令与 verify_precedents 声明），不解析日志内容（X-10）；stage-contract :685 调用侧只透传声明源——verify-postcheck 不在 auditRuntimeReceipt 调用链上，不受影响'
acceptance:
  - 结论=PASS 且四条件各一态单独触发 → runValidators error（逐条 fact 枚举 + 触发行 + 修复指引）；四条件全清 → ok 放行（未触发行为零变化）
  - factsExpected=false（存量无 facts）→ ok 不误伤；factsExpected=true 而 facts 缺失 → 全条件按触发处理，文案含「重跑 verify-probes」出路
  - explicit + unit-sufficient + PASS WITH NOTES → 免证据维持；explicit + integration-critical + PASS WITH NOTES 且无结构化 handover 无齐全集成证据 → error（豁免洞分层）
  - sourceTag=build/unit 的回执不计入「集成实测已跑」绿判据；未传 sourceTag 默认 build；非 explicit 场景 requiresEvidence 行为不变
  - validatePassEligibility 与 validateAcceptanceMatrix 同签名（cwd, changeName, context）同构注册进 verify.validators；回退 = 移除注册行（纯加法）
verify:
  - npm test
  - node --test test/verify-conclusion-slot.test.mjs
  - npm run lint
constraints:
  - validator 纯加法：未触发四条件行为零变化；结论枚举三值 / facts schemaVersion / requiresEvidence 非 explicit 判定式 / 平台同步协议不变；回退 = 移除 verify.validators 注册行
  - 消费 task-01 契约字段（expects_from），不重复实现 producer 解析；validator 本体零 MD 解析（D-011——MD 锚点防篡改兜底并入 checkProbeConsistency 抽查面属 task-03）
  - fail-closed 边界（全局硬约束 5）：consumer 侧 factsExpected=true 而 facts 缺失按条件触发拦下；producer 侧输入缺失 fail-open 注记；被拦出路=降级 NOTES 非失败（R-01/R-07 escape 在报错文案可达）
  - 事实③文件集只做声明面/diff 对账，零连库（非目标）；apply/archive 兜底门归 task-04 不在本 task
  - 分层单向（全局硬约束 3）：不新增 stage-contract → verify-probes 静态依赖；矩阵事实动态 import 传参形态不破坏
  - sourceTag 分类只认命令来源声明（X-10），不解析日志内容猜测；未定类默认 build
  - 零新依赖、纯 JavaScript（ESM）、Node >= 22.13；Windows/Linux/macOS 兼容
  - 不做 validateAcceptanceMatrix partial/uncovered 分支与 Runtime Evidence 收口（task-03）、不做双门/handover 注入（task-04）、不新增测试断言（task-07）
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
