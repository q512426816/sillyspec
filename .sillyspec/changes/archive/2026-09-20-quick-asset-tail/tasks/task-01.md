---
id: task-01
title: 'fr-index.js 扩展——markFrNeedsReview（跨域定位/幂等/行写入）+ readActiveFrDigest needsReview 透传 + indexRequirements 翻链 filter 清理待复核行 + prompt.js 注入 ⚠️ 标注'
title_zh: 'fr-index.js 扩展——markFrNeedsReview（跨域定位/幂等/行写入）+ readActiveFrDigest needsReview 透传 + indexRequirements 翻链 filter 清理待复核行 + prompt.js 注入 ⚠️ 标注'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 19:56:12
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: ['D-003@v1']
allowed_paths:
  - src/fr-index.js
  - src/run/prompt.js
target_files:
  - src/fr-index.js
  - src/run/prompt.js
goal: >
  fr-index needs_review 全链：写入/读取/注入/承接清除。
implementation:
  - markFrNeedsReview(knowledgeRoot, frIds, refNote)：scanAllDomains 定位全局 id → 条目 lines 追加或更新「待复核：<ref>」行（同 ref 幂等跳过）→ joinKnowledgeFile 回写
  - readActiveFrDigest：解析「待复核：」行 → needsReview: string|null 透传
  - indexRequirements 翻链就地补丁 filter 追加 `!l.startsWith('待复核：')`（承接清除，S2 阻断①修复点在 filter 而非 renderFrLines）
  - prompt.js ①c 注入行：needsReview 非空追加 ⚠️（待复核 ql-ref，行为可能已变）
acceptance:
  - 写入后条目含待复核行，digest.needssReview 透传，幂等二跑零新增
  - 承接翻链后待复核行清除（filter 断言）
  - 注入行带 ⚠️ 标注
verify:
  - node test/quick-asset-tail.test.mjs（task-04）
constraints:
  - superseded 条目不标不注入（digest 已过滤）
  - markFrNeedsReview 对未知 id 记 warning 不抛
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
