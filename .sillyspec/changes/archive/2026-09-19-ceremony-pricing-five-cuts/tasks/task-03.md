---
id: task-03
title: 'Consumer rewiring, three retained cuts, and retirement closing: eight consumer points to blast-surface input, catch-up repricing, over-report warn, span heading dual-form, then delete detectChangeRisk/lexicon machinery + spec comments + verify-conclusion-slot test rewrite (no broken intermediate window)'
title_zh: '消费点接线、保留三刀与删除收口——八消费点接线 + tier 直入 + 追赶重定价 + 高报 warn + span 双形态；接线完成后删除词表/否定抑制/枚举继承/detectChangeRisk + spec 注释 + verify-conclusion-slot 翻新 + grep 清零'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 08:26:56
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v2, D-003@v1, D-004@v1, D-005@v1, D-008@v1→v2, D-009@v1]
allowed_paths:
  - src/stage-contract.js
  - src/ceremony-tier.js
  - src/run/gates.js
  - src/verify-postcheck.js
  - src/review-tier.js
  - src/run/verify-quality-scan.js
  - src/change-risk-profile.js
  - src/stage-contract-spec.js
  - test/ceremony-tier.test.mjs
  - test/stage-review.test.mjs
  - test/concurrent-preflight-hooks.test.mjs
target_files:
  - src/stage-contract.js
  - src/ceremony-tier.js
  - src/run/gates.js
  - src/verify-postcheck.js
  - src/review-tier.js
  - src/run/verify-quality-scan.js
  - src/change-risk-profile.js
  - src/stage-contract-spec.js
  - test/ceremony-tier.test.mjs
  - test/concurrent-preflight-hooks.test.mjs
provides:
  - contract: consumer-wiring-complete
    fields: [resolveChangeRisk-at-eight-consumer-points, applyDeclarationCatchUp, reconcileDualRun-warn]
    desc: '八消费点全部走声明面新输入、applyDeclarationCatchUp 三分支纯函数导出、reconcileDualRun warn 态落地——task-04 契约同步与全量验收的前置'
expects_from:
  task-01:
    - contract: blast-surface-loader
      needs: [resolveBlastSurfaces, loadBlastDeclarations]
  task-02:
    - contract: declaration-based-risk-resolver
      needs: [resolveChangeRisk]
goal: >
  八个判级消费点从 detectChangeRisk 散文扫描整体切换到声明面新输入（files × loadBlastDeclarations +
  explicit；事实面去内容扫描——自指陷阱整类消失），并落地保留三刀：applyDeclarationCatchUp 三分支追赶
  重定价、reconcileDualRun 高报 warn、readDesignOwnFiles 标题双形态段关闭——后补声明在完成门可重定价
  （无摩擦可降、摩擦地板不退），双跑高报可见不阻断。
implementation:
  - '步骤一（stage-contract 四消费点；design Wave C 表记 :385/:658/:1361/:1641——实测 :1361 已漂 :1382、:1641 已漂 :1662，Edit 前重读核对）：src/stage-contract.js:385（design 门判级）/:658/:1382/:1662 的 detectChangeRisk({ designContent, ... }) 全部换 resolveChangeRisk({ files: 各点对应声明面（readDesignOwnFiles）或实际面, blastDeclarations: loadBlastDeclarations(...), explicitRiskLevel: extractExplicitRiskLevel(designContent) })；:1099 注释行同步；矩阵判定域（:789-1250）不动（api-matrix 领地）。'
  - '步骤二（gates 定价输入 + tier 直入）：src/run/gates.js:632（computeInitialCeremonyTierDoc 内）detectChangeRisk 全文扫描换 declaredFiles（:634 已有）× loadBlastDeclarations + explicit；src/ceremony-tier.js:145 computeCeremonyTier 签名增 blastTier 直入通道（与 riskDetection.level 兼容层并存），gates 调用点 :640 同批切 blastTier；ceremony-tier.js 模块头注/JSDoc 的 detectChangeRisk 契约表述（:12/:35/:130/:265）同步换 blastTier/声明面口径（design Wave E 挂本文件、allowed_paths 归本卡）。'
  - '步骤三（review-tier 实判支）：src/review-tier.js:118（classifyReviewTier 内 design/plan 实判支）detectChangeRisk({ designContent, planContent, changedFiles: declaredFiles }) 换 resolveChangeRisk 声明面口径（declaredFiles :98 已解析同源复用）；riskDetection 直传支与 plan_level 代理链（:124-131）不动。'
  - '步骤四（verify-quality-scan）：src/run/verify-quality-scan.js:531 detectChangeRisk 全文扫描换声明面口径；:532 risk.level===integration-critical/deployment-critical 预填判据换 evidenceRequired 面（reasons 文案随 requiredVerification 语义改写）。'
  - '步骤五（verify-postcheck 事实面去内容扫描）：src/verify-postcheck.js:3082 detectChangeRisk({ designContent: fact.content, ... }) 删除——只传 actual.files × 声明面（事实面无 explicit 声明通道，:2947 既有契约保持）；readCeremonyFactContent 函数（:2952）与调用（:3078）及 CEREMONY_FACT_CONTENT_* 常量（:2941-2942）整体删除，事实面零内容扫描；:3022 JSDoc severity 取值域补 warn；warn 态 notes 披露（文案由 runCeremonyDualRunCheck :3031 写）。'
  - '步骤六（applyDeclarationCatchUp 三分支纯函数，src/ceremony-tier.js computeCeremonyTier :145 区域后新增）：transitions 空且摩擦未超阈 → 整档换（可升可降）；空且超阈 → 整档换不设地板、同锁 escalate 即时 +1；非空 → max(重算档, transitions 最高 to 档)；transitions 原样透传、重定价只记 reasons。'
  - '步骤七（reconcileDualRun 高报 warn，src/ceremony-tier.js:270）：fact < declared → { mismatch: false, severity: ''warn'' }——返回结构零新增字段；低报 error 分支逐字不变。'
  - '步骤八（gates 追赶重定价接线）：src/run/gates.js escalateCeremonyTierAtGate（:661）锁内、escalateByFriction 之前——档位文件在场时按当前声明面重算（复用 computeInitialCeremonyTierDoc，以参数区分事件文案）并 applyDeclarationCatchUp，再跑既有摩擦升档；重定价记 reasons「声明追赶重定价」不记 transitions、不追加「初始档/首见」行。'
  - '步骤九（readDesignOwnFiles 双形态，src/run/gates.js:1631）：标题双形态——「## 6.」数字标题与「## 文件变更清单」（含括注变体）都开清单段；任何 ^##\s 标题关闭清单段；旧「## 6.」行为逐字不变；:1698 调用点自动受益。'
  - '步骤十（删除收口，批次 A Grill 修正——task-02 只做新增面，删除在消费点接线完成后收口，防中间态 import 断裂窗口）：src/change-risk-profile.js 删 INTEGRATION_CRITICAL_PATTERNS（:18-43）/INTEGRATION_FILE_PATTERNS（:45-57）/否定抑制族 NEGATION_CUES/NEGATION_WINDOW/CLAUSE_SPLIT_RE/ENUM_GAP_RE（:178-181）/collectLineTriggerStats（:187-222）/detectChangeRisk 散文体（:238-307）整体删除不留 legacy；RISK_LEVEL_CAUSES（:147-156）词表文案重写为声明面口径（「触碰项目声明的高危面 <prefixes>」/「显式声明」）；模块头注（:1-7）按声明面语义改写；src/stage-contract-spec.js :55 change-risk-gate 注释与 :229-232 integration-evidence 注释块同步（关键词表述改声明面口径）；test/verify-conclusion-slot.test.mjs :84 实测无需翻新——其 fixture 走 frontmatter explicit 通道，resolveChangeRisk 的 level 兼容字段使其语义原样成立（18/18 单跑绿，target_files 已如实移除该路径）。保留面零损伤：extractExplicitRiskLevel/VERIFICATION_NEEDS/checkIntegrationEvidence/auditRuntimeReceipt/QUICK_RISK_PATH_PATTERNS/isEndToEndTaskText/回执分类族原样。'
  - '步骤十b（删除面清零复核，R-06）：grep -rn "detectChangeRisk(" src/ test/ 清零 + 无括号注释引用同步清（src/stage-contract.js:1099 JSDoc、src/ceremony-tier.js :12/:35/:130/:265 契约表述、src/stages/verify.js:194 归 task-04 教学段重写）——任一残留即返工。'
  - '步骤十一（引擎组，test/ceremony-tier.test.mjs）：:260-261 above 例 none→warn 翻新（声明 S3/事实 S2 → severity warn）；applyDeclarationCatchUp 三分支矩阵新增；computeCeremonyTier blastTier 直入用例新增（riskDetection.level 兼容层回归钉并存）。'
  - '步骤十二（门接线组，test/concurrent-preflight-hooks.test.mjs）：在场档追赶重定价落档（无摩擦可降）、超阈地板托底（同锁 escalate 即时 +1）、事件文案区分初始定价/追赶重定价——合成档位文件 + 完成门三态用例。'
acceptance:
  - 八消费点（src/stage-contract.js:385/:658/:1382/:1662、src/run/gates.js:632、src/review-tier.js:118、src/run/verify-quality-scan.js:531、src/verify-postcheck.js:3082）全部走 resolveChangeRisk/resolveBlastSurfaces 新输入，零 detectChangeRisk 残留调用。
  - 'grep -rn "detectChangeRisk(" src/ test/ 输出为空（R-06 清零收口）。'
  - 无摩擦迁移档位文件在下一道完成门自动重定价（可降）；有摩擦迁移不低于地板（超阈同锁 escalate 即时 +1）；transitions 非空取 max(重算档, transitions 最高 to 档)。
  - 重定价记 reasons「声明追赶重定价」不记 transitions；事件文案区分初始定价与追赶（追赶不追加「初始档/首见」行）。
  - 'reconcileDualRun 声明 S3/事实 S2 → { mismatch: false, severity: ''warn'' } 返回结构零新增字段；声明 S1/事实 S2 → error 逐字不变。'
  - readDesignOwnFiles 认「## 文件变更清单」（含括注）——清单行计入 span（≥8 → S2）；任何 ^##\s 标题关闭段；「## 6.」旧行为逐字不变。
  - 事实面零内容扫描——src/verify-postcheck.js 无 readCeremonyFactContent/CEREMONY_FACT_CONTENT_* 残留，reconcileDualRun 只吃 actual.files × 声明面。
  - node --test test/ceremony-tier.test.mjs test/concurrent-preflight-hooks.test.mjs 全绿。
verify:
  - node --test test/ceremony-tier.test.mjs test/concurrent-preflight-hooks.test.mjs test/verify-conclusion-slot.test.mjs
  - 'grep -rn "detectChangeRisk(" src/ test/ 无输出（含步骤十删除收口后）'
  - npm run lint
constraints:
  - applyDeclarationCatchUp 三分支语义逐字（plan 全局硬约束 8）：空+未超阈→整档换；空+超阈→整档换不设地板（同锁 escalate 即时 +1）；非空→max(重算, transitions 最高 to)；重定价记 reasons 不记 transitions、事件文案参数化（不追加「初始档/首见」行）。
  - reconcileDualRun 返回结构零新增字段（severity 取值域仅扩 warn）；低报 error 逐字不变（硬约束 9）。
  - 事实面零内容扫描（readCeremonyFactContent 删除）；文件名仍走 changedFiles 判定（硬约束 11）。
  - 价目表零改动：档位集合 S0~S3、三轴 max、SPAN_FILES_THRESHOLD=8、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降（硬约束 1）。
  - 证据门判据零改动：VERIFICATION_NEEDS/checkIntegrationEvidence/auditRuntimeReceipt 原样——只换触发源（硬约束 2）；explicit risk_level 只压 tier 不豁免 evidenceRequired（硬约束 3）。
  - 未命中声明面 → blast S1；未配置项目禁止回退旧词表（硬约束 6——消费点不得私留词表兜底）。
  - readDesignOwnFiles 旧「## 6.」行为不变（硬约束 10）；零新正则族、路径匹配复用 matchModuleForFile 语义（硬约束 14）。
  - QUICK_RISK_PATH_PATTERNS 不动不迁（硬约束 12）。
  - 多 agent 铁律（硬约束 13）：stage-contract.js/gates.js/verify-postcheck.js Edit 前重读最新态、锚点漂移核对（design :1361/:1641 实测已漂 :1382/:1662）。
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
