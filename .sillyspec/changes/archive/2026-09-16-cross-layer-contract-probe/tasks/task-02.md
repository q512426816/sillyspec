---
id: task-02
title: 'Consistency check wiring: checkProbeConsistency includes probe8 dimension (WARNING severity, environment-sensitive group)'
title_zh: '一致性抽查接线——verify-postcheck.js checkProbeConsistency 纳入 probe8 维度（WARNING 级，环境敏感组）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 12:40:58
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-postcheck.js
target_files: [src/verify-postcheck.js]
goal: >
  补 ed540c6 未接线缺口——探针一致性抽查 checkProbeConsistency 纳入 probe8 维度
  （WARNING 级环境敏感组，对齐 probe3/probe5 处置），使探针8 预填段与重跑机械结果可对账。
implementation:
  - 扩展 parseProbePrefillAnchors（src/verify-postcheck.js:2820-2841）doc 侧取数：extractProbeSubsections（:2790-2805）通用「#### 探针 (\d+)」定界已天然切出探针 8 子节（定界零改动），新增 probe8 锚行正则并导出（对齐 :2760-2780 PROBE1/3/5/6_RE 锚点正则惯例），返回值增 subsections.probe8 在场性与 contractOrphans/missingRequired 行计数。
  - checkProbeConsistency（:2926）重跑对账段纳入 probe8：在 probe3/5 WARNING 组（:3007-3023）后追加——正文锚点计数 vs 重跑 current.probe8 计数不符 → mismatches 增 probe8 条目（severity=warning），文案对齐 probe3/probe5「环境敏感 WARNING 不阻断」处置（probe8 结果依赖 design 清单与文件读取，HEAD 前进会漂移，R-04）。
  - facts 基线对比段（:3029-3072）同步纳入：factsSnapshot.probes.probe8.metrics 新计数 vs 重跑不符 → warning 级（与 :3046-3056 probe3/5 同级同文案风格），factsConsistency.checked 含 probe8。
  - gates.js 零改动：status=mismatch 且 severity=warning → envelope probe_consistency_drift 放行告警（:2890-2893 接线约定既有面，信封路由通用）。
acceptance:
  - FR-06 对账维度在场：verify-result.md 含「#### 探针 8」子节时，probe8 维度参与正文预填段与重跑机械结果对账——contractOrphans/missingRequired 计数不符 → mismatches 含 probe8 条目且 severity=warning（不阻断，envelope probe_consistency_drift 放行）。
  - 一致零输出：probe8 计数吻合 → 无 probe8 mismatch，factsConsistency.checked 列表含 probe8。
  - 既有分级零变动：probe1/6=ERROR、probe3/5=WARNING 分级与既有对账语义原样（只增不改），npm test 全量零失败。
verify:
  - npm test（全量零失败——含 verify-postcheck 既有 round-trip/一致性抽查测试）
  - grep -n "probe8" src/verify-postcheck.js 确认 probe8 出现在锚点解析与 WARNING 对账维度（非仅注释）
constraints:
  - gates.js 不动（信封路由通用——mismatch+warning → probe_consistency_drift 放行已覆盖，无需新增路由）。
  - 既有 probe1/6 ERROR、probe3/5 WARNING 对账语义零变动（纯增量接线，不改既有 mismatch 文案与计数口径）。
  - 不改 src/verify-probes.js（task-01 面）与任何测试文件（本卡纯接线，无新增测试）。
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
