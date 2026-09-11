---
id: task-02
title: 'knowledge-match file-key reverse lookup: file label + anchor extraction fallback + matchDecisionsByFiles'
title_zh: 'knowledge-match 文件键反查（文件标签+锚点提取兜底+matchDecisionsByFiles）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: ['task-01']
blocks: [task-03]
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/knowledge-match.js
  - test/decision-file-field.test.mjs
target_files:
  - src/knowledge-match.js
expects_from:
  - task-01: entry.files 字段契约（知识库条目段「文件：」行 = split(', ') 语义）
provides:
  - matchDecisionsByFiles(indexDir, files) → { [file]: [{ id, title, status, reason, file }] }（file 字面沿 parseDecisionFile 既有字段名——plan 审查 N5 统一口径；无 decisions 库 → {}）
goal: >
  知识库决策条目按代码文件路径反查：新「文件：」字段精确匹配 + 存量「锚点：」路径形态
  token 提取兜底——quick 语义护栏（task-03/05/06）的文件键引擎。
implementation:
  - parseDecisionFile 的 DECISION_FIELD_RE 增 文件 标签 → cur.files（split /[,，、\s]+/ + replace(/\\/g,'/') 归一，与 task-01 契约对齐）
  - 「锚点：」单独标签精确匹配读入 cur.anchor（仿 docs-check.js:940 先例），不进 reason 回填链——DECISION_FIELD_RE 的 else-if 链会把锚点值误吞进 reason（Grill X-002 隐性回归）
  - 锚点路径 token 提取：正则 [\w./-]+\.(js|ts|mjs|cjs|jsx|tsx|py|go|java|rs) 剥 :line 后缀，作为条目无「文件」字段时的兜底命中源（D-905 形态「锚点：src/quicklog.js:493」→ src/quicklog.js）
  - 新导出 matchDecisionsByFiles(indexDir, files)：parseDecisionEntries 发现（INDEX Decisions 段路由）→ 建 file→entries 映射（查询侧路径同样归一）；无库 → {}
  - 测试先扩 test/decision-file-field.test.mjs（与 task-01 分 Wave 共享该文件）
acceptance:
  - 「文件：src/a.js」条目被 matchDecisionsByFiles(['src/a.js']) 命中，返回含 id/title/status/reason/file
  - 「锚点：src/quicklog.js:493」存量条目经锚点提取被 ['src/quicklog.js'] 命中（D-905 实形态）
  - 锚点值不污染 reason（reason 仍取 理由/否决理由 行——Grill X-002 反例）
  - 反斜杠查询值与条目值双侧归一命中；无 decisions 库/INDEX 无路由 → {}
verify:
  - node --test test/decision-file-field.test.mjs
constraints:
  - 不改 matchKnowledge 既有匹配语义（关键词引擎原样）
  - rejected 条目同样进反查结果（状态字段透传，消费方按需过滤）
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
