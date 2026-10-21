---
author: sillyspec-fr-index
created_at: 2026-10-08T02:26:04.249Z
---

# FR 索引 — frontend

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/frontend.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-auto-frontend-001 会话行状态小灯
变更：2026-09-08-session-list-liveness-dot
状态：active
摘要：默认场景
依据决策：D-001@v2、D-002@v1
场景正文：
- 场景：默认场景 — Given 会话列表已渲染且该会话在 liveness map 中命中（有 agent_session_id 关联的日志行） 会话无关联日志（map 未命中）或查询失败/加；When 30s 轮询数据到达 列表渲染；Then 行尾（相对时间后、hover 按钮前）渲染 18px 状态小灯，颜色/闪烁形态与 LivenessDot 五态视觉一致（working/blocked 呼吸闪烁
全文：.sillyspec/changes/archive/2026-09-08-session-list-liveness-dot/requirements.md#FR-01
最近确认：35f3d6528

## FR-auto-frontend-002 悬停详情卡
变更：2026-09-08-session-list-liveness-dot
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 会话行有小灯；When 鼠标悬停小灯；Then antd Popover（portal 渲染，不被行容器 overflow-hidden 裁剪）弹出详情卡：状态全名（LIVENESS_META）+ 静默时长（
全文：.sillyspec/changes/archive/2026-09-08-session-list-liveness-dot/requirements.md#FR-02
最近确认：35f3d6528

## FR-auto-frontend-003 idle 未读小红点
变更：2026-09-08-session-list-liveness-dot
状态：active
摘要：默认场景
依据决策：D-001@v2、D-003@v1
场景正文：
- 场景：默认场景 — Given localStorage 记录的该会话上次已知 state ∈ {working, blocked} 红点存在 首次见到该会话（无历史 state 记录）或 s；Then 写未读标记，小灯右上角显示 7px 红点（bg-destructive） 清除未读标记，红点消失 不亮红点（避免初次打开刷屏）；常 idle 会话（无新转移）不
全文：.sillyspec/changes/archive/2026-09-08-session-list-liveness-dot/requirements.md#FR-03
最近确认：35f3d6528

## FR-auto-frontend-004 布局与主题约束
变更：2026-09-08-session-list-liveness-dot
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 任意会话列表视图（树/平铺、归档视图、批量模式）；When 小灯与红点渲染；Then 不新增列、不改行布局（行内 flex 尾部追加 flex-none 节点）；双主题下色值均走语义阶（brand-*/muted/destructive 等，th
全文：.sillyspec/changes/archive/2026-09-08-session-list-liveness-dot/requirements.md#FR-04
最近确认：35f3d6528

## FR-auto-frontend-005 预会话草稿按入口隔离（草稿串台修复）
变更：2026-09-13-session-group-ux-fixes
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 用户在入口 P1（工作区 W1 + 机器 R1）的预会话输入框输入内容未发送；When 用户返回列表后从另一入口 P2（工作区 W2 或机器 R2）新建预会话；Then P2 输入框为空（或 P2 自有历史草稿），P1 的内容不出现在 P2；同一入口重进仍恢复 P1 草稿
全文：.sillyspec/changes/archive/2026-09-13-session-group-ux-fixes/requirements.md#FR-1
最近确认：39d3d8c5c

## FR-auto-frontend-006 输入框高度拖拽触摸可用（拖拽修复）
变更：2026-09-13-session-group-ux-fixes
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 移动端（触摸屏）会话输入框或群聊输入框；When 用户按住输入胶囊上缘拖拽手柄竖向拖动；Then 输入框高度实时增减，钳制在 44-480px（且 ≤ 视口 60%）；松手高度持久化（刷新后保持）；双击手柄恢复默认高度
全文：.sillyspec/changes/archive/2026-09-13-session-group-ux-fixes/requirements.md#FR-2
最近确认：39d3d8c5c

## FR-auto-frontend-007 群聊跨工作区可见（可见性修复）
变更：2026-09-13-session-group-ux-fixes
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 群 G 直接归属工作区 D、关联项目 A，项目 A 关联工作区 D 与 F，当前用户是 G 的成员；When 用户分别在工作区 D 与工作区 F 打开会话列表（桌面左栏 / 移动端列表页）；Then 两处的群聊分区均显示群 G
全文：.sillyspec/changes/archive/2026-09-13-session-group-ux-fixes/requirements.md#FR-3
最近确认：39d3d8c5c

## FR-auto-frontend-008 列表页重新扫描
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 用户在移动变更列表页（任一变更 tab） 重新扫描返回警告列表 重新扫描请求失败；When 点击工具栏「重新扫描」按钮 警告数 > 0 返回 ApiError；Then 调用 reparseChanges(workspaceId)，成功后显示「已重新扫描：解析 N，新增 N · 更新 N · 删除 N。W 个警告。」反馈条（文案
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-01
最近确认：d33092ea3

## FR-auto-frontend-009 列表卡片信息补齐
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given ChangeSummary.owner_name 非空 owner_name 空且 owner_id 有值 owner_name 与 owner_id 均空 a；When 渲染卡片元信息行 渲染元信息行 渲染元信息行 渲染元信息行 渲染执行用量行 渲染执行用量行 渲染执行用量行 渲染徽标行；Then 显示负责人名（owner_name） 显示 owner_id 前 8 位（mono 弱化色） 负责人段显示「—」 影响组件段省略（不占位） 显示「—」占位 整行
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-02
最近确认：d33092ea3

## FR-auto-frontend-010 列表排序切换与 URL 参数
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 用户打开筛选抽屉 URL 含 ?tab=quicklog 或 ?tab=archive（合法值） URL 含 ?search=词 未操作任何筛选、URL 无参数；When 切换「排序」chip（↓ 最近优先 / ↑ 最早优先）并确定 页面初始加载 页面初始加载 页面加载；Then sortDir 生效进主列表 query key，列表按所选方向请求 初始 tab 为该值（非法值回 active） 搜索词初始化为该值（输入框与已提交 sta
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-03
最近确认：d33092ea3

## FR-auto-frontend-011 quicklog tab 筛选
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 用户在快速修复 tab 用户选择状态=疑似中断并确定 作者选项数据 用户关闭「显示空壳占位」并确定 quicklog tab 处于抽屉筛选状态；When 打开筛选抽屉 quicklog 列表请求发出 quicklog 列表响应到达 请求发出 点击重置；Then 可见状态 4 态 chips、作者 chips、显示空壳占位开关 query key 与请求参数带 status="stale"（槽位与桌面 QuicklogT
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-04
最近确认：d33092ea3

## FR-auto-frontend-012 详情页三卡挂载
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given change.steps 存在且至少一步有 completed_at change.steps 无 completed_at（或 steps 缺失） 任意变更详；When 详情页渲染 详情页渲染 渲染；Then StageStepper 下方显示 ChangeLastSignal（最后信号相对时间） 最后信号行不渲染 挂载 ChangeUsageCard(kind="c
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-05
最近确认：d33092ea3

## FR-auto-frontend-013 详情页阶段-时间线联动
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given steps 中某阶段有条目 时间线处于阶段筛选态 某阶段在 steps 中无条目；When 点击步骤条该阶段节点 再次点击同阶段节点或点清除 chip 渲染步骤条；Then 时间线仅显示该阶段步骤，卡头出现「阶段名 ✕」清除 chip 取消筛选恢复全量 该节点不可点（无筛选效果）
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-06
最近确认：d33092ea3

## FR-auto-frontend-014 详情页删除入口
变更：2026-09-16-mobile-changes-parity
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 用户对目标变更有删除权限（canDeleteChange 启发式通过） 用户无权限 change 尚在加载（null） 用户点击删除并确认 deleteChan；When 打开 ⋯ 菜单 打开 ⋯ 菜单 渲染 ⋯ 菜单 deleteChange 成功 mutation onError；Then 出现 danger 项「删除变更」 不出现删除项（其余动作不受影响） 不出现删除项 toast「变更 {change_key} 已删除」+ 失效 ["chang
全文：.sillyspec/changes/archive/2026-09-16-mobile-changes-parity/requirements.md#FR-07
最近确认：d33092ea3

## FR-unmapped-217 Design Token 单一源
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-004@v2、D-005@v1、D-006@v1
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-01
最近确认：4fcf52daa

## FR-unmapped-218 统一"现代明亮活力"视觉
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-02
最近确认：4fcf52daa

## FR-unmapped-219 统一状态语义色
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-03
最近确认：4fcf52daa

## FR-unmapped-220 共享布局组件
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-04
最近确认：4fcf52daa

## FR-unmapped-221 AppShell 升级
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-05
最近确认：4fcf52daa

## FR-unmapped-222 登录页同色系
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-06
最近确认：4fcf52daa

## FR-unmapped-223 Inter 字体
变更：2026-06-21-2026-06-21-frontend-style-system
状态：active
摘要：（无场景名）
依据决策：D-004@v2
全文：.sillyspec/changes/archive/2026-06-21-2026-06-21-frontend-style-system/requirements.md#FR-07
最近确认：4fcf52daa

## FR-unmapped-229 单一 SSE 客户端（合并）
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 前端存在 `streamAgentRunLogs`（函数）与 `AgentRunStreamClient`（class）两套 SSE 客户端；When 本次变更完成；Then `AgentRunStreamClient` 是唯一底层 SSE 客户端；`streamAgentRunLogs` 从 `agent.ts` 删除；4 个调用点
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-01
最近确认：76d31620a

## FR-unmapped-230 useAgentRunStream hook 封装实时流状态
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given 一个活跃 agent run（workspaceId + runId，status∈{pending,running}）；When 调用 `useAgentRunStream(workspaceId, runId, { isActive: true })`；Then hook 内部 `new AgentRunStreamClient` 并连接，返回 `{ logs, status, streaming, loading, e
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-02
最近确认：76d31620a

## FR-unmapped-231 AgentRunPanel 面板组件
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 调用点需要展示一个 run 的实时日志 + 审批 + input；When 渲染 `<AgentRunPanel workspaceId runId isActive title ... />`；Then 内部调 `useAgentRunStream`，把 logs/perms/input（适配后）/loading 注入 `<AgentLogViewer>`，调用
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-03
最近确认：76d31620a

## FR-unmapped-232 AskUserQuestion 审批卡片在 /agent 与 changes/[cid] 渲染（bug 修复）
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given `/agent` 或 `changes/[cid]` 页的活跃 run 中 Claude Code 触发 AskUserQuestion（daemon 发 pe；When 事件到达 `AgentRunStreamClient` 卡片自调 `respondSessionPermission` 成功后 onResolved，或 SSE；Then hook 的 `perms` 增加该 request（按 request_id 去重），`AgentRunPanel`→`AgentLogViewer` 渲染审
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-04
最近确认：76d31620a

## FR-unmapped-233 pending_input 回复纳入 hook + UI 统一
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 活跃 run 输出 pending_input 日志（人工指导请求）；When 用户在 input 控件填写并提交；Then hook 的 `input.submit(logId)` 调 `submitAgentRunInput`，成功后标记 `replied`；三处调用点（根/age
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-05
最近确认：76d31620a

## FR-unmapped-234 非活跃 run 仅 prefetch 历史（isActive 语义）
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given runId 对应非活跃 run（completed/failed/killed），`isActive=false`；When 调用 `useAgentRunStream(workspaceId, runId, { isActive: false })`；Then hook 仅 prefetch 历史日志（`AgentRunStreamClient.connect` 内 `getAgentRunLogs`），**不建立 S
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-06
最近确认：76d31620a

## FR-unmapped-235 dialog 恢复（刷新前未答的 AskUserQuestion）
变更：2026-06-22-2026-06-22-unify-agent-run-sse-hook
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 页面刷新前已有 pending 的 AskUserQuestion 对话（dialog_kind 待答）；When hook 连接一个 isActive run（runId 变化）；Then hook 内部 `getAgentRun` 取 `session_id` → `fetchPendingDialogs(session_id)` 恢复未答 di
全文：.sillyspec/changes/archive/2026-06-22-2026-06-22-unify-agent-run-sse-hook/requirements.md#FR-07
最近确认：76d31620a

## FR-unmapped-246 会话弹窗化（runtime 专属工作台）
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在 /runtimes 页面，存在在线 runtime（claude/codex） 弹窗已打开（runtime A） 弹窗打开且该 runtime 有活跃会；When 用户点击某 runtime 卡片的「会话」按钮 用户点击另一 runtime B 的「会话」按钮 弹窗渲染 弹窗渲染；Then 弹出该 runtime 专属会话工作台（左历史会话列表 + 右会话区），不滚动页面 弹窗切换为 B（单例，A 关闭 B 打开，状态重置） 右侧默认 attach
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-247 active 会话续聊
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 弹窗左侧列表有一 active 会话 active 会话 attach 后有进行中 run；When 用户点击该 active 会话项 SSE 推送进行中 run 的 log；Then 右侧进入 attach 模式：拉历史 logs → `logsToTurns` 预填 → 建 SSE → 轮询到 active → 输入框可用可发送续聊（非只读
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-248 页面精简
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户进入 /runtimes；When 页面渲染；Then 无底部常驻会话区，主体为摘要卡 + runtime 卡片列表，卡片更舒展
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-249 ended/failed 会话回看与续聊
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 弹窗左侧有 ended/failed claude 会话（有 agent_session_id） ended/failed codex 会话；When 用户点击 用户点击；Then 右侧只读回看 + 「继续对话」按钮可用（reopen → attach） 右侧只读回看，「继续对话」置灰（codex 不支持续聊）
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-250 关闭清理
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 弹窗打开且会话 attach 中（SSE/轮询活跃）；When 用户关闭弹窗；Then SSE 关闭 + 轮询清理无泄漏；`?session=` 被清除
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-251 URL `?session=` 恢复
变更：2026-06-23-runtimes-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given URL 含 `?session=<活跃会话>` URL 含 `?session=<ended/failed/不存在>`；When 页面 mount/刷新 页面 mount；Then 自动打开对应 runtime 弹窗并 attach 该会话 清 param，不开弹窗，降级 idle
全文：.sillyspec/changes/archive/2026-06-23-runtimes-session-dialog/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-260 后端 grace window(grace 内旧 token 重签、不误杀)
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given 用户已登录,有一 active session S1(refresh_token=T1);T1 被正常 rotate 产生 S2,`S2.rotated_at=；When 在 grace 窗口(`now - rotated_at < auth_refresh_grace_seconds`,默认 60s)内再次用 T1 调 `POS；Then 返回 200 + 全新 TokenPair;**不**触发 `revoke_all_user_sessions`;Sx 仍 active;新增一个 active
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-01
最近确认：29acb47ea

## FR-unmapped-261 Session.rotated_at 字段 + migration
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given `sessions` 表现状(无 rotated_at)；When 执行新 migration `202606241000_add_session_rotated_at`；Then 新增 `rotated_at TIMESTAMP WITH TIME ZONE NULL`;现有行 rotated_at 保持 NULL;`down_revis
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-02
最近确认：29acb47ea

## FR-unmapped-262 access token TTL 15min → 30min
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given `config.Settings` 默认值；When 调 `create_access_token` 签发；Then access token `exp = iat + 30min`;`/api/auth/refresh` 返回 `access_expires_in≈1800`
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-03
最近确认：29acb47ea

## FR-unmapped-263 前端单飞刷新锁
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 浏览器单 tab,N 个并发请求同时收到 401,store 内为同一 refreshToken；When 各自调用 `ensureFreshAccessToken()`；Then 仅发起 **1 次** `POST /api/auth/refresh`;所有调用共享同一结果;成功后 store 更新为新 token
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-04
最近确认：29acb47ea

## FR-unmapped-264 三处 401 刷新收口到单飞锁
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given `api.ts`(apiFetch 401 分支)、`ppm/export.ts`(downloadExcel 401 分支)、`auth.ts`(refres；When 任一处需要刷新；Then 统一调用 `ensureFreshAccessToken()`,删除各处内联的 fetch refresh;`/api/auth/*` 端点自身不触发刷新重试(
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-05
最近确认：29acb47ea

## FR-unmapped-265 AppShell 主动刷新定时器
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 用户处于登录态(accessToken 非空)；When AppShell 定时校验(每分钟)发现 `exp - now < (exp - iat)/3`(剩余 < 1/3 TTL)；Then 自动调 `ensureFreshAccessToken()` 续期;token 缺失/解析失败时静默跳过
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-06
最近确认：29acb47ea

## FR-unmapped-266 logout 调用点适配三元返回(Design Grill X-001)
变更：2026-06-24-2026-06-24-concurrent-refresh-revoke
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given `_consume_refresh_token` 返回值由二元组改为三元组 `(User, Session, is_grace)`；When `logout_session_by_refresh` 与 `refresh` 调用它；Then 两处解包正确(logout 用 `_, session, _`);logout 命中 grace 时幂等 revoke、**不签发新对**;`logout` 路
全文：.sillyspec/changes/archive/2026-06-24-2026-06-24-concurrent-refresh-revoke/requirements.md#FR-07
最近确认：29acb47ea

## FR-unmapped-278 errMessage 纯函数取中文文案
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 ApiError(code="HTTP_409_DAEMON_RUNTIME_IN_USE", message="该 daemon 仍被 1 个 work；When 调用 errMessage(err) 调用 errMessage(err) 调用 errMessage(err)  /  errMessage(err, "加载；Then 返回 "该 daemon 仍被 1 个 workspace 绑定…"（后端中文 message 原样） 返回 "网络连接失败，请检查网络后重试"（中文兜底） 返
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-01
最近确认：0ab898669

## FR-unmapped-279 useNotify hook 统一通知入口
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 组件渲染在 <AntApp> 内（dashboard 全局已包裹） 操作成功；When 调用 const notify = useNotify(); notify.error(err) 调用 notify.success("运行时已移除")；Then 调用 antd messageApi.error(errMessage(err))，弹出中文 toast 弹出 antd 成功 toast
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-02
最近确认：0ab898669

## FR-unmapped-280 daemon runtime 删除落地
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在 runtimes 页点某 runtime 的「移除」 确认删除后后端返回 409（被 workspace 绑定） 确认删除后后端返回 204；When 触发删除 ApiError 抛出 成功；Then 弹出 antd Modal.confirm（destructive 主题，中文警告），而非原生 window.confirm notify.error(err)
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-03
最近确认：0ab898669

## FR-unmapped-281 D 模式 16 处收敛
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 16 处 `${err.code}: ${err.message}` 拼接（精确清单见 design §6）；When 替换为 errMessage(err) / notify.error(err)；Then 用户不再看到英文 code；原展示方式（toast/inline）保持；grep 残留 = 0
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-04
最近确认：0ab898669

## FR-unmapped-282 合并 3 处重复 errMessage util
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given kanban.ts / ppm problem-list / problem-changes 各有局部 errMessage；When 改为 import 全局 lib/errors.ts 的 errMessage；Then 行为等价（全局版多 network 兜底，属增强）；局部函数删除
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-05
最近确认：0ab898669

## FR-unmapped-283 展示策略规范文档化
变更：2026-06-25-2026-06-25-frontend-error-handling
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本次确立的展示策略（操作 toast / 加载 inline / 表单 inline / 确认 Modal）；When 写入模块文档（lib-errors.md 注意事项区）；Then 后续开发者有明确约定可循
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-frontend-error-handling/requirements.md#FR-06
最近确认：0ab898669

## FR-unmapped-353 工作区上下文 store（缓存层）
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-354 登录后强制选工作区（客户端守卫）
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-355 落地页改工作区选择器
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-356 顶栏工作区切换器
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-357 daemon 绑定弹窗
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-358 daemon 状态数据接入
变更：2026-07-09-2026-07-09-workspace-prioritization
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-workspace-prioritization/requirements.md#FR-06
最近确认：af41fac1d

## FR-unmapped-367 SessionListLayout 公共组件
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 两处会话列表（runtimes 弹窗 / 变更会话）需要一致的视觉 列表为空；When 调用方传入标准化 `SessionListEntry[]` + `onSelect`/`onNewSession`/`onRetry`（可选 `onDelete；Then 组件渲染圆角卡片（`rounded-md border bg-slate-50`）+ header + 顶部「新建会话」虚线按钮 + 列表项（`title ??
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-368 RuntimeSessionDialog 样式对齐 + 二态化
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户打开 `/runtimes?session=<id>` 弹窗 用户点击任意状态会话（active/pending/reconnecting/ended/fa；When 弹窗渲染 handleSelect 触发 触发 触发；Then 左侧使用 `SessionListLayout`（带删除按钮，字段=title/status/提供方·轮数/时间），右侧直接挂 `InteractiveSess
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-369 ChangeSessionSection 改用公共组件 + ended/failed reopen
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更详情页会话区块 用户点击 ended/failed 会话；When 渲染 handleSelect 触发；Then 左侧使用 `SessionListLayout`（不传 `onDelete`，`secondaryText`=作者·提供方），右侧 `InteractiveSe
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-370 消息渲染 BUG 修复（sanitizeSessionLogContent + logsToTurns）
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given attach 历史会话预填 turn 实时 SSE log attach 后 SSE 与 initialTurns 可能重叠；When `logsToTurns(getAgentSessionLogs)` 处理每条 log `renderLogContent` 处理 daemon 推送历史 lo；Then 对 `content_redacted` 先调 `sanitizeSessionLogContent(content, channel)` 过滤（`[SYSTE
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-371 AgentSession.deleted_at 软删字段
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given AgentSession 模型 migration downgrade；When migration apply 执行；Then 新增 `deleted_at TIMESTAMP NULL` 列 + `ix_agent_sessions_deleted_at` 索引；现有行 `delete
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-372 delete_agent_session 改软删
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户删除 active/pending/reconnecting 会话 用户删除 ended/failed 会话；When `delete_agent_session` 执行 执行；Then 先 best-effort `_end_session_for_delete`（WS SESSION_END + currentRun killed + lea
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-373 list/get 过滤软删
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任一用户调 `list_agent_sessions` / `list_change_sessions`；When 查询；Then 仅返回 `deleted_at IS NULL` 的会话；`get_agent_session` 对软删会话抛 `DaemonSessionNotFound`（
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-07
最近确认：f7f73d86c

## FR-unmapped-374 list_agent_sessions 补 title
变更：2026-07-11-unify-runtime-session-dialog
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given `list_agent_sessions` 返回 前端 `AgentSessionRead`；When 构造响应 类型定义；Then 每条含 `title`（首条 `channel=user_input` 的 AgentRunLog 摘要前 30 字，复用 `list_change_sessi
全文：.sillyspec/changes/archive/2026-07-11-unify-runtime-session-dialog/requirements.md#FR-08
最近确认：f7f73d86c

## FR-unmapped-381 项目状态用 StatusBadge 渲染
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given projects 页项目状态字段 option 配置了 `statusKind` 状态 option 无 `statusKind`、仅有 `color`；When 表格渲染状态列 渲染状态列；Then 显示带圆点 pill（进行中=info蓝 / 已完成=success绿 / 已暂停=warning橙） 退化为 antd Tag（向后兼容，不影响 custom
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-01
最近确认：54207135f

## FR-unmapped-382 项目类型用 antd Tag 渲染
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 类型字段 `color` 为 `blue` / `cyan` / `default` `color="default"`；When 渲染类型列 渲染；Then 显示对应色块 Tag（研发=blue / 实施=cyan / 运维=default 灰） 显示无 color 的默认灰 `<Tag>`（非 antd 自定义色字
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-02
最近确认：54207135f

## FR-unmapped-383 浮层换 antd Drawer/Modal 且点遮罩不关
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
依据决策：D-002@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 用户打开编辑抽屉 / 删除确认 / 成员管理抽屉 projects 页点「成员管理」打开外层 Drawer，内嵌成员表；When 点击遮罩层（mask） 点击右上角 `✕` / 底部「取消」/ 按 ESC 在成员表内点「编辑成员」；Then 弹窗**不**关闭（`maskClosable={false}`） 弹窗关闭 内层 Drawer/Modal 正常打开，z-index 高于外层，ESC 关最上
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-03
最近确认：54207135f

## FR-unmapped-384 toast / error 提示语义化
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 操作成功 / 失败；When 显示 toast；Then 用语义色（success=emerald / error=red），无硬编码 `emerald-300`/`bg-emerald-50`
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-04
最近确认：54207135f

## FR-unmapped-385 搜索区布局保持现状
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given 搜索字段数 > 4 搜索字段数 ≤ 4；When 渲染搜索区 渲染搜索区；Then 操作按钮行在字段**上方右对齐**（数据组：导出/新增 在左；基础组：查询/重置/展开 在**最右**；中间分隔线）；字段 4 列网格显示前 4 个 + 「展开
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-05
最近确认：54207135f

## FR-unmapped-386 project_name 列加粗
变更：2026-07-14-2026-07-14-ppm-projects-style-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When 表格渲染项目名称列；Then `project_name` 文字加粗（font-medium），项目编号独立成列、不加粗
全文：.sillyspec/changes/archive/2026-07-14-2026-07-14-ppm-projects-style-redesign/requirements.md#FR-06
最近确认：54207135f

## FR-unmapped-416 设备自动分流（middleware rewrite，无 FOUC）
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-002@v2、D-005@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-01
最近确认：1326f184d

## FR-unmapped-417 移动外壳 + 底部 5 Tab 导航
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-004@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-02
最近确认：1326f184d

## FR-unmapped-418 移动登录页
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-03
最近确认：1326f184d

## FR-unmapped-419 个人工作台移动视图（全功能）
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-008@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-04
最近确认：1326f184d

## FR-unmapped-420 计划任务移动视图（全功能）
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-007@v1、D-008@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-05
最近确认：1326f184d

## FR-unmapped-421 问题清单移动视图（全功能）
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-007@v1、D-008@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-06
最近确认：1326f184d

## FR-unmapped-422 工作区选择移动视图（列表全功能 + 详情提示电脑端）
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-006@v1、D-008@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-07
最近确认：1326f184d

## FR-unmapped-423 数据层 100% 复用 + 桌面完全零回归
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-08
最近确认：1326f184d

## FR-unmapped-424 断点 token + 样式文档
变更：2026-07-22-2026-07-22-mobile-app-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-mobile-app-ui/requirements.md#FR-09
最近确认：1326f184d

## FR-unmapped-437 进门自由化（4 入口点）
变更：2026-07-26-2026-07-26-ungate-workspace-entry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户是某工作区成员（或平台管理员） 用户非该工作区成员（且非平台管理员）；When 用户在列表页 / 顶栏 switcher / 移动端点击该工作区 点击该工作区；Then 直接导航/切换进入工作区（不弹 daemon 绑定 Dialog），与有无 binding 无关 不可进（后端 membership 鉴权拒绝，前端不展示或引导
全文：.sillyspec/changes/archive/2026-07-26-2026-07-26-ungate-workspace-entry/requirements.md#FR-01
最近确认：ffb9a7cc1

## FR-unmapped-438 Guard 降级（不再阻断详情页）
变更：2026-07-26-2026-07-26-ungate-workspace-entry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成员进入工作区详情页 成员已绑定 daemon；When 成员未绑定 daemon（unbound） 进入详情页；Then WorkspaceBindingGuard 不渲染绑定表单（return null），详情页内容（tabs/概览/文档）正常展示，不阻断 guard 显示"编辑
全文：.sillyspec/changes/archive/2026-07-26-2026-07-26-ungate-workspace-entry/requirements.md#FR-02
最近确认：ffb9a7cc1

## FR-unmapped-439 概览 binding 配置（复用既有 WorkspaceConfigCard）
变更：2026-07-26-2026-07-26-ungate-workspace-entry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成员在工作区概览页 成员已绑定 daemon；When 成员未绑定 daemon 在概览页；Then 概览的 WorkspaceConfigCard 渲染首次绑定引导（含 WorkspaceAccessGuide），作为**可选**配置入口，非阻断，与文档/变更
全文：.sillyspec/changes/archive/2026-07-26-2026-07-26-ungate-workspace-entry/requirements.md#FR-03
最近确认：ffb9a7cc1

## FR-unmapped-440 daemon 依赖功能统一内联空态（DaemonRequiredNotice）
变更：2026-07-26-2026-07-26-ungate-workspace-entry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成员无自有 daemon（无 binding），访问 daemon 依赖页（运行时 / 扫描文档 / 组件拓扑源码） 成员已绑定/可借；When 页面主数据需 daemon（host_fs / daemon 实体） 访问 daemon 依赖页；Then 主区渲染 `DaemonRequiredNotice`："⚠ {feature} 需要守护进程" + [配置我的 daemon]（展开 WorkspaceAcc
全文：.sillyspec/changes/archive/2026-07-26-2026-07-26-ungate-workspace-entry/requirements.md#FR-04
最近确认：ffb9a7cc1

## FR-unmapped-441 文档类页面 daemon 无关（不动）
变更：2026-07-26-2026-07-26-ungate-workspace-entry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成员（任意绑定状态）；When 访问文件中心 / 变更中心 / 成员管理 / 知识库 / 审计 / 审批 / 发布 / 事故；Then 正常浏览（数据在服务器，不经 daemon），无 daemon 要求、无空态
全文：.sillyspec/changes/archive/2026-07-26-2026-07-26-ungate-workspace-entry/requirements.md#FR-05
最近确认：ffb9a7cc1

## FR-unmapped-442 预设供应商模版一键填表单
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户进入「新建供应商」表单 用户点「＋自定义」预设；When 用户点一个预设（如 Kimi For Coding） 进入表单；Then 表单自动填好 name / base_url / auth_field / 默认模型 / 官网（api_key 留空给用户填） 所有字段空白，用户手填（行为同现
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-01
最近确认：13920f895

## FR-unmapped-443 预设分类排序展示
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 预设选择器展示；Then 按分类分组：官方 → 国内官方 → 聚合站，每家带图标；支持用量的标「💰 可查用量」
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-02
最近确认：13920f895

## FR-unmapped-444 用量查询端点
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户有一个支持用量的供应商（如 DeepSeek） 供应商 base_url 识别不到对应 handler；When 前端调 `POST /api/llm-providers/{id}/usage` 查询
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-03
最近确认：13920f895

## FR-unmapped-445 用量查询错误两态
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 上游瞬时失败（网络 / 5xx / 429 / 超时） 上游确定性失败（401 / 403 鉴权失败）；When 查询 查询；Then 后端 raise（HTTP 5xx），前端保留上次成功值 10 分钟 返回 `success:false, is_valid:false`，前端翻红（仍保留上次
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-04
最近确认：13920f895

## FR-unmapped-446 用量多窗口展示
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 供应商返回多 tier（如智谱 5 小时窗 + 周限额）；When 前端展示；Then 每个 tier 一行（plan_name / used / remaining / unit + 重置时间 + 进度条）
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-05
最近确认：13920f895

## FR-unmapped-447 用量触发方式
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户进入供应商列表页 用户点某行「查余额」按钮；When 页面加载完成 触发；Then 对支持用量的供应商自动查一次余额 手动刷新该供应商余额
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-06
最近确认：13920f895

## FR-unmapped-448 不支持用量的友好提示
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 不支持用量的供应商（百炼 / Anthropic 官方 / detect 不到）；When 列表展示；Then 显示「该供应商暂不支持余额查询」（不带 cc-switch 字样），不报错
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-07
最近确认：13920f895

## FR-unmapped-449 安全（SSRF + api_key）
变更：2026-07-28-2026-07-28-llm-provider-presets-and-usage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用量查询代查外部 URL api_key 处理；When 发请求前 全链路；Then 过 SSRF 防护（复用 `tool_policy.assert_public_hostname`，IPv4+IPv6） 明文不出后端 / 不入响应 / 不入日
全文：.sillyspec/changes/archive/2026-07-28-2026-07-28-llm-provider-presets-and-usage/requirements.md#FR-08
最近确认：13920f895

## FR-unmapped-454 菜单按功能域重组
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-001@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 用户已登录 SillyHub 且处于非 ppm 路径；When 查看侧边栏；Then 菜单按 5 组渲染（工作区/智能体/配置中心/协作治理/系统管理），各菜单项归属符合 design §5.1，且守护进程运行时位于配置中心组。
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-01
最近确认：82c01fcfc

## FR-unmapped-455 我的供应商独立菜单直达
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户具有 `llm_provider:read` 权限或为 platform admin 用户无 `llm_provider:read` 且非 platform；When 点击侧边栏"我的供应商" 查看侧边栏；Then 直达 `/settings/providers` 页面，可管理自己的供应商（复用 `LlmProviderSection`）。 不显示"我的供应商"菜单项。
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-02
最近确认：82c01fcfc

## FR-unmapped-456 技能管理 / MCP 管理独立菜单（平台级）
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 用户具有 `settings:admin` 权限或为 platform admin；When 点击侧边栏"技能管理"或"MCP 管理"；Then 分别直达 `/settings/skills`、`/settings/mcp`（平台级页面）。
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-03
最近确认：82c01fcfc

## FR-unmapped-457 设置页瘦身
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 用户打开 `/settings`；When 页面渲染；Then 仅显示工作区信息/智能体配置/安全策略/集成 4 个 Tab，默认选中工作区信息；无供应商 Tab、无 4 个 EntryCard 卡片入口。
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-04
最近确认：82c01fcfc

## FR-unmapped-458 供应商可见性可分配
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 后端 `permissions.py` 已含 `llm_provider:read`；When 重启后端；Then `seed_platform_admin_role` 自动将该权限绑定至 platform_admin 角色（无需 migration），且角色管理中可为任意角
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-05
最近确认：82c01fcfc

## FR-unmapped-459 菜单视觉统一
变更：2026-07-30-sidebar-menu-restructure
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 侧边栏渲染；When 查看任意菜单项；Then 图标均为 lucide 线条图标（含新增 3 项）、无 emoji；分组间距与选中高亮样式统一；ppm 隔离与 `navHidden` 二级页逻辑保持不变。
全文：.sillyspec/changes/archive/2026-07-30-sidebar-menu-restructure/requirements.md#FR-06
最近确认：82c01fcfc

## FR-unmapped-473 侧边栏一级菜单入口
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-007@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-01
最近确认：63710e533

## FR-unmapped-474 全局聚合视图
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-004@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-02
最近确认：63710e533

## FR-unmapped-475 聚合端点可见性越权防护
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-004@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-03
最近确认：63710e533

## FR-unmapped-476 卡片墙列表
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-04
最近确认：63710e533

## FR-unmapped-477 搜索与筛选
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-05
最近确认：63710e533

## FR-unmapped-478 带实时预览的重做表单
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-003@v1、D-006@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-06
最近确认：63710e533

## FR-unmapped-479 人设预览
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-07
最近确认：63710e533

## FR-unmapped-480 系统预置档案只读(保留前置变更行为)
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-08
最近确认：63710e533

## FR-unmapped-481 选档下拉视觉对齐
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-09
最近确认：63710e533

## FR-unmapped-482 工作区内页复用卡片墙
变更：2026-08-04-agent-profile-ui-redesign
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-08-04-agent-profile-ui-redesign/requirements.md#FR-10
最近确认：63710e533

## FR-unmapped-497 左主右辅布局
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 用户打开任一变更详情页（桌面宽屏 ≥1024px） 视口宽度 <1024px；When 页面渲染完成 页面渲染；Then 主体为两栏：左侧主线区（当前阶段操作 + 智能体执行日志），右侧 320px 次线侧栏（变更文件/会话调试/审核历史/任务看板） 退化为单列：主线在上，次线卡片
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-01
最近确认：12ea22a84

## FR-unmapped-498 会话与执行日志分离
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 详情页已加载；When 用户查看主线区；Then 只见「智能体执行日志」（流程自动 run），不见「会话」；「会话调试」出现在次线侧栏
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-02
最近确认：12ea22a84

## FR-unmapped-499 审核历史读真实数据
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 某变更存在审核记录（`change.stages.review_history` 非空） `review_history` 数组同时含 gate 形状（`{de；When 用户展开次线「审核历史」卡 渲染审核历史
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-03
最近确认：12ea22a84

## FR-unmapped-500 删除旧区块
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 详情页已加载；When 渲染完成；Then 不再出现「审批状态」区块；「审查记录」旧实现（读 listReviews 死表）被「审核历史」取代
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-04
最近确认：12ea22a84

## FR-unmapped-501 智能体入口收敛
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 详情页已加载且当前阶段有待办操作 主线「智能体执行日志」内含子步骤进度（SillySpecStepProgress）；When 用户查看主线「当前阶段操作区」 渲染；Then 推进/审核/触发智能体/运行验证门禁/Agent 供应商·模型/团队开关集中在该区内，页面其它位置无重复入口 其内嵌「触发智能体/执行下一步」按钮不渲染（组合时
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-05
最近确认：12ea22a84

## FR-unmapped-502 组件化与死代码清除
变更：2026-08-11-change-detail-layout-rework
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 本变更完成；When 查看代码结构；Then page.tsx 瘦身为编排层；7 个区块组件位于 `components/changes/detail/` 并各有测试；`handleExecute`/`ha
全文：.sillyspec/changes/archive/2026-08-11-change-detail-layout-rework/requirements.md#FR-06
最近确认：12ea22a84

## FR-unmapped-511 McpToken 列表展示
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-01
最近确认：23ffff4b7

## FR-unmapped-512 签发 McpToken
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-02
最近确认：23ffff4b7

## FR-unmapped-513 吊销 McpToken
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-03
最近确认：23ffff4b7

## FR-unmapped-514 workspace 子导航入口
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-04
最近确认：23ffff4b7

## FR-unmapped-515 viewer 无权限兜底
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-05
最近确认：23ffff4b7

## FR-unmapped-516 统计卡片
变更：2026-08-11-mcp-token-management-ui
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-11-mcp-token-management-ui/requirements.md#FR-06
最近确认：23ffff4b7

## FR-unmapped-559 新建会话表单新增工作区选择器
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-01
最近确认：b0f2a115c

## FR-unmapped-560 选工作区后自动联动机器选择器
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-02
最近确认：b0f2a115c

## FR-unmapped-561 选工作区后表单显示上下文提示
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-03
最近确认：b0f2a115c

## FR-unmapped-562 提交体携带 workspace_id
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-04
最近确认：b0f2a115c

## FR-unmapped-563 后端 workspace 归属校验
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-05
最近确认：b0f2a115c

## FR-unmapped-564 NewSessionFormValues 增加 workspaceId 字段
变更：2026-08-19-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-19-sessions-workspace-selector/requirements.md#FR-06
最近确认：b0f2a115c

## FR-unmapped-565 主题注册表与 brand 语义色阶
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-101@v1、D-003@v2
场景正文：
- 场景：默认场景 — Given `themes.ts` 定义 `blue`/`ai-native` 两套完整 ThemeDef（radius/shadow/font/spacing 共享）；When 前端构建；Then `:root` 注入 ai-native 变量值 + brand 阶紫阶值，`[data-theme="blue"]` 覆盖为旧蓝值 + brand 阶蓝阶值；
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-566 主题切换与持久化
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-101@v1、D-102@v1
场景正文：
- 场景：默认场景 — Given 用户在任一页面；When 点击顶栏主题切换按钮 刷新页面 / 新开标签 localStorage 无值或值非法；Then `<html data-theme>` 与 antd token 同步切换，全站即时生效；`localStorage["sillyhub-theme"]` 写入
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-567 antd 主题动态跟随
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-101@v1
场景正文：
- 场景：默认场景 — Given antd ConfigProvider token/components 改从 `useThemeStore` 当前主题取；When 切换主题；Then antd 组件（按钮/菜单选中/表格头/Tabs/Tag/Badge 等）跟随变色，无散落 hex
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-568 蓝色清扫
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given 198 处 `bg/text/border-blue-*`（56 文件）与 17 处 hex 及登录页渐变、kanban PALETTE、globals.css；When 执行清扫；Then 品牌用途（含全部浅档）改 `brand-*` 类或主题引用；真信息蓝保留 blue 阶（逐一判断）；grep 复核模式 `bg-blue|text-blue|b
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-569 会话页 AI 原生细节
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given /sessions 聊天流（turn-timeline 等）；When SSE 流式输出进行中；Then 末尾显示闪烁光标；等待首个响应块时显示 typing 三点指示；上下文引用以 chip 样式展示（数据源=turn 快照 whoLine，无自然接入位则仅交付样
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-570 blue 主题原样平移
变更：2026-08-20-frontend-ai-native-style
状态：active
摘要：默认场景
依据决策：D-102@v1、D-003@v2
场景正文：
- 场景：默认场景 — Given 用户切回 blue 主题；When 逐页核对核心页（工作区/会话/PPM 表格/登录/kanban）；Then 主色/选中态/表格头/卡片边框/按钮/徽章色与重构前同页一致（语义色位逐项核对，不要求像素 diff）
全文：.sillyspec/changes/archive/2026-08-20-frontend-ai-native-style/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-571 新建会话表单新增工作区选择器
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-01
最近确认：dc34d63a9

## FR-unmapped-572 选工作区后自动联动机器选择器
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-02
最近确认：dc34d63a9

## FR-unmapped-573 选工作区后表单显示上下文提示
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-03
最近确认：dc34d63a9

## FR-unmapped-574 提交体携带 workspace_id
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-04
最近确认：dc34d63a9

## FR-unmapped-575 后端 workspace 归属校验
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-05
最近确认：dc34d63a9

## FR-unmapped-576 NewSessionFormValues 增加 workspaceId 字段
变更：2026-08-20-sessions-workspace-selector
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-20-sessions-workspace-selector/requirements.md#FR-06
最近确认：dc34d63a9

## FR-unmapped-577 入口唯一化
变更：2026-08-20-workspace-nav-consolidate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 概览页；Then 无快速入口宫格（QuickEntryGrid 退役删除，全仓引用清零）
全文：.sillyspec/changes/archive/2026-08-20-workspace-nav-consolidate/requirements.md#FR-01
最近确认：4c9827c38

## FR-unmapped-578 菜单全量与滑动
变更：2026-08-20-workspace-nav-consolidate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任一非 standalone 子页；Then 顶部菜单 13 项（概览/组件/变更/会话/文件/扫描文档/运行时/智能体档案/Skills/MCP/MCP 令牌/成员/方案文件），href 与原宫格/现菜单
全文：.sillyspec/changes/archive/2026-08-20-workspace-nav-consolidate/requirements.md#FR-02
最近确认：4c9827c38

## FR-unmapped-579 子页菜单补全
变更：2026-08-20-workspace-nav-consolidate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given components / changes / changes-[cid] 等页；Then 渲染于 workspace layout 内含顶部菜单；topology 整屏页保留 standalone（无菜单，h-screen 零回归）
全文：.sillyspec/changes/archive/2026-08-20-workspace-nav-consolidate/requirements.md#FR-03
最近确认：4c9827c38

## FR-unmapped-580 头部横幅
变更：2026-08-20-workspace-overview-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工作区详情页已加载；Then 顶部渲染渐变横幅（from-brand-700 via-brand-800 to-slate-950，blue 主题自动回旧蓝渐变），含工作区名（大字白）、状态
全文：.sillyspec/changes/archive/2026-08-20-workspace-overview-redesign/requirements.md#FR-01
最近确认：040fbc235

## FR-unmapped-581 统计卡行
变更：2026-08-20-workspace-overview-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工作区详情页已加载；Then 统计四卡（项目组组件/进行中变更/已归档变更/运行时阶段）以图标+数值+标签形态渲染，图标软底 bg-brand-50 text-brand-600
全文：.sillyspec/changes/archive/2026-08-20-workspace-overview-redesign/requirements.md#FR-02
最近确认：040fbc235

## FR-unmapped-582 快速入口宫格
变更：2026-08-20-workspace-overview-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工作区详情页已加载；Then 6 个入口（项目组件/变更中心/扫描文档/运行时/智能体档案/方案文件）以图标卡片宫格渲染（grid 3 列），lucide 图标+中文标签，href 与现状一
全文：.sillyspec/changes/archive/2026-08-20-workspace-overview-redesign/requirements.md#FR-03
最近确认：040fbc235

## FR-unmapped-583 分组信息区
变更：2026-08-20-workspace-overview-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 工作区详情页已加载；Then antd Collapse ghost 两组：「基本信息」默认展开（路径字段/类型/角色/用途/时间戳/编辑态/绑定守护进程区 WorkspaceDaemonS
全文：.sillyspec/changes/archive/2026-08-20-workspace-overview-redesign/requirements.md#FR-04
最近确认：040fbc235

## FR-unmapped-584 行为等价与测试
变更：2026-08-20-workspace-overview-redesign
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 重构完成；Then 所有数据 hook/编辑保存/绑定交互行为与重构前等价（九块映射表 10 行对账）
全文：.sillyspec/changes/archive/2026-08-20-workspace-overview-redesign/requirements.md#FR-05
最近确认：040fbc235

## FR-unmapped-585 统一错误条
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任一子页面加载失败；Then 渲染公共 ErrorBanner（destructive 主题色+可选重试按钮），8 处（含 explorer:124-131 与 shared-daemon-
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-01
最近确认：5959b30d9

## FR-unmapped-586 返回链接规范化
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given components/skills/mcp/mcp-tokens 页头；Then 无 title 内 hack；PageHeader actions 统一"← 工作区"链接，目标一致 /workspaces/${id}
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-02
最近确认：5959b30d9

## FR-unmapped-587 空态与列表卡质感
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given skills/mcp/members/components 无数据；Then 渲染现成 EmptyState；skills/mcp 列表卡 SectionCard hover="lift"
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-03
最近确认：5959b30d9

## FR-unmapped-588 语义色主题化
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given changes/explorer/mcp/mcp-tokens 的 tone 卡与提示文字；Then amber/emerald/red/blue 硬编码（5 处）改 warning/success/error/info 语义色+透明度修饰，双主题跟随
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-04
最近确认：5959b30d9

## FR-unmapped-589 表格/按钮/文案规格统一
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given members 与 mcp-tokens 手写表、3 页 h-7 小按钮、members 英文文案；Then 两表表头规格逐字段一致（px-4 py-3 bg-muted/40/行 hover）；小按钮换 shadcn Button size=sm（components
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-05
最近确认：5959b30d9

## FR-unmapped-590 容器与锚修正
变更：2026-08-20-workspace-subpages-style-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given sessions 右侧面板与 explorer 布局；Then session-section 自写容器换 SectionCard；explorer 高度锚 56px→64px、antd Button（2 处）换 shadc
全文：.sillyspec/changes/archive/2026-08-20-workspace-subpages-style-unify/requirements.md#FR-06
最近确认：5959b30d9

## FR-unmapped-591 可拖拽手柄
变更：2026-08-21-table-column-resize
状态：active
摘要：默认场景
依据决策：D-502@v2
场景正文：
- 场景：默认场景 — Given DataTable 渲染的表格；Then `typeof width === "number"` 的列表头右缘渲染拖拽手柄（col 光标/hover 主题高亮）；无 width 或 string wid
全文：.sillyspec/changes/archive/2026-08-21-table-column-resize/requirements.md#FR-01
最近确认：16c8fa5dc

## FR-unmapped-592 拖拽不误触排序
变更：2026-08-21-table-column-resize
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 排序列的表头手柄；When 按住手柄拖拽；Then 不触发 onChange(sorter)；3px 内微动视为点击不误判拖拽
全文：.sillyspec/changes/archive/2026-08-21-table-column-resize/requirements.md#FR-02
最近确认：16c8fa5dc

## FR-unmapped-593 PPM 资源表覆盖
变更：2026-08-21-table-column-resize
状态：active
摘要：默认场景
依据决策：D-502@v2
场景正文：
- 场景：默认场景 — Given PpmResourceTable（projects/customers/project-stakeholders）；Then 业务列经默认宽兜底（类型映射 110-200px）全部可拖
全文：.sillyspec/changes/archive/2026-08-21-table-column-resize/requirements.md#FR-03
最近确认：16c8fa5dc

## FR-unmapped-594 受控回调接口
变更：2026-08-21-table-column-resize
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 页面传 onColumnsResize；Then 拖拽结束回调 { [dataIndex]: width }；不传=纯本地拖拽
全文：.sillyspec/changes/archive/2026-08-21-table-column-resize/requirements.md#FR-04
最近确认：16c8fa5dc

## FR-unmapped-595 适配层删除与消费方直迁
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given `interactive-session-panel.tsx`（127 行适配层）存在且被 4 个渲染消费方引用；When 执行本变更；Then 该文件整文件删除；4 消费方（runtime-session-dialog.tsx...:338 /
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-01
最近确认：4d7adc1d9

## FR-unmapped-596 类型 import 归位
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 4 消费方从适配层 import 5 个类型（SessionProcessItem / SessionToolEvent /；When 适配层删除；Then import 路径改指 `@/components/daemon/turn-timeline`（5 类型已全部导出于
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-02
最近确认：4d7adc1d9

## FR-unmapped-597 dialog 分支 chrome 基元 antd 化
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-001@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given session-panel.tsx dialog 分支含 5 处 shadcn 基元（UiButton :2334/2352/2398/2409、；When 统一 antd；Then UiButton×4 → antd Button（新建/团队分析默认 32px；打断 size="small" 24px；
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-03
最近确认：4d7adc1d9

## FR-unmapped-598 TurnStatusBadge antd 化
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given repo://sillyhub/frontend/src/components/daemon/turn-timeline.tsx:930-983 TurnStatusBadge 为纯样式 span 胶囊（两模式共用）；When 统一 antd；Then 内部渲染改 antd Badge status：running/interrupting→processing、
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-04
最近确认：4d7adc1d9

## FR-unmapped-599 SessionInputBar 基元 antd 化
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given session-input-bar.tsx 含 2 处 shadcn Button（发送 :196、📎 ghost :169）；When 统一 antd；Then 发送 → antd Button type="primary"；📎 → antd Button type="text"；
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-05
最近确认：4d7adc1d9

## FR-unmapped-600 测试迁移与守护
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 3 套 ISP 测试（interactive-session-panel{,-offline,-changeid}.test.tsx，；When 适配层删除；Then 迁移为 `session-panel-dialog{,-offline,-changeid}.test.tsx` 直测
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-06
最近确认：4d7adc1d9

## FR-unmapped-601 主题铁律合规
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given FRONTEND_PAGE_STYLE §0.5 双主题系统（blue/ai-native）；When 本次 antd 化；Then 新增代码零硬编码 hex；antd 组件色不写 style 覆盖（差异走 ConfigProvider
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-07
最近确认：4d7adc1d9

## FR-unmapped-602 团队变更顺序协调
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given team-unify task-11 allowed_paths 与本变更正面重叠；When 本变更执行；Then 硬前置门：本变更先于 task-11 执行并合入 main；执行期若发现 task-11 已
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-08
最近确认：4d7adc1d9

## FR-unmapped-603 注释锚点校正
变更：2026-08-22-session-panel-unify
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 3 个文件注释含适配层历史锚点（repo://sillyhub/frontend/src/components/ask-user-dialog-card.tsx:15、；When 适配层删除；Then 注释中指向已删文件的行号锚点按 CLAUDE.md 规则 18 校正（仅注释零逻辑改动）。
全文：.sillyspec/changes/archive/2026-08-22-session-panel-unify/requirements.md#FR-09
最近确认：4d7adc1d9

## FR-unmapped-604 共享门户组件
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given /sessions 页现有外壳（列表+两态+page 面板+页级数据）；When 提取为 SessionsPortal；Then 组件接受可选 scope（WorkspaceScope{kind,workspaceId} | ChangeScope{kind,workspaceId,cha
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-01
最近确认：3f7192561

## FR-unmapped-605 工作区入口
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given /workspaces/[id]/sessions 页；When 本变更后；Then 整页渲染 `<SessionsPortal scope={kind:workspace, workspaceId}>`——列表仅该工作区、创建锁定绑定 work
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-02
最近确认：3f7192561

## FR-unmapped-606 变更级入口
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 变更详情侧边窄卡与无专属会话页；When 本变更后；Then 侧卡变入口（listChangeSessions 仅本人过滤取前 3 条预览 + 打开工作台按钮）；新路由 /workspaces/[id]/changes/[
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-03
最近确认：3f7192561

## FR-unmapped-607 列表 scope 化
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given SessionListPanel 现仅支持全局真分页；When 加可选 scope；Then workspace/change 模式切 listWorkspaceAgentSessions(include_ended)/listChangeSession
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-04
最近确认：3f7192561

## FR-unmapped-608 深链恢复
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 旧工作区页有 ?session= 初始选中；When 门户化后；Then SessionsPortal 统一支持 ?session=<id> 挂载时解析初始选中（无效/无参静默忽略），三入口通用；变更入口卡直达经此链路。
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-05
最近确认：3f7192561

## FR-unmapped-609 退役清理
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given workspace-session-section 与 change-session-section 两组件及其测试；When 消费面重组完成后；Then 两组件与两测试文件删除，全仓无 dangling import；语义迁移四项（仅本人过滤/创建绑定/ended 恢复/深链）均有新测试落点；ended 会话恢复
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-06
最近确认：3f7192561

## FR-unmapped-610 回归与实证
变更：2026-08-22-workspace-sessions-portal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 全部改动；When 收尾；Then 全量 vitest/tsc/lint 零失败；受影响测试（sessions 页 18 用例、list-panel、new-session-form、change
全文：.sillyspec/changes/archive/2026-08-22-workspace-sessions-portal/requirements.md#FR-07
最近确认：3f7192561

## FR-unmapped-623 工作区入口解除门禁
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已登录用户在 `/m/workspaces` 列表页看到工作区卡片；When 点击卡片；Then 导航到 `/m/workspaces/[id]`（经主页 redirect 落到变更列表），不再提示"请在电脑端打开"
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-01
最近确认：976a21965

## FR-unmapped-624 工作区主页与双 Tab 导航
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于 `/m/workspaces/[id]/changes` 或 `/m/workspaces/[id]/sessions`；When 顶栏段控切换「变更中心 / 会话」；Then 路由跳转到对应列表页（真实路由，非 query）；顶栏显示返回箭头（→ /m/workspaces）与工作区名
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-02
最近确认：976a21965

## FR-unmapped-625 变更列表（三 Tab + 搜索 + 筛选）
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于 `/m/workspaces/[id]/changes`；When 切换 进行中/已归档/快速修复 Tab 输入关键词或打开筛选抽屉（阶段/只看待我处理）后应用 点击变更卡片；Then 列表与计数徽标（["changesTabTotals"]）刷新；进行中列表按 changesRefetchInterval 语义智能轮询 列表按条件过滤（que
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-03
最近确认：976a21965

## FR-unmapped-626 变更详情与审批操作
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于变更详情页；When 点击 通过/驳回 点击文档 点击关联会话卡；Then 可见：阶段步骤条、审批操作卡（有待办时默认展开）、规范文档列表、阶段时间线、执行日志（折叠）、关联会话卡、任务区桌面引导条 调 submitStageRevie
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-04
最近确认：976a21965

## FR-unmapped-627 快速修复（quicklog）Tab
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在变更列表切到「快速修复」Tab；When 点击条目；Then 展示 quicklog 卡片列表（listQuicklogEntries + quicklogPollInterval 轮询语义） MobileDetailSh
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-05
最近确认：976a21965

## FR-unmapped-628 会话列表
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于 `/m/workspaces/[id]/sessions`；When 点击会话卡片 通过卡片菜单执行 删除/归档/取消归档；Then 展示按机器分组的会话卡片（在线/离线分组、状态 Tab 全部/进行中/已归档）；数据用 listAgentSessions + workspace_id，que
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-06
最近确认：976a21965

## FR-unmapped-629 会话对话（SessionPanel 第四宿主，完整内核）
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于 `/m/workspaces/[id]/sessions/[sid]`；When 会话被切换（路由 sid 变化）；Then 直接渲染 SessionPanel(mode="page", key=sid)，具备桌面同等全部能力：SSE 流式对话、发消息、中断、结束/重开、消息队列、子代
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-07
最近确认：976a21965

## FR-unmapped-630 新建会话（两步浮层移动化）
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在会话列表点 ＋；When 依次选择机器、智能体（PreSessionPicker variant="bottomSheet" 底部抽屉两步）；Then 进入预会话态（SessionPanel sessionId=null + preContext），首句发送 createSession 成功后切真会话路由
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-08
最近确认：976a21965

## FR-unmapped-631 布局层级（列表 vs 钻取）
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户位于列表页（changes / sessions）；Then 保留底部 5 Tab（平台切换高亮）；位于钻取页（changes/[cid]、sessions/[sid]） 隐藏底部 Tab，页面自渲染返回顶栏（m/layo
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-09
最近确认：976a21965

## FR-unmapped-632 深链兜底
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 手机 UA 访问桌面专属门户 URL `/workspaces/[id]/changes/[cid]/sessions` 或 `/workspaces/[id]；Then redirect 到 `/m/workspaces/[id]/sessions`（不落 404）
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-10
最近确认：976a21965

## FR-unmapped-633 桌面零回归
变更：2026-08-26-mobile-workspace-page
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 桌面 UA 或未传 variant 的既有调用点；Then SessionPanel/PreSessionPicker 行为与改动前完全一致；`(dashboard)/**` 全部既有测试保持绿色；m/ 既有页面（log
全文：.sillyspec/changes/archive/2026-08-26-mobile-workspace-page/requirements.md#FR-11
最近确认：976a21965
