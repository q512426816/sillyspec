---
id: task-05
title: 'backfillScenarioBodies（标题匹配回填，幂等）+ CLI sillyspec fr-backfill'
title_zh: 'backfillScenarioBodies（标题匹配回填，幂等）+ CLI sillyspec fr-backfill'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 07:36:41
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]  #
decision_ids: ['D-003@v2']
allowed_paths:
  - src/fr-index.js
  - src/index.js
target_files:
  - src/fr-index.js
goal: >
  存量回填：active 条目缺正文 → 从来源归档 requirements.md 补齐（幂等）。
implementation:
  - backfillScenarioBodies({knowledgeRoot, archiveRoot})：扫 active 条目无「场景正文：」→ 读来源变更归档 parse → 按标题匹配（fallback 按序）→ 补丁写入
  - index.js case fr-backfill 接线（--json）
acceptance:
  - 回填补正文；二跑零新增（幂等）；无归档/标题不匹配 → 警告不阻断
verify:
  - node test/fr-index-l2.test.mjs 回填组
constraints:
  - 不动归档管线（新条目走 task-04 正常捕获）
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
