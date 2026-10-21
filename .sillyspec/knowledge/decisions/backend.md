# 决策知识 — backend

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-backend-018@v1 : plan 模式采用强确认交互
状态：implemented
原编号：D-001@v1
锚点：`frontend/src/components/daemon/plan-approval-card.tsx`
最近确认：04bb45fe
理由：强确认，类似 askuser 弹窗。

## D-backend-019@v1 : 变更删除权限口径 = 变更 owner + 工作区所有者 + 平台管理员
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-001@v1
锚点：`backend/app/modules/change/router.py`
最近确认：0ec935c9
理由：DELETE /workspaces/{ws}/changes/{cid} 组合依赖——require_permission(Permission.CHANGE_ARCHIVE)（workspace_owner 角色内置、platform_admin 短路）OR change.owner_id==当前用户；owner 取当前值并接受漂移语义（owner=最新推送人），owner 为空（从未上行进度）时仅前两者可删。名称末段输入防呆 + change_events 审计兜底误删面（R-04）。

## D-backend-020@v1 : 平台删除 = 软删隐藏 location='deleted'，不做恢复 UI
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-002@v1
锚点：`backend/app/modules/change/service.py`
最近确认：0ec935c9
理由：Change 行置 location='deleted' 第三区（active/archive 两 tab 显式传参天然不显示，读端 enrich 对 deleted 前置过滤）；镜像文件移 30 天备份区 + manifest platform_deleted 墓碑；写 change_events delete 审计（行保留故 FK 不级联丢审计）；不物理删不做恢复界面（未上线允许 DB 人工恢复，规则 11）。

## D-backend-021@v1 : 删除自动收敛 = 方案 A 镜像驱动收敛（+CLI 墓碑上报增强）
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-005@v1
锚点：`backend/app/modules/spec_workspace/service.py`
最近确认：0ec935c9
理由：平台以镜像文件树为唯一权威：apply_ops 幽灵空目录清理 → scoped reparse 定向删除（R-08 收窄：仅 scope∩磁盘确认消失可删，scope 外零动作）→ 删除环顺手清 progress 行 → platform_deleted 四通道拦截。拒 B（墓碑上行驱动——旧版 CLI 不发墓碑照旧残留、且平台删除入口仍需 A 的防复活基建）、拒 C（全量对账常态化——Windows bind mount stat 性能断崖 + 全量 reparse 93s 超时史）。误删面最小（scope 收窄 + 7 天占位保护 + 30 天备份区）；CLI 墓碑上报为收敛加速器，平台闭环不依赖。

## D-backend-022@v1 : Design Grill 加固 — 删除环豁免 deleted 行 + 持久锚点兜底 + 落盘级拦截
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-006@v1
锚点：`backend/app/modules/platform_sync/service.py`
最近确认：0ec935c9
理由：B-1/B-2 修复三点：① scoped 与全量两处删除环 + _apply_parsed 更新路径均豁免 location='deleted' 行（不删不回翻，审计不 CASCADE 丢失、锚点行保活）；② _ensure_change_row 拒收双层——Change 行 location='deleted' 为主判据，行缺失时兜底探测 manifest platform_deleted 前缀（LIKE 转义 %/_，变更名含下划线常见）；③ _write_spec_root 落盘集计算阶段排除 platform_deleted 前缀路径（文件不落盘断 parser 复活链，仅挡 manifest 对齐环不够——tar 落盘在先）。附带修正：delete op 对 platform_deleted 幂等放行（仅拦 add/rename）、spec-bundle 鉴权口径 _write_auth、progress 拒收 409 用 code=change_deleted 结构化区分。

## D-backend-001@v1
状态：implemented
变更：2026-08-25-session-spec-binding
原编号：D-002@v1
锚点：backend/migrations/versions/20260825223000_add_quicklog_session_links.py（播种）
最近确认：a9b06c98
理由：links 为唯一关联真相：读侧全部改走 links；alembic 一次性把存量 change_id 播种成 link 行（ON CONFLICT DO NOTHING）；change_id 列保留并继续写入（创建时锚定主变更的冗余提示，双写），后续变更再评估删列。

## D-backend-023@v1 : raw 端点 50MB 上限 + inline disposition
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-006@v1
锚点：backend/app/modules/change/router.py（files/raw）
最近确认：5d86ddb1
理由：MAX_RAW_BYTES=50MB（变更目录为原型图/文档，远超文本端点 1MB 但无需无限）；Content-Disposition: inline + RFC5987 filename*（前端 XHR 取 blob，disposition 仅供直开兜底）。超限 413。

## D-backend-002@v1 : 数据链路走方案 A——git_log 模块扩展独立轻量 status 端点
状态：implemented
变更：2026-08-26-workspace-git-status
原编号：D-002@v1
锚点：backend/app/modules/git_log/router.py
最近确认：86d6c405
理由：复用 git_log 模块与 host-fs 平名通道，daemon 加单方法 git_status、backend 加 GET /git-log/status、前端共享组件。

## D-backend-024@v1 : 群聊触发模式 = @提及 + 独立记忆
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-001@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：@昵称触发对应 agent、@全体广播；每 agent 影子会话独立记忆；未被 @ 的消息仅进群背景摘要（最近 N 条含 agent 回复，身份标签+截断）。openclaw mention-gating 同构，防刷屏。

## D-backend-025@v1 : 群聊架构 = 影子会话桥接
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-002@v1
锚点：`backend/app/modules/daemon/run_sync/service.py`
最近确认：9531f7228
理由：群会话（kind='group'）统一时间线 + 每 agent 成员影子会话（kind='group_member'）独立记忆 + 事务内双写投影行桥接回群；复用 interactive lease/排队/SSE/热切换管线，单聊零改动。备选独立群聊域（2-3 倍工作量）与 mission 扩展（任务/聊天语义冲突）被否。

## D-backend-026@v1 : 群成员模型 = 显式邀请制
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-003@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：建群拉 workspace 用户+配置 agent 成员；仅群成员可看可聊（两段式判定：成员命中→workspace admin 兜底→404 不泄露存在性）。

## D-backend-027@v1 : agent 成员六要素 + 群聊中随时热切换
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-004@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：昵称（@提及词全局唯一）/机器/工作区/引擎/模型/方案（AgentProfile）；模型组切换 SESSION_SWITCH_CONFIG 下轮生效记忆延续；机器组切换影子重建重置记忆（确认提示）。

## D-backend-028@v1 : 协作模式 = openclaw 同构平等成员（人格即角色）
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-005@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：无固定角色系统/派活工具/角色模板；agent 间关联靠群背景摘要被动互见+@全体广播+互@协作（开关默认开带护栏）。分工是人格/工具/工作区配置的自然涌现。

## D-backend-029@v1 : agent 互@协作群级开关默认开 + Redis 防环护栏
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-006@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：agent 回复最终文本中的 @昵称 与用户 @ 同管线触发（注入标注来源成员）；护栏 Redis 双轨——group_chain Hash 去重+depth（TTL 30min，DB metadata 兜底）+group_rate 滑窗限频 6/分；不自我触发；关闭时 @ 为纯文本。

## D-backend-030@v1 : 影子会话不挂 parent_session_id（成员表反向指针）
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-007@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：parent 恒 NULL、群↔影子经 agent_group_members.shadow_session_id 关联——规避 5 处以 parent 非空为 worker 唯一口径的链路（停机挂起/离线 sweep/自动恢复/自动重派/闸收口）误杀影子。

## D-backend-031@v1 : 桥接投影 = 事务内双写投影行（新 PK）+ 群频道事件携投影行 id
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-008@v1
锚点：`backend/app/modules/daemon/run_sync/service.py`
最近确认：9531f7228
理由：submit_messages 事务内插投影行（新 uuid PK 防撞影子行/dedup_key 复用/metadata 身份），群频道事件 log_id=投影行 id——实时与回放同 id 去重闭环；仅投影 assistant 文本；override 按载体 run+segment DELETE。复用原 log_id 会 PK 冲突（Grill P0 修正）。

## D-backend-032@v1 : 昵称全局唯一（用户与 agent 共用命名空间）
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-009@v1
锚点：`backend/app/modules/agent/model.py`
最近确认：9531f7228
理由：UNIQUE(group_id, display_name) 全量唯一（含已移除行——查重须全量口径否则撞约束 500，P1 修复 743e9e1c）；@路由无歧义。

## D-backend-033@v1 : 群时间线 = 平铺消息流全局 timestamp 排序
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-011@v1
锚点：`frontend/src/components/group-chat/group-chat-panel.tsx`
最近确认：9531f7228
理由：实时事件与回放读库统一按 log timestamp 全局排序、忽略 run 分组——get_agent_session_logs 的 run 锚分组会把迟到回复"吸回"触发消息组，与实时顺序失真。

## D-backend-034@v1 : 群聊首期取舍（审批/计量/排队快照/run 视图/typing）
状态：implemented
变更：2026-09-01-session-group-chat
原编号：D-012@v1
锚点：`backend/app/modules/daemon/group/service.py`
最近确认：9531f7228
理由：影子 manual_approval=False（审批不进群）；计量归群主（影子 user_id=群主）；排队消息按入队时刻摘要快照派发；群不消费 run 级视图；typing/presence 纯 ephemeral（Redis TTL，不落库不进上下文）；群不绑 change_id。

## D-backend-006@v1 恒读 SQLite，文件仅作失败兜底
状态：implemented
变更：2026-09-10-zcode-session-sqlite-read
原编号：D-001@v1
锚点：未记录
最近确认：20cf7bc46
理由：恒读 SQLite（文件存在也不读文件）；库读失败（schema 漂移/库损坏/会话不在库/node:sqlite 不可用）才回落文件路径。

## D-backend-035@v1 DB 路径不截断，仅文件回落路径保留 256KB
状态：implemented
变更：2026-09-10-zcode-session-sqlite-read
原编号：D-002@v1
锚点：未记录
最近确认：20cf7bc46
理由：不截断——按会话查询天然有界，对话窗口即上界；仅 read_file 回落路径保留原 256KB 截断语义。

## D-backend-036@v1 伪 jsonl 固定九字段封闭序列化
状态：implemented
变更：2026-09-10-zcode-session-sqlite-read
原编号：D-007@v1
锚点：未记录
最近确认：20cf7bc46
理由：NormalizedLogMessage 九字段（seq/kind/text/tool_name/tool_use_id/tool_input/tool_result/is_error/ts）逐行全量 JSON，封闭列举；content 回落捕获范围含 not_found/method_not_found（老 daemon）/离线/超时。

## D-backend-037@v1 : 平台用户头像存文件中心（users.avatar URL 列）
状态：implemented
原编号：D-001@v1
锚点：`repo://sillyhub/backend/app/modules/auth/model.py:53`
最近确认：41c3b37
理由：2026-09-10-account-avatar-upload——users.avatar VARCHAR(512) NULL 存 /api/file/{id} 或外链（与 agent/群成员头像同构）；上传走既有文件中心端点（owner_type=user_avatar），渲染复用 useAvatarSrc blob 管线，零新存储设施；否决独立公开头像服务（隐私面大）与 base64 存 DB（膨胀）。

## D-backend-038@v1 : 群聊用户成员头像后端回落解析（member.avatar or user.avatar）
状态：implemented
原编号：D-002@v1
锚点：`repo://sillyhub/backend/app/modules/daemon/group/service/helpers.py:699`
最近确认：41c3b37
理由：2026-09-10-account-avatar-upload——读取路径对 user 成员做平台头像回落（群内自定义优先，NULL/'' 均回落；agent 成员不动），前端零改动即生效；_to_read 同步函数不直查 users 表，crud 调用点批量预取 select in 免 N+1；读取端解析非快照，平台头像更新群读实时取新值。

## D-backend-007@v1 ctx_tokens 派生位置——归一化器源头上报处派生（方案 A），否决消费侧统一派生（方案 B/C）
状态：implemented
变更：2026-09-13-ctx-usage-all-providers
原编号：D-001@v1
锚点：sillyhub-daemon/src/interactive/providers.ts:ProviderCaps（caps 键落点）+ sillyhub-daemon/src/interactive/usage-ctx.ts:ctxTokensFromNetInput（公式单源落点，execute 新建）
最近确认：未记录
理由：用户原话指定方向：「都要接入的，并且需要统一抽象出来（我记得最近刚刚做了个统一抽象的事情，就是怕后面再接新 agent 又遗漏一些功能）」。据此选方案 A（各归一化器在 usage 构造处用共享 helper 派生 + ProviderCaps 第 11 键声明走既有三端生成与守护链）。

## D-backend-016@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-004@v1
锚点：repo://sillyhub/sillyhub-daemon/src/agent-log/parse-zcode-model-io.ts:66（NormalizedLogMessage）、repo://sillyhub/backend/app/modules/platform_sync/router.py:849（messages 端点）
最近确认：53c67e02a
理由：四层打通——daemon 解析器透传 usage/turn/model/耗时 + 全会话累计 → RPC 返回结构 → 平台 GET /agent-logs/{id}/messages schema → gen:types → 前端映射到 SessionTurnView token 字段与会话用量环；老 daemon 字段可选、缺省显示「未知」；cursor-agent 回放 token 恒「未知」（数据不落盘，非解析器可解）

## D-backend-017@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-008@v1
锚点：decisions.md D-001/D-004/D-007
最近确认：53c67e02a
理由：方案A——前端适配器把 NormalizedLogMessage[] 映射为 SessionTurnView 喂 TurnTimeline 真组件；daemon zcode 解析器补 usage/turnId/model/累计 + 新增 claude-code、cursor-agent 解析器与 cursor-agent 扫描上报；平台 messages schema 加可选字段 + gen:types；平台库零表结构改动，按需现读

## D-backend-003@v1 定时发送的实现方案
状态：implemented
变更：2026-09-07-session-pin-rename-scheduled-send
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：**方案 B：新建 `agent_session_scheduled_messages` 表 + 独立 sweeper 常驻协程**。到点扫描 due 条目，逐条复用 `inject_session_as_service`（忙轮自动入 `agent_session_queued_messages` 既有队列），单条状态 pending → dispatched / cancelled / failed，失败隔离。

## D-backend-039@v1 定时到点时队列满员的处理
状态：implemented
变更：2026-09-07-session-pin-rename-scheduled-send
原编号：D-003@v1
锚点：未记录
最近确认：35f3d6528
理由：**置 failed 并落 error_code=queue_full**（不盲发不丢弃，失败原因用户可见，可取消重建）。不选满员自动延后重试。

## D-backend-004@v1 根治方案选 A——全链强制 workspace_id + daemon 映射查根
状态：implemented
变更：2026-09-09-conflict-root-workspace-scoping
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：**方案 A**。对比 RPC `sillyspec_conflict_snapshot` 与裁决指令 `sillyspec_resolve` 全链（REST 请求体 → WS payload → daemon 消息处理 → 前端弹窗下传）强制携带 `workspace_id`；daemon 用 `_sillyspecStatusRoots.get(workspaceId)` 解析根，**映射未命中不得回退单槽位**，抛 RpcError `workspace_root_unknown`（提示该工作区尚未被本机会话认领）；无 workspace_id 的旧调用形态保留单槽位 legacy 语义。辅防：无 workspaceId 的 claim 不再覆盖单槽位。与根因文档 `docs/sillyspec/conflict-compare-wrong-status-root.md` 已定稿口径一致。

## D-backend-005@v1 P0-2 独立配额池的作用域与实现层次
状态：implemented
变更：2026-09-10-review-dispatch-platform-fixes
原编号：D-002@v1
锚点：未记录
最近确认：f1bdbef95
理由：用户原话「支持按 workspace 或按 agent_profile 独立配置（独立池或不同 provider）」。探查证实 profile 绑定链路已全通，真缺口=llm_provider schema 锁死 claude + daemon injector REGISTRY 无 pi；补齐后 per-(user, agent_kind=pi) 默认与 profile/workspace(default_agent_profile_id) 两条路都开放，不在本变更里强选一条。

## D-backend-040@v1 P1-3 生效执行器暴露位置
状态：implemented
变更：2026-09-10-review-dispatch-platform-fixes
原编号：D-003@v1
锚点：未记录
最近确认：f1bdbef95
理由：用户原话「或至少在 mcp-tokens 签发响应/get_daemon_status 里暴露当前生效执行器」。选 get_daemon_status：mcp-tokens 是签发时快照会陈旧，token 是长期凭证不该背 status 类实时信息；daemon 注册/心跳已上报 providers（DaemonRuntime 现成数据）。「管理员把 default_agent 设为 pi」为运维动作随交付文档给出。

## D-backend-041@v1
状态：implemented
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-002@v1
锚点：backend/app/modules/platform_sync/service.py（_upsert_agent_log_entries_once 归属段）
最近确认：353eb11b0
理由：ctx-owner 解析——按 entry 自身 ctx（quick 优先）解析「主」会话：已绑定该 ctx 的会话（change/quicklog links，含平台派发会话与自动会话）取最近活跃者优先挂；无主则 find-or-create 自动会话。跨 harness 不限制（平台 pi 会话 + 本地 zcode 同变更聚到一起）

## D-backend-042@v1
状态：implemented
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-003@v1
锚点：backend/app/modules/platform_sync/service.py（find-or-create 段）
最近确认：353eb11b0
理由：沿用现有 find-or-create origin=tool_report 自动会话；聚合键从 "{harness}|{ctx}" 改为 "{ctx}"（同 ctx 跨 harness 聚合进同一会话），标题改「本地 · {ctx}」；空 ctx 保持 workspace+harness 单桶现状

## D-backend-043@v1
状态：implemented
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-005@v1
锚点：未记录
最近确认：353eb11b0
理由：不动表结构——保留 agent_session_id 单列，靠打标修复 + ctx-owner 解析保证正确性；一条日志行只挂一个会话（其 ctx 的当前 owner），同 ctx 多会话时向最近活跃 owner 漂移

## D-backend-008@v3 pi/codex 结果回传定案 ws RPC（send_rpc + registerRpcHandler），砍 SESSION_COMPACT 控制机器
状态：implemented
变更：2026-09-14-session-ctx-compact
原编号：D-003@v3
锚点：未记录
最近确认：1aacbb3d9
理由：复用既有 ws RPC 请求-结果通道：backend 端点 ws_hub.send_rpc(daemon_id, 'session_compact', {session_id}, timeout=15)（repo://sillyhub/backend/app/modules/daemon/ws_hub.py:502-560，DaemonRpcTimeout/Offline/RemoteError 异常齐备）；daemon 侧 registerRpcHandler('session_compact')（repo://sillyhub/sillyhub-daemon/src/daemon.ts:6438-6456 既有四先例）→ sessionManager.compact → CompactResult 即 RPC result。SESSION_COMPACT 控制机器三件套（backend protocol.py/control_commands.py + daemon protocol.ts/daemon.ts 三点接线）全部弃用；「无 schema 迁移 / control-dispatcher 零改动」在 v3 下为真。
supersedes：D-003@v2（仅回传机制部分，其余维持）

## D-backend-009@v1 反馈呈现=端点响应回执 + 前端通知三分型
状态：implemented
变更：2026-09-14-session-ctx-compact
原编号：D-004@v1
锚点：未记录
最近确认：1aacbb3d9
理由：端点响应承载回执，前端按 provider 分型通知：pi「已压缩：X → 约 Y tokens」（数字来自 RPC response）/ codex「已触发上下文压缩」（受理无数字）/ claude「已发送 /compact（压缩轮运行中）」（流程可见性由会话流中的 /compact 轮本身承载）；失败通知带 error 原文（如 pi "Nothing to compact"）。

## D-backend-010@v1 架构=compact 同款 RPC 模式（可选 driver 方法+daemon RPC handler+caps 键）
状态：implemented
变更：2026-09-14-session-thinking-level
原编号：D-002@v1
锚点：未记录
最近确认：28915f71b
理由：方案 A：照 2026-09-14-session-ctx-compact 刚验证的 RPC 模式——driver.ts 加可选 `getThinkingLevels?(handle)`/`setThinkingLevel?(handle, level)` 两契约方法；daemon.ts 注册 `session_get_thinking_levels`/`session_set_thinking_level` 两 RPC handler；backend 两端点（GET 档位列表+POST 切换）；caps 第 13 键 `thinking_level`（claude/pi/codex=true、cursor=false）。B（进程重启式）否决：切档重启子进程丢流式状态体验差；C（inject 文本）否决：pi/codex 不认文本且档位查询无通道。

## D-backend-044@v1 顺序归属——每人一套（user-scoped order）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-001@v1
锚点：未记录
最近确认：e21bf19cc
理由：每人一套（用户 2026-09-14 explore 会话 AskUserQuestion 亲答）。新表 `user_workspace_orders(user_id, workspace_id, sort_position)`。

## D-backend-011@v1 保留服务端分页（量级一两百）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-002@v1
锚点：未记录
最近确认：e21bf19cc
理由：一两百个量级，服务端分页（12/页 limit/offset）保留，不做"加载全部"改造。

## D-backend-045@v1 新建工作区落位——最前
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-004@v1
锚点：未记录
最近确认：e21bf19cc
理由：最前。与现状 `created_at DESC`（最新在前）感知一致；SQL 语义=排序行缺失（NULL）优先于一切已有位置。

## D-backend-046@v1 move 端点鉴权——登录 + 对目标 workspace 有 WORKSPACE_READ
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-007@v1
锚点：未记录
最近确认：e21bf19cc
理由：登录用户且对目标 workspace 具备 WORKSPACE_READ（与列表可见性一致）。per-user 顺序只影响本人视图，无需管理员/owner 门槛。锚点目标卡（after_id/before_id）不在该用户可见集合时 422。

## D-backend-013@v1 数据层实现——方案 A（排序表 + 浮点中点锚点）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-011@v1
锚点：未记录
最近确认：e21bf19cc
理由：方案 A（用户 brainstorm Step 4 AskUserQuestion 亲选）。理由：唯一同时满足锚点跨页（客户端只需边界卡 id）+ 保住现有服务端 limit/offset 分页与四路筛选 SQL（LEFT JOIN 原生 ORDER BY）+ 每次拖拽 O(1) 单行写入；B 把排序挤到应用层与分页 SQL 冲突且全量写放大；C 跨设备不同步、分页下无法独立排序。淘汰记录：B 违反 D-002 精神（架空服务端分页）、C 违反 D-001（顺序非服务端持久）。

## D-backend-047@v2 backfill 幂等化 + 位置方向勘误
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-006@v2
锚点：未记录
最近确认：e21bf19cc
理由：①backfill 幂等化：每次 move 事务首步 INSERT..SELECT WHERE NOT EXISTS，对（可见 ∧ active+archived ∧ 无行）全集物化，无行组整体赋在现有最小位置之下、组内 created_at DESC——锚点卡永远有行，物化前后显示序零变化。②初始/新增物化位置按 created_at DESC 赋 row_number×1024 **递增**序列（v1"递减"为笔误，display 顺序语义以 design 公式为准）。
supersedes：D-006@v1

## D-backend-014@v1 边缘投放带锚点由服务端页相对解析（to 枚举 + rank 响应）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-012@v1
锚点：未记录
最近确认：e21bf19cc
理由：投放带请求改 `{to: "next_page_head"|"prev_page_tail"}`（可选 page_size 默认 12），服务端在默认视图有序序列（可见 ∧ active ∧ 未删，按显示序）上定位被移动卡 rank、按分页数学解析目标插入 rank，再走统一中点路径；响应携带移动后 rank，前端 floor(rank/page_size) 换算目标页自动翻页+高亮。否决客户端预取相邻页方案：每次拖拽多两请求且边界卡在并发移动下会过期，分页数学在客户端重复实现必再出 off-by-one。

## D-backend-048@v1 move 请求契约修订——三选一锚点、无 null 置顶、自锚 422
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-013@v1
锚点：未记录
最近确认：e21bf19cc
理由：①锚点三选一：after_id / before_id / to 恰好一个出现，全为非 null uuid 或枚举值；置顶场景由弹窗页首锚点表达，删除 null 置顶语义。②锚点有效性 = 存在 ∧ 在可见集合 ∧ deleted_at IS NULL ∧ status ∈ {active, archived}（与 D-006@v2 物化范围对齐），违反 422 HTTP_422_MOVE_ANCHOR_NOT_VISIBLE。③自锚 422 HTTP_422_MOVE_ANCHOR_SELF（前端正常流程不会发，作契约兜底）。

## D-backend-012@v2 边缘投放带锚点表达改 to 枚举（UX 不变）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-003@v2
锚点：未记录
最近确认：e21bf19cc
理由：维持边缘投放带路线（用户 explore 亲选的 UX 不变），仅锚点表达从客户端 id 锚点改为 `{to: next_page_head|prev_page_tail}` 服务端解析（D-012）。v1 的锚点写法作废；翻页+高亮闭环承诺保留。
supersedes：D-003@v1

## D-backend-015@v1 分页数量不变量——move 是纯重排
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-014@v1
锚点：未记录
最近确认：e21bf19cc
理由：不允许（用户 2026-09-14 明确约束）。move 只做单行 sort_position 更新，不增删任何行；任何移动后 total 不变、每页恒 PAGE_SIZE 张（末页允许不满），跨页移动=源页少一张/目标页多一张后重新切片。

## D-unmapped-013@v1 : 三条线打包 = 单变更三波交付（+revision 1 并入波 4）
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-003@v1
锚点：未记录
最近确认：0ec935c9
理由：删除收敛+防复活基建（波 1）/删除入口（波 2）/拉取口子（波 3）一个变更三波，波与波共享防复活基建（波 1 建）；进行中可见性经 revision 1 重开 brainstorm 并入为波 4——与波 1-3 同文件（platform_sync/change/changes 页面），并入避免并行变更冲突（规则 19）。跨仓配套（X1-X4）以 repo: sillyspec 任务卡入列，不另开变更。

## D-unmapped-018@v1 : 会话继承触发范围
状态：implemented
变更：2026-08-29-batch-session-inherit
原编号：D-001@v1
锚点：未记录
最近确认：HEAD
理由：仅 infra 中断继承——lease 过期自动重派（daemon 掉线/断连）attempt+1 继承原会话继续；lease 内 spawn 重试维持现状清空 resume（R-10 防副作用）；手动重跑走 dispatch_to_daemon 全新 lease 天然新会话

## D-unmapped-019@v1 : 方案选型 A 最小闭环
状态：implemented
变更：2026-08-29-batch-session-inherit
原编号：D-003@v1
锚点：未记录
最近确认：HEAD
理由：A——backend handle_lease_expiry 继承原 lease metadata+注入 resume_session_id/work_dir；daemon work_dir 同一性守卫+resume 失败降级。零迁移零新端点零前端，全消费既有链路

## D-unmapped-020@v1 : 设计整体确认
状态：implemented
变更：2026-08-29-batch-session-inherit
原编号：D-004@v1
锚点：未记录
最近确认：HEAD
理由：确认。变更名 2026-08-29-batch-session-inherit；无 UI 变化不产出 HTML 原型

## D-unmapped-021@v1 : P0 方向重定位——worker 重派继承（Grill C-01 裁定）
状态：implemented
变更：2026-08-29-batch-session-inherit
原编号：D-005@v1
锚点：未记录
最近确认：HEAD
理由：转向 worker 重派继承——interactive worker 会话（AgentSession.role 含 worker 或 parent_session_id 非空）daemon 掉线后不 suspended 而是 failed+自动重派继承原会话（worker 是临时会话无人手恢复，挂起无意义）；主会话（orchestrator/用户 chat）保持挂起语义不变

## D-unmapped-033@v1 : 团队=会话内能力而非独立会话类型
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-001@v1
锚点：未记录
最近确认：4d7adc1d
理由：用户明确：团队类似子代理——当前会话的 agent（主控）通过 MCP 工具派分身（worker），进度与结果回到当前消息流，全程不离开对话。不新增会话类型、不新增列表条目、没有独立团队页面。

## D-unmapped-034@v2 : 团队工具常驻注入（Claude 引擎，分身会话除外）
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-002@v2
锚点：未记录
最近确认：4d7adc1d
理由：谓词收窄：provider==='claude' 且 stage 非 worker 标识（stage 为空=普通会话或 'orchestrator'=存量主控 → 注入；分身角色/'mission_worker' → 不注入）。用户授权来源同 v1（按推荐继续）。
supersedes：D-002@v1

## D-unmapped-035@v1 : 一期 Claude 专属，Codex 按钮置灰
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-003@v1
锚点：未记录
最近确认：4d7adc1d
理由：一期仅在 Claude 引擎会话提供团队能力；Codex 会话中触发入口置灰并提示「团队需要 Claude 引擎」。Codex MCP 注入另立后续变更（codex driver 契约注释已标"留后续任务"）。

## D-unmapped-036@v1 : 触发四路等价
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-004@v1
锚点：未记录
最近确认：4d7adc1d
理由：原型 v2 确认四条等价路径：①输入区「派团队」按钮+配置弹层 ②/team 指令前缀 ③自然语言（agent 常驻工具自主判断）④AskUser 卡选择。四路最终统一到同一条后端链路（显式预建或懒建 mission）。

## D-unmapped-037@v1 : 删除独立团队页面与入口
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-005@v1
锚点：未记录
最近确认：4d7adc1d
理由：删除 /workspaces/[id]/missions、/projects/[id]/missions 两个页面路由、mission-console 组件与「Agent 团队」菜单项；普通会话面板的「用团队分析」按钮改为在当前会话直接触发团队；历史 mission 数据不做迁移（项目未上线允许重置）。

## D-unmapped-038@v1 : AgentMission 新增 session_id 列绑定发起会话
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-006@v1
锚点：未记录
最近确认：4d7adc1d
理由：代码查证：AgentMission 无 session_id 列，旧"用团队分析"把 session_id 塞 constraints JSON 且全链路无消费（死参数）。本变更新增 agent_missions.session_id 列（FK agent_sessions，索引），废弃 constraints.session_id 约定。

## D-unmapped-039@v2 : worker 派发链路复用（治理门查询加判别）
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-007@v2
锚点：未记录
最近确认：4d7adc1d
理由：收窄为"派发链路（worktree/scope 校验/治理门规则/预算扣减）复用"；control.py 等查询条件加 role!='orchestrator' 判别。
supersedes：D-007@v1

## D-unmapped-040@v1 : 会话结束与团队任务并存
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-008@v1
锚点：未记录
最近确认：4d7adc1d
理由：worker 独立 lease 存活不受会话影响；mission 收敛由主控工具调用与 patrol 兜底完成；用户重新开启会话（reopen 基建已有）可继续看到任务块与结果。

## D-unmapped-041@v1 : 主控轮双标记 mission_id + role='orchestrator'
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-009@v1
锚点：未记录
最近确认：4d7adc1d
理由：会话存在活跃 mission 时 inject 当轮 AgentRun 回填 mission_id + role='orchestrator' 双标记；_get_main_run 取该 mission 最新 orchestrator run（存量 external mission 同规则天然兼容）；治理门/统计查询加 role!='orchestrator' 判别。

## D-unmapped-042@v1 : converge 语义重定义（session 定位 + busy 引导 + 独立置位）
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-010@v1
锚点：未记录
最近确认：4d7adc1d
理由：converge 按 X-Session-Id 解析 mission；分身未全终态返回 status=busy 引导 agent 等待；全终态直接置 converged_at（不依赖主控 run 状态）→ finalize 锚点=最新 orchestrator run；响应 status ∈ converged/busy/conflict/needs_manual。

## D-unmapped-043@v1 : 旧 mission 端点删除范围精确化
状态：implemented
变更：2026-08-22-team-session-unify
原编号：D-011@v1
锚点：未记录
最近确认：4d7adc1d
理由：删除范围=create+list 四端点及对应前端 client；保留 GET /missions/{id}、POST /missions/{id}/cancel、全部 MCP 端点；team-progress.tsx 不动。

## D-unmapped-053@v1 : ctx 指标落库（AgentRun 加列）
状态：implemented
变更：2026-08-27-session-token-usage-fix
原编号：D-002@v1
锚点：未记录
最近确认：c7f48562
理由：落库。不落库则刷新页面/重进会话后上下文环拿不到数值。项目未上线（CLAUDE.md 规则 11），允许直接加列迁移。

## D-unmapped-054@v1 : 历史会话（无 ctx 数据）环显示未知
状态：implemented
变更：2026-08-27-session-token-usage-fix
原编号：D-003@v1
锚点：未记录
最近确认：c7f48562
理由：如实显示"未知/—"（不算百分比），不用旧口径估算（旧口径 input 是该轮所有调用求和，数字本身失真）。

## D-unmapped-055@v1 : 实现方案选 A（复用 usage 附带管线 + daemon 按轮重置）
状态：implemented
变更：2026-08-27-session-token-usage-fix
原编号：D-005@v1
锚点：未记录
最近确认：c7f48562
理由：方案 A。daemon 在现有 usage 字典加 ctx_tokens（message_start 算本次调用 input+cache_read+cache_creation）；轮边界重置累积器使实时值=本轮至今量（与终态口径一致）；backend/frontend 全链路加字段透传（AgentRun.ctx_tokens 列 + SSE + SessionRunRead）。完全符合 D-001~D-004。否决 B（改动面翻倍且旧通道无法删除，两套并存反而更乱）；否决 C（环仍爆表、跳变仅被隐藏）。

## D-unmapped-056@v2 : 统一=本轮增量；终态 SDK result 权威校准
状态：implemented
变更：2026-08-27-session-token-usage-fix
原编号：D-001@v2
锚点：未记录
最近确认：c7f48562
理由：统一仍为本轮增量；终态以 SDK result 值为权威覆盖（校准语义）。消除的是"语义级"跳变（会话累计暴涨→本轮骤降）；若两路数值有小出入，表现为终态定格时小幅校正。execute 首任务跑真实会话 spike 验证，偏差 >5% 启用 fallback（close 仅当 result > 实时值才覆盖 input/output）。
supersedes：D-001@v1

## D-unmapped-057@v1 : ctx_tokens 仅 main 桶计算与注入
状态：implemented
变更：2026-08-27-session-token-usage-fix
原编号：D-006@v1
锚点：未记录
最近确认：c7f48562
理由：lastCallCtxTokens 仅 'main' 桶计算与注入 pendingUsage；子桶 pendingUsage 不含 ctx_tokens（backend usage.get 缺失即跳过，天然兼容）。turnInput/turnOutput 所有桶照常（子代理计费量并入本轮）。

## D-unmapped-065@v1 : 数据链路实现方案
状态：implemented
变更：2026-08-29-session-usage-stats
原编号：D-004@v1
锚点：未记录
最近确认：0ea25728
理由：方案 A——新增 GET /api/daemon/sessions/{id}/usage 聚合端点：agent_run_model_usage 按 session 的 runs 聚合为主、AgentRun 六 token 列兜底无明细行的老 run，返回会话汇总+按模型分组；与 /runtimes/usage 先例同模式

## D-unmapped-111@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-009@v1
锚点：未记录
最近确认：353eb11b0
理由：否——用户明确「不应该限制 agent 类型」，跨 harness 同变更挂接是需求而非缺陷
否决理由：与「同变更就挂」需求直接冲突
复潮条件：未来出现同变更跨 harness 归属仍需区分展示的需求

## D-unmapped-112@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-010@v1
锚点：未记录
最近确认：353eb11b0
理由：否——首次错标仍会发生、subagent 归属仍靠 cwd 猜，治标不治本
否决理由：治标；不满足 FR-01
复潮条件：锚定方案在某个 harness 上不可实施时的局部回退

## D-unmapped-113@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
原编号：D-011@v1
锚点：未记录
最近确认：353eb11b0
理由：否——动表结构与 D-005 冲突；现有 change/quicklog links 表已能表达「会话↔ctx」登记
否决理由：违反已确认的「不动表结构」决策；现有 links 表能力足够
复潮条件：ctx owner 解析出现性能问题或需要显式管理界面

## D-unmapped-120@v1 游标修复方案——before_id 附加参数 + 块内复合过滤（方案 A）
状态：implemented
变更：2026-09-16-logs-cursor-tiebreaker
原编号：D-001@v1
锚点：未记录
最近确认：b204034fb
理由：A。backend get_agent_session_logs 新增可选 before_id 查询参数，before_id 非空时过滤改 `(ts < before) OR (ts = before AND id < before_id)`，缺省保持现行 `ts <= before` 旧语义；ORDER BY（run 块序 anchor_ts→ts→id）零改动；openapi/gen:types 同步；前端游标升级 (ts,id) 二元组 + pageKey 追加 id 后缀 + loadEarlierOnce 进度判定二元组化
故障面：WHERE 裸 ts 过滤与 run 块序排序键不对齐是既有已接受局限（跨 run 时间交叠时 ts 游标可跳行）——顺序会话（一会话一活跃轮）不受影响，本变更不扩大该局限（复合过滤仅在块内收紧）
退役判据：若未来日志查询改为全局 (ts,id) 序的专用分页端点或换 cursor token 协议，before_id 参数随 before 一并退役

## D-unmapped-124@v1 知识来源范围——会话记录 + 手工录入 + 变更归档
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-001@v1
锚点：未记录
最近确认：e83c21744
理由：用户多选确认：会话记录、手工录入、变更归档三项；事件复盘（incident postmortem）不在 v1 范围。

## D-unmapped-125@v1 蒸馏引擎=派发 agent 会话（非后端直调 LLM）
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-002@v1
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：派发 agent 会话。理由（用户选项描述）：能力最强，agent 能读文件、能跑 sillyspec knowledge propose 等命令，产物直接落在 .sillyspec 树内，与 CLI 口径天然一致。
故障面：派发依赖 daemon 在线与 lease 可用；daemon 离线时蒸馏任务排队/失败需有反馈路径。
退役判据：若 agent 会话蒸馏成本/时延不可接受且后端 LiteLLM 直调已能覆盖同等质量，可复议 D-002@v2。

## D-unmapped-126@v1 入库位置=.sillyspec/knowledge 树（与 sillyspec CLI 同源）
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-003@v1
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：写入 .sillyspec/knowledge。候选先进待审区（proposed/），人工审核后合并进正式知识文件并更新 INDEX，经现有 spec 同步（spec_version bump → daemon lease claim 按 latest_spec_version 拉取）回流各端；CLI 与网页看到同一份。
故障面：平台侧写入与 daemon 上行同步可能撞 manifest 乐观锁（冲突走既有 conflict 路径人工拍板）。
退役判据：若知识规模/并发写入增长到文件树形态不可维护（数千条目/多人同时写常态），复议为文件真相源之上加 DB 读索引，而非放弃与 CLI 同源。

## D-unmapped-127@v1 平台侧写路径=方案A 平台直写（服务端权威写 + 蒸馏上行复用现有同步）
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-005@v1
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：方案A 平台直写。手工录入与审核合并由 backend 直接写服务器 spec_root（维护 SpecFileManifest 单写者语义：行版本 +1、spec_version bump、软删备份），网页即时生效不依赖 daemon 在线；agent 蒸馏任务在会话内写本地 .sillyspec 后照现有上行同步回流（pull/push 维持主动快照语义，daemon 决策库 D-004@v1）。与上行同步撞同文件冲突走既有 manifest conflict 人工拍板路径（知识文件写入低频，冲突面可控）。否决方案B（全走 daemon 代写 outbox：daemon 离线即阻塞、异步排队体验差）；否决方案C（分期：人为拖慢用户明确要的蒸馏能力）。
故障面：平台直写与 daemon 上行同步并发改同一知识文件时触发 manifest 冲突（走既有 conflict 人工拍板）；repo-native junction 场景下行应用会改用户 git 工作树，需 git 感知提示。
退役判据：若知识写入频率升高导致冲突常态化，复议 D-005@v2 转代写队列或合并写协调器。

## D-unmapped-128@v1 merge 两段式 apply + 三类映射目标 + 路由关键词人工输入（Design Grill B-1/B-3 修正）
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-007@v1
锚点：未记录
最近确认：e83c21744
理由：两段式：第一段 apply_ops([update(目标文件), update(INDEX.md)])，确认返回无 conflict 后第二段 apply_ops([delete(proposed)])；第二段失败=候选残留幂等可重试。合并目标 v1 限定三类 INDEX 映射文件（known-issues.md/patterns.md/conventions.md）；路由关键词由审核人人工填写（KnowledgeMergeIn.keywords），不做自动派生。另定 path 字段规范：entry.path 保留 .sillyspec/knowledge/ 前缀（顶层条目值不变，兑现兼容承诺），filename 扩展为含子目录段的相对路径，zone 由 filename 首段派生（Grill B-2 定论）。
故障面：两段间窗口内另一端同步改动 proposed 文件 → 第二段 conflict，候选残留（可重试，无知识丢失）。
退役判据：apply_ops 若未来提供事务性整批中止（all-or-nothing）语义，可合并回单段。

## D-unmapped-129@v2 R-08 三洞修复落定——附件通道取数 + --spec-dir 指路回流 + 三重护栏（supersedes D-008@v1）
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-008@v2
锚点：未记录
最近确认：e83c21744
理由：实现期调查（2026-09-17，commit 2c7873e5e）修正前提：**spec 树三策略统一下发 daemon 本地 `~/.sillyhub/daemon/specs/{ws_id}`（交互会话启动 pull + 会话结束 postSpecSync 增量回传，`knowledge/` 在同步集内）**——v1 判断"platform-managed 下 daemon 本地无树"不成立，洞二实为"树在缺指路"。修正落定：①洞一取数走**附件通道**（导出会话日志为 Markdown→SessionAttachmentService 上传→create_session attachment_ids→daemon 落盘 {cwd}/attachments/ 供 agent 读，不污染知识库树；替代 v1 的 .runtime 导出方案——.runtime 在同步排除集内送不到 daemon，v1 方案不可行）；②洞二回流=prompt 统一带 `--spec-dir ~/.sillyhub/daemon/specs/{ws_id}` 指路（CLI 实测 propose 只认 --spec-dir 不认 --spec-root，scan 参数不可照搬）；③洞三护栏=turn>2000 422/单条 8KB 截断/总量 19MB 422 引导 resume；④非多模态引擎（附件通道依赖 provider_caps.multimodal，仅 claude/pi）fresh 会话源 422 守卫。
supersedes：D-008@v1
故障面：附件下载 daemon 侧 60s 超时（既有链路）；postSpecSync 乐观锁冲突靠 pending_push 自愈（既有）；超大对话 resume 模式上下文超限由引擎 compact 兜底。
退役判据：若 daemon 侧未来提供会话记录查询 MCP 工具，可弃附件导出通道。

## D-unmapped-130@v1 会话源蒸馏默认走原会话续接（reopen+inject），新 agent 为可选项
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-009@v1
锚点：未记录
最近确认：e83c21744
理由：会话源默认=原会话续接——平台既有 reopen_session（（续接入口 reopen_session，见 backend/app/modules/daemon/session/service/session_lifecycle.py），续接已结束 claude/codex 会话，SDK resume 保留完整对话历史+prompt cache）+ inject_session(prompt=...)（（inject_session，见 backend/app/modules/daemon/service.py））把提炼指令发进原会话。一举兑现三好处（快/省 token/高质量）并化解 R-08 洞一（原会话读自己，无需取数通道）。新 agent（现状 bootstrap 新建 AgentRun）保留为可选项，用于：会话已删/引擎不支持 resume/用户想换视角。变更源天然走新 agent（文件树无"原会话"概念）。引擎限制：续接仅 claude/codex（provider caps 门控）+ 仅已结束会话可 reopen（进行中用 inject）+ 归档区禁写。原型未体现"谁去干"——前端补选择 UI（会话源默认勾选"原会话续接（推荐）"，旁保留"新建 agent"）。
故障面：续接会话可能比新 agent 更"固执"于原上下文视角（用户已有认知，故保留换 agent 选项）；reopen 对进行中会话报错需引导用 inject 而非 reopen。
退役判据：若后续所有引擎均支持 resume 且用户实测续接质量稳定，可收窄新 agent 选项为高级设置。

## D-unmapped-131@v1 沉淀闭环增强——已沉淀标签+知识点反链 / quicklog 第三来源 / 新建 agent 复用 create_session / 蒸馏会话隔离
状态：implemented
变更：2026-09-17-knowledge-precipitation
原编号：D-010@v1
锚点：未记录
最近确认：e83c21744
理由：四项全做，源码可行性已核实：①已沉淀标签=查该源有无 distill run（AgentRun.agent_session_id 关联+metadata_.kind 落档，无需新表），proposed frontmatter 的 source 字段为反链载体（backend/app/modules/knowledge/writer.py 的 frontmatter source 行 现写 manual，蒸馏写 session:<id>/change:<key>/quick:<id>）；合并时把目标小节锚点记入反链（因合并后 proposed 文件删除入备份区，反链须指到合并后目标小节 known-issues.md#某节而非已删 proposed 文件）；②quicklog 与 knowledge 同构（GET /quicklog 现成 repo://sillyhub/backend/app/modules/knowledge/router.py:197），数据在文件树 .sillyspec/quicklog/，新 agent 直接读、连 R-08 洞一取数问题都没有——来源类型扩 quick，单条 ql 小故来源多选；③新建 agent 复用 create_session（backend/app/modules/daemon/session/service/（create_session 入口，见 backend/app/modules/daemon/session/service/create.py） 原生支持 runtime_id 钉机器+provider/agent_profile_id/llm_provider_id/model 完整形态），后端代触发而非用户手点，title 带「提炼」前缀；④AgentSession.metadata_（repo://sillyhub/backend/app/modules/daemon/model.py:457 JSON 列）写 origin=knowledge-distill，常规会话页列表过滤排除，知识库侧 DistillTaskRead 保留 agent_session_id 可跳转——会话有据可循+不污染常规列表双兑现。
故障面：反链映射在合并时若目标小节重命名会失效（锚点漂移，需以 file+section_title 双键而非裸锚点）；蒸馏会话过滤若靠 metadata 判空，老会话（无 origin 字段）默认可见需零回归兜底。
退役判据：若常规会话页引入通用「会话用途」过滤维度，蒸馏隔离可并入该维度不再单列 origin 键。

## D-unmapped-132@v1 变更范围=知识库效果面板三件套
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-001@v1
锚点：未记录
最近确认：095869924
理由：用户对话逐条点单：①使用统计+热力图（知识库被用起来的节奏）②决策库展示效果化（裸文件→卡片，体现防复潮价值）③fr/ 目录（FR 索引，fr-index 新产物）展示效果化（状态/取代链/场景全埋正文里看不见）。统一主题=知识库从「能看到」升级到「看效果」。
故障面：hits 上行链路新增 daemon 改动面（此前 knowledge 变更零 daemon 改动）。
退役判据：若 hits 遥测被 CLI 侧改为直接上报平台 HTTP 端点，daemon 豁免上行可撤。

## D-unmapped-133@v1 上行链路=daemon 同步豁免 hits 文件增量上报（非 CLI 直报）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-003@v1
锚点：未记录
最近确认：095869924
理由：复用既有 spec 同步通道而非改 CLI：daemon 在 spec 同步流程单独摘出 spec 目录下 .runtime/knowledge-hits.jsonl（豁免 UPLOAD_EXCLUDE 的这一个文件），按「已上行字节数/行数」断点增量 POST 到平台新端点批量落库。离线容忍（下次补传）、CLI 零改动、多端各报各的天然合并。
故障面：行截断（上行时本地正 append）——按完整行断点，尾行不完整留下次。
退役判据：CLI 未来原生支持遥测上报时可退役 daemon 豁免通道。

## D-unmapped-134@v2 总体方案 A 确认（用户亲答）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-006@v2
锚点：未记录
最近确认：095869924
理由：用户亲答（2026-09-20）：认可方案 A（daemon 豁免增量上行+落库聚合+卡片渲染器+日历热力图），附加要求：上行链路必须解决多用户单工作区问题（见 D-007）。
supersedes：D-006@v1

## D-unmapped-135@v1 多用户单工作区=各端独立上报+行 hash 幂等去重+行带 daemon 归属
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-007@v1
锚点：未记录
最近确认：095869924
理由：用户亲答提出此问题，方案：①汇聚——各 daemon 只报本机 hits 增量（.runtime 不同步各端文件独立），服务器按行内容 sha256 做幂等去重（唯一约束 workspace_id+line_hash，INSERT ON CONFLICT DO NOTHING），多端天然合并零重复，重装/offset 丢失全量重报亦兜底；②断点——每 daemon 在自身家目录状态文件记已上报 offset（不落 spec 树防同步污染）；③归属——上报经 daemon 鉴权，行落库带 daemon_id（可关联注册用户），展示默认聚合总量（热力图=工作区整体节奏），数据层留归属供后续按人视图。
故障面：两端同一毫秒并发 INSERT 同 hash——唯一约束+ON CONFLICT 兜底，无竞态。

## D-unmapped-136@v2 统一条目渲染器覆盖全部 zone（supersedes D-004@v1）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-004@v2
锚点：未记录
最近确认：095869924
理由：用户亲答（2026-09-20 原型反馈）：整个知识库下各目录结构应统一，都搞成人类阅读更友好的形式，参考本仓与 sillyspec 仓的知识结构。统一条目模型（两仓实证同构）：手册文件=## 小节多条目、decisions/fr=## ID+字段行、generated=单条目、INDEX=路由目录页。统一渲染器三形态：①正文小节卡（手册：小节标题+markdown 正文+条目级 🔥 徽标——手册命中本就是 条目#锚点 粒度）②结构化字段卡（决策/FR：状态/字段/理由/取代链/互跳）③目录导航卡（INDEX：分类段+路由行→点击跳对应条目）。每文件保留「原文」tab 切回 md 视图。
supersedes：D-004@v1

## D-unmapped-137@v1 热力图删除，换运营指标仪表盘（用户亲答 a）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
原编号：D-009@v1
锚点：未记录
最近确认：095869924
理由：用户亲答选 a：删除日历热力图。顶部换运营指标仪表盘四卡：①知识覆盖率（被命中条目/全部条目+趋势）②死条目（90 天零命中，可点开清单引导清理）③每任务命中密度（均值趋势，过低=检索没跟上/过高=注入过肥）④新知识生效速度（近 30 天新增条目已被使用比例）。使用榜改日均使用率排序（命中次数÷条目存在天数，消除老条目累计偏差；绝对次数作副信息）。
