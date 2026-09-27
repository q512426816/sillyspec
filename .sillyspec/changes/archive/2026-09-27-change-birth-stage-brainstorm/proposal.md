---
author: flow-machine-draft
created_at: 2026-09-27T12:42:47.562Z
---
# 提案书（Proposal）— 2026-09-27-change-birth-stage-brainstorm

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:1d3a96a29494fc4803f1e2df45b29580ad081ddfbd3fac2b5e2bb3c77a5a5119:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
任务原话转写：变更出生阶段误显「🔍 代码扫描」——changes 行出生 current_stage 硬编码 'scan'，thin/quick 等从不进主流程的变更全生命周期都显示代码扫描（本仓 multi-agent-platform 的 2026-09-27-governance-rpc-actions 实证），与 shared.js 已声明的 scan=auxiliary 语义矛盾。用户裁定：变更起步就是头脑风暴。
成功标准：
- initChange / _readOrInit 新建 changes 行 current_stage='brainstorm'（db.js DDL 默认值同步）
- 存量库迁移：active 且 current_stage='scan' 且 stages.scan='pending'（从未真跑 scan）的行改写为 'brainstorm'；真在跑/跑完 scan 的行不动
- DB_SCHEMA_VERSION 与 shared.js CURRENT_VERSION bump 8 触发戳失效重跑迁移，幂等可重入
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:ce47b672ef2a5c1019dd5578598d3cc0d0d9f0a378003d02f1e689f9a0826c75:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. initChange / _readOrInit 新建 changes 行 current_stage='brainstorm'（db.js DDL 默认值同步）
2. 存量库迁移：active 且 current_stage='scan' 且 stages.scan='pending'（从未真跑 scan）的行改写为 'brainstorm'
3. 真在跑
4. 跑完 scan 的行不动
5. DB_SCHEMA_VERSION 与 shared.js CURRENT_VERSION bump 8 触发戳失效重跑迁移，幂等可重入
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:d5fe0196119f12f8ec0df888be8263366d0207891044fa4be6ed82bb2bd4546b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
1. initChange / _readOrInit 新建 changes 行 current_stage='brainstorm'（db.js DDL 默认值同步）
2. 存量库迁移：active 且 current_stage='scan' 且 stages.scan='pending'（从未真跑 scan）的行改写为 'brainstorm'
3. 真在跑
4. 跑完 scan 的行不动
5. DB_SCHEMA_VERSION 与 shared.js CURRENT_VERSION bump 8 触发戳失效重跑迁移，幂等可重入
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
