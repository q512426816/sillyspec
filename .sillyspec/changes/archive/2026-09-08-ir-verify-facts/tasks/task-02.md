---
id: task-02
title: 'requiredEvidence 分类核验升级'
title_zh: 'requiredEvidence 分类核验升级'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v2]
allowed_paths:
  - src/verify-postcheck.js
  - src/progress.js
  - src/progress/change-registry.js
  - NEW:test/verify-evidence-triple.test.mjs
target_files:
  - src/verify-postcheck.js
  - src/progress.js
  - src/progress/change-registry.js
  - NEW:test/verify-evidence-triple.test.mjs
expects_from:
  needs: task-01: classifyVerifiedFile / EVIDENCE_STATUS / EXEMPTION_RE（分类核验与豁免解析单源）
goal: >
  requiredEvidence 对账从「md 提及 task id 子串」升级为分类核验（代码类 存在×mtime×diff 交集；运行时产物类豁免 diff），legacy 降级（FR-02）。
implementation:
  - verify-postcheck.js runVerifyRequiredEvidenceCheck v2：读 verify-required-evidence.json（不变）→ md 有「## 证据账」槽段时按 task 行解析状态（EVIDENCE_STATUS 枚举 + EXEMPTION_RE 豁免后缀）与 verifiedFiles → 逐文件 classifyVerifiedFile 分类核验：code 类核 existsSync × statSync.mtime ≥ verifyStartAt × resolveVerifyChangedFiles 交集；artifact 类核 存在×mtime（diff 豁免）→ items[].verification{filesExist,mtimeOk,diffHit,pathClass}；status 语义扩 blocked（missing 无豁免 / 核验不过）
  - progress.js 新增只读 getStageCompletedAt(changeName, stage)：DB stages.completed_at（仿 getChangeCreatedAt 只读先例）；verifyStartAt 缺省/DB 不可得走 R-05 fallback（mtime 晚于 design.md created_at 宽容 + warning）
  - md 无槽段（存量）→ legacy 子串对账 + 迁移 warning，行为等同现状（既有 test/verify-required-evidence-check.test.mjs 的 legacy status 精确值不得回归）
  - 新建 test/verify-evidence-triple.test.mjs：代码类三核验全过/文件缺失/mtime 出窗/diff 零交集四分支 + artifact 类豁免 diff + 豁免后缀解析 + partial 语义 + legacy 降级 + 函数级 blocked（gates 接线级 e2e 归 task-03）
acceptance:
  - verifiedFiles 代码类文件与 git diff 零交集 → ERROR（不再子串提及即过）
  - 运行时产物类（.runtime/日志）不因 diff 零交集误报（豁免有单测）
  - 存量无槽 md → legacy 行为与 warning，既有 verify-required-evidence-check 测试全绿
  - verifyStartAt 基准取 DB completed_at；DB 不可得 fallback 宽容 + warning
verify:
  - node --test test/verify-evidence-triple.test.mjs
  - node --test test/verify-required-evidence-check.test.mjs
constraints:
  - 不改 gates.js（接线归 task-03）
  - 不改 checkIntegrationEvidence（task-04 范围）
  - verifyStartAt 参数化：调用方缺位时 fallback 不抛
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
