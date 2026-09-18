---
id: task-05
title: 'NEW:test/preflight-slimming.test.mjs——前置清单（帽/超时/异常三态）+账本幂等与摘要形态+inherit-from 双态+引导行在场+单步中位长度统计钩子；全量 npm test+lint 绿'
title_zh: 'NEW:test/preflight-slimming.test.mjs——前置清单（帽/超时/异常三态）+账本幂等与摘要形态+inherit-from 双态+引导行在场+单步中位长度统计钩子；全量 npm test+lint 绿'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 21:12:40
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-005@v1]
allowed_paths:
  - test/preflight-slimming.test.mjs
  - test/stage-review.test.mjs
target_files:
  - NEW:test/preflight-slimming.test.mjs
goal: >
  四相位直测收口——新增 preflight-slimming 测试承载七组断言（前置三态/账本幂等/inherit 双态/
  引导行在场/中位长度钩子/prune 登记/清单头行），全量 npm test+lint 绿。
implementation:
  - 断言组一（前置清单三态）：有失败条数帽截断（超 5 条截为 5）/超时 validator 返空/validator 异常返空
  - 断言组二（账本幂等与摘要形态）：首步全量标记；后续摘要行含 digest 前 8 位+可 Read 路径；同 change+stage+step 双渲染字节一致（幂等金丝雀，对齐 test/knowledge-inject.test.mjs:150 先例——计划评审 gap③②）
  - 断言组三（inherit-from 双态+兼容）：决策 ID 存在时盖章轮落 wait_answers；不存在时 exit 2；不带 --inherit-from 逐字节兼容（对照渲染）
  - 断言组四（引导行在场）：execute 任务步 prompt 与 templates/prompts/taskcard-rules.md verify 段均含定向优先引导行
  - 断言组五（中位长度钩子）：测试模块导出单步 prompt 渲染长度记录函数（verify 验收比对单步中位不反弹用，守恒红线 D-005③）
  - 断言组六（prune 登记）：pruneArchivedChangeRuntime 枚举含 prompt-inject-<change>.json（计划评审 gap③①）
  - 断言组七（清单头行在场）：前置清单渲染输出含「已知失败项（非全部要求），清单外仍需按步骤说明自检」
  - test/stage-review.test.mjs 仅允许连带回归增量（stage prompt 文案变更引发的既有断言适配）；无连带影响则不触碰该文件
acceptance:
  - 七组断言全部落地且通过
  - 全量 npm test 绿（零回归）；npm run lint 绿
verify:
  - npm test
  - npm run lint
constraints:
  - 只动 allowed_paths；LF 行尾；兼容 Windows/Linux/macOS（临时目录/路径分隔用跨平台写法）
  - 不 mock 引擎真实逻辑——走真实渲染/真实账本与 wait 落账（临时 change 夹具）
  - 测试失败时修实现不迁就改断言（非测试逻辑本身有误禁改测试）
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
