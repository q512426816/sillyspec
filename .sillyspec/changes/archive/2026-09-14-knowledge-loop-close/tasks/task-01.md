---
id: task-01
title: 'add-knowledge-hits-core-and-subcommand-routing'
title_zh: '基础设施——NEW:src/knowledge-hits.js（append/读/残行容忍）+ src/stages/knowledge.js cmdKnowledge 路由注册 classify/stats'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 19:59:00
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/knowledge-hits.js
  - src/stages/knowledge.js
target_files:
  - NEW:src/knowledge-hits.js
provides:
  - contract: KnowledgeHitsAPI
    fields: [appendKnowledgeHit, readKnowledgeHits]
goal: >
  搭建知识闭环共享底座：新建 src/knowledge-hits.js 提供 hits.jsonl 追加/读取（单行 JSON+'\n'、残行容忍），并在 src/stages/knowledge.js cmdKnowledge 注册 classify/stats 二级路由，供 Wave 2/3 的 classify/提议/注入/stats 各机制共享同一遥测事件流与命令入口（FR-02..05 底座，D-001@v1 + D-002@v1）。
implementation:
  - 新建 src/knowledge-hits.js：导出 appendKnowledgeHit(runtimeDir, 记录对象)——记录字段 type(inject|classify)/change/query/matchedFiles/at，appendFileSync 追加单行 JSON+'\n'，目录/文件缺失自动创建；readKnowledgeHits(runtimeDir, 可选 sinceDays)——逐行 JSON.parse，坏行/残行 try-catch 跳过不炸，sinceDays 按时间过滤（签名按 design.md 接口定义节）
  - src/stages/knowledge.js cmdKnowledge 二级路由 switch（:506-524）新增 case 'classify' 与 case 'stats'：均以动态 import（await import('../knowledge-classify.js') / ('../knowledge-stats.js')，先例 index.js:2613 case 'knowledge'）加载并转发 args；default 分支 available 列表补 'classify'、'stats'
  - 不改 src/index.js（:2612 仅转发到 cmdKnowledge，注册锚点在 stages/knowledge.js——X-002）
  - 跑 npm run lint + npm test 确认 knowledge 既有子命令（search/inspect/validate/refresh/propose）无回归
acceptance:
  - src/knowledge-hits.js 导出 appendKnowledgeHit / readKnowledgeHits 两函数；append 每次恰好一行 JSON+'\n'（Windows 下无 \r），readKnowledgeHits 对残行/坏行跳过不抛错（函数级行为由 task-02/04/05 的测试实证覆盖）
  - 路由注册后 available 列表含 classify 与 stats；classify/stats 实现文件缺席（W1 时点）时既有 knowledge 子命令行为不变
  - npm run lint 通过；npm test 全量 0 fail
verify:
  - npm run lint
  - npm test
constraints:
  - 注册必须用动态 import——W1 时点 knowledge-classify.js / knowledge-stats.js 尚未创建，静态 import 会断链整个 knowledge 命令（先例 index.js:2613）
  - hits.jsonl 记录字段按 design.md 数据模型节（type/change/query/matchedFiles/at）；append 单行+'\n' Windows 兼容不写 \r\n；读取残行容忍（R-04）
  - 不越 allowed_paths：不改 src/index.js，不创建 classify/stats 实现文件（分别属 task-02 / task-05），不新增测试文件（4 个测试文件归 task-02..05）
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
