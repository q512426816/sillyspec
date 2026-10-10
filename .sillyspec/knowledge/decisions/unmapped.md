# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-003@v1 : 平台共享智能体绑定的守护进程取管理员自己名下
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：仅平台管理员自己名下的在线 daemon runtime。依据：避免引入「管理员

## D-002@v2 : 平台共享智能体会话——源码只读 + 指定目录可写
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：用户实答（重问轮）：「允许某个目录下写操作，可以生成点文档原型图
supersedes：D-002@v1

## D-004@v2 : 共享机器/智能体由用户在会话中显式选择
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：用户实答（重问轮）：「会话选择共享的机器和智能体呀，用户自己选」
supersedes：D-004@v1

## D-006@v1 : 实现方案选 B——统一授权表 daemon_runtime_grants
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：用户选定方案 B：新建 daemon_runtime_grants 统一授权表，工作区共享与

## D-011@v1 : 打破 daemon 零改动 Non-Goal——session 级 overlay roots 写守卫增量（spike-02 B 裁决）
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：选项 II（最小 daemon 增量）：_judgeWriteViaPolicyEngine 增加 per-session

## D-012@v1 : platform grant 的 pinned runtime 不经共享档案直接钉定 → 404
状态：implemented
锚点：未记录
最近确认：3b2df3ff
理由：否——共享的是智能体而非裸 runtime：authorize_pinned_runtime 的

## D-002@v1 : 服务器重新部署范围
状态：implemented
变更：2026-08-29-daemon-platform-resilience
锚点：未记录
最近确认：bdef3a21
理由：仅后端进程重启（docker 容器重启/发新版镜像），数据库保留，daemon 的 api_key 与注册信息仍有效

## D-003@v1 : 前端回显纳入范围
状态：implemented
变更：2026-08-29-daemon-platform-resilience
锚点：未记录
最近确认：bdef3a21
理由：包含关键前端修复——断线状态提示、卡住的「运行中」轮次兜底、审批面板断线重连

## D-004@v1 : 改造深度
状态：implemented
变更：2026-08-29-daemon-platform-resilience
锚点：未记录
最近确认：bdef3a21
理由：允许结构改造——可新增接口/协议（控制消息补拉接口、lease 过期回收后台任务、SSE 游标增强等），彻底解决断线窗口丢消息

## D-005@v1 : 实现方案选型
状态：implemented
变更：2026-08-29-daemon-platform-resilience
锚点：未记录
最近确认：bdef3a21
理由：方案 A——控制指令落库待发（参考 DaemonChangeWrite 占坑-轮询-GC 先例）+ WS 推送保即时性 + daemon 重连后 HTTP 补拉幂等消费；分层加固：daemon 退避重连+register 重试、终态上报入 outbox、backend lease GC 接线与 WS 断开即时降级、会话 suspended 挂起语义、前端连接状态与看门狗兜底

## D-006@v1 : 六段设计整体确认
状态：implemented
变更：2026-08-29-daemon-platform-resilience
锚点：未记录
最近确认：bdef3a21
理由：确认。变更名 2026-08-29-daemon-platform-resilience，原型 prototype-session-connection-states.html 六状态快照

## D-003@v1 : 三条线打包 = 单变更三波交付（+revision 1 并入波 4）
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
锚点：未记录
最近确认：0ec935c9
理由：删除收敛+防复活基建（波 1）/删除入口（波 2）/拉取口子（波 3）一个变更三波，波与波共享防复活基建（波 1 建）；进行中可见性经 revision 1 重开 brainstorm 并入为波 4——与波 1-3 同文件（platform_sync/change/changes 页面），并入避免并行变更冲突（规则 19）。跨仓配套（X1-X4）以 repo: sillyspec 任务卡入列，不另开变更。

## D-003@v2 : 磁盘旁路探测方式与 disk_change 直启路径（Grill B1/B2 修正）
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
锚点：未记录
最近确认：HEAD
理由：探测=读 bundle 文件正则提取 BUILD_ID（gen-build-id.mjs 格式 regex 兼容，无 spawn）；disk_change 触发后走独立直启路径——不下载不查 manifest，空闲即 stop+respawn 到盘上版本（操作者换文件即意图，multica trySelfReload 同款）；server_command 仍走现有下载链
supersedes：D-003@v1

## D-004@v1 : 方案选型 A3 完整形态
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
锚点：未记录
最近确认：HEAD
理由：A3——A1 全部（空闲屏障/所有权 CAS+失败释放/磁盘探测/pending 本地 status 可见）+ 心跳上报 pending_update 字段 + backend 机器视图透出 + 前端机器卡展示「等待空闲升级」原因

## D-005@v1 : 保留既有优势语义
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
锚点：未记录
最近确认：HEAD
理由：保留「拉起失败旧进程保活」（multica 没有的优点）并补全其半边语义——交接失败必须释放更新所有权与屏障，让下一条 SELF_UPDATE 指令可再触发；下载原子替换/防降级/noop 保活等既有行为不变

## D-006@v1 : 设计整体确认
状态：implemented
变更：2026-08-29-daemon-selfupdate-safety
锚点：未记录
最近确认：HEAD
理由：确认。变更名 2026-08-29-daemon-selfupdate-safety，原型 prototype-machine-update-status.html

## D-001@v1 : 会话继承触发范围
状态：implemented
变更：2026-08-29-batch-session-inherit
锚点：未记录
最近确认：HEAD
理由：仅 infra 中断继承——lease 过期自动重派（daemon 掉线/断连）attempt+1 继承原会话继续；lease 内 spawn 重试维持现状清空 resume（R-10 防副作用）；手动重跑走 dispatch_to_daemon 全新 lease 天然新会话

## D-003@v1 : 方案选型 A 最小闭环
状态：implemented
变更：2026-08-29-batch-session-inherit
锚点：未记录
最近确认：HEAD
理由：A——backend handle_lease_expiry 继承原 lease metadata+注入 resume_session_id/work_dir；daemon work_dir 同一性守卫+resume 失败降级。零迁移零新端点零前端，全消费既有链路

## D-004@v1 : 设计整体确认
状态：implemented
变更：2026-08-29-batch-session-inherit
锚点：未记录
最近确认：HEAD
理由：确认。变更名 2026-08-29-batch-session-inherit；无 UI 变化不产出 HTML 原型

## D-005@v1 : P0 方向重定位——worker 重派继承（Grill C-01 裁定）
状态：implemented
变更：2026-08-29-batch-session-inherit
锚点：未记录
最近确认：HEAD
理由：转向 worker 重派继承——interactive worker 会话（AgentSession.role 含 worker 或 parent_session_id 非空）daemon 掉线后不 suspended 而是 failed+自动重派继承原会话（worker 是临时会话无人手恢复，挂起无意义）；主会话（orchestrator/用户 chat）保持挂起语义不变

## D-001@v1 : 缓存范围 = has_permission + data_scope 一并覆盖
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：同时覆盖 has_permission(collect_permissions* 集合)与 data_scope(manager_project_ids / is_super_admin)。两套都是高频热路径,一并做避免二次返工。

## D-002@v2 : 失效策略 = 整体清空 + 失效失败 ERROR 告警(supersedes D-002@v1)
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：所有权限变更触发点统一执行 invalidate_all_permissions 清空 perm:* + ppm-scope:* 全部(继承 v1)。v2 增补:invalidate 失败升 **ERROR 级日志**(可监控告警),非 warning——失效失败是安全事件,可能留下最长 TTL 的越权窗口;读/写业务缓存故障仍降级静默(不影响请求)。
supersedes：D-002@v1

## D-003@v2 : 缓存粒度 = 拆键 platform/all/workspace + everywhere 内存并集(supersedes D-003@v1)
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：**不能共用**(v1 错误)。三者返回语义不同的集合(repo://sillyhub/backend/app/modules/auth/rbac.py:37-84 实证):platform=平台级、all=全工作区并集、everywhere=platform∪all。v2 拆为三键:`perm:{u}:platform`、`perm:{u}:all`、`perm:{u}:{workspace_id}`;everywhere 读 platform+all 内存并集,**不单独存**。has_permission 在所有调用先判 platform,workspace_id=None 时再判 all,workspace_id 指定时判单工作区键。
supersedes：D-003@v1

## D-004@v1 : 无 Redis 降级 = 回退查 DB(不加本地兜底)
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：沿用 api_key_service 约定,Redis 故障 try/except 回退查 DB,不加本地内存 TTL 兜底。保证正确性优先;本地兜底引入多实例一致性问题,得不偿失。

## D-005@v1 : ppm-scope uuid 反序列化保证类型
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：JSON 只能存 str,但 data_scope 下游用 uuid 做判断(`problem_operable` 的 `project_id in manager_pids`,project_id 是 uuid)。get_cached_ppm_scope 反序列化时必须把 manager_project_ids 还原为 `set[uuid.UUID(...)]`,is_super_admin 还原为 `bool`。否则 uuid-in-set[str] 恒 False,经理编辑/删除问题静默失效。

## D-006@v1 : WorkspaceService.create 失效点补全
状态：implemented
变更：2026-07-23-rbac-permission-cache
锚点：未记录
最近确认：163e1065
理由：补入。`_ensure_creator_as_owner`(`repo://sillyhub/backend/app/modules/workspace/service.py:1257`,line 770 写 UserWorkspaceRole 授 owner)的**所有调用方**——`create`(`:148/165/222`)与 `scan_generate`(`:609`,daemon-client 建工作区独立路径,`:669` 调用,不经 create)——commit 后都需调 invalidate_all_permissions,创建者的 all/everywhere 缓存才及时失效(否则最长 TTL 内缺新 ws 权限——权限缺失方向,非越权,但仍是错误)。plan-review 发现 scan_generate 遗漏(Design Grill X2 当时未穷尽 `_ensure_creator_as_owner` 调用方,属误判闭合,现补)。bootstrap 启动种子(auth/service.py seed_*)免失效(进程冷启无缓存)。

## D-001@v1 : 会话面板基元统一方向 = antd
状态：implemented
变更：2026-08-22-session-panel-unify
锚点：未记录
最近确认：6fdabce0
理由：用户拍板 antd（AskUserQuestion 2026-08-22）。

## D-002@v1 : 实施方式 = 一次性原子改造
状态：implemented
变更：2026-08-22-session-panel-unify
锚点：未记录
最近确认：6fdabce0
理由：用户选方案 A：同一变更内一次做完，单轮验收。

## D-003@v1 : TurnStatusBadge 纳入 antd 化（Grill U-01）
状态：implemented
变更：2026-08-22-session-panel-unify
锚点：未记录
最近确认：6fdabce0
理由：用户拍板一并换 antd（贯彻「整个会话 UI 家族统一」）。

## D-004@v1 : 按钮尺寸 = 主操作 32px / 打断 small 24px（Grill U-02）
状态：implemented
变更：2026-08-22-session-panel-unify
锚点：未记录
最近确认：6fdabce0
理由：用户拍板：主操作 antd 默认 32px，打断对齐 page 惯例 small 24px。

## D-005@v1 : 📎 附件按钮 antd 映射 = type="text"（Grill U-03）
状态：implemented
变更：2026-08-22-session-panel-unify
锚点：未记录
最近确认：6fdabce0
理由：设计内定 type="text"（对应 ghost 无边框语义）。

## D-001@v1 : 团队=会话内能力而非独立会话类型
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：用户明确：团队类似子代理——当前会话的 agent（主控）通过 MCP 工具派分身（worker），进度与结果回到当前消息流，全程不离开对话。不新增会话类型、不新增列表条目、没有独立团队页面。

## D-002@v2 : 团队工具常驻注入（Claude 引擎，分身会话除外）
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：谓词收窄：provider==='claude' 且 stage 非 worker 标识（stage 为空=普通会话或 'orchestrator'=存量主控 → 注入；分身角色/'mission_worker' → 不注入）。用户授权来源同 v1（按推荐继续）。
supersedes：D-002@v1

## D-003@v1 : 一期 Claude 专属，Codex 按钮置灰
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：一期仅在 Claude 引擎会话提供团队能力；Codex 会话中触发入口置灰并提示「团队需要 Claude 引擎」。Codex MCP 注入另立后续变更（codex driver 契约注释已标"留后续任务"）。

## D-004@v1 : 触发四路等价
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：原型 v2 确认四条等价路径：①输入区「派团队」按钮+配置弹层 ②/team 指令前缀 ③自然语言（agent 常驻工具自主判断）④AskUser 卡选择。四路最终统一到同一条后端链路（显式预建或懒建 mission）。

## D-005@v1 : 删除独立团队页面与入口
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：删除 /workspaces/[id]/missions、/projects/[id]/missions 两个页面路由、mission-console 组件与「Agent 团队」菜单项；普通会话面板的「用团队分析」按钮改为在当前会话直接触发团队；历史 mission 数据不做迁移（项目未上线允许重置）。

## D-006@v1 : AgentMission 新增 session_id 列绑定发起会话
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：代码查证：AgentMission 无 session_id 列，旧"用团队分析"把 session_id 塞 constraints JSON 且全链路无消费（死参数）。本变更新增 agent_missions.session_id 列（FK agent_sessions，索引），废弃 constraints.session_id 约定。

## D-007@v2 : worker 派发链路复用（治理门查询加判别）
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：收窄为"派发链路（worktree/scope 校验/治理门规则/预算扣减）复用"；control.py 等查询条件加 role!='orchestrator' 判别。
supersedes：D-007@v1

## D-008@v1 : 会话结束与团队任务并存
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：worker 独立 lease 存活不受会话影响；mission 收敛由主控工具调用与 patrol 兜底完成；用户重新开启会话（reopen 基建已有）可继续看到任务块与结果。

## D-009@v1 : 主控轮双标记 mission_id + role='orchestrator'
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：会话存在活跃 mission 时 inject 当轮 AgentRun 回填 mission_id + role='orchestrator' 双标记；_get_main_run 取该 mission 最新 orchestrator run（存量 external mission 同规则天然兼容）；治理门/统计查询加 role!='orchestrator' 判别。

## D-010@v1 : converge 语义重定义（session 定位 + busy 引导 + 独立置位）
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：converge 按 X-Session-Id 解析 mission；分身未全终态返回 status=busy 引导 agent 等待；全终态直接置 converged_at（不依赖主控 run 状态）→ finalize 锚点=最新 orchestrator run；响应 status ∈ converged/busy/conflict/needs_manual。

## D-011@v1 : 旧 mission 端点删除范围精确化
状态：implemented
变更：2026-08-22-team-session-unify
锚点：未记录
最近确认：4d7adc1d
理由：删除范围=create+list 四端点及对应前端 client；保留 GET /missions/{id}、POST /missions/{id}/cancel、全部 MCP 端点；team-progress.tsx 不动。

## D-001@v1 : 三入口统一为一个门户组件（以 /sessions 为准）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
锚点：未记录
最近确认：c06c7934
理由：以 /sessions 为准抽共享 SessionsPortal（scope 判别联合），三入口渲染同一组件（用户三轮 AskUserQuestion 拍板：范围两处一起/方案A/设计确认）。

## D-002@v1 : 变更详情承载=专属路由门户
状态：implemented
变更：2026-08-22-workspace-sessions-portal
锚点：未记录
最近确认：c06c7934
理由：方案A：卡片变入口（前 3 条预览+打开按钮）跳专属路由（用户选，对比页内展开/全屏弹窗两案）。

## D-003@v2 : scope 列表数据源=全局端点+服务端过滤（取代 D-003@v1 客户端过滤）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
锚点：未记录
最近确认：c06c7934
理由：后端 GET /sessions 增 workspace_id/change_id 可选过滤参；前端 scope 复用全局端点（owner-scoped+全字段+筛选+分页），v2 的降级矩阵/客户端过滤/筛选隐藏全部退场。
supersedes：D-003@v1

## D-004@v1 : ?session= 升级为门户统一能力
状态：implemented
变更：2026-08-22-workspace-sessions-portal
锚点：未记录
最近确认：c06c7934
理由：SessionsPortal 统一支持 ?session=<id> 初始选中（迁移旧 :95-113 能力，无效 id 静默忽略），三入口通用。

## D-005@v1 : ended 会话恢复自动→手动（以 /sessions 行为为准）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
锚点：未记录
最近确认：c06c7934
理由：统一为 page 模式手动重开——用户「以 /sessions 为准」原则的直接推论；design §4.E 明示为有意交互变更。

## D-001@v1 : 方案 A——daemon 消费 SDK task_* + agent_task_status SSE 通道扩展
状态：implemented
变更：2026-08-27-background-subagent-progress
锚点：未记录
最近确认：debd368d
理由：daemon session-manager 拦截 SDK `task_started/task_progress/task_notification` system 消息，映射为扩展的 `agent_task_status` SSE 事件（复用 Redis `agent_session:{id}` 频道模式），异步启动回执解析做兜底。否决方案 B（daemon 透传 system 落库、backend 解析派生：事件与日志两套真相源，历史回看重放解析脆弱）；否决方案 C（前端纯展示层聚合：永远缺终态信号，卡片转圈到会话结束）。

## D-002@v1 : 生命周期双写——SSE 事件 + [TASK_*] 持久日志行
状态：implemented
变更：2026-08-27-background-subagent-progress
锚点：未记录
最近确认：debd368d
理由：生命周期节点除发 SSE 外，同步落 `[TASK_STARTED]/[TASK_PROGRESS]/[TASK_NOTIFICATION]` 前缀的 stdout 日志行（单行 JSON，行级带 parent_tool_use_id）。前端 assembler 识别前缀解析为段元数据，回放与实时同源；行带 parent 自动享受跨轮归位。

## D-003@v1 : 跨轮归位在 backend 落库时做（submit_messages 重映射 run_id）
状态：implemented
变更：2026-08-27-background-subagent-progress
锚点：未记录
最近确认：debd368d
理由：backend `submit_messages` 落库时，带 parent_tool_use_id 的行查 tool_use_id→run_id 映射（进程内 LRU + agent_run_logs tool_call 行冷启动反查）改写为派发 run。否决前端会话级链接（每个消费日志的页面都要适配，容易漏）。历史数据不迁移（项目未上线）。

## D-004@v1 : 空 prompt 防御——后端 422 为主，前端禁点为辅
状态：implemented
变更：2026-08-27-background-subagent-progress
锚点：未记录
最近确认：debd368d
理由：backend `inject_session` 对 strip 后为空的 prompt 抛 422（中文文案，领域类 SessionEmptyPrompt，过 l10n 守护）；前端发送按钮空内容 disabled 为辅助。服务端拒绝是权威（防任何调用方）。

## D-002@v1 : ctx 指标落库（AgentRun 加列）
状态：implemented
变更：2026-08-27-session-token-usage-fix
锚点：未记录
最近确认：c7f48562
理由：落库。不落库则刷新页面/重进会话后上下文环拿不到数值。项目未上线（CLAUDE.md 规则 11），允许直接加列迁移。

## D-003@v1 : 历史会话（无 ctx 数据）环显示未知
状态：implemented
变更：2026-08-27-session-token-usage-fix
锚点：未记录
最近确认：c7f48562
理由：如实显示"未知/—"（不算百分比），不用旧口径估算（旧口径 input 是该轮所有调用求和，数字本身失真）。

## D-005@v1 : 实现方案选 A（复用 usage 附带管线 + daemon 按轮重置）
状态：implemented
变更：2026-08-27-session-token-usage-fix
锚点：未记录
最近确认：c7f48562
理由：方案 A。daemon 在现有 usage 字典加 ctx_tokens（message_start 算本次调用 input+cache_read+cache_creation）；轮边界重置累积器使实时值=本轮至今量（与终态口径一致）；backend/frontend 全链路加字段透传（AgentRun.ctx_tokens 列 + SSE + SessionRunRead）。完全符合 D-001~D-004。否决 B（改动面翻倍且旧通道无法删除，两套并存反而更乱）；否决 C（环仍爆表、跳变仅被隐藏）。

## D-001@v2 : 统一=本轮增量；终态 SDK result 权威校准
状态：implemented
变更：2026-08-27-session-token-usage-fix
锚点：未记录
最近确认：c7f48562
理由：统一仍为本轮增量；终态以 SDK result 值为权威覆盖（校准语义）。消除的是"语义级"跳变（会话累计暴涨→本轮骤降）；若两路数值有小出入，表现为终态定格时小幅校正。execute 首任务跑真实会话 spike 验证，偏差 >5% 启用 fallback（close 仅当 result > 实时值才覆盖 input/output）。
supersedes：D-001@v1

## D-006@v1 : ctx_tokens 仅 main 桶计算与注入
状态：implemented
变更：2026-08-27-session-token-usage-fix
锚点：未记录
最近确认：c7f48562
理由：lastCallCtxTokens 仅 'main' 桶计算与注入 pendingUsage；子桶 pendingUsage 不含 ctx_tokens（backend usage.get 缺失即跳过，天然兼容）。turnInput/turnOutput 所有桶照常（子代理计费量并入本轮）。

## D-001@v1 : 关联入口双向都要
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：双向都要——任务/问题侧提供"发起会话"入口（详情/列表处），会话输入框 @联想扩展支持选择 PPM 任务/问题，与现有变更/快速修复绑定体验一致。

## D-002@v1 : 全状态可关联
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：全状态可关联。列表/联想默认展示"进行中"，但已完成/未开始的任务也能手动关联（如复盘场景）。

## D-003@v1 : 附件真注入 + 降级文字清单
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：真附件注入——后端尝试读取附件内容作为真附件传给 agent（能看图/读文件）；读取失败的降级为文字清单（附件名+链接）。

## D-007@v1 : PPM 附件访问控制复用 _can_access
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：复用 FileService._can_access 同口径校验：有权条目物化注入；无权条目降级文字清单仅列文件名并注明「无权访问」（不带链接）。行为对齐 PPM UI 现状（batch_meta 同样静默剔除无权行），不引入跨用户文件读取。

## D-006@v1 : PPM 附件物化为 SessionAttachment
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：创建会话携带 ppm item 时，后端把任务 file_urls 对应 File 读取 bytes → 写入 session attachment storage → 物化 SessionAttachment 行（session_id 直接回填、user_id=创建者），并入现有 attachment_ids 组装链路（assemble_inject_attachments/download 回调/标记行/前端展示全复用，daemon 零改动）。

## D-005@v1 : 统一 PPM 绑定表（方案 B）
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：方案 B——一张 `ppm_item_session_links` 表（kind 字段区分 plan_task/problem），一套绑定 helper + 一个统一前导构建器；@联想/会话筛选/任务侧卡片前端逻辑复用一套。

## D-004@v2 : 工作区排序键定死 workspace_id 升序
状态：implemented
变更：2026-08-28-session-ppm-task-binding
锚点：未记录
最近确认：73a4eda3
理由：workspace_id 升序（UUID 字典序）为唯一排序键，后端 link.workspace_id 写入与前端预选同键，消除分叉。
supersedes：D-004@v1

## D-004@v1 : 数据链路实现方案
状态：implemented
变更：2026-08-29-session-usage-stats
锚点：未记录
最近确认：0ea25728
理由：方案 A——新增 GET /api/daemon/sessions/{id}/usage 聚合端点：agent_run_model_usage 按 session 的 runs 聚合为主、AgentRun 六 token 列兜底无明细行的老 run，返回会话汇总+按模型分组；与 /runtimes/usage 先例同模式

## D-001@v1 : 注入通道选前导拼接，不动 system_prompt 与 daemon
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：现有 4 条注入通道中选「前导拼接」：backend `daemon/session/context.py` 新增前导构建函数，`session/service.py` create_session 的 `_prefix_parts` 接线（变更/页面/PPM/团队简报四前导同款模式）。否决 system_prompt 通道（仅 claude 消费，codex 不支持，且是 per-AgentProfile 语义）与 daemon 侧注入（daemon 纯透传、不认识用户）。

## D-002@v1 : 仅首轮注入 + 覆盖重派重渲染路径；后续轮次与服务身份注入不带
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：仅首轮（用户信息+规则留在上下文持续生效，避免每轮膨胀）；掉线重派（batch-session-inherit 的 prompt 重渲染路径）须确认重渲染时同样带上。后续轮次 `_inject_into_session` 与平台审批代写等服务身份注入不带用户前导（由「仅首轮」自然满足）。

## D-003@v2 : 不加 Role 字段，角色名称直接给 agent 自行判断沟通风格
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：用户在 brainstorm step 6 明确推翻 Role 加字段方案：「直接给角色名称给 agent 分析就行，不要加字段了」。用户信息块内列出角色名称原文 + 一小段静态沟通适配指引文案，由 agent 根据角色名自行判断用业务语言还是技术语言。无 schema 迁移、无 admin/前端改动，变更范围缩小为 backend daemon/session 模块。
supersedes：D-003@v1

## D-004@v1 : SillySpec 工具规则条件注入（工作区根存在 .sillyspec/ 才拼）
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：条件注入：仅会话绑定的工作区根目录检测到 `.sillyspec/` 目录才拼入。无条件注入会诱导 agent 在非 SillySpec 项目擅自 `sillyspec init` 污染用户仓库。无工作区会话不注入该块。

## D-005@v1 : batch（批量任务）路径本期不注入
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：本期仅做交互会话（interactive session）；batch 已有 CLAUDE.md prepend 通道，将来可复用同一套模板函数，不纳入本变更范围。

## D-007@v1 : 整体方案选 A（后端前导拼接 + Role 受众字段），否决 B（纯 prompt 猜测）与 C（system_prompt 通道）
状态：implemented
变更：2026-08-29-session-user-preamble
锚点：未记录
最近确认：c7346118
理由：用户在 explore 阶段看到完整对比表后确认「帮我实现吧」= 选 A。A 是唯一同时满足 D-001~D-006 的方案；B 违反 D-003（自由文本角色名不可靠推断）且画像判定失控；C 违反 D-001（codex 不支持 systemPrompt，provider 不对称）。

## D-002@v1 : token 统计范围 = 派发执行 ∪ 关联会话执行（按 run 去重）
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：并集去重（用户 AskUserQuestion 确认）。变更侧 = 直接挂 change_id 的 run ∪ 关联会话（change_session_links）内全部 run，按 run id 去重合并。跨变更共享会话时同一份消耗会在多个变更各显示一次——口径特性非 bug，详情页注明。快速修复无派发链路，恒走 quicklog_session_links→agent_sessions→agent_runs 会话链路（代码事实，非选项）。

## D-003@v1 : 落地方式 = 实时聚合计算字段（零迁移）
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：实时聚合（用户 AskUserQuestion 确认）。查询时从 agent_runs / agent_run_model_usage 现算，DTO 计算字段，不新建表列、零 migration；数字与最新执行终态一致。列表用批量聚合（一条 SQL 按变更分组）。否决「冗余入表」。

## D-004@v1 : 展示位置 = 列表 + 详情都要
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：列表 + 详情都要（用户 AskUserQuestion 确认）。变更中心「变更」tab 与「快速修复」tab 列表各加摘要列（耗时 + token 总量档）；变更详情页与快速修复抽屉展示完整五指标（输入/输出/缓存读/缓存写/调用次数 + 轮次）+ 分模型明细。对齐运行时页/会话页用量卡先例。

## D-005@v1 : API 形态 = 方案 A（独立用量端点 + 列表内嵌摘要）
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：方案 A（用户 AskUserQuestion 确认）。列表 DTO（ChangeSummary / QuicklogEntryListItem）内嵌摘要字段，批量聚合一条 SQL 挂既有富化管道（零 N+1）；完整五指标+分模型明细走两个新独立端点；前端一个可复用用量组件覆盖变更详情页与快速修复抽屉。否决 B（详情响应膨胀、分模型明细无处安放、与先例不一致）与 C（run DTO 仅输入/输出两维，数据面不成立——session-usage-stats 先例已核实）。

## D-006@v1 : 软删会话的执行计入统计
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：计入。消耗真实发生，用量口径=真实成本；UI 隐藏是展示层整洁考虑，两者不矛盾——详情卡注脚声明（R-07）。孤儿 run（agent_session_id 已置空）经派发锚点 change_id 仍可命中，不丢数。

## D-007@v1 : 用量卡取数用 react-query useQuery（非 useEffect）
状态：implemented
变更：2026-08-30-change-center-usage-stats
锚点：未记录
最近确认：84a5b960
理由：useQuery。两个目标渲染点的既有卡片（repo://sillyhub/frontend/src/components/changes/detail/change-sessions-card.tsx:60 / repo://sillyhub/frontend/src/components/changes/quicklog-sessions-card.tsx:60）均用 useQuery 且都在 QueryClientProvider 内；session-usage-bar 规避的是会话浮窗零 react-query 约束，本变更两渲染点无此约束。变更详情页「本页禁新增网络请求」注释（repo://sillyhub/frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx:371）经核实为 last-signal 功能局部语境（禁的是为派生小字段加轮询，同页 sessions 卡已自取数）。

## D-001@v1 : 缺口①触发形态 — 心跳恢复事件触发
状态：implemented
变更：2026-08-30-daemon-self-heal
锚点：未记录
最近确认：ecdae9ba
理由：`_sendHeartbeatOnce` 成功分支、degraded 累计 >720s 守卫、复用 boot

## D-003@v1 : 下载校验口径 — 零子进程
状态：implemented
变更：2026-08-30-daemon-self-heal
锚点：未记录
最近确认：ecdae9ba
理由：buffer ≥64KB 且 `BUILD_ID` 正则可提取（与 `DISK_BUILD_ID_RE` 同款，

## D-005@v1 : respawn 最后防线 — 不退出保活
状态：implemented
变更：2026-08-30-daemon-self-heal
锚点：未记录
最近确认：ecdae9ba
理由：spawn 前同款校验，不过 → error 日志 + 提前 return 不退出；返回类型

## D-009@v1 : respawn 前校验提前到 stop 之前（主拦截点）
状态：implemented
变更：2026-08-30-daemon-self-heal
锚点：未记录
最近确认：ecdae9ba
理由：新增 `validateBundleOnDisk` 导出；`_tryUpdate` 在 stop() **之前**调用：

## D-003@v1 : 实现方案——daemon 自发现 + 日志 tail 推导 + 第一方事件汇聚（方案 1）
状态：implemented
变更：2026-09-07-agent-liveness-states
锚点：未记录
最近确认：e76e191d9
理由：方案 1。唯一同时满足"全托管会话有状态灯（含 zcode 非托管登记）"与"blocked 确定性"的路线，CLI 契约零变更零回归（草案 D-005），五层既有地基全复用；代价是 daemon 侧工作量最大，由 P1a 先行消化。方案 2 违反"CLI 非执行体"既定定位且覆盖不了登记盲区；方案 3 放弃 zcode/裸会话覆盖，G-1 达不成

## D-004@v1 : 状态展示两层——会话列表小灯+悬浮卡，完整总览放工作台
状态：implemented
变更：2026-09-07-agent-liveness-states
锚点：未记录
最近确认：e76e191d9
理由：A。会话列表每行行尾只加 ~18px 状态小灯（五态色+呼吸闪烁，不新增列不改布局），悬停弹详情小卡（静默时长/关联 ctx/证据摘要）；完整「Agent 状态总览」卡片（分组计数+等人跳转）放工作台首页。用户原话背景：会话列表没那么大空间展示这些信息

## D-003@v1 : PPM 个人工作台头像维持首字占位（用户头像功能非目标）
状态：implemented
锚点：未记录
最近确认：41c3b37
理由：2026-09-10-account-avatar-upload——PPM 已上线模块不动，WorkbenchProfile.avatar_text 维持首字；展示范围圈定为个人中心+顶栏+群聊（用户选定）。后续要接入再单独立变更。

## D-001@v1 实施路线——渐进下沉（双轨兼容）而非契约替换或最小注册表
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：方案A 渐进下沉。driver 内归一化吐 AgentEvent，backend/前端双轨兼容新旧两种事件格式，验证稳定后再退役旧文本协议（退役为后续 change）

## D-002@v1 会话级信号的承载方式——status 事件 subtype + 有状态归一化器，raw 降格为调试通道
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：①会话级信号全部事件化为 status 型 + subtype 枚举（session_started/bash_status/plan_mode/agent_task_status/task_notification），SessionManager 改按 subtype 分发；②depth 状态机等跨消息状态由有状态归一化器类（ClaudeEventNormalizer，每会话实例）内部维护；③envelope.raw 仅在 SILLYHUB_DEBUG_RAW_EVENTS=1 时携带，下游禁止依赖（cli.ts 的 SDKMessage 接线随之演进）

## D-003@v1 usage 实时透传语义——任意携带 usage 的事件即更新，不限 turn_result
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：对齐现行为：任意携带 usage 的 AgentEvent（含 partial text/thinking flush 事件）→ daemon lift → backend 更新 agent_runs token 统计 + SSE summary 实时透传（现链路锚点 repo://sillyhub/sillyhub-daemon/src/daemon.ts:3564-3586、repo://sillyhub/backend/app/modules/daemon/run_sync/service/submit_steps.py:350）

## D-004@v1 partial override 撤回的事件化表达——override:true + segment_id
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：text/thinking 事件增加可选 override:boolean——true 表示替换同 segment_id 已落库 partial 行；backend 行为对齐现有 stale 撤回链（DELETE by (run_id, segment_id) → INSERT）。partial/override 归一化逻辑移植自 daemon session-manager 现实现（非 backend _extract_sdk_messages，后者对 stream_event 恒返回空）

## D-005@v1 AgentEvent v2 契约补遗——status 增 thinking_tokens 子类型、usage 增 ctx_tokens 字段
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：契约微扩：AgentStatusSubtype += 'thinking_tokens'；AgentEventUsage += ctx_tokens?: number。归一化器对应产出（thinking_tokens 子类型事件、usage 差分携带 ctx_tokens）

## D-006@v1 双轨渲染已知改进差异的取舍——主 agent Task tool_result 配对（新轨 call_id 优先）与 cache_* 完整帧聚合（新轨更全）
状态：implemented
变更：2026-09-03-agent-provider-abstraction
锚点：未记录
最近确认：c6c74aa49
理由：均接受为已知改进差异（新轨行为更正确），以豁免/可执行登记形式固化（dual-path fixture 豁免 #2 + TestDocumentedFormatDivergences/§2 差异冻结测试），不要求新轨复刻旧轨缺陷；旧轨本身零改动（回退轨保真）

## D-001@v1 命令下发通道——机器级即时 WS 指令（方案 A）
状态：implemented
变更：2026-09-04-conflict-resolve-entry
锚点：未记录
最近确认：0d7e66502
理由：方案 A。复用机器级 fire-and-forget WS 指令先例（self_update/cleanup/sillyspec_update 同款，`POST /machines/{id}/sillyspec-update` repo://sillyhub/backend/app/modules/daemon/router/machines.py:197）：backend 校验权限后经 DaemonWsHub 即时下发，daemon 侧 handler 本地 execFile 执行 sillyspec CLI（sillyspec-manager 30s 超时模式），执行结果缓存于 daemon 内存并随下次心跳 sillyspec_status 通道上报（≤60s 页面自动回绿）。B 的离线补拉增益对本场景为负（sillyspec 操作必须机器在线，离线排队上线时现场可能已变）且六处协议扩展过重；C 的 host_fs RPC 挂会话上下文无页面载体、字符级白名单对变长 change 名脆弱，不适配

## D-003@v1 操作权限——机器所有者 + 平台管理员
状态：implemented
变更：2026-09-04-conflict-resolve-entry
锚点：未记录
最近确认：0d7e66502
理由：机器所有者 + 平台管理员。冲突数据挂机器维度，机器主人最清楚现场，管理员兜底无主机器；其他成员只读红灯不可操作。活跃阶段变更（非 archived）的冲突行加警示标注 + 确认弹窗加重文案，不硬禁（机器主人有最终裁量）

## D-004@v1 心跳 sillyspec_command_result 落库语义——两态清除 + register 恒清（Grill X-04 修订）
状态：implemented
变更：2026-09-04-conflict-resolve-entry
锚点：未记录
最近确认：0d7e66502
理由：两态。对象=整包直写、键不出现=置 NULL 清除，与 sillyspec_status 现状（repo://sillyhub/backend/app/modules/daemon/model.py:126、repo://sillyhub/backend/app/modules/daemon/runtime/service.py:523）语义一致；daemon 终态窗过期后直接停发该键，不发送显式 null；register 恒清（repo://sillyhub/backend/app/modules/daemon/service.py:233 先例）堵 daemon 重启后 DB 残留。三态需在心跳面新增 absent/null 判别，唯一先例 repo://sillyhub/backend/app/modules/daemon/router/machines.py:98 display_alias PUT 属 PUT 端点非心跳，无谓引入新机制

## D-001@v1 cursor 交互式 driver 架构——每轮 respawn + --resume chatId 薄 driver
状态：implemented
变更：2026-09-08-cursor-interactive-session
锚点：未记录
最近确认：35f3d6528
理由：方案A 每轮 respawn。每个 UserTurnInput spawn 一次 `cursor-agent -p --output-format stream-json [--resume chatId] [--model] <prompt>`，NDJSON 逐帧归一化为 AgentEvent v2，result 帧 + 进程退出 = turn 收敛；chatId 从帧内 session_id 捕获（`create-chat` 子命令兜底）；Windows 经 resolveWindowsCmdShim（含 cursor 坏 ps1 版本目录增强）。B/C 否决：worker 实测是 Cursor 云端 worker 注册通道（K8s 探针/标签/池分配，非本地 stdio 会话协议）；cursor-agent 无 --input-format/SDK 控制协议（批量适配 D-008@v1 已证参数集分叉），ClaudeSdkDriver 握手必挂

## D-002@v1 接入范围——仅交互式会话最小闭环
状态：implemented
变更：2026-09-08-cursor-interactive-session
锚点：未记录
最近确认：35f3d6528
理由：仅最小闭环：补齐交互式会话链路（driver + 归一化器 + 注册表 + 三端 caps + 前端白名单 + 测试 + 冒烟），对齐 pi 接入先例。liveness 推导器注册与平台侧 Cursor 凭证配置（llm_provider agent_kind 扩展 + CursorCredentialInjector）留后续变更

## D-004@v1 caps 守护测试 EXPECTED_PROVIDERS 同步必改（Grill B-01）
状态：implemented
变更：2026-09-08-cursor-interactive-session
锚点：未记录
最近确认：35f3d6528
理由：否。`repo://sillyhub/backend/app/modules/agent/tests/test_provider_caps_alignment.py:52` EXPECTED_PROVIDERS 为硬编码 `{"claude","codex","pi"}`，test_provider_sets_identical 对三端表断言集合相等——三端表加 cursor 后守护测试必失败。必须同 commit 同步 EXPECTED_PROVIDERS 加 'cursor'（pi 接入 commit 7c4dd4efd 同款先例）。设计文件清单已补该文件

## D-001@v1 派生粒度=工具调用聚合为单任务
状态：implemented
变更：2026-09-07-pi-task-events
锚点：未记录
最近确认：35f3d6528
理由：以「一轮（turn）内的活动」聚合为单条任务：turn_start 建/复running行（task_id=pi-run-<runId> 稳定键，task_name 取首轮用户消息或'执行任务'），tool_execution_start 刷新 last_tool_name/tool_uses 累计/summary（'正在调用 X'），tool_execution_end 保持 running（工具成败不等于任务成败），turn_end 按 stopReason 映射终态（error→failed 其余→completed）置 message/finished_at。子代理粒度（claude Task 工具那种）pi 原始流无对应概念，不做

## D-002@v1 派生位置选归一化器（方案 A）——⚠️ 自主决策待用户复核
状态：implemented
变更：2026-09-07-pi-task-events
锚点：未记录
最近确认：35f3d6528
理由：选 A。PiEventNormalizer 增实例级 turnTask 聚合状态产出 status/agent_task_status——贴 claude-events 同位置派生信号的既有架构，session-manager/_dispatchStatusEvent→cli 上报链路零改动，纯函数测试范式可延续；代价是归一化器从逐行纯函数升级为实例级状态机（turn 边界做状态推进点，normalizeRpcLine 单行解析仍独立）

## D-003@v1 设计整体确认——⚠️ 自主决策待用户复核
状态：implemented
变更：2026-09-07-pi-task-events
锚点：未记录
最近确认：35f3d6528
理由：按 D-001/D-002 定稿确认。原型跳过理由：纯数据链路补齐，前端任务执行面板零改动（pi 会话从空态变有数据，无界面变化，原型分级「纯后端无界面变化」档）

## D-004@v1 design-grill 修正——stopReason 枚举实证与测试路径
状态：implemented
变更：2026-09-07-pi-task-events
锚点：未记录
最近确认：35f3d6528
理由：修正三处：①fixture 全量实证 stopReason 仅 stop/error 两值，aborted 是 ame.error 的 reason（流层中止）非 stopReason——删除 aborted→stopped 映射，被打断的轮按 completed 收行；②测试路径实存 tests/interactive/pi-events.test.ts，新增集成用例定名 tests/interactive/pi-task-dispatch.test.ts；③R-01 应对改写：既有用例 expected 数组需追加派生事件（预期适配非破坏）

## D-002@v2 品牌色派生 token 三主题分值（blue 不继承紫）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：品牌色派生 token（--aurora-*/--row-active(-ring)/--shadow-glow/--shadow-primary）按既有 --shadow-primary 三主题分值惯例写满 :root/[data-theme="blue"]/[data-theme="dark"] 三块，blue 给蓝系取值
supersedes：D-002@v1

## D-003@v1 消息形态 = 气泡 + 头像
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：用户选定「气泡 + 头像」——现有气泡骨架保留，agent 消息加品牌渐变头像（Bot/引擎图标），用户消息维持右对齐品牌色气泡

## D-004@v1 范围含群聊面板
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：会话页 + 群聊一起改——group-chat-panel 的消息行同步焕新（头像/气泡层级/代码块已由 MarkdownText 共享自动获益）

## D-005@v1 dark 主题底色一起调
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：连主题底色一起调——dark 主题 card/border 取值微调拉大页面底与卡片反差（themes.ts darkTheme + globals.css dark 变量块同步，取值仍限 Tailwind v3 zinc 阶默认值）；全站受益，回归面经 build+主页面实拍控制

## D-006@v3 群聊 agent 成员无自定义头像时统一 Bot 渐变光环（取舍记录）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：取舍为维持统一光环——发送者区分由消息行成员名行承担且群聊本就渲染成员名；统一 agent 视觉锚点（与单聊一致）价值大于分色辨识（分色仍保留在成员面板/facepile 等非消息行场景）；自定义头像（avatar 入参）优先级不变
supersedes：D-006@v2

## D-007@v1 高级感设计语言（v2 原型定调）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：v2 原型定调六根杠杆——①环境极光背景（品牌色径向渐变光晕，浅/dark 双套取值）；②多层弥散阴影替代硬边框（边框统一降透明 --border-soft）；③玻璃拟态（顶栏/面板头/列表列 backdrop-blur + saturate）；④渐变点睛收敛到三处：标题「智能体」渐变字、agent 光环头像、发送按钮；⑤macOS 风深空代码块（三色窗点+语言标签+复制钮）；⑥微交互（发送钮 hover 浮起/点击回弹、plus 钮 hover 渐变填充、composer 聚焦光环+弥散阴影）

## D-008@v1 v3 修正——玻璃可读性 + 删流光顶条
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：①玻璃拟态不可读的根因是极光只铺内容区、玻璃面板底下是纯色底没有东西可透——v3 把极光铺满整个应用底（body background-attachment: fixed），侧栏/列表列/面板整体降透明 + backdrop-blur，玻璃下有色彩可透才读得出玻璃感；②panel-accent 渐变流光顶条整体删除——运行态氛围收敛为脉冲状态点 + 任务条 spinner 两个既有元素，克制优先，不再加新动效载体

## D-009@v1 v4 自查修正（用户要求"你自己看看效果图"后的逐项自审）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：自审五条——①浅色下用户气泡紫色面积太大太吵（max-width 76%→72% + shadow-primary 降重：阴影 alpha 减半）；②composer 聚焦光环 v3 过浓且原型硬编码常驻焦点态（dark 下呈 RGB 霓虹圈游戏感）——改 3px/10% 透明度柔环、阴影不再跳档、原型展示常态；③列表/导航选中态两主题都太弱——inset 描边从 border-soft 换品牌色 22%/30% 透明度（--row-active-ring 新 token）；④浅色右上极光泛紫过浓（13%→9%）；⑤dark 极光太弱整体死黑（四团光晕各加 3-4 个百分点）

## D-010@v1 RoundDivider 状态六态映射
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：status 改六态判别联合，着色映射：completed=success / failed+killed=error / running=info / pending+interrupting=neutral

## D-011@v1 死 token 删除 + G-02 43px 悬空口径修正
状态：implemented
变更：2026-09-09-sessions-visual-refresh
锚点：未记录
最近确认：1f515ddce
理由：①四 token 全删（消费面 Tailwind 阶已达成同观感，留死定义徒增维护面）；②G-02 作废——task-05 的 43px 对齐要求删除（对话视图无过程行，全部视图按 G-03 不动，turn-segment-views 零改动是正确实现）；③design 文件清单 layout.tsx 行改指 app-shell.tsx（极光实际落点）

## D-009@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
锚点：未记录
最近确认：353eb11b0
理由：否——用户明确「不应该限制 agent 类型」，跨 harness 同变更挂接是需求而非缺陷
否决理由：与「同变更就挂」需求直接冲突
复潮条件：未来出现同变更跨 harness 归属仍需区分展示的需求

## D-010@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
锚点：未记录
最近确认：353eb11b0
理由：否——首次错标仍会发生、subagent 归属仍靠 cwd 猜，治标不治本
否决理由：治标；不满足 FR-01
复潮条件：锚定方案在某个 harness 上不可实施时的局部回退

## D-011@v1
状态：rejected
变更：2026-09-11-agent-log-attribution-refactor
锚点：未记录
最近确认：353eb11b0
理由：否——动表结构与 D-005 冲突；现有 change/quicklog links 表已能表达「会话↔ctx」登记
否决理由：违反已确认的「不动表结构」决策；现有 links 表能力足够
复潮条件：ctx owner 解析出现性能问题或需要显式管理界面

## D-003@v2 聚合形态 = 编译期聚合（落点修订）
状态：implemented
变更：2026-09-11-provider-adapter-registry
锚点：未记录
最近确认：f0211bbcf
理由：Grill 复审发现 @v1 表述「新建 provider-adapter.ts」与实际最优落点不符——ProviderDescriptor（repo://sillyhub/sillyhub-daemon/src/interactive/providers.ts:262）已承载五要素，原地扩展 INTERACTIVE_PROVIDERS 为 ProviderAdapter 聚合表改动面最小。@v2 修订：落点=providers.ts 内扩展，不另立契约文件。
supersedes：D-003@v1

## D-001@v1 预会话草稿键细分，消除跨入口串台
状态：implemented
变更：2026-09-13-session-group-ux-fixes
锚点：未记录
最近确认：39d3d8c5c
理由：代码查证：真会话草稿按 sessionId 隔离（sillyhub.sessions.draft.<sid>）且所有 7 个 SessionPanel 宿主均有 key={sessionId} 强制重挂载，rAF 门闩（draftHydratedRef）时序推演在重挂载/非重挂载两路径均正确；唯预会话（sessionId=null）草稿用固定键 __pre__（repo://sillyhub/frontend/src/components/daemon/session-panel/turn-state.ts:304），跨工作区/跨机器入口共享——用户在不同入口开新会话时上一入口未发送内容必然带入，与用户「a 会话内容带到 b 会话」实测吻合。修复：预会话草稿键按 workspaceId+runtimeId 细分（__pre__:<ws>:<runtime>），真会话逻辑不动仅补测试覆盖。

## D-002@v2 拖拽不使用 setPointerCapture（Grill 修正）
状态：implemented
变更：2026-09-13-session-group-ux-fixes
锚点：未记录
最近确认：39d3d8c5c
理由：不用。repo://sillyhub/frontend/src/components/ui/panel-resizer.tsx:11-13 真实先例明文因 jsdom 无实现而不用 setPointerCapture，window 级 pointermove/pointerup 监听已保证拖出元素收事件；测试走 fireEvent(window) 同路径（explorer-page.test.tsx 补坐标方案）。@v1 表述中「+ setPointerCapture」为 brainstorm 期误引，以本版为准。
supersedes：D-002@v1

## D-003@v1 群聊跨工作区可见性——后端返回可见工作区集合
状态：implemented
变更：2026-09-13-session-group-ux-fixes
锚点：未记录
最近确认：39d3d8c5c
理由：选后端方案：list_groups 响应组装时为每个群计算 visible_workspace_ids（直接 workspace_id + project 经 PpmProjectWorkspace 关联的全部 workspace_id，批量查询无 N+1），GroupChatListItemRead 加字段；前端各消费点（桌面 session-list-panel / 移动 mobile-session-list / 悬浮宿主如有群分区）过滤改为 includes 判定。理由：单一数据源、全部消费点免费获益、避免每个消费点各自拉项目-工作区映射造成数据不一致与重复查询。可见性口径：仅放宽列表展示（用户须是群成员才看得到，现有 member 过滤不动），打开群后的访问控制仍走群成员校验，权限语义零变化。

## D-004@v1 整体方案选 A——后端可见集合 + 预会话键细分 + Pointer Events
状态：implemented
变更：2026-09-13-session-group-ux-fixes
锚点：未记录
最近确认：39d3d8c5c
理由：用户选定方案 A。理由要点：单一数据源、全部消费点免费获益、改动聚焦（backend 2 + frontend 5 文件）；否决 B（逻辑复制 3 处、映射独立加载有时序窗口）；否决 C（真会话串台未证实，为未证实问题重构违反 YAGNI）。

## D-001@v1 修复方案——锚点 + 协议标记（方案 A）
状态：implemented
变更：2026-09-15-background-task-permission-lockout
锚点：未记录
最近确认：e21bf19cc
理由：A。daemon `onResult` 在会话的后台任务注册表非空时保留 currentRunId 作后台锚点（任务全部终态注销时清）；写通道守卫 `writeChannelGuardDeny` 新增「status=active + currentRunId 在 + 注册表有存活任务」放行条件；权限请求协议加 `background_task` 标记，backend `handle_permission_request` 据此放宽 active-turn 校验为「按 run_id 直查 + 会话归属校验」
故障面：注册表泄漏（task_notification 永不到达）会让锚点 currentRunId 永不清 → 守卫放行窗口变长；缓解＝锚点仅在 status=active 时有效，下一次 inject 正常切新 run，写策略/人审链路仍全程生效，放行的只是「通道存在性」而非权限本身
退役判据：SDK 未来提供 per-task 权限上下文（canUseTool 带 task 归属）时，锚点机制可退役为直连 task→run 权限路由

## D-001@v1 游标修复方案——before_id 附加参数 + 块内复合过滤（方案 A）
状态：implemented
变更：2026-09-16-logs-cursor-tiebreaker
锚点：未记录
最近确认：b204034fb
理由：A。backend get_agent_session_logs 新增可选 before_id 查询参数，before_id 非空时过滤改 `(ts < before) OR (ts = before AND id < before_id)`，缺省保持现行 `ts <= before` 旧语义；ORDER BY（run 块序 anchor_ts→ts→id）零改动；openapi/gen:types 同步；前端游标升级 (ts,id) 二元组 + pageKey 追加 id 后缀 + loadEarlierOnce 进度判定二元组化
故障面：WHERE 裸 ts 过滤与 run 块序排序键不对齐是既有已接受局限（跨 run 时间交叠时 ts 游标可跳行）——顺序会话（一会话一活跃轮）不受影响，本变更不扩大该局限（复合过滤仅在块内收紧）
退役判据：若未来日志查询改为全局 (ts,id) 序的专用分页端点或换 cursor token 协议，before_id 参数随 before 一并退役

## D-001@v1 对齐范围 = 变更中心列表页 + 详情页的功能补齐
状态：implemented
变更：2026-09-16-mobile-changes-parity
锚点：未记录
最近确认：d33092ea3
理由：变更中心在 PC 端由两个路由承载——列表页 `/workspaces/[id]/changes`（含 quicklog tab）与详情页 `/workspaces/[id]/changes/[cid]`；移动端对应 `/m/workspaces/[id]/changes` 与 `/m/workspaces/[id]/changes/[cid]`。对齐范围为这两对页面。

## D-002@v1 任务看板 / 任务执行页维持桌面引导，不在本次对齐
状态：implemented
变更：2026-09-16-mobile-changes-parity
锚点：未记录
最近确认：d33092ea3
理由：不移植。原变更 2026-08-26-mobile-workspace-page D-002 已明确将任务域裁剪出移动端核心版，移动详情页保留「任务区桌面引导条」；任务看板+执行页是独立大块功能（非列表/详情的信息呈现），用户指令针对「变更中心内容」，未点名任务域。
故障面：用户若预期任务看板也上手机端，本决策遗漏该预期——汇报中显式列为可否决项

## D-005@v1 实现方案 = 方案 A「既有组件复用挂载 + 移动壳适配」
状态：implemented
变更：2026-09-16-mobile-changes-parity
锚点：未记录
最近确认：d33092ea3
理由：选方案 A。三案对比：A=PC 既有卡组件（ChangeUsageCard/ChangeLastSignal/ScopeAuditCommandCard/ChangeActivityBadge）布局无 lg 依赖可直接挂载，数据层函数与 query key 全部复用，移动壳（筛选抽屉/⋯菜单/折叠卡）沿用本页既有范式；B=每卡重写移动版，违反移动端代码明文约束「数据层 100% 复用桌面（禁止复制第二份实现）」（每份移动页头部注释均载），制造双实现漂移面；C=废弃 /m/ 路由体系改响应式，推翻 2026-08-26-mobile-workspace-page 整个架构决策，牵连 m/layout 钻取路由、MobileWorkspaceHeader、底部 Tab 等全部移动基建。A 是仓库惯例的直接推论，非开放取舍。
故障面：若某桌面组件在小屏实测溢出（如 ScopeAuditCommandCard 明细表），需就地加移动断点而非重写——执行时验证
退役判据：若未来移动端整体转向响应式单套页面（方案 C 复活），本决策随之退役

## D-001@v1 知识来源范围——会话记录 + 手工录入 + 变更归档
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：用户多选确认：会话记录、手工录入、变更归档三项；事件复盘（incident postmortem）不在 v1 范围。

## D-002@v1 蒸馏引擎=派发 agent 会话（非后端直调 LLM）
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：派发 agent 会话。理由（用户选项描述）：能力最强，agent 能读文件、能跑 sillyspec knowledge propose 等命令，产物直接落在 .sillyspec 树内，与 CLI 口径天然一致。
故障面：派发依赖 daemon 在线与 lease 可用；daemon 离线时蒸馏任务排队/失败需有反馈路径。
退役判据：若 agent 会话蒸馏成本/时延不可接受且后端 LiteLLM 直调已能覆盖同等质量，可复议 D-002@v2。

## D-003@v1 入库位置=.sillyspec/knowledge 树（与 sillyspec CLI 同源）
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：写入 .sillyspec/knowledge。候选先进待审区（proposed/），人工审核后合并进正式知识文件并更新 INDEX，经现有 spec 同步（spec_version bump → daemon lease claim 按 latest_spec_version 拉取）回流各端；CLI 与网页看到同一份。
故障面：平台侧写入与 daemon 上行同步可能撞 manifest 乐观锁（冲突走既有 conflict 路径人工拍板）。
退役判据：若知识规模/并发写入增长到文件树形态不可维护（数千条目/多人同时写常态），复议为文件真相源之上加 DB 读索引，而非放弃与 CLI 同源。

## D-005@v1 平台侧写路径=方案A 平台直写（服务端权威写 + 蒸馏上行复用现有同步）
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：用户单选确认：方案A 平台直写。手工录入与审核合并由 backend 直接写服务器 spec_root（维护 SpecFileManifest 单写者语义：行版本 +1、spec_version bump、软删备份），网页即时生效不依赖 daemon 在线；agent 蒸馏任务在会话内写本地 .sillyspec 后照现有上行同步回流（pull/push 维持主动快照语义，daemon 决策库 D-004@v1）。与上行同步撞同文件冲突走既有 manifest conflict 人工拍板路径（知识文件写入低频，冲突面可控）。否决方案B（全走 daemon 代写 outbox：daemon 离线即阻塞、异步排队体验差）；否决方案C（分期：人为拖慢用户明确要的蒸馏能力）。
故障面：平台直写与 daemon 上行同步并发改同一知识文件时触发 manifest 冲突（走既有 conflict 人工拍板）；repo-native junction 场景下行应用会改用户 git 工作树，需 git 感知提示。
退役判据：若知识写入频率升高导致冲突常态化，复议 D-005@v2 转代写队列或合并写协调器。

## D-007@v1 merge 两段式 apply + 三类映射目标 + 路由关键词人工输入（Design Grill B-1/B-3 修正）
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：两段式：第一段 apply_ops([update(目标文件), update(INDEX.md)])，确认返回无 conflict 后第二段 apply_ops([delete(proposed)])；第二段失败=候选残留幂等可重试。合并目标 v1 限定三类 INDEX 映射文件（known-issues.md/patterns.md/conventions.md）；路由关键词由审核人人工填写（KnowledgeMergeIn.keywords），不做自动派生。另定 path 字段规范：entry.path 保留 .sillyspec/knowledge/ 前缀（顶层条目值不变，兑现兼容承诺），filename 扩展为含子目录段的相对路径，zone 由 filename 首段派生（Grill B-2 定论）。
故障面：两段间窗口内另一端同步改动 proposed 文件 → 第二段 conflict，候选残留（可重试，无知识丢失）。
退役判据：apply_ops 若未来提供事务性整批中止（all-or-nothing）语义，可合并回单段。

## D-008@v2 R-08 三洞修复落定——附件通道取数 + --spec-dir 指路回流 + 三重护栏（supersedes D-008@v1）
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：实现期调查（2026-09-17，commit 2c7873e5e）修正前提：**spec 树三策略统一下发 daemon 本地 `~/.sillyhub/daemon/specs/{ws_id}`（交互会话启动 pull + 会话结束 postSpecSync 增量回传，`knowledge/` 在同步集内）**——v1 判断"platform-managed 下 daemon 本地无树"不成立，洞二实为"树在缺指路"。修正落定：①洞一取数走**附件通道**（导出会话日志为 Markdown→SessionAttachmentService 上传→create_session attachment_ids→daemon 落盘 {cwd}/attachments/ 供 agent 读，不污染知识库树；替代 v1 的 .runtime 导出方案——.runtime 在同步排除集内送不到 daemon，v1 方案不可行）；②洞二回流=prompt 统一带 `--spec-dir ~/.sillyhub/daemon/specs/{ws_id}` 指路（CLI 实测 propose 只认 --spec-dir 不认 --spec-root，scan 参数不可照搬）；③洞三护栏=turn>2000 422/单条 8KB 截断/总量 19MB 422 引导 resume；④非多模态引擎（附件通道依赖 provider_caps.multimodal，仅 claude/pi）fresh 会话源 422 守卫。
supersedes：D-008@v1
故障面：附件下载 daemon 侧 60s 超时（既有链路）；postSpecSync 乐观锁冲突靠 pending_push 自愈（既有）；超大对话 resume 模式上下文超限由引擎 compact 兜底。
退役判据：若 daemon 侧未来提供会话记录查询 MCP 工具，可弃附件导出通道。

## D-009@v1 会话源蒸馏默认走原会话续接（reopen+inject），新 agent 为可选项
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：会话源默认=原会话续接——平台既有 reopen_session（（续接入口 reopen_session，见 backend/app/modules/daemon/session/service/session_lifecycle.py），续接已结束 claude/codex 会话，SDK resume 保留完整对话历史+prompt cache）+ inject_session(prompt=...)（（inject_session，见 backend/app/modules/daemon/service.py））把提炼指令发进原会话。一举兑现三好处（快/省 token/高质量）并化解 R-08 洞一（原会话读自己，无需取数通道）。新 agent（现状 bootstrap 新建 AgentRun）保留为可选项，用于：会话已删/引擎不支持 resume/用户想换视角。变更源天然走新 agent（文件树无"原会话"概念）。引擎限制：续接仅 claude/codex（provider caps 门控）+ 仅已结束会话可 reopen（进行中用 inject）+ 归档区禁写。原型未体现"谁去干"——前端补选择 UI（会话源默认勾选"原会话续接（推荐）"，旁保留"新建 agent"）。
故障面：续接会话可能比新 agent 更"固执"于原上下文视角（用户已有认知，故保留换 agent 选项）；reopen 对进行中会话报错需引导用 inject 而非 reopen。
退役判据：若后续所有引擎均支持 resume 且用户实测续接质量稳定，可收窄新 agent 选项为高级设置。

## D-010@v1 沉淀闭环增强——已沉淀标签+知识点反链 / quicklog 第三来源 / 新建 agent 复用 create_session / 蒸馏会话隔离
状态：implemented
变更：2026-09-17-knowledge-precipitation
锚点：未记录
最近确认：e83c21744
理由：四项全做，源码可行性已核实：①已沉淀标签=查该源有无 distill run（AgentRun.agent_session_id 关联+metadata_.kind 落档，无需新表），proposed frontmatter 的 source 字段为反链载体（backend/app/modules/knowledge/writer.py 的 frontmatter source 行 现写 manual，蒸馏写 session:<id>/change:<key>/quick:<id>）；合并时把目标小节锚点记入反链（因合并后 proposed 文件删除入备份区，反链须指到合并后目标小节 known-issues.md#某节而非已删 proposed 文件）；②quicklog 与 knowledge 同构（GET /quicklog 现成 repo://sillyhub/backend/app/modules/knowledge/router.py:197），数据在文件树 .sillyspec/quicklog/，新 agent 直接读、连 R-08 洞一取数问题都没有——来源类型扩 quick，单条 ql 小故来源多选；③新建 agent 复用 create_session（backend/app/modules/daemon/session/service/（create_session 入口，见 backend/app/modules/daemon/session/service/create.py） 原生支持 runtime_id 钉机器+provider/agent_profile_id/llm_provider_id/model 完整形态），后端代触发而非用户手点，title 带「提炼」前缀；④AgentSession.metadata_（repo://sillyhub/backend/app/modules/daemon/model.py:457 JSON 列）写 origin=knowledge-distill，常规会话页列表过滤排除，知识库侧 DistillTaskRead 保留 agent_session_id 可跳转——会话有据可循+不污染常规列表双兑现。
故障面：反链映射在合并时若目标小节重命名会失效（锚点漂移，需以 file+section_title 双键而非裸锚点）；蒸馏会话过滤若靠 metadata 判空，老会话（无 origin 字段）默认可见需零回归兜底。
退役判据：若常规会话页引入通用「会话用途」过滤维度，蒸馏隔离可并入该维度不再单列 origin 键。

## D-001@v1 变更范围=知识库效果面板三件套
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：用户对话逐条点单：①使用统计+热力图（知识库被用起来的节奏）②决策库展示效果化（裸文件→卡片，体现防复潮价值）③fr/ 目录（FR 索引，fr-index 新产物）展示效果化（状态/取代链/场景全埋正文里看不见）。统一主题=知识库从「能看到」升级到「看效果」。
故障面：hits 上行链路新增 daemon 改动面（此前 knowledge 变更零 daemon 改动）。
退役判据：若 hits 遥测被 CLI 侧改为直接上报平台 HTTP 端点，daemon 豁免上行可撤。

## D-003@v1 上行链路=daemon 同步豁免 hits 文件增量上报（非 CLI 直报）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：复用既有 spec 同步通道而非改 CLI：daemon 在 spec 同步流程单独摘出 spec 目录下 .runtime/knowledge-hits.jsonl（豁免 UPLOAD_EXCLUDE 的这一个文件），按「已上行字节数/行数」断点增量 POST 到平台新端点批量落库。离线容忍（下次补传）、CLI 零改动、多端各报各的天然合并。
故障面：行截断（上行时本地正 append）——按完整行断点，尾行不完整留下次。
退役判据：CLI 未来原生支持遥测上报时可退役 daemon 豁免通道。

## D-006@v2 总体方案 A 确认（用户亲答）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：用户亲答（2026-09-20）：认可方案 A（daemon 豁免增量上行+落库聚合+卡片渲染器+日历热力图），附加要求：上行链路必须解决多用户单工作区问题（见 D-007）。
supersedes：D-006@v1

## D-007@v1 多用户单工作区=各端独立上报+行 hash 幂等去重+行带 daemon 归属
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：用户亲答提出此问题，方案：①汇聚——各 daemon 只报本机 hits 增量（.runtime 不同步各端文件独立），服务器按行内容 sha256 做幂等去重（唯一约束 workspace_id+line_hash，INSERT ON CONFLICT DO NOTHING），多端天然合并零重复，重装/offset 丢失全量重报亦兜底；②断点——每 daemon 在自身家目录状态文件记已上报 offset（不落 spec 树防同步污染）；③归属——上报经 daemon 鉴权，行落库带 daemon_id（可关联注册用户），展示默认聚合总量（热力图=工作区整体节奏），数据层留归属供后续按人视图。
故障面：两端同一毫秒并发 INSERT 同 hash——唯一约束+ON CONFLICT 兜底，无竞态。

## D-004@v2 统一条目渲染器覆盖全部 zone（supersedes D-004@v1）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：用户亲答（2026-09-20 原型反馈）：整个知识库下各目录结构应统一，都搞成人类阅读更友好的形式，参考本仓与 sillyspec 仓的知识结构。统一条目模型（两仓实证同构）：手册文件=## 小节多条目、decisions/fr=## ID+字段行、generated=单条目、INDEX=路由目录页。统一渲染器三形态：①正文小节卡（手册：小节标题+markdown 正文+条目级 🔥 徽标——手册命中本就是 条目#锚点 粒度）②结构化字段卡（决策/FR：状态/字段/理由/取代链/互跳）③目录导航卡（INDEX：分类段+路由行→点击跳对应条目）。每文件保留「原文」tab 切回 md 视图。
supersedes：D-004@v1

## D-009@v1 热力图删除，换运营指标仪表盘（用户亲答 a）
状态：implemented
变更：2026-09-20-knowledge-effect-panel
锚点：未记录
最近确认：095869924
理由：用户亲答选 a：删除日历热力图。顶部换运营指标仪表盘四卡：①知识覆盖率（被命中条目/全部条目+趋势）②死条目（90 天零命中，可点开清单引导清理）③每任务命中密度（均值趋势，过低=检索没跟上/过高=注入过肥）④新知识生效速度（近 30 天新增条目已被使用比例）。使用榜改日均使用率排序（命中次数÷条目存在天数，消除老条目累计偏差；绝对次数作副信息）。

## D-001@v1 维持 R-01 接受不修代码，文档登记观察项（方案 A）
状态：implemented
变更：2026-09-16-background-task-grace-timeout
锚点：未记录
最近确认：83b402f6b
理由：D（不改代码），文档载体方案 A。维持 2026-09-15-background-task-permission-lockout R-01 已接受的 P1 风险；本变更收窄为 known-issues.md 观察条目（四要素：暴露差/缓解链/重估触发/未来修复首选）+ 本变更 design.md 否定决策存档
故障面：若未来线上实证注册表泄漏（守卫放行但无对应存活任务），无界宽限暴露面超出设计先例——观察项记录的重估触发条件命中时按「未来修复首选：双窗兜底（条目存活=静默<60min 对齐先例 且 总时长<4h 绝对上限）」重开变更
退役判据：SDK 提供 per-task 权限上下文（canUseTool 带 task 归属）或 task_notification 可靠送达保证时，本观察项与 R-01 一并退役

## D-001@v1 变更期 trace 载体 = changes/<名>/test-trace.json
状态：implemented
变更：2026-09-24-fr-test-bindings
锚点：未记录
最近确认：6ac260bd
理由：

## D-002@v1 两处真源 + 单点解析模块（src/test-bindings.js）
状态：implemented
变更：2026-09-24-fr-test-bindings
锚点：未记录
最近确认：6ac260bd
理由：

## D-003@v1 晋升时机 = verify --done 矩阵门通过时
状态：implemented
变更：2026-09-24-fr-test-bindings
锚点：未记录
最近确认：6ac260bd
理由：

## D-004@v1 quick 行落 candidate（诚实优先）
状态：implemented
变更：2026-09-24-fr-test-bindings
锚点：未记录
最近确认：6ac260bd
理由：

## D-005@v1 orphan 行身份 = acc-<index>-<textHash8>
状态：implemented
变更：2026-09-24-fr-test-bindings
锚点：未记录
最近确认：6ac260bd
理由：

## D-001@v1 锚点集=task 卡 requirement_ids 并集；差集保守向
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-002@v1 现选测逐字保留，残差只在结果层加法
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-003@v1 runner 复用 buildDepsBatches 推断面
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-004@v1 悬空硬错=门入口 fail-fast
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-005@v1 披露真源=JSON sidecar
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-006@v1 trace 非空变更账本停复用（fail-closed）
状态：implemented
变更：2026-09-24-fr-test-readside
锚点：未记录
最近确认：82002514
理由：

## D-001@v1 枚举开放世界是错误方向（任务面归还 agent）
状态：implemented
变更：2026-09-26-thin-agent-tasks
锚点：未记录
最近确认：replay2
理由：决策记录（本会话第三次同款错误，升格为显式教训防再犯）：用枚举/关键词表穷举开放世界是错误方向——①R17 评审否决「完整标点收尾自检」（标点形态枚举不全）；②复合拆分劈碎「；」分隔的枚举词表（狗粮实证）；③本变更回退 WORK_UNIT_BUCKETS 域分类表（用户指出：任务单元形态不可穷举）。正确模式：开放世界的分类/计划归 agent（人有上下文），机器只锚定可枚举的封闭面（验收标准文本、字段格式契约）。风险=假勾退化（自写自勾可写巨型任务骗进度）——接受：哨兵证据重心本在提交面+测试门（任务面降级为进度信号）；追溯锚在 requirements FR 区不依赖任务面。死路：枚举更多桶/更多关键词——穷举错误不因规模变小而变对，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-verify-gate-restrictfiles
锚点：未记录
最近确认：bf1d0f2db9ee166f83ef1cce9f4c8cdc07c1a715
理由：最大风险=restrictFiles 收窄后模块选择漏测（文件面解析错变更文件→选错模块子集）——与 quick 门同函数同风险面，quick 侧长期实证可接受；空清单防御分支保住「宁全量不假 skip」的 fail-closed 底线。死路：空清单也传（restrict []）——正是本变更要修的假 skip 形态的反面制造，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-slot4-distill-fix
锚点：未记录
最近确认：5d81f5526cee5f3d2da8a9ffd7443e5273cd34a5
理由：最大风险=补录样本的域路由落 unmapped（治理类变更无模块域）——接受：unmapped 域已有 INDEX 路由行兜底，教训按关键词可命中（三组关键词实测命中）；后续若 unmapped 治理可迁移。死路：回溯批量补录全部历史断链条目——归档件是冻结审计面不回写，历史教训按需逐条重放（幂等），弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-review-unsupervised-exit
锚点：未记录
最近确认：0675d7d76cbde1b21ef55d24dbe8f135048c78c0
理由：最大风险=豁免被滥用（有派发能力的环境也写声明逃避评审）——对抗面：声明是显式自曝文件随归档公开（审计可见）+遥测可观测豁免率（异常升高可查）+指引明示「有派发能力时豁免不适用」；不做密码学强验（agent 环境能力 CLI 无法机器判定——诚实暴露优于伪检测）。死路：CLI 检测派发能力（harness 工具集对 CLI 不可见）——伪检测比声明制更假，弃；死路：豁免凭据用 env/flag（不落盘不留痕=可静默滥用）——文件制随归档，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-residual-runner-parity
锚点：未记录
最近确认：0c507e2ebe90ac31d847cd319669d4a9b13a3f91
理由：最大风险=jsxRunner 提取的命令串形态不匹配项目实际（cd 链/嵌套 pnpm exec）——提取不到走 skip 批（安全侧：转办不假跑），提取到但命令错会 failed 由 known_failures/归属鉴定兜（与 py 侧推断同风险面同兜法）。死路：CLI 主动探测项目 vitest 配置（读 vite.config/tsconfig 判项目类型）——探测面无界且易过时，命令串推断+skip 转办是诚实分界，弃；死路：JSX 批也 node --test 顶着 known_failures——制造恒败段正是要修的病，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-reconcile-source-isolation
锚点：未记录
最近确认：3eb3bfbff3b9962ef5430bd6c75ea299bfda9df5
理由：最大风险=meta.branch 指向的分支已被删/移（rev-parse 验证挡住→静默省略回降级，不误锚）；meta.changeName 键与实际变更不匹配（worktree 建立时写入的键与 change 名同源——键漂移时第三候选同样落空回到现状，无恶化面）。死路：让 agent 在对账前「重建分支」的指引——这正是 R18 死循环的形态（4 种面重建 matched=0）；诊断给的出路是登记/恢复既有 ref 而非重建内容，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-task-review-retire
锚点：未记录
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5
理由：最大风险：手动勾选引入假勾面（agent 未做即勾/顺手全勾）。缓解：detectExecuteBatchFinish 内 checkExecuteCodeEvidence 代码证据核验仍在 execute 收口跑（勾了但无 base..HEAD diff 证据→批量完成不成立、阻塞暴露）+ verify 阶段测试对账门禁不变（实测失败阻断收口）+ verify 逐项检查任务步仍只读对照勾选态。放弃的方案：①只加豁免不退役——前置变更已做，R18 实证豁免后仍留 5/15 形式拦截摩擦且「可豁免的门」诱导表演；②连 task-review.js 模块一起删——放弃，历史归档 doctor/回放兼容读侧依赖其导出（validateTaskReviews 等），review write/backfill-reviews 命令仍引用；③保留 Task Review 门但只对 independent tier 生效——放弃，tier 分级在 Stage Review 层已有，任务粒度无独立评审者供给时该门只剩形式校验（R18 实证）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-thin-check-cadence
锚点：未记录
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e
理由：最大风险=误报施压：两个任务真同时完成（一次提交带两个 task token）后一拍勾两格会被提示——接受（advisory 不阻断，且同拍双完成本就应分两次勾，提示方向正确）。放弃的方案：①收口硬门拒收一把全勾——节奏是习惯非造假主张，硬门会把合法快速变更拦死，与「任务勾选缺失」同为 advisory 的既有裁决一致；②加「贴近收口时刻」时间窗过滤——引入窗口参数且窗口内外行为不一致，简化为「任意单拍 ≥2 格」单一判据；③顺手改 watcher per-change 锁修观测盲区——超出本变更范围（本变更只解决「有观测时的行为矫正」，盲区另立变更）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-tick-loop-nudge
锚点：未记录
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3
理由：最大风险=提醒噪音化（agent 频繁 status 每次都刷同一行）——限定②阶段+滞后+有提交三条件，①阶段/勾齐后静默；R20 重跑可观测行为是否迁移。死路：把一把勾改成阻断（哨兵拒收）——token 证据已验全勾为真（R19 实证勾选滞后≠假勾），阻断只制造 amend 循环（R18 同款摩擦），弃；死路：CLI 侧自动勾（据 wt-commit 事件反推）——自动勾消解 agent 的 ownership（OS 实证自拆清单边勾是自然行为），且反推映射脆，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-watcher-timeline
锚点：未记录
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95
理由：最大风险=推断面的诚实性：勾选时刻是顺序推断（事件不记 id）、描述行继承机器稿 60 字截断、提交锚依赖仓内 hash 可达（合并重定基后失联降级只显 hash）。对策是显式标注：表头「≈」+ 尾注列数据源与盲区（观测起点≠诞生时刻、单飞锁盲窗）——宁可标注粗糙也不冒充精确。放弃的方案：①改 watcher 事件流带 checkedTasks id 明细——改写入面格式是侵入性变更，且历史流已定格无法回填，收益仅推断精度；②从 DB progress 库取阶段时间——thin 变更状态不落 DB（红线），无数据可取；③agent 干活时自述留痕——协议负担，违背 thin 立身之本（那是完整流程 --output 的能力面）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-watcher-timeline-p2
锚点：未记录
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc
理由：最大风险=语义修正引发回归——主变更有用例钉住旧「尾部标 broken」行为，需同步改期望（该用例钉的正是误标行为，改期望即清偿本体）。放弃的方案：inferFlipTimes 直接收 tasks 勾选态做尾部判断——把渲染关注度混进纯计数函数层次更脏；按层分责（计数函数管链、渲染层管已勾缺时刻）更清晰。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-binding-anchor-fidelity
锚点：未记录
最近确认：3d39f6337998662fb497e633079ac4986287460c
理由：- 最大风险＝锚点后缀漏进文件面消费（残差实测会拿不存在路径去跑、watcher 归属匹配失联、rot 覆盖误判 skip）——已 grep 全量枚举 `.tests` 消费点逐一适配，新测试对每个消费点各钉一条回归。 - 次风险＝裸名解析误绑（basename 在仓内多处出现）——仅唯一命中才解析，零命中/多命中原样保留，dangling 校验自然暴露。 - 死路：用例锚做独立字段（cases:）——test-trace schema、FR 机器子块、md 解析三处格式连动且存量数据双形态并存，复杂度不成比例，弃。 - 死路：回写历史归档 test-trace 补锚——归档是冻结审计面不回写；新变更提取即生效，旧数据维持文件级（诚实），弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-governance-autopilot
锚点：未记录
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865
理由：最大风险=GWT 骨架语义不准（关键词启发式的 Given 可能错域、箭头拆分的 When/Then 可能断错）——骨架标注「可编辑覆盖」，agent 修正错骨架比从零写省力（一次 Edit vs 三次）；索引进 knowledge/fr 的骨架质量依赖 agent 覆盖意愿（不覆盖时入库的是骨架不是精写——比空着不进库好，但不如精写——权衡接受）。死路：完全取消 agent 填写（纯机器 FR 入库）——索引质量退化为机械摘录，知识复利面受损；保留 agent 可覆盖是正确分界。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-full-autopilot-parity
锚点：未记录
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733
理由：最大风险=auto-tick 的近 20 提交窗口可能捕到其他变更的 task token（多 agent 共享仓）——窗口缩小到 run 范围更精确但 runId 解析复杂度高；20 窗口是 pragmatic 平衡，误勾由 checkExecuteCodeEvidence 兜底。auto-bind 的 test-result 路径在平台模式（runtime 分离根）可能读不到——fail-soft 跳过不阻断，与 thin 同风险面。死路：GWT 预填直接迁移（用 input 文本推导 full 的 FR）——full 的 requirements 来自对话演化，input 只是起点；直接迁移会产出生成式填空题质量低于 thin（无对话上下文），弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-dynamic-test-inference
锚点：未记录
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9
理由：最大风险：动态子集的覆盖面判断错误→漏测放行（门禁漏跑=静默通过）。缓解：三源并集宁可多跑（import 闭包+FR 回归都是加法面）、deps 批超帽照旧（30/组保底 5）、全量语义留 test_strategy: full+CI 兜底；existing 测试大量断言 commands.test 执行——显式 full 逃生阀保住该路径语义，fixture 迁移成本可控。次风险：结构推断 runner 猜错（如 monorepo 双 package manager）——推断按「最近清单祖先」就近原则，猜不出降档 skipped 带指引不硬跑。放弃的方案：① 纯静态修补（继续 local.yaml 加 per-module 键）——治标，并行互改问题原样；② bindings 单源（只跑 FR 绑定测试）——冷启动仓索引空会饿死，且 bindings 是「上次跑过」非「必须跑」的形式化证明；③ agent 每变更自带测试命令参数——把配置问题转移成提示词纪律，无机器校验面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-gate-face-binding-parity
锚点：未记录
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa
理由：最大风险：faceOverride 旁路了快照 diff 的二次校验——若调用方面过声明（含未真改文件），动态子集可能多跑（宁多勿漏，方向安全）；权威面上游已过 foreign 归因收窄（splitOwnVsForeignDiffFiles），过声明面受双保险。次风险：brainstorm --done 追加槽改变 full 流程 requirements 形态，下游消费者（索引/对账）按 AGENT 槽注释扫描——槽是注释面不进指纹，verifyFlowDrafts 不校验 full 侧。放弃方案：快照锚 baseline commit（改 createGateSnapshot 全局面，波及 verify 门与 quick 通道）——影响面大且 thin 权威面已现成，不值。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-ui-visual-guidance
锚点：未记录
最近确认：4f85905373507953789367b59bb41792eb0e5431
理由：最大风险：关键词启发式误判（非 UI 变更被注入须知/警告——噪音；或 UI 变更漏检——门没响）。对冲：双源检测（input 词表 + 声明文件面扩展名），默认档仅 warn（误判成本一行警告），正反例单测锁定词表。试过放弃：① 收口强制截图对账（用户否决——太麻烦且最后才卡死没意义，改为过程引导+在场性对账）；② CLI 内置浏览器截图（放弃——CLI 保持零浏览器依赖，截图由执行会话浏览器能力承担，CLI 只验痕迹）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-knowledge-digest
锚点：未记录
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2
理由：最大风险：阈值为拍脑袋初值（rot 100/inbox 20）——先按本仓实测量级定（本仓实测 305/39 首跑双超），连续安静或持续爆表都该调，防仪式化熔断在案。次风险：suggestDomainFromFiles 对扁平 src 布局返回 src（无意义域）——已接受（monorepo 规则在前覆盖；错建议不自动执行只提示，人工裁决兜底）。readFrBindings 逐条目扫描 O(条目×文件) 性本仓秒级可接受（周节奏消费）。放弃方案：rot 判据收紧——细看后收回：广域变更打 239 条标记是诚实信号（真触达），病在阅读面不在判据，digest 按域聚合即解。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-hunk-attribution-gate
锚点：未记录
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c
理由：最大风险：竞争检测的假阳/假阴——他变更声明面与提交面相交但实际各行其事（假阳：一行警告可接受）或他会话在途改动根本没立变更/没写清单（假阴：残留信号与既有文件级 advisory 兜底，无法根治——hunk 归属的语义判断终究要人，门的目标是把静默混合变成显式中断）。试过放弃：① 轻量道默认挂会话 worktree（用户否决——合并税过重，仓内 wt-parallel-commit-race 等坑史为证）；② hunk 语义归属（机器无法判定行归属，改为「竞争文件显式暴露+人核」的诚实口径）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-gate-docs-cleanup
锚点：未记录
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62
理由：最大风险：注记与未来实现漂移（门档位语义再变时注记过时）——低（注记带变更名可溯源）。放弃方案：无（纯对齐性清理）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-confirm-on-use
锚点：未记录
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3
理由：最大风险：橡皮图章——agent 全点确认。缓解三层：抽查式（注入至多点名 2 条）、证据机械校验（必须盘上真实测试文件，口头相符不收）、confirm 只翻绑定状态不改内容（错翻的代价=绑定行显示 active，门禁消费 candidate/active 无行为差异——宁多跑语义不变，长期准确性靠 digest 坏绑定卡兜）。次风险：upsertFrBindingsRaw 不走 agent 行保护（权威重写）——但行集来自 readFrBindings 全行读（含 agent 行原样回写），只改 confirmed_by/state 两字段，无删除面。放弃方案：FR 条目级 confirmed 状态（新机器字段）——绑定状态机已够用，条目级标题/域问题归 digest 信号与人工裁决，不为此发明第二套状态。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-tool-debt-cleanup
锚点：未记录
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306
理由：最大风险：.sillyspec/docs/ 全保留可能把他会话在途的 docs WIP 冻进本变更 patch——对冲：docs 面提交前归属由既有夹带嫌疑 advisory 与 hunk 归属门（昨日变更）覆盖；本变更实测区间内 docs 提交均为本变更模块卡。放弃方案：只保留 modules/ 子目录（更窄）——放弃，scan/CONVENTIONS 等 docs 同为交付物，窄口径会再造下一个漏。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-redomain
锚点：未记录
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5
理由：最大风险：ID 前缀与域不符的历史痕迹（FR-auto-backend-019 住 platform-sync.md）——有意取舍：换号会断绑定/supersede/最近确认三条寻址链，痕迹只影响美观；INDEX 路由按域文件而非 ID 前缀，注入/rot 查询全按文件域走。次风险：syncIndexRoutingLines 全目录同步在 INDEX 手改杂行时的行为——既有函数幂等语义（既有行 no-op），风险承袭不新增。放弃方案：迁域换号+三链改写——身份重写面太大且易漏，违背 D-001 单一身份。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-green-repair
锚点：未记录
最近确认：eb946a2e7bf4a93671effef01ac7778043b7ba3f
理由：最大风险：行号锚是「随代码漂移的活契约」，后续提交再动 shared.js/index.js 行布局会再红——本变更只修当前态，不引入锚自愈机制（属另一变更面）。放弃的方案：给全部 17 处加 ? 后缀跳过关键词断言——被否：这批锚是真实代码引用而非纯位置叙事，跳过断言等于降低校验强度掩盖漂移。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-change-birth-stage-brainstorm
锚点：未记录
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace
理由：最大风险：迁移把「从未进主流程」的存量行改判为 brainstorm 后，滞留提示语义从「停在代码扫描」变「停在需求探索」——展示层措辞变化，用户已裁定接受（起步就是头脑风暴）。放弃的方案：① 从 VALID_STAGES/STAGE_ORDER 里整体移除 scan——放弃，scan 阶段本身（项目级扫描操作）合法存在，牵动 stage-contract/consistency 面太大且非本缺陷根因；② 只改出生默认不做存量迁移——放弃，存量误导行（governance-rpc-actions 类）会一直显示到归档才消失，修复不完整。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-thin-module-scope-persist
锚点：未记录
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf
理由：最大风险：平台把 advisory 数据当强承诺——`modules: []` 不等于「无影响」（可能是模块图未登记，未登记面要看 `uncoveredDirs`），展示侧应按「已知影响面」标注而非断言。缓解：键语义已在接口契约固定，`uncoveredDirs` 与 `modules` 并列落盘正是为了让「未登记」显式可见。 试过放弃：① 另立 module-scope.json 单独工件——放弃：change-patch.json 已是平台在读的冻结事实件（files/sha 都在那），多一个文件多一份生命周期与一致性成本；② 把结构化结果渲染进 verify-result.md——放弃：那是人读回执，机器消费面不应与人读面耦合；③ 只加落盘不修旧对账缺陷——放弃：实测旧实现命中恒 0（modules: 包层不进 + 多项目读错图），不修则落盘恒空数组，FR-01 形同虚设——四缺陷修复随本变更交付并各有限定测试锁定。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-watcher-push-endpoint
锚点：未记录
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf
理由：最大风险：平台端点再次演进（本仓注释曾指向已消亡的 observation 端点）——缓解：模块头注释锚定端点出处变更名（change-events-r18-full）可追溯；推送失败恒 warn 可见不静默吞。放弃方案：平台侧加 /api/observation/events 兼容层（在平台仓加死代码面更大，放弃）；恢复批量端点（平台已是单条契约且恒 200 语义，放弃）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-birth-tests-sync
锚点：未记录
最近确认：48511fdc2075698795988139af8079b7001eb7bf
理由：最大风险：若 eb3b4bce 的放行语义后续被裁决回退（出生态不允许直入主流程），本两处断言需随语义再翻转——留锚在转换表注释。放弃的方案：直接删掉 brainstorm→execute 表行与 1a 用例——被否：删断言等于丢防护面，保留带 fromStageData 的真入门变体才守住「跳步拦截」语义。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-archive-timeline-bake
锚点：未记录
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7
理由：最大风险：平台/漂移模式下 runtimeRoot 与 specBase/.runtime 分裂，烤制读错目录 → 静默漏烤。缓解：编排内用 resolvePlatformOpts + resolveRuntimeRoot 与既有消费者同链；跳过/失败均输出注记行保持可观测；测试用 fixture runtimeRoot 直验。次风险：巨型事件流污染 git——尺寸帽 2MiB 超帽只烤 timeline.md 并注记。 放弃的方案：①watcher 活跃期直接把事件写进 changes 目录（放弃——改写侧协议面大，且活跃期事件属 .runtime 隐私/排除边界，D-002 语义不动）；②CLI 回退时把归档副本反向重建到 .runtime（放弃——制造两份真相源，违背「本地 jsonl 唯一真相源」既有口径）。 评审留痕（独立评审 PASS 2×P3 清偿）：P3-1 副本读源失败时头注记虚报副本在场——已修（eventsCopySkipped 扩读源失败形态，注记文本改为「尺寸超帽或读源失败」与实际产出一致，补测试）；P3-2 「与 spawnWatcher 写侧同链」对 flow.js 各拉起位在平台极端漂移下存在既有分裂面——措辞修正：烤制的 runtimeRoot 解析与既有消费链（resolvePlatformOpts>resolveRuntimeRoot）同源，平台模式下若写读目录分裂属既有面，本设计的兜底是跳过时输出注记行保持可观测、非静默漏烤。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-guidance-principles
锚点：未记录
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7
理由：最大风险：brainstorm 语料在 proposal 尚未生成的早期步骤可能只有变更名——变更名含 UI 词（如 apple-style 不含）则漏注入；对冲：方案对比步执行时 proposal 通常已落盘，且 flow start 注入兜底另一入口。放弃方案：①静态红线扫源码（用户指出误伤探测代码、示教 example 与历史注释，改为输出断言）；②local.yaml commands.prototype 配置位（用户指出多前端项目多生态仓不成立，仓自身 modules.*.test 退役史为证——改为就近发现原则文案）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：roadmap-copy-purge
锚点：未记录
最近确认：6d467b738d6c732f7076e3f65283a57ba78053a8
理由：最大风险：误判「无消费」——已全源码 grep 复核（ROADMAP 在 src/ 共 8 处：worktree.js×2 注释、complete-handlers×2 lite 豁免措辞、next.js×2 绿地探测、archive.js×1 条件指令、status.js×1 cat），无任何写侧、无条件不成立的读侧；.claude/skills 两处文案提及（archive 描述「+ 更新 ROADMAP」、explore cat 行）属提示面非行为面，文件缺席后自失活，留待后续产品级变更一并出清（不在本次批准面）。放弃的方案：保留但机器化维护—— lite/thin 归档豁免使其永远缺主力通道数据，且三套真源已覆盖，不值得维护。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-known-failures-hardening
锚点：未记录
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d
理由：最大风险：泛用词停用可能让某仓既有清单里的懒模式失效 → 该仓门从假 PASS 变真 FAIL——这是修复不是回归（装载警告点名停用条目，改锚定式即恢复）。放弃方案：硬失败行只准锚定式豁免（首轮实现实测误伤主用例——按文件名豁免预存失败测试正是硬行+裸子串的合法组合，跨仓全在用，已回退改为泛用词停用）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-flow-date-gate
锚点：未记录
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806
理由：最大风险：既有 ~46 处 flow start 测试调用点用非日期名（fc-1 / flow-h2-t1 / sw-fake 等），过门后假红——逐文件把名字适配为日期前缀形态（固定 2026-09-01- 前缀，日期不验当天）。次风险：报错文案被测试断言（validateChangeName 非法名用例仍先触发、文案不变）。试过放弃：自动补前缀（名字漂移见槽1）；门放 cmdFlowStart 内部（会拦 mcp/平台工具直调与库调用，违背「门只在 CLI 边界」既定决策）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-split-guard-and-gate-report
锚点：未记录
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4
理由：最大风险：谓词词表漏词导致该拆的不拆（标准粒度变粗）——保守方向（不拆优于误拆，误拆需人工重写 FR，不拆只是粒度粗），词表可增量扩。放弃方案：取消斜杠拆分（推翻 2026-09-25 刻意决策且有测试锁定——评审否决）；全仓 env 白名单清洗（Windows 砍系统变量风险，归 P1 变更处理）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-tap-judge
锚点：未记录
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0
理由：最大风险：TAP 报告器为 node 18.17+ 特性——旧 node 消费仓的 auto-js 批（本就要求现代 node 跑 node --test）实际不构成风险，非 TAP 回退兜底。放弃方案：全量换 JSON 报告器（变化面更大，TAP 文本行与既有豁免模式语义更接近）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-watcher-signal-widen
锚点：未记录
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543
理由：最大风险：verify-runs 全目录逐文件 JSON 解析在运行目录多时变慢——3s 轮询周期内条目有限（实测当日 ~60 目录），必要时后续加目录名倒序早退。放弃方案：假勾选改「区间终态判定不预警」（丢失即时信号，拍位消解两全）；watcher 直读 local.yaml 内容上事件（隐私面拒绝）。

## D-002@v1 范围裁定——只管 thin 道入口，run 族入口不动
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
锚点：未记录
最近确认：cb6fc0a0
理由：不需要。run 族（完整流程）本来就从 brainstorm 阶段起步（.sillyspec 状态机 stage 序列 brainstorm→…→archive，src/db.js:266 current_stage 默认 'brainstorm'），不存在「跳过头脑风暴」问题；失效面只在 thin 道 flow start 直通

## D-004@v1 知识注入只锚变更入口，设计时点新关键词零检索面——工具引导缺位
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
锚点：未记录
最近确认：cb6fc0a0
理由：用户归因（采纳）：不是 agent 个人失误，是工具引导不到位——不然知识库没意义了。结构性缺口三处：① 自动注入只锚「变更入口」——轻量道按 input/FR/changed-files 关键词路由（src/flow.js:137），否决决策注入同源；brainstorm Step2 按 INDEX 路由行＋decisionHits（src/knowledge-match.js:6）；② 设计时点（方案步/设计步/decisions.md 落盘）新产生的机制词（枚举/词表——入口时刻不存在）没有任何强制检索面，knowledge search 在引导协议里零接线；③ AGENTS.md 速查行「命中知识 CLI 会自动注入 prompt，勿自行重复检索」反向劝退主动检索
故障面：--done 门自动检索的误命中（决策条目措辞与库内条目关键词偶然重叠）→ 回显噪音让 agent 习惯性无视所有命中（狼来了效应）——v1 只 warn 不阻断即为此留退路；检索查询串拼装质量差（标题短词）会放大命中噪音
退役判据：若归档遥测显示命中回显绝大多数未被 evidence 回应且未引发实际复潮拦截（信号无行为后果），说明该面无效——退化为纯指引面（去掉机器检索）或直接删除

## D-006@v1 执行期裁决——testFailures 数据源从「flow-state substeps」改读 verify-runs 记录面
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
锚点：未记录
最近确认：cb6fc0a0
理由：改读 .runtime/verify-runs/<ts>/test-result.json 既有记录面：按目录内 JSON 的 change 字段归属本变更（与归档回收 pruneArchivedChangeRuntime 同源口径），status='failed' 枚举计数——每次失败收口尝试各落一条（writeRunResult 既有落点）。同为既有记录面、同为封闭面计数（D-003 禁区不破），且天然支持多次失败累计；decisions 条目无时间戳，D-007 同理降级

## D-007@v1 执行期裁决——--done 门检索查询串含 decisions.md 全部当前条目（非「自上次 --done 新增」）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
锚点：未记录
最近确认：cb6fc0a0
理由：v1 查询串=--output 全文＋decisions.md 当前全部条目的「D-xxx 标题+question」拼串。命中面是超集（旧条目命中也会回显），由三层降噪兜底：① v1 恒 warn 不阻断（D-004 故障面自留退路）② rejected 条目优先展示（防复潮信号最相关）③ commands.knowledge-gate: off 可整体关。若归档遥测显示噪音占主导，按 D-004 退役判据收窄

## D-005@v1 方案选择——Ⅱ 事后闭环主（前门弱盘问＋事后强信号）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
锚点：未记录
最近确认：cb6fc0a0
理由：用户选 Ⅱ。要点：需求清晰度是谱值且只能事后证伪——事前任何硬判定都是布尔处置（用户两次推进否决词表与声明硬门）；前门只做盘问重述（自检问题从「需求清晰吗」换成「还有没有必须问用户才能动手的问题」，不阻断不设新节），强信号放事后：归档时封闭面指标（design 重写比/tasks 改写率/盲维命中/返工次数——diff 比例与计数，非词表）判「疑似该走预段未走」落库，下次 flow start 渲染点名提示，形成每仓自我校准回路。FR-03（设计时点知识检索面，D-004）随行收进本变更
故障面：事后指标误标（用户中途合法改需求被记为「疑似该走预段未走」）→ 下次 start 提示成为噪音，agent 学会无视——「疑似」措辞与可无视设计是减压阀但也是衰减路径；指标快照时机错误（如 design 首快照取在收口后）会让重写比恒 0
退役判据：若遥测显示被标记变更的下一变更仍高频复现同形态（提示未改变选道行为），说明闭环无效——考虑退回纯指引或升为硬门（届时重新过方案轮）

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-inject-ranking
锚点：未记录
最近确认：b7699f92412bdcacf115d11395fc72920162195c
理由：风险：① 长查询稀释重叠率（frTitleOverlap 并集含查询全长）——同查询内相对排序仍成立，跨查询不可比（仅用于排序非阈值判定）；② 「死路：」字面标记依赖蒸馏书写惯例——未按此惯例写的教训条目仍不进防复潮面（覆盖率问题，宁缺毋滥）；③ id 数字 bigram 微量串扰（如 2026-09-28 与 D-009@v1 共享 "09"）——分数远低于标题实词重叠，排序不受扰（测试②钉住）。死路=为 implemented 条目引入 rejected 语义提升——若知识库大量误标死路会造成防复潮面噪音，退役判据=回显噪音投诉或命中条目与主题长期无关。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-reason-overlap
锚点：未记录
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0
理由：风险：①平局先验只兜「标题零命中」的近义查询，查询词命中了无关条目标题时先验不介入（主题信号优先于先验，属正确取舍）；②死路条目在文件序靠后时靠先验置顶而非相关度——先验普适于死路类（本变更全链路的立论即死路类是最强防复潮信号）。退役判据=死路先验导致高频无关置顶投诉。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-score-denoise
锚点：未记录
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66
理由：风险：① 剥数字后「含版本号/年份的语义查询」（如 查 FR-016 相关决策）丢失数字区分力——决策标题本无数字语义，可接受；② \p{P} 剥除连中英标点（含全角），标题实词不受影响。死路=正则 Unicode 类别写错会静默破坏主场景（首版 \W 误剥 CJK 被测试②当场拦截）——测试钉主场景/近义/ASCII 三面。退役判据=出现依赖数字 bigram 才能区分的相关性场景投诉。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-sentinel-mirror-waiver
锚点：未记录
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0
理由：风险：①agent 故意不覆写任务面借镜像豁免绕 per-task 证据——镜像任务即成功标准镜像，其交付由实测门/patch/review 整体背书，绕的是重复记账不是交付门（守卫语义不弱化：覆写任务仍拒收无证据勾选，Drill 2 实证）；②基线快照缺失（旧变更/快照失败）→ fail-safe 全量从严（旧行为）；③比对经行分割与 trim 归一——行尾/首尾空白漂移仍判镜像（宽松面有界：任何内容改写即判非镜像从严）。死路=给镜像任务也造 per-task 证据仪式（改写任务+amend token——本会话三连 workaround 实证是纯仪式）。退役判据=镜像豁免面出现真实假勾选逃逸案例（实测门绿但成功标准未兑现且无 review 拦截）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-sentinel-waiver-hardening
锚点：未记录
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8
理由：风险：①过渡期变更（镜像豁免变更与本变更之间 start 的）无锚定——信任基线（窗口一天内的少量变更，接受）；②agent 篡改 flow-state 里的 baseline_sha256 本身（change 目录内文件）——flow-state 属机器记账面，篡改它等于篡改 substeps/review_force 等全部收口依据，攻击面超出本哨兵职责（审计件 change.patch sha256 锚定兜底）。watcher R1 为 advisory 人判面，容忍无锚基线（消费侧未哈希校验——硬门在 flow done，纵深以锚定为准）；死路=把基线挪进 git 追踪（.runtime 惯例是本地观测面不进 git，为豁免破例不值）。退役判据=零提交从严误伤真实场景（如纯评审类变更无交付提交但有合法勾选）出现投诉。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-gate-denoise
锚点：未记录
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf
理由：风险：① 零分过滤可能压掉「标题与查询零重叠但语义相关」的真 rejected——防复潮面本就靠词面路由，标题零重叠即零证据，可接受（宁少勿噪，与狼来了面取舍一致）；② 已回应静默的共现判据有误静默面（正文恰含同 id＋域名但非回应语境）——误静默有界：仅损失门 warn 信号（flow 注入段与 {DECISION_HITS} 两面不套用静默，冗余在场；正文 token 变动后自然恢复）；③ score 透出让消费方各取所需，若未来消费方误当阈值语义用需文档化。退役判据=噪音投诉消失后若出现「真命中被漏弹」实证，回退为仅死路优先。

## D-001@v1 否决入库侧路由词表派生——同窗词片按序截断=抽签
状态：rejected
变更：2026-09-29-decision-route-vocab
锚点：未记录
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf
理由：实测否决：unmapped.md n∈[2,3] 窗词片千级（同日三口径复测 844~1176 随并行漂移），目标词（谓词 n=2）深藏数百名——任何 cap 都是抽签而非选择；入库时挑选词表与「枚举定义开放世界」同构（挑选权无处安放）。改查询侧：只测查询自身几十个词片，无挑选无 cap。
否决理由：同窗词片按序截断=抽签，选择面无信号；且 INDEX 行膨胀不可读。
复潮条件：出现可靠的封闭面词显著性判据（非出现频次）或蒸馏 agent 主动写 tag 的机制落地。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-brainstorm-closure-gates
锚点：未记录
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848
理由：最大风险：warning 噪声——design-init 骨架未编辑完的 design.md（R-01 待填行／决策追踪待确认行）会在 --done 集中亮 2-3 条 warning。这是预期收口行为（骨架=未闭合），文案已逐条给出路；退役判据：观测一个周期——误报为主且 agent 普遍忽略→收窄词表，真阳率主导→升 error。 试过放弃：① error 级阻断——存量 brainstorm 阶段进行中变更会立即撞墙，破坏「存量行为不变」兼容红线，且与故障面软警告先例相悖；② 自审存疑查裸词「自审存疑」——design-init 自审 checklist 模板行含该词必然常驻误报，改为查「自审存疑[:：]」应用形态＋行内闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）判定；③ requirements D 覆盖沿用 shared.id-traceability 通用文案——缺「决策覆盖矩阵补行或标剩余风险」的闭环出路提示，语义丢失，故立独立规则带出路文案。 死路注记核对：知识库 unmapped 域 5 条死路（restrict 空清单传参／回溯补录历史断链／CLI 探测派发能力／CLI 探测 vitest 配置／对账前重建分支）与本方案无交集——本方案不建清单通道、不回溯历史、不探测环境，全部复用既有管线。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-knowledge-vector-recall
锚点：未记录
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3
理由：风险：① 平台未实现期每个零命中查询打一次真实平台 404（静默、debug 可开——流量无害但可观测）；② 向量结果随 embedding 模型升级漂移（非确定性）——advisory 面可接受，确定性底座是本地层；③ 同号锚点缺 change 时全量带回可能放大（unmapped 实测 65 同号）——三层有界：构建侧 score 序封顶 20、flow/complete 渲染 slice(0,5)、prompt 渲染 slice(0,5)（审查 P2 补齐）。退役判据=平台向量命中长期与主题无关（召回质量投诉）或平台放弃该端点（删本层即回两层）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-brainstorm-exit-thin-default
锚点：未记录
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e
理由：风险：① 拿不准默认 small 可能低估真复杂变更——兜底三层：实测失败自动升厚（既有）、--upgrade-thick 用户决策（既有）、收编后 thin 道自身门禁（实测/评审/patch）；② 模板标题下 agent 忘写 scale→null→默认收编，行为与 small 一致（符合设计）；③ premise-fail 型需求（前提不成立）仍要走满 8 步——行为演习发现的真实摩擦，属早期短路道新课题（记残留在变更报告）。行为级闭环验收：小白鼠带模糊中等规模需求（测试慢优化）走全链——入口选道进头脑风暴（负面信号命中）、Step 8 按新判据落 scale=small、CLI 指路 flow start 收编、下一步命令即收编命令——原始问题「头脑风暴后直奔五阶段」的反例实测成立。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-title-and-agents-slim
锚点：未记录
最近确认：263542670c49870b8376c23395b5d1e58f7cd4b9
理由：最大风险：AGENTS.md 瘦身后，无 skill 环境（如 codex 只读 AGENTS.md）的 agent 拿不到 --input 格式——已评估：flow start 清晰度门失败时 CLI 自己打印过门格式（运行时教学兜底），可接受。试过放弃：把标题写进 proposal 骨架 H1（# 提案书 — <中文>）——平台 normalize_display_title 把「类型词—任意后缀」全判模板回退英文 key，H1 通道不可靠，改走 body title 通道（SELECT 补列 + 平台侧收养）。已归档变更判无法回填标题（无后续推送面），留待需要时一次性脚本。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-rot-retire-inject-cap
锚点：未记录
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140
理由：最大风险：needsReview 字段存在未核证的隐性消费方导致运行时 undefined——已由三个只读子代理全仓 grep 核证仅 flow.js:172 与 prompt.js:1231 两处，且拆除顺序钉死「先拆消费、后拆字段」。次风险：剥行误伤条目正文中的「待复核」字样——剥离仅匹配行首前缀「^待复核：」，与机器契约行格式一致，另有测试断言剥后 grep 为零。 死路（已试弃，防复潮）：① 修 rot 判据精度（枢纽文件 df 降权）保留标记层——零消费实证下把信号修准仍是家具，先拆后看；② unmapped 池整池外移冻结——resolveTouchedDomains 兜底会重建池子、104 个来源变更的幂等闸门只扫 fr/ 会把搬走条目静默写回（子代理核证），本次只做注入排除；③ distill dup 升硬门——存量 active 标题 pairwise 38 对 ≥0.6（「测试覆盖」三条互撞 1.00）全是真独立需求，硬门逼假承接行污染取代链。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-task-heartbeat
锚点：未记录
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06
理由：最大风险：心跳仍被 agent 无视（不轮询 status 直接干完）——与 openspec 同款的软约束边界，诚实披露：openspec 的剧本约束同样不强制（其 skill 文本也只是指令）；缓解=三处协议文案钉死+AGENTS.md 常驻面+哨兵硬门兜底真伪。弃案1：把「逐个勾」升为 flow done 时序硬门（勾选时刻与证据时刻配对核验）——误伤合法场景（一提交携带多 task token 是规范动作，时序配对会把正常批量提交判假）；逐 task 证据哨兵已存在故不再加码。弃案2：新增独立 flow next 子命令——与 status 职责重叠，AGENTS.md/恢复简报已统一指 status，多一个入口徒增记忆面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-skill-heartbeat-doc
锚点：未记录
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a
理由：最大风险：skill 文案与 CLI 实际输出漂移——以刚实测的 flow start/status 输出为准照抄口径。无弃案（纯文案同步）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-heartbeat-d007-incontext
锚点：未记录
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2
理由：最大风险：文案改口径后 agent 又回到「一把勾」旧行为——防线分层不变：tasks.md 头部+简报两个恰时面钉纪律、哨兵逐 task 硬门、watcher 人判；心跳渲染在自愿调用时仍给指针。弃案：保留 AGENTS.md 纪律行——每会话注入成本恒定发生，且恢复/简报面已覆盖，属非必要（用户裁决：非必要不放 AGENTS.md）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-skill-d007-doc
锚点：未记录
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2
理由：风险：与 src 口径再漂移——照抄 flow.js 简报现文案。无弃案。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-skill-prompt-retire
锚点：未记录
最近确认：9a44c32586586969def3262a1e5de06919bb08b5
理由：风险：误删仍有引用的 skill——已 grep 全仓（src/test/templates）零引用核验；resume 的恢复语义由 flow skill+AGENTS.md 承担、查看语义由 state skill 承担（职责无空洞）。弃案：保留 resume 改写为新恢复协议——与 flow skill 职责重叠，删比改省一面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-agent-log-report
锚点：未记录
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d
理由：最大风险：平台慢时 push 拖延协议面首屏。缓解：PUSH_TIMEOUT_MS=5s 硬上限 + 无平台配置即跳过 + 失败静默留底（与 run 族同语义，run --status 已付同代价）。放弃的方案：①挂 cmdFlowStart/cmdFlowDone 尾部（对齐 triggerSync 位置）——需改两个大函数、start 尾部有 --json 纯 JSON 输出面会被登记日志污染；②挂 index.js 分发层——change 未解析，auto 生成的 start 名拿不到，change_key 归属会缺。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-batch-tick-gate
锚点：未记录
最近确认：79ea50cc7bbe0eee041650277633780416e309a0
理由：最大风险：误拒合法场景——三层防护（镜像-only 静默、哨兵面未知降级 advisory、--allow-batch-tick 逃生门留痕）；观测旁路事件格式漂移 → detectBatchCheckCadence 解析失配按无证据静默（既有 fail-open）。弃案：逐 task 证据时刻配对（勾选拍与提交拍顺序核验）——git 提交时序与文件编辑时序不可严格配对（一提交多 token 是规范形态），误伤面大；单拍跳幅是唯一机械可靠的一把勾特征。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-watcher-fakecheck-retire
锚点：未记录
最近确认：0972a16c61f70b38c27ee28798adea489f6920e9
理由：风险：失去实时人判信号——收口哨兵+单拍门已覆盖同判据的终态裁决，实时层只剩噪音（合法勾选全部闪嫌疑）；历史事件流中的存量 fake-check 事件仍会被 alerts/timeline 渲染（读侧规则名无关）——属历史数据如实展示非新增噪音。弃案：降为 info 级保留——半 retire 徒增状态面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-docs-gate-zero
锚点：未记录
最近确认：d4ecab684a9e2410bbb291531f63b130f756dbfc
理由：最大风险：repo:// 转换后本仓 docs gate 与 sillyhub 仓漂移耦合——hub 侧后续演进使已转换引用失效时，配置了映射的设备上本仓推送被 gate 拦。这是 ratchet 的设计内语义（279→0 的清偿本身证明引用当前全部有效；失效即可见即修），未配映射设备零影响。 弃案：① local.yaml skip 藏数——与「真欠账清零」相反，且 local.yaml 是 gitignored 机器配置不随仓传播，他设备失效数反弹；② doc_type: snapshot 豁免——这批是活文档（spec 主场文档），冻结语义失真且豁免面随文档新增不可控；③ 让 docs-check 支持裸路径跨仓自动解析——引入路径猜测歧义（本仓与目标仓存在大量同名 router.py/service.py，预演实测 service.py 86 候选/router.py 86 候选），repo:// 显式前缀正是为消歧而设的既有机制，不应绕过。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-verify-done-green-reuse
锚点：未记录
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b
理由：最大风险：缓存绿被误复用——「本次没跑但结论是绿的」若指纹口径有洞（如 local.yaml 恰好在两次 --done 间被改）会吃旧绿。防线：local.yaml 整文件哈希入指纹（改命令必 miss）+ TTL 30min + 文档面剔除只影响「文档改动不击穿」（代码改动必击穿）+ OFF 逃生阀。已放弃方案：a) verify 收口实测结果全量缓存（不过期）——违背 fail-closed，环境漂移（DB/网络态）会吃陈旧绿，弃；b) 只修文案不接缓存——文案消掉三轮试错但 10 轮 ×290s 的实测重复真跑原样保留（本次实证的大头），弃。已知残留：multi-agent-platform .runtime/green-cache/ 下有 0 字节 'change' 文件（14:13 产物），非本仓代码与项目代码所写（双仓 grep 零命中），不影响 lookup（文件名精确匹配永远 miss），留观察不入本变更。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-quality-scan-passed-idempotent
锚点：未记录
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea
理由：最大风险：幂等闸吞真实重测需求。三层防线：①passedKey 内容敏感（dedupKey 的文件集口径对同文件未提交修改是盲的——开发中被既有 noAI 动作测试当场抓住：fixture 同文件翻转失败版，dedupKey 全等闸误命中；内容键正是为此存在，测试第五轮钉死）②lint failed 记录不入闸（保 lint 阻断发声）③RERUN=1/force 逃生阀与失败闸同阀。已放弃方案：a) 闸键直接用 dedupKey——同文件未提交内容修改盲区会吞真实代码修改（实证如上），弃；b) 闸键用 rerunSignature——其内容敏感面只覆盖 test/ 目录（computeTestFaceDigest(join(cwd,'test'))），仓根/子目录源文件同文件修改仍盲，弃；c) execute 侧复用 loadReusableQualityScan（--done 读侧）——它只校验 fingerprint（文件集口径），同盲区，弃。已知残留：git() 缺省 trim 吃 porcelain 首行前导空格是既有全局行为（影响所有经 porcelainCodeLines 的路径解析首行），本变更只在自己调用点传 trim:false 修正，未动 git-helper 公共行为（影响面大，若修应独立变更）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-snapshot-symlink-store-subdir
锚点：未记录
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77
理由：最大风险：误报面扩大——子目录有 bun.lock 但根是标准 npm 且快照本可用 → 被跳快照回主仓（牺牲隔离性换布局安全）。裁决为可接受：与既有「宁可主仓口径」同向（本仓 sillyspec 自身即 pnpm 根判据跳快照运行，主仓口径+污染归属鉴定兜底是已验证形态）；且 apps 型子目录 lockfile 意味着该 app 的 node_modules 符号链接网在 junction 快照内跨根失效，跳过是正确方向。已放弃方案：a) 递归扫两层——packages/* workspace 型 lockfile 在根、一层已覆盖 apps 型，递归徒增误报面与 I/O，弃；b) 探测 node_modules/.pnpm 目录存在性代替 lockfile——node_modules 是 gitignored 可变面（装/卸依赖瞬时态），lockfile 是 tracked 稳定判据，弃。残留边界：子目录仅 yarn（无 pnpm/bun/lerna 判据）不命中——yarn classic 无 symlink store 坑（PnP 另算），维持现状。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-inject-relevance-rank
锚点：未记录
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24
理由：最大风险：注入顺序变化改变 agent 看到的规格面，理论上可能让依赖「最老 8 条」心智的既有流程预期漂移——已用既有断言全绿对冲（fr-inject-cap ②④ 零回归，⑤⑥⑦ 新口径实证）。试过放弃的方案：① 给 readActiveFrDigest 加全局排序参数——污染两个非排序消费方（dup 门要全量、rot 要原序统计），放弃；② TierB 按「最近确认」commit 日期排——需批量 git log 查 hash 日期，I/O 重且 hash 可能不在本仓历史（平台仓实测抽样 3/3 查不到），改用来源变更名内嵌日期前缀（零 I/O）。splitGwtSeparator 已知残留：括号外的「则」嵌在词内（如「原则」）仍会切分——既有语义保留（不在本变更验收面），带护栏方案需要分词，成本不成比例。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-skeleton-gate
锚点：未记录
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e
理由：最大风险：误杀——agent 手写的真实需求恰巧以「行为符合本条标准描述」收尾会被判骨架而消失于注入面。对冲：该占位句是 flow-draft 专属字面量（design 槽指引要求 agent 写实质断言）；误杀后果有限（条目仍在索引/绑定/rot 面，TierA 命中时仍注入）；判据要求「全部」场景体命中才标。声明边界：①批次1 之前的切分错位条目（Then=箭头后半截，如平台 FR-components-shared-038 场景行）不满足占位句判据 → 不标不滤（漏放，不误杀——保守侧）；②骨架条目的「摘要：默认场景」行照旧（注入面排除以 skeleton flag 为准，非摘要文本）；③unmapped 停车场同样回填（一致性，反正在比对面之外）。试过放弃：在 flow-draft 起草端直接不生成骨架（消灭源头）——但骨架消灭的是空槽冷启动痛点（R20 实证 agent 手写 +12 轮 Edit），改起草端会回退那个决策；正确位置是消费端按信息量过滤。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-governance-telemetry
锚点：未记录
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa
理由：最大风险：候选视图被当门禁用——高 suspect 次数不等于该退休（热文件天然高频被触达）。对冲：渲染文案显式「候选非裁决」，处置指引给出人裁出口（承接翻链/needs_review），视图零阻断。声明边界：①帽 20 截断——超大触达面事件只带前 20 个 id，聚合计数是下界（视图本就是 Top-N 指引）；②存量 64+ 次事件无 id——视图只对新事件生效，历史需积累（不回填伪造）；③unmapped 迁移只做机械可迁面（来源变更可判域者），语义归属不猜。试过放弃：给 unreferenced 探针做全量 id（不帽）——单事件可达数百 id 撑爆 jsonl 行，帽 20 抽样足够指引裁决。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-splitgwt-direct-test
锚点：未记录
最近确认：b1bd40888408db06043d6fd6352cb1343ac3a6e9
理由：风险趋零（纯断言追加）。试过放弃：删 export 关键字改内部函数——回退批次1 design 的导出声明且丢失直测价值，放弃；补消费方是更优解。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-doc-anchor-refresh
锚点：未记录
最近确认：e366c3aa66c0c3aae4cd8ee267cd90ed8ca581c2
理由：已知取舍：锚点对齐的是含并行 WIP 的工作区实态——若对方最终放弃该 WIP 回退，锚点将反向漂移 -6（届时再刷一次即可，doc-ref-check 会拦）。声明边界：这是对共享门禁的前向修复（钩子指引「修复问题后再提交」），非对并行会话工作的归属认领。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-voluntary-task-tick
锚点：未记录
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936
理由：最大风险：代勾被误读为「机器替 agent 撒谎」（勾了 agent 没勾的格）。边界已钉死：仅镜像未认领面（与机器稿逐字相同=agent 从未认领该任务面）且有交付证据才代勾，时间线/输出显式标注「收口代勾」来源；agent 已覆写任务面（认领过）绝不代勾——那是真漏账，走 advisory。次风险：存量在途变更（本变更之前 start 的）flow-state 无 mirror_autotick 键——重入走原判据（向后兼容零迁移）。 死路（已试弃）：① done 门硬拒收未认领面（用户裁决否——打回重做循环，agent 应对是补票行为而非纪律）；② per-task 时序配对硬门（2026-09-29-flow-task-heartbeat 弃案1 沿用否决——误伤一提交多 token 合法场景）；③ 中途强制心跳协议调用（违 D-007 thin 两调用形状）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-thin-docs-v2
锚点：未记录
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4
理由：最大风险：approve 可被同机 agent 自己跑（CLI 无法区分键入者）——门的价值是仪式+留痕（谁/何时批）+评审抽查+平台侧核对，非绝对防伪；实证代批泛滥时的升级路径是把 approve 挂平台人工确认通道。次风险：v2 的 FR 质量从机器兜底退回 agent 撰写+强度词门——占位句/腰斩消失但烂行为句仍可能过门（强度词在句≠语义好），对冲是评审抽查与归档 FR 索引面。试过放弃：①在途 v1 变更全量迁移 v2（否决——改写 agent 正在作答的文档破坏书写面信任，双轨成本更低）；②openspec 式 WHEN/THEN bullet 场景行（否决——fr-index 归档解析认 Given/When/Then 行形态，收敛厚道格式零索引改动）；③断点门做成 advisory（否决——advisory 断点在 0/12 勾选事故已实证无牙，护栏#2 零 prompt 劝说）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-strength-should
锚点：未记录
最近确认：fca510ac262707025522f6858ff543ad56de4799
理由：最大风险：无——一行词表扩展语义单调（只放宽不收紧，既有 MUST/SHALL 行为零变化）。试过放弃：把强度词判据改成逐词分立数组+注释文档化（否决——单一正则即单一真源，拆分徒增镜像面）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-log-window-arity
锚点：未记录
最近确认：902c07f2bed907e230808d359c78068279008bd4
理由：最大风险：把 D7 改绿被误读为「修测试过门」——但方向相反：产码缺陷（裸计数 fatal）是真修复主体，夹具修正只是让测试重新测到它（修复前该断言在纯 HEAD 稳定红）。试过放弃：只改产码不动夹具（否决——B1 先命中下 note 断言仍永红，测试继续假失败）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-anchor-triggerpull
锚点：未记录
最近确认：c172c36ae2f3bba93853424276a0b7d255b74fd2
理由：最大风险：锚在窗内但语义漂移（行号指向了别的 triggerPull 出现处）——已核对 4232/4235 均为「const { triggerPull } = await import」目标语句。试过放弃：锚 4232 精确贴 HEAD（否决——并行提交后工作树校验窗又一轮漂）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-wordpos
锚点：未记录
最近确认：1793e02b038ff67e1b2610b0aee4a70bcf485bb5
理由：最大风险：放宽位置带来假放行——正文 merely 提及 MUST（如引用他人语句）即算已撰写；对冲=占位句由 pending 检查独立拦、评审抽查面兜底，且中文 必须 本就任意命中（风险面对称存在非新增）。试过放弃：要求英文强度词必须在句中动词位（否决——语义判定超出正则职责，宁同构勿复杂）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-knowledge-stats-freshness
锚点：未记录
最近确认：d47d4ee37d52454e11d847f138c36bb8873a0481
理由：最大风险：口径混淆——若 lastEventAt 误用窗口内记录（buildHitMatrix 的 records），`--since-days 7` 时「数据截至」会显示 7 天内最新而非全量最新，读数失真。对策：函数只收 runtimeDir 不收窗口参数，类型签名层面杜绝窗口口径混入。 试过放弃：复用 matrix[0].lastHitAt（最高命中文件的最近命中）——它是窗口内且按文件聚合的口径，最高命中文件未必是最近写入的文件，且窗口截断失真，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-status-empty-guide
锚点：未记录
最近确认：a1b0bb6ec15b9aabbf7429bd6c789a2ddc8f818c
理由：最大风险：文案与未来选道入口漂移（若 flow start 参数形态变更，引导文案会悄悄失效）——以 FR-01 断言「含 flow start 子串」钉住最小锚，入口大改时测试会显式红。放弃的方案：读取本仓 spec 状态做「智能下一步建议」（如检测 .sillyspec/docs 存在性给不同建议）——空态分支的定义就是 progress 无数据可读，智能层没有可靠输入反而引入误判面，且跨仓语义不通用，故弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-dogfood-audit-fixes
锚点：未记录
最近确认：cb8fddc71b66e78c840ed6120653136904a3df0f
理由：最大风险：行为修复让「原先静默降级为人类可读」的调用方（若依赖旧错误行为的脚本）突然收到 JSON——属暴露既有契约而非破坏；排查过 index.js 全局解析后 filteredArgs 不含 --json，无其他调用方向实现文件传 json 的路径，影响面封闭在三个子命令。 试过放弃：改 stages/knowledge.js 调度层把 opts.json 注入 args（--json 塞回 args 数组）——污染 args 语义（args 反映用户输入而非程序状态），且 digest 已确立 opts.json 直读惯例，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-review-promise-negation
锚点：未记录
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f
理由：最大风险：否定前缀清单覆盖不全——作答写「不存在串台」「绝无串台」等清单外否定式仍会误升级（保守方向：多评一次，成本面而非漏报面；后缀否定如「串台为零」暂不覆盖，理由：中文技术作答主流是前缀否定，后缀形态罕见，为它加规则的正则复杂度不划算）。放弃的方案：①把「串台」整个移出 PROMISE_RE——「保证不串台」是真实交付承诺，直接漏报，不可接受；②检测命中后在 reasons 组装处按上下文豁免——要在信号组装层开特例洞，且豁免逻辑与词表分离两处维护，弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-hindsight-checkbox-noise
锚点：未记录
最近确认：f689d82f93ee0c0978221d01ff84703090e1946f
理由：最大风险：正则把非任务行误归一——行首 `- [x]`/`- [ ]` 形态在 tasks.md 语义域内就是任务勾选框，误归一面只可能是 agent 在 tasks.md 写 checkbox 形态的非任务内容（极反形态）；且归一只影响改写比分子，不碰文件本体。 试过放弃：① 改 computeEditRatio 忽略 checkbox 前缀——共享内核，动它波及 flow-draft 起草面口径，放弃；② 阈值从 0.6 提到 >0.8——治标：4 任务全勾 0.8、5 任务 0.833 恒穿过任何 <1 阈值，翻格噪声是分子问题不是阈值问题，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-diff-commit-attribution
锚点：未记录
最近确认：45588742ca2f30629a406720cbb28aa270418ceb
理由：最大风险：提交 message 未携带变更名后缀的裸提交会污染归属（用户手提交 `fix: typo` 触碰过他侧文件 → 该文件判 unknown → 保留 own → 漏剔）——fail-closed 方向（多冻不错杀），与现状等价不劣化；文档化于 FR-02。放弃的方案：①扫 archive/ 下变更的声明清单参与 foreignMap——历史变更清单永久抢文件，恰是否决决策 sentinel-evidence-freeze⑤ 防的形态，且 7 天陈旧规则对已归档目录语义混乱；②按提交作者 email 归属——多会话共用同一 git 身份（本仓两实测会话同 user），作者维度无区分度；③改 flow.js 调用点显式传 baseline——该文件并行会话在途，整文件提交会夹带他侧未提交改动（规则 11），故全部改为函数内自取。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-guidance-consistency
锚点：未记录
最近确认：7d5e3de151ca53ff4b4ed2d6a185e510347bf8df
理由：最大风险：AGENTS.md 格式要点若与 flow start 格式门未来演进不同步会变成第二份漂移文档——以「要点级」而非「全文复制」表述（只写行形态不复制报错全文），漂移面最小化。放弃的方案：把格式说明同时写进 flow start 的 --help 输出（入口更近）——该输出文案在 flow.js（并行会话在途），本轮不可触碰；AGENTS.md 已是可动的最近入口，help 面留给在途落盘后。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-uivisual-word-narrow
锚点：未记录
最近确认：d0b5ebb26fe50faf2965f96fd845259506ebdc30
理由：最大风险：误漏——真 UI 变更的 input 恰好只含「渲染/组件/样式」而无其他信号且文件面无前端扩展名（如纯设计讨论期）。缓解：flow start 须知本就是 advisory 非门禁（漏渲染只少一段提示），且 detectUiTouchInPaths 扩展名兜底覆盖绝大多数真 UI 交付；探针 12 的 error 档（降级无裁决）不依赖词表触发条件的变化。 试过放弃：① 双信号分层（input 命中 ∧ 文件面/多词佐证）——纯文案改版真 UI 变更会漏，且把简单启发式复杂化；② 全词表保留+对 CLI 仓加白名单——按仓配置引入 per-repo 维护面，与「仓中立」模块承诺冲突。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-visual-downgrade-narrow
锚点：未记录
最近确认：546720ea4ed1a70809e69a82b342f3e4bcda12c5
理由：最大风险：窗口值选错——真降级声明写法超出 6 字窗口（如「视觉层面做了大幅的收缩式降级」= 视觉+7 字+降级）会漏判；漏判方向是 fail-open（少拦一次 error），而该形态本就极小众（正例标定留了余量），且 error 档之外缺证据面仍有 gate 兜底。 试过放弃：① 语义排除（行含「探针/检测/词表」跳过）——讨论形态不可枚举，且引入语义判定制违 D-003 封闭面；② 删除 partial token——既有正例「FR-04 partial：」依赖它，伤正例。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-wt-list-resilience
锚点：未记录
最近确认：33bc4d2857eb29f15e10f062808e3d9d8eee2385
理由：最大风险：changeName 兜底目录名后，若某历史注册表目录名与变更名不一致（理论上只在手工改名目录时出现），list/doctor 会按目录名匹配——但该形态下旧行为是 undefined 崩溃/失配，兜底严格更优，不构成回退面。放弃的方案：① 渲染器（index.js）侧判空——只修 CLI 一处，doctor 的 undefined 失配仍在，且 index.js 当前被并行会话在途占用（不可改）；② 写入侧强制补全历史件——要迁移已落盘 meta，读侧问题写侧修，收益错位。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-branch-ref-anchor-scope
锚点：未记录
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc
理由：最大风险：主仓 HEAD 恰好不含某历史 hash 但另一常驻 ref（如 origin/main）含——探针二判「不在主仓可达」→ 误锚（多余 tag，不删任何东西，安全方向）；反之不存在漏锚面：hash 要悬空必须同时在分支上且不在任何常驻 ref，而探针二只看 HEAD 这一个 ref——HEAD 不含而 origin/main 含的场景锚定是多余的但无害。放弃的方案：① 枚举全部 refs 逐一判可达——覆盖更全但 N 探针成本与配置面（remote 名不确定）不成比例，且收益仅是少打几个无害 tag；② 改为 rev-list branch ^HEAD 取分支独有集再做集合判——语义等价但一次性拉全集在候选仅个位数时反而更重。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-review-declared-unstamped-gate
锚点：未记录
最近确认：a26821acd8caefeee88ae1031526b8564d124a74
理由：最大风险：本变更的 run 在极端场景（戳文件被误删/worktree cleanup 先清了 run 戳）真丢戳——声明面静默为空，apply 对 review 声明过的越界文件改报「不在 design 清单」violation，出路从「review 声明自动放行」变成「补 design 声明」——收紧方向可恢复（fail-closed），且该场景本身意味着 run 元数据已损坏，静默信任其声明才是风险面。放弃的方案：① 改 resolver 语义（无戳回退整体删除）——影响 task-done/cross-repo-reconcile 等全部消费方的 marker 漂移恢复路径，锁定面外；② 只改 warning 文案区分无戳来源——保留误挂数据只软化措辞，治标不治本。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flowdone-lintfail-output
锚点：未记录
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9
理由：最大风险：读改写 test-result.json 的并入分支在结果文件损坏时静默退独立落盘——同变更可能留下两份结果文件（原损坏件+独立 lint 件），消费端按 kind 字段区分；显式 best-effort 边界已在 JSDoc 声明。倒推收尾特有风险：接手非本会话原创的代码，语义理解偏差——已逐行核对 diff 与既有 test 三件套同构性并实跑其自带 e2e 锁定。放弃的方案：① 在 runVerifyLintCheck 内直接落盘——该函数被多路径复用（verify/quick/flow），落盘时机与归属 change 名在调用方才知道，写入层错位；② 改 tally 记全量输出——tally 是计数器不是存储，扩容错位。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-redomain-preview-bychange
锚点：未记录
最近确认：4eedf8e6ace5f2f63e346672f7d198e055cdb863
理由：最大风险：byChangeD 为空字符串时 `byChangeD || null` 归 null——与既有落盘分支同款归一（非新行为），无新增面。倒推收尾特有风险：接手代码语义理解偏差——diff 仅一行透传 + 一行文案，已逐行核对并实跑其自带 CLI 单测。放弃的方案：无（更深的重构——如把预览/落盘共用一条参数组装路径——超出坑修复面，不动）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-disposition-refreeze-drift
锚点：未记录
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403
理由：最大风险：治理件后补提交（如评审任务书后 agent 修改 design.md 并提交）也带本变更后缀 → 触发重冻结+重评——多一次评审循环的成本换审计面始终对齐最新提交事实，方向正确但循环可能多一轮；重评后无新提交即不再触发，无死循环面（判据窗口每轮前移）。放弃的方案：① 只警告不自动重冻结（弱形态）——警告会被忽略，归档件仍停在旧时点，治标不治本；② 按 review.json 的 reviewedAt 时间戳对比提交时间——时钟不可比（本地钟漂移），且 review.json 可手写，锚点不可靠；head 锚是 git 自身事实。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-tests-confirm-hint
锚点：未记录
最近确认：4e4aa7d58299154c82c9fe863a5ee191795fb5f1
理由：最大风险：提示语与实现将来再度漂移（实现改形态而提示没跟）——已加源级回归测试锁定形态一致性，漂移即测试红。放弃的方案：index.js 兼容子命令形态（解析 tests 后首个位置参数 confirm）——双形态长期并存扩大漂移面，且与既有 fail 文案（教 flag 形态）冲突。已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-format-copy
锚点：未记录
最近确认：979e624889e8bfeebaa9a2904da64763bb438620
理由：最大风险：教学形态将来再与实现漂移（实现改格式教学没跟）——源级回归锁定紧凑内联旧形态零残留与新形态在场，漂移即测试红。放弃的方案：让清晰度门宽松兼容内联形态（「成功标准：」行内也提取）——弱化过门格式（独立行是可解析性锚），且 AGENTS.md 已教严格形态，改门等于迁就错误教学。已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-bind-unbind-help
锚点：未记录
最近确认：e0d2fe4eb987a2ada4d328d6faee428defbb4f9e
理由：最大风险：语义短注将来与实现漂移（bind 改替换语义等）——回归测试带实现一致性锚（锚源文本随实现改而红，提示同步文案）。放弃的方案：把语义写进模块文档而非用法行——用户在 CLI 报错现场最需要语义，文档是第二落点；两处都写扩大漂移面，取现场单点。已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flow-help-status
锚点：未记录
最近确认：8d31a9e964a58dbd37e6bc7fc6ccc93e3c92d75b
理由：风险：用法行进一步变长（终端窄时折行观感下降）——接受，与既有单行长风格一致。试过但放弃：把 status 提示拆成第二行独立输出——放弃理由：exit(2) 前多行 stderr 无既有先例，且既有测试按单行 includes 断言，拆行增加断言面无收益。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-hunk-gate-commit-attribution
锚点：未记录
最近确认：72c50c924f82444521924e13a75859db8a17ec3b
理由：最大风险：提交 message 后缀被伪造（本变更交付冒他侧名）→ 误判他侧归因放过未声明文件——但该伪造同时会骗过 patch 冻结的同一口径（filterCommittedFace 先于此门存在且已裁决：按提交事实归属是已发生的提交事实不是声明抢文件，sentinel-evidence-freeze⑤ 界定），本变更只是让两消费点口径一致，不新增伪造面。放弃的方案：① collectForeignDeclarations 扩扫 archive/ 声明面——用陈旧声明做意图归属正是 sentinel-evidence-freeze⑤ 否决的形态，且 archive 清单庞大性能面差；② 未归因警告文案改软——保留误报数据只软化措辞，治标。均已弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-teach-copyable
锚点：未记录
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404
理由：风险：多行教学使部分命令输出变长（worktree-guard 拦截提示从 ~9 行变 ~11 行）；terminal 折行下实例可能视觉粘连——接受，实例行保持短行、缩进区分。另一风险：教学实例字面与本变更测试断言耦合，未来改教学须同步测试——这正是断言的目的（锁可照抄性），可接受。试过但放弃：改 extractSuccessCriteria 使分号内联形态也过门——放弃理由：内联形态无法区分「动机句」与「标准条目」，放宽会把动机文本误收为标准，门语义受损；教学侧给实例是更小且语义正确的修复面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-teach-non-src
锚点：未记录
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25
理由：风险：已 init 存量项目的 AGENTS.md/命令卡仍是旧形态（同版本不更新机制）——接受，存量项目下次大版本 init 会覆盖；新装项目从本变更起拿到可照抄形态。另一风险：CLAUDE.md 各项目形态各异（本仓是 dogfood 特有完整版），改动不可迁移——本变更只对本仓与包内源负责。试过但放弃：倒推行表格单元格内嵌多行实例（markdown 表格不支持换行，<br> 形态在 markdown 源码里不可照抄）——改用「格式同上」引用式表述。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flow-tail-polish
锚点：未记录
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e
理由：风险：exit 0→1 是行为变化，依赖旧语义（用 exit 0 判断"查询完成"）的脚本会翻——接受，脚本按惯例以非零为异态，旧行为无法区分不存在才是隐患；machine-interface.test.mjs:420 的 exit 2 断言属 gate execute 域（用法错）不受影响。归档窄化 add 修复后 knowledge 自动入暂存恢复——既有设计已裁决该权衡（文件级 status 窄化非目录级，追加型共享面整文件提交与惯例一致）；兜底层（narrowed add 失败时）才降级为提示不自动暂存。试过但放弃：knowledge 兜底层也自动补暂存——放弃理由：降级场景下无法确认 narrowed add 失败原因，人核后提交更稳（AGENTS.md 规则 11 同因）；再试过：flow-state 不加字段、纯 proposal 回退——放弃理由：proposal 转写含「（未提供 --input）」占位与人工改写风险，state 直存是更可靠的原始面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-agent-log-detect-hint
锚点：未记录
最近确认：a39154be47e8c14fb3b00b2935218208c46400fb
理由：最大风险：展示名映射 HARNESS_DISPLAY_NAMES 成为新的次要漂移点（新 harness 忘加映射→展示退化为 name 原样）。已用缺省回退消解——退化形态仍含全部家数，只是不美化，且测试遍历断言按「映射名或 name 原样」命中，两种形态都受覆盖。 试过放弃：① 仅更新硬编码文案为 8 家——不解决根因，注册表再扩仍漂移，放弃；② 提示全部用 name 原样拼接（claude-code / deepseek-dsh）——零映射零漂移但可读性差（品牌大小写混乱），放弃，取映射+回退折中。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-litest-p1-fixes
锚点：未记录
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3
理由：最大风险：① cursor 收窄漏报——若未来代码引入非 db.cursor() 形态的真游标（如 cursor.execute 独立出现），RE 不命中。权衡：该形态必先有 conn.cursor() 创建点（Python DB-API 惯例），`.cursor(` 已锚定；next_cursor 覆盖主流分页协议。漏报面远小于原误报面（本仓每个提及 cursor harness 的 patch 都误触发）。② 行号锚会随源码演进再漂移——这是 doc-ref-check 机制的设计预期（漂移即红），test:core 纳入后漂移在日常工作流被拦，不再是沉积债。 试过放弃：cursor 收窄为「赋值/字段形态 `\bcursor\b\s*[=:]`」——grep 实证本仓 docs-check.js/quicklog.js/init.js 有 8+ 处循环变量 `cursor =` 命中，误伤面仍大，放弃；归档聚合用 `--name-only`——实现期测试即暴露 rename 折叠丢源侧路径（部分提交语义下源文件不会被删），改 `--name-status`。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-review-anchor-and-negation
锚点：未记录
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280
理由：最大风险：① reviewedAgainst 伪造（评审员乱填 sha 绕过隔离）——信任层级与 verdict 同级（评审产物本就信任子代理如实填写，schema 校验形态不校验真伪；且填错 sha 的后果是多留一份过期评审，后续 review 子步 validate/P1 判定仍在，防线不单点依赖锚定）。② HEAD 短 sha 前缀碰撞（7 位起）——理论存在但与 git 自身缩写语义一致，碰撞后果同①不致命。 试过放弃：把裸「不」加进 NEGATED_CROSSTALK_RE 前缀词表——「不[0-8字]串台」会把「不排除串台」「不可能没有串台」等风险自认/双重否定误消解（⑥ 用例即反向锁定），放弃，取三字整词精确匹配。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-flow-status-json
锚点：未记录
最近确认：e751e152e63cf842c15237779705e29b87ab9124
理由：最大风险：事实/渲染分离时改坏现有人类可读输出（heartbeat 等测试逐字钉渲染行）。对策：人类可读路径保留原渲染字符串本身，仅把渲染数组里的内联计算换成同语义的预计算变量（正则与语义逐字不变），并用测试钉住不带 --json 的关键行。试过放弃：对渲染文本做「文本→JSON 反解」包装层——放弃，文本是给人看的不是契约，反解正是本变更要消灭的 fragile 匹配。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-archive-cmd-race-and-brief
锚点：未记录
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c
理由：最大风险：knowledge/docs 共享面仍有残余竞态（打印→执行窗口内新文件被并行移走）——HEAD 锚不适用于「本轮蒸馏新产、HEAD 尚不在册」的 A 条目，只能以在场判定收窄 + fallback 指引兜底；发生概率低（蒸馏产物刚由本链写盘）。试过放弃：① 打印时逐条目 `git ls-files` 校验——校验的是同一瞬态 index，幽灵当场在册照样通过，治标不治本；② 建议裸 `git commit`（无 pathspec）——违反 AGENTS.md 规则 11（共享暂存区会卷入他会话条目），且把「执行时暂存区又变」的窗口风险放大成全量面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-wallclock-entry
锚点：未记录
最近确认：9946796884354bfe0a55318aeb740575d61f4127
理由：最大风险：scan facts markdown 的 `generatedAt` 消费者（人读文档、快照 diff）看到值形状变化（UTC→本地）。已核实仓库内无测试断言 UTC 形、无机器按该字段做时间运算（git --since 消费的是 verify-facts.json），风险面收敛于人读显示。 放弃的方案：让 toWallClock 只接受 ISO 字符串并手写正则解析——放弃，正则白名单就是格式枚举，开放解析面应委托 Date 构造器；再如给 scan-facts 保留 UTC 但加后缀标注——放弃，与 datetime.js 既定的人读=本地墙钟约定冲突，制造两种并存形状。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-module-map-list-leak
锚点：未记录
最近确认：bb882b535e34e2a82d97f0324d0f88e4420bf591
理由：最大风险：依赖「泄漏项」的行为面——若有下游逻辑意外依赖污染数据（如某模块故意把单段 tag 当 path 用、或测试断言了污染形态），收紧后行为变化。已核：仓内测试 fixtures 均无 paths 后跟 tags 的块式写法（这正是泄漏长期不可见的原因）；泄漏项全是 tags/aliases/symbols/deps 值，语义上就不是路径。次风险：在场过滤把「动机里提到的未来新文件」token 滤掉致路由落空——已按「在场或图内」双判收敛（图内目标文件照常路由），落空走诚实提示（起点无依据），优于误路由冒充真域，取舍在设计里写明。量化口径注记（评审 P3 清偿）：早期粗计「950 条实路径」是修复前解析面计数（含 450 条带斜杠泄漏垃圾：入口注释/路由串/模块描述）；jsYaml ground truth 对账真实声明为 500 条，泄漏项合计 1375 条——test 头注释与本设计以 500/1375 为准，proposal 转写中的 950 为过程记录不再修正（历史镜像）。 放弃的方案：①parseModuleMapSimple 式字段名枚举白名单补全三解析器——放弃，开放世界字段集枚举不全即是本 bug 的成因（用户约束亦禁止）；②换 js-yaml 整体解析——放弃，三个解析器各有「只取平面子集、坏段不缺省不拦截」的容错立场（注释明示），整体解析改变坏段行为与性能面，超出本修复的刀口。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-archive-stage-claim
锚点：未记录
最近确认：04fcb08208bc2ed0a411e8c9d69d1cbc35b75ecf
理由：最大风险：告警面打扰——add 失败从静默变告警，若失败高频（如持续锁竞争）会重复提示。可接受：假成功比告警贵（实测已付出一笔手工补提交）；告警自带兜底指引可执行。 放弃的方案：①让 safeGit 失败时抛错（改公共错误语义）——放弃，影响全部调用方，超本变更刀口；②失败时自动重试 add——放弃，锁竞争类失败的重试时序不可控（此前已实证 add 竞态即现即逝），诚实暴露 + 人工重跑更稳。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-git-optional-locks
锚点：未记录
最近确认：549d1fd1ad01c69a24799dc22016c6fe1a976dac
理由：最大风险：读命令不再刷新 stat 缓存，后续读每次都要重扫文件 stat——大仓上 status 略慢、index 文件 mtime 不再被本工具更新。可接受：正确性无差（status 结果仍如实反映工作区），性能差在毫秒级轮询场景不可观测。 放弃的方案：①逐调用点加 `--no-optional-locks` flag——放弃，只覆盖被改的调用点且维护面碎；watcher/后台全覆盖需要枚举改点，恰是要避免的形态。②在 stageArchiveSourceSideMoves 里对 lock 类错误做有界重试——放弃（本变更时点）：重试是下游补丁，治标；上游消灭锁窗口后本工具自扰的锁冲突已不存在，外部进程的偶发冲突由 archive-stage-claim 的告警面兜住。若外部冲突实测高频再议。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-flow-status-title
锚点：未记录
最近确认：0d7576c8d969d19ca20b4c561ad9c5e815c8f305
理由：最大风险：JSON 消费方对新增字段的兼容性——单对象加字段对 JSON.parse 消费方是非破坏性变更，风险低；人类渲染变更可能影响既有文本匹配测试（test/flow-status-json.test.mjs ③ 人类路径回归已覆盖关键行，本变更加 fixture 断言钉住新旧两态）。放弃的方案：① 在 flow-state.yaml 里冗余存 title（写两处状态有漂移风险，DB 已是权威源）；② status 输出全量改由 DB 驱动（超出本变更范围，且 flow-state/盘面事实才是 status 主源）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-fr-regress-cap-drop
锚点：未记录
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6
理由：最大风险：优先面无上界放大单批执行时长（病态绑定面大仓单批逼近超时帽）。评估：本仓实测 63 文件 ≈ 100s，远低于 600s 帽；FR 绑定面本身是知识库声明面（有治理），放大是「该跑的终于跑了」而非噪声放大；超时护栏仍在。放弃的方案：① 给优先面另设上限（如 120）——重新引入「钦定回归被弃」，只是把弃置线上移，披露语义又得分层，复杂度不值；② 帽内优先面按 FR 命中数加权选择——仍是弃置，只是更聪明的弃置，与「绑定面即测试需求」哲学冲突；③ 只修披露不修行为（标签改准、弃置照旧）——回执诚实了但钦定回归照丢，假绿风险留存，不彻底。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-resume-title
锚点：未记录
最近确认：86a88f5c2c0f24dc9992636cacb7933a0aa5e222
理由：最大风险：恢复路径在测试里跑 cmdFlow start 会拉起 watcher/补起草等副作用——测试须以 SILLYSPEC_WATCHER=0 逃生阀与临时仓隔离（既有 watcher 测试同款），否则测试环境噪声。放弃的方案：① 在 flow-state.yaml 冗余存 title（双源漂移，DB 已是权威源）；② 恢复简报改为直接复用 flow status 的渲染函数（两版面文案/结构不同，强行共用会把 status 的阶段推断耦合进恢复面，超出本变更范围）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-fr-priority-overlap
锚点：未记录
最近确认：7f921a670bb4e9e4504acb8d5a6863f260db62df
理由：最大风险：优先面扩大（全量绑定文件含重叠）进一步放大执行批尺寸——与 fr-regress-cap-drop 已裁决的边界同族（TEST_TIMEOUT_MS 兜底、绑定面是知识库声明面有治理），增量只是重叠子集（本仓实测 14 个），可忽略。放弃的方案：① 在 buildDepsBatches 内部把 priorityFiles 语义改为「并集口径」——调用方语义应显式，函数不该猜调用者意图；② 去重时把 frLinked 换成 fr.files 并顺带删 added 计算——frReport 的 addedCount（新增并入 N）是既有披露口径，动了会漂移控制台文案语义。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-datetime-timeago
锚点：未记录
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7
理由：最大风险：档位换算复刻不严导致进度面板展示漂移（如 59 分 59 秒被四舍五入进位）。对策：逐字复刻 floor 链（分钟 floor → 小时 floor(分钟/60) → 天 floor(小时/24)）+ 测试钉住全部档位边界（含 59 分 59 秒 / 23 小时 59 分 / 未来时间）。 试过放弃①：把解析失败回退（返回原串/『未知』）做进 timeAgo 内部——会让「无效输入必须抛 TypeError」的契约失效，且容错回退是 stage-machine 对脏数据的展示职责，塞进通用工具语义含糊，放弃。 试过放弃②：解析也一并迁给 datetime（让 timeAgo 吃 _parseFlexibleTs 的 zh-CN 回退）——回退正则是进度面板对存量 lastActive 的兼容面，迁走等于把调用方私有数据形态泄漏进通用模块，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-resume-domain-flip
锚点：未记录
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f
理由：最大风险：mtime 不可信场景误剔——工具保留旧 mtime（cp -p / 归档解包）落进未跟踪区且恰在本变更期间成为交付面。对称面：收口冻结面（collectFreezeFiles）不做此过滤，未提交交付仍走「无法归属警告/--freeze-dirty」既有出口，路由面少一个域只是 advisory 注入变窄，不丢审计事实。clock skew：出生时刻与 mtime 同机同时钟，无跨机比较。 试过放弃①：按路径形态过滤（排除 .claude/ 等目录）——开放世界枚举，写死目录清单必漏新形态，违反本变更自己的成功标准，放弃。 试过放弃②：fresh 时把 porcelain 未跟踪面快照进 flow-state、重入时对照差集——状态面翻倍且 flow-state 并入 patch 冻结件的口径要跟着改；快照后文件被本会话编辑的差集判定仍要回退到 mtime，多一层状态没有多一层判据，放弃。 试过放弃③：在 changedFilesSinceBaseline 内部加过滤参数——fr-rot-precision ⑥ 源码钉断言调用形态 `changedFilesSinceBaseline(cwd, st.baseline_commit)`，改签名要么破坏钉要么连带改三个消费面（resume 路由/dirty 计数/收口测试门），收口测试门语义不该被路由面需求带着动，放弃，改在调用侧包裹。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-verify-friction-fix
锚点：未记录
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a
理由：最大风险：refresh 的「已手填」判定依赖占位标记启发（`<待填`/`<!--TODO` 缺席 = 已填）——探针 1/3/5/6 这类直接渲染结论行、永无占位的段永远判 kept，预填过期要靠 --force（有备份兜底）；反向误判（agent 在段内追加叙述但占位仍在）会连带被替换，靠前置备份 + 逐段报告暴露，属可接受残余。试过但放弃：① 按「新旧渲染逐字节 diff」判定未触碰——需保存历史渲染指纹，gate 抽查机制已占用该信号位，复杂度不成比例；② refresh 时整段保留已填行、只重排未填行——行级携载已覆盖 38 格矩阵主场景，全行保真方案把 stale 行永远带下去；③ 给 gate last 加 --full 重跑——那正是要消灭的超时路径，读盘 3ms 解决。第二个风险：声明宽收的「不涉及接口」可能在个别 design 的无关散文中出现而误判 declared=0——影响面是 API 矩阵渲染少一行（advisory 层），且数字声明优先，已在测试钉住优先序。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-status-multi-active-list
锚点：未记录
最近确认：9e0a8c4df213f6b3a1dfb2b66a9f2714e30bafc6
理由：最大风险：幽灵行刷屏——DB 残留大量 status='active' 但目录早已不在的行时，清单较长且多数标「本地无目录」。可接受：这正是 DB 真相，且 doctor --cleanup-remnant 是既有清幽灵通道，本分支只负责如实展示。放弃的方案：①在 listChanges（库函数）里过滤无目录行——污染库语义，DB 行与目录存在性是两个真相层，别处依赖 DB 口径；②改 read() 让多活跃返回特殊值——动核心推导语义，调用方十余处，风险与收益不成比例；③清单截断加「其余 N 个略」——现实活跃数是个位数到两位数，截断只省屏幕不省正确性，反藏信息。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-verify-docs-prefill
锚点：未记录
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1
理由：最大风险：②的候选注入是变更级近似（frHits 无逐卡文件映射面，无法精确到「这张卡的 acceptance 连哪个 FR」）——无归属卡收到的是全部 FR 关联文件的并集，可能含无关用例。缓解：只注入无归属卡（有归属卡零噪音）、注记行明示「候选，命中≠结论，判定由你复核」、判定枚举仍由 agent 改写；宁可多给候选不回到「无归属测试——大概率 uncovered」的零信息预填。第二个风险：①的占位检查可能被 driver 误读为「测试通过」——warnings 三处明示「本档不含测试客观核验，以完整 gate/--done 为准」，exit code 语义不变（占位 ok=true 但整 envelope 的 ok 仍由 artifacts 等真检查决定）。试过但放弃：a) docsOnly 用命令子形态（gate docs <stage>）——与既有 --full flag 家族不一致；b) probe7 逐卡精确映射（requirement_ids→active FR）——本变更新 FR 与知识库 active FR 是两个编号系，映射需标题相似度启发（frTitleOverlap），误配代价高于并集噪音；c) guide 清理按 mtime 过期——时间窗语义在多变更并行下比引用白名单更粗暴。另：本变更撤销了最初计划的「评审三档」——档位机器已存在（review-tier S0/S1→self + flow-review 五路证据定档 + 1/4 抽样校准），再加 self 档会破坏抽样校准机制；55 万 token 病根是厚流程选道错位（运维修复应走轻量道），属选道纪律非档位缺失。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-flow-friction-batch3
锚点：未记录
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e
理由：最大风险：②的建议可能「答非所问」——basename 全等命中只覆盖「缺目录前缀/移动了位置」这类幻觉（postmortem 实证主力形态），对完全虚构的文件名无效（此时无建议段，回到现状）；BFS 8000 上限在大仓深目录下可能截断扫描漏掉真候选——建议是锦上添花，截断只意味着少一条提示不误报。第二个风险：④把「批量跳过」合法化可能被滥用为「一键清债不思考」——reason 是必填审计面的弱化（可选参数）；缓解：CLI 输出明示「reason 是审计面请确认真实」+ verify 门只认文件不认命令，agent 仍可手写。试过但放弃：a) 把 stage-review 检查并进默认档 error 语义——那会让 gate 默认档 FAIL 而 --done 才是执法点，两道门抢执法权造成新分裂（informational 是唯一不破口径的位置）；b) suggestClosePaths 用模糊匹配（编辑距离/前缀）——误建议比无建议更害（agent 照抄错路径再撞一轮门），basename 全等是零误报下限；c) visual-evidence 在 execute 收口硬拦——执法点在 verify 是分级门设计（ui_visual_gate 配置），execute 只该提醒不该抢。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-wave-auto-adopt-review-dedup
锚点：未记录
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8
理由：最大风险：③增量重跑的假绿面——修复破坏了「增量面之外、基线绿面之内」的测试而未被发现。缓解链：增量面三源推断以修复文件为输入重算（import 依赖与 FR 关联回归自然入面）；失败批文件无条件入面；增量面≥全量面时回全子集；test_rerun: full 逃生；归因不出保守全记批文件（增量退化不误报）。残余接受：跨模块副作用破坏无 import 边文件的理论面——与「agent 手动只跑失败测试」的现行实践相比是严格改进。第二个风险：①自动重排改写 agent 手排 Wave——agent 的时序意图应编码在 depends_on（adopt 的输入）而非 Wave 手排；公告醒目 + config 逃生 + git 可恢复。试过但放弃：a) 增量后强制再跑全子集确认——passing 轮成本反升（增量+全量>全量），postmortem 的痛点是失败轮返工不是通过轮；b) 逐文件归因用 failureRemaining 行集——实证行集只含内层用例名不含文件名（node --test 文件作参数时顶层名=测试标题），改走 not ok 块 location 路径；c) Wave 错误在 consistency 单点挂自动重排——WA4 实证混有其他错误时会误触发，移到失败统一收口点判定。撤销三项（记录裁决）：评审档位新增 self 档不实施（档位机器已存在，self 档破坏 1/4 抽样校准）；「--done --answer 补 wait」视为已修复（complete.js requiresWait 门现行自动补全）；「--step 意图断言」作为并发安全设计保留。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-thin-tasks-v3
锚点：未记录
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29
理由：最大风险：移除镜像豁免后，存量在途变更（tasks.md=镜像面、agent 已一把勾、区间提交无 token）在升级后收口会从放行变拒收——属预期收紧（假完成主张本就该拦），出口是补 token 提交或 --allow-batch-tick。次风险：agentic 行为对文案变化的适应性——横幅契约若仍埋在长输出里，逐格勾依旧靠自愿；本变更不动 D-007（中间零必需交互），接受该边界（节奏门+哨兵统一判据已把「一把勾」的账算清）。试过放弃：watcher 轮询间隔调小/开 fs.watch——治标（合并概率下降不归零）且 watcher 进程面改动大；放弃。另试过：tasks.md 由 agent 在 spec 断点必写（机器不再预填）——违反「工件回填轮=0」哲学且断点无机器门可验「写没写」，放弃，保留机器种子+自由改写。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-tick-timing-first-commit
锚点：未记录
最近确认：0a843cdd7f5c87bbb361ab4d7b59d5270752b5e6
理由：最大风险：超大 history 下 --reverse 全量列举的耗时（路径限定后通常个位数提交，实际无感）。试过放弃：`git rev-list | tail -1`——需二次管道/字符串处理且 rev-list 无 --format；放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-allticked-gate-docs-resync
锚点：未记录
最近确认：bf7c122935343fcb176cc50aece2ceb99fcb072c
理由：最大风险：全勾硬门对存量在途变更的收紧（未勾收口从放行变拒收）——出口明确（补 token 提交+tick 或改写任务面），且与证据门同哲学；次风险：tick 触发的后台同步在网络差时堆积——bg-sync 单飞锁+合并天然防堆积。试过放弃：时序门（tick 时 token 提交须已存在，先证后勾）——用户裁定参考 openspec：openspec 无任何时序/证据审计，完成状态机（全勾才收口）+自愿循环指令即是其全部机制，我们已有证据门加全勾门已强于它，时序门属过度强制，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-release-3-32-0
锚点：未记录
最近确认：48b4e0a4f52dd3ec05cc03e3929a037f61e4d4c8
理由：无显式风险；未试过其它方案。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-scope-audit-thin-patch-replay
锚点：未记录
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05
理由：最大风险：patch 段解析与 git 真实 numstat 的口径偏差（路径含空格的引号形态、rename 段、\ No newline 标记）。缓解：段头正则与既有 filterPatchForFiles/slicePatchForFile 同款（b/ 新路径），\ 开头续行不计，rename 场景 thin 冻结面罕见且行数偏差不改变三态判定；测试对拍 buildFrozenPatch 产物。放弃的方案：① flow done 补写 scope-audit.json（写侧）——只救新变更救不了存量归档，且造双冻结源；② 行数按 meta.baseline..head 提交区间改采 git numstat——对 committed 面精确但冻结面含 done 时点工作树件（治理工件/untracked），且引入对 git 对象库存活的依赖，不如解析冻结 patch 自包含。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-unify-close-trace
锚点：未记录
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271
理由：最大风险：两写点行为收口的回归面——thin 侧 console 字样/键序、heavy 侧「空 patch 当 ok」形态变化可能碰隐性消费者。缓解：thin 侧键结构与输出前缀逐字保留（flow-protocol 断言钉住）；heavy 空 patch 形态经全量套件与 e2e 验证；快照新增 closedBy 为 additive 键，旧快照读侧缺省兼容。放弃的方案：① 只做读侧不写统一（第 2 层已做）——新变更永远靠回退兜底，两卡不对称长期存在；② heavy 侧沉淀面在 archive --confirm 才写——语义上更「终态」，但需在归档点重建采集上下文（worktree/分支已清），且与快照时点（execute --done）不一致会造成两套留痕时点漂移，不如同点同锚；③ scope-audit.json 里引用 change.patch 路径省一份 patch 文件——读侧（getFileDiff/平台）认死 scope-audit.patch 文件名，省字节收益小于读面改动风险（同字节 git blob 本去重，零仓容成本）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-knowledge-stats-fr-only
锚点：未记录
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1
理由：最大风险：输出层过滤遗漏某个段导致「跳过」不完全。对策：测试覆盖三态断言段级完整性与字节一致性。放弃的方案：在计算层直接跳过 matrix/conventions 计算——弃，因为计算层是共用函数（被其他消费方引用），跳过会改共用函数签名引入回归面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
锚点：未记录
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450
理由：最大风险：阻断门改变既有收口习惯——依赖「警告后继续」的自动化/脚本会开始拿到 exit 1。缓解：exit 语义=半态可重入（与 review 中断一致，CLI 文化内既有形态）；--accept-dirty-gap 一 flag 恢复旧行为且留痕；flow-protocol ⑥b 同步更新锁定新语义。放弃的方案：① 归档态 `flow done --refreeze` 重入口——治存量不治源头，且对终态归档件开重写面（review/快照/sha 锚一致性要另设计），阻断门落地后坏状态不再产生，存量用已验证的协议重入修法，留档后续可选；② dirty 警告时自动 --freeze-dirty——把「无法归属」静默升级成「全归属」，跨变更审计双计风险（他侧在途文件误入冻），违背归属保守原则；③ 提交信息解析支持任意前缀文本（不限 thin）——误匹配面扩大无实测形态支撑，收窄为 thin 前缀 + 附注。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-release-3-32-1
锚点：未记录
最近确认：7df3a2298f02c43be047969c862edbcd30166d29
理由：最大风险：publish 后发现版本面遗漏（如 AGENTS.md 头部版本字样）——3.32.0 发版已验证该面不需要随动（init 生成物、按版本差自动刷新），R5 锚即防漏钉。放弃的方案：无（照抄上版发版模式，无新设计面）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-knowledge-inbox-triage
锚点：未记录
最近确认：bda98076636049009a2f2e032aade374999ea969
理由：最大风险=归类误判（条目常跨类，如 antd v6 三坑兼含组件 API 坑与 vi.mock 测试坑、Alembic 条目兼含目录惯例与事故处置）——对策：按主要可操作价值归类，INDEX 关键词行写入跨类关键词多路命中兜底。已放弃方案：① 把「待确认」条目一律升格已核实——放弃，仅核实本仓可查的 sillyspec 9a63466（跨端 mock 契约修复锚），sillyhub 侧条目（execFile ENOENT / antd v6 等）保留「待确认」原样；② 跨类条目拆分进多个文件——放弃，破坏原文完整性且违背「逐条归类」指令；③ 提交 INDEX.md 全文件——放弃，会夹带他会话指向未跟踪 fr/ 新文件的半份逻辑变更。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-batch-tick-false-positive
锚点：未记录
最近确认：b125a8940021463953eae7f26d8a24e083acba31
理由：最大风险：消费层 stage 过滤放宽了检测面——若未来有真实「design.md 勾选框被 agent 一把勾」的纪律诉求，本门不再覆盖（须另立信号面）。接受理由：design 自审是 authored-whole 断言面（模板即如此），一把勾与整体写盘不可区分，覆盖它的成本就是本次实证的误伤。放弃的方案：仅修 watcher 源头层（历史流与未知发射面无纵深）；仅修消费层（幻影事件仍进平台展示流污染时间线）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-graph-summary-nodes
锚点：未记录
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a
理由：最大风险：clusters 数量随域增长（真图 883 簇）撑爆平台 lite 画布——已由 `--clusters N` 截断旗标化解（消费方按需取 top-N，簇计数守恒不变）。放弃的方案：①CLI 侧默认截断 50——否，默认值是平台 UI 偏好不是引擎语义，全量才是可审计口径；②summary 落盘缓存——否，违反 D-003 图不落盘铁律且引入失效问题；③doctor 内调 summary 复用——已如此（同源口径互引，不复制实现）。死路提示：不要为「跨仓锚点单列计数」去解析 local.yaml 外仓（探测面无界，历史否决同型）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-graph-summary-consistency
锚点：未记录
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b
理由：最大风险：⑩交叉断言解析 doctor finding 文本计数——doctor 输出格式（「graph-module-doc-gap：N 个」）成为测试契约面，未来改 finding 文案需同步改测试正则。接受：该格式本就是平台时间线展示面，钉住它等于钉住消费契约；格式漂移测试红属正确报警。放弃的方案：doctor 直接消费 graphSummary 拿计数——弃，doctor 需要 finding 样本明细（样本列表进 warning 文本），纯计数接口喂不饱；维持两函数但加注释声明对齐义务——弃，注释不是牙齿（本变更要修的正是注释与实现脱节的先例）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-explore-knowledge-graph
锚点：未记录
最近确认：16db850f0b8916acec0ecc26383b269a191fd0f3
理由：最大风险：旧项目无 knowledge graph 能力（sillyspec < 3.33 未装图命令）时 explore prompt 指引落空——agent 跑命令报 unknown subcommand 后自然回退 rg 考古（fail-soft，无阻断面）；后续 init 升级即补齐。接受：指引措辞是「优先」非「必须」。放弃的方案：把 graph 查询做成 explore 独立步骤（--wait 流程化）——弃，explore 的价值恰在无结构自由姿态，流程化会把思考伙伴变成向导机；在 CLI 侧为 explore 注入图预取数据（{GRAPH_FACTS} 占位符）——弃，探索话题不可预知，全量注入是浪费且复刻知识注入面已有的活。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-graph-dump-layout
锚点：未记录
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685
理由：最大风险：星系数=150（真图实测）比平台 design 初估 10-15 多——但这就是原型 comm() 的真实分组数（原型视觉即如此），不改算法（改了就不是原型视觉）；平台侧按 150 星系渲染。放弃的方案：①summary 细簇分组——否，883 簇主环 ~8900px 退化散点（Grill F-01）；②坐标落盘缓存——否，违反图不落盘铁律；③与原型逐位等价——降级为非约束（tie-break 稳序差异，确定性才是硬约束）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-brainstorm-impact-antirevival
锚点：未记录
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce
理由：最大风险：impact 闭包比 scopeRecall 宽（深度 2 + 传递例外 + change-modules 反查），模块域键在热区模块（如 core-engine）上可达条目多——回显前 5 条封顶沿用，但"无关 rejected 挤占席位"的噪音面变大。缓解：已回应不重弹过滤沿用（evidence 回应过即静默）；真实仓实测 9 条可达属合理密度；若实测噪音超标，收窄方向是把 impact 深度对 gate 场景降为 1 或按 impactKey 分组限额——留运行时证据再动。放弃的方案：拓 scopeRecall 吃模块键（模块→文件→决策两跳，丢失 change-modules/supersedes 可达面且要改检索器签名）；解析 --output 提取路径入键（违 D-004 自由文本纪律，弃）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-explore-arsenal-map
锚点：未记录
最近确认：61bf5923b9cb4e3826834ecfaceee0a09cb49622
理由：最大风险：映射行内塞多命令（关系面一行含 impact/neighbors/path/summary 四命令）信息密度高——单行过长可能被 agent 扫读跳过。缓解：行内用顿号分层（主命令 impact 打头、推理链与健康度退居从句）；钉子测试锚串保证四命令不丢。旧版 CLI（<3.33）项目跑新兵器命令报 unknown subcommand 自然回退 rg（fail-soft，与 graph 兵器同款既裁边界）。放弃的方案：兵器逐条加操作项（search/status 各一项）——弃，清单会回到 9 项且场景与兵器割裂；CLI 侧预取注入（{ARSENAL_FACTS} 类占位符）——弃，探索话题不可预知，全量预取浪费且复刻知识注入面。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-archive-integrity-thin-aware
锚点：未记录
最近确认：2edde8bd4addf24e870503ff287d587447203d68
理由：最大风险：epoch 豁免面过宽——若有人在 2026-10-07 前的 thin 归档里真留了未完成工作，本检查不再点名（归档完成门在 flow done 六子步当时已判，事后无法区分占位稿与漏勾）。接受理由：v3 前勾选不是完成契约（无机械区分依据），误报 36 份 vs 漏检理论值的代价权衡明确；新账（epoch 后）照常严查。次风险：批量入账 42 条若混入真欠账——逐条按五类理由归类（每类有形态证据：quick 通道产物有 decisions+delta 无 flow-state、spike 仅 proposal.md 等），且账本条目带 exempted_at 可追溯，stale 条目 doctor 会提示清理。放弃的方案：簿记补勾 36 份 pre-epoch thin（伪造完成态，违 2026-09-17 裁决）；全部走账本不修检查（172 份系统性误报逐条入账是拿账本抹平检查缺陷，且未来 thin 归档持续新增误报）；只修检查不入账（42 份真历史形态继续亮红，advisory 狼来了）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-graph-docrefs-noise
锚点：未记录
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04
理由：最大风险：跨仓豁免把"真失效的跨仓引用"也隐掉（文档引用了平台仓某文件而该文件确已被删）——本仓无法核验独立仓文件系统，豁免是诚实的能力边界而非判断。缓解：crossRepo 计数仍注记（2446 条），平台仓侧若有同类检查可对账。次风险：64 个空 changelog 索引若模块实际有变更史（散在卡内「变更历史」节），空表欠信息——头部注明来源指引，后续 split-changelog 迁移时补。放弃的方案：裸名 basename 唯一消解连边（304/438 多义，盲连错边比不连更糟）；逐条修 1439 条文档引用（96% 是伪影，修秤优先于迁就坏秤）；为 13 条真欠账伪造占位文件（篡改交付语义，点名留人工判才对）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-zcode-skills-sentinel-shorthand
锚点：未记录
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67
理由：最大风险：展开正则过宽把非任务数字串（如版本号 task-013、task-010）误切放大证据面——以尾数前瞻 `(?!\d)` + 组内逐段 `\d{1,2}` 双约束锁边，测试③钉住。试过但放弃：在 flow.js 内联一份连写展开正则（放弃理由——与哨兵判定口径分叉，正是本坑复发的温床；收敛为 sentinel-assertions.js 单一导出、两处共用）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-release-3-32-2
锚点：未记录
最近确认：00d055829104a462706e76c956221b7f38cbb8bb
理由：最大风险：publish 与 push 顺序——3.32.1 实证先 publish 后 push 的窗口内 registry 与 origin 短暂不一致（可接受：包内容同树，安装者拿到的代码一致）；npm 2FA/令牌失效会阻断 publish（届时停下向用户报错，不假绿）。试过但放弃：无——发版路径完全镜像既有 3.32.1 惯例，无新方案尝试。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-fourpiece-created-at-local
锚点：未记录
最近确认：ba0b5d1bf243b717af3a8ac13de70afa5a799d9a
理由：最大风险：存量已写 UTC 的 `created_at` 不自愈（如 2026-10-09-workspace-init-skill-gate 的 requirements/proposal 02:04:06），时间线对旧变更仍显示旧错值——接受：历史工件不改写，变更事实以 watcher 事件流为准，新变更起生效。试过放弃：①读取端按 UTC 解析无时区裸形状——无法区分「本地墙钟约定值」与「UTC 误写值」，猜错方向比不猜更糟；②created_at 显式带时区偏移（+08:00）——与 datetime.js 立的「YYYY-MM-DD HH:mm:ss 形状」约定冲突，牵动 CLI/平台全部读取面，超出本修范围。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-module-card-updated-at-iso
锚点：未记录
最近确认：7cbdba1009a347093ab7be9d7d4309b86acd2c57
理由：最大风险：存量卡旧式戳（+08:00 标称、瞬间失真 8h）不迁移，基于 updated_at 做瞬间比较的下游（如 worktree-guard 对 scan 文档的手工编辑检测——它读的是 scan 文档不是模块卡）对旧卡仍是失真值——接受：worktree-guard 不消费模块卡 updated_at；模块卡 updated_at 当前无瞬间比较消费方，纯展示/溯源。试过放弃：①nowWallClock 本地墙钟裸形状——与人读 created_at 口径混同，且丢机器可比性（Date.parse 按本地解释，跨机歧义）；②本地时刻 + 真实机器偏移（如 +08:00 动态计算）——格式正确但需偏移计算逻辑，收益仅显示本地化，全量 Z + 展示端本地化是更简约定。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-close-trace-single-set
锚点：未记录
最近确认：e0a193430426463421f1973427882ae2fe0ebefb
理由：最大风险：读侧兼容链遗漏某个旧形态消费点导致回放退化（如 --file 切片漏了旧 heavy 形态）——对策：三类存量形态各自钉兼容测试 + 收口全量回归（732 文件全绿）。放弃方案①（scope-audit 命名幸存）：CLI 5 个模块 + 平台 3 处读取 + 约 14 个测试文件全要改名换路径，改动面大一圈，无对应收益。放弃方案②（一次性迁移存量 247 归档）：重写历史冻结记录风险高，且平台镜像服务其他仓的旧归档不受本仓迁移控制，回退链反正删不掉——用户已确认不动存量。放弃方案③（全新命名 close-trace.*）：所有读方（含平台）全部改名，存量归档 100% 走回退链，纯增 churn。

## D-001@v1 方案架构——单变更四 Wave（brainstorm step4 裁决存档）
状态：implemented
变更：2026-10-09-verify-reuse-friction
锚点：未记录
最近确认：84407be4
理由：单变更 2026-10-09-verify-reuse-friction 分四 Wave（W1 快照口径死循环+可见性 / W2 指纹树键化+观测 / W3 便宜门前移 / W4 跨仓 per-repo）。evidence：multi-agent-platform 2026-10-09 tombstone 取证（.runtime 质量扫描记录 usedSnapshot=false + 13 份 test-result + sqlite 会话命令时间线交叉归因，四机制实证独立可并行修）。放弃方案：A 五变更拆分（流程开销×5，gates.js/verify-quality-scan.js 共触文件串行依赖强）；C 只修两大头（与用户拍板的全清单不符）。

## D-002@v1 复用指纹的代码面分量=代码树内容键（git ls-tree 过滤哈希），非 HEAD、非最近触码提交
状态：implemented
变更：2026-10-09-verify-reuse-friction
锚点：未记录
最近确认：84407be4
理由：HEAD 换 `git ls-tree -r HEAD` 按既有非代码路径口径过滤后的内容哈希；整树 oid 相同走快路径沿用上次键。纯文档提交不击穿、代码提交必击穿；git 原生对象哈希天然内容寻址，无语言/框架枚举（红线合规）。evidence：本案 13:35-14:10 五笔提交（多为纯文档）每笔击穿两类缓存实证；13:31-13:33 纯文档未提交态秒过对照。放弃方案：最近触码提交（git log 对 revert/merge/cherry-pick 语义不可靠）；mtime（非 git 事实、跨平台不可靠）；整树 oid 直接作键（文档提交也变树 oid，治不了本病——只能当快路径缓存用）。

## D-003@v1 快照口径复用闸比对「实际口径」——先建快照后判复用
状态：implemented
变更：2026-10-09-verify-reuse-friction
锚点：未记录
最近确认：84407be4
理由：executeVerifyQualityScan 把 shouldReuseLastPassedScan 移到快照创建之后，plannedSnapshot 参数改 actualScope=Boolean(snap)。连续失败（false==false）收敛命中；口径真实切换仍失配。evidence：本案记录 usedSnapshot=false × planned=true 恒失配 → 4 轮 × 3.5min 纯浪费实证。放弃方案：快照可行性探测预判（探测与真建两套口径会再分叉）；删掉口径守卫（主仓/快照口径混用会吞真实代码差异——防作弊语义不能丢）。

## D-004@v1 门序前移的安全边界——只移纯事实门，实测依赖门不动
状态：implemented
变更：2026-10-09-verify-reuse-friction
锚点：未记录
最近确认：84407be4
理由：仅 required-evidence 与 target_files 对账两门（纯 git/文档事实）前移到实测门前并入 R16 聚合；PASS 封顶/parity/超时降档等消费实测结果的门不动。evidence：本案 13:33 与 14:00-14:10 每轮先付 3.5 分钟实测再被对账门拦实证；两门调用链已核对无实测数据依赖。风险护栏：执行期调用链复核，发现隐藏依赖即回退该门原位记录在案。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-verify-papercuts
锚点：未记录
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4
理由：最大风险：②的段携载把 stale 人工面带进新骨架——沿 refreshProbeSections 既定安全方向（宁可少刷新不误删），stale 行追加段尾留 agent 裁决，gate 一致性抽查独立把关。放弃的方案：①按空白截断（script 名合法字符外还有大量 Unicode，白名单比黑名单稳定）；③无锚 blanket 20 提交全入窗（他变更文件污染窗口，必须消息锚定）；②只备份不携载（现状——找回回填来回比携载贵，当日实证）。

## D-001@v1 写侧供料——死路走 rejected 通道的指令落点
状态：implemented
变更：2026-10-09-rejected-write-side
锚点：src/stages/brainstorm.js:223
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：产生侧指令（brainstorm 提出方案步+对账步）与收割面底稿定性（flow 收割提示行+skill 指引）四个落点；机器收割器、蒸馏器、needsWait 闸原样不动——语义归 agent、机械转写归收割器、闸门已有只缺指令

## D-002@v1 收割器机器自动拆 rejected 条目
状态：rejected
变更：2026-10-09-rejected-write-side
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——拆条留在 agent 侧（D-001 路线）
否决理由：收割器是纯机械转写器，判不了「放弃方案」分界；槽4 模板问题文本每变更一字不差，照抄进条目零检索价值
复潮条件：槽4 作答先结构化（如模板化字段）使「放弃方案」出现可稳定解析的机械判据时可复潮

## D-003@v1 distill 侧从 confirmed 散文解析死路自动拆条
状态：rejected
变更：2026-10-09-rejected-write-side
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——语义判断后移到无 LLM 的层是更差的位置
否决理由：把语义判断后移到无 LLM 的纯函数层，散文「放弃方案①②③」形态解析脆弱，误拆漏拆都无兜底
复潮条件：decisions.md 作答全面结构化后（拆条在写侧完成成为前提），蒸馏层才有机械判据——彼时本方案反而无必要

## D-004@v1 只修厚道不动轻量道
状态：rejected
变更：2026-10-09-rejected-write-side
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——两道同修
否决理由：两道死路埋法同构（轻量收割模板必然埋散文），只修一半防复潮覆盖减半且 agent 行为指引不一致
复潮条件：轻量道废弃或槽4 收割机制下线时本裁定点自然消失

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-release-3-32-3
锚点：未记录
最近确认：308772b24b892fe6d8dc028af0bba46b60902a74
理由：最大风险：npm publish 凭证/2FA 环节失败（本地 npmrc 有 always-auth 告警配置）——失败则重试或转用户处理，版本面提交与推送不受影响可先行落定。放弃方案①：发 3.32.4（用户口头版本号）——线上 latest 实为 3.32.2，跳 3.32.3 违反用户自己给的准绳「最小版本加一」，选 3.32.3 并在交付说明中向用户说明差异。放弃方案②：npm version patch 自动提交——自动提交不走本仓显式 pathspec 纪律，手工两文件编辑+显式清单提交。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-brainstorm-skill-title
锚点：未记录
最近确认：730426594a32383ad7ab53f6d4f8e7e7c542f3ca
理由：最大风险：指引与 CLI 实际提取规则不一致（如 agent 误以为 brainstorm 另有 --title 参数）。对策：文案锚定真实机制（H1 前缀剥除后取简述），并保留 design.md 固定格式 `# 设计文档（Design）— <简述>` 的既有 CLI 强制要求不重复改写。放弃方案：改 src/stages/brainstorm.js 的 step prompt 同步加字数口径——用户诉求限定在 skill 层，CLI prompt 层不在本变更面（后续需要可另起变更）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-quick-refs-purge
锚点：未记录
最近确认：5fb2a6a94a3822711af676ffcfd0fd010ff6464d
理由：最大风险：测试计数漏改（command-cards.test.mjs 中 8/16/7 等硬编码计数分散在 5 处）——对策：逐处核对并在收口实测跑该文件。放弃方案：①连 src 存量收尾机制一并删除（src/stages/quick.js + run/command.js quick 分支 + doctor/quick-sessions 运行时清理）——升级前在途会话将失去 --done/--cancel 收尾通道，且牵动 docs/prompt 镜像再生成，属 CLI 功能级变更，超出「指引面清除」的用户诉求边界；②保留墓碑卡/注记做存量会话指路——用户明确否决（「仅存量收尾注记也不要，直接去掉」）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-cli-uninit-cwd-gate
锚点：未记录
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e
理由：最大风险：豁免清单漏项/多项——漏项误拦合法命令（agent 被 exit 2 打断），多项放走本该拦的命令（回到静默错答）。缓解：清单每项注释豁免依据，测试抽样锁定两侧（豁免面与非豁免面各一组断言），后续增删走清单单一真相源。次风险：重锚定改变个别命令对 cwd 的隐式依赖（相对路径参数按 cwd 解析的命令）——全量套件回归无此类失败，锚定提示行让差异可见。已试并放弃：① 判据用「cwd 本身含 .sillyspec」——拦掉设计支持的子目录运行（ancestorSpecDirs 注释明证），误伤面大；② 拦 init（已初始化目录禁 init）——重跑 init 是模板/skills 升级路径（AGENTS.md「重跑 init 同版本不更新」），拦截打断升级；③ 逐命令补「未初始化」检查——散点维护、报错时机晚且文案不一，正是要治的根因；④ 门内重写祖先遍历——丢 home/tmp/.runtime 守卫会复辟 2026-09-27-spec-sync-413 等已修复坑，改为复用 resolveSpecDir。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-init-full-injection
锚点：未记录
最近确认：ea9b0242d28e68b1eb7c5b070ee9b5c29a31326d
理由：最大风险：追加态受管块从 6 行变为全文（~45 行），升级整块替换时用户在块内编辑的改动会丢——标记已注明「勿手动编辑此段」，与原方案 R-04 同性质，只是受管面变大；块外用户内容仍字节保留。放弃方案：①继续小段追加（用户否决——agent 拿不到流程规则，注入形同虚设）；②gemini/opencode 改 @AGENTS.md 指针（两家对 @ 导入语法支持未验证，2026-08-02 变更已留注，不在本变更扩面）。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-worktree-salvage-archive-aware
锚点：未记录
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d
理由：最大风险：归档副本存在但 worktree 副本更新（归档后子代理又向 worktree 写入的极端时序）——本设计以 archive 副本为权威静默跳过（warn 有计数与路径清单，人工可对账），不自动覆盖，避免把「更旧快照复活」换成「更新内容覆盖归档件」的对称事故。试过放弃的方案：① 调用方传 archived flag——五入口逐一接线，漏一处即复活，且 doctor 入口判定口径（worktree.js:1795）与打捞内判定会形成两套真相；② 归档态整树跳过——「两处均缺」的真独有产物会随清理蒸发，违背打捞初衷（坑 worktree-spec-artifact-misplace）；③ 内容比对 archive 副本差异列入冲突清单——事故场景 13 文件全部内容有差（旧快照 vs 终版），全列纯噪音。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-drift-review-governance-keep
锚点：未记录
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd
理由：最大风险：豁免边界被人当作后门——治理面等价保留后，理论上可把代码改动伪装进 `.sillyspec/**`（如改 `.sillyspec/docs/` 下的代码生成模板影响行为）。缓解：该面本就是治理面（冻结件既有口径），评审任务书材料含工作区实态核对指引；风险敞口与既有「裸提交不触发漂移」的保守留白同级，可接受。试过放弃的方案：① 按「评审 verdict=PASS 才豁免」加限定——FAIL 评审本就未消费、隔离无损失，加限定徒增状态耦合，放弃；② 承诺面措辞级修改（P2 文字修正）也豁免——工具无法廉价区分措辞与实质（改弱承诺），宁可多评一轮复审（前轮 findings 注入后成本已降），放弃；③ 自动重冻结后把新 patch 哈希回写进 review.json——评审员产物由工具改写破坏独立性留痕语义，放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-release-3-32-4
锚点：未记录
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6
理由：最大风险：钉扎 IP 失效或 DoH 通道本身也被劫持（阿里 DoH 已沦陷，腾讯 DoH 是当前唯一可信通道）——IP 直连腾讯 DoH 端点（1.12.12.12）不依赖被劫持的域名解析，通道存活由发布前预核验（钉扎 npm view 返回真实 latest=3.32.3）先行证明：预核验失败即停，不带病发布。试过放弃的方案：① 改 hosts 文件钉扎——动系统配置，污染面大于进程级注入，放弃；② 用未钉扎 npm view 的结果做核验——劫持环境下数据不可信（本次实测返回污染值 3.32.2），放弃；③ 跳过核验直接发布——违背 3.32.2/3.32.3 惯例（latest 双核验是发布 FR），放弃。

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-dyn-subset-nontest-runner-face
锚点：未记录
最近确认：58257512ae9f8a51f1ef0636897351b3ea7f8356
理由：最大风险：预填面收紧的漏检边界——连字形态 `foo_test.js`（无 `.test.` 点锚）不再预填。取向与 isTestFileName 注释一致（宁紧勿松：漏检落 agent 手查是 fail-visible，误判产生脏绑定+假败是 fail-hidden 更糟）；js 生态主流形态是 `.test.`/`.spec.`，连字形态罕见，且执行侧权威口径本就不认它（预填了也进不了执行批）。放弃的方案：a) 在 `collectFrLinkedTests` 读侧直接过滤非测试路径——绑定语义是「FR 覆盖证据」不限测试文件（capability 证据可以是源码/文档），读侧过滤会让合法证据绑定静默失效，改在执行侧拦「当测试跑」这一步；b) node --test 批加 `--experimental-strip-types` 类运行参数迁就 TS 源码——治标且方向反了（源码本就不该进测试执行面，`./config.js` 类 ESM 后缀映射在裸 node 下无解）。

## D-001@v1 跨仓 worktree 落位按仓可配置（worktree.crossPlacement + 落位注册表）
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
锚点：src/worktree-cross.js:crossWorktreePath
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：local.yaml 新增 `worktree.crossPlacement.<repoKey>: <目录>`，落位该目录下 `<change>--<repoKey>`；注册表 cross-placements.json 保 list/cleanup 可发现性；WSL 分裂（repoRoot 在 /mnt/<盘>/ 而 worktree 不在）时 advisory 警告并给配置指引。
故障面：注册表并发整文件覆盖丢键（读-合并-写缓解，丢失后果=降级旧扫描行为）；placement 目录被外部清理后注册表残留条目（读取方按 meta 不可读不入列降级，重跑 cleanup 删键回收——评审吸收②）
退役判据：git 原生支持 per-worktree 可达性检测或跨仓 worktree 落位改为仓内默认时，注册表与配置键可简化删除

## D-002@v1 maven/gradle 默认供给命令改 null（根供给 n/a）
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
锚点：src/worktree-deps.js:ECOSYSTEMS
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：两表项 install 改 null；JVM 系依赖在用户级仓库（~/.m2 / ~/.gradle），worktree 内无本地产物可供给，根供给诚实落 n/a（门控放行集含 n/a）；freshness 的 stale/main-drift 仍以 pom.xml/build.gradle hash 为基准（marker=null 语义不变）。
故障面：冷 ~/.m2 环境下依赖缺失不再于供给期暴露，推迟到构建期（task 级编译验证兜底）
退役判据：maven/gradle 出现标准化的项目内依赖物（如 mvnd 本地仓库配额）时重估

## D-003@v1 跨仓主副本直写检测走 apply 时点对账（advisory），hook 实时拦截记非目标
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
锚点：src/worktree-apply.js:applyCrossRepoWorktrees
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：applyCrossRepoWorktrees 对每个有 meta 的跨仓：主副本 baseHash..HEAD 有推进且推进文件集与该仓声明文件面（resolveApplyAllowSet 切片）交集非空 → warning 列证（commit 数/交集文件/核对决策留痕指引），不阻断；跨仓 .git marker + worktree-guard hook 实时拦截记非目标（SillyHub 实证环境无 sillyspec hook，拦截无效且侵入异仓）。
故障面：声明面不全的变更交集恒空漏报（与 apply 既有清单校验治理面重合，接受）；worktree 目录被外部删除（meta 随目录消失无 baseHash 可锚）与 changedFiles 收集抛错分支不适用检测（评审吸收③）
退役判据：跨仓 hook 安装面成为现实约束（平台普遍装载 sillyspec hook）时升级为实时拦截

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-repo-inline-worktree-placement
锚点：未记录
最近确认：1afcd83db8d1680f0ca8146c043294ca9fdc1549
理由：最大风险：三处手写 YAML 解析（plan-postcheck 内核、guard parseSimpleYaml 产物消费、deps 内联 IIFE）对同一对象形态的解析漂移——缓解：内核 `_parseRepoEntries` 单一事实源 + 旁路两处各自的最小升级 + 三处都有形态级测试（场景 16/17、guard-cd 既有回归、sibling-repo 既有回归）。试过但放弃的方案：直接删除 worktree.crossPlacement（未发布、干净迁移）——上一变更刚归档发号 FR-setup-083~089（knowledge/fr 已入库），删除需 supersede 对账且破坏「归档件即事实」原则；保留兼容读面零成本（readCrossPlacementConfig 已存在），优先级内联 > legacy 平滑迁移。

## D-001@v1 跨仓 diff 正文收口冻结内嵌 change-patch.json（scopeAudit.repos[].patch）
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
锚点：src/scope-audit.js:reconcileCrossRepoPlan
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：收口时点（execute --done 与 flow done 两通道）按 repos[].anchor 窗口对每个已注册跨仓采集 diff 正文，内嵌 change-patch.json `scopeAudit.repos[].patch` + `patchSha256`（\n 归一 sha256）；不落独立文件族（方案 A，破单套两件纪律、读侧动面最大，记非目标）、不混单 change.patch（方案 C，git apply 必失效，否决）。
故障面：大 patch 使 JSON 体积膨胀（R-01，binary 折叠+文件面过滤缓解，v1 接受）；B/C 档字面 ref 窗口漂移（R-02，采集与窗口判定同步段完成，anchor.label 诚实标注）
退役判据：平台出现按仓 diff 独立展示/apply 需求时，升级方案 A 独立文件族（接口不锁死）

## D-002@v1 跨仓对账集成段收敛单一导出函数，轻量道接入真实三态
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
锚点：src/flow-parity.js:buildThinSnapshotRows
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：内联段抽导出 `reconcileCrossRepoPlan`（scope-audit.js），heavy 改调用行为等价、thin（flow.js done 路径）同源接入；复用 collectRepoActual 共享内核（2026-09-20「单一真相源」哲学延续），跨仓行升级真实三态，降级仓诚实 ⊘+degradedReason。
故障面：轻量道新增跨仓 git 调用拉长 flow done 时延（R-03，仅有跨仓声明触发 + GIT_TIMEOUT 兜底 + fail-soft 不阻断）
退役判据：跨仓对账内核升级（如 A 档锡点全量覆盖轻量道）时随内核自然演进，本函数仅组装层

## D-003@v1 patch 采集窗口与行数窗口同根同窗；顶级主仓投影面不动
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
锚点：src/scope-audit.js:computeFullFlowAudit
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：patch 窗口 = 行数采集窗口（A/B' 档锚 hash 为 baseRef；B 档 HEAD~1 窗口用字面 HEAD~1、C 档未提交窗口用字面 HEAD，工作树口径含 untracked 自拼 hunk——buildFrozenPatch 既有形态），「与行数同根同锚」契约延续到正文粒度；顶级 files[]/totals 保持主仓实改投影（projectTraceFaceRows 不动，既有单测钉住），全景走 scopeAudit.rows（全三态）+ scopeAudit.repos[]（锚点/计数/正文）——展示面由平台读 scopeAudit 承接，「沉淀资产面 vs 对账面」双层架构（2026-10-07-unify-close-trace）不破。
故障面：平台不读 scopeAudit.repos[] 时展示面仍只见主仓——本变更供数完整，展示承接是 SillyHub 侧一次读侧适配（跨仓协作边界，显式声明）
退役判据：顶级面与对账面双层架构被平台统一读法取代时重估

## D-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-cross-wt-repo-local-placement
锚点：未记录
最近确认：cb90e30eeb36c5ac9d5b9486ddd9c1a13191df15
理由：最大风险：R-01 跨仓仓的 .git 目录只读/异常导致 exclude 写失败（warn 降级，worktree 成 untracked 噪音——apply 清单校验兜底，不阻断）；R-02 仓内 .sillyspec 目录会被用户的 IDE 全局搜索/索引扫到重复内容（主仓同形态用户已习惯，execute 期临时存在、cleanup 即删）；R-03 候选寻址的探测顺序依赖注册表权威性——注册表条目指向已亡目录而旧公式处恰有他者残留 meta 时会误命中（注册表写读同链路维护，残留面与 sweep 治理重合）。 试过但放弃的方案：自动兄弟目录（<path> 旁猜一个 sillyspec-worktrees）——向用户仓外未知位置写目录侵入性大且名字无约定，仓内受控命名空间（.sillyspec/）语义更干净；删除旧公式兜底（注册表已够）——存量 worktree（升级前的变更收口中断态）会失联，兼容成本为零则不做断崖。
