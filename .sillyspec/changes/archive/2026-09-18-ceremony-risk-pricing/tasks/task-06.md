---
id: task-06
title: '影子期与 doctor（stage-reviews-shadow/ 独立命名空间 + doctor-diagnostics 新维度 catch 差异报告 + local.yaml 转正开关）——影子派发只记账不阻断，getLatestStageReviewRunId 不扫描影子空间'
title_zh: '影子期与 doctor（stage-reviews-shadow/ 独立命名空间 + doctor-diagnostics 新维度 catch 差异报告 + local.yaml 转正开关）——影子派发只记账不阻断，getLatestStageReviewRunId 不扫描影子空间'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-03', 'task-05']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-007@v1]
allowed_paths:
  - src/doctor-diagnostics.js
  - src/review-dispatch.js
target_files:
  - src/doctor-diagnostics.js
  - src/review-dispatch.js
expects_from:
  task-03: '.runtime/ceremony-tier-<change>.json 档位与迁移记录结构（tier/components/reasons/transitions[]）'
  task-05: '档位化 prompt 渲染与 ceremony.shadow 配置键'
goal: >
  落地 S0/S1 轻档影子期（design 总体方案 Phase 3 / D-007 / R-04 / R-06）：明面轻仪走主线，后台对轻档变更静默派发重仪式只记账不阻断（目录 + marker 双通道隔离），doctor 新增「影子对照」维度输出轻/重 catch 差异报告与可检查的转正判据，为轻仪转正攒数据证据。
implementation:
  - 影子派发入口（src/review-dispatch.js）：复用 runReviewDispatch 三链编排与 agent-tool 通道，新增影子模式；派发前置校验两项硬条件——读 .runtime/ceremony-tier-<change>.json 当前档（task-03 契约）∈ {S0, S1}，且 local.yaml ceremony.shadow=on（task-05 契约）；不满足则跳过派发并留 skip 留痕，不报错不阻断主线。
  - 影子产物落盘（目录隔离通道）：影子 review 一律写 stage-reviews-shadow/<change>-<stage>-<ts>/review.json（独立命名空间，与主线 stage-reviews/<stage>-review-* 物理分离），reviewer 元数据带 shadow 标记；对照账（轻/重各自 catch 了什么）随 .runtime 落盘，archive 时随 runtime 生命周期回收；只记账不阻断——影子 verdict 任何取值不回流任何 gate 判定。
  - marker 写入通道隔离（plan Wave 4 补遗③ / R-06）：getLatestStageReviewRunId 优先读 current-stage-review-run-id-* marker 而非目录扫描（stage-review.js:377-390），故影子派发绝不写主线 marker（stageReviewMarkerPath 不被影子链路触碰），影子 runId 独立生成不复用主线 marker ID——隔离面双通道（目录隔离 + marker 写入隔离）缺一不可，防「目录隔离了但 marker 被影子覆写」的主线污染。
  - doctor 新维度（src/doctor-diagnostics.js）：detectShadowComparison「影子对照」——结构对齐既有 dimension 契约 {name, label, pass, severity, findings, safe_actions}，读主线轻仪结论与影子重仪式结论，输出两侧 catch 差异报告（轻仪漏检项清单 / 影子多 catch 项 / 各自 verdict 对照）；无影子数据时 pass + 跳过注记不误报（对齐 detectLifecycleDocStaleness 降级语义）。
  - 转正判据可检查化：判据写成计数逻辑而非文案——从对照账统计轻档变更样本数 N 与轻仪漏检项，N ≥ 10 且（漏检 = 0 ∨ 漏检项均为 advisory 级）→ doctor 报告「影子期达标可转正」，否则报告缺口（还差几个样本 / 哪些非 advisory 漏检）；转正动作本身是人工置 local.yaml ceremony.shadow: off，CLI 只出判据不出手。
  - 影子期 token 面注记（R-04）：doctor 报告明示影子期 token 不降反升属花钱买标定，附 local.yaml 开关位置与转正判据公示，防困惑。
acceptance:
  - 注入影子 verdict=fail 产物到 stage-reviews-shadow/ 后，主线 gate 经 getLatestStageReviewRunId 取评审产物不命中影子命名空间（不返回影子 runId、不读影子 review.json）——主线不受影子 verdict 阻断（FR-04 场景「影子产物不污染主线」/ R-06）。
  - 档位 S2 及以上、或 ceremony.shadow=off 时影子派发不发生（skip 留痕可查），S0/S1 且 shadow=on 时派发且产物落 stage-reviews-shadow/<change>-<stage>-<ts>/review.json。
  - sillyspec doctor 输出含「影子对照」维度：有影子数据时输出轻/重 catch 差异报告；无影子数据时跳过不误报。
  - 转正判据计数逻辑可检查：构造 N=10 且漏检=0（或漏检均 advisory 级）的对照账 → 达标结论；漏检含非 advisory 项或样本不足 → 不达标并报告缺口。
verify:
  - npm test
  - npm run lint
constraints:
  - 只动 allowed_paths 两文件（src/doctor-diagnostics.js、src/review-dispatch.js）；不修改 src/stage-review.js——marker 通道隔离靠「影子不写主线 marker」实现，不改主线 marker 读取逻辑。
  - 影子链路只记账不阻断：影子 verdict / 影子结论不进入任何主线 gate、verify、archive 判定面。
  - 不动 L1 机械门与既有 doctor 维度的存在性——「影子对照」纯增量挂载进 runDoctorDiagnostics 的 dimensions 数组，不重构既有维度。
  - 行为钉子测试归 task-07（本 task 不新增测试文件，allowed_paths 不含 test/）；R-06 场景的回归断言在 task-07 的影子命名空间隔离组落钉。
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
