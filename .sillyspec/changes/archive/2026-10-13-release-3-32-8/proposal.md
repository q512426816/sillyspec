---
author: flow-machine-draft
created_at: 2026-10-13T05:20:01.442Z
---
# 提案书（Proposal）— 2026-10-13-release-3-32-8

## 动机

任务原话转写：发布变更（照 3.32.1~3.32.7 惯例三步：版本面 → 推送 → 钉扎发布）。用户显式指令「提交推送代码，发布新版 npm 3.32.8」。

随版内容（今日已归档变更）：cli-pit-fix-batch（FR 降级告警接 tests --redomain 用法行+D-001 铁律/worktree deps --set 显式覆写通道/stage-review 契约附 review.json 完整绝对路径/knowledge --help 全局拦截）。

成功标准：
- package.json version=3.32.8 且 test/quick-retired.test.mjs R5 版本锚断言绿
- git push origin main 成功（pre-push 拦截时修复而非跳过）
- npm publish 钉扎通道：预核验 latest=3.32.7 → publish → 双核验 version=3.32.8 且 dist-tags.latest=3.32.8

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. package.json version=3.32.8 且 test/quick-retired.test.mjs R5 版本锚断言绿
2. git push origin main 成功（pre-push 拦截时修复而非跳过）
3. npm publish 钉扎通道：预核验 latest=3.32.7 → publish → 双核验 version=3.32.8 且 dist-tags.latest=3.32.8

## 成功标准（可验证）

1. package.json version=3.32.8 且 test/quick-retired.test.mjs R5 版本锚断言绿
2. git push origin main 成功（pre-push 拦截时修复而非跳过）
3. npm publish 钉扎通道：预核验 latest=3.32.7 → publish → 双核验 version=3.32.8 且 dist-tags.latest=3.32.8
