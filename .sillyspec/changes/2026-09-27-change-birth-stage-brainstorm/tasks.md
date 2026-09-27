---
author: thin-agent
created_at: 2026-09-27T12:42:47.563Z
---
# 任务注册表（Tasks）— 2026-09-27-change-birth-stage-brainstorm

> 机器预填草稿已按实际实现路径覆写（多行成功标准被切碎的 task-03/04 合并回 task-02 的边界断言）。
> 验收锚在 requirements；默认 thin：收口=flow done 唯一裁决。

- [x] task-01: 出生阶段改 brainstorm——progress.js initChange/_readOrInit 两处 INSERT + db.js changes DDL 默认值（'scan'→'brainstorm'）
- [x] task-02: 存量迁移（db.js _createSchema v8）——active + current_stage='scan' + stages.scan='pending'（出生默认未动过）改写 'brainstorm' 并标 last_local_modified_ts；in-progress/completed/archived/主流程行不动；幂等可重入
- [x] task-03: DB_SCHEMA_VERSION 与 shared.js CURRENT_VERSION bump 8（戳失效触发迁移重跑）+ progress.js read() 的 _version 字面量 6 收敛为单一源 CURRENT_VERSION（v7 漏改的第五处漂移）
- [x] task-05: 阶段转换契约出生未入门态——stage-contract.js checkTransition 把「brainstorm 仍 pending/无行」视同辅助态（archive 放行 + 主流程直入放行），等价继承旧 scan 出生语义；真在 brainstorm 中（in-progress/completed）守卫不变（18 个存量测试文件的回归锚，测试⑤组覆盖）
- [x] task-04: 测试——新增 test/change-birth-stage-brainstorm.test.mjs 四组（出生/DDL 默认/迁移三类行/幂等）；随行为更新 5 处存量字面量（schema 守卫四处一致 8、ownership 戳 8、serialization 出生值+版本、pull 冲突保留出生值、get-change-stage 注册默认）
- [x] task-06: 评审 P3 双清偿——迁移条件扩「无 stages.scan 行」（registerChange 出生形态）+ FR-06 绑定断言计数措辞修正（task-05 后追加）
