---
id: task-04
title: '收口双跑两出口（verify-postcheck.js + run/complete-handlers.js）——实际 diff（resolveReconcileActualFiles 单点）重跑 blast+span，声明档<事实档→verify errors 硬 flag+archive 阻断警告+摩擦账+事实面预价种子落 .runtime（次单开跑价并入）'
title_zh: '收口双跑两出口（verify-postcheck.js + run/complete-handlers.js）——实际 diff（resolveReconcileActualFiles 单点）重跑 blast+span，声明档<事实档→verify errors 硬 flag+archive 阻断警告+摩擦账+事实面预价种子落 .runtime（次单开跑价并入）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1, D-004@v1]
allowed_paths:
  - src/verify-postcheck.js
  - src/run/complete-handlers.js
target_files:
  - src/verify-postcheck.js
  - src/run/complete-handlers.js
expects_from:
  - task-01: 'reconcileDualRun({declaredTier, factRiskDetection, factFiles, factModuleIndex}) → {factTier, mismatch, severity}——声明档<事实档 → mismatch/error；显式降档（explicitDowngradeAccepted）被事实面支持则放行'
goal: >
  收口双跑两出口（预价信声明、结算信事实）：verify --done 与 archive confirm 两出口用实际
  diff 重跑 blast+span 得事实档，与 .runtime/ceremony-tier-<change>.json 声明档对账，懒
  agent 的低报在收口被硬 flag + 记摩擦账 + 落事实面预价种子供该会话次单开跑价强制并入
  （FR-03 / D-003；显式降档收口复核 D-004）。
implementation:
  - 双跑第一出口挂 verify-postcheck.js 的 --done 校验链：新增独立检查 runCeremonyDualRunCheck（单结果对象 + 配套 print 导出，照本文件 runVerifyTestCheck / reconcileTargetFiles 检查族先例——本文件即 gates.js verify 块每次 --done 调用的检查族宿主）；实际 diff 一律取 resolveReconcileActualFiles（verify-postcheck.js:2549 单点，勿另造第二取数口径——三源并集 / 并行会话剔除 / git 降级语义全复用）；声明档读 .runtime/ceremony-tier-<change>.json（task-03 产物，tier/components/reasons/transitions）；mismatch → verify errors 硬 flag（阻断回滚语义非 advisory，阻断形态照 strictViolation / ②类先例）——接线不越 allowed_paths，gates.js 属 task-03 并行面，如需 gates 侧一行调用增量由 task-03 面认领，本卡不碰
  - 事实面重跑：resolveReconcileActualFiles 的 files 喂 detectChangeRisk 重跑 blast、配 _module-map 索引重跑 span，组装 reconcileDualRun 入参（factRiskDetection / factFiles / factModuleIndex，契约见 expects_from）；档位文件缺失 / quick 无 changeName / git 降级 → skipped 降级不误红（存量零红门禁 + fail-soft 先例）
  - 双跑第二出口挂 complete-handlers.js 的 archive confirm（handleArchiveConfirmStep，:783，目录移动前）：复用同款检查函数对账；mismatch → 阻断级警告（⛔ console.error 列声明档 / 事实档 / 超阈分量 + 修复指引）+ 记账 + 落种子，但只警告不回滚归档步骤（archive=终态铁律，见 constraints）
  - 摩擦账：mismatch 落 friction-ledger 记账 API mergeFrictionEntry(runtimeRoot, { change, counts })（withFileLock + 原子写，friction-ledger.js:163；只写 ledger，禁读 / 禁写 friction-tally——consumeFrictionHint 消费即删语义是全局硬约束 1）
  - 事实面预价种子：两出口任一 mismatch 均写 .runtime/ceremony-fact-seed-<session>.json（session 取 resolveSessionIdentity 同一口径，complete-handlers.js:604 先例；字段含 declaredTier / factTier / mismatch + 事实面输入 factFiles 等供次单预价直用）；同 session 幂等覆盖不叠加（design 生命周期表「收口结算」行——变更终态定格不回改）
  - 显式降档复核（D-004）：档位文件 explicitDowngradeAccepted 标记的变更，事实面支持 → 放行留痕；不支持 → 按低报同款 flag
acceptance:
  - 注入场景「声明档 S1 / 实际 diff 命中高一档（事实档 S2+）」：verify --done 出口 mismatch 被硬 flag（errors 级阻断语义，非 advisory）
  - 同场景 archive confirm 出口：阻断级警告可见 + friction-ledger 对应 change 条目落账 + .runtime/ceremony-fact-seed-<session>.json 落盘且含 declaredTier/factTier/mismatch
  - 声明档 ≥ 事实档（含显式降档被事实面支持）→ 双跑放行零噪音（skipped/ok 不误红）
  - 实际 diff 全部取自 resolveReconcileActualFiles 单点（:2549），仓内无第二取数口径
  - 档位文件缺失 / quick 无 changeName / git 不可用 → skipped 降级不阻断（存量变更零回归）
verify:
  - npm test（本卡不新增测试文件——双跑错配注入断言由 task-07 test/ceremony-tier.test.mjs 收口；本卡跑全量确认既有测试零回归）
  - npm run lint
constraints:
  - 不改 archive=终态语义：mismatch 在 archive 出口只警告 + 记账 + 落种子，不回滚归档步骤、不 reopen 已归档变更（D-006 防复潮）
  - 实际 diff 只走 resolveReconcileActualFiles（:2549）单点；friction 只记 ledger，禁读 / 禁写 friction-tally（全局硬约束 1）
  - 不动 L1 机械门（探针 / 矩阵 / docs-check / 代码证据）与 verify 既有证据门的存在性（全局硬约束 5）
  - 不改 reconcileTargetFiles 既有五状态语义——ceremony 双跑走独立结果对象，不并入 ②③ 类差集（既有消费方 schema 已被锁定）
  - 种子 / 档位文件 / 记账全部 fail-soft：异常降级留痕，不阻断主流程
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
