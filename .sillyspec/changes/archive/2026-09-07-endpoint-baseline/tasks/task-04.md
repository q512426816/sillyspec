---
id: task-04
title: '测试套件 test/endpoint-baseline.test.mjs'
title_zh: '测试套件 test/endpoint-baseline.test.mjs'
author: 'qinyi'
created_at: 2026-09-07 07:52:45
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - test/endpoint-baseline.test.mjs
target_files:
  - NEW:test/endpoint-baseline.test.mjs
goal: >
  测试套件——幂等/归一/diff/主仓锚定/降级/delta 集成。
implementation:
  - 新建 test/endpoint-baseline.test.mjs：capture 幂等（首拍/重跑 exists）+ fail-soft；diffEndpointSets 归一全套（method 大写/去尾斜杠/normalizePath 参数改名不假报/changed 独立行/null）；CLI（临时 fixture：--json/缺 --change/幂等/worktree 主仓锚定——cwd 在临时 worktree 内跑断言基线落主仓 runtimeRoot）；delta 集成（有/无基线两形态 + backendEndpoints=0 无节）；execute Step3 指引存在性
acceptance:
  - 全绿 + module 子集回归 + lint 归零
verify:
  - node --test test/endpoint-baseline.test.mjs && npm test
constraints:
  - node:test 风格；不弱化断言

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
