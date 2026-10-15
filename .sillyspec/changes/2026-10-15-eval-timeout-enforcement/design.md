---
author: flow-machine-draft
created_at: 2026-10-15T15:30:00.000Z
---
# 设计记录（Design Record）— 2026-10-15-eval-timeout-enforcement

## 做法概述

005 探针 B 臂实测暴露：`eval/lib/util.mjs` 的 win32 超时路径（spawnCapture 内）用 fire-and-forget `spawn(taskkill /T /F)` + `child.kill(SIGKILL)`（shell:true 下 child=cmd.exe）——claude 进程树被孤儿化存活（记录 timeout 1501240ms vs 配置 900000ms，孤儿继续烧 token 约 10 分钟，workdir 时间戳佐证超时点后仍有写入）。修复三件套：①taskkill 改 spawnSync（等结果、可失败感知）；②child.kill 兜底保留；③宽限计时（TIMEOUT_GRACE_MS=20000）后强制 resolve（timedOut=true）——把「墙钟上界」从尽力而为变成绑定承诺。

## 接口契约

- `eval/lib/util.mjs`：新增 `TIMEOUT_GRACE_MS` 常量（导出供测试断言）；超时 handler 行为变化（见 FR-01）；resolve 形状不变（timedOut/truncated/durationMs/stdout/stderr/code）。
- 影响面：spawnCapture 全部调用点（adapters/cli.mjs 被测 agent 运行、runner 的 verify/quick setup）——超时不再无限等待，属修复语义。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | eval/lib/util.mjs | 超时路径杀树同步化 + 宽限强制 settle |
| 新增 | NEW:test/eval-timeout-enforcement.test.mjs | 孤儿树收敛上界 + 正常路径零回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用。
2. 并发写：宽限计时与 close 事件竞态——settle 幂等（既有 settled 守卫）覆盖；两次 timer 都 clearTimeout 收尾。
3. 切换/生命周期：强制 settle 后，孤儿进程若仍存活（极端：taskkill 也失败）不再阻塞评测流程——残留由 OS 回收；truncated 标记按既有语义。
4. 作用域：纯本地进程管理，无跨仓面。

## 风险与死路

- 风险：强制 settle 后 stdout 尾部内容可能缺失（孤儿还在写）——接受：timeout 语义下输出本就不完整，timedOut=true 让消费方按失败处理。
- 次风险：spawnSync taskkill 在极少数权限形态下失败——child.kill 兜底 + 宽限强制 settle 双保险保证绑定上界。
- 死路：仅靠 fire-and-forget taskkill（现行实现）——实测树存活 10 分钟，证伪。
