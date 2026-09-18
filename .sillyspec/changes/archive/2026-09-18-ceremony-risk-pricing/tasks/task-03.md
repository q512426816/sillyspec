---
id: task-03
title: '阶段门升档接线（run/gates.js + .runtime/ceremony-tier-<change>.json）——四阶段完成门读 friction-ledger 累计账（不读 tally 避消费即删次序依赖），超阈 escalateByFriction，迁移记录 withFileLock+原子写'
title_zh: '阶段门升档接线（run/gates.js + .runtime/ceremony-tier-<change>.json）——四阶段完成门读 friction-ledger 累计账（不读 tally 避消费即删次序依赖），超阈 escalateByFriction，迁移记录 withFileLock+原子写'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-04]
decision_ids: [D-008@v1]
allowed_paths:
  - src/run/gates.js
target_files:
  - src/run/gates.js
expects_from:
  task-01: 'escalateByFriction(currentTier, frictionCounts, thresholds) → { tier, escalated }（min(S3,+1) 只升不降；frictionCounts 可为 friction-ledger 三键超集透传）'
goal: >
  四阶段完成门接入 friction 升档检查点（D-008）——读 friction-ledger 按 change 过滤的
  累计账（禁读 tally），escalateByFriction 超阈升档，迁移记录写
  .runtime/ceremony-tier-<change>.json（只升不降、封顶 S3、withFileLock＋原子写），
  并补齐「开跑定价」事件的无主认领。
implementation:
  - gates.js 四完成门（brainstorm/plan/execute/verify 完成链，Stage Review Gate 所在 ：1011-1094 结构）追加升档检查点——import readFrictionLedger（friction-ledger.js:58）读累计账，按 changeName 过滤聚合 gate_rollback/review_rejected 两键计数；禁读 friction-tally（consumeFrictionHint 读后删＋verify 收尾清零的次序依赖禁入，plan 全局硬约束 1）
  - escalateByFriction(currentTier, frictionCounts, thresholds)（task-01 契约）计算目标档；当前档读 .runtime/ceremony-tier-<change>.json——读档无文件则先落初始档（开跑定价事件，design 生命周期契约表首行「无 → 初始档」，tier/components/reasons 字段）
  - 档位迁移写回 .runtime/ceremony-tier-<change>.json——withFileLock＋writeAtomicSync 读改写整段持锁（仓内先例 run/complete.js:1221 .tasks.md.lock、friction-ledger.js:134 mergeFrictionEntrySync、local-register.js:52 .local.yaml.lock）；文件结构 tier/components/reasons/transitions[]（from/to/frictionCounts 追加迁移记录），多会话并发下「只升不降」不变量成立
  - 升档发生时完成门留痕（from→to 与摩擦计数审计行，对齐 friction 埋点既有输出风格）；未超阈静默通过不加噪
  - 连带测试预告定向回归——stage-completion-atomicity / noai-completion-gate / run-complete-step-validator-rollback / doctor-verify-feedback / concurrent-preflight-hooks / taskcard-ensure-skeletons 六组（完成门行为面可能受动，跑前先核对受动面再定向执行）
acceptance:
  - 四完成门均执行升档检查——ledger 按 change 过滤累计的 gate_rollback/review_rejected 超阈时档位 min(S3, tier+1) 只升不降；friction-tally 零读取（次序依赖禁入）
  - 读档无文件先落初始档（开跑定价事件）——.runtime/ceremony-tier-<change>.json 首次出现即含 tier/components/reasons，后续迁移追加 transitions[] 记录（from/to/frictionCounts）
  - 档位文件并发写安全——withFileLock＋writeAtomicSync，交错写不回退档位（只升不降不变量在多会话并发下成立）
  - 六组连带测试（stage-completion-atomicity / noai-completion-gate / run-complete-step-validator-rollback / doctor-verify-feedback / concurrent-preflight-hooks / taskcard-ensure-skeletons）定向回归绿
  - 升档时完成门输出含 from→to 与摩擦计数审计行；未超阈不产生输出噪声
verify:
  - node --test test/stage-completion-atomicity.test.mjs test/noai-completion-gate.test.mjs test/run-complete-step-validator-rollback.test.mjs（完成门直连面定向）
  - node --test test/doctor-verify-feedback.test.mjs test/concurrent-preflight-hooks.test.mjs test/taskcard-ensure-skeletons.test.mjs（连带面定向）
  - npm run lint —— 即 node test/check-syntax.mjs
constraints:
  - 只动 allowed_paths 内文件（src/run/gates.js）——.runtime 档位文件是运行时派生数据不进 git；连带回归只跑既有用例，本 task 不新增测试文件
  - Windows/Linux 双平台——runtime 路径用 node:path join（.runtime/ceremony-tier-<change>.json 跨平台拼接）、文件 LF 行尾、锁与原子写复用仓内既有工具不加平台分支
  - 不动 L1 机械门（探针/api-matrix/docs-check/代码证据）——只加升档检查点，不改任何门的存在性与判定逻辑
  - 禁读 friction-tally（消费即删次序依赖）；摩擦账一律 friction-ledger 口径
  - 不动 Stage Review Gate 既有分级逻辑（review-tier 委托属 task-02），本 task 仅在其所在完成链加档位迁移检查
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
