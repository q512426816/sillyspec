---
id: task-02
title: 'Risk-tiering additive half: change-risk-profile.js adds resolveChangeRisk (files x blast declarations; explicitRiskLevel lowers tier only, never waives evidence) + stage-contract/quick-gate test groups rewritten; deletion of detectChangeRisk/lexicon machinery deferred to task-03 retirement closing (no broken intermediate window)'
title_zh: '判级重构（新增面）——resolveChangeRisk 落地（explicit 只压 tier 不豁免 evidence）+ stage-contract/quick-gate 判级测试组重写；删除收口挪 task-03（防中间态 import 断裂窗口）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 08:26:56
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: ['D-008@v1→v2', 'D-009@v1']
allowed_paths:
  - src/change-risk-profile.js
  - test/stage-contract.test.mjs
  - test/quick-gate-profile.test.mjs
target_files:
  - src/change-risk-profile.js
  - test/stage-contract.test.mjs
  - test/quick-gate-profile.test.mjs
provides:
  - contract: declaration-based-risk-resolver
    fields: [resolveChangeRisk]
    desc: 'resolveChangeRisk({ files, blastDeclarations, explicitRiskLevel }) 返回 { tier, evidenceRequired, explicit, hitPrefixes, requiredVerification }——src/change-risk-profile.js 新导出，task-03 八消费点接线消费'
expects_from:
  - 'task-01: resolveBlastSurfaces（NEW:src/blast-surface.js）——resolveChangeRisk 的 files×声明面前缀匹配复用同款文法（零新正则族、不造第二套实现）；plan 声明两 task 无强依赖（Wave 1 并行），执行期以 tasks 顺序 task-01 先行落盘为准'
goal: >
  判级重构（新增面，FR-01 / D-008@v1→v2 / D-009@v1）：在 src/change-risk-profile.js 新增
  resolveChangeRisk 以「变更文件 × 项目声明面」判级——explicitRiskLevel 只压 tier 不豁免
  evidenceRequired；同步重写 stage-contract/quick-gate-profile 两个测试文件的判级用例组。
  **删除收口（词表/否定抑制/枚举继承/detectChangeRisk 散文体删除、RISK_LEVEL_CAUSES 文案、
  stage-contract-spec 注释、verify-conclusion-slot 翻新、全仓 grep 清零）挪 task-03**——
  批次 A Grill 发现：先删导出再接线会留五处具名 import 断裂窗口（src/stage-contract.js:12
  等），连本 task 范围测试都无法全绿；本 task 收成纯新增面，任意中间态全绿。
implementation:
  - 'src/change-risk-profile.js 新增导出 resolveChangeRisk({ files, blastDeclarations, explicitRiskLevel }) → { tier, evidenceRequired, explicit, hitPrefixes, requiredVerification }：files × 声明面前缀匹配（matchModuleForFile 同款文法，直调 task-01 落盘的 src/blast-surface.js resolveBlastSurfaces——单一实现）；requiredVerification：evidenceRequired=true → [unit_tests, contract_tests, real_daemon_backend_integration, runtime_log_evidence, terminal_state_assertion]（现行 integration-critical 组原样），否则 [unit_tests]；explicitRiskLevel（frontmatter 五级词经 RISK_TO_TIER 映射，存量兼容）只压 tier、不豁免 evidenceRequired（D-009）；RISK_TO_TIER 常量导出复用（不新造映射表）'
  - 'src/change-risk-profile.js 模块头注（:1-7）补一段声明面判级说明（旧词表段头注保留——函数体尚在，删除与头注改写归 task-03）'
  - 'test/stage-contract.test.mjs：判级用例组重写——import 行 :5 增 resolveChangeRisk（detectChangeRisk 旧用例段 :390-470 附近与 :618 组本 task 删除，函数删除归 task-03）；新增路径判级用例——含「显式声明压 tier 但不豁免 evidence」钉（如声明 S3+evidence × explicit=unit-sufficient → tier 压低、requiredVerification 仍全集）'
  - 'test/quick-gate-profile.test.mjs :22 import 增 resolveChangeRisk；:363-401 判级组（第 8/9 段）替换为声明面用例（路径×声明判级、词表词在正文出现不再触发判级）；文件头注 :12 第 8 点描述同步'
acceptance:
  - resolveChangeRisk 按 design 接口定义工作：前缀命中取最高档、未命中 S1、evidenceRequired 由 evidence 位直出、requiredVerification 两组取值正确（plan 全局验收 1 子项 / D-009）
  - 「显式声明压 tier 但不豁免 evidence」用例在场且绿（test/stage-contract.test.mjs 路径判级新用例组）
  - 中间态全绿铁律：本 task 完成时点 src/ 全部模块可加载（detectChangeRisk 及词表机器原样在场，删除归 task-03）、本 task 范围测试（stage-contract/quick-gate-profile）与 quick-gate-profile.test 全绿
  - 保留面零损伤：QUICK_RISK_PATH_PATTERNS / extractExplicitRiskLevel / VERIFICATION_NEEDS / checkIntegrationEvidence / isEndToEndTaskText / detectChangeRisk（本 task 未删）行为不变，既有相关用例仍绿
verify:
  - node --test test/stage-contract.test.mjs test/quick-gate-profile.test.mjs（本 task --done 时点全绿——无中间态断裂窗口，批次 A Grill 修正后的验收形态）
  - node -e "await import('./src/stage-contract.js'); await import('./src/run/gates.js'); await import('./src/verify-postcheck.js')"（五消费点模块可加载性冒烟——导出未删，恒绿）
  - npm run lint
constraints:
  - 证据门判据零改动：VERIFICATION_NEEDS / checkIntegrationEvidence / auditRuntimeReceipt 原样——只换触发源（evidence 位直出）。
  - explicit risk_level 只压 tier、不豁免 evidenceRequired（豁免=改 map，git 可见）。
  - 本 task 禁删 detectChangeRisk / 词表 / 否定抑制 / 枚举继承（删除收口归 task-03）——纯新增面，任意中间态全绿。
  - QUICK_RISK_PATH_PATTERNS 不动不迁（D-011 登记）。
  - 价目表零改动：档位集合 S0~S3、三轴 max 公式、SPAN_FILES_THRESHOLD=8、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降。
  - 零新正则族；路径匹配复用 matchModuleForFile 语义（直调 src/blast-surface.js，不造第二套实现）。
  - 多 agent 铁律：Edit 前重读最新态、锚点漂移核对；不触 src/stage-contract.js（api-matrix 活跃区，本 task 无该文件权限）。
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
