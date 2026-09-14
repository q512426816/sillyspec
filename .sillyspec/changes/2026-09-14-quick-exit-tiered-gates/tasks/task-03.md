---
id: task-03
title: 'wire-gate-profile-into-scope-audit-table-and-json-exits'
title_zh: 'scope-audit 出口——画像进表格与 --json 双出口+重放回归'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-008@v1]
allowed_paths:
  - src/scope-audit.js
  - src/index.js
  - test/scope-audit.test.mjs
target_files:
  - src/scope-audit.js
  - src/index.js
  - test/scope-audit.test.mjs
expects_from:
  task-01:
    - contract: GateProfileFn
      needs: [computeGateProfile]
  task-02:
    - contract: GateMounted
      needs: [review.gateProfile]
provides:
  - contract: ScopeAuditGateExit
    fields: [gateProfile-json, gate-table-section]
goal: >
  把 quick 画像接进 scope-audit 双出口——表格出口增画像段、--json 出口增 gateProfile 字段，
  归档与 quick 会话重放路径画像可重放，成为画像的独立可重放出口与阈值校准数据源（FR-04 / D-008@v1）。
implementation:
  - scope-audit.js computeQuickAudit 实时路径（:396 已跑 auditQuickCompletion）把 audit 携带的 review.gateProfile 透传进 computeChangeScopeAudit 返回对象，不重复计算
  - scope-audit.js 冻结重放分支（:787-805）从 quicklog patches 记录透传 gateProfile，路径模式下实时态与重放态字段一致
  - renderScopeAuditTable（:944 起）增画像段——level/degraded/moduleSpan/风险命中与缺失检查项按存在性渲染，无画像时输出与现状零差异
  - index.js scope-audit 分支（:1304-1378）的 --json 出口（:1381-1385）随 saResult 透出 gateProfile，表格出口经 renderScopeAuditTable 自动带画像段
  - test/scope-audit.test.mjs 增回归用例——--json 含 gateProfile、表格含画像段、既有三态对账表/归属表/--file 出口与归档重放零回归
acceptance:
  - quick 会话 scope-audit --json 输出含 gateProfile 字段且与 review.gateProfile 同源
  - 表格输出含画像段——level/moduleSpan/风险命中可见
  - 归档变更与 quick 会话重放路径画像可重放，实时态与重放态字段一致
  - 既有三态对账表/归属表/--file 出口零回归
verify:
  - npm test
  - npm run lint
constraints:
  - gateProfile 为增量字段（消费方按存在性读取）
  - 不改变 computeChangeScopeAudit 既有返回字段语义
  - --file 子命令行为不变
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
