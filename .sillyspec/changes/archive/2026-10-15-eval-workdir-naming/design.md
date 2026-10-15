---
author: flow-machine-draft
created_at: 2026-10-15T12:48:34.213Z
---
# 设计记录（Design Record）— 2026-10-15-eval-workdir-naming

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

`eval/lib/workdir.mjs` 的 prepareWorkdir 目录名由 `<taskId>__arm<arm>` 改为 `run-<taskId>__arm<arm>`——一行修复 + 根因注释 + 命名断言测试。根因实证（2026-10-15 首次真实 A/B，004-phase-stats 双臂）：claude CLI 沙箱把允许目录路径里的 `\004` 形态（目录段以数字开头）当八进制转义序列处理，前缀比对恒失败，workdir 内一切写入被硬拦（Write/Bash/mkdir/子代理/TEMP 多通道全拦，两臂日志同征；臂 A 还把完整解法写在了回复里——判分 fail 与能力无关）。001~004 全部数字开头 taskId 都会踩，未来真实 pilot 全覆盖受益。`run-` 前缀使路径段以字母开头，转义歧义消失。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- prepareWorkdir 返回路径形态变化：`<root>/004-phase-stats__armA` → `<root>/run-004-phase-stats__armA`。消费面 grep 全仓仅 eval/lib/workdir.mjs 一处引用该名字面；runner/db 以 task+arm 列为键不依赖目录名；workdirs 在 .gitignore，旧命名目录成孤儿残留不影响新跑（prepareWorkdir 每次清空重建自己的目标）。
- 新增 `test/eval-workdir-naming.test.mjs`（命名断言双形态 + 脚手架复制不回退）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | eval/lib/workdir.mjs | workdir 名加 run- 前缀 + 根因注释 |
| 新增 | NEW:test/eval-workdir-naming.test.mjs | 命名断言（数字开头/字母开头 taskId 双形态） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用（纯命名，无输入面）。
2. 并发写：prepareWorkdir 语义未动（先删后建；.stale 隔离机制原样）。
3. 切换/生命周期：workdirs gitignored、每次重跑清空重建；旧命名目录为一次性残留，不参与判分。
4. 作用域：eval/results/workdirs 单根，跨任务隔离不变（名字含 taskId+arm 全量保留）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险：`\0NN` 转义根因理论来自臂 A agent 的自证分析 + 两臂写入全拦实证，非 claude 源码级确认——若修复后重跑仍被拦则另有根因（届时按新证据再修；本修复至少排除已实证的歧义形态）。重跑验证在收口后进行（真 token 消耗），不计入本变更门。
- 放弃的方案：改 claude 侧（不可控、非本仓面）；workdir 换盘符路径（taskId 数字语义仍在，命名前缀是唯一干净修复点）；重命名 taskId 本体（破坏任务 id 稳定性与指纹语义）。
