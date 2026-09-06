---
id: task-03
title: 'gates.js verify 块一致性检查接线（reconcile 后，信封+落盘）'
title_zh: 'gates.js verify 块一致性检查接线（reconcile 后，信封+落盘）'
author: 'qinyi'
created_at: 2026-09-07 03:51:53
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/run/gates.js
target_files:
  - src/run/gates.js
goal: >
  gates verify 块接线一致性检查——ERROR 阻断/WARNING 放行，信封与
  落盘对齐 P3a reconcile 同款。
expects_from:
  task-02:
    - contract: checkProbeConsistency
      needs:
        - status
        - mismatches
implementation:
  - import checkProbeConsistency（from ../verify-postcheck.js），在 P3a reconcileTargetFiles 接线（:677-694）之后追加调用（动态 import 同块先例）
  - status=mismatch 且 severity=error → rollback 阻断（reconcile 先例同形）；drift/warning → console.warn 放行；skipped/degraded → 放行
  - 诊断信封 code 三值（probe_consistency_mismatch/drift/skipped）；结果并入 writeReconcileRunResult 同款落盘 verify-runs（或并列 reconcile-result.json 的新文件 probe-consistency-result.json——对齐 P3a 先例自选，注明）
acceptance:
  - 篡改场景 gate 红（rollback）；既有五项检查与 reconcile 接线零变化
verify:
  - node --test test/wait-gates.test.mjs
constraints:
  - 只追加接线不改既有分支；接线点在 reconcile 之后、module-impact 探针段之前

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
