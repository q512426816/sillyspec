
## ql-20260815-021-9886 | 2026-08-15 23:56:09 | 解决 multi-agent-platform 登记的坑6（plan-postcheck 隐性格式契约）与坑7（跨仓 repo 声明只扫 plan.md）
状态：已完成
关联变更：2026-08-15-planpostcheck-pit67
文件：
- src/stages/plan-postcheck.js（parseAllowedPaths/parseDependsOn 块正则 [ /t]* 化 + 入口 CRLF 归一 + executePlanPostcheck 六检查聚合输出）
src/run/shared.js（getOrCreateMultiRepoContext 兼扫 tasks/ 卡片 repo 声明——collectTaskCardReposFallback）
src/task-review.js（跨仓未解析 warning 文案补真实排查方向）
src/stage-contract.js（entry-point-wiring 复用 parseAllowedPaths，保留全文扫描宽松语义）
test/plan-postcheck-blocklist.test.mjs（新增 12 断言：顶格/缩进/inline/混合/反引号/CRLF/depends_on/聚合）
test/multi-repo-context-entry.test.mjs（坑7 两场景：tasks/ 卡片补扫 + 双源去重）
结果：暂存确认：模块文档已同步并暂存——stages.md + runtime.md（ql-20260815-021-9886 坑6/坑7 条目）。命中模块：stages（plan-postcheck.js）、runtime（run/shared.js、task-review.js）。需求：解决 multi-agent-platform 登记的坑6（plan-postcheck 隐性格式契约）与坑7（跨仓 repo 声明只扫 plan.md）。根因：块列表正则 \s* 贪婪吃换行致标准 YAML 顶格列表失配静默判缺字段；六检查串行 throw 一轮只露一类；aggregateDeclaredRepos 不读 tasks/ 独立卡片致跨仓仓不进 ctx 误报 review 伪造。方案：[ \t]* 正则化 + 解析器入口 CRLF 归一 + executePlanPostcheck 聚合输出 + collectTaskCardReposFallback 兼扫 tasks/ + task-review warning 文案指向真实排查方向 + stage-contract entry-point-wiring 复用 parseAllowedPaths 消同源漂移。结果：npm test 全量 207 文件 exit=0 零失败；lint 过；新增 12+2 断言回归测试全绿。--force-baseline 解锁 stage-contract.js（entry-point-wiring 解析漂移修复，改后全量回归绿）；--allow-new 解锁新测试文件。

## ql-20260816-001-8a1d | 2026-08-16 00:33:17 | 移除 wait 单选校验门（enforceWaitChoice）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（删 enforceWaitChoice helper + requiresWait 门/解 waiting/--continue 三处调用）|src/stages/brainstorm.js、src/stages/brainstorm-auto.js（删 waitFreeAnswer 标记，waitOptions 保留仅展示）|test/wait-choice-enforcement.test.mjs（重写：锁自由文本放行+门保留新契约）|test/wait-done-answer-resolves-waiting.test.mjs（注释更新：单选强制已移除）|docs/sillyspec/file-lifecycle.md（单选强制条目改写为移除记录）|docs/sillyspec/platform-interface-map.md（complete.js 行号锚点 646/749/889→652/755/895 校准）|.sillyspec/docs/sillyspec/modules/runtime.md、stages.md（ql-20260814-007 条目补移除注记）|docs/prompt/_extracted.json（重提取产物，waitFreeAnswer 不入 prompt 文本）
需求：移除 wait 单选校验门（enforceWaitChoice）。
根因：字符串全等匹配区分不了人工/AI——AskUserQuestion 标签转述/人工 Other 自由填值被误拦，故意代答读报错抄选项即过，防不了对手只伤真人。
方案：删 enforceWaitChoice 函数与三条 --answer 路径调用点，删 brainstorm/brainstorm-auto waitFreeAnswer 标记；重写 wait-choice-enforcement.test.mjs 锁新契约（自由文本放行、requiresWait 门保留）3 用例；同步 file-lifecycle.md 移除记录、platform-interface-map.md 行号锚点校准、模块文档移除注记、_extract.mjs 重提取。
结果：npm test 全量 EXIT=0（含 11 断言新契约测试），npm run lint 295 文件通过，doc-ref-check 80 处引用全通过；用户在卡的 change（2026-08-15-change-step-visibility）waiting 步骤重试命令不再受单选拦截。
