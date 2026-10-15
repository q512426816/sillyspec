---
author: flow-machine-draft
created_at: 2026-10-15T15:30:00.000Z
---
# 设计记录（Design Record）— 2026-10-15-eval-timeout-enforcement

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

005 探针 B 臂实测暴露：`eval/lib/util.mjs` 的 win32 超时路径（spawnCapture 内）用 fire-and-forget `spawn(taskkill /T /F)` + `child.kill(SIGKILL)`（shell:true 下 child=cmd.exe）——claude 进程树被孤儿化存活（记录 timeout 1501240ms vs 配置 900000ms，孤儿继续烧 token 约 10 分钟，workdir 时间戳佐证超时点后仍有写入）。修复三件套：①taskkill 改 spawnSync（等结果、可失败感知）；②child.kill 兜底保留；③宽限计时（TIMEOUT_GRACE_MS=20000）后强制 resolve（timedOut=true）——把「墙钟上界」从尽力而为变成绑定承诺。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `eval/lib/util.mjs`：新增 `TIMEOUT_GRACE_MS` 常量（导出供测试断言）；超时 handler 行为变化（见 FR-01）；resolve 形状不变（timedOut/truncated/durationMs/stdout/stderr/code）。
- 影响面：spawnCapture 全部调用点（adapters/cli.mjs 被测 agent 运行、runner 的 verify/quick setup）——超时不再无限等待，属修复语义。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | eval/lib/util.mjs | 超时路径杀树同步化 + 宽限强制 settle |
| 新增 | NEW:test/eval-timeout-enforcement.test.mjs | 孤儿树收敛上界 + 正常路径零回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用。
2. 并发写：宽限计时与 close 事件竞态——settle 幂等（既有 settled 守卫）覆盖；两次 timer 都 clearTimeout 收尾。
3. 切换/生命周期：强制 settle 后，孤儿进程若仍存活（极端：taskkill 也失败）不再阻塞评测流程——残留由 OS 回收；truncated 标记按既有语义。
4. 作用域：纯本地进程管理，无跨仓面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险：强制 settle 后 stdout 尾部内容可能缺失（孤儿还在写）——接受：timeout 语义下输出本就不完整，timedOut=true 让消费方按失败处理。
- 次风险：spawnSync taskkill 在极少数权限形态下失败——child.kill 兜底 + 宽限强制 settle 双保险保证绑定上界。
- 死路：仅靠 fire-and-forget taskkill（现行实现）——实测树存活 10 分钟，证伪。

- **收口前零回归实测回填（task-03 证据）**：dry-run 管道 --force 全量重跑 10 臂全绿（5 任务 × 2 臂，含 runner verify 走 spawnCapture 的修复面）：A 臂 5/5、B 臂 3/5（mixed 形态与 004/005 奇偶规则一致）、hash=d400e749d374 不变；npm run lint 1007 文件绿；变更自身测试 2/2。
