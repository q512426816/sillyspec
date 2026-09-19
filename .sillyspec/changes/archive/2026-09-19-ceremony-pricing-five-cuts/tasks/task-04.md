---
id: task-04
title: 'Contract sync and full-suite gate: teaching rewrite, module doc claim, self-referential S2 acceptance (config-schema owned by task-01)'
title_zh: '契约同步与全量——stages/verify.js 教学段重写 + 模块文档认领 + 自指走位验收（本变更档位 S2 对账）+ npm test 全量 + lint（config-schema 已归 task-01）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 08:26:56
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-001@v2, D-003@v1, D-004@v1, D-005@v1, D-010@v1, D-011@v1]
allowed_paths:
  - src/stages/verify.js
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - test/pass-eligibility.test.mjs
target_files:
  - src/stages/verify.js
  - .sillyspec/docs/sillyspec/modules/core-engine.md
expects_from:
  task-03:
    - contract: consumer-wiring-complete
      needs: [resolveChangeRisk-at-eight-consumer-points, applyDeclarationCatchUp, reconcileDualRun-warn]
goal: >
  契约同步收口与全量回归（config-schema 已归 task-01 原子交付）——  src/stages/verify.js :194-196 判级教学段按声明面新语义重写（否定抑制教学退役、explicit 不豁免
  evidence）、core-engine 模块文档认领行为契约变更；本变更自指走位验收（声明追赶后档位 S2、verify
  双跑事实面=声明档零 mismatch）；npm test 全量 + lint 收口。
implementation:
  - '步骤二（判级教学段重写，design Wave E.1 Grill P1-2）：src/stages/verify.js:194-196——:194 判级源从「CLI 用 detectChangeRisk 扫描 design.md/plan.md 全文自动判定等级」改「CLI 按项目声明危险面（_module-map.yaml 顶层 blast 段路径前缀）× 变更文件判级」；:195 否定抑制教学行（机械字面匹配+同句否定抑制）整体退役删除；:196 risk_level 教学从「豁免级不再被强制拦」改「压仪式档、不豁免 evidence 要求——出路=改 map 声明（git 可见）或提供真实集成证据」；:197 留痕要求段随新语义同步（显式声明=压档声明而非豁免声明）。'
  - '步骤三（模块文档认领）：.sillyspec/docs/sillyspec/modules/core-engine.md 增判级/定价行为契约变更条目——blast 轴输入源换声明面（detectChangeRisk 退役、resolveChangeRisk/resolveBlastSurfaces 上位）、完成门追赶重定价三分支（无摩擦可降/摩擦地板不退）、双跑高报 warn 只记账、span 标题双形态。'
  - '步骤四（自指走位验收，plan 全局验收 7）：本变更自身在新架构下走位——blast=门禁判定文件命中 S2（src/stage-contract.js、src/verify-postcheck.js、src/ceremony-tier.js 等自举声明）、span=文件清单 ≥8 → S2、声明追赶后档位 S2；verify --done 双跑事实面（actual.files × 声明面）= 声明档 S2 零 mismatch；不再有内容扫描类验收（随 task-03 删除消失）。'
  - '步骤五（全量回归收口）：npm test 全量与 npm run lint 两条命令各自执行，然后 grep -rn "detectChangeRisk(" src/ test/ 终检清零（含 src/stages/verify.js:194 教学段改写后残留）。'
acceptance:
  - src/stages/verify.js:194-196 教学段零旧口径——无「detectChangeRisk 扫描」「否定抑制」「豁免级不再被强制拦」字样；新语义含「项目声明危险面」「risk_level 压仪式档、不豁免 evidence 要求，出路=改 map 声明」。
  - .sillyspec/docs/sillyspec/modules/core-engine.md 认领条目在场（判级/定价行为契约变更四点：声明面输入源/追赶重定价三分支/高报 warn/span 双形态）。
  - 自指走位：本变更声明追赶后档位 S2；verify 双跑事实面（actual.files × 声明面）= 声明档 S2 零 mismatch、零 violation。
  - npm test 全量通过；npm run lint 通过。
  - 'grep -rn "detectChangeRisk(" src/ test/ 输出为空。'
verify:
  - npm test
  - npm run lint
  - 'grep -rn "detectChangeRisk(" src/ test/ 无输出'
constraints:
  - 教学段新语义边界（design Wave E.1 Grill P1-2）：否定抑制教学退役；explicit risk_level 教学必须写「只压仪式档、不豁免 evidence 要求」，出路=改 map 声明或提供真实集成证据——不得复述「豁免级不再被强制拦」旧语义（plan 全局硬约束 3 的文档面）。
  - 自指走位验收（plan 全局验收 7）：本变更自身声明追赶后档位 S2、双跑事实面（文件名×声明面）= S2 零 mismatch；无内容扫描类验收。
  - 全量门（plan 全局验收 8）：npm test 与 npm run lint 全绿才可 --done，另跑 grep detectChangeRisk( 终检清零（验收 3 收口）。
  - 只动 allowed_paths 三文件；src/stage-contract-spec.js:55/:229 注释收敛归 task-02 不越界认领；QUICK_RISK_PATH_PATTERNS 不动不迁（D-011 登记留痕，硬约束 12）。
  - 价目表零改动、证据门判据零改动（硬约束 1/2）在文档面同样守恒——教学/注记不得引入新档位语义或新豁免通道。
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
