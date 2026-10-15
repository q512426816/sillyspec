---
author: flow-machine-draft
created_at: 2026-10-15T13:21:52.280Z
---
# 设计记录（Design Record）— 2026-10-15-eval-b-arm-turn-budget

## 做法概述

两处 eval 配置修正：①`adapter.maxTurns` 60 → 120；②`arms.B.promptTemplate` 移除退役通道话术「小任务走 quick 模式」（quick 通道 v3.30.0 已退役），改为「按 SillySpec 轻量流程完成（flow start → 直接干活 → flow done）」。

依据（004-phase-stats 权限修复后首次有效双臂）：臂 A pass（93.5 秒、16 轮内、五类隐含面全对）；臂 B `terminal_reason=max_turns`（60 轮掐断、$4.46），但 workdir 产物经本机实跑与期望逐字一致（download r1/10s、login r4/22s、upload r1/17s）——**B 臂不是做不出来，是被轮次帽掐在流程收尾前**。B 臂的处理效果（treatment）本来就包含流程仪式的轮次开销，帽必须给流程留够完成空间，否则测的是帽不是方法。120 的定值依据：B 臂 60 轮时产物已就绪（差的是 flow done 收口轮），2 倍余量覆盖仪式开销；timeoutMs 900s 独立生效不受影响。

## 接口契约

- `eval/eval.config.json`：`adapter.maxTurns` 60→120；`arms.B.promptTemplate` 话术修正（保留「当前项目已安装 SillySpec 工作流」头与 `{instruction}` 占位）。A 臂零改动。
- `test/eval-adapter-config.test.mjs` 扩展两断言（maxTurns=120 / B 臂 prompt 不含 quick）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | eval/eval.config.json | maxTurns 120 + B 臂 prompt 话术修正 |
| 修改 | test/eval-adapter-config.test.mjs | 两断言扩展 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用（静态配置）。
2. 并发写：两臂串行，无并发面变化。
3. 切换/生命周期：maxTurns 是 claude CLI 单次会话轮帽，与 runner timeoutMs 900s 独立——120 轮 × 每轮最坏耗时可能撞 900s 墙：B 臂首轮实测 60 轮 639s，120 轮全开销外推可能超 900s。**接受该风险**（撞墙则 timeoutMs 需另行上调，留待实测信号）；不预防性上调 timeoutMs（避免为未发生的墙扩预算）。
4. 作用域：仅 eval 子进程；A 臂轮帽同步放宽但实测 16 轮完成，无实际影响。

## 风险与死路

- 风险：B 臂重跑仍可能撞 900s timeout（若流程后段轮均耗时上升）。缓解：timeoutMs 与 maxTurns 解耦，实测信号驱动再调；本轮 B 臂重跑结果无论 pass/fail/error 都是有效测量（不再是环境缺陷）。
- 死路（已废弃话术）：「小任务走 quick 模式」——quick 通道 v3.30.0 退役后该话术即失真，B 臂 agent 可能花轮次对账「quick 不存在」；修正为现行协议表述。
