---
id: task-05
title: 'add-knowledge-stats-matrix-and-close-out'
title_zh: 'stats + 收口——NEW:src/knowledge-stats.js 聚合矩阵/死重对照 + NEW:test/knowledge-stats.test.mjs + 模块卡同步（按 _module-map 归属）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 19:59:00
priority: P1
depends_on: ['task-02', 'task-03', 'task-04']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-002@v1]
allowed_paths:
  - src/knowledge-stats.js
  - test/knowledge-stats.test.mjs
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - NEW:src/knowledge-stats.js
  - NEW:test/knowledge-stats.test.mjs
expects_from:
  task-01:
    - contract: KnowledgeHitsAPI
      needs: [appendKnowledgeHit, readKnowledgeHits]
goal: >
  实现 knowledge stats 命中矩阵聚合（近 N 天矩阵 + 死重对照 INDEX 全集），并按 _module-map 归属同步 stages/runtime 域模块卡与 changelog sidecar 完成测试收口，为「是否升级消费门禁」提供数据依据（FR-05，D-002@v1）。
implementation:
  - 新建 src/knowledge-stats.js 导出 buildHitMatrix(knowledgeDir, runtimeDir, 可选项 sinceDays 缺省 30)，返回矩阵条目(file/hits/lastHitAt)、neverHit 从未命中清单与 totalInjects/totalClassifies 计数（签名按 design.md 接口定义节）；聚合数据经 task-01 readKnowledgeHits 读取
  - CLI 输出：sillyspec knowledge stats [--since-days N] [--json]——近 N 天命中矩阵（文件 × 次数 × 最近命中时间）+ 从未命中文件清单（对照 INDEX 全集标注疑似死重）；hits.jsonl 缺失输出空矩阵+「暂无遥测数据」提示；纯只读
  - 新建 test/knowledge-stats.test.mjs：stats 聚合/死重对照/空数据提示
  - 收尾把 src/knowledge-stats.js 补录进 _module-map.yaml core-engine paths（lint module-map 覆盖硬门禁，W1 实证）
  - 模块卡同步（按 _module-map.yaml paths 归属）：src/stages/knowledge.js、quick.js、execute.js → stages.md；src/run/prompt.js、complete-handlers.js → runtime.md；各域卡配 changelog sidecar 追加本变更条目
  - 收口核对 plan 全局验收四条（全量 npm test 0 fail / 集成冒烟证据 / brownfield no-op / 存量 17 条迁移）——发现缺口回填对应 task 或报告协调者，不静默放过
acceptance:
  - stats 命令输出命中矩阵与死重清单，数值与 hits.jsonl 构造样例一致；--json 输出可解析（FR-05 Then）
  - hits.jsonl 缺失/空数据时输出空矩阵+提示不炸；命令纯只读（不改 hits/INDEX/知识文件任何输入）
  - stages.md / runtime.md 及其 changelog sidecar 已同步本变更加入的知识闭环条目（四文件 diff 可查）
  - node test/knowledge-stats.test.mjs 0 fail；npm test 全量 0 fail（4 个新增测试文件齐）
verify:
  - node test/knowledge-stats.test.mjs
  - npm test
constraints:
  - 纯只读命令：不写 hits/INDEX/知识文件，不做自动删除/合并（非目标，死重清单只报告）
  - 模块卡同步仅限 stages/runtime 域卡 + changelog sidecar（按 _module-map paths 归属），不动其他域卡
  - 不越 allowed_paths：不回改 task-02/03/04 实现文件（发现缺陷报告协调者或走新 quick，不在本卡偷改）
  - hits 读取残行容忍（沿 task-01 契约），Windows 兼容
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
