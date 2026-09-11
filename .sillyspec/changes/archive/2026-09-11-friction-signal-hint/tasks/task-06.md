---
id: task-06
title: 'test/friction-tally.test.mjs 全量单测'
title_zh: 'test/friction-tally.test.mjs 全量单测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-002@v1, D-003@v1, D-005@v1]
allowed_paths:
  - test/friction-tally.test.mjs
  - test/archive-runtime-prune.test.mjs
target_files: [NEW:test/friction-tally.test.mjs]  # 对账用精确路径清单
goal: >
  数据层与埋点行为单测：路由落点红线（D-002）、清零、开关默认、history 截尾、静默降级、隐私值域（D-005）。
implementation:
  - 临时目录 + 假 platformOpts（本地模式）；参照既有测试风格（node:test + assert，临时 specBase，用后清理）
  - 用例组：路由两路径断言（含 .runtime 树内路径包含检查）；record 计数/截尾/非法类型拒绝；consume 清零与二次 null；enabled=false 双直通；local.yaml 缺失/损坏默认开；gates 埋点（可选：直接调 rollbackCompletionAndReturn 太重则经模块级集成样例）；prune 清理（扩展 archive-runtime-prune 用例放该文件由 task-04 顺带，本文件聚焦模块层）
  - 隐私断言：序列化文件内容不含 prompt/对话样例字符串
acceptance:
  - node --test test/friction-tally.test.mjs 全绿
  - npm test 全量回归无新红（既有 mcp-server.test.mjs 基线除外——他session改动）
verify:
  - npm test
constraints:
  - 不为测试改产品代码（规则 11）；Windows 路径断言用包含/正斜杠归一
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
