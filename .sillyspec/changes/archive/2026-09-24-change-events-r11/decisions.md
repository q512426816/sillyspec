---
author: qinyi
created_at: 2026-09-23 18:39:33
generated_by: sillyspec-fourpiece-init
change: 2026-09-24-change-events-r11
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001 端点落位 platform_sync 模块，鉴权复用 shpsync_ 写通道 @v1

- **背景**：CLI watcher/哨兵向 `{platform.url}/api/changes/{name}/events` 推事件，平台侧端点缺失（静默 404）。需要决定新端点放哪个模块、用哪套鉴权。
- **候选**：
  - A. 落 `app/modules/platform_sync/`（与 progress/documents/approval/quicklog-entries 同族——同为 CLI→平台上行通道，路径同 `/changes/{name}/...` 命名空间，鉴权同 shpsync_ token 族）；
  - B. 新建 `app/modules/change_events/` 独立模块；
  - C. 落 change 模块（业务变更域）。
- **决定**：A。
- **理由**：任务书明示「鉴权用既有平台 token 体系，与 spec-sync 推送同款」；spec-sync 推送（`POST /changes/-/spec-sync`）就在 platform_sync 且走 `require_platform_sync_write`（仅 shpsync_，evidence: backend/app/modules/platform_sync/auth.py:166-176）。事件推送是纯上行旁路观测数据（provisional 恒真、零业务判定红线），与 change 模块的状态机/审批语义无关，放 change 模块会把旁路数据和流程真相搅在一起（违背红线精神）。独立模块则要复制鉴权依赖与 conftest 基座，多一套四文件无收益。
- **影响**：router.py 追加两端点；model.py 追加一表；schema.py 追加 DTO；service.py 追加两方法。
- **evidence**：backend/app/modules/platform_sync/router.py:85（router 无前缀、main 挂 /api）；backend/app/modules/platform_sync/auth.py:102-150（三路径分流）。

## D-002 幂等去重键：dedup_key 列 + (workspace_id, change_name, dedup_key) 唯一约束 @v1

- **背景**：任务书「幂等（事件 id 或 ts+rule 去重键可选）」——CLI 重试/重跑会重推同一事件，需要去重。
- **候选**：
  - A. 事件带 `id` 时以 id 为键，缺 id 回落 `ts|rule`（kind 不进键——同刻同规则同变更视为同一观测脉冲）合成 `dedup_key` 列，建复合唯一约束，冲突即跳过（计数 deduplicated）；
  - B. 不去重，前端按 ts 折叠；
  - C. 仅按 id 去重（无 id 事件不去重）。
- **决定**：A。
- **理由**：watcher 每次产物签名轮询都可能重推；无 id 事件若不去重，轮询放大下重复行快速吃掉 5000 上限。B 把去重职责推给展示端，违背「存储层最简、零业务判定」的分寸（展示端不该猜哪两条是同一条）。C 对「id 可选」的输入形态不设防。冲突跳过（不是覆盖）：append-only 语义下同键二推内容应相同，覆盖无意义且要先读后写。
- **影响**：表加 `dedup_key varchar(255) NOT NULL`；POST 响应带 `accepted/deduplicated/truncated` 计数。
- **evidence**：backend/app/modules/platform_sync/model.py:104-118（QuicklogEntryORM 复合唯一约束幂等 upsert 先例）。

## D-003 上限保护：截断最旧保最新 5000（不拒绝） @v1

- **背景**：任务书「上限保护（单变更 >5000 截断最旧或拒绝）」二选一。
- **候选**：
  - A. 截断最旧：写入后按 (workspace_id, change_name) 数行，超 5000 删最旧；
  - B. 拒绝：超限后 POST 返回 4xx。
- **决定**：A。
- **理由**：拒绝会让 CLI 侧 watcher 持续收到失败（虽然 best-effort 推送不阻断，但持续 4xx 是噪音且丢新事件——观测通道的价值恰恰在最新事件）。截最旧保最新符合「观测事件时效性 > 完整性」的旁路定位；5000 上限按任务书给定。删除在同事务内完成。
- **影响**：service 写路径多一步 `DELETE ... ORDER BY ts ASC LIMIT n-5000`（方言差异：SQLite 不支持 DELETE+ORDER BY+LIMIT，改子查询先选 id 再按 id 删，跨 SQLite 测试库/PostgreSQL 生产双兼容）。
- **evidence**：知识库 patterns.md「Monorepo 三服务架构」（测试 SQLite/生产 PostgreSQL 双方言兼容惯例）。

## D-004 GET 读鉴权走 require_platform_sync 读 scope（面板 JWT 可读） @v1

- **背景**：任务书指定 `GET /api/changes/{name}/events?since=<iso>` 供面板拉取。写通道是 shpsync_，读方是谁？
- **候选**：
  - A. 读用 `require_platform_sync`（shpsync_ token 精确 workspace / JWT·shk_live_ CHANGE_READ 并集 + NULL 桶）——与 `GET /changes/{name}/progress` 完全同款；
  - B. 新建 workspace 路径 RBAC 端点 `/api/workspaces/{ws}/changes/{cid}/events`。
- **决定**：A。
- **理由**：任务书路径已指定 `/api/changes/{name}/events`（无 workspace 段）；progress 读端点先例证明浏览器 JWT 走该形态可用（apiFetch 带 Bearer JWT，Next rewrite /api/* 透传后端）。变更名全局可能重名（跨 workspace），读 scope 并集下同名聚合可接受——观测事件仅展示、无业务消费，重名聚合不产生错误行为；前端从变更详情页进入时传 workspace 无必要（端点按 scope 过滤已足够安全）。
- **影响**：前端调用形态 `apiFetch(/api/changes/${name}/events?since=...)`；api-types.ts 经 gen:types 更新。
- **evidence**：backend/app/modules/platform_sync/router.py:321-339（GET progress 读鉴权先例）；frontend/src/lib/api.ts:25-31（浏览器相对路径经 Next rewrite）。

## D-005 事件 payload 原文透传 detail 列，结构字段单列存储 @v1

- **背景**：CLI 推送 JSON：kind/rule/severity/provisional:true/detail/ts「等」——字段集合可能演进。存储形态？
- **候选**：
  - A. 任务书最简 schema 单列化（change_name/kind/rule/severity/provisional/detail/ts）+ `detail` 存 JSON 原文透传其余字段；
  - B. 整 payload 单 JSON 列（像 quicklog 的 payload 列）；
  - C. 全字段单列 + 未知字段丢弃。
- **决定**：A（detail 为 JSON 列，CLI 的 detail 字段及其它未列举字段原样进该列）。
- **理由**：面板要按 kind/severity/ts 过滤与排序，这几个键必须可索引可查询（B 要 JSON 路径查询，SQLite/PG 双方言 JSON 函数分叉）；C 丢数据违背观测通道「只记录不判定」的克制口径——CLI schema 演进的新字段在 detail 里天然保留（extra=ignore 的反面：我们收进来放 detail，不 422 不丢）。Pydantic 入口 schema 对已知五字段 + id 校验，`model_config = {"extra": "allow"}` 收其余进 detail。
- **影响**：入口 DTO 用 RootModel/普通 model + extra allow；service 层拆列。
- **evidence**：backend/app/modules/platform_sync/model.py:107-160（单列 + payload JSON 混合先例 platform_change_progress）。

## D-006 前端折叠区 + 30s 轮询（SSE 不做） @v1

- **背景**：任务书「打开 GET 一次 + 30s 轮询（SSE 可选）」。
- **决定**：轮询；SSE 不做。
- **理由**：观测事件是低频旁路信号（watcher 产物签名轮询周期秒级~分钟级），30s 轮询足够；SSE 要后端常连接 + 前端 fetch-sse 生命周期管理（折叠区收起时挂连接的浪费、断线重连），复杂度对收益不成比例。任务书已标可选。增量参数 since=最后一条 ts（ISO 字符串字典序比较，服务端 ts > since 严格大于）。
- **影响**：组件内 react-query refetchInterval 30s；since 增量由组件自持最后 ts。
- **evidence**：frontend/src/components/changes/detail/change-sessions-card.tsx:66-70（react-query useQuery 拉取先例）；frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx:65-73（refetchInterval 先例）。

## D-007 面板缺省收起、有 warning 默认展开 + 角标；provisional 徽标恒显 @v1

- **背景**：任务书「缺省收起，有 warning 默认展开+角标」「provisional 徽标（悬停『旁路观测信号，非流程真相』）」。
- **决定**：照做：折叠状态初始值 = 事件列表中存在 severity === 'warning'（首拉数据到达时判定）；角标显示 warning 条数；provisional 徽标恒显（CLI 恒推 provisional:true，按行内字段渲染，不假设恒真）。
- **理由**：severity 是展示分类不是业务判定（不触发任何流程动作，仅样式），不违红线。首拉未到时收起（保守），数据到达后若有 warning 翻开——用 useEffect 对首次数据到达做一次性展开。
- **影响**：组件本地 state（useState/useRef 防重复展开）；测试四组：渲染/高亮/空态/角标。
- **evidence**：任务书前端规格 1-2。
