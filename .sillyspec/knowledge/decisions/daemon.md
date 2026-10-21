# 决策知识 — daemon

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-backend-001@v1
状态：implemented
变更：2026-08-25-session-spec-binding
原编号：D-002@v1
锚点：backend/migrations/versions/20260825223000_add_quicklog_session_links.py（播种）
最近确认：a9b06c98
理由：links 为唯一关联真相：读侧全部改走 links；alembic 一次性把存量 change_id 播种成 link 行（ON CONFLICT DO NOTHING）；change_id 列保留并继续写入（创建时锚定主变更的冗余提示，双写），后续变更再评估删列。

## D-unmapped-008@v1 : 服务器重新部署范围
状态：implemented
变更：2026-08-29-daemon-platform-resilience
原编号：D-002@v1
锚点：未记录
最近确认：bdef3a21
理由：仅后端进程重启（docker 容器重启/发新版镜像），数据库保留，daemon 的 api_key 与注册信息仍有效

## D-unmapped-009@v1 : 前端回显纳入范围
状态：implemented
变更：2026-08-29-daemon-platform-resilience
原编号：D-003@v1
锚点：未记录
最近确认：bdef3a21
理由：包含关键前端修复——断线状态提示、卡住的「运行中」轮次兜底、审批面板断线重连

## D-unmapped-010@v1 : 改造深度
状态：implemented
变更：2026-08-29-daemon-platform-resilience
原编号：D-004@v1
锚点：未记录
最近确认：bdef3a21
理由：允许结构改造——可新增接口/协议（控制消息补拉接口、lease 过期回收后台任务、SSE 游标增强等），彻底解决断线窗口丢消息

## D-unmapped-011@v1 : 实现方案选型
状态：implemented
变更：2026-08-29-daemon-platform-resilience
原编号：D-005@v1
锚点：未记录
最近确认：bdef3a21
理由：方案 A——控制指令落库待发（参考 DaemonChangeWrite 占坑-轮询-GC 先例）+ WS 推送保即时性 + daemon 重连后 HTTP 补拉幂等消费；分层加固：daemon 退避重连+register 重试、终态上报入 outbox、backend lease GC 接线与 WS 断开即时降级、会话 suspended 挂起语义、前端连接状态与看门狗兜底

## D-unmapped-012@v1 : 六段设计整体确认
状态：implemented
变更：2026-08-29-daemon-platform-resilience
原编号：D-006@v1
锚点：未记录
最近确认：bdef3a21
理由：确认。变更名 2026-08-29-daemon-platform-resilience，原型 prototype-session-connection-states.html 六状态快照

## D-unmapped-014@v2 : 磁盘旁路探测方式与 disk_change 直启路径（Grill B1/B2 修正）
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
原编号：D-003@v2
锚点：未记录
最近确认：HEAD
理由：探测=读 bundle 文件正则提取 BUILD_ID（gen-build-id.mjs 格式 regex 兼容，无 spawn）；disk_change 触发后走独立直启路径——不下载不查 manifest，空闲即 stop+respawn 到盘上版本（操作者换文件即意图，multica trySelfReload 同款）；server_command 仍走现有下载链
supersedes：D-003@v1

## D-unmapped-015@v1 : 方案选型 A3 完整形态
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
原编号：D-004@v1
锚点：未记录
最近确认：HEAD
理由：A3——A1 全部（空闲屏障/所有权 CAS+失败释放/磁盘探测/pending 本地 status 可见）+ 心跳上报 pending_update 字段 + backend 机器视图透出 + 前端机器卡展示「等待空闲升级」原因

## D-unmapped-016@v1 : 保留既有优势语义
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
原编号：D-005@v1
锚点：未记录
最近确认：HEAD
理由：保留「拉起失败旧进程保活」（multica 没有的优点）并补全其半边语义——交接失败必须释放更新所有权与屏障，让下一条 SELF_UPDATE 指令可再触发；下载原子替换/防降级/noop 保活等既有行为不变

## D-unmapped-017@v1 : 设计整体确认
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
原编号：D-006@v1
锚点：未记录
最近确认：HEAD
理由：确认。变更名 2026-08-29-daemon-selfupdate-safety，原型 prototype-machine-update-status.html

## D-unmapped-082@v1 : 实现方案——daemon 自发现 + 日志 tail 推导 + 第一方事件汇聚（方案 1）
状态：implemented
变更：2026-09-07-agent-liveness-states
原编号：D-003@v1
锚点：未记录
最近确认：e76e191d9
理由：方案 1。唯一同时满足"全托管会话有状态灯（含 zcode 非托管登记）"与"blocked 确定性"的路线，CLI 契约零变更零回归（草案 D-005），五层既有地基全复用；代价是 daemon 侧工作量最大，由 P1a 先行消化。方案 2 违反"CLI 非执行体"既定定位且覆盖不了登记盲区；方案 3 放弃 zcode/裸会话覆盖，G-1 达不成

## D-unmapped-083@v1 : 状态展示两层——会话列表小灯+悬浮卡，完整总览放工作台
状态：implemented
变更：2026-09-07-agent-liveness-states
原编号：D-004@v1
锚点：未记录
最近确认：e76e191d9
理由：A。会话列表每行行尾只加 ~18px 状态小灯（五态色+呼吸闪烁，不新增列不改布局），悬停弹详情小卡（静默时长/关联 ctx/证据摘要）；完整「Agent 状态总览」卡片（分组计数+等人跳转）放工作台首页。用户原话背景：会话列表没那么大空间展示这些信息

## D-unmapped-085@v1 实施路线——渐进下沉（双轨兼容）而非契约替换或最小注册表
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-001@v1
锚点：未记录
最近确认：c6c74aa49
理由：方案A 渐进下沉。driver 内归一化吐 AgentEvent，backend/前端双轨兼容新旧两种事件格式，验证稳定后再退役旧文本协议（退役为后续 change）

## D-unmapped-086@v1 会话级信号的承载方式——status 事件 subtype + 有状态归一化器，raw 降格为调试通道
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-002@v1
锚点：未记录
最近确认：c6c74aa49
理由：①会话级信号全部事件化为 status 型 + subtype 枚举（session_started/bash_status/plan_mode/agent_task_status/task_notification），SessionManager 改按 subtype 分发；②depth 状态机等跨消息状态由有状态归一化器类（ClaudeEventNormalizer，每会话实例）内部维护；③envelope.raw 仅在 SILLYHUB_DEBUG_RAW_EVENTS=1 时携带，下游禁止依赖（cli.ts 的 SDKMessage 接线随之演进）

## D-unmapped-087@v1 usage 实时透传语义——任意携带 usage 的事件即更新，不限 turn_result
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-003@v1
锚点：sillyhub/backend/app/modules/daemon/run_sync/service/submit_steps.py:350
最近确认：c6c74aa49
理由：对齐现行为：任意携带 usage 的 AgentEvent（含 partial text/thinking flush 事件）→ daemon lift → backend 更新 agent_runs token 统计 + SSE summary 实时透传（现链路锚点 repo://sillyhub/sillyhub-daemon/src/daemon.ts:3564-3586、repo://sillyhub/backend/app/modules/daemon/run_sync/service/submit_steps.py:350）

## D-unmapped-088@v1 partial override 撤回的事件化表达——override:true + segment_id
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-004@v1
锚点：未记录
最近确认：c6c74aa49
理由：text/thinking 事件增加可选 override:boolean——true 表示替换同 segment_id 已落库 partial 行；backend 行为对齐现有 stale 撤回链（DELETE by (run_id, segment_id) → INSERT）。partial/override 归一化逻辑移植自 daemon session-manager 现实现（非 backend _extract_sdk_messages，后者对 stream_event 恒返回空）

## D-unmapped-089@v1 AgentEvent v2 契约补遗——status 增 thinking_tokens 子类型、usage 增 ctx_tokens 字段
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-005@v1
锚点：未记录
最近确认：c6c74aa49
理由：契约微扩：AgentStatusSubtype += 'thinking_tokens'；AgentEventUsage += ctx_tokens?: number。归一化器对应产出（thinking_tokens 子类型事件、usage 差分携带 ctx_tokens）

## D-unmapped-090@v1 双轨渲染已知改进差异的取舍——主 agent Task tool_result 配对（新轨 call_id 优先）与 cache_* 完整帧聚合（新轨更全）
状态：implemented
变更：2026-09-03-agent-provider-abstraction
原编号：D-006@v1
锚点：未记录
最近确认：c6c74aa49
理由：均接受为已知改进差异（新轨行为更正确），以豁免/可执行登记形式固化（dual-path fixture 豁免 #2 + TestDocumentedFormatDivergences/§2 差异冻结测试），不要求新轨复刻旧轨缺陷；旧轨本身零改动（回退轨保真）

## D-unmapped-091@v1 命令下发通道——机器级即时 WS 指令（方案 A）
状态：implemented
变更：2026-09-04-conflict-resolve-entry
原编号：D-001@v1
锚点：sillyhub/backend/app/modules/daemon/router/machines.py:197
最近确认：0d7e66502
理由：方案 A。复用机器级 fire-and-forget WS 指令先例（self_update/cleanup/sillyspec_update 同款，`POST /machines/{id}/sillyspec-update` repo://sillyhub/backend/app/modules/daemon/router/machines.py:197）：backend 校验权限后经 DaemonWsHub 即时下发，daemon 侧 handler 本地 execFile 执行 sillyspec CLI（sillyspec-manager 30s 超时模式），执行结果缓存于 daemon 内存并随下次心跳 sillyspec_status 通道上报（≤60s 页面自动回绿）。B 的离线补拉增益对本场景为负（sillyspec 操作必须机器在线，离线排队上线时现场可能已变）且六处协议扩展过重；C 的 host_fs RPC 挂会话上下文无页面载体、字符级白名单对变长 change 名脆弱，不适配

## D-unmapped-092@v1 操作权限——机器所有者 + 平台管理员
状态：implemented
变更：2026-09-04-conflict-resolve-entry
原编号：D-003@v1
锚点：未记录
最近确认：0d7e66502
理由：机器所有者 + 平台管理员。冲突数据挂机器维度，机器主人最清楚现场，管理员兜底无主机器；其他成员只读红灯不可操作。活跃阶段变更（非 archived）的冲突行加警示标注 + 确认弹窗加重文案，不硬禁（机器主人有最终裁量）

## D-unmapped-093@v1 心跳 sillyspec_command_result 落库语义——两态清除 + register 恒清（Grill X-04 修订）
状态：implemented
变更：2026-09-04-conflict-resolve-entry
原编号：D-004@v1
锚点：未记录
最近确认：0d7e66502
理由：两态。对象=整包直写、键不出现=置 NULL 清除，与 sillyspec_status 现状（repo://sillyhub/backend/app/modules/daemon/model.py:126、repo://sillyhub/backend/app/modules/daemon/runtime/service.py:523）语义一致；daemon 终态窗过期后直接停发该键，不发送显式 null；register 恒清（repo://sillyhub/backend/app/modules/daemon/service.py:233 先例）堵 daemon 重启后 DB 残留。三态需在心跳面新增 absent/null 判别，唯一先例 repo://sillyhub/backend/app/modules/daemon/router/machines.py:98 display_alias PUT 属 PUT 端点非心跳，无谓引入新机制

## D-unmapped-094@v1 cursor 交互式 driver 架构——每轮 respawn + --resume chatId 薄 driver
状态：implemented
变更：2026-09-08-cursor-interactive-session
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：方案A 每轮 respawn。每个 UserTurnInput spawn 一次 `cursor-agent -p --output-format stream-json [--resume chatId] [--model] <prompt>`，NDJSON 逐帧归一化为 AgentEvent v2，result 帧 + 进程退出 = turn 收敛；chatId 从帧内 session_id 捕获（`create-chat` 子命令兜底）；Windows 经 resolveWindowsCmdShim（含 cursor 坏 ps1 版本目录增强）。B/C 否决：worker 实测是 Cursor 云端 worker 注册通道（K8s 探针/标签/池分配，非本地 stdio 会话协议）；cursor-agent 无 --input-format/SDK 控制协议（批量适配 D-008@v1 已证参数集分叉），ClaudeSdkDriver 握手必挂

## D-unmapped-095@v1 接入范围——仅交互式会话最小闭环
状态：implemented
变更：2026-09-08-cursor-interactive-session
原编号：D-002@v1
锚点：未记录
最近确认：35f3d6528
理由：仅最小闭环：补齐交互式会话链路（driver + 归一化器 + 注册表 + 三端 caps + 前端白名单 + 测试 + 冒烟），对齐 pi 接入先例。liveness 推导器注册与平台侧 Cursor 凭证配置（llm_provider agent_kind 扩展 + CursorCredentialInjector）留后续变更

## D-unmapped-096@v1 caps 守护测试 EXPECTED_PROVIDERS 同步必改（Grill B-01）
状态：implemented
变更：2026-09-08-cursor-interactive-session
原编号：D-004@v1
锚点：sillyhub/backend/app/modules/agent/tests/test_provider_caps_alignment.py:52
最近确认：35f3d6528
理由：否。`repo://sillyhub/backend/app/modules/agent/tests/test_provider_caps_alignment.py:52` EXPECTED_PROVIDERS 为硬编码 `{"claude","codex","pi"}`，test_provider_sets_identical 对三端表断言集合相等——三端表加 cursor 后守护测试必失败。必须同 commit 同步 EXPECTED_PROVIDERS 加 'cursor'（pi 接入 commit 7c4dd4efd 同款先例）。设计文件清单已补该文件

## D-unmapped-097@v1 派生粒度=工具调用聚合为单任务
状态：implemented
变更：2026-09-07-pi-task-events
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：以「一轮（turn）内的活动」聚合为单条任务：turn_start 建/复running行（task_id=pi-run-<runId> 稳定键，task_name 取首轮用户消息或'执行任务'），tool_execution_start 刷新 last_tool_name/tool_uses 累计/summary（'正在调用 X'），tool_execution_end 保持 running（工具成败不等于任务成败），turn_end 按 stopReason 映射终态（error→failed 其余→completed）置 message/finished_at。子代理粒度（claude Task 工具那种）pi 原始流无对应概念，不做

## D-unmapped-098@v1 派生位置选归一化器（方案 A）——⚠️ 自主决策待用户复核
状态：implemented
变更：2026-09-07-pi-task-events
原编号：D-002@v1
锚点：未记录
最近确认：35f3d6528
理由：选 A。PiEventNormalizer 增实例级 turnTask 聚合状态产出 status/agent_task_status——贴 claude-events 同位置派生信号的既有架构，session-manager/_dispatchStatusEvent→cli 上报链路零改动，纯函数测试范式可延续；代价是归一化器从逐行纯函数升级为实例级状态机（turn 边界做状态推进点，normalizeRpcLine 单行解析仍独立）

## D-unmapped-099@v1 设计整体确认——⚠️ 自主决策待用户复核
状态：implemented
变更：2026-09-07-pi-task-events
原编号：D-003@v1
锚点：未记录
最近确认：35f3d6528
理由：按 D-001/D-002 定稿确认。原型跳过理由：纯数据链路补齐，前端任务执行面板零改动（pi 会话从空态变有数据，无界面变化，原型分级「纯后端无界面变化」档）

## D-unmapped-100@v1 design-grill 修正——stopReason 枚举实证与测试路径
状态：implemented
变更：2026-09-07-pi-task-events
原编号：D-004@v1
锚点：未记录
最近确认：35f3d6528
理由：修正三处：①fixture 全量实证 stopReason 仅 stop/error 两值，aborted 是 ame.error 的 reason（流层中止）非 stopReason——删除 aborted→stopped 映射，被打断的轮按 completed 收行；②测试路径实存 tests/interactive/pi-events.test.ts，新增集成用例定名 tests/interactive/pi-task-dispatch.test.ts；③R-01 应对改写：既有用例 expected 数组需追加派生事件（预期适配非破坏）

## D-unmapped-114@v2 聚合形态 = 编译期聚合（落点修订）
状态：implemented
变更：2026-09-11-provider-adapter-registry
原编号：D-003@v2
锚点：sillyhub/sillyhub-daemon/src/interactive/providers.ts:262
最近确认：f0211bbcf
理由：Grill 复审发现 @v1 表述「新建 provider-adapter.ts」与实际最优落点不符——ProviderDescriptor（repo://sillyhub/sillyhub-daemon/src/interactive/providers.ts:262）已承载五要素，原地扩展 INTERACTIVE_PROVIDERS 为 ProviderAdapter 聚合表改动面最小。@v2 修订：落点=providers.ts 内扩展，不另立契约文件。
supersedes：D-003@v1

## D-unmapped-119@v1 修复方案——锚点 + 协议标记（方案 A）
状态：implemented
变更：2026-09-15-background-task-permission-lockout
原编号：D-001@v1
锚点：未记录
最近确认：e21bf19cc
理由：A。daemon `onResult` 在会话的后台任务注册表非空时保留 currentRunId 作后台锚点（任务全部终态注销时清）；写通道守卫 `writeChannelGuardDeny` 新增「status=active + currentRunId 在 + 注册表有存活任务」放行条件；权限请求协议加 `background_task` 标记，backend `handle_permission_request` 据此放宽 active-turn 校验为「按 run_id 直查 + 会话归属校验」
故障面：注册表泄漏（task_notification 永不到达）会让锚点 currentRunId 永不清 → 守卫放行窗口变长；缓解＝锚点仅在 status=active 时有效，下一次 inject 正常切新 run，写策略/人审链路仍全程生效，放行的只是「通道存在性」而非权限本身
退役判据：SDK 未来提供 per-task 权限上下文（canUseTool 带 task 归属）时，锚点机制可退役为直连 task→run 权限路由
