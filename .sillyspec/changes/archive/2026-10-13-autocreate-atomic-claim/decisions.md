---
author: flow-machine-draft
created_at: 2026-10-13T16:20:31.204Z
---
# 决策记录（Decisions）— 2026-10-13-autocreate-atomic-claim

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：db.js transaction 的 BUSY 重试若不整体重跑 fn（只重试语句），跨进程快照过期时守卫可能读到旧快照——已核对 db.js 注释「BUSY 重试收敛在 DB 层 transaction 封装」（重跑 fn），且单语句本身在写锁下排队，双重保险；真并发竞争测试（双进程同秒 spawn）确定性不足（胜负调度随机），不作为测试断言面，以单语句原子性+守卫行为单测为契约锚。 放弃的方案：①「先 initChange 再检查删行回滚」——回滚本身又与对方提交竞态，且留下已写 stages/目录的清理面；②「文件锁串行化自动建名」——引入新锁文件与清理生命周期，复杂度不成比例；③只修 command.js 顺序（先算名再 listChanges 再 initChange）——仍是两步，竞态窗口依旧。
