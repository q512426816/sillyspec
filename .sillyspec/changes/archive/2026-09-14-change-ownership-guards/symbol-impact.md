# 符号影响面报告

> tasks.md 内容指纹（生成时）：按当前 tasks.md 实测。调用点扫描（2026-09-14，grep src/ 全量）：

- task-01: schema 常量与内部迁移（DB_SCHEMA_VERSION/CURRENT_VERSION/progress._version 三值 5→6——消费者为版本戳一致性测试，已列 related_tests）；progress.js 新导出 getChangeOwner/claimChangeOwner（新符号无既有调用点）；serializeForSync 投影加列（消费方=平台同步 import，加列向后兼容）；change-registry INSERT 加列（内部）。无既有签名变更。
- task-02: 新导出 assertChangeOwnership（change-registry，无既有调用点）；index.js 三接线点为调用新增（apply/cleanup/assess 分支自身行为在拒绝分支才变，无签名变化）；run/command.js knownFlags 白名单追加 + :819 既有 '--session' 语义提示条目调整（提示文案，消费面为 did-you-mean 提示，无签名变化）。
- task-03: complete-handlers 归档门与两接线为前置检查新增（归档移动函数签名不变）；worktree-apply reviewAdmittedFiles 内部过滤（返回结构 violations 增量报告行——消费方为 apply 校验循环与错误输出，增量兼容）；task-review 归因分流（内部取数源切换，草稿产物结构不变）。
- task-04: 新测试文件+六卡+AGENTS.md 纯文档，无符号变更。
