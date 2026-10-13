---
author: flow-machine-draft
created_at: 2026-10-13T12:01:44.383Z
---
# 提案书（Proposal）— 2026-10-13-commit-guard-s3

## 动机

任务原话转写：动机：S3 提案机制已实证（临时仓实验：pathspec 提交时 pre-commit 钩子的 GIT_INDEX_FILE 指向 next-index 临时索引，临时索引 blob 含工作树外来行、真实暂存区是净版、HEAD 最终携带外来行——与 055080e4 事故逐环节同构）。本仓 S1/S2 只认文件级模式，检测不到「commit -- 路径 取工作树内容、绕过暂存区净版」的 hunk 级夹带——三次前科（51225ae0 执行位绕道、055080e4 三十八行夹带、fb5bc11 裸提交事故族）。修法：commit-guard 加第三信号 S3——钩子环境下 GIT_INDEX_FILE 指向临时索引时，逐路径比对临时索引与真实暂存区的 blob sha，不一致即警告「提交将携带未暂存的工作树内容」；纯函数抽取可直测；fail-open 恒 exit 0 不动。

成功标准：
- pathspec 提交且某路径临时索引与真实暂存区 blob 不一致时，S3 警告点名路径与机理，写 write-audit 留痕，exit 恒 0 不阻断提交
- 规则 11 正常流转（add 净版后不再改文件+同清单 pathspec 提交）与普通全量提交两形态零 S3 警告（GIT_INDEX_FILE 未设或等于真索引即跳过）
- 纯函数四态可直测：同 sha 零告、异 sha 点名、仅临时索引（未 add 的新文件随 pathspec 提交）点名、仅真实索引（staged 但不在本次 pathspec）不点名；冲突态 stage 大于 0 条目忽略
- 真仓集成测试：真实 git 钩子复现 055080e4 形态必告警且提交放行；干净流转与全量提交零误报
- 既有 S1/S2 行为零回归（test/commit-guard.test.mjs 既有断言零改动全绿）

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. pathspec 提交且某路径临时索引与真实暂存区 blob 不一致时，S3 警告点名路径与机理，写 write-audit 留痕，exit 恒 0 不阻断提交
2. 规则 11 正常流转（add 净版后不再改文件+同清单 pathspec 提交）与普通全量提交两形态零 S3 警告（GIT_INDEX_FILE 未设或等于真索引即跳过）
3. 纯函数四态可直测：同 sha 零告、异 sha 点名、仅临时索引（未 add 的新文件随 pathspec 提交）点名、仅真实索引（staged 但不在本次 pathspec）不点名；冲突态 stage 大于 0 条目忽略
4. 真仓集成测试：真实 git 钩子复现 055080e4 形态必告警且提交放行；干净流转与全量提交零误报
5. 既有 S1/S2 行为零回归（test/commit-guard.test.mjs 既有断言零改动全绿）

## 成功标准（可验证）

1. pathspec 提交且某路径临时索引与真实暂存区 blob 不一致时，S3 警告点名路径与机理，写 write-audit 留痕，exit 恒 0 不阻断提交
2. 规则 11 正常流转（add 净版后不再改文件+同清单 pathspec 提交）与普通全量提交两形态零 S3 警告（GIT_INDEX_FILE 未设或等于真索引即跳过）
3. 纯函数四态可直测：同 sha 零告、异 sha 点名、仅临时索引（未 add 的新文件随 pathspec 提交）点名、仅真实索引（staged 但不在本次 pathspec）不点名；冲突态 stage 大于 0 条目忽略
4. 真仓集成测试：真实 git 钩子复现 055080e4 形态必告警且提交放行；干净流转与全量提交零误报
5. 既有 S1/S2 行为零回归（test/commit-guard.test.mjs 既有断言零改动全绿）
