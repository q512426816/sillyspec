---
author: flow-machine-draft
created_at: 2026-10-13T16:01:02.371Z
---
# 提案书（Proposal）— 2026-10-13-autocreate-atomic-claim

## 动机

任务原话转写：幽灵变更事故源头竞态（2026-10-13-new-change-e5a27813）：run brainstorm / run auto 无 --change 时的自动建名走「listChanges 检查零活跃 → initChange」两步，检查与插入非原子——并行两条 sillyspec 命令（当日 daemon-log-config-view 与 new-change-e5a27813 同秒落地实证）都看到零活跃、都创建，产生自动命名的垃圾变更。需把「零活跃检查+建行」收敛为单条原子 SQL 抢占。

成功标准：
- initChangeIfNoActive（progress.js）：INSERT..SELECT 带 NOT EXISTS(status='active') 与 NOT EXISTS(name=?) 双守卫，单语句原子抢占；抢到→建行+种 stages+建目录，返回 created:true；已有活跃→created:false 附 activeChanges 清单；同名行已存在（任意 status）→created:false
- run/command.js 两处自动建名调用点（brainstorm 无 --change / run auto）改用原子抢占，抢占失败走既有 exit 2 多活跃引导文案
- 抢占失败的进程不得留下 changes/<自动名>/ 空目录或 DB 行（败者零残留）
- 显式 --change 路径（initChange）语义不变，既有测试全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. initChangeIfNoActive（progress.js）：INSERT..SELECT 带 NOT EXISTS(status='active') 与 NOT EXISTS(name=?) 双守卫，单语句原子抢占；抢到→建行+种 stages+建目录，返回 created:true；已有活跃→created:false 附 activeChanges 清单；同名行已存在（任意 status）→created:false
2. run/command.js 两处自动建名调用点（brainstorm 无 --change / run auto）改用原子抢占，抢占失败走既有 exit 2 多活跃引导文案
3. 抢占失败的进程不得留下 changes/<自动名>/ 空目录或 DB 行（败者零残留）
4. 显式 --change 路径（initChange）语义不变，既有测试全绿

## 成功标准（可验证）

1. initChangeIfNoActive（progress.js）：INSERT..SELECT 带 NOT EXISTS(status='active') 与 NOT EXISTS(name=?) 双守卫，单语句原子抢占；抢到→建行+种 stages+建目录，返回 created:true；已有活跃→created:false 附 activeChanges 清单；同名行已存在（任意 status）→created:false
2. run/command.js 两处自动建名调用点（brainstorm 无 --change / run auto）改用原子抢占，抢占失败走既有 exit 2 多活跃引导文案
3. 抢占失败的进程不得留下 changes/<自动名>/ 空目录或 DB 行（败者零残留）
4. 显式 --change 路径（initChange）语义不变，既有测试全绿
