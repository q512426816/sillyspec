---
id: task-03
title: 'verify-quality-scan.js 埋点 + complete.js 双 consume 点'
title_zh: 'verify-quality-scan.js 埋点 + complete.js 双 consume 点'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P1
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-003@v1, D-004@v1, D-006@v1]
expects_from:
  task-01:
    friction-api:
      recordFrictionEvent: '埋点调用签名（cwd/platformOpts/changeName/type/detail）'
      consumeFrictionHint: '收尾调用签名（cwd/platformOpts/changeName）→ {hint,counts}'
allowed_paths:
  - src/run/verify-quality-scan.js
  - src/run/complete.js
target_files: [src/run/verify-quality-scan.js, src/run/complete.js]  # 对账用精确路径清单
related_tests: [test/noai-completion-gate.test.mjs]
goal: >
  verify 侧埋点与输出：质量扫描步失败记 verify_run_failed（含 advisory lint 失败）；verify 完成在 complete.js 两处收尾段（completeStep + continueStep）consume 一行提示。
implementation:
  - executeVerifyQualityScan：storeQualityScan 后、throw 决策前，if (testFailed || lintCheck.status === 'failed') recordFrictionEvent detail=test/lint（记录条件与 throw 条件解耦，Grill CC-10）
  - complete.js completeStep：printStageCompletionScopeAudit 之后，if (stageName === 'verify') consume → hint 非零 console.log 一行（~667）
  - complete.js continueStep（wait 解除完成路径）：同款 consume（~1475，Grill CC-03——漏此则 --continue 收尾丢提示丢清零）
  - consume 结果 hint 为 null 时零输出
acceptance:
  - 质量扫描步 test 失败或 lint failed（含 advisory）→ verify_run_failed +1
  - verify --done 成功且计数非零 → 输出恰含一次摩擦提示行，计数文件删除；--continue 路径同款
  - 全零 verify --done 输出与现状逐字一致（无新增行）
verify:
  - npm test -- test/friction-tally.test.mjs test/noai-completion-gate.test.mjs
constraints:
  - 不改 throw 语义/指纹复用逻辑；提示是 console.log 一行，不进返回值不阻断
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
