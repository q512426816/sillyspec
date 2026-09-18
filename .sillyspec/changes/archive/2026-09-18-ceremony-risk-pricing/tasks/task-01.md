---
id: task-01
title: '新建 src/ceremony-tier.js——CEREMONY_TIERS/RISK_TO_TIER 映射、computeCeremonyTier 三轴取封顶（blast/span/friction，reasons 留痕）、escalateByFriction（min(S3,+1) 只升不降）、reconcileDualRun（声明档 vs 事实档错配判定）；显式声明升档尊重/降档须理由入参'
title_zh: '新建 src/ceremony-tier.js——CEREMONY_TIERS/RISK_TO_TIER 映射、computeCeremonyTier 三轴取封顶（blast/span/friction，reasons 留痕）、escalateByFriction（min(S3,+1) 只升不降）、reconcileDualRun（声明档 vs 事实档错配判定）；显式声明升档尊重/降档须理由入参'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-008@v1]
allowed_paths:
  - src/ceremony-tier.js
target_files:
  - NEW:src/ceremony-tier.js
provides:
  task-01: 'computeCeremonyTier/escalateByFriction/reconcileDualRun 三纯函数 + CEREMONY_TIERS/RISK_TO_TIER 常量（签名与返回结构见 design.md 接口定义节；frictionCounts 容忍 friction-ledger 三键超集透传——含 verify_run_failed 第三键，引擎只消费 gate_rollback/review_rejected 两键不拒收）'
goal: >
  落地三轴客观定价引擎 src/ceremony-tier.js——ceremony_tier = max(blast, span, friction)
  客观计算、一切 agent 自报只升不可降、封顶 S3，为 review-tier 委托 / 阶段门升档 /
  双跑收口三消费面提供单点定价真相源（FR-01；D-001 引擎骨架、D-008 friction 升档规则）。
implementation:
  - 新建 src/ceremony-tier.js，顶部集中全部阈值常量（span 声明文件数阈值 8、模块跨度阈值 3、friction 升档阈值），常量集中可调——R-02 执行时先跑 friction-ledger 历史变更回放标定再定值
  - 导出 CEREMONY_TIERS=['S0','S1','S2','S3']（只升不降的档位序）与 RISK_TO_TIER 五档映射——doc-only→S0 / unit-sufficient→S1 / contract-required→S2 / integration-critical→S3 / deployment-critical→S3
  - computeCeremonyTier({ riskDetection, explicitRiskLevel, declaredFiles, moduleIndex, frictionCounts }) 三轴取封顶——blast＝riskDetection.level 经 RISK_TO_TIER 映射＋显式声明规则；span＝声明文件数≥8 ∨ 模块跨度≥3 ∨ 命中 QUICK_RISK_PATH_PATTERNS → 至少 S2；friction＝ledger 累计 gate_rollback/review_rejected 超阈 → min(S3, tier+1)；返回 { tier, components, reasons, explicitDowngradeAccepted }（结构见 design.md 接口定义）
  - 显式声明规则（D-004 通道）——explicitRiskLevel 升档永远尊重并留痕；降档须理由且 explicitDowngradeAccepted=true 待收口双跑复核；任何自报不产生降档
  - reasons 逐分量留痕——每轴命中项各成一条（含阈值与实际值），供消费方审计打印与双跑比对
  - escalateByFriction(currentTier, frictionCounts, thresholds) → { tier, escalated }——超阈升一档 min(S3, +1)，只升不降（friction 分量永不降档）
  - reconcileDualRun({ declaredTier, factRiskDetection, factFiles, factModuleIndex }) → { factTier, mismatch, severity }——事实面仅重跑 blast+span 两轴；声明档<事实档 → mismatch=true、severity=error，声明≥事实 → severity=none
  - frictionCounts 容忍三键超集——friction-ledger.js:39 FRICTION_TYPES 含 verify_run_failed，入参携第三键不抛错不拒收、不参与升档计算
  - 无 riskDetection 输入时 blast 缺省 S2（兼容策略——保守中档≈现状 independent×1，不静默降级）
  - span 轴复用 QUICK_RISK_PATH_PATTERNS（import 自 change-risk-profile.js 纯常量导出，先例 quick-gate-profile.js:28）；moduleIndex 沿用 computeGateProfile 的输入形态（quick-gate-profile.js:147）
acceptance:
  - 三轴取封顶矩阵断言成立——任一分量达到更高档时 tier=max(blast, span, friction)，各轴档位组合下 tier 不低于任何单轴（矩阵级直测用例由 task-07 落 NEW:test/ceremony-tier.test.mjs 收口）
  - RISK_TO_TIER 映射表逐档断言——五输入档全覆盖映射到四输出档、无遗漏无越序
  - escalateByFriction 只升不降+封顶 S3——S3 输入再超阈仍返回 S3 且 escalated 语义正确；未超阈时 tier 原样返回不降档
  - reconcileDualRun 错配判定——声明 S1 事实 S2 → mismatch=true、severity=error；声明≥事实 → severity=none
  - computeCeremonyTier 返回四字段齐全（tier/components/reasons/explicitDowngradeAccepted）；显式升档被尊重、显式降档须理由且 explicitDowngradeAccepted=true、无理由的自报降档不生效（一切自报只升不降）
  - frictionCounts 携带 verify_run_failed 第三键时调用不抛错、输出与两键输入一致（超集透传容忍）
  - 无 riskDetection 输入 → blast 分量 S2、tier≥S2（brownfield 兼容不静默降级）
verify:
  - node --check src/ceremony-tier.js（语法校验）
  - 'node -e "import(\"./src/ceremony-tier.js\").then(m => { for (const k of [\"CEREMONY_TIERS\",\"RISK_TO_TIER\",\"computeCeremonyTier\",\"escalateByFriction\",\"reconcileDualRun\"]) if (!m[k]) process.exit(1); console.log(\"exports ok\") })"（导入冒烟——五导出齐全、零 IO）'
  - npm run lint —— 即 node test/check-syntax.mjs
  - node --test 定向说明——新模块零消费方、无既有测试受动；矩阵级引擎直测（三轴封顶/映射表/只升不降+封顶/双跑错配/显式升降）由 task-07 落盘后 node --test test/ceremony-tier.test.mjs 定向执行
constraints:
  - 零依赖纯函数——不 import 仓内任何 IO 模块（fs/锁/网络/日志全禁），仅允许纯常量/纯函数 import（QUICK_RISK_PATH_PATTERNS 取自 change-risk-profile.js）
  - 只动 allowed_paths 内文件——仅新建 src/ceremony-tier.js 一个文件，不预改任何消费方（review-tier/gates/prompt 接线分别属 task-02/03/05）
  - Windows/Linux 双平台——LF 行尾、纯函数不涉路径拼接与平台分支
  - 不动 L1 机械门（探针/api-matrix/docs-check/代码证据）——引擎只产档位，不改任何门的存在性
  - friction 输入只认 friction-ledger 累计账口径（gate_rollback/review_rejected 两键），禁引入 friction-tally 读取（consumeFrictionHint 消费即删的次序依赖禁入）
  - 本 task 不落测试文件（引擎直测归 task-07，allowed_paths 不含 test/）
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
