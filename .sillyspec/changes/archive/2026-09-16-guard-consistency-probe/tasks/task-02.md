---
id: task-02
title: 'Probe9 consistency spot-check wiring in verify-postcheck.js (WARNING level)'
title_zh: '一致性抽查接线——verify-postcheck.js checkProbeConsistency 纳入 probe9 维度（WARNING 级）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 20:16:18
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-postcheck.js
target_files:
  - src/verify-postcheck.js
expects_from:
  - task-01: runProbe9GuardConsistency 返回契约（inconsistentGroups/notes 键）与 renderProbe9Lines 汇总行渲染形态（锚点正则与之逐条同源）
goal: >
  verify-result.md 探针9 预填段纳入 checkProbeConsistency 一致性抽查（WARNING 级，probe8 接线
  先例同构）——汇总行锚点正则 N 求和对账 + facts 基线计数对账，堵住探针9 正文段被篡改/底稿
  过期的抽查盲区。
implementation:
  - 锚点正则——verify-postcheck.js probe8 汇总行正则之后（PROBE8_CONTRACT_ORPHANS_LINE_RE :2814-2817 / PROBE8_MISSING_REQUIRED_LINE_RE :2819-2821 紧随）新增导出 PROBE9_INCONSISTENT_LINE_RE——锚探针9 渲染段守卫不一致汇总行内 N（汇总行 N 求和口径，行首 ^ 紧锚 + 计数段与段内其它 ⚠️ 行区分，写法对齐 probe8 锚点 :2786-2817 先例）
  - 解析接线——parseProbePrefillAnchors（:2863-2894）纳入 probe9：sections['9'] 子节取数（extractProbeSubsections :2831-2846 泛探针号天然支持）、subsections.probe9 布尔（:2878-2885 追加）、sumGroupCount（:2868-2871 同款）求和输出 probe9InconsistentGroups 键（无行=0，重复撞形行累加口径同 probe8 :2866-2867）
  - 对账组——checkProbeConsistency（:2982）probe8 WARNING 组（:3081-3094）后同构追加 probe9 维度：重跑 current.probe9.inconsistentGroups 长度 vs anchors.probe9InconsistentGroups 不符 → severity=warning mismatch（守卫面解析随 design 清单/文件读取环境敏感不阻断）；fail-soft——重跑降级（runVerifyProbes catch 兜底对象无 probe9 键）时 curP9=null 跳过对比不误报（curP8 同款口径 :3085-3086）
  - facts 基线段——probe8 metrics 对账（:3128-3142）后同构追加 probe9：snap9Metrics.inconsistentGroups vs 重跑值不符 → WARNING（旧 facts 无 probe9 键不对账不列 checked，不误报）；checked 列表（:3143-3149）按 p9 双侧可用性追加 probe9
  - 返回类型注释——checkProbeConsistency JSDoc 的 subsections 字段（:2965）补 probe9 键说明（诊断 additive，不改运行时行为）
acceptance:
  - probe9 汇总行锚点 round-trip——探针9 真渲染产物 → parseProbePrefillAnchors，probe9InconsistentGroups=机械计数；缩进/段外同形行不命中（行首紧锚）
  - 不符时产出 WARNING 级 mismatch（不阻断回滚，走既有 mismatch+warning 放行告警路径）；重跑降级无 probe9 键时跳过该维度零误报
  - facts 基线 probe9 快照 vs 重跑不符 → WARNING；旧 facts（无 probe9 metrics）零崩溃零误报
  - 既有 probe1/6=ERROR、probe3/5/8=WARNING 分级与信封 code 零变动；subsections 判别子（any）行为零变动
verify:
  - npm test
  - npm run lint
constraints:
  - gates.js 不动——WARNING 走既有 mismatch+warning 放行告警路径（envelope 复用，不新增 code）
  - 既有探针对账分级零变动——只追加 probe9 维度，不改 probe1/3/5/6/8 判定与文案
  - fail-soft——重跑降级/旧 facts 无 probe9 键时跳过对比不误报（宁可少对账不可误红）
  - 锚点正则与渲染形态逐条同源——renderProbe9Lines 行文变更须同步正则（:2787-2790 同源注释约定沿用）
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
