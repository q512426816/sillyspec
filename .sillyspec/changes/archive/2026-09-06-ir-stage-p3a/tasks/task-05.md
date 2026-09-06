---
id: task-05
title: 'gates.js verify 块接线 reconcileTargetFiles（阻断语义照先例）'
title_zh: 'gates.js verify 块接线 reconcileTargetFiles（阻断语义照先例）'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: ['task-04']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-004@v1]
allowed_paths:
  - src/run/gates.js
goal: >
  gates.js verify 块接线 reconcileTargetFiles：②类 ERROR 阻断、③类
  WARNING 放行，阻断语义照 runVerifyTestCheck 先例，不改既有五项检查。
expects_from:
  task-04:
    - contract: reconcileTargetFiles
      needs:
        - status
        - missing
        - undeclared
implementation:
  - import reconcileTargetFiles（from ../verify-postcheck.js）
  - verify 块既有五项检查后追加调用：missing 非空 → ERROR 阻断回执；undeclared → WARNING（含 suspectTask 归因）；skipped/degraded → WARNING 放行
  - 诊断信封格式（code/evidence/supportedFixes）；结果落盘对齐 .runtime/verify-runs/ 先例
acceptance:
  - ②类（missing）在场时 verify gate 红
  - 既有五项检查语义与顺序零变化
verify:
  - node --test test/wait-gates.test.mjs test/run-complete-noai-done-gate.test.mjs
constraints:
  - 只追加接线，不修改既有检查分支
  - 接线点位在既有五项检查之后（verify 块 :669+ 另有 module-impact 探针，勿插错段）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
