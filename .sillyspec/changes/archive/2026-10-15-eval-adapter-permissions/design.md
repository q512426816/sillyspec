---
author: flow-machine-draft
created_at: 2026-10-15T13:02:13.308Z
---
# 设计记录（Design Record）— 2026-10-15-eval-adapter-permissions

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

`eval/eval.config.json` 的 `adapter.command` 追加 `--dangerously-skip-permissions`——一行配置修复 + 漂移保护测试 + 上一变更根因理论的证伪留痕。

**根因链（完整证据，替代 2026-10-15-eval-workdir-naming 的错误理论）**：
1. 首次真实 A/B（004-phase-stats 双臂）双双 fail，臂 A agent 自证分析提出「沙箱把 `\004` 当八进制转义吃掉允许目录前缀」——被该变更采纳为根因并做 run- 命名修复。
2. 受控重跑（run- 前缀命名下）臂 A 仍被拦 → 转义理论证伪。
3. claude 自身 JSON 输出的 `permission_denials` 数组直接列出被拒的 Write 调用（workdir 内 `bin/phase-stats.mjs`）——**真根因：`claude -p` headless 模式无交互授批通道，adapter command 无权限旗标时 Write/Bash 全部自动拒绝**（is_error=false 掩盖了实质失败：agent 只读空转烧 token，臂 A 31 轮 8 分钟、重跑 15 轮 3.7 分钟全耗在撞墙）。
4. 命名前缀（run-）降级为无害加固保留——路径段字母开头仍是好卫生，只是不治本病。

选 `--dangerously-skip-permissions` 而非 `--permission-mode acceptEdits` 的理由：acceptEdits 只放行文件编辑，Bash（mkdir/node 执行）仍会被拒——臂 A 首轮日志实证 Bash mkdir 也在拒绝面；被测工作目录是一次性 gitignored 草稿（runner 每次清空重建），skip-permissions 的爆炸半径=草稿目录，是 headless 评测的标准形态（同 Superpowers evals）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `eval/eval.config.json` `adapter.command`：`["claude", "-p", "--output-format", "json", "--max-turns", "{maxTurns}"]` → 追加 `--dangerously-skip-permissions`。两臂共用该 adapter（arms.A/B 无独立 command），一处生效双臂受益。
- 新增 `test/eval-adapter-config.test.mjs`（旗标在场断言 + B 臂 setup 语义不变断言）。
- **不改**：workdir.mjs（上一变更已修，保留）、runner/adapters 代码零改动、promptTemplate 零改动。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | eval/eval.config.json | adapter.command 追加 --dangerously-skip-permissions |
| 新增 | NEW:test/eval-adapter-config.test.mjs | 旗标漂移保护 + B 臂 setup 语义断言 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用（静态配置）。
2. 并发写：两臂串行跑（runner 顺序执行），skip-permissions 不改变并发面；workdir 隔离语义未动。
3. 切换/生命周期：配置每次 run 读取；回滚=删旗标一行。
4. 作用域：旗标只作用于 eval 子进程 spawn 的 claude 实例（cwd=一次性 workdir）；不触碰用户本机其他 claude 会话、不落任何持久配置（.claude.json 等）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险：skip-permissions 让被测 agent 在草稿目录内有完全执行权——理论上 agent 可写 workdir 之外。缓解：评测任务是自包含小任务、workdir 每轮清空、runner 有 15 分钟超时硬帽；这是 headless 评测的行业标准取舍（不 skip 则测的是「撞权限墙的能力」不是任务能力——两轮实证）。若未来要在敏感环境跑评测，应加 `--add-dir` 白名单或容器隔离，属独立演进。
- 次风险：旗标名是 claude CLI 私有面（版本演化可能改名）。缓解：漂移保护测试在旗标失效（被 CLI 拒识）时无法直接捕获（配置断言只护 config 层）——运行时失败会以 claude 非零退出显形，届时按新版本旗标名更新。
- 死路（已走过）：`\0NN` 转义理论——见做法概述证据链，废弃。
