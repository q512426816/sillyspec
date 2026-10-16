---
author: flow-machine-draft
created_at: 2026-10-16T11:15:20.392Z
---
# 需求规格（Requirements）— 2026-10-16-fix-downstream-tool-defects

## 功能需求

### FR-01: 回归用例红→绿：progress 冲突/熔断窗口内本地删除 spec 文件后，后续 pullSpecBundle / resolve --take-platform 不把服务器旧文件写回本地（活跃变更内单文件粒度；基线有、盘面无=本地删除的抑制判定，且随删除成功上行自然衰减；全新空环境无基线时全量回放行为不变）

- pullSpecBundle 整树快照回放**必须**尊重本地删除面：基线快照（`.runtime/spec-sync-base.json`，上次成功同步时刻的本地文件 hash 全集）中存在、而当前盘面不存在的文件（= 同步失败窗口内删除 op 未上行的本地删除），回放时**必须**跳过不写回本地，并**必须**在警告与返回值中列出被抑制路径；`resolve --take-platform` 仅作用于冲突文件显式列出的路径（用户显式「服务器胜出」裁决，路径按构造本地在场、无复活面），不在本条抑制面。
- 基线快照缺失或为空（全新空环境）时**必须**保持既有全量回放行为逐字节不变（抑制集为空集）。
- **必须**提供显式恢复通道（`pullSpecBundle` opts `restoreDeleted` / `pull --spec --restore-deleted`）：用户显式意志优先，被抑制文件照常恢复。
- 衰减语义**必须**成立：删除 op 上行成功后服务器清单不再含该路径，后续 bundle 不携带该条目，抑制面自然消失（无需清理动作）。

#### 场景：防复活主路径

- Given 熔断/409 窗口内本地删除了 `changes/X/tasks/task-05.md`（基线快照含它、盘面无、删除 op 未上行），服务器 bundle 仍含该文件
- When 对非空 specDir 执行 `pullSpecBundle({ force: true })`
- Then `task-05.md` 不被写回本地；其余文件正常回放；返回值 `resurrectSkipped` 含该路径且终端有抑制警告

#### 场景：全新空环境零行为变化

- Given specDir 无 `.runtime/spec-sync-base.json`（基线缺失）
- When `pullSpecBundle({ force: true })`
- Then 全部 bundle 条目照常回放（抑制集为空，既有行为不变）

#### 场景：显式恢复通道

- Given 与主路径相同的抑制面
- When `pullSpecBundle({ force: true, restoreDeleted: true })`
- Then `task-05.md` 照常恢复落盘（用户显式意志优先）

#### 场景：删除上行成功后自然衰减

- Given 删除 op 已上行成功（服务器清单不再含该路径），本地盘面同样无该文件
- When 后续 `pullSpecBundle({ force: true })`
- Then bundle 不含该条目、无可抑制对象，行为与普通回放一致

### FR-02: 回归用例红→绿：progress 409/熔断不再阻断 spec 树 delete op 上行（spec 树与 progress 六表是独立通道，冲突分流不互相封锁）

- `sync()` 的 progress 冲突抑制分支（读到未决 `sync-conflict-<change>.json` 提前返回处）**必须**仍以 best-effort 执行 `syncSpecTree`——spec 树删除 op 上行**不得**因 progress 六表通道的未决冲突被整轮封锁（spec 树有独立端点、独立冲突文件，互不依赖）。
- 该补跑失败**不得**改变该分支既有的 `conflict`/`suppressed` 返回语义（失败仅记日志/追加 errors，不抛出、不阻断）。

#### 场景：冲突抑制期间删除 op 照常上行

- Given `.runtime/sync-conflict-X.json` 在场（progress 未决冲突），本地已删除 `changes/X/tasks/task-06.md` 而服务器清单仍含它
- When `sync(X)`（mock 平台：GET spec-manifest 200、POST spec-sync 捕获请求体）
- Then POST body 的 ops 含 `{ op: 'delete', path: 'changes/X/tasks/task-06.md' }`，返回值含 `conflict: true, suppressed: true`

#### 场景：补跑失败不改抑制语义

- Given 冲突文件在场且 spec 树同步抛异常（如网络失败）
- When `sync(X)`
- Then 返回值仍为 `conflict: true, suppressed: true`（异常被吞、记入 errors/debugLog，不向上抛）

### FR-03: 回归用例红→绿：mergeProbeSection 不再携载 :---/—/待填 等占位与分隔形态行（合法键漂移已填行仍携载且带归属注释）；extractAcceptanceMatrixSlots 对无表头归属的孤行不再栽给最近 task 锚行，改为独立「孤行」报错要求裁决删除或补归属

- 携载面（`mergeProbeSection` 旧行收集过滤器）**必须**排除：冒号对齐分隔行（首列 `:---`/`:---:` 等形态）与全占位行（所有单元格均为 `—`/`–`/`-`/`待填`/`TBD`/`TODO` 及空白形态）；合法键漂移已填行（含真实判定值）**必须**仍携载到段尾携载注释块下（已填格不丢语义不变）。
- 门禁提取（`extractAcceptanceMatrixSlots`）对「无表头武装」的五列表行——携载注释块（`<!-- refresh 携载`）之后、且其后无新表头行重新武装——**不得**归属最近 `**task-NN**` 锚行计数（不计入 rows/unfilled/missingEvidence），**必须**计入独立 `strayRows` 孤行桶；武装为段级粘性（首个表头行武装整段，锚行不重置——锚下不重复表头的既有手写/历史形态照旧按锚归属，正常渲染文法行为不变）。
- `validateAcceptanceMatrix` 对 `strayRows > 0` **必须**产出独立 errors（孤行报错），指明裁决出路（删除残行，或补全 task 锚+表头后按五列格式补判定与证据）。
- 正常渲染面（task 锚行→表头→分隔→数据行的既有文法）行为**必须**与既有口径逐字节一致（strayRows 恒空）。

#### 场景：占位与分隔行不携载

- Given 旧报告探针段含 `| :--- | :--- | :--- | :--- | :--- |` 对齐分隔行与 `| — | — | — | — | — |` 全占位行
- When `applySkeletonPreservingHuman(old, skeleton)`
- Then 两形态均不出现在新渲染输出（不携载、不产生 stale 追加块）

#### 场景：键漂移已填行仍携载

- Given 旧报告含首列键已不在新骨架的真实已填行（判定=`covered`、证据=测试锚点）
- When `applySkeletonPreservingHuman(old, skeleton)`
- Then 该行携载到段尾 `<!-- refresh 携载的已填行… -->` 注释块下（保留给 agent 裁决）

#### 场景：门禁孤行独立桶不栽锚行

- Given 探针 7 段某 task 表之后出现携载注释块及其后两条旧表行（判定列非五枚举）
- When `extractAcceptanceMatrixSlots`
- Then 两行进 `strayRows`、不计入 `unfilled`、`task` 字段不用于最近锚归属报错；`validateAcceptanceMatrix` 产出「孤行」errors 要求裁决

#### 场景：正常渲染零行为变化

- Given CLI 正常渲染的探针 7 段（锚行+表头+分隔+数据行，无携载块）
- When `extractAcceptanceMatrixSlots`
- Then `strayRows` 为空数组，行归属/计数与既有口径一致

### FR-04: 回归用例红→绿：快照失败分支带出结构化原因（pnpm 布局/变更文件集为空三分成因/junction 失败/worktree 异常详情），两处调用方文案替换硬编码；--done 路径把 usedSnapshot 降级事实落进结果记录

- `createGateSnapshot` / `createVerifyGateSnapshot` 的所有失败分支——pnpm/bun/lerna symlink-store 布局拒建、环境目录链接不完整、worktree/基建异常（含现被静默吞掉的 catch）、变更文件集为空的三种成因（git 不可用 / HEAD 无 diff / 他者声明过滤清空）、快照链路异常——**必须**通过可选出参 `failRef` 带出结构化原因字符串，catch 分支**必须**补 warn 日志（异常细节不再静默）。
- verify --done 实测门与 noAI 质量扫描两处调用方**必须**消费该原因构造 `reportGateSnapshotFallback` 的 reason（替换硬编码笼统文案「变更文件集为空 / 快照基建不可用」）。
- --done 路径**必须**把 `used_snapshot`（Boolean）与失败时的 `snapshot_fallback_reason` 写入 test-result.json（observability 通道，对齐 2026-10-09 复用观测先例）。
- 两函数既有 `null` 返回契约**必须**保持不变（不传 `failRef` 时返回值与判定行为与既有完全一致；catch 分支新增的 warn 日志是本条显式声明的可见性增强，不构成行为回归——评审 P3-4 澄清：二者不矛盾，自本句起口径统一）。

#### 场景：pnpm 布局拒建原因可见

- Given 带 `pnpm-lock.yaml` 的 git 仓
- When `createGateSnapshot({ cwd, files, failRef })`
- Then 返回 null 且 `failRef.reason` 含 pnpm symlink-store 布局拒建说明

#### 场景：文件集为空成因区分

- Given 非 git 仓（`resolveVerifyChangedFiles` 返回 null）
- When `createVerifyGateSnapshot({ ..., failRef })`
- Then `failRef.reason` 指明「git 不可用」成因（与「HEAD 无 diff」「他者声明过滤清空」可区分）

#### 场景：--done 降级事实落盘

- Given 快照不可用（failRef 携带原因）时跑 verify --done 实测门
- Then test-result.json extra 含 `used_snapshot: false` 与 `snapshot_fallback_reason`

#### 场景：不传 failRef 零行为变化

- Given 调用方未传 `failRef`
- When 两函数任一失败分支触发
- Then 返回 null + 既有 console 输出，与改动前逐字节一致

### FR-05: 三端兼容 Windows/Linux/macOS；既有相关测试全绿（sync/spec-sync/pull-spec-bundle/verify-papercuts/acceptance-matrix-gate/verify-gate-snapshot 族）

- 全部改动**必须**兼容 Windows/Linux/macOS（路径分隔与归一、CRLF、junction 语义）；本变更新增回归测试**必须**先红后绿；既有相关测试族（pull-spec-bundle、platform-sync 族、spec-sync 增量族、verify-papercuts、acceptance-matrix-gate、verify-gate-snapshot / layout-guard / monorepo、verify-quality-scan、gates-snapshot-fallback-visibility）**必须**全绿。

#### 场景：回归族全绿

- Given 上述测试族全量执行
- Then 全部通过（`node --test` 相关子集零失败）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/pull-spec-bundle-resurrect-guard.test.mjs「防复活：基线有盘面无不写回（红→绿）/无基线全量回放/restoreDeleted 显式恢复/非抑制文件正常回放」
FR-02: test/spec-tree-sync-conflict-decouple.test.mjs「冲突抑制分支仍上行 spec 树删除 op（红→绿）/补跑异常不改抑制语义」
FR-03: test/verify-carry-orphan-guard.test.mjs「占位与分隔行不携载（红→绿）/键漂移已填行携载/门禁孤行独立桶不栽锚行（红→绿）/正常渲染零行为变化」
FR-04: test/gate-snapshot-reason.test.mjs「pnpm 拒建原因（红→绿）/文件集为空成因区分/--done 降级事实落盘（红→绿）」
FR-05: test/run-tests.mjs「既有相关测试族全量回归（pull-spec-bundle、platform-sync 族、spec-sync 族、verify-papercuts、acceptance-matrix-gate、gate-snapshot 族、verify-quality-scan）」
