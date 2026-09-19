---
id: task-02
title: 'pure-function layer: computeCeremonyTier spanRiskPatterns / reconcileDualRun factSpanRiskPatterns / computeGateProfile riskTable default [] + both test files renovated'
title_zh: '纯函数层——两消费函数参数化接声明表 + 两测试文件翻新（不删旧表防中间态）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:44:50
priority: P0
depends_on: [task-01]
blocks: [task-03]
requirement_ids: [FR-02, FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/ceremony-tier.js
  - src/quick-gate-profile.js
  - test/ceremony-tier.test.mjs
  - test/quick-gate-profile.test.mjs
target_files:
  - src/ceremony-tier.js
  - src/quick-gate-profile.js
  - test/ceremony-tier.test.mjs
  - test/quick-gate-profile.test.mjs
expects_from:
  - provider: task-01
    needs: [matchSpanRiskPatterns, pattern-re-shape]
provides:
  - consumer: task-03
    fields: [spanRiskPatterns-param, factSpanRiskPatterns-param, riskTable-default-empty]
    note: 'computeCeremonyTier 新 opts.spanRiskPatterns（默认 []）与 reconcileDualRun 新 factSpanRiskPatterns 穿透；computeGateProfile opts.riskTable 默认改 []——task-03 调用方装载注入'
related_tests:
  - test/ceremony-tier.test.mjs
  - test/quick-gate-profile.test.mjs
goal: >
  两消费纯函数自内嵌 QUICK_RISK_PATH_PATTERNS 常量改为参数化声明表（默认空=维度关闭），
  匹配循环换 task-01 共享 matcher，既有测试按声明面口径翻新。
implementation:
  - src/ceremony-tier.js：import 换 matchSpanRiskPatterns（QUICK_RISK_PATH_PATTERNS import 保留至 task-03 收口——本步不再消费）；computeCeremonyTier 签名增 opts.spanRiskPatterns（默认 []），span 轴命中循环（:216-234）改 matchSpanRiskPatterns 分组（riskHitsByPattern 语义保持——按 pattern 聚合 files），reasons 文案形态逐字不变；reconcileDualRun（:337-351）增 factSpanRiskPatterns 透传内部 computeCeremonyTier；头注 span 轴描述更新（声明面口径，指 D-003）
  - src/quick-gate-profile.js：riskTable 默认值改 []（:148）；头注与 JSDoc 口径改声明面（默认空=维度关闭）；import 清理（QUICK_RISK_PATH_PATTERNS import 待 task-03 删——本步仅默认值不再引用，若 lint 报 unused import 则本步移除该 import 行，task-03 只删 change-risk-profile.js 定义侧）
  - test/ceremony-tier.test.mjs：spanRiskPatterns 注入用例（声明表命中→S2+reasons 记 token 与文件）；默认 [] = 维度关闭（旧六域路径文件在无参下不再触发 span S2——:117-121 等依赖默认表块按此口径改写，显式注入编译表或改断言）；阈值 8/2 与三轴 max 既有钉零变化复跑
  - test/quick-gate-profile.test.mjs：Grill X-8 点名块全翻新——:183-188/:211-214/:274（依赖默认表命中）改显式 riskTable 注入；:307-326 判级用例同口径；:331-334（riskHits 恒空断言——默认空下真恒空，改「注入表才命中」双向钉）；:359-360（默认表快照断言——默认空表下会抛错，改为注入编译产物断言）；:379-381 D-011 钉翻新（QUICK_RISK_PATH_PATTERNS 零变化钉→声明面口径钉）；:348-354 表形状测试改为 compileSpanRiskPatterns 产物形状钉
acceptance:
  - node --test test/ceremony-tier.test.mjs test/quick-gate-profile.test.mjs 全绿
  - computeCeremonyTier({declaredFiles:['src/auth/x.js']}) 无 spanRiskPatterns 时 span 维度不触发（S0 维度关）；注入含 auth token 表时 S2
  - computeGateProfile 无 riskTable 时 riskHits=[] 且 runtimeEvidence='na'；注入表时命中文件 L2
  - 阈值/公式既有断言零改动通过（8/2/2 与 max 行为钉原样）
verify:
  - node --test test/ceremony-tier.test.mjs test/quick-gate-profile.test.mjs
constraints:
  - 本 task 不删 QUICK_RISK_PATH_PATTERNS 定义（change-risk-profile.js 零触碰——task-03 收口）
  - 价目表零改动：三轴 max 公式、SPAN_FILES_THRESHOLD=8、SPAN_MODULES_THRESHOLD=3、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降
  - reasons 文案形态逐字不变（消费方审计打印/双跑比对依赖）
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
