---
author: flow-machine-draft
created_at: 2026-11-11T08:09:40.599Z
---
# 任务注册表（Tasks）— 2026-11-11-push-shell-token-tolerance

- [x] task-01: parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警
- [x] task-02: parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警
- [x] task-03: 合法参数组合与现有 fail-closed 行为保持不变
- [x] task-04: human 模式 git push 失败时错误信息包含底层 stderr 详情
- [x] task-05: 成功与失败均由 CLI 转发捕获的 git 输出到终端
- [x] task-06: 相关单测与集成测试通过
