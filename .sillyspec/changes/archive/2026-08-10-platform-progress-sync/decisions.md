---
author: qinyi
created_at: 2026-08-10T14:19:54+08:00
change: 2026-08-10-platform-progress-sync
---

# 决策台账（Decisions）

> 本次变更的实现/验收影响决策记录。长期术语在 archive/scan 时提升到 glossary.md。

## D-001@v1: 平台后端 = sillyhub
- type: architecture
- status: accepted
- source: 对话探索 step4（用户选方案 A 时明确）
- question: `sync.js` 连的平台 `{url}/api/changes/` 后端归属？
- answer: 后端就是 sillyhub；需改 sillyhub 仓库加 GET 端点 + 聚合存储 + base_ts 冲突检测 + progress JSON 落盘灾备。
- normalized_requirement: FR-01 / FR-09（sillyhub 后端提供聚合可见性 + GET 端点 + 冲突检测）
- impacts: 跨仓库改动；HTTP 契约（design §7）两边共享固化；sillyhub-mcp 任务派发层不碰（D-004 铁律无关）
- evidence: design §1/§6/§7；摸底 src/sync.js POST /api/changes/{name}/progress
- priority: P0

## D-002@v1: 同 change 冲突 = b 强制提示（禁止字段级 auto-merge）
- type: architecture
- status: accepted
- source: 对话探索 step3（用户明确选 b）
- question: 张三李四改同一 change 时合并策略？
- answer: change 级 last-write-wins + 冲突检测（base_ts/本地脏度）+ 强制提示决策（写 `.runtime/sync-conflict-<change>.json`，`platform resolve` 三选一），绝不字段级 auto-merge（状态机半坏风险）。
- normalized_requirement: FR-05（冲突 b 策略）；违反即拒收
- impacts: design §3 非目标、§7.5 冲突状态契约表；resolve 子命令必需
- evidence: design §7.5；记忆 sillyspec-state-split-platform-mode（状态分裂血泪）
- priority: P0

## D-003@v1: 一步到位交付（内部 wave1-3，不拆 change）
- type: boundary
- status: accepted
- source: 对话探索 step3（用户明确"一步到位"）
- question: 交付方式：最小 pull 闭环先行 vs 一步到位含多用户合并？
- answer: 一步到位，单 change 内部 plan 拆 wave1（地基）→wave2（下行）→wave3（冲突）。
- normalized_requirement: 单 change 交付；plan 阶段拆 wave，不拆独立 change
- impacts: design §4 拆分判断、§5 wave 划分
- evidence: design §4/§5
- priority: P1

## D-004@v1: user 身份 = local.yaml 加 user 字段
- type: architecture
- status: accepted
- source: Grill 内联（step3，无 P0 故内联）
- question: 多用户身份（区分张三/李四）来源？
- answer: `local.yaml` 的 `platform` 段加 `user:` 字段（与 url/token 同处，零新增配置体系）。
- normalized_requirement: FR-08（user 身份区分多用户）；push body 带 user 字段
- impacts: design §6 文件变更清单、§8 数据模型；sync.js POST body 外层加 user
- evidence: design §6 字段数据流（user producer→consumer）
- priority: P1

## D-005@v1: import 粒度 = 整个 change 全量覆盖（仅无冲突时）
- type: architecture
- status: superseded（由 D-005@v2 取代，B1/B2 修正）
- source: Grill 内联（step3）
- question: `ProgressManager.import()` 覆盖粒度？
- answer: 整个 change 全量覆盖该 change 的 stages/steps/changes 行；只在无冲突时执行（与 b 策略 D-002 绑定）；事务原子 + import 前 .bak snapshot。
- normalized_requirement: FR-07（import 原子 + .bak 回退）
- impacts: design §7 import 签名、§7.5 状态契约
- evidence: design §7；db.js _openWithFallback .bak 机制复用
- priority: P1

## D-005@v2: import 粒度 + serializeForSync 专用序列化 + changes 排除 isolation
- type: architecture
- status: accepted
- supersedes: D-005@v1
- source: design-grill（B1/B2 修正，review brainstorm-review-2026-08-10-142313）
- question: D-005@v1 称 import 是 read() 逆运算、全量覆盖 changes——但 read() 非六表序列化（漏 approvals、changes 只投影 5 列），且全量覆盖会回滚 isolation_* 本地隔离状态。
- answer: 新增 `serializeForSync()` 做真正六表完整序列化，import 是其逆运算；import 覆盖 changes 行时用 UPDATE 选择投影列（current_stage/status/last_active/last_synced_platform_ts），保留 isolation_*/platform_*/created_at（本地状态不被平台覆盖）。
- normalized_requirement: FR-07（import 原子 + .bak 回退）+ B1/B2 修正
- impacts: design §7 import/serializeForSync 签名、§8 投影契约、§6 文件清单；Wave1 前置 serializeForSync
- evidence: design §7/§8 B1/B2 修正；progress.js:240-365 read() 聚合视图（非六表序列化）
- priority: P0

## D-006@v1: pull 范围 = 两级（轻量列表 + 按需单 change）
- type: architecture
- status: accepted
- source: Grill 内联（step3，性能维度）
- question: pull 全量 vs 增量？
- answer: 两级——先 `GET /api/changes` 轻量列表（name/stage/last_pushed_at/pusher，几 KB），CLI 比对本地决定哪些 change 需更新，再 `GET /api/changes/{name}/progress` 按需拉完整 JSON。
- normalized_requirement: FR-03（两级 pull 控性能）
- impacts: design §7 SyncManager.pullList/pull、§7 HTTP 契约
- evidence: design §7
- priority: P1

## D-007@v1: 死字段复用 = platform_last_sync 改语义
- type: compatibility
- status: accepted
- source: Grill 内联（step3）
- question: 现有 `changes.platform_last_sync`（只写不读死字段）如何处理？
- answer: 复用，改语义为"上次同步完成时刻"（本地时钟）；旧值（_updatePlatformLastSync 写的本地时间戳）落在新语义内，向后兼容；新 base_ts 用新列 `last_synced_platform_ts`（存平台 last_pushed_at，语义不同）。
- normalized_requirement: FR-02；platform_last_sync 语义变更对在途数据兼容
- impacts: design §8 数据模型、§9 兼容策略；R-05 风险
- evidence: design §8/§9；摸底 change-registry.js:92 _updatePlatformLastSync 只写不读
- priority: P2

## D-008@v1: 冲突本地脏度 = 新增 last_local_modified_ts
- type: architecture
- status: accepted
- source: Grill 内联（step3）
- question: pull 时如何检测"本地有未同步的新推进"？
- answer: 新增列 `last_local_modified_ts`，`_write` 末尾更新；pull 时比对 `last_local_modified_ts > last_synced_platform_ts` 且平台 `last_pushed_at` 更新 → 判冲突。
- normalized_requirement: FR-05（冲突双向检测：push 平台侧 base_ts + pull 本地侧脏度）
- impacts: design §8 数据模型、§7.5 pull 检测冲突事件
- evidence: design §8/§7.5
- priority: P1

## D-009@v1: triggerPull 时机 = run 启动 + approve/archive 前，不每步
- type: boundary
- status: accepted
- source: Grill 内联（step3，时机维度）
- question: 自动 pull 时机？
- answer: CLI 启动（`run`/`--done`）拉一次 + 关键决策点（`approve`/`archive` 前）拉一次 + 手动 `platform pull`；**不在每步 pull**（避开 step 高频写入 + 控平台压力）。
- normalized_requirement: FR-04（pull 时机）；与现有 triggerSync（stage 边界 + step debounce）对称
- impacts: design §6 文件变更清单（run/shared.js triggerPull）、§9 兼容
- evidence: design §6；现有 run/shared.js:330 triggerSync 8s 熔断复用
- priority: P1

## D-010@v1: resolve --abort = 放弃本次同步保持现状
- type: boundary
- status: accepted
- source: Grill 内联（step3）
- question: `platform resolve --abort` 的语义？
- answer: 放弃本次同步操作，保持现状——清冲突文件、本地 DB 不变、base_ts 不更新，下次再试。区别于 `--keep-local`（base_ts 设为平台当前 last_pushed_at，保留本地，gap9 修正）和 `--take-platform`（import 平台覆盖本地）。
- normalized_requirement: FR-05（resolve 三选一语义明确）
- impacts: design §7.5 resolve --abort 事件
- evidence: design §7.5
- priority: P2

## D-011@v1: import snapshot 用独立 .bak 路径（不抢 _openWithFallback）
- type: architecture
- status: accepted
- source: design-grill（gap5 修正）
- question: import 前 .bak snapshot 与 _openWithFallback 的 `${dbPath}.bak` 冲突？
- answer: import 用独立路径 `.runtime/sillyspec.db.pre-import-<ts>.bak`，不抢 db.js:97-145 _openWithFallback 的主 .bak（后者用于库损坏回退，语义不同）。
- normalized_requirement: FR-07；.bak 不冲突
- impacts: design §7 import 签名、R-08
- evidence: design §7/§10 R-08；db.js _openWithFallback .bak 机制
- priority: P1

## D-012@v1: schema bump 连带 db.js + shared.js + progress.js 三处
- type: compatibility
- status: accepted
- source: design-grill（gap6 修正）
- question: DB_SCHEMA_VERSION 3→4 只改 db.js 够吗？
- answer: 不够。连带三处：`src/db.js:10 DB_SCHEMA_VERSION` + `src/db.js:205 project.schema_version DEFAULT 3` + `src/progress/shared.js:30 CURRENT_VERSION` + `src/progress.js:350 _version 硬编码`，全改才一致。
- normalized_requirement: schema bump 一致性
- impacts: design §8、R-06
- evidence: design §8；db.js:10/205 + shared.js:30 + progress.js:350
- priority: P1

## D-013@v1: last_local_modified_ts 全写入路径触发（不止 _write）
- type: architecture
- status: accepted
- source: design-grill（gap7 修正）
- question: last_local_modified_ts 只在 _write 末尾更新够吗？
- answer: 不够。所有写入路径都要更新：_write / initChange / registerChange / updateChangeIsolation / _updateApprovalStatus 等，否则脏度漏判（pull 误以为本地干净）。**例外：`import()` 不更新 now()，而是重置 `last_local_modified_ts = last_synced_platform_ts`（=平台 pushed_at），表示本地=平台干净**（否则 import 后 now()>base_ts 下次 pull 误判冲突，Design Grill 复审 P1）。
- normalized_requirement: FR-05 冲突检测准确性
- impacts: design §6 文件清单、§8 数据模型
- evidence: design §6/§8；progress.js 各写入方法
- priority: P1

## D-014@v1: scope = SillySpec 先行，sillyhub 后端拆独立 change
- type: boundary
- status: accepted
- source: 对话（B3 用户决策，brainstorm step7 grill，AskUserQuestion 选"不阻塞"）
- question: 本变更 archive 是否阻塞于 sillyhub 后端协同发布？
- answer: 不阻塞。本 change 纯 SillySpec 侧（serializeForSync/import/pull/resolve/schema 加列/triggerPull/user 字段），sillyhub 后端改动（GET 端点+聚合+base_ts 冲突检测+POST body 兼容+落盘灾备）拆独立 change 另排期。sillyhub 未就绪时 pull/push Best Effort 降级（warn，本地继续不阻断）。
- normalized_requirement: 本 change scope 限定 SillySpec 仓库；verify 边界不含 sillyhub 联调
- impacts: design §4 拆分判断、§6 文件清单（sillyhub 标独立 change）、R-01/R-09 降 P1
- evidence: design §4/§6；B3 AskUserQuestion 用户选"不阻塞，SillySpec 先行"
- priority: P0

## D-015@v1: POST 元字段走 HTTP header（body 保持裸，零回归）
- type: architecture
- status: accepted
- source: design-grill（R-09 回归风险修正）
- question: POST body 包裹 `{user,base_ts,pushed_at,progress}` 是破坏性 API，sillyhub 未升级时现有 push 失效（R-09 回归）？
- answer: 元字段 user/base_ts/pushed_at 走 HTTP header（`X-SillySpec-User`/`X-SillySpec-Base-Ts`/`X-SillySpec-Pushed-At`），body 保持裸 serializeForSync() JSON 不变。sillyhub 老版继续工作（忽略 header），新版读 header 启用冲突检测——零回归。
- normalized_requirement: POST body 向后兼容；元字段走 header
- impacts: design §5 核心思想、§6 字段流、§7 HTTP 契约、§8 投影契约、R-09；sync.js POST 加 header 不改 body
- evidence: design §7 HTTP 契约；R-09
- priority: P1
