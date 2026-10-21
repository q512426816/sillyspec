---
author: sillyspec-fr-index
created_at: 2026-10-08T02:25:50.702Z
---

# FR 索引 — backend

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/backend.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-auto-backend-001 ctx 打标会话身份锚定
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-001@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given 某 agent 会话内执行 `sillyspec run --change X`（或 quick） zcode 进程（env 无会话 id） own 命中文件被；When CLI 探测本地日志文件 锚定器运行 组装 detected；Then 仅「本 run 所属 agent 会话（锚定主会话）及其子代理（zcode parent_id 链，不比 directory）」的条目被写入 ctx=X，其余条
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-01
最近确认：353eb11b0

## FR-auto-backend-002 quick/change 双向互斥
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-006@v2
场景正文：
- 场景：默认场景 — Given quick 会话内的 run（quickId=quick-xxx） 普通变更 run（--change X）；When 更新 own 条目 更新 own 条目；Then entry 置 quick_id=quick-xxx 且 change_key=null entry 置 change_key=X 且 quick_id=nul
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-02
最近确认：353eb11b0

## FR-auto-backend-003 平台 ctx-owner 归属解析
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1、D-006@v2
场景正文：
- 场景：默认场景 — Given 平台收到无 hub_session_id 的推送，条目 ctx=Q（quick_id 优先于 change_key） 平台 pi 会话已通过自身 run 登记变；When 解析 Q 的 owner 本地 zcode 推送 ctx=X 的条目 归属解析
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-03
最近确认：353eb11b0

## FR-auto-backend-004 hub 分支 own-only 语义
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-007@v1
场景正文：
- 场景：默认场景 — Given daemon 派发会话（SILLYHUB_SESSION_ID 注入）内执行 run；When CLI 推送；Then payload entries = 留底条目 ∩ own 集合（按 log_path）；hub 会话名下不再出现非本会话产物（旧 CLI 过渡期除外，见 NFR
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-04
最近确认：353eb11b0

## FR-auto-backend-005 存量清理与重建
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-004@v2
场景正文：
- 场景：默认场景 — Given 生产库存在错配时代数据；When 执行数据迁移（CLI 升级后一次性运维动作，不随 backend 发布自动前滚）；Then ① platform_agent_logs.agent_session_id 全置 NULL；② origin=tool_report 会话软删；③ chang
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-05
最近确认：353eb11b0

## FR-auto-backend-006 无关日志零出现
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-001@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 本地某会话从未执行 sillyspec run；When 其日志文件在 cwd 活跃窗口内被其它会话的 run 探测到；Then 该条目不出现在任何推送中，平台任何会话/变更/quicklog 视图不可见
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-06
最近确认：353eb11b0

## FR-auto-backend-007 协议文档更新
变更：2026-09-11-agent-log-attribution-refactor
状态：active
摘要：默认场景
依据决策：D-006@v2、D-007@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given 协议 docs/platform-agent-log-protocol.md；When 本变更发布；Then §1 推送范围改 own 条目、§3 补 per-harness 锚定规则与回退、会话化上下文改双向互斥与 ctx-owner 平台行为
全文：.sillyspec/changes/archive/2026-09-11-agent-log-attribution-refactor/requirements.md#FR-07
最近确认：353eb11b0

## FR-auto-backend-008 批量导出入口
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 会话列表某工作区组处于多选态且勾选了 1~N 个会话 勾选数为 0 请求 session_ids 数量 >50 或为空；When 用户点击批量操作条上的「导出选中（N）」并在档位下拉中选择「导出对话（Markdown）」或「导出完整信息（JSON+附件）」 批量栏渲染 请求到达后端；Then 前端以 POST 调用 `/api/daemon/sessions/export`（session_ids=勾选集，tier=所选档），按钮进入 loading
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-01
最近确认：8caa2f56b

## FR-auto-backend-009 两档内容口径
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个含多轮对话的普通会话 同一会话 群聊会话（含影子成员投影行）；When 导出 chat 档 导出 full 档 导出任一档；Then Markdown 含会话头（标题/时间/runtime/轮数）+ 按 run 分轮的用户消息（`user_input` 行）与助手正文（`stdout` 行经噪
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-02
最近确认：8caa2f56b

## FR-auto-backend-010 权限与存在性
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 会话属其他用户、或已软删、或群会话且请求者非参与者非 workspace admin；When 导出请求包含该会话；Then 整个请求 404（不泄露存在性，不做部分成功）
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-03
最近确认：8caa2f56b

## FR-auto-backend-011 响应矩阵与文件名
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 单会话 chat 档请求 多会话 chat 或任一 full 请求；When 成功 成功；Then 响应 `text/markdown`，文件名 `{标题 sanitize}_{id前8}.md` 响应 `application/zip`，文件名 `会话导出_
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-04
最近确认：8caa2f56b

## FR-auto-backend-012 截断与体量防护
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 单会话日志 >20000 行（agent_run_logs 行，每会话独立计数） full 档整包附件总量（按附件元数据 bytes 预聚合）>512MB 单个；When 导出 导出请求 导出 full 档；Then 保留最早 20000 行，产物内标注 `truncated: true` + `dropped_rows`（丢弃行数） 返回 413 与明确提示（分批导出），预
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-05
最近确认：8caa2f56b

## FR-auto-backend-013 行级导出入口
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 会话行 hover；When 用户点击操作列新增的下载图标并选择档位；Then 以单会话 id 走同一导出链路
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-06
最近确认：8caa2f56b

## FR-auto-backend-014 类型同步
变更：2026-09-14-session-export
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 后端 `SessionExportRequest` schema 落地；When 跑 `pnpm gen:types`；Then `api-types.ts` 含该请求类型且对既有类型零破坏，`openapi.json` 同步提交
全文：.sillyspec/changes/archive/2026-09-14-session-export/requirements.md#FR-07
最近确认：8caa2f56b

## FR-unmapped-116 类型列自动推断
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更目录包含 `tasks/` 子目录和 `plan.md`/`design.md` 变更目录名包含 "quick" 或仅包含 MASTER.md + requ；When Parser 扫描该目录 Parser 扫描该目录 Parser 扫描该目录 Parser 扫描该目录；Then `change_type` 被推断为 `"feature"` `change_type` 被推断为 `"quick"` `change_type` 被推断为 `
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-01
最近确认：8fbf8a5df

## FR-unmapped-117 影响组件自动推断
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更目录下有 `module-impact.md` 变更目录下无 `module-impact.md` 但有 `tasks.md` 或 `tasks/*.md`；When Parser 扫描该目录 Parser 扫描该目录 Parser 扫描该目录；Then `affected_components` 从 module-impact.md 提取模块名 `affected_components` 从文件路径中提取模块名
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-02
最近确认：8fbf8a5df

## FR-unmapped-118 reparse 覆盖策略
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given DB 中 `change_type` 为 null DB 中 `change_type` 已有非 null 值 reparse 执行时；When reparse 执行时 Parser 推断出 change_type reparse 执行时 Parser 推断出 affected_components；Then DB 中的 change_type 被更新为推断值 DB 中的 change_type 不被覆盖 DB 中的 affected_components 总是被更新
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-03
最近确认：8fbf8a5df

## FR-unmapped-119 状态列展示 human_gate
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更的 `human_gate` 不为空且不为 `"none"` 变更的 `human_gate` 为空或 `"none"`；When 前端渲染状态列 前端渲染状态列；Then 显示对应中文待办 Badge（如"待提案审核"、"待人工测试"） 根据 `current_stage` 显示阶段状态
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-04
最近确认：8fbf8a5df

## FR-unmapped-120 阶段列 null 兜底
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更的 `current_stage` 为 null 或 undefined；When 前端渲染阶段列；Then 显示 "draft" badge
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-05
最近确认：8fbf8a5df

## FR-unmapped-121 类型列颜色映射
变更：2026-06-08-2026-06-08-change-center-columns
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When 前端渲染类型列 前端渲染类型列 前端渲染类型列；Then 显示蓝色 Badge 显示黄色 Badge 显示紫色 Badge
全文：.sillyspec/changes/archive/2026-06-08-2026-06-08-change-center-columns/requirements.md#FR-06
最近确认：8fbf8a5df

## FR-unmapped-143 单个会话撤销
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户有活跃会话 会话不属于目标用户或已撤销；When Platform Admin 调用 DELETE /api/users/{id}/sessions/{session_id} 调用 DELETE /api/us；Then 该会话被标记为 revoked，写入审计日志 返回 404
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-01
最近确认：8fbf8a5df

## FR-unmapped-144 批量撤销会话
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户有 N 个活跃会话；When Platform Admin 调用 POST /api/users/{id}/sessions/revoke-all；Then 所有活跃会话被撤销，返回 revoked_count，写入审计日志
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-02
最近确认：8fbf8a5df

## FR-unmapped-145 密码重置审计标记
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Platform Admin 重置用户密码 传入 force_change_on_next_login=false 或不传；When 传入 force_change_on_next_login=true 重置密码；Then 审计日志 details_json 包含 force_change_on_next_login=true 标记 details_json 中 force_cha
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-03
最近确认：8fbf8a5df

## FR-unmapped-146 用户 Workspace 角色查询
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户属于 Workspace A (role: developer) 和 Workspace B (role: reviewer) 用户不属于任何 Worksp；When Platform Admin 调用 GET /api/users/{id}/workspaces 调用 GET /api/users/{id}/workspac；Then 返回 [{workspace_name: "A", workspace_slug: "a", role_name: "developer"}, ...] 返回空
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-04
最近确认：8fbf8a5df

## FR-unmapped-147 前端操作列优化
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户列表展示；When 管理员查看操作列；Then 只看到"详情"链接，点击打开 Drawer
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-05
最近确认：8fbf8a5df

## FR-unmapped-148 Drawer 增强
变更：2026-06-10-user-management-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户详情 Drawer 打开 会话 Tab 展示 会话 Tab 展示；When 查看"所属 Workspace" Tab 管理员点击某个会话的"撤销"按钮 管理员点击"撤销全部会话"；Then 显示 workspace name + role name 列表 该会话被撤销 所有活跃会话被撤销
全文：.sillyspec/changes/archive/2026-06-10-user-management-v2/requirements.md#FR-06
最近确认：8fbf8a5df

## FR-unmapped-159 Workspace 持久化默认 agent
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个已存在的 workspace（`default_agent` 列存在，可为 NULL） workspace 当前 `default_agent="claud；When 所有者通过 `PATCH /api/workspaces/{id}` 传 `{"default_agent": "claude"}` 所有者 PATCH 传 `；Then 该 workspace 的 `default_agent` 更新为 `"claude"`，`GET /api/workspaces/{id}` 返回 `defa
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-01
最近确认：4b0733057

## FR-unmapped-160 provider 解析优先级（三入口共用）
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace.default_agent="claude"，且未在触发时显式传 provider workspace.default_agent="cla；When 任意入口（start_run / start_stage_dispatch / start_scan_dispatch）分发 分发 分发；Then 透传给 `dispatch_to_daemon` 的 `provider="claude"` 透传的 `provider="codex"`（显式 > 默认） 透
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-02
最近确认：4b0733057

## FR-unmapped-161 placement 严格匹配 + 无在线回退
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户有 claude（在线）、codex（在线）、hermes（在线）三个 runtime 用户仅有 codex（在线）、hermes（在线），claude 离；Then 返回 provider="claude" 的 runtime 返回 codex 或 hermes 中一个在线 runtime（ORDER BY last_hea
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-03
最近确认：4b0733057

## FR-unmapped-162 自动调度链路自动使用默认 agent
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace.default_agent="claude"，change 处于自动调度（`auto_dispatch_next_step` → `disp；When stage 自动分发执行；Then `start_stage_dispatch` 内部读 workspace.default_agent，命中 claude（无需改 dispatch.py 自动调
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-04
最近确认：4b0733057

## FR-unmapped-163 task 触发支持显式 provider
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 前端 task 触发面板，用户在下拉选择 "codex"；When POST `/api/workspaces/{id}/agent/runs` body 含 `"provider": "codex"`；Then `create_agent_run` 透传给 `start_run(provider="codex")`，最终命中 codex
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-05
最近确认：4b0733057

## FR-unmapped-164 手动 stage dispatch / scan-generate 支持显式 provider
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 前端手动重跑 stage / scan 触发面板，用户选择某 provider；When 对应 HTTP 入口收到 `provider` 字段；Then 透传到 `start_stage_dispatch` / `start_scan_dispatch`，覆盖 workspace.default_agent
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-06
最近确认：4b0733057

## FR-unmapped-165 前端 workspace 设置页默认 agent 下拉
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace 设置页打开，daemon 注册了 claude / codex / hermes（部分在线）；When 渲染"默认 Agent"下拉；Then 选项 = 在线 runtime 的 distinct provider（用 PROVIDER_META 显示 label/icon），含"未设置"选项；默认选中
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-07
最近确认：4b0733057

## FR-unmapped-166 前端触发面板 agent 下拉默认联动
变更：2026-06-14-2026-06-14-agent-runtime-selection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace.default_agent="claude"；When 打开 task / stage / scan 触发面板；Then agent 下拉默认显示"claude"（或"使用默认(claude)"），用户可临时改选
全文：.sillyspec/changes/archive/2026-06-14-2026-06-14-agent-runtime-selection/requirements.md#FR-08
最近确认：4b0733057

## FR-unmapped-167 数据模型与迁移
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-168 Permission 枚举扩展
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-169 角色管理 - 列表与详情
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-170 角色管理 - 创建
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-171 角色管理 - 更新与状态切换
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-172 角色管理 - 删除前置检查
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-173 组织管理 - 树形结构
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-174 组织管理 - 创建与更新
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-175 组织管理 - 删除前置检查
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-176 用户管理 - CRUD 扩展
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-177 用户管理 - 自保护与最后管理员保护
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-11
最近确认：98d3e56dd

## FR-unmapped-178 用户管理 - 登录权限控制
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-12
最近确认：98d3e56dd

## FR-unmapped-179 现有 /api/users 端点兼容
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-13
最近确认：98d3e56dd

## FR-unmapped-180 前端 /admin 路由鉴权
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-14
最近确认：98d3e56dd

## FR-unmapped-181 前端 settings 剥离
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-15
最近确认：98d3e56dd

## FR-unmapped-182 审计覆盖
变更：2026-06-16-admin-org-role-center
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-admin-org-role-center/requirements.md#FR-16
最近确认：98d3e56dd

## FR-unmapped-183 Admin 签发 API Key
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-184 Admin 列出 API Keys
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-185 Admin 吊销 API Key
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-186 API Key 鉴权（X-API-Key header）
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-187 鉴权 dependency header 优先级
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-188 API Key 持久化 last_used_at
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-189 daemon CLI --api-key 选项
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-190 daemon config.json 持久化 api_key
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-191 前端 API Keys 管理页
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-192 runtimes 页面启动命令优先用 API Key
变更：2026-06-16-daemon-api-key
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-daemon-api-key/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-193 列出 workspace 成员
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-01
最近确认：509d92bc6

## FR-unmapped-194 模糊搜索用户
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-02
最近确认：509d92bc6

## FR-unmapped-195 添加成员
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-03
最近确认：509d92bc6

## FR-unmapped-196 修改成员角色
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-04
最近确认：509d92bc6

## FR-unmapped-197 移除成员
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-05
最近确认：509d92bc6

## FR-unmapped-198 传递所有权
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-06
最近确认：509d92bc6

## FR-unmapped-199 前端 Members tab
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-07
最近确认：509d92bc6

## FR-unmapped-200 添加成员对话框
变更：2026-06-16-workspace-members
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-16-workspace-members/requirements.md#FR-08
最近确认：509d92bc6

## FR-unmapped-201 workspace 路径来源字段（覆盖 D-004@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given workspaces 表 创建 path_source=daemon-client 的 workspace 现有/新 server-local workspac；When 应用迁移 提交 WorkspaceCreate 未指定 path_source；Then 新增 `path_source VARCHAR(20) NOT NULL DEFAULT 'server-local'` 与 `daemon_runtime_i
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-01
最近确认：686ca0f7e

## FR-unmapped-202 agent run 强绑 daemon 路由 + 离线失败（覆盖 D-001@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given path_source=daemon-client 的 workspace 发起 agent run 绑定 daemon 离线 path_source=serv；When dispatch_to_daemon 选 runtime dispatch dispatch；Then 使用 `workspace.daemon_runtime_id`（覆盖 `_get_online_runtime(user_id)` 的 user 级选择） 抛
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-02
最近确认：686ca0f7e

## FR-unmapped-203 前端 daemon 目录树形浏览（覆盖 D-005@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 已选在线 daemon daemon 离线或 RPC 超时；When 用户在创建表单展开目录节点 list-dir 调用；Then 前端调 `POST /api/daemon/runtimes/{id}/list-dir {path}`，渲染返回的 `{name,type}[]` 子节点（懒
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-03
最近确认：686ca0f7e

## FR-unmapped-204 list_dir allowed_roots 白名单（覆盖 D-002@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given daemon config.allowed_roots 配置 allowed_roots 未显式配置；When list_dir 请求 path daemon 启动；Then daemon 校验 path 必须在某 allowed_root 之下；越界返回 error.code=forbidden（前端 403） 默认 `[homed
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-04
最近确认：686ca0f7e

## FR-unmapped-205 spec 按需下发与回传（覆盖 D-003@v1, D-006@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-003@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given daemon-client workspace 的 agent run 准备执行 agent 执行完成 spec 列表/内容读取；When daemon task-runner 启动 daemon 收尾 前端查询；Then 调 `GET /api/spec-workspaces/{ws_id}/bundle` 拉 tar，解到本地 `~/.sillyhub/daemon/specs
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-05
最近确认：686ca0f7e

## FR-unmapped-206 daemon-client 扫描派发（覆盖 D-003@v1）
变更：2026-06-18-2026-06-18-workspace-client-path
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 创建 daemon-client workspace daemon-client workspace 的 scan/scan-generate/reparse；When create 执行 触发；Then 跳过 `_ensure_spec_workspace` 本地 copytree（backend 读不到客户端路径） 判断 path_source，daemon-
全文：.sillyspec/changes/archive/2026-06-18-2026-06-18-workspace-client-path/requirements.md#FR-06
最近确认：686ca0f7e

## FR-unmapped-252 transport 全局配置开关
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given backend 未设置 `SPEC_TRANSPORT` env `SPEC_TRANSPORT=tar` `SPEC_TRANSPORT` 为非法值；When Settings 加载 Settings 加载 Settings 加载
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-253 shared 模式零改动（向后兼容）
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given `transport=shared`；When scan/stage dispatch；Then `build_claim_payload` 透传 spec_root（容器路径），prompt 用宿主路径
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-254 tar 模式 prompt 用 daemon 本地路径
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-001@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given `transport=tar`；When `build_scan_bundle` / `start_stage_dispatch` 生成 prompt；Then `--spec-root = ~/.sillyhub/daemon/specs/{ws}`（`resolve_prompt_spec_root` helper）
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-255 tar 模式 build_claim_payload 透传 workspace_id + transport，不透传 spec_root
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-007@v1
场景正文：
- 场景：默认场景 — Given `transport=tar` 且 interactive lease（scan/stage）；When `build_claim_payload`；Then 透传 `transport`/`transportMode` + `workspaceId`/`workspace_id`，**不 set**
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-256 tar 模式 interactive 路径 spec pull（session 开始）
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-003@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given `transport=tar` 且 daemon 收到 interactive lease；When `_startInteractiveSession` 创建 session（driver 启动前）；Then 调 `spec-sync.pullSpecBundle(client, wsId)` 拉 backend spec bundle 解到
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-257 tar 模式 interactive 路径 postSpecSync（session 终态）
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given `transport=tar` 且 scan 所有 step 完成；When `onSessionEnd` 触发（session 终态）；Then 调 `spec-sync.postSpecSync` 打 tar 整树 → `POST /spec-workspace/sync`
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-258 backend apply_sync 接收 tar 回传（复用）
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given daemon `POST /spec-workspace/sync`（tar）；When `apply_sync(workspace_id, tar_bytes)`；Then 解 tar 覆盖 `/data/{ws}`（保留 `.runtime/`）+ reparse → ScanDocument 入库 +
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-259 过时测试断言修正
变更：2026-06-23-spec-transport-tar-sync
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given `test_context_builder.py` 行 142/162；When 重写；Then tar 模式断言 prompt 含 `~/.sillyhub/daemon/specs/{ws}`，shared 模式含宿主路径；
全文：.sillyspec/changes/archive/2026-06-23-spec-transport-tar-sync/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-272 平台管理员全局查看与操作资源
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 当前用户是平台管理员 当前用户是平台管理员 当前用户是平台管理员；When 访问 daemon runtime 分页列表 对非本人 runtime 执行别名更新、启用、禁用或删除 访问 workspace 列表；Then 返回全部用户的 runtime，并包含 owner 展示信息 后端允许操作，并沿用现有绑定 workspace 时删除返回 409 的保护 返回全部未删除 wo
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-01
最近确认：4389ebf90

## FR-unmapped-273 普通账号权限边界不扩大
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 当前用户不是平台管理员 当前用户不是平台管理员；When 查询 daemon runtime 分页列表 查询 workspace 列表并传入其他人的 `user_id`；Then 只返回该用户自己的 runtime 仍只返回该用户已有 `workspace:read` 权限的 workspace
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-02
最近确认：4389ebf90

## FR-unmapped-274 两类资源支持独立别名
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-002@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given runtime 或 workspace 尚未设置 `display_alias` 用户在卡片中保存新的别名；When 前端渲染卡片标题 PATCH 对应资源的 `display_alias`；Then 标题回退到原始 `name`、`slug` 或 `provider` 后端持久化别名，列表刷新后标题优先显示该别名，原始名称仍在副标题展示
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-03
最近确认：4389ebf90

## FR-unmapped-275 服务端筛选与分页
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-003@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given 调用方传入 `q` 调用方传入 `type` 和 `status` 调用方传入 `limit` 和 `offset` 请求 `GET /api/daemon/r；When 查询 runtime 或 workspace 列表 查询 runtime 或 workspace 列表 查询 runtime 或 workspace 列表 Fa；Then 后端在 `display_alias`、原始名称和关键标识字段中做大小写不敏感匹配 后端按 provider/path_source/type 和 status
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-04
最近确认：4389ebf90

## FR-unmapped-276 两页卡片与分页 UI 统一
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 用户打开 `/runtimes` 或 `/workspaces` 当前用户是平台管理员 当前用户不是平台管理员；When 数据加载成功 页面渲染筛选条 页面渲染筛选条；Then 页面展示筛选条、摘要统计、卡片网格和分页器 展示人员筛选控件，并可通过 `lib-admin.listUsers` 搜索用户 不展示人员筛选控件
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-05
最近确认：4389ebf90

## FR-unmapped-277 兼容旧调用
变更：2026-06-25-2026-06-25-admin-global-daemon-workspace-management
状态：active
摘要：默认场景
依据决策：D-001@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given 现有前端组件调用 `listDaemonRuntimes()` 现有调用不传 workspace 筛选参数；When 请求 `GET /api/daemon/runtimes` 请求 `GET /api/workspaces`；Then 响应仍为 `DaemonRuntimeRead[]` 响应结构仍为 `{ items, total }`，默认行为保持兼容
全文：.sillyspec/changes/archive/2026-06-25-2026-06-25-admin-global-daemon-workspace-management/requirements.md#FR-06
最近确认：4389ebf90

## FR-unmapped-291 WorkspaceCreate 支持 spec_strategy 字段
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-004@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-292 daemon-client 创建时 strategy 落 spec_workspaces
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-003@v1、D-004@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-293 strategy 经 scan lease payload 透传（backend→daemon）
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-294 daemon 接收 specStrategy
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-295 pullSpecBundle platform-managed 分支现状回归
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-004@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-296 pullSpecBundle repo-mirrored 分支单次导入
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-297 pullSpecBundle repo-native 分支建 junction
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-298 junction 生命周期（复用/降级）
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-299 repo-native rm 防误删守卫
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-300 packSpecDir 穿 junction + postSpecSync 三策略都走
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-301 前端创建表单 strategy 选项
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-004@v1、D-005@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-11
最近确认：98d3e56dd

## FR-unmapped-302 AgentRun.spec_strategy 读真实值
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-12
最近确认：98d3e56dd

## FR-unmapped-303 model.py repo-mirrored 注释更新
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-13
最近确认：98d3e56dd

## FR-unmapped-304 daemon-client 详情页扫描入口（首次/重新 scan 触发）
变更：2026-06-28-daemon-client-spec-sync-strategy
状态：active
摘要：（无场景名）
依据决策：D-006@v1
全文：.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/requirements.md#FR-14
最近确认：98d3e56dd

## FR-unmapped-314 变更中心移除生命周期流程图
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更中心列表页；When 用户打开 `/workspaces/{id}/changes`；Then 不再渲染「变更生命周期」SectionCard（扫描→…→归档）；列表/分页/搜索/新建/重新扫描均正常
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-01
最近确认：3849dbf33

## FR-unmapped-315 变更详情移除文档完整性面板 + DOC_TABS 查看器
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-008@v1
场景正文：
- 场景：默认场景 — Given 变更详情页；When 用户打开 `/workspaces/{id}/changes/{cid}`；Then 不再渲染「变更文档完整性」section（828-914）与 DOC_TABS 只读查看器（916-993）；关联前端死代码（DOC_TABS/DOC_LABE
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-02
最近确认：3849dbf33

## FR-unmapped-316 文件树展示变更目录全部文件
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-006@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 变更详情页已加载 daemon-client 工作区 server-local 工作区；When 调用 `GET /changes/{cid}/files`；Then 返回该变更目录下递归全部文件清单 `[{path, name, size, last_modified_at, is_text}]`（path 相对变更目录，排
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-03
最近确认：3849dbf33

## FR-unmapped-317 读取单文件内容
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 文件树选中某文件 path 含 `../` 或绝对路径或符号链接越界；When 调用 `GET /changes/{cid}/files/content?path=<rel>`；Then 返回 `{path, content, exists}`，content ≤ 1MB 截断 返回 4xx（路径穿越守卫）
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-04
最近确认：3849dbf33

## FR-unmapped-318 编辑保存（path_source 分流）
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-004@v1、D-006@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 用户编辑文本文件（is_text=true） server-local 工作区 daemon-client 工作区 二进制文件（is_text=false）；When 调用 `POST /changes/{cid}/files/content` body `{path, content}`；Then path resolve 后必须落在变更目录内（否则 4xx），content ≤ 1MB（否则 4xx） `write_text` 到 `{root_path
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-05
最近确认：3849dbf33

## FR-unmapped-319 离线续传
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given daemon-client 工作区且 daemon 离线 同文件多次保存（daemon 仍离线）；When 用户保存；Then pending 行保持 pending（不翻 failed），daemon 重连后轮询 claim→写本机→complete 合并为单条 pending 行（更
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-06
最近确认：3849dbf33

## FR-unmapped-320 保存后 per-change resync
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 写回成功（server-local 写盘 / daemon-client 镜像直写） daemon 回执 complete；When POST 返回前；Then 调用 `_resync_change_docs`：复用 `_parse_change` + `_sync_docs` 刷新 ChangeDocument 行 +
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-07
最近确认：3849dbf33

## FR-unmapped-321 待写回状态查询
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 文件树加载 / 保存后轮询；When 调用 `GET /changes/{cid}/files/pending`；Then 返回该变更 pending/claimed 的 DaemonChangeWrite 行 `[{path, status, created_at}]`（建议 ki
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-08
最近确认：3849dbf33

## FR-unmapped-322 前端文件树 + 编辑器 + 状态机
变更：2026-07-02-2026-07-02-change-detail-file-tree-editor
状态：active
摘要：默认场景
依据决策：D-003@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 变更详情页 保存动作 文件有待回写 pending 行；When 渲染文件树；Then 左树（复用 scan-docs TreeView 范式）+ 右内容区双栏；文本文件→可编辑 textarea + 保存按钮 + 放弃修改；二进制→只读 状态机流
全文：.sillyspec/changes/archive/2026-07-02-2026-07-02-change-detail-file-tree-editor/requirements.md#FR-09
最近确认：3849dbf33

## FR-unmapped-332 AgentRunLog 加 tool_kind 结构化列
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-01
最近确认：3849dbf33

## FR-unmapped-333 classify_tool_kind 识别函数（Python + TS 同逻辑）
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-02
最近确认：3849dbf33

## FR-unmapped-334 daemon task-runner tool_use 分支打标（batch 路径）
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-03
最近确认：3849dbf33

## FR-unmapped-335 backend _extract_sdk_messages interactive 打标
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-04
最近确认：3849dbf33

## FR-unmapped-336 backend submit_messages batch 兜底
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-05
最近确认：3849dbf33

## FR-unmapped-337 publish payload 两处带 tool_kind（SSE 实时流）
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-06
最近确认：3849dbf33

## FR-unmapped-338 GET /logs 加 ?tool_kind= 筛选
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-07
最近确认：3849dbf33

## FR-unmapped-339 前端 AgentRunLogEntry 加 tool_kind 字段
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-08
最近确认：3849dbf33

## FR-unmapped-340 toolKindMeta 徽标映射
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-09
最近确认：3849dbf33

## FR-unmapped-341 agent-log-viewer 第二层筛选按钮组（多选）
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-10
最近确认：3849dbf33

## FR-unmapped-342 工具徽标渲染（含旧日志兼容）
变更：2026-07-05-2026-07-05-agent-log-type-tags
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-05-2026-07-05-agent-log-type-tags/requirements.md#FR-11
最近确认：3849dbf33

## FR-unmapped-348 AgentSession 持久化变更/工作空间绑定
变更：2026-07-09-2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 一条交互会话在创建时携带 `change_id` 与 `workspace_id` 创建会话时未携带 `change_id`/`workspace_id`（ru；When `create_session` 写入 `AgentSession` `create_session` 执行；Then `AgentSession.change_id` / `workspace_id` 被持久化（可空）；`workspace_id` 非空时 `cwd` 写入该工
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-change-detail-session/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-349 创建端点接收变更/工作空间字段
变更：2026-07-09-2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 前端调用 `POST /api/daemon/sessions`；When 请求体含可选 `change_id`/`workspace_id`；Then 后端接收并透传给 `create_session`；`AgentSessionRead` 响应回显这两字段。
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-change-detail-session/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-350 自动注入变更上下文前导
变更：2026-07-09-2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 会话绑定 `change_id` 会话未绑定 `change_id`；When 创建会话首轮 dispatch 创建会话；Then daemon 收到的 dispatch prompt = `【变更上下文】前导 + 用户消息`；前导含变更标题、当前阶段、工作目录、变更文档路径（design/
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-change-detail-session/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-351 变更级会话列表
变更：2026-07-09-2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 工作空间成员访问变更详情页；When 调用 `GET /api/workspaces/{wid}/changes/{cid}/sessions`；Then 返回该变更下全部会话（跨成员，不过滤 user_id），按 `last_active_at` desc；每条含 `id/provider/status/turn
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-change-detail-session/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-352 变更详情页内嵌会话区块
变更：2026-07-09-2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户进入变更详情页 用户切换历史会话；When 页面渲染 点击某条历史会话；Then 在「Agent 执行日志」区块之后出现「会话」区块：左侧该变更会话历史列表 + 「新建会话」按钮，右侧复用 `InteractiveSessionPanel`（
全文：.sillyspec/changes/archive/2026-07-09-2026-07-09-change-detail-session/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-359 AgentSession 持久化变更/工作空间绑定
变更：2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 一条交互会话在创建时携带 `change_id` 与 `workspace_id` 创建会话时未携带 `change_id`/`workspace_id`（ru；When `create_session` 写入 `AgentSession` `create_session` 执行；Then `AgentSession.change_id` / `workspace_id` 被持久化（可空）；`workspace_id` 非空时 `cwd` 写入该工
全文：.sillyspec/changes/archive/2026-07-09-change-detail-session/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-360 创建端点接收变更/工作空间字段
变更：2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 前端调用 `POST /api/daemon/sessions`；When 请求体含可选 `change_id`/`workspace_id`；Then 后端接收并透传给 `create_session`；`AgentSessionRead` 响应回显这两字段。
全文：.sillyspec/changes/archive/2026-07-09-change-detail-session/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-361 自动注入变更上下文前导
变更：2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given 会话绑定 `change_id` 会话未绑定 `change_id`；When 创建会话首轮 dispatch 创建会话；Then daemon 收到的 dispatch prompt = `【变更上下文】前导 + 用户消息`；前导含变更标题、当前阶段、工作目录、变更文档路径（design/
全文：.sillyspec/changes/archive/2026-07-09-change-detail-session/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-362 变更级会话列表
变更：2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 工作空间成员访问变更详情页；When 调用 `GET /api/workspaces/{wid}/changes/{cid}/sessions`；Then 返回该变更下全部会话（跨成员，不过滤 user_id），按 `last_active_at` desc；每条含 `id/provider/status/turn
全文：.sillyspec/changes/archive/2026-07-09-change-detail-session/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-363 变更详情页内嵌会话区块
变更：2026-07-09-change-detail-session
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户进入变更详情页 用户切换历史会话；When 页面渲染 点击某条历史会话；Then 在「Agent 执行日志」区块之后出现「会话」区块：左侧该变更会话历史列表 + 「新建会话」按钮，右侧复用 `InteractiveSessionPanel`（
全文：.sillyspec/changes/archive/2026-07-09-change-detail-session/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-364 删除 archive 死代码 + 补 status 投影
变更：2026-07-11-2026-07-11-daemon-client-container-overreach
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-11-2026-07-11-daemon-client-container-overreach/requirements.md#FR-1
最近确认：af41fac1d

## FR-unmapped-365 change_dir 删死路径
变更：2026-07-11-2026-07-11-daemon-client-container-overreach
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-11-2026-07-11-daemon-client-container-overreach/requirements.md#FR-2
最近确认：af41fac1d

## FR-unmapped-366 scanner/parser 扁平布局修复
变更：2026-07-11-2026-07-11-daemon-client-container-overreach
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-11-2026-07-11-daemon-client-container-overreach/requirements.md#FR-3
最近确认：af41fac1d

## FR-unmapped-430 daemon 共享标记（lender）
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-003@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given 开发人员是某工作空间成员且已绑定自己的 daemon shared 已为 true；When 开发人员调用 `PUT /workspaces/{ws}/my-binding/shared {shared:true}` lender 设 `shared=f；Then 该 binding 行 `shared=True`，可被同工作空间业务人员借用 共享撤销，借用查询不再命中该 daemon
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-01
最近确认：f608584d8

## FR-unmapped-431 owner 管理共享 daemon
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 工作空间存在共享 daemon；When owner 调用 `GET /workspaces/{ws}/shared-daemons` owner 撤销某共享；Then 返回所有 shared daemon 列表（含 lender、在线状态、可撤销） 对应 binding `shared=false`
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-02
最近确认：f608584d8

## FR-unmapped-432 业务人员借用权限 + 端点鉴权
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-001@v1、D-006@v2
场景正文：
- 场景：默认场景 — Given owner 把某用户加为 business_member 角色（`task:run_agent` + `daemon:borrow` + workspace 读；When 该用户（无自有 daemon）触发 agent run 触发 agent run 且无自有 daemon；Then 端点鉴权通过（`task:run_agent`），placement 发现无自有 daemon → 回退借用查询（需 `daemon:borrow`） 报"工作
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-03
最近确认：f608584d8

## FR-unmapped-433 借用派发回退（4 路一致）
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-002@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given actor 是 business_member，工作空间有 shared+online 的 daemon 工作空间无 shared 或全离线；When actor 触发 agent run（任意 SillySpec 阶段 / quick-chat） actor 触发借用；Then 4 路 resolver（`_resolve_dispatch_runtime` / `_resolve_decide_runtime` / `resolve_
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-04
最近确认：f608584d8

## FR-unmapped-434 daemon 沙箱只读隔离
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-007@v2
场景正文：
- 场景：默认场景 — Given 借用 lease 派发到 lender daemon 借用 agent 尝试写 lender 代码区；When daemon 起 agent 进程；Then cwd=独立 sandbox（slug=`borrow-<actor>-<run>`），写策略按 lease 隔离只读 root_path，不命中 lender
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-05
最近确认：f608584d8

## FR-unmapped-435 方案落文件中心
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-001@v1、D-009@v1、D-010@v1
场景正文：
- 场景：默认场景 — Given 借用 agent run 完成（`close_interactive_run` / `complete_lease` 回调）；When backend 拿到方案文本；Then 调 `FileService.upload_file` 落 file（`owner_type=workspace`, `uploaded_by=borrower
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-06
最近确认：f608584d8

## FR-unmapped-436 借用审计
变更：2026-07-26-2026-07-25-daemon-borrow-for-business
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 每次借用发生；When lease 创建/完成；Then 写 `daemon_borrow_audit`（borrower / lender / daemon / workspace / agent_run / bor
全文：.sillyspec/changes/archive/2026-07-26-2026-07-25-daemon-borrow-for-business/requirements.md#FR-07
最近确认：f608584d8

## FR-unmapped-460 proxy-create 不再 500（消除 changes 表并发）
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-001@v2、D-006@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-01
最近确认：d089b492d

## FR-unmapped-461 change_documents 表无并发撞键（消除 docs 同源竞态）
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-001@v2、D-006@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-02
最近确认：d089b492d

## FR-unmapped-462 proxy 状态权威（owner_id 守卫）
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-03
最近确认：d089b492d

## FR-unmapped-463 极端并发撞键兜底
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-004@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-04
最近确认：d089b492d

## FR-unmapped-464 失败回滚
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-05
最近确认：d089b492d

## FR-unmapped-465 中文标题 change_key 可读
变更：2026-08-02-proxy-create-race-fix
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-08-02-proxy-create-race-fix/requirements.md#FR-06
最近确认：d089b492d

## FR-unmapped-489 三端点路径契约（D-001）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-01
最近确认：9f7e0732f

## FR-unmapped-490 Bearer 鉴权（D-002）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-02
最近确认：9f7e0732f

## FR-unmapped-491 platform_change_progress 存储（D-003）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-03
最近确认：9f7e0732f

## FR-unmapped-492 base_ts 冲突检测算法（D-004 / 契约 §4.2）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-04
最近确认：9f7e0732f

## FR-unmapped-493 元字段走 HTTP header（D-005 / 契约 §4.1）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-05
最近确认：9f7e0732f

## FR-unmapped-494 冲突不 auto-merge（D-006 / 契约 §9）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-06
最近确认：9f7e0732f

## FR-unmapped-495 GET 响应裸形态（D-007 / 契约 §5/§6）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-07
最近确认：9f7e0732f

## FR-unmapped-496 name 全局唯一寻址（D-008 / 契约 §3）
变更：2026-08-10-sillyhub-platform-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-10-sillyhub-platform-sync/requirements.md#FR-08
最近确认：9f7e0732f

## FR-unmapped-503 workspace-scoped token 签发
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given workspace 成员持 WORKSPACE_WRITE 权限；When 调 `POST /api/workspaces/{wid}/platform-sync-tokens`；Then 201 返回 `shpsync_` 明文 token 一次；`platform_sync_tokens` 存 sha256(token_hash) + work
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-01
最近确认：c769ce3d6

## FR-unmapped-504 收件箱按 workspace 隔离
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given `platform_change_progress` 加 workspace_id + 复合唯一 `(workspace_id, change_name)`；When 持 `shpsync_` token 上行 `POST /api/changes/{name}/progress`；Then `require_platform_sync` 派生 (User=created_by, workspace_id)，upsert 按复合键隔离；workspa
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-02
最近确认：c769ce3d6

## FR-unmapped-505 connect 自动下发 + 权限校验
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-005@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 用户跑 `sillyspec platform connect` 且持 user 级 shk_live_；When connect 调 `POST /api/workspaces/resolve-by-root-path`（body=root_path）；Then 反查 workspace（不到→404）→ 校验调用者 WORKSPACE_WRITE（无→403）→ 签发 shpsync_ 返回 `{workspace_i
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-03
最近确认：c769ce3d6

## FR-unmapped-506 变更中心实时 join 投影 current_stage
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 变更中心查列表/详情；When `enrich_summaries`（list 批量 IN join）/`enrich_with_workspace_ids`（single = 匹配）join；Then 取 `latest_progress.changes[0].current_stage` 覆盖猜值；read-only 不写 changes 表；无 N+1
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-04
最近确认：c769ce3d6

## FR-unmapped-507 未上行 fallback
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 工具从未上行的 change（或 quick-<uuid8> 不建目录）；When join 不命中；Then fallback 到 changes 表现有 current_stage，不崩
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-05
最近确认：c769ce3d6

## FR-unmapped-508 不投 status（已撤销 D-004@v2）
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
依据决策：D-004@v2
场景正文：
- 场景：默认场景 — Given sillyspec status 仅 active/archived 两值；When 投影；Then 只覆盖 current_stage；status 维持变更中心派生（current_stage==archive → 已归档）
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-06
最近确认：c769ce3d6

## FR-unmapped-509 gen:types 同步
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When 后端 schema 改动；Then 跑 `pnpm gen:types` 同步 `api-types.ts` + `openapi.json` 并提交
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-07
最近确认：c769ce3d6

## FR-unmapped-510 migration 棕地免回填
变更：2026-08-11-change-progress-projection
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When `alembic upgrade`；Then 建 `platform_sync_tokens` 表 + `platform_change_progress` 加 workspace_id 复合唯一；老数据不
全文：.sillyspec/changes/archive/2026-08-11-change-progress-projection/requirements.md#FR-08
最近确认：c769ce3d6

## FR-unmapped-517 init claim 时签发两个 workspace-scoped token
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 workspace 已 ensure_spec_workspace 且成员已绑定 daemon；When daemon claim 该 workspace 的 init lease（mode='init'）
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-01
最近确认：a34d556ff

## FR-unmapped-518 get_or_issue 吊销旧未吊销 + 签新（逻辑复用，不堆积）
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 同一 (workspace_id, created_by) 已存在未吊销的 shpsync_/shmcp_ token 同一 (workspace_id, cr；When init claim 调 get_or_issue init claim 调 get_or_issue；Then 旧 token 被 revoke（revoked_at=now），新 token 签发返回明文；同维度始终仅一条活 token 直接签新 token 返回明文
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-02
最近确认：a34d556ff

## FR-unmapped-519 明文 token 不落 lease.metadata
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given init lease 正被 claim；When build_claim_payload 注入 local_yaml；Then 明文 token 只存在于 claim 请求的内存 payload，**不写** lease.metadata_（DB 持久化 JSON 列、被审计服务读取）；
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-03
最近确认：a34d556ff

## FR-unmapped-520 daemon 写 local.yaml platform 段（权威覆盖）
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 收到含 local_yaml 的 init payload + rootPath；When handleInitLease 执行 writeLocalYaml；Then `<rootPath>/.sillyspec/local.yaml` 的 `platform:` 顶层段被文本级覆盖为 `{url: <serverOrigin
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-04
最近确认：a34d556ff

## FR-unmapped-521 daemon 写 local.yaml mcp 段（有才留）
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 收到含 local_yaml 的 init payload；When handleInitLease 执行 writeLocalYaml；Then 若 `mcp:` 顶层段**不存在**，写入 `{url: <serverOrigin>/mcp, token: <mcp_token>}`；若**已存在**（
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-05
最近确认：a34d556ff

## FR-unmapped-522 url 由 daemon 端决定
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 写 local.yaml；Then platform_url = daemon `config.server_url`（去尾斜杠），mcp_url = platform_url + `/mcp`；
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-06
最近确认：a34d556ff

## FR-unmapped-523 写 local.yaml 失败 = init 整体失败
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given writeLocalYaml 因任何原因失败（无写权限/磁盘满/路径无效）；When handleInitLease 第 4 步 catch 到错误；Then 返回 `ok:false`，`_runInitLease` 据 result.ok 走 `_finish(false)`，lease 标 failed，init
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-07
最近确认：a34d556ff

## FR-unmapped-524 mcp token scope 合法
变更：2026-08-12-init-provision-local-yaml
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given McpTokenService.get_or_issue 签发；Then scope 必须取 `MCP_SCOPES` 合法值（read/dispatch/converge，repo://sillyhub/backend/app/modules/mcp_gateway/auth.py:44）；init 场景用 `['dispat
全文：.sillyspec/changes/archive/2026-08-12-init-provision-local-yaml/requirements.md#FR-08
最近确认：a34d556ff

## FR-unmapped-525 主 tab 维度统一 + 待我处理聚焦筛选
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-01
最近确认：b76ab5517

## FR-unmapped-526 「待我处理」语义 = 全局待人工
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-02
最近确认：b76ab5517

## FR-unmapped-527 ChangeSummary 携带 pending_review（零 migration，走 PG 镜像）
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-03
最近确认：b76ab5517

## FR-unmapped-528 默认排序「最近活动优先」+ 可切换
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-04
最近确认：b76ab5517

## FR-unmapped-529 待办状态徽标
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-05
最近确认：b76ab5517

## FR-unmapped-530 负责人列
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-06
最近确认：b76ab5517

## FR-unmapped-531 查询区消除留白
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-07
最近确认：b76ab5517

## FR-unmapped-532 新建变更升主按钮
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-08
最近确认：b76ab5517

## FR-unmapped-533 空状态引导 CTA
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-09
最近确认：b76ab5517

## FR-unmapped-534 tab 挂计数
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-10
最近确认：b76ab5517

## FR-unmapped-535 副标题修正
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-11
最近确认：b76ab5517

## FR-unmapped-536 删除死代码
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-12
最近确认：b76ab5517

## FR-unmapped-537 接口类型同步
变更：2026-08-13-change-center-rework
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-change-center-rework/requirements.md#FR-13
最近确认：b76ab5517

## FR-unmapped-538 增量推送（只推变化）
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-01
最近确认：a830df116

## FR-unmapped-539 多写者乐观锁
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-02
最近确认：a830df116

## FR-unmapped-540 服务器权威清单（独立 spec_file_manifest 表）
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-03
最近确认：a830df116

## FR-unmapped-541 软删除备份（move 出 spec_root）
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-04
最近确认：a830df116

## FR-unmapped-542 rename 显式 op
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-05
最近确认：a830df116

## FR-unmapped-543 `.runtime/` 移出增量范围
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-06
最近确认：a830df116

## FR-unmapped-544 兼容
变更：2026-08-13-platform-managed-file-sync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-08-13-platform-managed-file-sync/requirements.md#FR-07
最近确认：a830df116

## FR-unmapped-551 新建会话四选择器联动
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-005@v1、D-010@v1、D-013@v1
场景正文：
- 场景：默认场景 — Given 用户在 /sessions 点「新建会话」；When 提交；Then 表单依次为：守护进程（必选，仅在线机器可选、离线置灰；默认=上次选择(localStorage)→最近会话的在线机器→最新心跳）、智能体（必选，所选机器在线 r
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-01
最近确认：6453d9ca0

## FR-unmapped-552 会话列表（所有会话）
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-003@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 用户进入 /sessions；When 点击会话；Then 左侧列出跨机器/智能体的全部会话（含已结束/失败），紧凑两行条目（状态点+标题+相对时间 / 机器+引擎+档案+供应商+轮数 chips，chips 读会话快照
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-02
最近确认：6453d9ca0

## FR-unmapped-553 未选供应商/档案零回归
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 用户不选供应商和档案（或经 /runtimes 弹窗开会在话）；When 会话执行；Then 行为与现状一致：全局默认供应商配置注入、无人格、模型走既有覆盖链
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-03
最近确认：6453d9ca0

## FR-unmapped-554 会话级配置生效
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-011@v1、D-013@v1
场景正文：
- 场景：默认场景 — Given 用户选了档案和/或供应商；When 会话执行；Then 档案只注入人格提示词（system_prompt，Claude）+ mcp/skill 透传，不派生引擎/模型/供应商；供应商优先级=会话选择 > 全局默认（不
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-04
最近确认：6453d9ca0

## FR-unmapped-555 会话内配置热切换（样式 B）
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-004@v2、D-007@v1、D-012@v1
场景正文：
- 场景：默认场景 — Given 会话 active 且当前轮完成（idle） 当前轮运行中；When 用户点输入框下方配置控件条中「供应商/档案」并选择新值、发送消息；Then inject 携带新配置+prompt；后端建新 AgentRun（新快照）并下发 SESSION_SWITCH_CONFIG；daemon 在轮次边界 rel
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-05
最近确认：6453d9ca0

## FR-unmapped-556 切换合法性校验
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-004@v2、D-013@v1
场景正文：
- 场景：默认场景 — Given 用户绕过前端以不匹配供应商（agent_kind 与引擎不符、非本人供应商）发起切换；When 后端 inject_session 校验；Then 返回 4xx 中文错误；会话状态不变（档案无引擎属性，无需引擎校验，D-013）
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-06
最近确认：6453d9ca0

## FR-unmapped-557 每轮配置快照（历史不跟随）
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-008@v1
场景正文：
- 场景：默认场景 — Given 会话发生过配置切换；When 渲染消息流；Then 每条回复 who 行显示该轮生效配置（`档案 · 智能体 · 供应商`，未选如实显示「未指定/本机默认」），切换后旧消息保持原配置不变
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-07
最近确认：6453d9ca0

## FR-unmapped-558 上下文用量 + 供应商额度
变更：2026-08-19-sessions-portal
状态：active
摘要：默认场景
依据决策：D-009@v1、D-014@v1
场景正文：
- 场景：默认场景 — Given 会话面板；When 切换供应商；Then 输入框上方一行显示上下文用量环形进度（累计 usage/模型窗口，分母=供应商配置派生（1M 勾选→1000k）→模型默认常量表（200k）→无则只显示累计 t
全文：.sillyspec/changes/archive/2026-08-19-sessions-portal/requirements.md#FR-08
最近确认：6453d9ca0

## FR-unmapped-634 Office 高保真预览
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 预览的文件为 docx/xlsx/pptx/doc/xls/ppt 且 DS 已启用；When 打开预览窗；Then 经 DS 呈现高保真只读视图（样式/列宽/合并还原）；pdf/图片/md 走现有渲染器不变
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-01
最近确认：3f5e39780

## FR-unmapped-635 降级链
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given DS 未启用（config 503）、api.js 加载失败或 DocEditor 初始化出错；When office 文件预览；Then 自动回落本地渲染器（docx→docx-preview；xlsx/xls→SheetJS；ppt/pptx→fallback 下载），
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-02
最近确认：3f5e39780

## FR-unmapped-636 一次性文件令牌
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given DS 需拉取文件（无 JWT 能力）；When backend 签发 file token；Then token HS256 签名、TTL 5 分钟、redis jti 一次性消费（重放 410）、绑定 object_key；
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-03
最近确认：3f5e39780

## FR-unmapped-637 归属校验
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户请求 office-config（source=session_attachment|file, id）；When 附件/文件不属于该用户或不存在；Then 404（资源隐藏语义，与既有端点一致）
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-04
最近确认：3f5e39780

## FR-unmapped-638 前端零构建配置
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 局域网 IP/端口变化；When 运维仅改 .env 的 ONLYOFFICE_PUBLIC_URL 并重启 backend；Then 前端无需重新构建即用新地址（config 端点下发 ds_url）
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-05
最近确认：3f5e39780

## FR-unmapped-639 部署门禁
变更：2026-08-26-onlyoffice-preview
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Docker VM Total Memory < 6GB；When 尝试部署 onlyoffice 服务；Then 验证步骤明确拒绝并提示先调 Docker Desktop 内存（文档+检查命令）
全文：.sillyspec/changes/archive/2026-08-26-onlyoffice-preview/requirements.md#FR-06
最近确认：3f5e39780

## FR-unmapped-715 工作区内容访问回归成员制（判定链收紧）
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景；非成员持平台级 workspace:read 访问工作区详情；非成员持平台级 mcp:read 读工作区 MCP 配置
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given 用户不是工作区 W 的成员，且不是平台管理员（`is_platform_admin=False` 且平台级角色不含 `platform:admin`），但平台级；When 以工作区 W 为上下文判定权限 P（`has_permission(workspace_id=W)`，即所有 `require_permission` 路由）；Then 判定为 False（403），P 为任意 Permission 枚举值均如此
- 场景：非成员持平台级 workspace:read 访问工作区详情 — Given 180490 绑定 developer 角色（平台级 `workspace:read`），不是工作区 W 成员；When GET /api/workspaces/{W}；Then HTTP 403
- 场景：非成员持平台级 mcp:read 读工作区 MCP 配置 — Given 同上用户，权限为 `mcp:read`；When 访问 W 的 mcp-config 读端点；Then HTTP 403
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-01
最近确认：3642c3d0

## FR-unmapped-716 平台管理员全量不受影响
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 用户 `is_platform_admin=True`，或平台级角色含 `platform:admin`；When 访问任意工作区（成员或非成员）或列表；Then 行为与改动前完全一致（放行、全量列表）
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-02
最近确认：3642c3d0

## FR-unmapped-717 工作区列表按成员制返回
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景
依据决策：D-001@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 用户非平台管理员、平台级角色不含 `platform:admin`，但持平台级 `workspace:read`；When GET /api/workspaces；Then 仅返回该用户为成员的工作区（无成员身份则空列表）；ql-20260917-007 的「平台级 workspace:read → 全量」分支废止
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-03
最近确认：3642c3d0

## FR-unmapped-718 通知收件人按成员制聚合
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 工作区 W 发生需广播事件（`list_user_ids_with_permission(workspace_id=W, permission=P)` 被调用）；When 查找收件人
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-04
最近确认：3642c3d0

## FR-unmapped-719 功能入口效力保持不变
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given 用户持平台级权限 P（如 developer 角色的 `workspace:read`）；When 以无工作区上下文判定 P（`require_permission_any`，如创建工作区前的入口校验）或经 `/api/auth/me` 聚合权限驱动菜单显隐；Then 行为与改动前完全一致（菜单仍可见、入口判定仍放行）
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-05
最近确认：3642c3d0

## FR-unmapped-720 创建者自动成员语义不受影响
变更：2026-09-20-workspace-member-visibility
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 用户持平台级 `workspace:write` 并创建工作区；When 创建完成（新建/复用/复活任一路径，`backend/app/modules/workspace/service.py` `_ensure_creator_as；Then 创建者自动成为该工作区 `workspace_owner` 成员，随后对该工作区的访问走成员判定、正常放行
全文：.sillyspec/changes/archive/2026-09-20-workspace-member-visibility/requirements.md#FR-06
最近确认：3642c3d0
