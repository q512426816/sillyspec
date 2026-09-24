---
author: qinyi
created_at: 2026-09-24 02:40:42
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-24-change-events-r11

## 背景

sillyspec CLI 侧 watcher/哨兵已向 `{platform.url}/api/changes/{name}/events` 推送旁路观测事件（POST JSON：kind/rule/severity/provisional:true/detail/ts 等，恒 provisional），但平台侧端点不存在——推送静默 404，观测信号断在平台门口。本件建消费端（后端收/取端点 + append-only 存储）与展示端（变更详情页「观测事件」折叠区）。生产端（sillyspec CLI watcher）不动。

现状锚点（棕地依据）：
- platform_sync 模块是 CLI→平台的上行通道族：`POST /changes/{name}/progress`、`POST /changes/-/spec-sync`、`POST /quicklog-entries` 等均落此（backend/app/modules/platform_sync/router.py:85 起，router 无前缀、backend/app/main.py:969 挂 prefix="/api"）。
- 写通道鉴权 `require_platform_sync_write`：仅 shpsync_ token 可写（JWT/shk_live_ 有效也 403）；读通道 `require_platform_sync`：shpsync_ 精确 workspace / JWT·shk_live_ CHANGE_READ 并集 + NULL 桶（backend/app/modules/platform_sync/auth.py:102-176）。
- 幂等 upsert 先例：QuicklogEntryORM 复合唯一约束（backend/app/modules/platform_sync/model.py:104-118）。
- 变更详情页（桌面）：frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx，卡片组件范式 frontend/src/components/changes/detail/change-sessions-card.tsx（react-query useQuery + 卡片布局）。

## 设计目标

1. watcher 推送有消费端：POST 落库 append-only，幂等（id 或 ts|rule 去重），单变更上限 5000 截最旧；
2. 面板有展示位：变更详情页「观测事件」折叠卡，增量拉取（since），warning 琥珀高亮 + 角标，provisional 徽标；
3. 红线：事件零业务消费——不触发任何流程状态变化/审批门控/execute·verify 判定。

## 非目标

- 不做 SSE/WebSocket（30s 轮询，D-006）
- 不做事件管理端（删除/确认/处置）与通知能力
- 不做移动端（src/app/m/）事件区
- 不改 sillyspec CLI watcher 生产端
- 不建事件→告警工单/事件关联分析等任何业务判定

## 拆分判断

单变更不做拆分：后端一表两端点 + 前端一卡一测试文件，改动面收敛在 platform_sync 模块与 changes 详情页两处，无跨模块取舍需要分件并行。

## 总体方案

**Wave A（后端）**：model.py 加 `PlatformChangeEventORM` → migration 建表 `platform_change_events` → schema.py 加 DTO（EventPushItem/EventPushRequest/EventPushOk/EventListItem/EventListResponse）→ service.py 加 `append_events`/`list_events` 两方法 → router.py 加 POST/GET 两端点 → conftest 建表 fixture 扩表清单 → pytest 五组。

**Wave B（前端）**：`pnpm gen:types` 再生成 api-types.ts（+ backend/openapi.json）→ 新建 lib/change-events.ts（fetch 封装）→ 新建 detail/change-events-card.tsx（折叠卡组件）→ page.tsx 挂卡 → 组件测试四组。

数据流：CLI watcher（shpsync_ Bearer）→ POST /api/changes/{name}/events → 拆列落库（dedup_key 幂等 + 截断）→ 面板（JWT via apiFetch）GET ?since= → 时间线渲染（severity=warning 琥珀高亮；provisional 徽标恒显）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | backend/app/modules/platform_sync/model.py | 追加 PlatformChangeEventORM（producer：CLI watcher；consumer：GET 端点/面板） |
| 新增 | NEW:backend/migrations/versions/20260924030000_add_platform_change_events.py | 建表迁移（down_revision 接当前单头） |
| 修改 | backend/app/modules/platform_sync/schema.py | 追加事件 push/list DTO |
| 修改 | backend/app/modules/platform_sync/service.py | 追加 append_events/list_events |
| 修改 | backend/app/modules/platform_sync/router.py | 追加 POST/GET /changes/{name}/events 两端点 |
| 修改 | backend/app/modules/platform_sync/tests/conftest.py | ensure_platform_sync_table 建表清单加新表 |
| 新增 | NEW:backend/app/modules/platform_sync/tests/test_change_events.py | pytest 五组：收/取/去重/鉴权/上限 |
| 修改 | backend/openapi.json | pnpm gen:types 顺带再生成（schema 变更同步） |
| 修改 | frontend/src/lib/api-types.ts | gen:types 生成 |
| 新增 | NEW:frontend/src/lib/change-events.ts | listChangeEvents(name, since?) fetch 封装 |
| 新增 | NEW:frontend/src/components/changes/detail/change-events-card.tsx | 观测事件折叠卡组件 |
| 修改 | frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx | 详情页挂卡（change.change_key 传入——ChangeRead 无 name 字段，事件端点 {name} 即 change_key 口径） |
| 新增 | NEW:frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx | 组件测试四组：渲染/高亮/空态/角标 |

## 接口定义

本变更接口面：2 端点

| METHOD | path | 鉴权 | 说明 |
|---|---|---|---|
| POST | /api/changes/{name}/events | shpsync_ 写通道（JWT/shk_live_ 403、无凭据 401） | 事件接收（幂等+上限截断，恒 200） |
| GET | /api/changes/{name}/events | 读 scope（shpsync_ token 绑定 workspace；JWT/shk_live_ CHANGE_READ 并集，scope 外空列表；无凭据 401） | 事件拉取（ts 正序 + since 增量） |

### POST /api/changes/{name}/events（写通道）
- 鉴权：`require_platform_sync_write`（仅 shpsync_；无凭据 401，JWT/shk_live_ 403）
- body：单事件对象或事件数组。事件字段（Pydantic `extra="allow"`，未知字段整包进 detail）：
  - `id: str|None`（可选，CLI 事件唯一标识）
  - `kind: str`（必填，≤64）
  - `rule: str|None`、`severity: str|None`（≤255/≤32）
  - `provisional: bool = True`
  - `detail: dict|None`（原文透传）
  - `ts: str`（必填，ISO 8601 UTC 原文，≤64，排序键）
- dedup_key = `id` 或（无 id 时）`f"{ts}|{rule}"`（rule None 用空串）
- 响应 200：`EventPushOk {change_name, accepted, deduplicated, truncated}`
- 上限：写后同 (workspace_id, change_name) 超 `MAX_EVENTS_PER_CHANGE=5000` → 同事务删最旧（子查询选 id 形态，双方言兼容），truncated 报告删除数

### GET /api/changes/{name}/events（读通道）
- 鉴权：`require_platform_sync`（scope：shpsync_ 精确 / JWT·shk_live_ 并集+NULL 桶，`_read_args` 翻译复用）
- query：`since: str|None`（ISO 8601；过滤 `ts > since` 严格字符串大于）
- 响应 200：`EventListResponse {items: EventListItem[], total}`；items 按 ts 正序；EventListItem = {id(行UUID), change_name, kind, rule, severity, provisional, detail, ts, created_at}

### 前端组件 ChangeEventsCard
- props：`{changeName: string}`
- useQuery：queryKey `["changeEvents", changeName]`，queryFn `listChangeEvents(changeName, lastTsRef.current)`，refetchInterval 30_000；数据在本组件内合并累积（items 全量替换 + since 增量由 lastTsRef 记游标——首拉无 since 全量，后续轮询带 since 追加，去重按行 id）
- 折叠：缺省收起；首拉数据含 warning → 默认展开（一次性，useRef 防 reopen 抢用户手动收起）；折叠头角标 = warning 计数
- 行渲染：时间(ts) / 类型(kind) / 规则(rule) / 详情(detail)；severity==='warning' 行琥珀高亮（bg-amber-50/dark:bg-amber-950 系 + border-amber）；provisional 徽标恒显，title 悬停「旁路观测信号，非流程真相」
- 空态：收起 + 「暂无观测事件」；查询错误静默降级为空态（观测旁路不弹错误打扰）

## 生命周期契约表

生命周期契约：无/N/A——本变更只接收与展示旁路观测数据，事件恒 provisional 只展示不消费（FR-07 红线），不触及任何流程状态机的迁移、认领或续约语义。

## 数据模型

新表 `platform_change_events`（append-only，无 UPDATE 路径；删除仅上限截断）：

| 列 | 类型 | 约束/说明 |
|---|---|---|
| id | UUID | PK，default uuid4 |
| workspace_id | UUID | FK workspaces(id) ON DELETE CASCADE，NOT NULL（shpsync_ 派生唯一来源） |
| change_name | varchar(255) | NOT NULL |
| dedup_key | varchar(255) | NOT NULL（id 或 ts\|rule） |
| kind | varchar(64) | NOT NULL |
| rule | varchar(255) | NULL |
| severity | varchar(32) | NULL |
| provisional | Boolean | NOT NULL，Python default True |
| detail | JSON | NULL（原文透传） |
| ts | varchar(64) | NOT NULL（ISO 原文，排序键） |
| created_at | timestamptz | server_default now()（服务端审计） |

- UniqueConstraint `(workspace_id, change_name, dedup_key)` name=`uq_platform_change_events_dedup`
- Index `(workspace_id, change_name, ts)` name=`ix_platform_change_events_ws_change_ts`
- 时间口径对齐 platform_change_progress.last_pushed_at 先例：ts 存 CLI ISO 8601 UTC 原文 String，字典序=时间序，免时区转换（backend/app/modules/platform_sync/model.py:96-99 注释口径）

## 兼容策略（brownfield 必填）

- 端点新建：未部署前 watcher 推 404（现状），部署后 200——生产端无需变更、无需发版协调（best-effort 通道，双向无耦合）
- 不改既有表与端点：platform_change_progress/quicklog/agent_logs 及其路由零触碰；conftest 建表清单是追加
- 迁移只 create_table，无数据回填（本项目未上线，CLAUDE.md 规则 11）
- 前端：新组件独立挂载，不改既有卡片的 props 与行为；api-types.ts 再生成只增不改（新路径新 schema）
- 回退：删除两端点注册 + 组件挂载即回退；表保留无害（无消费者）

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 同名 change 跨 workspace 在 JWT 读 scope 下聚合，面板看到他 workspace 同名事件 | P2 | 观测数据仅展示无业务消费（红线），聚合不产生错误行为；如需精确隔离，后续加 workspace query 参数（本件不做，见自审存疑①） |
| R-02 | CLI ts 非严格 UTC Z 格式时字典序失真，since 过滤漏/重 | P2 | ts 原文存储不转换（D-005 克制口径）；轮询侧按行 id 去重兜底，展示端轻微重复可接受 |
| R-03 | 并发推送同 dedup_key 撞唯一约束 → IntegrityError 500 | P1 | 撞约束按 SQLAlchemy IntegrityError 捕获转 deduplicated 计数（同事务内重试读一次确认），不 500 |
| R-04 | 5000 截断在高频推送下每次全删批次抖动 | P3 | 截断超阈值才触发（>5000 删到 5000），非每推必删；量级实际由 watcher 轮询周期天然限频 |
| R-05 | UI 原型分级核对：本件未附 prototype-*.html | P2 | 跳过原因：折叠卡为既有设计系统标准卡片形态（FRONTEND_PAGE_STYLE.md 语义阶 + 既有 detail 卡范式），无新视觉语言；琥珀告警色用 Tailwind 标准阶，不引入新 token |
| R-06 | gen:types 触发无关旧测试债暴露 | P3 | 按 CLAUDE.md 规则 21 惯例：无关旧债顺手补字段修好，不为躲报错改回手写 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01/02/04；总体方案 Wave A | 已确认 |
| D-002@v1 | FR-03；接口定义 dedup_key；数据模型唯一约束 | 已确认 |
| D-003@v1 | FR-05；接口定义上限段；风险 R-04 | 已确认 |
| D-004@v1 | FR-02/04；GET 鉴权段；风险 R-01 | 已确认 |
| D-005@v1 | FR-01/07；接口定义 body 字段；数据模型 | 已确认 |
| D-006@v1 | FR-06；前端组件 useQuery 段 | 已确认 |
| D-007@v1 | FR-06；前端组件折叠/高亮/角标段 | 已确认 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-007 全部落决策追踪）
- [x] 生命周期关键词豁免短语已紧邻「生命周期契约表」章节（「生命周期契约：无/N/A」）
- [x] UI 原型分级核对：跳过原因记入风险登记 R-05
- [x] 不确定的问题标注「⚠️ 自审存疑」：①R-01 的同名跨 workspace 聚合是否需要 workspace 精确隔离——本件按 D-004 接受聚合（观测无业务消费），若实测面板混淆再补 query 参数；②CLI 事件 body 是否恒带 id 未见生产端代码（不读 sillyspec 主仓），dedup_key 双轨设计对两种形态都设防

## Design Grill 补录（step 7 交叉审查发现并已修正）

- X-001（consistency）：文件变更清单原写「page.tsx 挂卡（change.name 传入）」——ChangeRead 实际字段为 `change_key`（backend/app/modules/change/schema.py:74），无 name 字段；已修正为 change_key 传入。事件端点路径参数 {name} 的语义即 change_key（与 platform_change_progress.change_name 同口径）。
- 其余交叉点核验见 review.json（tier 降级自审，宿主环境无 Agent tool）。
