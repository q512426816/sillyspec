# 决策知识 — progress

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-cli-entry-006@v1 change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-001@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。

## D-progress-001@v1 方案 A——DB 所有权（owner_session 列 v6 迁移 + last_active 心跳 + 锁内校验）
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-005@v1
锚点：未记录
最近确认：ee966ed
理由：用户选 A（2026-09-14 对话轮单字确认）：changes 表加 owner_session 列（schema v6 迁移，四处版本号同步——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version，附迁移测试）；last_active 既有刷新点即心跳（run 命令每次写操作更新，活跃窗 15 分钟可配 local.yaml change-ownership.heartbeat_minutes）；所有权校验内嵌 withMainRepoLock 锁内。拒绝 B（DB/文件双真相源+平台模式 specRoot 分裂锁易丢+与 last_active 重复）；拒绝 C（§65 实证 warn 挡不住代劳——对方会话不读 warn）。

## D-unmapped-258@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-flow-status-title
原编号：D-001@v1
锚点：test/flow-status-json.test.mjs
最近确认：0d7576c8d969d19ca20b4c561ad9c5e815c8f305
理由：最大风险：JSON 消费方对新增字段的兼容性——单对象加字段对 JSON.parse 消费方是非破坏性变更，风险低；人类渲染变更可能影响既有文本匹配测试（test/flow-status-json.test.mjs ③ 人类路径回归已覆盖关键行，本变更加 fixture 断言钉住新旧两态）。放弃的方案：① 在 flow-state.yaml 里冗余存 title（写两处状态有漂移风险，DB 已是权威源）；② status 输出全量改由 DB 驱动（超出本变更范围，且 flow-state/盘面事实才是 status 主源）。

## D-unmapped-340@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-thin-sync-stage
原编号：D-001@v1
锚点：未记录
最近确认：dff0cbf5a6dbac070f5063f88afa083760a7c241
理由：最大风险：平台读侧对 current_stage='thin' 的未验证消费面（如 pending_review 投影 `_map`）——已核：`_map` 无 thin 分支自然落 None；前端 STAGE_KIND/STAGE_LABELS 有 thin 既有条目；ingest 守卫谓词 row=='thin' 时跳过覆盖（同值幂等）。次风险：旧平台版本（无 thin 消费）收到 'thin'——StageEnum.THIN 自 2026-09-25 即在，裸 JSON 透传无校验拒绝面。 试过但放弃的方案：① 把本地 changes 行 current_stage 直接写 'thin'——动阶段机/本地展示/doctor 校验面，爆炸半径大且本地语义争议（thin 并非"阶段"）；② payload 加 tier 字段 + 平台 `_is_thin_lineage` 加第四分支——需同时改平台仓（跨仓双端协调），且 'thin' 阶段值平台消费面已全部就绪，加字段是重复信号。 已知边角（评审 P3-2，纯展示面、首次 run 自愈，不在本变更修）：平台 pull import 对 current_stage 零校验（既有语义），回写 'thin' 到本地行后、若该变更升厚（只改 flow-state tier 不重置行值），在首次真实 stage 运行重置行值前，上行载荷按行值持续报 'thin'——平台读侧短窗误标。自愈路径：升厚变更跑任一 run <stage> 即按阶段机重写行值。

## D-unmapped-443@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-overview-thin-stage
原编号：D-001@v1
锚点：未记录
最近确认：48da565007c0b7ca56622299ee1f0feadf769380
理由：- 最大风险：`STAGE_LABELS` 新增 thin 键被未发现的消费方当阶段清单遍历，产生幽灵阶段——已全源码核查无 `Object.keys/entries/values(STAGE_LABELS)` 用法，且 `VALID_STAGES`（阶段表 INSERT/迭代唯一源）不动，级联与 validate 零影响；既有测试面（收口实测）兜底。 - 放弃①daemon 侧后处理（SillyHub daemon 读 flow-state 覆写 current_stage）：把 CLI 的 flow-state 格式知识复制进 daemon 仓，且 conflictSnapshot progress 条目（比对弹窗本地侧）同样源自 CLI envelope，daemon 后处理要修两处——CLI 单点修一处收全链，弃。 - 放弃②overview 对 thin 省略 steps/stages 键：daemon asCount 把缺省强转 0/0，省略对下游显示是 no-op，纯增 envelope 契约噪音（steps 从必有变可有，backend schema 跟动），弃。 - 放弃③把 'thin' 加入 VALID_STAGES/阶段表：thin 不走阶段机（sync 侧注释明示口径），建空阶段行会扰动 completeStage 级联与 consistency 校验，弃。
