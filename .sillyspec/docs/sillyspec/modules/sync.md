---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# sync
> 最后更新：2026-09-08
> 最近变更：sillyhub-not-ready-noise（平台未就绪期连接类失败跨进程噪音闸：sync-noise.js marker 窗口 + spec-sync follower 集合去重）
> 模块路径：src/sync.js、src/spec-sync.js、src/sync-noise.js

## 职责
SillyHub 平台同步模块，负责与远程 SillyHub 服务建立连接、同步变更进度和文档、管理审批流程。

`src/spec-sync.js`（2026-08-17 spec-file-incremental-sync 起）：CLI 直跑场景的 spec 文件树增量同步——以服务器清单为锚 walk/hash/diff 后只推送变化文件（add/update/delete/rename），复用 daemon 排除口径（local.yaml 不上传、worktrees 剪枝）。并行会话 fail-closed 护栏（2026-08-28 ql-20260828-003）：`computeSpecOps` changes/ 整删守卫（本地树非空但 changes/ 全空而服务器有 → 跳过防误删）+ `filterStaleUpdates` 旧副本回推守卫（.runtime/spec-sync-last-success.json 时间锚——本地自上次同步未改动而服务器已前进的 update 拦下，重存后重推为强制出口）。

## 当前设计
`SyncManager` 是独立于 `ProgressManager` 的同步管理类，由 `run.js` 和 `index.js` 调用。设计遵循 "Best Effort" 原则：所有网络失败仅 `console.warn`，不抛错、不阻塞主流程。

配置来源为 `.sillyspec/local.yaml` 中的 `platform` 段（url + token）。**读取侧**（`_getPlatform`/`status`）用简易 `parseSimpleYaml`（只处理扁平结构，不依赖第三方 YAML 库）；**写入侧**（`connect`/`disconnect`）改文本级定向替换（`readLocalYamlRaw` + `findTopLevelSectionRange` + `replaceTopLevelSection`），原文件注释/空行/其他段/数组/深嵌套/CRLF 字节级保留——旧 `writeLocalYaml` 扁平全量覆写经 parse 往返丢注释+丢非扁平结构，已废弃删除。HTTP 请求使用 Node.js 原生 `fetch`（需要 Node 22+），统一设置 10 秒超时。

对外同时暴露 `SyncManager` 类（面向程序化调用）和一组顶层 `async function`（面向 CLI `sync` 子命令）。顶层函数通过 `syncModule(args, cwd)` 进行子命令分发（connect / disconnect / sync / docs / approval / status）。

## 对外接口（表格）
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `SyncManager` | 同步管理类，封装所有平台交互 | `constructor(cwd)` |
| `SyncManager.testConnection(url)` | 测试远程连接（静态方法） | `url: string` |
| `SyncManager.connect(url, token)` | 保存平台 + mcp 配置到 local.yaml（同源假设，mcp 段已存在则保留） | `url, token` |
| `SyncManager.disconnect()` | 三清断开（D-C@v2）：local.yaml platform 段 + 恢复指针 + 平台接管声明（后两者 best-effort unlink，不存在不算错） | — |
| `SyncManager.sync(changeName)` | 同步单个变更的进度到平台 | `changeName: string` |
| `SyncManager.syncDocuments(changeName)` | 同步四件套文档（proposal/design/requirements/tasks）到平台 | `changeName: string` |
| `SyncManager.checkApproval(changeName)` | 查询平台审批状态 | `changeName: string` |
| `SyncManager.status()` | 返回本地平台连接状态 | — |
| `SyncManager.pullList()` | 两级 pull 第一级：GET /api/changes 轻量列表（name/stage/last_pushed_at/pusher） | — |
| `SyncManager.pull(changeName, opts)` | 两级 pull 第二级：GET /api/changes/{name}/progress 完整 JSON + 本地脏度冲突检测 + 无冲突 import；`opts.force` 跳冲突检测（resolve --take-platform 用） | `changeName, {force?}` |
| `SyncManager.resolve(changeName, mode)` | 冲突解决三选一：keep-local（推进 base_ts 不 import）/ take-platform（import 覆盖）/ abort（不变）；必清冲突文件 | `changeName, 'keep-local'\|'take-platform'\|'abort'` |
| `SyncManager.collectStatus()` | 扩展 status：连接信息 + 落后标记（pullList 比对 last_synced_platform_ts）+ 未决冲突列表（扫描 sync-conflict-*.json，损坏容错） | — |
| `SyncManager.listConflictFiles()` | 扫描 .runtime/sync-conflict-*.json 列未决冲突 | — |
| `SyncManager._writeConflictFile/readConflictFile/clearConflictFile(changeName)` | 冲突文件 helper（pull/push 命中写、resolve 清） | `changeName` |
| `connect(url, token, cwd)` | 顶层便捷函数 | `url, token, cwd` |
| `disconnect(cwd)` | 顶层便捷函数 | `cwd` |
| `sync(changeName, cwd)` | 顶层便捷函数 | `changeName, cwd` |
| `syncDocuments(changeName, cwd)` | 顶层便捷函数 | `changeName, cwd` |
| `checkApproval(changeName, cwd)` | 顶层便捷函数 | `changeName, cwd` |
| `approve(changeName, cwd)` | 顶层便捷函数 | `changeName, cwd` |
| `reject(changeName, reason, cwd)` | 顶层便捷函数 | `changeName, reason, cwd` |
| `status(cwd)` | 顶层便捷函数 | `cwd` |
| `pull(changeName, opts, cwd)` | 顶层便捷函数（platform pull 子命令用） | `changeName, opts, cwd` |
| `pullList(cwd)` | 顶层便捷函数（轻量列表） | `cwd` |
| `resolve(changeName, mode, cwd)` | 顶层便捷函数（platform resolve 子命令用） | `changeName, mode, cwd` |
| `collectStatus(cwd)` | 顶层便捷函数（platform status 扩展用） | `cwd` |
| `listConflictFiles(cwd)` | 顶层便捷函数（platform resolve 参数解析/报错兜底用，只读列 .runtime 未决冲突） | `cwd` |
| `syncModule(args, cwd)` | CLI 入口：解析 args 并分发子命令 | `args: string[], cwd` |

## 关键数据流
1. **连接流程**：`connect(url, token)` -> `fetchJson(/api/health)` 验证 -> 文本级定向写入 `.sillyspec/local.yaml` 的 `platform` 段（`replaceTopLevelSection` 原位替换，保留注释/其他段/数组/深嵌套）+ `mcp` 段（不存在时追加同源 url/token；文本级 `findTopLevelSectionRange('mcp')` 守卫保留用户已手填 mcp 段不覆盖，R-09。不同源时 agent 手填 mcp 段或设 env）
2. **进度同步**：`sync(changeName)` -> 读取 `sillyspec.db`（动态 import `ProgressManager`） -> `POST /api/changes/{name}/progress`
3. **文档同步**：`syncDocuments(changeName)` -> 读取 `.sillyspec/changes/{name}/` 下四件套文档 -> `POST /api/changes/{name}/documents`
4. **审批查询**：`checkApproval(changeName)` -> `GET /api/changes/{name}/approval` -> 若已批准则更新本地 progress。返回 `{status, reason?}`，status 分层：`approved`/`rejected`（平台真实 verdict，透传）/`pending`（审批中 OR 未连接平台/未指定 changeName 的合法本地降级，静默）/`unknown`（已连接平台但请求失败 404/断网/超时，command.js 单独 warn 明确「审批状态未知按本地模式放行」，非审批中——2026-08-12 拆出，治请求失败误报 pending）
5. **CLI 分发**：`syncModule(args, cwd)` 解析 `args[0]` 子命令名，调用对应 `SyncManager` 方法
6. **下行 pull**（2026-08-10-platform-progress-sync）：`pull(name)` → GET /api/changes/{name}/progress → 本地脏度比对（last_local_modified_ts > last_synced_platform_ts AND 平台 last_pushed_at > last_synced → 冲突）→ 无冲突 `pm.import` 重建 DB 行；`pullList()` 先拉轻量列表控制 pull 性能
7. **双向冲突持久化**：push 409（base_ts 过期）或 pull 脏度命中 → `_writeConflictFile` 写 `.runtime/sync-conflict-<change>.json`（含 base_ts/local_modified_ts/platform_last_pushed_at/platform_progress，禁止字段级 auto-merge）→ `resolve` 三选一后 `clearConflictFile`
7b. **change_deleted 409 预期回执分流**（2026-09-10 驾驭小结第四批③，「提示语义滞后一个动作」）：409 code=change_deleted 且本地 DB status=archived/deleted（CLI unregisterChange 链已注销——本次上行本就是 CLI 主动发的墓碑）→ ℹ️「本地注销已由 CLI 完成，属预期回执，无需动作」；仅本地仍 active（他端删除场景）才 ⚠️ 排查口吻。两分支返回值同为 platformDeleted，不落冲突文件。
8. **POST 元字段走 header**（D-015）：sync() 的 user/base_ts/pushed_at 走 X-SillySpec-* header，body 保持裸 progress JSON（sillyhub 老版忽略 header 零回归）；`fetchJsonWithStatus` 识别 409 读回 platform_progress

## 设计决策（表格）
| 决策 | 原因 | 替代方案 |
|------|------|----------|
| Best Effort 网络容错 | 同步是辅助功能，不应阻塞主流程 | 严格错误传播，失败即中断 |
| 内置简易 YAML 读写（读）+ 文本级定向替换（写） | 读取只需扁平结构避免 yaml 依赖；写入要保留注释/其他段/数组/深嵌套必须文本级操作（parse 往返丢注释） | 使用 js-yaml / yaml 库 |
| 动态 import ProgressManager | 避免循环依赖（progress.js 可能依赖 sync.js） | 静态 import |
| 原生 fetch（Node 22+） | 零外部依赖 | axios / node-fetch |
| 10 秒请求超时 | 平衡响应速度与用户体验 | 更长超时 / 无超时 |

## 依赖关系
- 内部依赖：`progress.js`（动态 import，读取数据库进度）
- 外部依赖：`fs`（`existsSync`, `mkdirSync`, `readFileSync`, `readdirSync`, `writeFileSync`, `unlinkSync`）、`path`（`join`）、Node.js 原生 `fetch`

## 注意事项
- `SyncManager` 的所有方法均为 `async`，调用方需要 `await`
- 网络请求统一 10 秒超时，超时后 `console.warn` 并返回空结果，不抛异常
- `local.yaml` 中 platform 配置包含明文 token，需注意 `.gitignore` 排除
- `syncDocuments` 要求变更目录下存在四件套文件（proposal.md、design.md、requirements.md、tasks.md），缺失的文件会跳过并记录错误
- `syncModule` 是 CLI 入口，遇到未知子命令会 `process.exit(1)`
- **连接类失败噪音闸**（src/sync-noise.js，2026-09-08 用户反馈③）：平台未就绪（404/5xx/断网/超时）期间每条 CLI 命令的自动同步都会撞同一批失败——fetchJson/fetchJsonWithStatus/spec-sync 的连接类失败 warn 经 `syncConnectionWarn` 走跨进程 marker 窗口（.runtime/sync-noise-mute.json，10min）：首报命令完整展示本轮所有失败行，后续进程窗口内静默（SILLYSPEC_DEBUG_SYNC=1 全可见），任意成功清闸并打一行恢复提示。409/其余 4xx 业务态不走闸（每轮该看见）；connect 的 health ping 与手动 `platform pull`（noMute / 非 autoPull）恒可见。`SyncManager` 构造器经 `bindSyncNoiseFromCwd` 零副作用绑定 marker 目录（只读指针 JSON，不触发 resolvePlatformSpecDir 的指针守卫 warn——doctor 两路字节一致契约）。
- **spec-sync follower 集合去重**（isFollowerSetChanged，marker .runtime/spec-sync-follow-reported.json）：「N 个本地未改动文件自动跟随服务器」只在集合首次出现/变化时报——基线快照锚定 local-at-last-sync，本地落后集合每轮重算，平台未就绪 POST 失败时基线不落盘、同一集合逐条命令刷屏（实证 57 文件）；集合清空清 key，后再现算变化重新报。

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-10 | 2026-08-10-platform-progress-sync | 下行 pull（pullList/pull 两级 + 本地脏度冲突检测）+ 双向冲突持久化（push 409/pull 脏度写 sync-conflict-<change>.json）+ resolve 三选一（keep-local/take-platform/abort）+ collectStatus（落后标记+未决冲突列表）+ POST 元字段走 HTTP header（D-015 body 裸 JSON 零回归）+ resolvePlatformUser（local.yaml user→X-SillySpec-User）。配套 db.js schema v4 加 last_synced_platform_ts/last_local_modified_ts，progress.js serializeForSync/import。 |
| 2026-08-11 | ql-20260811-003-b023（quick） | connect/disconnect 改文本级定向替换 platform 段（readLocalYamlRaw + findTopLevelSectionRange + replaceTopLevelSection），保留 local.yaml 注释/其他段/数组/深嵌套/CRLF；废弃删除扁平全量覆写的 writeLocalYaml（round-trip 经 parseSimpleYaml 丢注释+丢非扁平结构）。新增 test/local-yaml-preserve.test.mjs。 |
| 2026-08-14 | ql-20260814-008-fd62（quick） | 修正两处与实现不符的漂移注释：① 头注释移除 syncDocuments（实为手动 platform sync-docs 唯一触发，run 流程不自动推文档），保留 sync/checkApproval 的 run 流程触发描述；② mcp 段同源假设注释改为准确描述（url 复用 platform，token 用原始 user 级 token 而非换发的 effectiveToken）。纯注释改动。 |
| 2026-08-14 | ql-20260814-013-ef64（quick） | index.js platform resolve 参数解析重写：变更名解析顺序 --change 值 → 非 flag 位置参数 → 唯一未决冲突自动选中（listConflictFiles）；无变更名多冲突/指定名无冲突文件时报错列出候选。修复旧实现盲取 platformArgs[0] 把 flag 名（如 --keep-local）当变更名报「无可解决冲突」。新增顶层导出 listConflictFiles(cwd)。 |
| 2026-08-18 | ql-20260818-013-bd63（quick） | sync 目录检查硬拦致归档后最终状态未推平台——sync.js sync() 方法在变更目录不存在时硬拦 return（existsSync 检查），archive 归档移走目录后步骤 4-5 完成状态永远到不了平台。改为 warn 继续走 DB 路径（serializeForSync 从 DB 读不依赖文件系统目录）。 |
| 2026-09-08 | ql-20260908-007（quick，sillyhub-not-ready-noise） | 新增 src/sync-noise.js 连接类失败噪音闸（syncConnectionWarn/noteSyncSuccess/isConnectionClassStatus/bindSyncNoiseFromCwd）+ spec-sync isFollowerSetChanged follower 集合去重；fetchJson/fetchJsonWithStatus 404/5xx/网络错分级走闸、connect health ping noMute、pull() 加 autoPull 区分自动/手动；sync()/spec-sync 成功路径 noteSyncSuccess 清闸打恢复行。新增 test/sync-noise.test.mjs。 |
