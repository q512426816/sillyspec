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

## D-progress-002@v1 2026-11-04-junction-guard-rename-content——两处独立小修，均为 2026-11-04 跨工作区污染事故的护栏（根因已修：本机 daemon junction 错绑重指）：① progress.js res
状态：implemented
变更：2026-11-04-junction-guard-rename-content
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-04-junction-guard-rename-content/design.md
文件：src/progress.js, src/spec-sync.js, test/junction-guard-rename-content.test.mjs
最近确认：14e690991ecfdedc8f66c3bfc3590a296f57863f
理由：两处独立小修，均为 2026-11-04 跨工作区污染事故的护栏（根因已修：本机 daemon junction 错绑重指）：① progress.js resolvePlatformSpecDir 的 pointer 分支在返回前对解析结果做 git 根比对——cwd 与 specRoot 分属不同 git 仓时 console.warn 跨仓告警（错绑当场可见，此前 CLI 忠实跟随错绑指针零提示）；② spec-sync.js computeSpecOps 的 rename op 增携 content（base64，与 add/update 同款）——服务端源行缺失时不再 422 拒整批（生产实证 5 连败卡死文件树通道）。两者都是「让既有故障形态可见/不放大」，不改任何正确路径行为。
