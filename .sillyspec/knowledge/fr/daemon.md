## FR-daemon-001 daemon 上报 session ready（fresh + recover）
变更：2026-08-10-inject-wait-session-ready
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-inject-wait-session-ready/requirements.md#FR-01
最近确认：287cc9dbd

## FR-daemon-002 backend 接收 ready + 内存管理
变更：2026-08-10-inject-wait-session-ready
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-inject-wait-session-ready/requirements.md#FR-02
最近确认：287cc9dbd

## FR-daemon-003 backend inject 等 ready
变更：2026-08-10-inject-wait-session-ready
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-inject-wait-session-ready/requirements.md#FR-03
最近确认：287cc9dbd

## FR-daemon-004 生命周期与边界
变更：2026-08-10-inject-wait-session-ready
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-inject-wait-session-ready/requirements.md#FR-04
最近确认：287cc9dbd

## FR-daemon-005 测试
变更：2026-08-10-inject-wait-session-ready
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-inject-wait-session-ready/requirements.md#FR-05
最近确认：287cc9dbd

## FR-daemon-006 worker/主会话分流挂起
变更：2026-08-29-batch-session-inherit
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given daemon 停止或掉线，该 daemon 名下有 active 会话 主会话（无 parent）被挂起；When suspend_sessions_for_daemon 或 session_offline_sweep_once 执行 daemon 回来；Then **worker 子会话**（parent_session_id 非空）→ session failed(error_code=daemon_interrupt
全文：.sillyspec/changes/archive/2026-08-29-batch-session-inherit/requirements.md#FR-01
最近确认：023352ce0

## FR-daemon-007 worker 自动重派
变更：2026-08-29-batch-session-inherit
状态：active
摘要：默认场景
依据决策：D-001@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given worker 子会话被分流标 failed 同一 worker attempt>=3 重派 dispatch 失败（无在线 daemon 等）；When 挂起事务提交后 挂起再次触发；Then 异步触发重派：从 AgentSession 行重建 dispatch 上下文（provider/model/workspace_id/worktree_bran
全文：.sillyspec/changes/archive/2026-08-29-batch-session-inherit/requirements.md#FR-02
最近确认：023352ce0

## FR-daemon-008 daemon 消费 resume 续会话
变更：2026-08-29-batch-session-inherit
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given worker lease 被 claim 且 payload 含 resume_session_id payload 不含 resume_session_id（；When daemon _startInteractiveSession 执行；Then SessionManager.create 传 resume key → SDK --resume 续会话（历史延续；等 inject 才跑新 turn——对齐
全文：.sillyspec/changes/archive/2026-08-29-batch-session-inherit/requirements.md#FR-03
最近确认：023352ce0

## FR-daemon-009 resume 失败自动降级
变更：2026-08-29-batch-session-inherit
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given create 带 resume key 后 SDK 启动报 session 损伤（session not found/no conversation/unabl；When daemon 检测命中；Then 清 resume key 重建 fresh 会话一次 + 事件上报 resume_downgraded（终态 metadata 备查）；再失败→普通 creat
全文：.sillyspec/changes/archive/2026-08-29-batch-session-inherit/requirements.md#FR-04
最近确认：023352ce0

## FR-daemon-010 claim 白名单 interactive 补透传
变更：2026-08-29-batch-session-inherit
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given lease metadata 含 resume_session_id 且 lease kind=interactive；When build_claim_payload 走 interactive 分支；Then payload 透传 resume_session_id（当前仅 batch 分支透传——Grill C-02 修复点）
全文：.sillyspec/changes/archive/2026-08-29-batch-session-inherit/requirements.md#FR-05
最近确认：023352ce0

## FR-daemon-011 升级空闲屏障
变更：2026-08-29-daemon-selfupdate-safety
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given daemon 收到 SELF_UPDATE 指令或探测到磁盘版本变更 推迟期间触发重发 升级链执行中（下载完成、stop 之前）；When 存在「进行中」工作（在跑 interactive 轮次 status==='running'，或在跑 batch lease _controllers 非空；空；Then 推迟升级：记录 pending（reason+目标+当前版本）+30s 后重探（无限等，每轮从零重跑 tryUpdate），不打断任何进行中工作 仅刷新目标版本
全文：.sillyspec/changes/archive/2026-08-29-daemon-selfupdate-safety/requirements.md#FR-01
最近确认：d7003af10

## FR-daemon-012 更新所有权与失败恢复
变更：2026-08-29-daemon-selfupdate-safety
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given tryUpdate 被触发（指令/探测/复查） 一切非「交接排定」路径（noop/下载失败/异常/终检回推迟） respawn 拉起失败；When 已有更新在途；Then 本次忽略并记日志（JS 单线程原子占位） 释放所有权+清 pending 文件；下一条 SELF_UPDATE 指令可再触发 进程已 stop 停摆保活（不退出
全文：.sillyspec/changes/archive/2026-08-29-daemon-selfupdate-safety/requirements.md#FR-02
最近确认：d7003af10

## FR-daemon-013 磁盘旁路探测
变更：2026-08-29-daemon-selfupdate-safety
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given bundle 文件被外部替换/降级（BUILD_ID 与内存不同） 探测失败（读文件失败/正则不中/任一侧为空）或 dev 构建；When self_reload_check_interval_sec（默认 600，0=关闭）周期探测（读文件正则提取 BUILD_ID，与 respawn 加载同一文；Then 触发 tryUpdate('disk_change')——走独立直启路径：不下载不查 manifest，空闲即 stop+respawn 到盘上版本（操作者换文
全文：.sillyspec/changes/archive/2026-08-29-daemon-selfupdate-safety/requirements.md#FR-03
最近确认：d7003af10

## FR-daemon-014 backend 透传
变更：2026-08-29-daemon-selfupdate-safety
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given daemon 心跳携带 pending_update {reason, current_version, target_version} 心跳无该字段 机器视图；When backend 心跳端点处理；Then upsert daemon_instances.pending_update（JSON nullable）；同内容 upsert 保留原 since，首次盖 n
全文：.sillyspec/changes/archive/2026-08-29-daemon-selfupdate-safety/requirements.md#FR-04
最近确认：d7003af10

## FR-daemon-015 前端展示
变更：2026-08-29-daemon-selfupdate-safety
状态：active
摘要：默认场景
依据决策：D-003@v2、D-004@v1
场景正文：
- 场景：默认场景 — Given 机器卡渲染且 pending_update 非空 升级完成（pending_update 清 NULL）；When reason==='server_command' reason==='disk_change'；Then warning 横幅「等待空闲后自动升级（每 30s 复查）」+副行（原因+版本对比）；「升级 daemon」按钮禁用 info 横幅「检测到程序文件已变更，等
全文：.sillyspec/changes/archive/2026-08-29-daemon-selfupdate-safety/requirements.md#FR-05
最近确认：d7003af10

## FR-daemon-016 daemon 活性推导器（tailer + deriver 注册表）
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — When tailer 周期（10s）对每路径 offset 差量续读尾部 本轮推导 下一周期 周期执行；Then 经 format→deriver 注册表推导出 5 态之一 + 证据摘要（zcode：completedAt 新鲜/toolCalls 未配对→working；
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-01
最近确认：4e01d1d44

## FR-daemon-017 daemon 自发现通道（双源汇聚）
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given daemon spawn 记录 / sessions.json 重启恢复 / 15min 窗口重扫兜底（三层数据源） 守卫铁律 R-01；When 定位会话日志（claude/pi 直算路径先行；codex/zcode 窄扫+标记匹配） 无日志正向等待人类证据；Then 与 SillySpec 登记源按 (workspace, log_path) 汇聚去重进 watch list；裸 agent 会话（全程不调 sillyspe
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-02
最近确认：4e01d1d44

## FR-daemon-018 backend 状态落库与上报端点
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 鉴权通道（与 /api/agent-logs 同分流规则）；When POST /api/agent-logs/states 批量上报 (log_path, state, evidence, derived_at, last_ev；Then platform_agent_logs 行 upsert（state/state_derived_at/state_evidence/last_event_at
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-03
最近确认：4e01d1d44

## FR-daemon-019 blocked 主动通知（第一方事件汇聚 + E-01 门控）
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 会话进入 blocked（主源=第一方 PERMISSION_REQUEST 事件，D-012 优先级；日志推导仅裸 claude CLI 候选） E-01 实；When blocked 持续 ≥120s 未消解 证伪；Then Notification type=agent_blocked（dedupe_key=(session, blocked 段序号) 同段只发一次；站内 + Re
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-04
最近确认：4e01d1d44

## FR-daemon-020 前端展示（D-004@v1 两层）
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 会话列表 / 工作台首页 / 会话详情 agent 日志面板；When 状态四字段可用（api-types 经 pnpm gen:types 重新生成）；Then ①会话列表每行行尾 ~18px 状态小灯（五态色 + 工作/阻塞呼吸闪烁，不新增列不改布局），悬停弹小卡（状态全名/静默时长=now-last_event_at
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-05
最近确认：4e01d1d44

## FR-daemon-021 编排知情决策（P1e）
变更：2026-09-07-agent-liveness-states
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given worker 处于 running 派发模板（sillyspec 仓）决策规则；When 编排 agent 轮询 list_workers worker blocked 超阈值 / working 久无终态；Then 返回值附 liveness{state, evidence, derived_at}（daemon 推导经 mission 状态链路汇入；链路过重时降级为 ba
全文：.sillyspec/changes/archive/2026-09-07-agent-liveness-states/requirements.md#FR-06
最近确认：4e01d1d44

## FR-daemon-022 历史会话对话化回看（恒读库）
变更：2026-09-10-zcode-session-sqlite-read
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 上报条目 format=zcode-model-io-jsonl，其 rollout 文件已被清理、会话存在于 zcode 本地 SQLite 会话含系统注入消；When 用户打开该会话的对话化视图（messages 端点） 归一化遍历 message 归一化 归一化；Then 完整渲染对话段（user_input/reply/thinking/tool_use/tool_result），不报"文件不存在" 该条 message 整体跳
全文：.sillyspec/changes/archive/2026-09-10-zcode-session-sqlite-read/requirements.md#FR-01
最近确认：48240b713

## FR-daemon-023 原文视图从库合成（不截断）
变更：2026-09-10-zcode-session-sqlite-read
状态：active
摘要：默认场景
依据决策：D-002@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given zcode 条目（无论文件在否） messages RPC 非 parsed 或抛错（not_found / method_not_found 老 daemon；When 用户打开原文视图（content 端点） content 端点处理；Then 后端先调 messages RPC，status=parsed 时返回九字段伪 jsonl（seq/kind/text/tool_name/tool_use_i
全文：.sillyspec/changes/archive/2026-09-10-zcode-session-sqlite-read/requirements.md#FR-02
最近确认：48240b713

## FR-daemon-024 库读失败文件兜底
变更：2026-09-10-zcode-session-sqlite-read
状态：active
摘要：默认场景
依据决策：D-001@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given format=zcode 且 SQLite 读取失败（node:sqlite 不可用 / 库文件缺失 / 会话不在库 / 查询异常） 请求 path 越出 al；When messages RPC 处理 readAgentLogMessages 处理；Then 回落现有文件路径（lstat + parse-zcode-model-io）：文件在=正常解析成功；文件也缺=按现状 not_found 错误语义 assert
全文：.sillyspec/changes/archive/2026-09-10-zcode-session-sqlite-read/requirements.md#FR-03
最近确认：48240b713

## FR-daemon-025 零改动面
变更：2026-09-10-zcode-session-sqlite-read
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given claude / codex 条目 beforeSeq 翻页请求（「加载更早」）；When 任一读取端点处理 zcode 会话对话化视图；Then 分派路径与现状逐字节一致（不走 SQLite 分支） 窗口切片语义与文件 parser 对齐，翻页正常
全文：.sillyspec/changes/archive/2026-09-10-zcode-session-sqlite-read/requirements.md#FR-04
最近确认：48240b713

## FR-daemon-026 caps 第 12 键 compact
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ProviderCaps 单源加 compact 键（claude/pi/codex=true、cursor=false、未知回退 false）；When gen 脚本三端生成 + 双守护测试同步；Then 新引擎漏声明即 satisfies 编译红 + 守护测试红；前端按钮门控与 backend 端点校验有真数据源
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-01
最近确认：1aacbb3d9

## FR-daemon-027 统一端点双分路
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given POST /api/daemon/sessions/{id}/compact（归属+caps+状态三校验）；When claude → 复用 inject 服务发 "/compact"（建 run；DaemonSessionTurnConflict 捕获映射 error）；Then 响应含 run_id/queued；When pi/codex → ws_hub.send_rpc('session_compact', timeout=15)
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-02
最近确认：1aacbb3d9

## FR-daemon-028 claude 分路
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given caps.compact=true 且会话空闲；When 用户点压缩；Then inject 通道下发 /compact 文本，SDK 处理 slash，压缩轮作为正常 turn 收敛并在会话流可见；daemon 零改动
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-03
最近确认：1aacbb3d9

## FR-daemon-029 pi 分路
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given session_compact RPC 到达 daemon；When session-manager 守卫通过后 PiRpcDriver.compact() 发 {"type":"compact"} 等 response；Then 回执 tokensBefore/estimatedTokensAfter 进 CompactResult → RPC result → 端点响应 → 前端通知带
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-04
最近确认：1aacbb3d9

## FR-daemon-030 codex 分路
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 同 FR-04；When CodexAppServerDriver.compact() 经新 id→pending 机制发 thread/compact/start {threadId}；Then 受理（空响应）→ ok=true 无数字；超时/错误如实回传
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-05
最近确认：1aacbb3d9

## FR-daemon-031 前端按钮
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 环浮层提供 onCompact 且 caps.compact=true；When turn running → 按钮禁用（tooltip 轮运行中）；预会话不渲染；cursor 引擎不渲染 点击 → compactSession() 调端点；Then 三分型成功通知（pi 数字/codex 受理/claude 已发送）或失败通知带 error 原文
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-06
最近确认：1aacbb3d9

## FR-daemon-032 结果呈现
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 压缩完成回执在端点响应中；Then 前端通知呈现；claude 流可见性由 /compact 轮承载；环分子在压缩后下一次调用 usage 到达自然回落（零改动链）
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-07
最近确认：1aacbb3d9

## FR-daemon-033 真机验证
变更：2026-09-14-session-ctx-compact
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本机三引擎会话各一轮压缩；Then pi 通知带数字、claude 会话流出现压缩轮、codex 受理通知；三引擎下一轮环回落；R-01/02/03 风险点各有真机结论
全文：.sillyspec/changes/archive/2026-09-14-session-ctx-compact/requirements.md#FR-08
最近确认：1aacbb3d9

## FR-unmapped-122 多 Agent 二进制检测
变更：2026-06-09-daemon-agent-detection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本地安装了 claude、codex、cursor 等 agent CLI 环境变量 `SILLYHUB_CLAUDE_PATH` 设置为自定义路径；When daemon 启动并执行 agent 检测 daemon 检测 claude agent；Then 所有在 PATH 中可找到的 agent 都被识别，返回名称、路径、版本 使用环境变量指定的路径而非 PATH 查找
全文：.sillyspec/changes/archive/2026-06-09-daemon-agent-detection/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-123 版本校验
变更：2026-06-09-daemon-agent-detection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本地 claude 版本为 1.9.0（低于 2.0.0 最低要求） 本地 codex 版本为 0.200.0（高于 0.100.0 最低要求）；When daemon 检测并校验版本 daemon 检测并校验版本；Then 该 agent 被标记为可用但版本不合规，注册时上报版本警告 该 agent 正常通过版本校验
全文：.sillyspec/changes/archive/2026-06-09-daemon-agent-detection/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-124 多 Runtime 注册
变更：2026-06-09-daemon-agent-detection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本地检测到 claude、codex、cursor 三种 agent；When daemon 向服务器注册；Then 服务器创建 3 条 daemon_runtime 记录，provider 分别为 "claude"、"codex"、"cursor"
全文：.sillyspec/changes/archive/2026-06-09-daemon-agent-detection/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-125 执行协议分类
变更：2026-06-09-daemon-agent-detection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任务分配给 provider="claude" 的 runtime 任务分配给 provider="codex" 的 runtime 任务分配给 provide；When TaskRunner 执行任务 TaskRunner 执行任务 TaskRunner 执行任务；Then 使用 stream-json 协议解析输出 使用 JSON-RPC 2.0 协议通信 直接读取 stdout 纯文本
全文：.sillyspec/changes/archive/2026-06-09-daemon-agent-detection/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-126 前端展示
变更：2026-06-09-daemon-agent-detection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 服务器上注册了多个 daemon runtime；When 用户访问 /runtimes 页面；Then 表格中显示每个 runtime 的 provider 类型和版本
全文：.sillyspec/changes/archive/2026-06-09-daemon-agent-detection/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-149 协议抽象层（方案B 核心）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 12 种 agent provider 各自有不同的 stdout 协议（stream_json / json_rpc / jsonl / ndjson / t；When TaskRunner 按 provider 取对应 `ProtocolAdapter` 开发者只新增一个 `ProtocolAdapter` 实现；Then adapter 的 `parse(line)` 将原始行转为统一 `AgentEvent`（text/tool_use/tool_result/error/co
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-01
最近确认：4a456728a

## FR-unmapped-150 provider → protocol 映射
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given provider 名称；When 调用 `getBackend(provider)`；Then 按 `PROTOCOL_PROVIDERS` 映射（stream_json:[claude,gemini,cursor] / json_rpc:[codex,h
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-02
最近确认：4a456728a

## FR-unmapped-151 通信契约对齐（G-02，P0）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given backend 的 `protocol.py` 定义的消息常量 WS 断线；When daemon 发送/接收 WS 消息 触发重连
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-03
最近确认：4a456728a

## FR-unmapped-152 lease 生命周期
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 收到 `task_available`；When 执行一次任务；Then 完整走通 `claim(拿 claim_token) → start → 流式 messages(submit) → complete(带 patch+stat
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-04
最近确认：4a456728a

## FR-unmapped-153 凭证管理（0600）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工具配置含 `{{USER_GITHUB_TOKEN}}` 占位符；When 渲染环境变量；Then 优先从 `~/.sillyhub/daemon/credentials.json` 取值，次取环境变量；凭证文件写入后权限为 `0600`（POSIX）。
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-05
最近确认：4a456728a

## FR-unmapped-154 workspace git mirror
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任务携带 repo_url + branch；When 准备工作区；Then 执行 git mirror / pull --ff-only，执行后 collect git diff 生成 patch + files_changed；Win
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-06
最近确认：4a456728a

## FR-unmapped-155 agent 检测（12 provider）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本机环境；When daemon 启动检测；Then 对 12 种 provider 按优先级（env 覆盖 → PATH 查找 → 标记不可用）探测，做 `--version` 与最低版本校验，每个检测到的 ag
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-07
最近确认：4a456728a

## FR-unmapped-156 stdin control_request 应答
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 子进程（如 stream_json/claude）通过 stdin 发出 control_request；When backend 等待批准；Then daemon 保持 stdin 开启并按策略应答（自动批准工具使用），避免子进程 hang。
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-08
最近确认：4a456728a

## FR-unmapped-157 CLI（commander）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在终端；When 执行 `start / stop / status / logs`；Then 与 Python 版（Click）命令名、配置项（--server/--token）、PID 文件、日志文件路径一致。
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-09
最近确认：4a456728a

## FR-unmapped-158 增量可交付（G-04）
变更：2026-06-14-2026-06-13-daemon-nodejs-rewrite
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任一 Wave 完成；When 验收；Then `tsc` 编译通过 + `vitest` 该 Wave 单测全绿即可推进，不依赖后续 Wave。
全文：.sillyspec/changes/archive/2026-06-14-2026-06-13-daemon-nodejs-rewrite/requirements.md#FR-10
最近确认：4a456728a

## FR-unmapped-267 卡片展示 token / 缓存 / 费用数字
变更：2026-06-24-runtime-usage-stats
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 某 runtime 在选定时间窗内有用量数据 该 runtime 无 cache 数据(如 codex)；When 用户打开运行时列表页 渲染缓存数字；Then 该 runtime 卡片显示「输入 / 输出 / 缓存 / 费用」4 个数字(token 用 k/M 格式化,费用 $USD) 显示「—」;无费用数据显示 $0
全文：.sillyspec/changes/archive/2026-06-24-runtime-usage-stats/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-268 cache 采集(daemon)
变更：2026-06-24-runtime-usage-stats
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — When stream-json 的 message_delta 携带 `event.usage.cache_creation_input_tokens` / `cach；Then daemon 累加并经 `usage_update` 透传到后端,写入 `AgentRun.cache_read_tokens` / `cache_creati
全文：.sillyspec/changes/archive/2026-06-24-runtime-usage-stats/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-269 批量聚合接口
变更：2026-06-24-runtime-usage-stats
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v2、D-004@v1
场景正文：
- 场景：默认场景 — Given 多个 runtime 存在归属它们的 agent_runs interactive run 同时挂 agent_session_id + lease_id wi；When `GET /api/daemon/runtimes/usage?window=7d` 聚合 返回 daily 返回 daily 聚合；Then 返回每个 runtime 的 `{summary: input/output/cache_read/cache_creation/cost, daily: [.
全文：.sillyspec/changes/archive/2026-06-24-runtime-usage-stats/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-270 时间窗折线图(sparkline)
变更：2026-06-24-runtime-usage-stats
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 卡片拿到某 runtime 的 daily 序列 某时间窗该 runtime 无数据；When 渲染 sparkline 渲染；Then 画输入(蓝)/ 输出(绿)双线;切换时间窗时折线随之更新 折线为空占位,数字显示「—」/0
全文：.sillyspec/changes/archive/2026-06-24-runtime-usage-stats/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-271 兼容与回退
变更：2026-06-24-runtime-usage-stats
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 老 daemon 不上报 cache / 历史数据 cache 列为 NULL；When 聚合查询；Then `SUM(COALESCE(...,0))` 忽略 NULL 不报错;现有 `/runtimes`、`/sessions` 端点行为不变
全文：.sillyspec/changes/archive/2026-06-24-runtime-usage-stats/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-284 daemon idle 自动回收默认禁用（D-001）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-1
最近确认：4337b8a51

## FR-unmapped-285 idle 逃生口保留（D-001）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-2
最近确认：4337b8a51

## FR-unmapped-286 scan 完成主动 end_session（D-002）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-3
最近确认：4337b8a51

## FR-unmapped-287 stage 完成主动 end_session（D-002）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-4
最近确认：4337b8a51

## FR-unmapped-288 多轮对话不自动 end（D-002@v1 边界）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-5
最近确认：4337b8a51

## FR-unmapped-289 完成驱动 end 失败不阻塞 lease（D-002@v1 容错）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-6
最近确认：4337b8a51

## FR-unmapped-290 手动终止链路保持不变（D-003）
变更：2026-06-25-2026-06-25-interactive-idle-timeout-fix
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-interactive-idle-timeout-fix/requirements.md#FR-7
最近确认：4337b8a51

## FR-unmapped-305 开启子代理 text/thinking 流出（Claude SDK）
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-001@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 主 agent 在 Claude interactive session 中调用 Task/Agent tool 派生子代理；When `ClaudeSdkDriver.start()` 设置 `options.forwardSubagentText = true`；Then 子代理的 text/thinking 作为带 `parent_tool_use_id` 的 assistant/user message 经主流 query g
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-306 子代理消息归属识别与原样透传
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-001@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given daemon consume 收到一条带 `parent_tool_use_id` 非空的 SDK message（assistant 或 user）；When `_onMessage` 处理并经 `onTurnMessage` 转发；Then msg 顶层保留 `parent_tool_use_id`/`subagent_type`/`task_description`（原样，不剥离），backend
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-307 partial buffer 按 parent_tool_use_id 分桶隔离
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 主 agent 与一个或多个子代理在同一 interactive session 并发产出 partial（streaming delta）；When `_bufferPartial` / `_clearPartialBufferSync` / `_flushPartial` / `_emitOverrideS；Then 各自按 `parentKey = parent_tool_use_id ?? 'main'` 独立分桶；子代理完整 assistant message 只清自己
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-308 agentSessionId 不被子代理 init 覆盖
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 主 session 已写入 `agentSessionId`（主 system/init 先到），随后子代理 system/init 到达；When `_onMessage` 处理子代理 system/init；Then 直接跳过（`parent_tool_use_id` 非空守卫 + 现有 `===undefined` 守卫），主 session resume key 不被覆盖
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-309 depth 维护与透传
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-007@v1
场景正文：
- 场景：默认场景 — Given `SessionState.subagentDepth: Map<tool_use_id, depth>`；When `_onMessage` 处理 assistant message（含 tool_use blocks）与子代理消息
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-310 agent_run_logs 加归属列 + migration
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given `agent_run_logs` 表（现有无归属列）；When 执行 alembic migration；Then 加 `parent_tool_use_id VARCHAR(200) NULL` / `subagent_type VARCHAR(100) NULL` / `
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-311 _extract_sdk_messages 每条注入归属 + 落库
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-008@v1
场景正文：
- 场景：默认场景 — Given backend 收到 daemon 透传的 SDK message（带 parent_tool_use_id/subagent_type/depth）；When `_extract_sdk_messages` 展开为 flat records 且 `submit_messages` 落库；Then **每条** flat record 都带 parent_tool_use_id/subagent_type/depth（非首条 stamp，D-008）；落库
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-07
最近确认：f7f73d86c

## FR-unmapped-312 前端徽标 + 深度渲染
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 前端收到带归属列的 `agent_run_logs` 行；When `agent-log-viewer` / `logsToTurns` 渲染；Then `subagent_type` 非空 → 行首渲染 `[子代理:<subagent_type>]` 徽标（中文）；`depth > 0` → 按 depth 缩
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-08
最近确认：f7f73d86c

## FR-unmapped-313 向后兼容
变更：2026-06-28-daemon-subagent-transcript
状态：active
摘要：默认场景
依据决策：D-004@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given 历史 `agent_run_logs` 行（归属列 NULL）或未升级 daemon 的旧路径（msg 无归属字段）；When 前端渲染；Then 按 main agent 渲染（parent=null/depth=NULL→0），行为与现状一致
全文：.sillyspec/changes/archive/2026-06-28-daemon-subagent-transcript/requirements.md#FR-09
最近确认：f7f73d86c

## FR-unmapped-323 daemon register 上报版本
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 启动并以 release 构建（DAEMON_VERSION=语义版本，BUILD_ID=git SHA） daemon 为 dev 构建（BUI；When daemon 调 POST /api/daemon/register register；Then 请求体含 `daemon_version`（语义版本）+ `daemon_build_id`（SHA） 请求体含 `daemon_version`，`daemo
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-01
最近确认：3849dbf33

## FR-unmapped-324 daemon heartbeat 上报版本
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 已注册且在线；When daemon 周期性调 heartbeat（HTTP 或 WS）；Then payload 含 `daemon_version` + `daemon_build_id`
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-02
最近确认：3849dbf33

## FR-unmapped-325 backend 持久化 daemon 版本
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given backend 收到带 daemon_version/daemon_build_id 的 register/heartbeat 收到旧 daemon 不带版本字；When service 处理 upsert daemon_instances upsert；Then daemon_instances.version = 语义版本，daemon_instances.build_id = SHA 被写入 version/buil
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-03
最近确认：3849dbf33

## FR-unmapped-326 backend DTO 返回 daemon 版本
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon_instances 已存 version/build_id；When 前端调 GET /api/daemon/runtimes/page 或 GET /api/daemon/instances；Then 响应每项含 daemon_version/daemon_build_id（runtime 行）或 version/build_id（instance 行）
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-04
最近确认：3849dbf33

## FR-unmapped-327 GET /api/daemon/version 返回 latest 双字段
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 部署 bundle 提取失败 self-update 端点 POST /runtimes/{id}/self-update；When 前端调 GET /api/daemon/version；Then 响应含 `latest_version`（语义版本）+ `latest_build_id`（SHA），保留旧 latest/minRequired/downlo
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-05
最近确认：3849dbf33

## FR-unmapped-328 前端展示 daemon 版本 + 徽标
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 管理员打开 runtimes 管理页 runtime.daemon_build_id == latest.latest_build_id（且非 dev/unkn；When runtime 列表渲染；Then 每个 runtime 行显示其 daemon 版本号 + SHA 短码 + 徽标 显示「最新」徽标 显示「可升级」徽标 显示「未知」徽标
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-06
最近确认：3849dbf33

## FR-unmapped-329 前端升级按钮调 self-update
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given runtime 行显示「可升级」或「未知」，且 runtime 在线 self-update 端点返回 DaemonRuntimeOffline；When 管理员点击「升级到最新版」
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-07
最近确认：3849dbf33

## FR-unmapped-330 前端 offline 禁用升级按钮
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given runtime 离线；Then 升级按钮禁用（disabled），不可点击
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-08
最近确认：3849dbf33

## FR-unmapped-331 兼容旧 daemon
变更：2026-07-04-2026-07-04-daemon-version-management
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已部署的旧 daemon（不上报版本字段）；When 它 register/heartbeat；Then backend 不报错（字段 Optional），version/build_id 存 NULL，前端显示「未知」
全文：.sillyspec/changes/archive/2026-07-04-2026-07-04-daemon-version-management/requirements.md#FR-09
最近确认：3849dbf33

## FR-unmapped-343 daemon 停止写 `.sillyspec-platform.json`
变更：2026-07-07-2026-07-07-platform-json-contract-align
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-07-2026-07-07-platform-json-contract-align/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-344 `spec_version` 状态独立文件
变更：2026-07-07-2026-07-07-platform-json-contract-align
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-07-2026-07-07-platform-json-contract-align/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-345 保鲜读写迁移到新位置
变更：2026-07-07-2026-07-07-platform-json-contract-align
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-07-2026-07-07-platform-json-contract-align/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-346 `hasUnsyncedLocalChanges` 读新位置
变更：2026-07-07-2026-07-07-platform-json-contract-align
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-07-2026-07-07-platform-json-contract-align/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-347 dead code 清理
变更：2026-07-07-2026-07-07-platform-json-contract-align
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-07-2026-07-07-platform-json-contract-align/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-387 前端按操作系统自动检测并显示对应安装命令
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户打开 `/runtimes` 页面且 `InstallDaemonBlock` 已在客户端 mount；When 读取 `navigator.userAgent` 判定 OS（`/Win/` → Windows，其余 → unix）；Then 默认显示对应平台的安装命令（Windows → PowerShell 一行；unix → curl\|bash），首屏不渲染命令以避免 hydration 不一
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-388 Windows 显示 PowerShell 一行（后端动态内嵌 server_url）
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given OS 选中为 Windows 且 `serverUrl = window.location.origin` 已就绪；When 渲染 Windows 命令；Then 显示 `irm <serverUrl>/daemon/install.ps1 | iex`，并附琥珀提示「在 PowerShell 或 cmd 中运行」；复制按
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-389 提供 OS 手动切换开关
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given `InstallDaemonBlock` 展开；When 用户点击「macOS / Linux」或「Windows」切换按钮；Then 命令与提示切换为对应平台；默认选中值跟随 FR-01 自动检测，可被手动覆盖
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-390 macOS / Linux 命令保持现状
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given OS 选中为 unix；When 渲染命令；Then 显示 `curl -fsSL <serverUrl>/daemon/install.sh | bash -s -- --server-url <serverUr
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-391 install.ps1 复刻 install.sh 全逻辑（含 mcp-server.js）
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given Windows 用户执行 `irm <serverUrl>/daemon/install.ps1 | iex`；When install.ps1 运行
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-392 后端 GET /daemon/install.ps1 公开端点
变更：2026-07-15-2026-07-14-daemon-install-os-aware
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given backend 镜像已打包 install.ps1 模板 请求经前端 rewrite 反代到达 backend；When `GET /daemon/install.ps1`（无 /api 前缀） 推导 server_url；Then 返回 200 + `Content-Type: application/x-powershell`，body 为模板且 `{{SERVER_URL}}` 已替换
全文：.sillyspec/changes/archive/2026-07-15-2026-07-14-daemon-install-os-aware/requirements.md#FR-06
最近确认：af41fac1d

## FR-unmapped-450 claude 模型调用失败归类为结构化错误
变更：2026-07-29-model-error-visibility
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1、D-005@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given claude code 交互会话中 claude 调模型失败（result.is_error=true 或 api_retry 带 error 或 assist；When daemon 收到 result / 错误事件；Then 归类为 ModelError{type, code, message, retryable, hint, raw}；type ∈ {auth_failed, q
全文：.sillyspec/changes/archive/2026-07-29-model-error-visibility/requirements.md#FR-01
最近确认：aae96b965

## FR-unmapped-451 错误结构化存储与透传
变更：2026-07-29-model-error-visibility
状态：active
摘要：默认场景
依据决策：D-005@v1、D-007@v1、D-009@v1
场景正文：
- 场景：默认场景 — Given daemon 归类出 ModelError；When notifyRunResult 回传后端（payload 带 error）；Then AgentRun.error_detail（JSON）存储完整 ModelError；run status=failed；`GET /sessions/{id}
全文：.sillyspec/changes/archive/2026-07-29-model-error-visibility/requirements.md#FR-02
最近确认：aae96b965

## FR-unmapped-452 错误项展示与操作
变更：2026-07-29-model-error-visibility
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given run failed 且有 error_detail；When 前端渲染会话；Then 消息流插入 RunErrorItem（图标按 type + 「运行失败」+ message + hint）；run/session 标 failed（标红）；带
全文：.sillyspec/changes/archive/2026-07-29-model-error-visibility/requirements.md#FR-03
最近确认：aae96b965

## FR-unmapped-453 成功路径与既有日志不回归
变更：2026-07-29-model-error-visibility
状态：active
摘要：默认场景
依据决策：D-008@v1
场景正文：
- 场景：默认场景 — Given run is_error=false（成功）或历史 run 无 error_detail；When 前端渲染；Then 成功路径无 ModelError（error_detail=None，不受影响）；历史 failed run 兜底显示「运行失败（无详情）」；agent-log
全文：.sillyspec/changes/archive/2026-07-29-model-error-visibility/requirements.md#FR-04
最近确认：aae96b965

## FR-unmapped-466 backend SSE envelope 透传 segment_id（覆盖 D-001@v1）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given backend `run_sync/service.py` 处理一条 session 消息（partial 或 complete）；When 构造 `published_logs`（:595）与 `session_payload`（:164）；Then envelope 含 `segment_id` 字段；**partial 行 = `main:msg_xxx:N`（非空），complete/其他行 = `No
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-467 backend override 信号 publish 到 SSE 且不落库（覆盖 D-001@v1）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given backend override 分支（:413 thinking / :445 assistant）收到 `[ASSISTANT_OVERRIDE]/[THI；When 处理该信号；Then (1) 保留 task-14 的 `_revoke_committed_partials` DELETE + `flushed_partials.pop`（落库
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-468 frontend SessionStreamEnvelope 加字段（覆盖 D-002@v1）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given `frontend/src/lib/daemon.ts` `SessionStreamEnvelope`（:711）；When 定义类型；Then 含 `segment_id: string | null` 与 `stale: boolean`（默认 false，override 行 true）。
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-469 frontend classifySessionLog 识别 override（覆盖 D-002@v1）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given `session-log-sanitize.ts` `classifySessionLog`（:60）收到 content `sanitizeSessionLo；When content 匹配 `^\[(ASSISTANT_OVERRIDE|THINKING_OVERRIDE)\]\s+(\S+)` 处理；Then 返回 `{kind:"override", segmentId:<捕获>, variant:"assistant"|"thinking", text:""}`；
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-470 frontend onLog 按 segmentId 撤回 partial（覆盖 D-002@v1）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given onLog 收到 `seg.kind==="reply"` 且 `env.segment_id` 非空（半截） onLog 收到 `seg.kind==="ov；When 处理 处理 turn 收尾 并发 partial + override；Then 记录 `partialSegments[segmentId] = {outputStart: turn.output.length}`，再 concat 文本（
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-471 frontend logsToTurns 历史兼容
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 历史回看 `logsToTurns`；When 处理 GET `/sessions/{id}/logs` 返回的历史数据；Then 不加撤回逻辑（数据本就干净：partial 已 DELETE、override 不落库）；envelope 新字段在历史 GET 不返回（DTO 不含），`lo
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-472 测试覆盖（覆盖 D-001/D-002/D-003）
变更：2026-08-03-session-stream-partial-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given backend + frontend 实现；When 跑测试；Then backend：override publish 到 SSE + 不落库（断言 `agent_run_logs` 无 override 行）+ segment_
全文：.sillyspec/changes/archive/2026-08-03-session-stream-partial-revoke/requirements.md#FR-07
最近确认：f7f73d86c

## FR-unmapped-483 daemon 上报 started_at（覆盖 D-001@v1）
变更：2026-08-05-daemon-start-time
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-08-05-daemon-start-time/requirements.md#FR-01
最近确认：b9b0454bb

## FR-unmapped-484 backend 存储 + machines 返回 started_at（覆盖 D-001@v1, D-002@v1）
变更：2026-08-05-daemon-start-time
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-002@v1
全文：.sillyspec/changes/archive/2026-08-05-daemon-start-time/requirements.md#FR-02
最近确认：b9b0454bb

## FR-unmapped-485 前端机器头显示 started_at
变更：2026-08-05-daemon-start-time
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-05-daemon-start-time/requirements.md#FR-03
最近确认：b9b0454bb

## FR-unmapped-486 runtime 读端点返回 daemon 版本（覆盖 D-004@v1）
变更：2026-08-05-daemon-version
状态：active
摘要：（无场景名）
依据决策：D-004@v1
全文：.sillyspec/changes/archive/2026-08-05-daemon-version/requirements.md#FR-01
最近确认：9afbfe036

## FR-unmapped-487 构建号每次 build 自动变化（覆盖 D-001@v1, D-002@v1）
变更：2026-08-05-daemon-version
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-002@v1
全文：.sillyspec/changes/archive/2026-08-05-daemon-version/requirements.md#FR-02
最近确认：9afbfe036

## FR-unmapped-488 build-id.ts 移出版控后 tsc 不缺文件（覆盖 D-003@v1）
变更：2026-08-05-daemon-version
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-08-05-daemon-version/requirements.md#FR-03
最近确认：9afbfe036

## FR-unmapped-545 目录树浏览（懒加载）
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 用户已登录且对 workspace 有 workspace:read 权限，且当前用户有 daemon 绑定且 daemon 在线 daemon 离线 当前用户；When 打开「文件」标签页 / 展开某目录节点 打开文件页 打开文件页；Then 前端调用 `GET /explorer/tree?path=<rel>`，backend 按当前用户绑定解析 daemon 并转发 `explorer_list
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-01
最近确认：860cfdb41

## FR-unmapped-546 文件预览
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 用户在树中选中一个文件 文件为 utf8 解码失败的非文本文件；When 前端调用 `GET /explorer/file?path=<rel>` daemon explorer_read_file 处理；Then 按类型渲染：代码→语法高亮（react-syntax-highlighter）；Markdown→渲染视图；图片→blob 内联；二进制或 >10MB→元信息卡
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-02
最近确认：860cfdb41

## FR-unmapped-547 文件下载
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 用户选中任意已列出文件；When 点击下载；Then `GET /explorer/download?path=<rel>` 经 daemon `encoding=base64` 通道回传，StreamingRes
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-03
最近确认：860cfdb41

## FR-unmapped-548 文件名全局搜索
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 用户已加载文件页；When 在搜索框输入关键词提交；Then `GET /explorer/search?q=` → daemon 全树递归（跳过 node_modules/.git 等噪声目录）大小写不敏感子串匹配文件名
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-04
最近确认：860cfdb41

## FR-unmapped-549 路径安全
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 任意 explorer 端点收到恶意 path（`../`、绝对路径、UNC、工作区内 symlink 指向 root 外）；When backend 预检或 daemon 校验执行；Then backend 预检拒绝（422）或 daemon realpath 落点校验拒绝（forbidden→403），无任何 root 外内容泄漏
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-05
最近确认：860cfdb41

## FR-unmapped-550 版本兼容降级
变更：2026-08-18-workspace-file-browser
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户本机 daemon 为旧版（未注册 explorer_* 方法）；When 调用任意 explorer 端点；Then daemon 回 method_not_found，backend 映射 422，前端显示「daemon 版本过旧请升级」卡；平台其它功能不受影响
全文：.sillyspec/changes/archive/2026-08-18-workspace-file-browser/requirements.md#FR-06
最近确认：860cfdb41

## FR-unmapped-611 Bash 命令实时反馈
变更：2026-08-24-platform-session-feedback-fix
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-08-24-platform-session-feedback-fix/requirements.md#FR-01
最近确认：df0da49ed

## FR-unmapped-612 Plan 模式强确认
变更：2026-08-24-platform-session-feedback-fix
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-002@v1
全文：.sillyspec/changes/archive/2026-08-24-platform-session-feedback-fix/requirements.md#FR-02
最近确认：df0da49ed

## FR-unmapped-613 后台 Agent 任务进度可见
变更：2026-08-24-platform-session-feedback-fix
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-08-24-platform-session-feedback-fix/requirements.md#FR-03
最近确认：df0da49ed

## FR-unmapped-614 AskUser 弹窗可最小化
变更：2026-08-24-platform-session-feedback-fix
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-08-24-platform-session-feedback-fix/requirements.md#FR-04
最近确认：df0da49ed

## FR-unmapped-615 Git 日志列表与泳道拓扑展示
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 工作区为 git 仓库（git_mode=git）且用户已绑定可用 daemon 仓库存在分叉与合并；When 用户打开「Git 日志」tab 渲染泳道；Then 显示泳道 SVG（commit 圆点按 lane 取色板、HEAD 虚线环）+ 提交列表（message/作者/短哈希/refs 标签/时间），默认全分支（gi
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-01
最近确认：5d86ddb17

## FR-unmapped-616 提交详情与变更文件目录树
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 用户点击列表某行；When 打开右侧 Drawer；Then 展示哈希/作者/时间/message 全文 + 变更文件**目录树**（--numstat 平铺路径按 / 前端聚合，目录节点聚合 +x/-y，叶子显示单文件增
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-02
最近确认：5d86ddb17

## FR-unmapped-617 文件级 diff 查看
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-003@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given Drawer 文件树中某叶子文件被点击；When 按需请求该文件 diff（此前不请求）；Then 展示 unified diff（+绿/-红语义 token，行号列，hunk 头）；binary 文件显示「二进制文件」提示；超 64KB 截断并标记 trun
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-03
最近确认：5d86ddb17

## FR-unmapped-618 分支与作者过滤
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-005@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 工具栏分支下拉（数据源=响应 top-level branches[]，git_refs 全量）与作者文本输入框；When 用户设定过滤并触发；Then 请求携带 branch/author 参数（git log <branch> 替代 --all；--author 独立 argv），结果集更新；过滤后结果集外的
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-04
最近确认：5d86ddb17

## FR-unmapped-619 异常与降级形态
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-002@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 工作区非 git 仓库（probe=direct） daemon 离线 / RPC 超时 / 旧版 daemon（method_not_found）/ 用户未绑
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-05
最近确认：5d86ddb17

## FR-unmapped-620 分页与性能
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-004@v1、D-005@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 大仓库历史 长列表滚动；When 用户翻页（skip/limit，默认 100/页）；Then daemon 每页从 HEAD 拉 skip+limit+lookahead(50) 条，backend 全前缀确定性 lane 计算只返回窗口——任意页 la
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-06
最近确认：5d86ddb17

## FR-unmapped-621 只读与参数安全
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 全部后端链路 sha/branch/author/path 输入；Then 只使用只读 git 子命令（log/for-each-ref/show/rev-parse），无 DB 写入，无状态迁移 sha 匹配 ^[0-9a-fA-F]
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-07
最近确认：5d86ddb17

## FR-unmapped-622 三主题视觉合规
变更：2026-08-25-workspace-git-log
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given blue / ai-native / dark 任一主题；When 打开 Git 日志页；Then 颜色全部走 themes.ts 消费链（CSS 变量 / brand-* / semantic token），泳道色板三主题各配亮暗档；tab 内无 md: 等
全文：.sillyspec/changes/archive/2026-08-25-workspace-git-log/requirements.md#FR-08
最近确认：5d86ddb17

## FR-unmapped-640 Git 状态数据端点
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 工作区为 git 仓库且用户已绑定在线 daemon；When GET /api/workspaces/{wid}/git-log/status；Then 返回 branch/detached/upstream/ahead/behind/dirty{files_changed,additions,deletions
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-01
最近确认：69bf8e3c5

## FR-unmapped-641 自动 fetch 与降级
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 打开任一挂载页；When useGitLogStatus 触发（staleTime 60s，两页共享缓存）；Then daemon 侧先 git fetch --quiet（15s 超时）；成功→ahead/behind 为新鲜值且 fetch.performed=true；超
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-02
最近确认：69bf8e3c5

## FR-unmapped-642 未提交改动统计
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工作区有未提交改动；When 采集 git diff HEAD --numstat --no-renames；Then additions/deletions 为行数汇总（staged+unstaged 合并），files_changed ≡ numstat 行数（单源；inde
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-03
最近确认：69bf8e3c5

## FR-unmapped-643 状态条双形态展示
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given Git 日志页打开 会话页打开且 scope.kind=workspace 加载中 / fetch 失败；When 状态条渲染（variant=full） 状态条渲染（variant=compact，PageHeader actions 槽）；Then 分支徽标（⎇）+ 跟踪名 + ↑N 未推送 + ↓N 远程新提交 + 改动 +A/−D（N 文件）+ 未跟踪 N + "已同步 · HH:MM" 分支/↑/↓/
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-04
最近确认：69bf8e3c5

## FR-unmapped-644 边界形态
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 无 upstream（本地新分支）→ 无 ↑↓（ahead/behind null） detached HEAD → 分支徽标显示 head_short + "
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-05
最近确认：69bf8e3c5

## FR-unmapped-645 只读与安全
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 全链路；Then 本地零写操作（fetch 为网络同步）；root 唯一入参（零新增注入面）；全部 argv 独立经 execFile；无 DB 写入
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-06
最近确认：69bf8e3c5

## FR-unmapped-646 主题与缓存合规
变更：2026-08-26-workspace-git-status
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 三主题任一；Then 状态条颜色全走 themes.ts 消费链（brand 徽标/accent ↑/warning ↓与黄条/success +/error −）零硬编码 hex；
全文：.sillyspec/changes/archive/2026-08-26-workspace-git-status/requirements.md#FR-07
最近确认：69bf8e3c5

## FR-auto-sillyhub-daemon-001 轮任务派生
变更：2026-09-07-pi-task-events
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given pi 会话产生一轮 turn（turn_start → ... → turn_end）；When 轮内出现 tool_execution_start；Then 归一化器产出一组任务事件：turn_start 时 running（task_id=pi-t<seq>），turn_end 时按 stopReason 映射终态
全文：.sillyspec/changes/archive/2026-09-07-pi-task-events/requirements.md#FR-01
最近确认：35f3d6528

## FR-auto-sillyhub-daemon-002 上报链路复用
变更：2026-09-07-pi-task-events
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 归一化器产出 status/agent_task_status 事件；Then 经既有 envelope→_onMessage→_dispatchStatusEvent→cli onSessionEvent→notifyAgentTaskS
全文：.sillyspec/changes/archive/2026-09-07-pi-task-events/requirements.md#FR-02
最近确认：35f3d6528

## FR-auto-sillyhub-daemon-003 异常流防御
变更：2026-09-07-pi-task-events
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 上一轮任务仍 running 时新 turn_start 到达（上轮 turn_end 丢失）；Then 先补发上轮 completed 再开新行，不产生悬挂 running
全文：.sillyspec/changes/archive/2026-09-07-pi-task-events/requirements.md#FR-03
最近确认：35f3d6528

## FR-auto-sillyhub-daemon-004 既有行为零回归
变更：2026-09-07-pi-task-events
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 全部既有 pi-events 用例与 claude/codex 会话；Then 映射表零改动；既有用例仅 expected 数组适配（追加派生事件）；claude/codex 零变化
全文：.sillyspec/changes/archive/2026-09-07-pi-task-events/requirements.md#FR-04
最近确认：35f3d6528
