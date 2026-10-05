---
author: flow-machine-draft
created_at: 2026-10-05T16:51:28.108Z
---
# 提案书（Proposal）— 2026-10-06-agent-log-detect-hint

## 动机

任务原话转写：agent-log --detect 空态提示文案落后于探测器注册表：src/agent-session-log.js 只列「Claude Code / Codex / ZCode」3 家，HARNESS_DETECTORS 实际注册 8 家（另有 pi / deepseek-dsh / cursor-agent / cursor / opencode）。pi/dsh/cursor 用户看到提示会误判 CLI 不支持自己的 harness，且文案硬编码零测试覆盖，注册表再扩还会继续漂移。

成功标准：
- --detect 空态提示覆盖全部已注册 harness，且从 HARNESS_DETECTORS 派生（注册表新增 harness 时提示自动跟上，不再手工同步）
- 新增单元测试：断言提示含全部已注册 harness 名（现零覆盖）
- npm test 全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. --detect 空态提示覆盖全部已注册 harness，且从 HARNESS_DETECTORS 派生（注册表新增 harness 时提示自动跟上，不再手工同步）
2. 新增单元测试：断言提示含全部已注册 harness 名（现零覆盖）
3. npm test 全绿

## 成功标准（可验证）

1. --detect 空态提示覆盖全部已注册 harness，且从 HARNESS_DETECTORS 派生（注册表新增 harness 时提示自动跟上，不再手工同步）
2. 新增单元测试：断言提示含全部已注册 harness 名（现零覆盖）
3. npm test 全绿
