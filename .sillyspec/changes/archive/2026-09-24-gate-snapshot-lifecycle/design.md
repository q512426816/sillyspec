---
author: qinyi
created_at: 2026-09-24 14:36:14
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-24-gate-snapshot-lifecycle

## 背景

quick/verify 门禁用 `git worktree add --detach` 在 `%TEMP%` 建隔离快照（src/run/gate-snapshot.js:486?），finally 调 cleanup 移除；但三条路径必然泄漏：进程被杀（代码自己警告"勿按超时杀进程"，用户照杀）cleanup 根本不跑；Windows 上 `rmSync` 无重试遇 EPERM/junction 锁失败且异常被吞；`git worktree remove` 失败时注册残留变 `prunable`。实证：本次清理 41 个残留目录+2 个 prunable 注册，全仓无任何清扫机制，每次门禁跑成功也漏——必然事件非偶发。

## 设计目标

门禁快照泄漏从"永久攒"变为"被杀后 24h 内自愈"：创建前自动回收失活快照（目录+git 注册双清）；清理路径 Windows 硬化；doctor 泄漏可见。

## 非目标

- 不改门禁判定语义（快照隔离/血统三态/trust 边界全不动）。
- 不做常驻清扫进程、不做 %TEMP% 全局清理器。
- 不动已归档变更遗留的 %TEMP% 历史目录（P0 手工已清 41 个）。
- 不给 quick 守卫/worktree doctor 改 TTL 默认值。

## 总体方案

四 Wave 五卡（plan 定稿）：W1 task-01 账本模块（+单测）与 task-02 cleanup 硬化（文件正交并行）；W2 task-03 生命周期接线（runtimeRoot 透传+回收调用+三路径销账）；W3 task-04 doctor 维度；W4 task-05 文档登记。全量回归并入各卡 acceptance 与 verify 阶段（不另立仪式卡）。

1. **账本模块**（task-01）：`gate-snapshot-ledger.js` 提供账本读写+纯判定+回收执行，注入时钟/pid 探针可测；删除前过 fail-closed 路径守卫（D-005@v1）。
2. **清理硬化**（task-02）：抽出可注入的 `cleanupSnapshot`（rmSync 加 `maxRetries/retryDelay`；remove 失败补 `git worktree prune`；返回双清结果），task-02 自带故障注入测试（test/gate-snapshot-cleanup.test.mjs，真实调用与失败分支断言，禁文本钉）。
3. **生命周期接线**（task-03）：create 前 best-effort 回收（永不阻断，reclaimed 空时零输出）；runtimeRoot 显式透传（D-006@v1）；create 登记、cleanup/失败双路径**双清确认后**销账（D-004@v2）。
4. **doctor 维度**（task-04）：`detectGateSnapshotLeak` warning 级输出，阈值走 env/24h 单源（零新增 CLI 参数面——顶层 doctor 无 --stale-hours 入口）。
5. **文档同步**（task-05）：runtime 模块卡+changelog、file-lifecycle 核对、test:core 登记。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/run/gate-snapshot-ledger.js | 账本 register/unregister/read + 路径/结构守卫 + 纯判定 selectStaleSnapshots + 回收执行 reclaimStaleGateSnapshots |
| 修改 | src/run/gate-snapshot.js | cleanup 抽出可注入的 cleanupSnapshot（rmSync 重试 + prune 兜底，返回双清结果）；createGateSnapshot 前置回收接线与登记/双清确认后销账 |
| 修改 | src/run/quick-audit.js | createGateSnapshot 调用点显式透传 resolveRuntimeRoot(null, specBase)（同 test-ledger 先例） |
| 修改 | src/doctor-diagnostics.js | 新增 detectGateSnapshotLeak 并接入 runDoctorDiagnostics（warning 级，阈值 env/24h，零新增参数面） |
| 新增 | NEW:test/gate-snapshot-lifecycle.test.mjs | 账本幂等/守卫/pid 三态/双清销账/真实 kill 自愈用例 |
| 新增 | NEW:test/gate-snapshot-cleanup.test.mjs | cleanup 故障注入（remove 失败→prune 调用、rmSync 重试选项、双失败不抛） |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | runtime 模块卡补账本与回收机制摘要（gate-snapshot.js 已属本模块） |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.changelog.md | 归档期 changelog 摘要（随 archive 落） |
| 修改 | docs/sillyspec/file-lifecycle.md | 新运行时文件+账本路径登记（写入 plan 核对） |
| 修改 | docs/sillyspec/platform-interface-map.md | 并行会话 97454a6f 改动 sync.js/index.js 致 14 处行号锚漂移（doc-ref-check 全量拦），本变更机械重锚（纯数字对位，无语义改写） |
| 修改 | package.json | 新测试入 test:core 清单（照 test-ledger 先例） |

## 接口定义

```js
// src/run/gate-snapshot-ledger.js
gateSnapshotLedgerPath(runtimeRoot: string): string
registerGateSnapshot({ runtimeRoot, snapshotRoot, pid = process.pid }): void   // 幂等，原子写
unregisterGateSnapshot({ runtimeRoot, snapshotRoot }): void                    // 幂等，缺失不抛
readGateSnapshotLedger(runtimeRoot): Array<{ snapshotRoot, pid, createdAt }>   // 损坏→[]
isSafeSnapshotRoot(snapshotRoot): boolean   // 路径守卫（删除原语前置闸）：tmpdir 直接子目录+sillyspec-gate-* basename+无 .. 嵌套（D-005@v1）
isSafeLedgerEntry(entry): boolean           // 条目结构守卫：根过 isSafeSnapshotRoot ∧ pid 正整数 ∧ createdAt 有限毫秒值（D-005@v1）
selectStaleSnapshots(entries, { now, staleHours, isProcessAlive }): { stale, alive }  // 纯函数；三态保守口径（D-003@v2），不过 isSafeLedgerEntry 的条目直接跳过
reclaimStaleGateSnapshots({ runtimeRoot, cwd, now = Date.now(), staleHours, isProcessAlive }):
  { reclaimed: string[], skipped: string[] }                                     // 目录+worktree 注册双清；条目仅在双清确认后销号（D-004@v2）
// src/run/gate-snapshot.js（既有函数签名变更）
cleanupSnapshot({ snapshotRoot, cwd, runGit = defaultGit, removeDir = defaultRemoveDir }):
  { dirRemoved: boolean, worktreeCleaned: boolean }   // 可注入故障的清理体（task-03 据双清结果决定销账）
createGateSnapshot({ cwd, files, sourceRoot = null, skipImportSmoke = false, mergeBase = null, runtimeRoot = null })
  // runtimeRoot 显式形参：缺失时账本读写退 no-op，禁从 cwd 猜（D-006@v1）
  // cleanup 内 root 来自 mkdtemp（生成即受信）→ 豁免账本路径守卫；守卫只约束账本回收路径的删除原语
// src/doctor-diagnostics.js
detectGateSnapshotLeak({ runtimeRoot, now, staleHours, isProcessAlive }):
  { status: 'ok' | 'leak', leaked: Array<{ root, ageHours }> }                  // warning 级
```

账本条目 `{ snapshotRoot, pid, createdAt }` producer=createGateSnapshot → 落盘账本 → consumer=下个 create 的回收判定 + doctor 诊断；无对外 API/payload 变更。

## 生命周期契约表

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| snapshot create | gate-snapshot.js | 账本 | snapshotRoot, pid, createdAt | 无账本条目 → 有条目 |
| snapshot cleanup | quick-audit/gates finally | 账本 | snapshotRoot | 有条目 → 无条目（仅目录消失 ∧ worktree list 无注册，双清确认后；否则保留待回收） |
| snapshot create-fail | gate-snapshot.js catch | 账本 | snapshotRoot | 尝试清理后双清确认才销账；清不掉保留条目（非悬空，是待回收记录） |
| snapshot reclaim | 下一个 create / doctor | 账本+git+磁盘 | snapshotRoot, age, pidAlive | 失活且守卫过的条目 → 目录与 worktree 注册双清后销号 |

## 数据模型

无 schema/DB 变更。账本为 runtime 域 JSON 文件（`.sillyspec/.runtime/active-gate-snapshots.json`，gitignore 面，原子写走 src/fs-atomic.js 先例）。

## 兼容策略

- 未发生泄漏时行为逐字节不变（账本空、sweep 零副作用）；cleanup 成功路径不变。
- 账本损坏/读取异常→回收零执行（退现状），门禁结论不受影响。
- 回退路径：删 ledger 模块接线，cleanup 回到原 rmSync 单删（git remove 分支本就在）。
- 不改任何 CLI 参数面、退出码、门禁判定。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 回收误删活跃快照（超长门禁/休眠） | P1 | pid 三态保守口径（不确定即活跳过）+ TTL 24h + 条目守卫（仅账本回收路径）+ 销账双清确认（fail-safe） |
| R-02 | pid 复用误判失活 | P2 | TTL 24h 下可忽略；误删代价=门禁 fail-open 回退主仓 |
| R-03 | 账本并发写丢条目 | P2 | 原子写+吞异常；丢条目退化为现状残留（不恶化），契约明示为接受退化 |
| R-04 | doctor 新维度影响既有诊断面测试 | P3 | 回收站 doctor 族测试；warning 级不阻断；维度结构按既有 dimensions 契约适配 |
| R-05 | 账本条目被篡改诱导删任意目录 | P0 | isSafeSnapshotRoot fail-closed 守卫（D-005@v1）：tmpdir 直接子目录+basename 前缀+形态校验，不过闸零删除 |

## 非功能生命周期

本变更不引入长驻进程/后台任务/外部资源持有：回收为 createGateSnapshot 内同步 best-effort 调用（全 try/catch 恒退）；账本条目自灭条件=cleanup 销账或 TTL 超期被回收；父环境消失（进程死）后靠 pid 失活+TTL 判定死亡。

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 背景/总体方案（三件套同批）/非目标 | 已覆盖 |
| D-002@v1 | 总体方案步骤3（create 前回收/空则零输出）/接口 reclaimStaleGateSnapshots | 已覆盖 |
| D-003@v2 | 总体方案步骤1-3（账本+pid 三态+TTL 校验）/接口 selectStaleSnapshots/R-01 | 已覆盖（supersedes v1） |
| D-004@v2 | 接口 register/unregister/数据模型/生命周期表（双清销账）/task-01,task-03/R-03 | 已覆盖（supersedes v1） |
| D-005@v1 | 接口 isSafeSnapshotRoot/总体方案步骤1/R-05 | 已覆盖（独立审查 P0-2 引入） |
| D-006@v1 | 接口 createGateSnapshot runtimeRoot 形参/总体方案步骤3/task-03 | 已覆盖（独立审查 P0-3 引入） |
| D-007@v1 | task-04/FR-03 阈值口径（env/24h，零新增参数面） | 已覆盖（独立审查 P0-4 引入） |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1/D-002@v1/D-003@v2/D-004@v2/D-005@v1/D-006@v1/D-007@v1）
- [x] 含「生命周期契约表」（四事件各有 task 覆盖：task-01/02/03/04）
- [x] UI 原型不涉及（纯 CLI/Node，无前端文件）
- [x] 无组合裁定约束（裁定互不作用，无组合面）
