---
author: flow-machine-draft
created_at: 2026-10-15T09:13:21.067Z
---
# 提案书（Proposal）— 2026-10-15-jsx-batch-cmd-chunk

## 动机

任务原话转写：verify 动态子集 js/jsx 批按命令长度分块——修 Windows「命令行太长」恒败死锁（倒推 B：补丁已由并行会话实施，本变更复测+收口登记）

动机与背景：Windows cmd 执行器命令行上限 ~8191 字符，广被引用的前端文件变更会把 jsx 依赖批拉到 100+ 文件，单条 vitest 命令必炸「命令行太长」exit 1，且失败批进增量账本自我循环恒败（消费仓双会话实证：137 文件批与 138→155→159 膨胀批，verify 无法收口）。补丁（chunkByCommandLength，js/jsx 双接线，单块保原名零回归、多块 deps(auto-jsx:N/M) 独立计账）已由消费仓并行会话 2026-10-15-zcode-engine-appserver 实施于本仓工作区未提交；消费仓坑档案 docs/sillyspec/verify-jsx-batch-cmd-too-long.md（含第二实例补充）。

已做改动：src/verify-postcheck.js +41/-2（chunkByCommandLength :2831；deps(auto-js) :2988 与 deps(auto-jsx) :3010 双接线；超长单文件防死循环；dropped/prioDropped 归块 0 计账）。

成功标准：
- chunkByCommandLength 按「前缀+参数拼接总长」分块，maxLen 缺省 6000，单块保持原批名（零回归），多块命名 deps(auto-js|jsx:N/M)
- 三件套零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 全绿
- flow done 实测门（npm test + npm run lint）通过

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. chunkByCommandLength 按「前缀+参数拼接总长」分块，maxLen 缺省 6000，单块保持原批名（零回归），多块命名 deps(auto-js|jsx:N/M)
2. 三件套零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 全绿
3. flow done 实测门（npm test + npm run lint）通过

## 成功标准（可验证）

1. chunkByCommandLength 按「前缀+参数拼接总长」分块，maxLen 缺省 6000，单块保持原批名（零回归），多块命名 deps(auto-js|jsx:N/M)
2. 三件套零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 全绿
3. flow done 实测门（npm test + npm run lint）通过
