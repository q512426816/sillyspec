---
id: task-07
title: 'Full acceptance: suite + telemetry roundtrip + bootstrap drill'
title_zh: '全量验收——npm test 全绿 + 四类遥测事件 fixture 实测落盘读回 + 本变更自举路径演练（索引写入→D14 复扫零 offender）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v1, D-007@v1, D-008@v1]
allowed_paths:
  - src/fr-index.js
  - bin/sillyspec.js
goal: >
  全量收口：套件绿 + 四遥测事件实测读回 + 自举演练（本变更自身将走的首个 epoch 样本路径预演）。
implementation:
  - 全量 npm test
  - 遥测往返：fixture 走 executeArchiveDistill + step8 渲染 → readKnowledgeHits 读回 fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced 四类各≥1 条字段完整
  - 自举演练：fixture 变更 indexRequirements 写入 → doctor 复扫该 fixture 归档零 offender（W5 验证 R-05 路径成立）
  - 护栏复核：证伪条款/指标可算性声明/探针标注三处在 design 与代码注释一致
acceptance:
  - npm test 全绿（含两新测试文件）
  - 四遥测事件读回字段完整
  - 自举演练零 offender
verify:
  - npm test
constraints:
  - 只读验收；缺陷 reopen 归属 task 修不在本 task 热修
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
