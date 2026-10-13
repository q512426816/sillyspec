---
author: flow-machine-draft
created_at: 2026-10-13T15:35:34.271Z
---
# 提案书（Proposal）— 2026-10-13-sync-ledger-tombstone

## 动机

任务原话转写：幽灵变更事故（2026-10-13-new-change-e5a27813，multi-agent-platform 仓实证）：变更 DB 行被外部手段彻底清除后，platform sync --change 对该变更为「变更无进度数据」空转且退出码 0（index.js 忽略 sync 返回值），daemon RPC 收到假成功；X1 墓碑链依赖 DB 行存活（_pushTombstone serializeForSync null 即放弃），平台行永挂 in_progress/active 形成幽灵。需要删除台账兜底：终态转换落 .runtime/deleted-changes.jsonl，行缺失时据此补推墓碑。

成功标准：
- change-delete（status=deleted）与归档 unregisterChange（status=archived）在 .sillyspec/.runtime/deleted-changes.jsonl 追加台账（name/status/at），写入 fail-open 不阻断主流程
- platform sync --change X 在 DB 无行且台账有终态时，合成最小载荷补推墓碑（deleted→平台 location=deleted、archived→location=archive），返回零 errors
- platform sync --change X 失败路径（未连接平台/变更不存在且无台账）退出码非 0，错误信息可见
- 台账缺失/损坏行容错读取，quick-* 会话名豁免台账墓碑分支

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. change-delete（status=deleted）与归档 unregisterChange（status=archived）在 .sillyspec/.runtime/deleted-changes.jsonl 追加台账（name/status/at），写入 fail-open 不阻断主流程
2. platform sync --change X 在 DB 无行且台账有终态时，合成最小载荷补推墓碑（deleted→平台 location=deleted、archived→location=archive），返回零 errors
3. platform sync --change X 失败路径（未连接平台/变更不存在且无台账）退出码非 0，错误信息可见
4. 台账缺失/损坏行容错读取，quick-* 会话名豁免台账墓碑分支

## 成功标准（可验证）

1. change-delete（status=deleted）与归档 unregisterChange（status=archived）在 .sillyspec/.runtime/deleted-changes.jsonl 追加台账（name/status/at），写入 fail-open 不阻断主流程
2. platform sync --change X 在 DB 无行且台账有终态时，合成最小载荷补推墓碑（deleted→平台 location=deleted、archived→location=archive），返回零 errors
3. platform sync --change X 失败路径（未连接平台/变更不存在且无台账）退出码非 0，错误信息可见
4. 台账缺失/损坏行容错读取，quick-* 会话名豁免台账墓碑分支
