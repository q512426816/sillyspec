---
author: flow-machine-draft
created_at: 2026-10-15T15:22:40.472Z
---
# 提案书（Proposal）— 2026-10-15-eval-timeout-enforcement

## 动机

任务原话转写：eval 超时强制生效——timeoutMs 到点须绑定式收敛：杀进程树（同步 taskkill）+ 宽限后强制 settle，实测超时未被强制执行（900s 墙钟实际跑满 1501s）

动机：005 探针 B 臂实测记录 timeout 1501240ms——配置 timeoutMs=900000（15 分钟）但实际 25 分钟才收敛：eval/lib/util.mjs spawnCapture 的 win32 超时路径用 fire-and-forget spawn 执行 taskkill /T /F + child.kill('SIGKILL')（shell:true 下 child=cmd.exe），实测 claude 进程树存活（23:11 仍在写 workdir，距 900s 到点已 4 分钟），'close' 直到孤儿自然退出才触发。后果：①墙钟不设界（评测公平性与 CI 时长失控）；②孤儿进程继续烧真 token（每次 timeout 都白烧）；③durationMs 语义失真。verify/quick-setup 同用 spawnCapture（eval/lib/util.mjs:105/139），修复面通用。

成功标准：
- 超时路径改为：win32 同步 taskkill /pid <pid> /T /F（spawnSync，等结果）→ 仍不回则以 child.kill 兜底；此后启动宽限计时（TIMEOUT_GRACE_MS，默认 20s），宽限到期强制 resolve（timedOut=true，输出按已捕获截断），不再无限等待 'close'
- 回归测试：spawnCapture 杀「会派生孙进程且孙进程持有 stdout」的形态——旧实现 resolve 等待孙进程自然退出（60s+），新实现 ≤ timeoutMs + 宽限（断言 resolve 上界与 timedOut=true）
- 既有 eval 测试面（dry-run 管道）零回归；变更自身测试面跑绿，lint 通过

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 超时路径改为：win32 同步 taskkill /pid <pid> /T /F（spawnSync，等结果）→ 仍不回则以 child.kill 兜底；此后启动宽限计时（TIMEOUT_GRACE_MS，默认 20s），宽限到期强制 resolve（timedOut=true，输出按已捕获截断），不再无限等待 'close'
2. 回归测试：spawnCapture 杀「会派生孙进程且孙进程持有 stdout」的形态——旧实现 resolve 等待孙进程自然退出（60s+），新实现 ≤ timeoutMs + 宽限（断言 resolve 上界与 timedOut=true）
3. 既有 eval 测试面（dry-run 管道）零回归；变更自身测试面跑绿，lint 通过

## 成功标准（可验证）

1. 超时路径改为：win32 同步 taskkill /pid <pid> /T /F（spawnSync，等结果）→ 仍不回则以 child.kill 兜底；此后启动宽限计时（TIMEOUT_GRACE_MS，默认 20s），宽限到期强制 resolve（timedOut=true，输出按已捕获截断），不再无限等待 'close'
2. 回归测试：spawnCapture 杀「会派生孙进程且孙进程持有 stdout」的形态——旧实现 resolve 等待孙进程自然退出（60s+），新实现 ≤ timeoutMs + 宽限（断言 resolve 上界与 timedOut=true）
3. 既有 eval 测试面（dry-run 管道）零回归；变更自身测试面跑绿，lint 通过
