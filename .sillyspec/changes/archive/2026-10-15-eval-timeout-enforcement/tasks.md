---
author: flow-machine-draft
created_at: 2026-10-15T15:22:40.472Z
---
# 任务注册表（Tasks）— 2026-10-15-eval-timeout-enforcement

- [x] task-01: 超时路径改为：win32 同步 taskkill /pid <pid> /T /F（spawnSync，等结果）→ 仍不回则以 child.kill 兜底；此后启动宽限计时（TIMEOUT_GRACE_MS，默认 20s），宽限到期强制 resolve（timedOut=true，输出按已捕获截断），不再无限等待 'close'
- [x] task-02: 回归测试：spawnCapture 杀「会派生孙进程且孙进程持有 stdout」的形态——旧实现 resolve 等待孙进程自然退出（60s+），新实现 ≤ timeoutMs + 宽限（断言 resolve 上界与 timedOut=true）
- [x] task-03: 既有 eval 测试面（dry-run 管道）零回归；变更自身测试面跑绿，lint 通过
