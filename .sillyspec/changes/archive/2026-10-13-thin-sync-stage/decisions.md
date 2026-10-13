---
author: flow-machine-draft
created_at: 2026-10-13T04:55:17.072Z
---
# 决策记录（Decisions）— 2026-10-13-thin-sync-stage

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：平台读侧对 current_stage='thin' 的未验证消费面（如 pending_review 投影 `_map`）——已核：`_map` 无 thin 分支自然落 None；前端 STAGE_KIND/STAGE_LABELS 有 thin 既有条目；ingest 守卫谓词 row=='thin' 时跳过覆盖（同值幂等）。次风险：旧平台版本（无 thin 消费）收到 'thin'——StageEnum.THIN 自 2026-09-25 即在，裸 JSON 透传无校验拒绝面。 试过但放弃的方案：① 把本地 changes 行 current_stage 直接写 'thin'——动阶段机/本地展示/doctor 校验面，爆炸半径大且本地语义争议（thin 并非"阶段"）；② payload 加 tier 字段 + 平台 `_is_thin_lineage` 加第四分支——需同时改平台仓（跨仓双端协调），且 'thin' 阶段值平台消费面已全部就绪，加字段是重复信号。 已知边角（评审 P3-2，纯展示面、首次 run 自愈，不在本变更修）：平台 pull import 对 current_stage 零校验（既有语义），回写 'thin' 到本地行后、若该变更升厚（只改 flow-state tier 不重置行值），在首次真实 stage 运行重置行值前，上行载荷按行值持续报 'thin'——平台读侧短窗误标。自愈路径：升厚变更跑任一 run <stage> 即按阶段机重写行值。
