---
author: qinyi
created_at: 2026-09-23 18:39:33
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI watcher/哨兵（生产端） | sillyspec CLI 侧旁路观测进程，持 shpsync_ token 向平台推送 provisional 事件 |
| 平台用户（消费端·人） | 浏览器登录（JWT），在变更详情页查看观测事件 |
| 后端消费端点 | 本件新建的 POST/GET `/api/changes/{name}/events` |

## 功能需求

### FR-01: 事件接收（POST）
Given 持有效 shpsync_ token 的调用方
When POST `/api/changes/{name}/events`，body 为单事件 JSON 对象（kind/rule/severity/provisional/detail/ts，可选 id）或事件数组
Then 全部落库（append-only），响应 200 `{accepted, deduplicated, truncated, change_name}`；workspace 归属由 token 派生，不从 body 取

### FR-02: 事件拉取（GET）
Given 持任一有效凭据（shpsync_ / JWT / shk_live_ 读 scope）的调用方
When GET `/api/changes/{name}/events`（可带 `since=<iso>`）
Then 返回 scope 内该变更的事件列表，`ts` 正序；带 since 时仅返回 `ts > since`（字符串严格大于）的增量；响应含 `items` 与 `total`

### FR-03: 幂等去重
Given 同一（workspace, change_name）下已存在事件 E
When 再次推送与 E 同 `id`（或无 id 但同 `ts|rule`）的事件
Then 不产生新行，响应计数 `deduplicated` +1，`accepted` 不增

### FR-04: 鉴权矩阵
Given 四类调用形态
When 打 POST/GET 端点
Then 无凭据 401；shk_live_/JWT 打 POST 403（写通道仅 shpsync_）；shpsync_ 打 POST 200；GET 三形态凭据均可（scope 过滤：shpsync_ 精确 workspace，JWT/shk_live_ CHANGE_READ 并集 + NULL 桶）

### FR-05: 上限保护
Given 单变更事件数已达 5000
When 再推新事件
Then 同事务截断最旧，表内恒保最新 5000 条以内，响应 `truncated` 报告删除数；推送方无感（恒 200）

### FR-06: 面板观测事件折叠区
Given 变更详情页已打开
When 事件接口可达
Then 「观测事件」折叠卡渲染：首拉一次 GET；30s 轮询增量（since=最后一条 ts）；缺省收起，存在 severity=warning 的事件时默认展开且折叠头显示 warning 计数角标；时间线行含 时间/类型/规则/详情，warning 行琥珀高亮；每行 provisional 徽标，悬停提示「旁路观测信号，非流程真相」；无事件时空态文案

### FR-07: provisional 红线（存储与展示零业务判定）
Given 任一事件
When 其落库与展示
Then provisional 字段仅原样存储与展示，任何代码路径不得依据事件触发流程状态变化、审批门控或 execute/verify 判定

## 非功能需求
- 兼容性：跨 SQLite（测试）/ PostgreSQL（生产）双方言（DELETE 截断用子查询选 id 形态）；跨 Windows/Linux/macOS（路径无关，纯 HTTP+SQL）
- 性能：GET 按索引 (workspace_id, change_name, ts) 命中；30s 轮询单请求轻负载
- 观测克制：事件通道 best-effort，写入失败不影响 CLI 侧任何流程（平台侧不回推、不重试）
- 类型同步：后端 schema 变更后必须 `pnpm gen:types` 再生成并提交 api-types.ts + backend/openapi.json

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001 | FR-01/02/04 | 端点落位 platform_sync，shpsync_ 写通道 |
| D-002 | FR-03 | dedup_key 复合唯一约束 |
| D-003 | FR-05 | 截最旧保最新 5000 |
| D-004 | FR-02/04 | GET 读 scope（面板 JWT 可读） |
| D-005 | FR-01/07 | 结构字段单列 + detail JSON 原文透传 |
| D-006 | FR-06 | 30s 轮询不做 SSE |
| D-007 | FR-06 | 折叠/展开/角标/高亮交互细则 |
