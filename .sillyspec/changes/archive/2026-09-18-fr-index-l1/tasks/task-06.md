---
id: task-06
title: 'Tests: fr-index fixture matrix + D14 fourth-check states'
title_zh: '测试——NEW:test/fr-index.test.mjs（发号/幂等重放/承接翻链/域兜底/digest/overlap 纯函数/坏承接 warn/unreferenced）+ test/doctor-archive-integrity.test.mjs +第四检查组（epoch 前 skip/缺索引红/取代未标红/豁免复用）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-02', 'task-05']
blocks: []
requirement_ids: [FR-01, FR-02, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-007@v1]
allowed_paths:
  - test/fr-index.test.mjs
  - test/doctor-archive-integrity.test.mjs
target_files: [NEW:test/fr-index.test.mjs]
expects_from:
  task-02: '五导出全量'
  task-05: 'D14 第四检查行为'
goal: >
  索引核心 fixture 全态测试 + D14 第四检查四态测试。
implementation:
  - NEW:test/fr-index.test.mjs（自研 assert+mkdtemp 同 house 风格）：发号（域计数器 max+1 跨变更递增）/幂等重放（两次调用第二次零写）/承接翻链（superseded+superseded_by）/坏承接 warn 不抛/域兜底 unmapped/digest 藏 superseded/overlap 阈值边界（≥0.6 命中、低相似不命中）/unreferenced 计数/场景名抽取
  - test/doctor-archive-integrity.test.mjs 追加第四检查组：epoch 前归档零检查/epoch 后缺索引 offender/承接未翻 offender/无 requirements 豁免/豁免账本复用
acceptance:
  - 两测试文件全绿且覆盖上述全态
  - 测试不触真实 .sillyspec（全 fixture）
verify:
  - node test/fr-index.test.mjs && node test/doctor-archive-integrity.test.mjs
constraints:
  - 纯测试文件；发现 src 缺陷 reopen 归属 task 修，不改测试迁就
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
