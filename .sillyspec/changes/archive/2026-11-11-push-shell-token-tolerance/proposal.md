---
author: flow-machine-draft
created_at: 2026-11-11T08:09:40.599Z
---
# 提案书（Proposal）— 2026-11-11-push-shell-token-tolerance

## 动机

任务原话转写：push 命令容忍 shell 残留并透出完整错误
动机与背景：平台 git 代执行通道不解析 shell，命令行里的 2>&1 / 管道被原样透传为位置参数，sillyspec push 严格白名单直接拒绝；同时 human 模式 git push 用 inherit 导致失败详情被吞，只剩一行 failed to push some refs。
成功标准：
- parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警
- parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警
- 合法参数组合与现有 fail-closed 行为保持不变
- human 模式 git push 失败时错误信息包含底层 stderr 详情
- 成功与失败均由 CLI 转发捕获的 git 输出到终端
- 相关单测与集成测试通过

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警
2. parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警
3. 合法参数组合与现有 fail-closed 行为保持不变
4. human 模式 git push 失败时错误信息包含底层 stderr 详情
5. 成功与失败均由 CLI 转发捕获的 git 输出到终端
6. 相关单测与集成测试通过

## 成功标准（可验证）

1. parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警
2. parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警
3. 合法参数组合与现有 fail-closed 行为保持不变
4. human 模式 git push 失败时错误信息包含底层 stderr 详情
5. 成功与失败均由 CLI 转发捕获的 git 输出到终端
6. 相关单测与集成测试通过
