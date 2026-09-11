---
id: task-01
title: 'decision-distill file-field contract: parse + conditional render + two-sided normalization'
title_zh: 'decision-distill 文件字段契约（解析+条件渲染+双侧归一口径）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: []
blocks: [task-02]
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/decision-distill.js
  - test/decision-file-field.test.mjs
target_files:
  - src/decision-distill.js
  - NEW:test/decision-file-field.test.mjs
provides:
  - entry.files 字段契约（parseDecisions 解析侧：文件/files 标签 → 字符串数组，split /[,，、\s]+/，值 replace(/\\/g,'/') POSIX 归一）
  - renderBlockLines 条件渲染「文件：a, b」行（仅 entry.files 非空；位于「锚点：」行后）
goal: >
  决策条目新增机械可解析的代码文件锚定字段：changes/<name>/decisions.md 的条目支持
  「文件：」/「files:」标签，归档落库时渲染为知识库条目段的「文件：」行——FR-02 文件键
  反查的数据契约源。测试先行（AGENTS 规则 5）。
implementation:
  - 先写 test/decision-file-field.test.mjs：fixture 覆盖 有文件字段条目渲染精确行/无字段条目字节级不变形/反斜杠条目归一/中英文分隔符切分/幂等重归档不添空行
  - applyField 增 case '文件'/'files' → entry.files = parseListValue(value) 后逐项 replace(/\\/g,'/') 归一（列表语义同 模块域）
  - FIELD_LABEL_RE 增 文件|files（增量安全：消费方各自认标签）
  - renderBlockLines 在「锚点：」行后增条件行 `文件：${entry.files.join(', ')}`——仅非空渲染，存量条目零迁移
  - 编辑前 git log -1 + git diff 核对该文件最新态（ql-020 刚提交 42aa992，确认无并行会话新残留）
acceptance:
  - 含「文件：src/a.js, src/b.js」的条目渲染输出含精确行「文件：src/a.js, src/b.js」
  - 不含文件字段的既有条目渲染输出与改动前字节级一致（存量零迁移）
  - 「files: src\foo.js」反斜杠形态解析为 src/foo.js；「a.js，b.js、c.js」全角分隔符切分为 3 项
  - 同一条目二次归档（幂等路径）不新增空「文件：」行
verify:
  - node --test test/decision-file-field.test.mjs
  - npm test（decision-distill 既有测试保持绿——含 ql-020 的 decision-distill-heading-variants.test.mjs）
constraints:
  - 不动 ql-020 刚改的区域（IMPLEMENTED_TYPES 集合/标题正则 ^#{2,4}），只加字段标签与渲染行
  - 测试先行：先落测试文件（红）再实现（绿）
  - 该文件为并行会话热点区：提交时 hunk 级核对暂存面只含本 task 改动（AGENTS 规则 18）
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
