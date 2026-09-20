---
id: task-05
title: '文档同步——.sillyspec/docs/sillyspec/modules/core-engine.md（scope-audit 跨仓真实对账+cross-repo-reconcile 共享内核+契约字段）；design.md 契约节与实现终态核对（如实现期口径微调回写契约文档）'
title_zh: '文档同步——.sillyspec/docs/sillyspec/modules/core-engine.md（scope-audit 跨仓真实对账+cross-repo-reconcile 共享内核+契约字段）；design.md 契约节与实现终态核对（如实现期口径微调回写契约文档）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 16:36:27
priority: P0
depends_on: ['task-04']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/changes/2026-09-20-scope-audit-cross-repo/design.md
target_files:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
goal: >
  文档同步：core-engine 模块文档补 scope-audit 跨仓真实对账与 cross-repo-reconcile 共享
  内核能力面 + 契约字段；design.md 契约节与实现终态核对（实现期口径微调回写契约文档）。
implementation:
  - .sillyspec/docs/sillyspec/modules/core-engine.md：cross-repo-reconcile 条目补 collectRepoActual 共享内核（锚点四级）+scope-audit 条目补跨仓真实对账与 --json 契约 repos[] 字段（源码位置写仓根相对全路径+行号）
  - design.md 契约节核对：实现终态与接口定义逐字段一致（实现期如有微调——如 anchor 字段命名/降级文案——回写契约文档保持单一真相）
  - changelog/更新说明按模块文档既有格式登记
acceptance:
  - core-engine.md 含新能力条目与契约字段说明；design.md 契约节与实现一致
  - docs 层校验通过（docs-check 相关面，若该文档在基线内）
verify:
  - npm test（docs 基线校验随测试面；纯文档改动 lint 不扫 docs/）
constraints:
  - 仅文档改动，零源码变更
  - 源码引用写仓根相对全路径+行号（docs-check 层1 basename 匹配口径）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
