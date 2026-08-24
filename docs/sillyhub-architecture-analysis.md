# SillyHub 架构分析报告

> 分析范围：attachments/ 架构截图 + docs/architecture-4a.md + docs/sillyspec/ 跨仓契约文档
> 分析日期：2026-08-24
> 分析目的：供 Coordinator 收敛使用的结构化摘要

---

## 1. 截图内容分析

### 1.1 UI 总览

截图展示的是 SillyHub 的 **「智能体会话」** 界面，这是平台的核心交互入口，实现"跨机器、跨智能体的统一会话"。

**左侧面板 — 会话列表**：
- 共 164 个会话，支持按标题搜索、按状态/机器/项目过滤
- 按项目分组显示：workflow(5)、deepseek-harness(1)、cc-switch(0)、sillyspec(0)、multica(0)、multi-agent-platform(47)
- 每个会话标注参与的 AI 提供商（Claude、Kimi For Coding）和轮次数
- 支持多机器视图（DESKTOP-HJ0AM09、牛逼的电脑）

**右侧面板 — 活跃会话**：
- 当前正在运行一个 SillySpec brainstorm 会话（change: `2026-08-24-platform-session-feedback-fix`）
- 展示 Agent 执行工具链：Bash(sillyspec run brainstorm --done) → Write(design.md) → Write(decisions.md) → Bash(design.md 已写) → Design Grill review agent（子代理）
- 思考过程（Chain of Thought）可视化显示
- 当前进度：6/8 完成，7/8 审查中

**底部控制栏**：
- Agent Profile 选择器（Claude Code、Kimi For Coding、未指定）
- 子代理数量指示器（当前 1 个活跃）
- 对话/进度视图切换
- "派团队"按钮（mission 编排入口）
- Token/成本统计：~115,088 tokens / $6.265

### 1.2 关键观察

1. **多 Agent 协作实证**：截图中 Design Grill review agent 作为子代理被启动，验证了平台的 multi-agent 能力
2. **SillySpec 流程可视化**：brainstorm 阶段的 8 个步骤中，step 6（写 design.md + decisions.md）完成，step 7（Design Grill 交叉审查）进行中
3. **进度同步实时性**：工具执行结果（Bash/Write）实时反映在界面上，耗时精确到秒
4. **人机协作**：Agent 执行技术任务，人类通过"打断本轮"、审批面板介入关键决策

---

## 2. 系统整体架构

### 2.1 定位

SillyHub 是**企业级 AI Agent 托管/编排/管控平台**：企业在平台上建 workspace → 绑定 daemon → 用 SillySpec 文档驱动流程管理代码变更 → 在 workspace 内派发 mission 给 AI Agent 执行 → 全程进度同步、审批、审计、凭证治理。

### 2.2 四进程分布式架构

```
浏览器 ──► frontend (Next.js) ──► backend (FastAPI) ──编排/治理──┐
                          │  WS + SSE                            │
                          │                              ┌───────┴────────┐
                          ▼                              ▼                ▼
                     用户看进度/审批               daemon (Node)     LiteLLM 网关
                                                  ↑ 真正跑 agent CLI   协议转换
                                                  │ agent 在这
                                                  └ spec 同步/凭据注入/策略沙箱
```

**关键设计原则**：平台只编排不执行，Agent 在用户自己的 daemon 运行，数据不出企业。

### 2.3 四层架构（4A 框架）

| 4A 层 | 回答 | SillyHub 映射 |
|---|---|---|
| **BA 业务架构** | 做什么 | 40+ router / 5 大域：workspace 托管 + SillySpec 变更流程托管 + Agent 编排(mission) + 凭证治理 + PPM 项目管理 |
| **DA 数据架构** | 用什么数据 | PostgreSQL 77 表 / 11 域（SQLModel + asyncpg）+ Redis 缓存 + MinIO 对象存储 + spec 文档资产树 |
| **AA 应用架构** | 怎么做 | backend FastAPI(30+模块) / frontend Next.js(5层) / daemon Node(6层) / LiteLLM 网关；Agent 编排引擎 + 两套 MCP |
| **TA 技术架构** | 在什么上做 | Python 3.12 / Node 20 + PG16 / Redis7 / MinIO + Docker Compose 7 服务 + git worktree 隔离 + 跨平台 + 四道门禁 |

---

## 3. 核心模块关系

### 3.1 两条主线在 execute 阶段交汇

```
变更托管主线（文档驱动）              Agent 编排主线（任务执行）
 brainstorm 想清楚                       建 mission
    ↓ 拆任务                              ↓ 派发
   plan                                   ↓
    ↓ ┌──────── execute 交汇 ─────────────┘
    ↓ ↓ 每个阶段派发 = 一次 agent run
   verify 验收                           daemon 执行 + 收敛
    ↓                                      ↓
   archive 归档 ←── 进度回灌对账 ────────┘
```

### 3.2 5 大业务域

1. **域 A · 项目空间与运行时**：workspace CRUD、成员管理、daemon 绑定/心跳/lease、spec 同步
2. **域 B · 变更托管与代码协作**：变更 CRUD/阶段流转/4 审核面板/审批归档/进度同步/worktree 租约
3. **域 C · Agent 编排与执行**：AgentRun 管理、Mission 三模式编排、对外 MCP(12 tool)、AgentProfile
4. **域 D · 凭证与密钥治理**：Git 身份凭证、LLM 供应商凭证、API Key（全部 xchacha20 加密）
5. **域 E · 治理与合规**：RBAC/审计/事故管理/发布管理/知识库

### 3.3 SillySpec 集成（变更托管核心）

SillySpec 是 SillySpec CLI 流程控制器，通过两条路径与平台集成：

**链路 A — REST 进度同步**（8 端点）：
- `POST /changes/{name}/progress` — 上行六表进度 JSON，base_ts 乐观锁冲突检测（409）
- `GET /changes` — 轻量 change 列表
- `GET /changes/{name}/progress` — 完整 JSON pull
- `POST /changes/{name}/documents` — 四件套文档同步
- `GET/POST /changes/{name}/approval` — 审批

**链路 B — MCP 派发**（12 tool）：
- `create_mission` — 建 mission（3模式：single/team/external）
- `dispatch_worker` — 派发 worker（支持 caller worktree 路径A）
- `get_worker_result` — 获取 worker 产出（artifacts）
- `converge_mission` — 收敛 mission
- `get_change_stage` / `advance_change_stage` — 变更阶段读写
- `submit_stage_review` / `run_verify_gate` — 阶段审查/验证

### 3.4 Agent 编排三模式

| 模式 | 描述 | 特点 |
|---|---|---|
| **single** | GLM CoordinatorPlanner 预拆 → 扁平 worker run | 适合简单任务 |
| **team** | 主 agent（真 agent）动态 dispatch worker | 主 agent 不写代码，只编排 |
| **external** | caller（SillySpec）自带调度，跳过 spawn | SillySpec 路径 A，worker 在 caller worktree 执行 |

---

## 4. 人员权限设计（RBAC）

### 4.1 权限模型

- **双轨授权**：`UserWorkspaceRole`（workspace 级）+ `UserRole`（平台级）
- **7 个 PermissionGroup**：PLATFORM / ADMIN / WORKSPACE / AGENT / CHANGE / AUDIT / PPM
- **隔离单元 = workspace**（不是 organization，organization 仅用于分组/筛选）

### 4.2 系统角色

| 角色 | 权限范围 | 来源 |
|---|---|---|
| `platform_admin` | 绑全权限，优先放行所有操作 | 手动设置 |
| `workspace_owner` | workspace 创建者自动获得 | 创建 workspace 时自动 |
| `developer` | workspace 级开发权限 | 成员管理分配 |
| `viewer` | workspace 级只读 | 成员管理分配 |
| `business_member` | 无自有 daemon，靠借用 | 成员管理分配 |

### 4.3 鉴权机制

- **双路径认证**：JWT（优先）→ API Key fallback
- **workspace 隔离**：`require_permission` 按 path `{workspace_id}` 校验
- **权限缓存**：Redis 缓存 + 熔断降级（Redis 挂了回查 DB）
- **平台 admin 短路**：`is_platform_admin` 优先放行

### 4.4 Daemon 绑定隔离

- **per-(workspace, user) 绑定**：每个成员在不同 workspace 各配自己的 daemon
- **借用机制**：业务人员可借用他人共享 daemon，cwd 用 sandbox marker 隔离
- **每次借用写审计行**：`daemon_borrow_audit` 表记录 borrower/lender/workspace/agent_run

---

## 5. 数据架构

### 5.1 存储体系

- **PostgreSQL 77 张表 / 11 个域**（SQLModel + asyncpg）
- **Redis**：权限缓存 + PPM data_scope + 发布订阅；AOF 持久化
- **MinIO**：对象存储（S3 兼容）
- **spec 文档资产树**：design.md / plan.md / tasks/task-NN.md / verify-result.md / module-impact.md

### 5.2 关键表域

| 域 | 代表表 | 说明 |
|---|---|---|
| 工作空间 | `workspaces` / `workspace_member_runtimes` | 核心隔离边界 |
| 身份授权 | `users` / `roles` / `user_workspace_roles` / `api_keys` | RBAC + 会话 |
| Agent 运行 | `agent_runs` / `agent_missions` / `agent_run_logs` / `agent_profiles` | 执行编排 |
| Daemon | `daemon_instances` / `daemon_task_leases` | 机器实体 + 任务队列 |
| 变更管理 | `changes` / `stages` / `steps` | SillySpec 进度 |
| 凭证治理 | `git_identities` / `llm_providers` | 加密存储 |

---

## 6. 设计思路总结

### 6.1 核心设计原则

1. **平台只编排不执行**：backend 和 agent 执行隔离 → 故障域分离 + agent 永远在用户自己机器上跑
2. **文档即数据，双源对账**：spec 文档（意图）↔ 代码（真相）经 platform_sync + module-impact 对账，不脱节
3. **workspace 是核心隔离单元**：多数业务表外键根，RBAC 在 workspace 维度判定
4. **凭证零信任**：xchacha20 加密入库，权限缓存带熔断降级，鉴权永不因缓存失败
5. **资产不被锁定**：标准技术栈（PG/Redis/MinIO/LiteLLM），代码在 git，daemon 在自己机器

### 6.2 三个杀手锏（vs 竞品）

| 维度 | 图驱动新平台 | SillyHub |
|---|---|---|
| 代码与架构图 | 图为主、代码是生成物 → 做着做着两张皮 | 文档 ↔ 代码经 platform_sync 对账 |
| 资产归属 | 实现落到它平台，寄生、续费绑架 | 标准技术栈 + 代码在自己仓库 |
| AI 在哪跑 | 它云端黑盒 | 平台只编排不执行，agent 在用户 daemon |

### 6.3 已知架构限制

1. **daemon `root_path` 未暴露**：MCP tools/list 不返 root_path，probe 越界校验生产不触发
2. **execute 启动期未预热 probe**：需 `SILLYHUB_PATH_A=1` 或先跑 dispatch probe
3. **端到端 smoke 未完成**：待 daemon + worker 环境就绪后补
4. **审计自动钩子休眠**：`register_audit_hooks` 未在 production 挂载，实际靠手工 AuditLog 插入

---

## 7. 风险与遗留问题

1. **端到端 smoke 缺失**：路径 A（SillySpec execute → create_mission(external) → dispatch_worker(worktree_path) → worker 写码 → 回收 review.json → apply）完整链路未在真实环境验证
2. **审计覆盖缺口**：登录成功/失败不入审计表；settings/PlatformSetting 变更无 AuditLog
3. **端到端冒烟测试缺失**：完整链路 smoke 未执行，待 daemon/worker 环境就绪
4. **approve/reject 行为差异**：业务审批和 CLI execute 审批两套实现并存，后端无审批策略恒返回 approved
