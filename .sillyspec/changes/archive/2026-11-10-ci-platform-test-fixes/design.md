---
author: flow-machine-draft
created_at: 2026-11-09T16:31:07.483Z
---
# 设计记录（Design Record）— 2026-11-10-ci-platform-test-fixes

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两例都修测试面，不动 `src` 生产逻辑。(1) **fr-regress-cap ③**：仓根 `.sillyspec/local.yaml` 是 gitignored 机器本地配置，CI checkout 天然缺席，无条件 `readFileSync` 必 ENOENT——把「无键」断言改为 `existsSync` 条件断言（在场才断言），「读取=0」断言无条件保留（fail-soft 对缺席文件本就返回 0，本地/CI 语义一致）；缺省 off 的缺席行为已有同文件 ② 用例覆盖。(2) **eval-knowledge-runner Test9**：重复标签夹具用单字标签 `x` + `join(root,path)`，POSIX 下拼出 `x:/home/...`，与 `parseRepoSpec` 盘符分支 `/^[A-Za-z]:[\\/]/` 撞形——整串被当 `x:` 盘路径，标签退化为 basename（`a`/`b`）不再冲突不抛错。夹具改多字标签 `dup:`，多字标签任何平台都落 `label:path` 正则分支，本用例真正守护的 `parseRepoArgs` Map 冲突检测两平台同判。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无。生产接口零变化：`parseRepoSpec`/`parseRepoArgs` 签名与行为不动；仅两测试文件内部修改（③ 断言条件式化、Test9 夹具标签 `x:`→`dup:`）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——同步单进程测试断言，无事件时序面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

eval 测试各自 tmp fixture（`materialize` + `finally rmSync` 清理），不动共享仓状态；③ 只读仓根 local.yaml 不写，无并发写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

CI runner 每次全新 checkout=缺席态，本地开发=在场态，两态都必须绿——条件断言保证；未来若有人把 local.yaml 入库带键，本地 ③ 仍拦截。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

单仓测试面无跨仓数据；`readFrRegressCap(join(ROOT, '.sillyspec'))` 锚定本仓目录，不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

死路（放弃）：生产侧按 `process.platform` 门控 `parseRepoSpec` 盘符分支——会破坏跨平台 baseline 键稳定语义（`C:/repos/proj` 在 Linux 跑 eval 也必须得 label=`proj`，既有用例「Windows 盘符不当作 label 分隔符」锁定）；且单字标签+POSIX 绝对路径与盘符路径是字符串形态的本质歧义，无法仅靠字符串消歧，故改夹具避开歧义形态。风险：条件断言弱化守卫？不会——「无键」守卫只在文件在场时有意义（不在场=天然无键），「读取=0」断言无条件保留兜底缺省语义。
