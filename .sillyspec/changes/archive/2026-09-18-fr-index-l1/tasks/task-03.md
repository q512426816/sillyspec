---
id: task-03
title: 'Hook FR indexing into archive noAI step with telemetry'
title_zh: 'archive 挂载——run/archive-distill.js 追加 indexRequirements 调用 + fr-supersede/fr-unreferenced 遥测（best-effort 降级语义不变；unreferenced 输出带「不算 L3 门禁」标注）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v1, D-006@v1, D-008@v1]
allowed_paths:
  - src/run/archive-distill.js
expects_from:
  task-02: 'indexRequirements（含 superseded/unreferenced 返回）'
goal: >
  归档管线挂载：FR 发号与取代链在 noAI 步执行，fr-superseded/fr-unreferenced 事件落遥测。
implementation:
  - executeArchiveDistill 在决策提炼后追加 indexRequirements 调用（try/catch best-effort 降级语义不变——异常 warn 不阻断归档）
  - superseded 每条 appendKnowledgeHit({type:'fr-supersede', change, from, to})
  - unreferenced 每域 appendKnowledgeHit({type:'fr-unreferenced', change, domain, count}) + console 一行「观察信号，不算 L3 门禁」标注
  - written 非零时打印索引条数与目标域文件
acceptance:
  - fixture 变更走 executeArchiveDistill：索引写入 + 两类事件落 .runtime/knowledge-hits.jsonl 且读回字段完整
  - indexRequirements 抛错时归档步不阻断（warn 降级）
verify:
  - node --input-type=module -e "import('./src/run/archive-distill.js').then(m=>console.assert(typeof m.executeArchiveDistill==='function'))"
  - fixture 演练后 grep fr-supersede .runtime/knowledge-hits.jsonl
constraints:
  - 只改 archive-distill.js 一个文件
  - 遥测走 appendKnowledgeHit 透传，不改 knowledge-hits.js
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
