---
id: task-04
title: 'upgrade-mechanical-knowledge-injection-to-prompt-body'
title_zh: '机械注入——src/run/prompt.js 升级 {KNOWLEDGE_HIT_REPORT} 至正文级（top-3+截断+hits 落盘）+ src/stages/quick.js quickFirstStep 注入 + src/stages/execute.js Wave 粒度 + NEW:test/knowledge-inject.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 19:59:00
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/prompt.js
  - src/stages/quick.js
  - src/stages/execute.js
  - test/knowledge-inject.test.mjs
  - test/execute-testcase-design-include.test.mjs
target_files:
  - NEW:test/knowledge-inject.test.mjs
expects_from:
  task-01:
    - contract: KnowledgeHitsAPI
      needs: [appendKnowledgeHit, readKnowledgeHits]
related_tests:
  - path: test/execute-testcase-design-include.test.mjs
    reason: ':74 断言 buildWavePrompt 输出中 {{include: testcase-design}} 计数恰为 1——Wave 知识段必须做纯文本注入、禁止 {{include:}} 形式，否则 include 计数被抬高断言失效'
goal: >
  把知识消费从 report 级/建议读升级为正文机械注入：execute 既有 {KNOWLEDGE_HIT_REPORT} 段升级为正文级（top-3+截断），quick step1 与 Wave 粒度补注入段，注入逐条落 hits.jsonl 遥测（FR-04，D-002@v1）。
implementation:
  - src/run/prompt.js :757-786 升级既有 {KNOWLEDGE_HIT_REPORT} 段：从命中清单报告升级为命中正文注入——按 entries 出现序（INDEX 行序）取前 3 个不同 file（X-009，matchKnowledge 无相关度排序）、单文件行数截断+截断标记、段头标「CLI 按任务描述机械匹配」；查询串沿用该 step 现有来源（changeName + tasks.md 任务行，:763-776）；未命中整段零字节
  - 注入同时逐条经 task-01 appendKnowledgeHit 落 .runtime/knowledge-hits.jsonl（type: inject）；既有 .runtime/knowledge-hit-report.json 照旧落盘（兼容，X-004 升级既有不并行新建）
  - src/stages/execute.js buildWavePrompt（:763 定义导出）补 Wave 粒度匹配段：Wave 任务名串跑 matchKnowledge，命中文件正文以纯文本段注入（禁止 {{include:}} 形式）；Wave prompt 说明命中知识段来源、agent 勿自行重跑匹配
  - quickFirstStep（src/run/prompt.js :1093-1105 附近）新增注入段：查询串用 readQuickGuardField('taskDescription') 现成读取（X-008）；src/stages/quick.js step1 prompt 说明命中知识段来源
  - 新建 test/knowledge-inject.test.mjs：注入段格式/top-3 限额（INDEX 行序前 3 不同 file）/未命中零变化/hits 落盘/旧 report.json 兼容共存
acceptance:
  - execute「确认执行范围」step prompt 含命中正文段：top-3 不同 file、单文件截断有标记、段头标注机械匹配；未命中时 prompt 与升级前字节一致（零变化）（FR-04 Then）
  - quick step1 prompt 含按 taskDescription 匹配的注入段；buildWavePrompt 输出含 Wave 任务名串匹配段（纯文本，非 include）
  - 每次注入 hits.jsonl 追加 type:inject 记录；knowledge-hit-report.json 照旧落盘（新旧遥测共存）
  - node test/execute-testcase-design-include.test.mjs 仍通过（include 计数不被知识段抬高）
  - node test/knowledge-inject.test.mjs 0 fail；npm test 全量 0 fail
verify:
  - node test/knowledge-inject.test.mjs
  - node test/execute-testcase-design-include.test.mjs
  - npm test
constraints:
  - Wave/quick 知识段一律纯文本注入，禁止 {{include:}} 占位形式（execute-testcase-design-include.test.mjs:74 include 计数断言，plan-review 实证）
  - INDEX.md/knowledge 目录缺失全链路 no-op：matchKnowledge 已返回 matched:false，不额外报错不炸 prompt 组装（brownfield）
  - 注入膨胀按 R-02 控制：top-3 文件限额+单文件截断+截断标记；不做「必须消费」硬门禁（D-002 非目标）
  - 不越 allowed_paths；不改 src/knowledge-match.js；旧 knowledge-hit-report.json 机制不移除不迁移
  - hits append 单行+'\n'，Windows 兼容
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
