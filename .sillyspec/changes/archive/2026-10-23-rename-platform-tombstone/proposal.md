---
author: flow-machine-draft
created_at: 2026-10-23T06:18:15.553Z
---
# 提案书（Proposal）— 2026-10-23-rename-platform-tombstone

## 动机

任务原话转写：rename 落台账推旧名墓碑根治幽灵变更
动机：multi-agent-platform 仓 2026-10-23 实证 2026-10-23-new-change-43a74c51 幽灵变更——裸跑 run brainstorm 自动建名 16 秒后被 change-rename 改名，平台按 change_key 建键而 renameChange 只改本地库行与目录，平台旧名行无终态凭证永挂 active（坑9 幽灵家族新变种：rename 失源；坑9 台账只接 deleteChange/unregisterChange）。

成功标准：
- renameChange 成功后删除台账含旧名条目 status='deleted'（lookupDeletedLedger latest-wins 可查）
- rename 后对旧名跑 sync（serializeForSync=null 分支）→ 台账命中合成墓碑 POST：载荷 status='deleted'、current_stage='archive'、零 errors（对齐坑9 验证要点）
- rename 失败路径（旧名缺失/新名冲突/FS 回滚）不落台账
- 存量清理：multi-agent-platform 仓对 2026-10-23-new-change-43a74c51 补台账后 platform sync 退出码 0，平台行收敛

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. renameChange 成功后删除台账含旧名条目 status='deleted'（lookupDeletedLedger latest-wins 可查）
2. rename 后对旧名跑 sync（serializeForSync=null 分支）→ 台账命中合成墓碑 POST：载荷 status='deleted'、current_stage='archive'、零 errors（对齐坑9 验证要点）
3. rename 失败路径（旧名缺失/新名冲突/FS 回滚）不落台账
4. 存量清理：multi-agent-platform 仓对 2026-10-23-new-change-43a74c51 补台账后 platform sync 退出码 0，平台行收敛

## 成功标准（可验证）

1. renameChange 成功后删除台账含旧名条目 status='deleted'（lookupDeletedLedger latest-wins 可查）
2. rename 后对旧名跑 sync（serializeForSync=null 分支）→ 台账命中合成墓碑 POST：载荷 status='deleted'、current_stage='archive'、零 errors（对齐坑9 验证要点）
3. rename 失败路径（旧名缺失/新名冲突/FS 回滚）不落台账
4. 存量清理：multi-agent-platform 仓对 2026-10-23-new-change-43a74c51 补台账后 platform sync 退出码 0，平台行收敛
