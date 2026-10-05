---
author: flow-machine-draft
created_at: 2026-10-05T12:44:46.600Z
---
# 提案书（Proposal）— 2026-10-05-flowdone-lintfail-output

## 动机

任务原话转写：坑 flowdone-lint-fail-no-output（2026-10-03 实证）倒推收尾——在途代码已写好，本会话接手收编：flow done lint 门 FAIL 时「命令与输出尾部见上」名不副实（runVerifyLintCheck 全程静默、printVerifyLintCheck 未在 flow 路径调用、lint 结果不落 test-result.json，agent 只能盲猜或直调同参复现）。顺带修排障发现的死代码：quick-audit 的 failed 变量声明在 try 块内，finally 快照回拷读 failed.length 抛 ReferenceError 被空 catch 吞——P6b 回拷+resultPath 重映射自 2026-09-28 落地即死代码，快照 FAIL 时结果文件随临时目录蒸发恒死链。
成功标准：
- flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）
- lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落
- quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效
- e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）
2. lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落
3. quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效
4. e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）

## 成功标准（可验证）

1. flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）
2. lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落
3. quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效
4. e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）
