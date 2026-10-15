---
author: flow-machine-draft
created_at: 2026-10-15T09:13:21.067Z
---
# 任务注册表（Tasks）— 2026-10-15-jsx-batch-cmd-chunk

- [x] task-01: chunkByCommandLength 按「前缀+参数拼接总长」分块，maxLen 缺省 6000，单块保持原批名（零回归），多块命名 deps(auto-js|jsx:N/M)
- [x] task-02: 三件套零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 全绿
- [x] task-03: flow done 实测门（npm test + npm run lint）通过
