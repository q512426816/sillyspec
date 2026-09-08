---
id: task-01
title: 'facts v2 schema 单点模块 + 构建与分段合并写入'
title_zh: 'facts v2 schema 单点模块 + 构建与分段合并写入'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v2, D-005@v2]
allowed_paths:
  - NEW:src/verify-facts-schema.js
  - src/verify-probes.js
  - src/index.js
  - NEW:test/verify-facts-v2.test.mjs
  - test/verify-probes-facts.test.mjs
target_files:
  - NEW:src/verify-facts-schema.js
  - src/verify-probes.js
  - src/index.js
  - NEW:test/verify-facts-v2.test.mjs
  - test/verify-probes-facts.test.mjs
provides:
  interface: verify-facts v2 单点导出（src/verify-facts-schema.js）
  fields:
    - FACTS_SCHEMA_VERSION / EVIDENCE_STATUS / EXEMPTION_RE（枚举与豁免形态单源，task-02 消费）
    - classifyVerifiedFile(path) → 'code' | 'artifact'（task-02 消费）
    - parseEvidenceSlots(mdText) → { requiredEvidence[], runtimeEvidence[] }（task-04 消费）
    - validateFactsV2(facts)（结构校验）
    - buildVerifyFacts v2 返回五段形状（conclusion/tests/requiredEvidence/runtimeEvidence/factsConsistency，缺省段不落键，task-05 消费 probes 形状）
goal: >
  facts v2 数据层地基：schema 单点新模块 + 构建扩展 + 分段合并写入 + --init 槽段渲染与补齐，
  供 W2/W3 全部任务消费（FR-01）。
implementation:
  - 新建 src/verify-facts-schema.js：FACTS_SCHEMA_VERSION=2、EVIDENCE_STATUS、EXEMPTION_RE（（豁免：<理由>）后缀）、classifyVerifiedFile（.runtime/日志/文档类→artifact，其余→code）、parseEvidenceSlots（行首锚定解析「证据账」task 行与「集成验证回执」四字段行；占位 <待填：*> 不匹配 fail-closed）、validateFactsV2
  - verify-probes.js：buildVerifyFacts 返回值扩展五段（null 段不落键，v1 probes 形状原样）；writeVerifyFacts 改分段合并（已存在 v2 时保留 conclusion/tests/requiredEvidence/runtimeEvidence/factsConsistency 固化段，刷新 probes/generatedAt）；generateVerifyResultSkeleton 增「## 证据账（cannot_verify 任务）」「## 集成验证回执」两槽段（占位 <待填：三选一>/<待填：0 或非 0> 不含枚举词）；新增 backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult })（结论枚举槽+证据槽回填固化；testCheckResult 缺省时 tests 段跳过留给二次回填）；新增 md 槽段缺失补齐函数（仅追加缺失槽段骨架，幂等二跑零改动）
  - index.js verify-probes --init 分支（:924-946 一带）：md 存在时调槽段补齐；facts 写入走分段合并
  - 新建 test/verify-facts-v2.test.mjs：schema 常量/classifyVerifiedFile 分类边界/parseEvidenceSlots 命中与占位 fail-closed/骨架含两槽段且占位无枚举词/分段合并保留固化段/段落补齐幂等
  - 修正 test/verify-probes-facts.test.mjs：schemaVersion 1→2 断言、骨架章节数、--init 输出契约（既有断言必红认领）
acceptance:
  - --init 落 schemaVersion:2 且五段结构齐全（空段占位）；probes 段与 v1 形状逐字段一致
  - 回填后再 --init：conclusion/tests/evidence 固化段保留、probes 刷新（分段合并不抹数据）
  - 已存在 md 缺槽段时 --init 仅追加骨架不触碰既有正文，二跑零改动
  - 骨架两槽段占位符不含 satisfied/missing/partial/0/非0 枚举词（fail-closed）
  - 上述分支全部有单测且通过
verify:
  - node --test test/verify-facts-v2.test.mjs
  - node --test test/verify-probes-facts.test.mjs
constraints:
  - 不动 buildVerifyFacts v1 调用方签名（返回值加段向后兼容）
  - 不改 checkProbeConsistency（task-05 范围）
  - 槽段标题逐字用 design.md Phase 1 定稿文案（「## 证据账（cannot_verify 任务）」「## 集成验证回执」——避开既有「## Runtime Evidence」章防 literals 混淆）
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
