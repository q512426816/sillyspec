---
author: sillyspec-fr-index
---
# FR 索引 — unmapped（检索面-only 停车场）

> 【2026-10-03-fr-governance-telemetry 治理评估】本池残余 625 条：88 个来源变更批的覆盖文件缺失或
> 推导不出真域（多为 2026-05~07 存量薄道产物，归档件无交付面记录）——显式降级「检索面-only」：
> 不进注入/查重/测试门比对面（既有行为不变），条目仅供 knowledge search 检索与人工翻阅。
> 机械可判域的 98 条已迁 daemon（ID 不换号）；后续归档流程与 redomain 通道持续收编新增存量。

## FR-unmapped-001 普通项目可创建 Workspace
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户输入一个存在的普通代码目录 目标目录已存在 `.sillyspec`；When 用户执行 workspace scan 并创建 workspace 用户创建 workspace；Then 平台创建 workspace，`status=active`，不因缺少 `.sillyspec` 阻断 平台展示导入、镜像、忽略仓库规范三种选择
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-002 平台托管规范空间
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace 创建成功 用户选择 `repo-mirrored`；When workspace 没有 repo-native `.sillyspec` 用户触发同步
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-02
最近确认：c0af692c7

## FR-unmapped-003 Agent Spec Profile
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台配置了 `C:\Users\qinyi\IdeaProjects\sillyspec` 作为 profile 来源 SillySpec profile 发生；When 平台加载 profile 平台检测到 manifest diff；Then 平台生成版本化 `SpecProfileManifest`，包含阶段、文档、门禁和 Agent 上下文契约 平台生成兼容性报告，需项目维护者确认迁移
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-03
最近确认：c0af692c7

## FR-unmapped-004 规范冲突策略
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台治理要求和 SillySpec 规范要求不一致 策略层无法自动决策；When 策略层可以自动决策 用户推进阶段或触发 Agent；Then 平台按硬门禁合并、更严格校验优先、extension metadata 或 adapter transform 处理 平台生成 conflict record，
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-04
最近确认：c0af692c7

## FR-unmapped-005 Claude Code Agent 接入
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given task 已从规范文档解析并确认 Agent 执行完成；When 用户触发 `claude_code` Agent run 平台收到退出码和输出
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-05
最近确认：c0af692c7

## FR-unmapped-006 Agent 类型一致性
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 前端创建 Agent run 后端收到未知 agent type；When 用户选择 Claude Code adapter registry 没有对应实现；Then 请求 payload 使用 `agent_type=claude_code` 返回明确错误和可用 agent type 列表
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-06
最近确认：c0af692c7

## FR-unmapped-007 规范文件独立存储
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given workspace 创建成功 spec root 目录内 已有的 component/scan_docs/change/task/parser；When 平台创建托管 spec root Agent 或 CLI 生成规范文件 需要读取规范文件；Then spec root 位于 `spec_data_root/{workspace_id}/`，为绝对路径，不与代码仓库混放 目录结构遵循 SillySpec 标准
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-07
最近确认：c0af692c7

## FR-unmapped-008 SillySpec CLI 作为 Agent 工具
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given AgentSpecBundle 构建 用户触发 spec-bootstrap 已有 `.sillyspec` 的项目；When 平台准备 Agent 执行上下文 Agent 在 spec_root 目录中执行 Agent 导入规范；Then `available_tools` 包含 `["sillyspec"]`，Agent prompt 指示使用 CLI 命令 Agent 调用 `sillyspe
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-08
最近确认：c0af692c7

## FR-unmapped-009 SpecValidator 程序验证
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 规范文件已生成（bootstrap 或 sync 后） 验证通过 验证失败；When 平台执行验证 平台更新状态 平台处理结果；Then `SpecValidator` 检查：YAML schema（每个 `projects/*.yaml` 必须有 `id`、`name`、`type`）、引用完整
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-09
最近确认：c0af692c7

## FR-unmapped-010 Agent stdout 逐行流式发布
变更：2026-05-28-agent-log-streaming
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 运行中（status=running）；When ClaudeCodeAdapter 收到子进程 stdout 的一行输出；Then 平台通过 Redis Pub/Sub 发布到 channel `agent_run:{run_id}`，payload 包含 `channel`（stdout/
全文：.sillyspec/changes/archive/2026-05-28-agent-log-streaming/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-011 SSE 实时日志端点
变更：2026-05-28-agent-log-streaming
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 客户端连接 `GET /api/workspaces/{id}/agent/runs/{run_id}/stream` Agent 运行结束（status 变为；When Redis Pub/Sub channel `agent_run:{run_id}` 收到消息 SSE 端点检测到运行结束 端点收到请求；Then SSE 端点将消息作为 `data` event 推送给客户端 发送 `event: done` 并关闭连接 返回 200 并立即发送 `event: done
全文：.sillyspec/changes/archive/2026-05-28-agent-log-streaming/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-012 前端实时日志消费
变更：2026-05-28-agent-log-streaming
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 状态为 running SSE 连接断开 Agent 状态变为 completed/failed；When 用户打开 Agent Console 或 Task Detail 页面 浏览器自动重连 前端收到 `event: done` 或检测到状态变更
全文：.sillyspec/changes/archive/2026-05-28-agent-log-streaming/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-013 DB 日志持久化不受影响
变更：2026-05-28-agent-log-streaming
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 运行结束；When 平台处理完 stdout/stderr；Then 仍按现有逻辑写入 `AgentRunLog` 表，现有 `/logs` 端点行为不变
全文：.sillyspec/changes/archive/2026-05-28-agent-log-streaming/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-014 Workspace 吸收 Component 元数据
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 创建 Workspace 请求包含 `component_key`、`type`、`role`、`repo_url`、`default_branch`、`tec；When 平台保存 Workspace Workspace 已保存 Component 元数据；Then 这些字段保存到 `workspaces` 表 响应返回这些元数据字段
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-015 移除旧 Component 核心数据面
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 后端启动 前端读取 Workspace 或拓扑；When API router 注册完成 页面加载数据；Then 不再把旧 `backend/app/modules/component/` router 作为核心入口 通过 Workspace API 获取数据，而不是依赖旧
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-02
最近确认：c0af692c7

## FR-unmapped-016 创建 WorkspaceRelation
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Workspace A 和 Workspace B 都存在 A 到 B 已存在 `depends_on` Workspace A 存在；When 创建 A `depends_on` B 再次创建同类型关系 创建 A 指向 A 的关系
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-03
最近确认：c0af692c7

## FR-unmapped-017 支持循环依赖图
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已存在 A `depends_on` B 存在 A -> B -> C -> A；When 查询 A 的关系 查询全局拓扑；Then 响应同时包含出边 A -> B 和入边 B -> A 拓扑结果包含完整环路，不因循环依赖报错
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-04
最近确认：c0af692c7

## FR-unmapped-018 Change 支持多 Workspace
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 开发者创建 Change 并传入 `workspace_ids=[A,B]` 旧客户端只传 `workspace_id=A`；When 服务保存 Change 服务保存 Change；Then `change_workspaces` 包含 Change 到 A、B 的关联 Change 仍保存成功，并将 A 视为 primary Workspace
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-05
最近确认：c0af692c7

## FR-unmapped-019 Task 支持多 Workspace
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 开发者创建 Task 并传入 `workspace_ids=[A,B]` 查询 Workspace A 的任务；When 服务保存 Task Task 通过 `task_workspaces` 关联 A；Then `task_workspaces` 包含 Task 到 A、B 的关联 查询结果包含该 Task
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-06
最近确认：c0af692c7

## FR-unmapped-020 AgentRun 支持多 Workspace
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given AgentRun 由一个跨 Workspace Task 触发 查询 AgentRun 详情；When AgentRun 创建 该 run 涉及多个 Workspace；Then `agent_run_workspaces` 记录该 run 涉及的 Workspace 响应返回对应 Workspace 列表或 `workspace_ids
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-07
最近确认：c0af692c7

## FR-unmapped-021 AgentSpecBundle 基于 Workspace Graph 构建
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task T 关联 Workspace A A -> B -> C 的依赖链；When 构建 AgentSpecBundle 构建上下文的 depth 为 1；Then bundle 包含 A 的 spec 摘要 bundle 只包含 A 的直接关联 Workspace，不递归拉取 C
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-08
最近确认：c0af692c7

## FR-unmapped-022 全局拓扑 API
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台存在多个 Workspace 和 WorkspaceRelation 某个 Workspace 被软删除或不可见；When 调用 `GET /api/workspaces/topology` 查询拓扑；Then 响应返回 nodes 和 edges 该 Workspace 不应作为 active 节点展示
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-09
最近确认：c0af692c7

## FR-unmapped-023 后续独立变更包边界
变更：2026-05-28-component-as-workspace
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 当前变更包正在实施；When 发现普通仓库接入、Workflow 控制面、Local Runner、Knowledge Lifecycle 或 Server Sandbox 需求；Then 只记录为后续独立变更包，不在当前包实现
全文：.sillyspec/changes/archive/2026-05-28-component-as-workspace/requirements.md#FR-10
最近确认：c0af692c7

## FR-unmapped-024 Router 统一挂载
变更：2026-05-29-harness-control-plane
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 后端启动；When 查询 OpenAPI 或调用模块 API；Then workflow、agent、tool_gateway、git_gateway、runtime、knowledge 的入口可用
全文：.sillyspec/changes/archive/2026-05-29-harness-control-plane/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-025 Workflow 状态流转
变更：2026-05-29-harness-control-plane
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task 处于 draft；When 请求进入 ready；Then Workflow service 校验必要条件后完成流转
全文：.sillyspec/changes/archive/2026-05-29-harness-control-plane/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-026 Spec Guardian 门禁
变更：2026-05-29-harness-control-plane
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task 关联 Workspace 缺少有效 SpecWorkspace；When 请求执行；Then Spec Guardian 拒绝执行并返回诊断
全文：.sillyspec/changes/archive/2026-05-29-harness-control-plane/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-027 Policy 校验
变更：2026-05-29-harness-control-plane
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 请求高风险 shell 操作；When Policy 评估结果为 require_approval；Then 操作进入审批，不直接执行
全文：.sillyspec/changes/archive/2026-05-29-harness-control-plane/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-028 AuditLog
变更：2026-05-29-harness-control-plane
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户批准一个操作；When 决策保存；Then AuditLog 记录操作者、对象、动作、结果和时间
全文：.sillyspec/changes/archive/2026-05-29-harness-control-plane/requirements.md#FR-05
最近确认：3cdaada90

## FR-unmapped-029 创建 candidate
变更：2026-05-29-knowledge-lifecycle
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given AgentRun 产生可沉淀内容；When Agent 提交 candidate；Then candidate 保存为待审核状态，并记录来源 run/task/workspace
全文：.sillyspec/changes/archive/2026-05-29-knowledge-lifecycle/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-030 Reviewer 确认
变更：2026-05-29-knowledge-lifecycle
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given candidate 待审核；When Reviewer 确认；Then 系统创建或更新 knowledge item，状态为 confirmed
全文：.sillyspec/changes/archive/2026-05-29-knowledge-lifecycle/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-031 验证和推广
变更：2026-05-29-knowledge-lifecycle
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given knowledge item 已 confirmed item 已 verified；When Reviewer 标记验证通过 管理员推广；Then 状态进入 verified 状态进入 promoted
全文：.sillyspec/changes/archive/2026-05-29-knowledge-lifecycle/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-032 废弃
变更：2026-05-29-knowledge-lifecycle
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 知识不再适用；When Reviewer 标记 deprecated；Then 查询默认不返回该知识，除非显式包含 deprecated
全文：.sillyspec/changes/archive/2026-05-29-knowledge-lifecycle/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-033 查询过滤
变更：2026-05-29-knowledge-lifecycle
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Workspace A 有多条知识；When 用户按 type、status、source 查询；Then 返回匹配的知识列表
全文：.sillyspec/changes/archive/2026-05-29-knowledge-lifecycle/requirements.md#FR-05
最近确认：3cdaada90

## FR-unmapped-034 runtime 注册
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本机安装 Codex CLI；When Local daemon 启动；Then daemon 向 server 注册 provider=codex 的 runtime
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-035 heartbeat
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given runtime 已注册；When daemon 定期发送 heartbeat；Then server 将 runtime 视为 online
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-036 claim task
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task 已 ready 且绑定 online runtime；When daemon claim task；Then server 原子分配任务给该 runtime
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-037 隔离执行环境
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 已 claim task；When 准备执行；Then 创建独立 workdir/output/logs 并写入 AgentSpecBundle
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-038 消息流上报
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given CLI 正在执行；When 产生 stdout、tool call、thinking 或 result message；Then daemon 批量上报到 server
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-05
最近确认：3cdaada90

## FR-unmapped-039 执行完成
变更：2026-05-29-local-runner-execution-loop
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given CLI 返回成功；When runner 收集结果；Then server 保存 diff/test/artifact 并推进到 review gate
全文：.sillyspec/changes/archive/2026-05-29-local-runner-execution-loop/requirements.md#FR-06
最近确认：3cdaada90

## FR-unmapped-040 创建沙箱
变更：2026-05-29-server-sandbox-runner
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task 已 ready；When Server Runner claim task；Then 平台创建绑定 tenant/user/workspace/task 的沙箱
全文：.sillyspec/changes/archive/2026-05-29-server-sandbox-runner/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-041 文件快照
变更：2026-05-29-server-sandbox-runner
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Workspace 有允许注入的路径；When 创建沙箱快照；Then 只复制白名单路径
全文：.sillyspec/changes/archive/2026-05-29-server-sandbox-runner/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-042 执行任务
变更：2026-05-29-server-sandbox-runner
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 沙箱已准备完成；When Runner 调用内部 Claude/Codex 执行能力；Then 日志通过统一 runner 协议写回 AgentRun
全文：.sillyspec/changes/archive/2026-05-29-server-sandbox-runner/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-043 导出结果
变更：2026-05-29-server-sandbox-runner
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 执行完成；When Runner 导出结果；Then 平台保存 diff、test result、artifact
全文：.sillyspec/changes/archive/2026-05-29-server-sandbox-runner/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-044 清理
变更：2026-05-29-server-sandbox-runner
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 沙箱超过保留周期；When GC 执行；Then 沙箱文件和临时凭据被清理
全文：.sillyspec/changes/archive/2026-05-29-server-sandbox-runner/requirements.md#FR-05
最近确认：3cdaada90

## FR-unmapped-045 普通 repo 注册
变更：2026-05-29-workspace-intake-spec-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个没有 `.sillyspec` 的代码仓库；When 管理员使用 `spec_strategy=bootstrap` 创建 Workspace；Then Workspace 创建成功
全文：.sillyspec/changes/archive/2026-05-29-workspace-intake-spec-bootstrap/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-046 导入已有规范
变更：2026-05-29-workspace-intake-spec-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given repo 内已有 `.sillyspec`；When 管理员使用 `spec_strategy=import`；Then 平台导入规范文件并记录来源路径
全文：.sillyspec/changes/archive/2026-05-29-workspace-intake-spec-bootstrap/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-047 规范同步
变更：2026-05-29-workspace-intake-spec-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Workspace 已有关联 SpecWorkspace；When 调用 `spec-sync`；Then 平台通过受控 CLI adapter 同步规范文件
全文：.sillyspec/changes/archive/2026-05-29-workspace-intake-spec-bootstrap/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-048 规范校验
变更：2026-05-29-workspace-intake-spec-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given SpecWorkspace 缺少必要 frontmatter；When 调用 `spec-validate`；Then 返回 error 级诊断并阻止进入执行阶段
全文：.sillyspec/changes/archive/2026-05-29-workspace-intake-spec-bootstrap/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-049 Kill 运行中的 Agent
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-050 Diff 收集
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-02
最近确认：c0af692c7

## FR-unmapped-051 进程注册表
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-03
最近确认：c0af692c7

## FR-unmapped-052 Stale Run 清理
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-04
最近确认：c0af692c7

## FR-unmapped-053 Allowed Paths 隔离
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-05
最近确认：c0af692c7

## FR-unmapped-054 输出脱敏
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-06
最近确认：c0af692c7

## FR-unmapped-055 前端 Agent Run 列表页
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-07
最近确认：c0af692c7

## FR-unmapped-056 前端 Agent Run 详情页
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-08
最近确认：c0af692c7

## FR-unmapped-057 前端 SSE 日志流
变更：2026-05-30-agent-adapter
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-agent-adapter/requirements.md#FR-09
最近确认：c0af692c7

## FR-unmapped-058 tasks.md 模板生成
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-01
最近确认：3cdaada90

## FR-unmapped-059 verification.md 模板生成
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-02
最近确认：3cdaada90

## FR-unmapped-060 MASTER.md 格式增强
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-03
最近确认：3cdaada90

## FR-unmapped-061 batch-generate 传递 lease_id
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-04
最近确认：3cdaada90

## FR-unmapped-062 Git 提交并推送
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-05
最近确认：3cdaada90

## FR-unmapped-063 创建 Pull Request
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-06
最近确认：3cdaada90

## FR-unmapped-064 PAT 安全处理
变更：2026-05-30-change-writer
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-05-30-change-writer/requirements.md#FR-07
最近确认：3cdaada90

## FR-unmapped-065 幂等创建（idempotency_key）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 开发者调用 start_run 并提供 idempotency_key = "abc123" 开发者调用 start_run 并提供 idempotency_k；When 该 key 不存在 该 key 已存在且对应 AgentRun 状态为 pending/running 该 key 已存在且对应 AgentRun 状态为 co；Then 正常创建 AgentRun（201），记录 idempotency_key 返回已有 AgentRun（200），不重复创建 返回已有 AgentRun（200
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-066 执行恢复（resume_token）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When AgentRun.resume_token 不为 NULL resume_token 匹配 resume_token 不匹配 AgentRun 状态为 comp；Then 可通过 resume 端点恢复执行 AgentRun 状态重置为 pending → running，重新执行 返回 403 INVALID_RESUME_TO
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-02
最近确认：c0af692c7

## FR-unmapped-067 进度快照（checkpoint）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 AgentRun 正在执行（状态 running） 一个 AgentRun 已保存 checkpoint 调用 save_checkpoint 时指定 e；When 调用 save_checkpoint 并传入 data = {"step": 3, "files_modified": [...]} 调用 load_check
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-03
最近确认：c0af692c7

## FR-unmapped-068 乐观锁（optimistic_lock）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 AgentRun.version = 3 并发冲突返回 409；When 两个并发请求同时更新该 AgentRun 客户端重新获取最新 version 后重试；Then 第一个成功（version → 4），第二个检测到冲突返回 409 更新成功
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-04
最近确认：c0af692c7

## FR-unmapped-069 审批门（approval_token）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 AgentRun 被标记为需要审批 管理员调用 approve 端点并传入正确的 approval_token 管理员调用 approve 端点并传入错误；When 执行到高风险操作前 token 匹配 token 不匹配 超过审批超时（默认 1 小时）
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-05
最近确认：c0af692c7

## FR-unmapped-070 上下文一致性（context_fingerprint）
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 开发者调用 start_run 开发者调用 resume 端点 开发者调用 resume 端点；When AgentSpecBundle 构建 提供了 context_fingerprint 参数且与存储值不匹配 不提供 context_fingerprint 参数；Then 计算 proposal + design + plan + task_content 的 SHA-256 指纹，存入 context_fingerprint 返
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-06
最近确认：c0af692c7

## FR-unmapped-071 重试控制
变更：2026-05-30-execution-coordinator
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 AgentRun 执行失败 一个 AgentRun 执行失败；When retry_count < max_retries retry_count >= max_retries；Then 可通过 resume 自动重试，retry_count 递增 不允许自动重试，返回 409 MAX_RETRIES_EXCEEDED
全文：.sillyspec/changes/archive/2026-05-30-execution-coordinator/requirements.md#FR-07
最近确认：c0af692c7

## FR-unmapped-072 ToolPolicy CRUD
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 workspace 存在 一个 workspace 已有 ToolPolicy 一个 ToolPolicy 存在 一个 ToolPolicy 存在；When 开发者 POST /api/workspaces/{ws_id}/tool-policies 并提供 name + 配置 开发者 GET /api/worksp；Then 创建 ToolPolicy 并返回 201 返回该 workspace 下所有 policy 列表 更新 policy 并返回 200 删除 policy，关联
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-073 AgentRun 关联 ToolPolicy
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 AgentRun 正在创建 一个 AgentRun 正在创建；When 指定 tool_policy_id 未指定 tool_policy_id；Then AgentRun 记录关联该 policy AgentRun 使用 default_policy（全量允许 + 全局安全限制）
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-02
最近确认：c0af692c7

## FR-unmapped-074 策略校验 — 工具白名单
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ToolPolicy.allowed_tools = ["file_read", "file_list"] ToolPolicy.allowed_tools =；When Agent 调用 shell_exec Agent 调用 file_read；Then 返回 403 TOOL_OPERATION_FORBIDDEN 正常执行
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-03
最近确认：c0af692c7

## FR-unmapped-075 策略校验 — 路径限制
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ToolPolicy.allowed_paths = ["src/", "tests/"] ToolPolicy.allowed_paths = ["."]；When Agent 调用 file_read path="../../etc/passwd" Agent 调用 file_read path="src/main.py"；Then 返回 403 TOOL_PATH_FORBIDDEN（路径逃逸） 正常执行
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-04
最近确认：c0af692c7

## FR-unmapped-076 策略校验 — shell 命令黑名单
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ToolPolicy.blocked_commands = ["curl", "wget"] 全局 SHELL_BLOCKED_PATTERNS 包含 sudo；When Agent 调用 shell_exec command="curl" Agent 调用 shell_exec command="sudo"；Then 返回 403 TOOL_OPERATION_FORBIDDEN 返回 403 TOOL_OPERATION_FORBIDDEN（全局黑名单始终生效）
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-05
最近确认：c0af692c7

## FR-unmapped-077 策略校验 — 资源限制
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ToolPolicy.max_timeout = 30 ToolPolicy.max_output_size = 32000；When Agent 调用 shell_exec timeout=60 工具输出 50000 字符；Then 实际超时被限制为 30s 输出被截断为 32000 字符
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-06
最近确认：c0af692c7

## FR-unmapped-078 run_tests 工具
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given lease 处于 locked 状态且 policy 允许 run_tests run_tests 执行超时；When Agent 调用 run_tests runner="pytest" path="tests/" 超过 policy.max_timeout；Then 在 lease root 下执行 pytest，返回结构化结果 (passed/failed/skipped 计数 + 失败列表) 终止进程，返回 result
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-07
最近确认：c0af692c7

## FR-unmapped-079 http_get 工具
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given ToolPolicy.allowed_domains = ["api.github.com", "pypi.org"] ToolPolicy.allowed_d；When Agent 调用 http_get url="https://api.github.com/repos/..." Agent 调用 http_get url="
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-08
最近确认：c0af692c7

## FR-unmapped-080 审计双写
变更：2026-05-30-tool-gateway
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任意工具调用执行成功 AuditLog 记录；When ToolGatewayService.execute() 完成 查看 details_json；Then 同时存在 ToolOperationLog 记录和 AuditLog 记录 包含 tool_type、params、result_code 信息
全文：.sillyspec/changes/archive/2026-05-30-tool-gateway/requirements.md#FR-09
最近确认：c0af692c7

## FR-unmapped-081 spec-bootstrap 创建异步 AgentRun
变更：2026-06-02-spec-bootstrap-agent-stream-interaction
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户拥有 `WORKSPACE_WRITE` 权限且 workspace 存在对应 SpecWorkspace 后台任务已启动；When 用户调用 `POST /api/workspaces/{workspace_id}/spec-bootstrap` Agent run 状态变为 `runnin；Then 后端创建 `AgentRun(status=pending)` 和 `AgentRunWorkspace` 关联，并立即返回 `agent_run_id`、`s
全文：.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/requirements.md#FR-01
最近确认：cfd794ddf

## FR-unmapped-082 bootstrap 通过 ClaudeCodeAdapter 执行
变更：2026-06-02-spec-bootstrap-agent-stream-interaction
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given `SpecBootstrapService` 已加载 `SpecWorkspace` 和 `Workspace`；When 后台执行 bootstrap run；Then 后端构造 `AgentSpecBundle` 并调用 `ClaudeCodeAdapter.run_with_bundle()`
全文：.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/requirements.md#FR-02
最近确认：cfd794ddf

## FR-unmapped-083 Agent 执行 init + scan + 验证
变更：2026-06-02-spec-bootstrap-agent-stream-interaction
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 收到 bootstrap bundle Agent 执行结束；When `ClaudeCodeAdapter` 启动 Claude CLI 后端运行 `SpecValidator.validate(spec_root)`；Then prompt 必须包含 `sillyspec init --dir <spec_root>` 验证通过时 `SpecWorkspace.sync_status=
全文：.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/requirements.md#FR-03
最近确认：cfd794ddf

## FR-unmapped-084 Workspace 页面实时展示消息流
变更：2026-06-02-spec-bootstrap-agent-stream-interaction
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given `/spec-bootstrap` 返回 `agent_run_id`；When Workspace 详情页收到响应；Then 页面立即连接该 run 的 SSE stream
全文：.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/requirements.md#FR-04
最近确认：cfd794ddf

## FR-unmapped-085 双入口用户确认/指导
变更：2026-06-02-spec-bootstrap-agent-stream-interaction
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 输出需要用户确认或指导的事件 用户提交指导文本；When 前端解析到 pending input 状态 后端收到用户输入；Then Workspace 详情页展示轻量输入框 用户输入记录到 `AgentRunLog`
全文：.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/requirements.md#FR-05
最近确认：cfd794ddf

## FR-unmapped-086 后端 SSE 支持续传参数
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 调用者请求 `GET /api/workspaces/{ws}/agent/runs/{id}/stream?after={log_id}` 调用者未传 `af；When 后端处理 SSE stream 请求 后端处理请求；Then DB replay 阶段只返回 `id > after` 的 AgentRunLog 记录 行为与当前完全一致（返回所有日志）
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-01
最近确认：cfd794ddf

## FR-unmapped-087 SSE 事件携带 log_id
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 后端通过 SSE 推送日志事件；When 事件格式序列化；Then 每个事件包含 `log_id` 字段（AgentRunLog.id）
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-02
最近确认：cfd794ddf

## FR-unmapped-088 AgentRunStreamClient 连接管理
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 前端创建 `AgentRunStreamClient` 实例 调用 `disconnect()` 方法；When 调用 `connect(token)` 方法 连接处于任何状态；Then 内部创建 EventSource 并连接到对应 run 的 SSE 端点 关闭 EventSource，状态变为 `disconnected`
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-03
最近确认：cfd794ddf

## FR-unmapped-089 断线自动重连
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given SSE 连接处于 `connected` 状态 重连流程执行中 连续重试 5 次均失败；When EventSource 触发 `onerror` 获取新 token 失败或回填请求失败 达到最大重试次数；Then 自动执行重连流程：关闭旧连接 → 刷新 token → 回填日志 → 重建连接 计入重试次数，等待指数退避后重试 状态变为 `error`
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-04
最近确认：cfd794ddf

## FR-unmapped-090 断线日志回填
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given SSE 连接断开并准备重连 回填日志和 SSE 新事件存在重叠；When 获取到新 token 后 两者都包含相同 `log_id` 的事件；Then 调用 `GET /logs?after={lastLogId}` 获取断线期间日志 通过 `log_id` Set 去重，只处理一次
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-05
最近确认：cfd794ddf

## FR-unmapped-091 log_id 去重
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given SSE 事件携带 `log_id` 字段 回填日志和 SSE 推送可能重叠；When 前端收到事件 log_id 已存在于 Set 中；Then 维护 `Set<number>` 记录已处理的 log_id 该事件被安全丢弃，不触发 `onMessage`
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-06
最近确认：cfd794ddf

## FR-unmapped-092 Workspace 详情页集成
变更：2026-06-02-sse-reliable-stream
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Workspace 详情页使用 `AgentRunStreamClient`；When Bootstrap 按钮触发后；Then 使用新的 `AgentRunStreamClient` 替换手动 EventSource 管理
全文：.sillyspec/changes/archive/2026-06-02-sse-reliable-stream/requirements.md#FR-07
最近确认：cfd794ddf

## FR-unmapped-093 生成项目规范统一为 Bootstrap 流程并跳转详情页
变更：2026-06-03-workspace-bootstrap-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在「添加 Workspace」弹窗已完成扫描，处于 ready 阶段；When 用户点击「生成项目规范」按钮；Then 前端调用 `scanGenerate(rootPath)` 创建（或幂等复用）workspace 与 scan run
全文：.sillyspec/changes/archive/2026-06-03-workspace-bootstrap-flow/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-094 进入详情页自动检测并恢复进行中的 Bootstrap 回显
变更：2026-06-03-workspace-bootstrap-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 某 workspace 存在一个 `change_id` 为空、status 为 pending 或 running 的 scan run；When 用户进入 `/workspaces/{id}` 详情页（首次进入或刷新）；Then `load()` 通过 `listWorkspaceAgentRuns` 查到该进行中 run
全文：.sillyspec/changes/archive/2026-06-03-workspace-bootstrap-flow/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-095 Bootstrap 执行期间防止重复触发
变更：2026-06-03-workspace-bootstrap-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 某 workspace 已有进行中（pending/running）的 scan run；When 用户（在详情页或另一标签页弹窗）再次发起 `scan-generate`；Then 后端不创建新 run，幂等返回现有进行中 run 的 id
全文：.sillyspec/changes/archive/2026-06-03-workspace-bootstrap-flow/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-096 Bootstrap 成功后自动创建子组件
变更：2026-06-03-workspace-bootstrap-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given scan agent 执行成功（exit_code == 0）；When 后端 `_execute_scan_run` 进入成功收尾分支；Then 自动执行 reparse 逻辑，创建对应子 workspace 与 relations
全文：.sillyspec/changes/archive/2026-06-03-workspace-bootstrap-flow/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-097 完成后详情页刷新子组件计数
变更：2026-06-03-workspace-bootstrap-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 详情页已连接的 Bootstrap SSE 流收到 done 事件；When `onDone` 回调触发；Then 调用 `load()` 重新拉取数据
全文：.sillyspec/changes/archive/2026-06-03-workspace-bootstrap-flow/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-098 Gate 时机修正 — transition 时 gate=none
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When 调用 `transition(target_stage="brainstorm")` `complete_stage(stage="propose")` 被调用；Then `current_stage=brainstorm, human_gate=none`（不是 need_requirement_input） `human_ga
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-099 complete_stage 统一入口
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 完成任意阶段 brainstorm 完成，result="clear" brainstorm 完成，result="ambiguous" execu；When 系统调用 `complete_stage(workspace_id, change_id, stage, result)` `complete_stage(st；Then 根据 stage 和 result 执行对应后续动作（设 gate / transition / dispatch），不再散落在 transition / au
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-100 rerun_stage 同阶段重跑
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 propose 阶段，`human_gate=need_proposal_review` 一个 Change 处于 plan 阶段，`；When `proposal_review(decision="revise", comment="四件套缺少边界条件")` 被调用 `plan_review(decis；Then `human_gate=none`，重新 dispatch propose Agent，不触发 InvalidTransition `human_gate=no
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-101 verify→propose 回退边
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 verify 阶段，`human_gate=need_human_test`；When `human_test(result="doc_mismatch", comment="API 文档与实际不一致")` 被调用；Then `current_stage=propose, human_gate=none`，并 dispatch propose Agent
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-102 proposal-review 修正
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 propose 阶段，`human_gate=need_proposal_review` 任意 proposal_review 调用；When `proposal_review(decision="approve")` 被调用 `proposal_review(decision="unclear", c；Then `current_stage=plan, human_gate=none`，并 dispatch plan Agent `current_stage=brain
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-103 plan-review 修正
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 plan 阶段，`human_gate=need_plan_review`；Then `current_stage=execute, human_gate=none`，并 dispatch execute Agent `current_stage
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-104 human-test 修正
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 verify 阶段，`human_gate=need_human_test`；When `human_test(result="pass")` 被调用 `human_test(result="bug", comment="列表分页显示错误")` 被
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-07
最近确认：f7f73d86c

## FR-unmapped-105 archive-confirm API
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 Change 处于 archive 阶段，`human_gate=need_archive_confirm` 一个 Change 不处于 archive+；When `POST /api/workspaces/{ws_id}/changes/{id}/archive-confirm` 被调用 调用 archive-confi；Then `human_gate=none`，dispatch archive Agent 返回 400 错误 `current_stage=archived, huma
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-08
最近确认：f7f73d86c

## FR-unmapped-106 前端 Gate 面板 comment
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 详情页显示 Gate 面板（任意 gate） revise / unclear / replan / bug / doc_mismatch 操作 approve；When 用户看到操作按钮 comment 为空 comment 为空；Then 每个面板都有一个 textarea 用于输入意见 按钮禁用或提交时提示"请填写意见" 允许提交（comment 可选）
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-09
最近确认：f7f73d86c

## FR-unmapped-107 归档确认按钮修正
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 详情页显示 `need_archive_confirm` Gate 面板；When 用户点击"确认归档"；Then 调用 `archiveConfirm(workspaceId, changeId, comment)` API，不调用 `humanTest(pass)`
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-10
最近确认：f7f73d86c

## FR-unmapped-108 清理旧 UI 残留
变更：2026-06-04-fix-agent-driven-change-center-flow
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更详情页代码；When 搜索 `ready_for_dev` / `accepted` / `executeChange` / `handleArchive` / `submitFee；Then 无匹配引用
全文：.sillyspec/changes/archive/2026-06-04-fix-agent-driven-change-center-flow/requirements.md#FR-11
最近确认：f7f73d86c

## FR-unmapped-109 日志区域宽度自适应
变更：2026-06-05-agent-74b61b
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Agent 控制台页面加载完成；When 用户在"已完成运行"表格中点击"查看日志"展开日志区域；Then 日志区域宽度应填满 AppShell 主内容区的可用宽度（viewport 减去 sidebar）
全文：.sillyspec/changes/archive/2026-06-05-agent-74b61b/requirements.md#FR-01
最近确认：90ddec4bc

## FR-unmapped-110 长日志行显示
变更：2026-06-05-agent-74b61b
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 日志区域已展开；When 日志内容包含超过容器宽度的长文本行；Then 长文本行应自然折行显示（`white-space: pre-wrap; word-break: break-all`）
全文：.sillyspec/changes/archive/2026-06-05-agent-74b61b/requirements.md#FR-02
最近确认：90ddec4bc

## FR-unmapped-111 小屏兼容
变更：2026-06-05-agent-74b61b
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户在 1280px 或更小屏幕上访问 Agent 控制台；When 页面加载完成；Then 页面布局正常，内容不溢出
全文：.sillyspec/changes/archive/2026-06-05-agent-74b61b/requirements.md#FR-03
最近确认：90ddec4bc

## FR-unmapped-112 日志块内水平滚动
变更：2026-06-08-2026-06-05-agent-log-width
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-08-2026-06-05-agent-log-width/requirements.md#FR-01
最近确认：f311f977d

## FR-unmapped-113 页面无 X 轴滚动条
变更：2026-06-08-2026-06-05-agent-log-width
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-08-2026-06-05-agent-log-width/requirements.md#FR-02
最近确认：f311f977d

## FR-unmapped-114 日志内容完整性
变更：2026-06-08-2026-06-05-agent-log-width
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-08-2026-06-05-agent-log-width/requirements.md#FR-03
最近确认：f311f977d

## FR-unmapped-115 现有功能不受影响
变更：2026-06-08-2026-06-05-agent-log-width
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-08-2026-06-05-agent-log-width/requirements.md#FR-04
最近确认：f311f977d

## FR-unmapped-127 守护进程注册
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-128 任务认领
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-129 任务执行
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-130 心跳续期
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-131 进度报告
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-132 任务完成
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-133 运行时管理
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-134 运行位置选择
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-135 优雅降级
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-136 密钥隔离
变更：2026-06-09-local-daemon
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-09-local-daemon/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-137 Platform Admin 权限校验
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-138 安全保护
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-139 用户列表增强
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-140 用户详情
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-141 管理员重置密码
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-142 审计日志
变更：2026-06-10-user-management
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-10-user-management/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-207 统一调度入口
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-208 废弃子进程直跑路径
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-209 CLAUDE.md 不被覆盖
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-210 阶段配置完整
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-211 AgentSpecBundle 含阶段上下文
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-212 状态同步
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-213 三字段边界
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-214 工作目录正确
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-215 Transition Response Model
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-216 测试覆盖
变更：2026-06-19-agent-stage-dispatch-superseded
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-06-19-agent-stage-dispatch-superseded/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-236 Codex runtime 创建 interactive session
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-003@v1、D-005@v1、D-009@v1
场景正文：
- 场景：默认场景 — Given `/runtimes` 中存在在线 Codex runtime；When 用户在 Codex runtime 会话弹窗中发送首条消息；Then frontend 调用 `createSession({provider:"codex"})`
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-01
最近确认：3cace8c05

## FR-unmapped-237 Codex 支持同一 session 多轮对话
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-003@v1、D-009@v1
场景正文：
- 场景：默认场景 — Given Codex `AgentSession` 已 active；When 用户发送第二条消息；Then frontend 调用 `injectSession(sessionId,prompt)`
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-02
最近确认：3cace8c05

## FR-unmapped-238 Codex 支持运行中 interrupt
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — Given Codex turn 正在运行且 driver 已收到 `turn/started`；When 用户点击打断；Then backend 下发 `SESSION_INTERRUPT`
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-03
最近确认：3cace8c05

## FR-unmapped-239 Codex 输出进入现有日志与 SSE
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-003@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given Codex app-server 输出 agent message、tool use、tool result 或 error；When daemon 收到 JSON-RPC notification；Then Codex driver 将其归一化为 flat message
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-04
最近确认：3cace8c05

## FR-unmapped-240 Codex session 支持 end 与历史回看
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given Codex `AgentSession` 处于 active 或 running；When 用户点击结束会话；Then backend 下发 `SESSION_END`
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-05
最近确认：3cace8c05

## FR-unmapped-241 Codex 支持 reopen 与 daemon recovery
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-003@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given Codex ended/failed session 有 `agent_session_id` thread id Codex session 缺少 threa；When 用户点击继续对话或 daemon 启动恢复 尝试 reopen/recovery；Then backend 允许 provider `codex` reopen 系统不得伪造新 thread
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-06
最近确认：3cace8c05

## FR-unmapped-242 frontend Codex runtime 不走 quick-chat
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given runtime provider 为 `codex`；When `/runtimes` 弹窗渲染右侧会话区；Then 使用 `InteractiveSessionChatSection`
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-07
最近确认：3cace8c05

## FR-unmapped-243 Codex 普通 approval 策略与 Claude Code 一致
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-006@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given Codex session 配置为 `manual_approval=true` 且 `ask_user_only=true` Codex session 配置；When app-server 发出 command/file/permission approval request app-server 发出 command/fil；Then daemon 按 ask-only 策略 allow-through 并记录 metadata daemon 发送 backend `PERMISSION_RE
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-08
最近确认：3cace8c05

## FR-unmapped-244 Codex 用户输入请求复用现有 dialog 卡片
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-006@v1、D-008@v1、D-010@v1
场景正文：
- 场景：默认场景 — Given Codex app-server 发出 `item/tool/requestUserInput` Codex app-server 发出复杂 MCP elici；When daemon 收到 server request daemon 处理该 request；Then daemon 归一化为现有 `AskUserDialogCard` 可渲染的 `questions/options` request fail-closed
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-09
最近确认：3cace8c05

## FR-unmapped-245 Claude Code interactive 行为不回退
变更：2026-06-23-2026-06-23-codex-interactive-session
状态：active
摘要：默认场景
依据决策：D-001@v1、D-006@v1、D-008@v1、D-009@v1
场景正文：
- 场景：默认场景 — Given provider 为 `claude`；When 用户创建、inject、interrupt、end、reopen、触发 AskUserQuestion；Then 现有 Claude Code 行为保持一致
全文：.sillyspec/changes/archive/2026-06-23-2026-06-23-codex-interactive-session/requirements.md#FR-10
最近确认：3cace8c05

## FR-unmapped-425 TaskExecute 支持 file_urls 字段
变更：2026-07-22-2026-07-22-task-execute-attachments
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given `ppm_task_execute` 表；When migration 升级；Then 表新增 `file_urls` JSON 列（`nullable=False`, `server_default='[]'`），旧记录 `file_urls=[
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-task-execute-attachments/requirements.md#FR-01
最近确认：ce86a8f49

## FR-unmapped-426 计划任务执行填报上传附件（按天）
变更：2026-07-22-2026-07-22-task-execute-attachments
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1、D-005@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 进行中的计划任务，打开 `task-detail-modal` execute 模式，有 in-flight 记录；When 用户在填报区某天上传附件 + 填耗时/说明 + 提交；Then 当天附件 id 存入对应 `TaskExecute.file_urls`；重开时首天已上传附件回填预填；不传 file_urls 时保留原值不清空
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-task-execute-attachments/requirements.md#FR-02
最近确认：ce86a8f49

## FR-unmapped-427 问题执行填报上传附件（按天）
变更：2026-07-22-2026-07-22-task-execute-attachments
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1、D-005@v1、D-006@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 进行中的问题，打开 `problem-detail-modal` execute 模式，有 in-flight 记录；When 用户填报区上传附件 + 提交；Then `file_urls` 经 `problem/router.py` 拆包（`file_urls=body.file_urls`）→ `execute_probl
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-task-execute-attachments/requirements.md#FR-03
最近确认：ce86a8f49

## FR-unmapped-428 执行记录表回显附件
变更：2026-07-22-2026-07-22-task-execute-attachments
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 执行记录表（task/problem-detail-modal）；When 记录有 `file_urls`；Then 附件列行内 `FileViewer` 显示（图片缩略图点击预览 / 文件图标点击下载）；无附件显示空
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-task-execute-attachments/requirements.md#FR-04
最近确认：ce86a8f49

## FR-unmapped-429 跨天填报每天各自附件
变更：2026-07-22-2026-07-22-task-execute-attachments
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 跨天填报（多天 DetailDay）；When 每天各自上传附件 + 提交；Then 每天的 `executePlanTask`/`executeProblem` 携带当天 `file_urls`，各自落独立 `TaskExecute` 记录
全文：.sillyspec/changes/archive/2026-07-22-2026-07-22-task-execute-attachments/requirements.md#FR-05
最近确认：ce86a8f49

## FR-unmapped-647 daemon 消费 SDK 任务生命周期消息（D-001@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When daemon session-manager `_onMessage` 识别到上述 subtype；Then 注册/更新/注销会话级任务表，并发出对应 `agent_task_status` 事件：started→running（含 task_id/tool_use_i
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-01
最近确认：c7f48562c

## FR-unmapped-648 异步启动回执解析兜底（D-001@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Task/Agent 工具的 tool_result 文本含 "Async agent launched successfully" 与 agentId（CLI；When daemon user tool_result 分支解析命中；Then 以该 tool_use_id 注册任务表并发出 `agent_task_status {status:'running', async:true, task_i
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-02
最近确认：c7f48562c

## FR-unmapped-649 [TASK_*] 持久日志行（D-002@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given FR-01/02 的任一生命周期节点触发；When daemon 落库通道写入
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-03
最近确认：c7f48562c

## FR-unmapped-650 backend 事件 schema 扩展与透传（D-001@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 发出扩展字段的 agent_task_status；When backend `notify_agent_task_status` 接收并发布到 Redis `agent_session:{id}`；Then 新字段（status 终态值/tool_use_id/summary/last_tool_name/elapsed_ms/total_tokens/tool_u
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-04
最近确认：c7f48562c

## FR-unmapped-651 子代理日志跨轮归位（D-003@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given submit_messages 收到带 parent_tool_use_id 的日志行，且该 tool_use 属于早前已完成的派发 run；When backend 落库；Then 行的 run_id 归写为派发 run（进程内 LRU + tool_call 行冷启动反查）；查不到映射时保持现状不报错；历史行不迁移。
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-05
最近确认：c7f48562c

## FR-unmapped-652 后台卡片全生命周期展示（D-005@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 头部"后台"下拉中的 AgentTaskCard 处于 running；Then 显示"正在做什么"（last_tool_name+summary）、走秒计时（本地 tick + elapsed_ms 校准）、tokens/工具次数、最后活跃
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-06
最近确认：c7f48562c

## FR-unmapped-653 子代理目录与会话块异步感知（D-005@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 子代理块/目录行对应异步派发（async 标记或 [TASK_*] 元数据）；When tool_result（启动回执）到达；Then 块状态保持"后台运行中"且时长走秒（不判 done/不用往返差值）；终态由 TASK_NOTIFICATION 驱动显示服务端真实时长；前台（阻塞式）子代理状态
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-07
最近确认：c7f48562c

## FR-unmapped-654 空 prompt 注入防御（D-004@v1）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 调用方 POST /inject 且 prompt strip 后为空；When backend `inject_session` 处理；Then 返回 422（中文文案，不创建 AgentRun/不写 user_input 行）；前端发送按钮对空内容 disabled。
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-08
最近确认：c7f48562c

## FR-unmapped-655 spike 验证 SDK 运行时发射（R-01）
变更：2026-08-27-background-subagent-progress
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本地 daemon + 后台 Agent 会话；When session-manager 记录 task_* 到达情况；Then 验证结论（发/不发、task_progress 频率）回填 design.md §10，确定兜底路径权重与节流参数。
全文：.sillyspec/changes/archive/2026-08-27-background-subagent-progress/requirements.md#FR-09
最近确认：c7f48562c

## FR-unmapped-656 Playwright 基础设施
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-001@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given frontend 目录存在 @playwright/test devDep；When 新增 `frontend/playwright.config.ts`（chromium 单浏览器 / workers:1 / timeout 60s / ret；Then `pnpm test:e2e` 可发现并执行 `frontend/e2e/*.spec.ts`，不配置 webServer（本机手动前置）
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-01
最近确认：0ea257289

## FR-unmapped-657 测试身份与数据准备
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-002@v2
场景正文：
- 场景：默认场景 — Given bootstrap 平台管理员凭据（E2E_BOOTSTRAP_EMAIL/PASSWORD，本机 backend/.env 或 CI env）；When 每次测试运行；Then admin 先 `POST /api/admin/roles` 幂等创建角色（key=`e2e_smoke_<runid>` 下划线、permission_ke
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-02
最近确认：0ea257289

## FR-unmapped-658 API 登录与会话注入
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given FR-02 创建的冒烟用户；When TestApiClient 调 `POST /api/auth/login`（首登无 captcha）+ `GET /api/auth/me`；Then `page.addInitScript` 注入 `localStorage["multi-agent-platform.session"]`，格式 `{stat
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-03
最近确认：0ea257289

## FR-unmapped-659 真实 UI 登录链路用例（auth.spec）
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given dev 环境前后端在跑；When 执行 4 用例：A1 未登录访问 /workspaces 重定向 /login；A2 表单登录成功跳 /workspaces 且 PageHeader/侧边栏可；Then 全部断言通过；等待策略一律关键元素/文本，禁用 networkidle（SSE 长连接）
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-04
最近确认：0ea257289

## FR-unmapped-660 导航冒烟用例（navigation.spec）
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-002@v2
场景正文：
- 场景：默认场景 — Given FR-03 注入登录的冒烟用户（挂 workspace:read）；When 执行 4 用例：N1 /workspaces 列表页渲染（PageHeader「选择工作区」/列表容器）；N2 侧边栏→智能体会话 /sessions；N3 侧；Then 全部断言通过
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-05
最近确认：0ea257289

## FR-unmapped-661 本机运行文档与凭据卫生
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-008@v1
场景正文：
- 场景：默认场景 — Given 开发者首次使用 e2e 体系；When 阅读 `frontend/e2e/README.md`；Then 可按文档完成前置（dev compose 起 pg/redis、backend/.env 含 bootstrap admin + `AUTH_LOGIN_RAT
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-06
最近确认：0ea257289

## FR-unmapped-662 CI e2e job
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-004@v1、D-007@v1、D-008@v1
场景正文：
- 场景：默认场景 — Given push/PR 触发 paths frontend/**（或手动 workflow_dispatch）；When e2e-ci.yml 执行：services postgres:16 + redis:7 → uv sync → uvicorn（env 含 AUTH_LOGI；Then job 在 20min 超时内全绿；失败时 playwright-report/ 与 test-results/ 上传为 artifact
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-07
最近确认：0ea257289

## FR-unmapped-663 双测试栈隔离与类型覆盖
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-009@v1
场景正文：
- 场景：默认场景 — Given vitest.config.ts 无 include 配置（默认必扫 e2e/*.spec.ts）；Then `pnpm test` 不收集 e2e 用例（157 个现有测试不受影响）；`pnpm typecheck` 覆盖 e2e 代码
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-08
最近确认：0ea257289

## FR-unmapped-664 依赖清理
变更：2026-08-29-frontend-e2e-playwright
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given frontend devDependencies 含零引用的 puppeteer；When 移除 puppeteer 并更新 pnpm-lock.yaml（与 package.json 同 commit）；Then 依赖树无 puppeteer，`pnpm install --frozen-lockfile` 一致，@playwright/test 保留
全文：.sillyspec/changes/archive/2026-08-29-frontend-e2e-playwright/requirements.md#FR-09
最近确认：0ea257289

## FR-unmapped-665 sillyspec 版本显示
变更：2026-08-31-machine-sillyspec-version
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 机器在线且 daemon 已探测到本机 sillyspec 版本；When 用户查看机器列表；Then 机器卡 meta 行显示 `sillyspec <版本>` 徽标：已最新=常色；落后=橙色「当前 → 最新」+「有新版本」小标签；未安装=红色「未安装」
全文：.sillyspec/changes/archive/2026-08-31-machine-sillyspec-version/requirements.md#FR-01
最近确认：26abd5305

## FR-unmapped-666 手动远程升级
变更：2026-08-31-machine-sillyspec-version
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 机器在线；When 用户点击「升级 sillyspec」（未安装时文案为「安装 sillyspec」，失败后为「重试升级」）；Then 后端校验归属后经 WS `daemon:sillyspec_update` 触发 daemon 执行 `npm install -g sillyspec@lat
全文：.sillyspec/changes/archive/2026-08-31-machine-sillyspec-version/requirements.md#FR-02
最近确认：26abd5305

## FR-unmapped-667 升级过程可见
变更：2026-08-31-machine-sillyspec-version
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 升级已触发；When daemon 状态流转；Then 机器卡横幅按 `sillyspec_update.state` 显示四态：running=info「正在升级（from → to）」、deferred=warn
全文：.sillyspec/changes/archive/2026-08-31-machine-sillyspec-version/requirements.md#FR-03
最近确认：26abd5305

## FR-unmapped-668 运行期自动定期升级
变更：2026-08-31-machine-sillyspec-version
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 运行中且 `sillyspec_update_interval_sec` > 0（默认 3600）；When 定时循环发现本机落后于 npm 最新版或未安装；Then 自动触发升级（trigger=auto），机器忙时推迟不打断进行中的会话/任务（复用 `_isBusyForUpdate` 三臂忙判定）
全文：.sillyspec/changes/archive/2026-08-31-machine-sillyspec-version/requirements.md#FR-04
最近确认：26abd5305

## FR-unmapped-669 数据链与兼容
变更：2026-08-31-machine-sillyspec-version
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given daemon 与 backend 版本可能不齐；Then register 对 sillyspec_version/latest 直接落值（含 null）；心跳对二者非 None 才覆盖、对 sillyspec_upd
全文：.sillyspec/changes/archive/2026-08-31-machine-sillyspec-version/requirements.md#FR-05
最近确认：26abd5305

## FR-unmapped-670 统一 current_stage 枚举
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Change 模型的 current_stage 字段；When 系统初始化；Then current_stage 枚举为：draft, scan, brainstorm, propose, plan, execute, verify, quick
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-671 新增 human_gate 字段
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Change 模型；When 执行 DB 迁移；Then Change 表新增 human_gate 字段（VARCHAR(50), DEFAULT 'none'）
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-672 旧数据迁移
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已有 Change 记录的 current_stage 为 rework_required 已有 Change 记录的 current_stage 为 acce；When 迁移脚本执行 迁移脚本执行；Then current_stage 更新为 'verify'，human_gate 更新为 'blocked' current_stage 更新为 'verify'，h
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-673 Agent 驱动流转规则
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Change 的 current_stage 为 draft intake agent 判断需求明确 intake agent 判断需求不明确；When 创建完成 AgentRun 完成 AgentRun 完成；Then 自动 dispatch intake agent 分析需求 current_stage = propose，dispatch propose agent cur
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-674 propose 文档确认 Gate
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given propose agent 完成四件套生成；When AgentRun 状态为 completed；Then current_stage = propose，human_gate = need_proposal_review
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-675 proposal-review API
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given current_stage = propose 且 human_gate = need_proposal_review current_stage = prop；When POST /changes/{id}/proposal-review { decision: "approve" } POST /changes/{id}/pr；Then current_stage = plan，dispatch plan agent，human_gate = none dispatch propose agen
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-676 plan 文档确认 Gate
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given plan agent 完成计划生成；When AgentRun 状态为 completed；Then current_stage = plan，human_gate = need_plan_review
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-07
最近确认：98d3e56dd

## FR-unmapped-677 plan-review API
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given current_stage = plan 且 human_gate = need_plan_review current_stage = plan 且 huma；When POST /changes/{id}/plan-review { decision: "approve" } POST /changes/{id}/plan-r；Then current_stage = execute，dispatch execute agent，human_gate = none dispatch plan a
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-08
最近确认：98d3e56dd

## FR-unmapped-678 execute 完成自动 verify
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given execute agent 完成；When AgentRun 状态为 completed；Then 自动 dispatch verify agent，current_stage = verify，human_gate = none
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-09
最近确认：98d3e56dd

## FR-unmapped-679 verify 自动修复闭环
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given verify agent 完成 verify agent 完成 verify agent 完成；When AgentRun 状态为 completed 且验证通过 AgentRun 状态为 completed 且验证不通过 AgentRun 状态为 complete；Then current_stage = verify，human_gate = need_human_test dispatch quick agent 修复，修复后自
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-10
最近确认：98d3e56dd

## FR-unmapped-680 human-test API
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given current_stage = verify 且 human_gate = need_human_test current_stage = verify 且 h；When POST /changes/{id}/human-test { result: "pass" } POST /changes/{id}/human-test {；Then current_stage = archive，human_gate = need_archive_confirm dispatch quick agent c
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-11
最近确认：98d3e56dd

## FR-unmapped-681 前端按 gate 渲染交互
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given Change 详情页加载；When 读取 human_gate 值；Then 按 human_gate 值渲染对应的操作面板（非技术阶段名）
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-12
最近确认：98d3e56dd

## FR-unmapped-682 简化新建变更
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户点击新建变更；When 填写需求描述（必填）和模块（可选）；Then 创建 Change（current_stage=draft, human_gate=none）
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-13
最近确认：98d3e56dd

## FR-unmapped-683 归档 Gate
变更：agent-driven-change-center
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given current_stage = archive 且 human_gate = need_archive_confirm；When 所有检查项通过；Then 用户可确认归档
全文：.sillyspec/changes/archive/agent-driven-change-center/requirements.md#FR-14
最近确认：98d3e56dd

## FR-unmapped-684 创建变更
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-1
最近确认：98d3e56dd

## FR-unmapped-685 变更列表展示阶段
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-2
最近确认：98d3e56dd

## FR-unmapped-686 启动变更执行
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-3
最近确认：98d3e56dd

## FR-unmapped-687 实时进度展示
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-4
最近确认：98d3e56dd

## FR-unmapped-688 查看变更文档
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-5
最近确认：98d3e56dd

## FR-unmapped-689 变更执行完成
变更：change-center-redesign
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-center-redesign/requirements.md#FR-6
最近确认：98d3e56dd

## FR-unmapped-690 创建变更自动进入 clarifying 阶段
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-691 状态机转换必须遵循合法转换规则
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-692 Agent 仅在 ready_for_dev 阶段可启动执行
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-693 业务验收必须选择反馈分类
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-694 归档必须通过 6 项门禁检查
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-05
最近确认：98d3e56dd

## FR-unmapped-695 旧数据兼容迁移
变更：change-workflow-engine
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/change-workflow-engine/requirements.md#FR-06
最近确认：98d3e56dd

## FR-unmapped-696 配置 spec_data_root
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-01
最近确认：98d3e56dd

## FR-unmapped-697 补建 spec_workspaces 记录
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-02
最近确认：98d3e56dd

## FR-unmapped-698 迁移已有 scan 文档
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-03
最近确认：98d3e56dd

## FR-unmapped-699 ScanDocsService 从 spec_root 读取
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-04
最近确认：98d3e56dd

## FR-unmapped-714 现有测试不回归
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-05
最近确认：98d3e56dd
