---
author: flow-machine-draft
created_at: 2026-10-16T11:15:20.392Z
---
# 设计记录（Design Record）— 2026-10-16-fix-downstream-tool-defects

## 做法概述

三条已实证缺陷（2026-10-16 下游项目跑流程踩到，根因均已钉到 file:line）三个独立钉点，互不依赖：

**① spec 树删除被拉取复活**。根因链：文件级删除无墓碑无队列（唯一上行通道 `syncSpecTree` 的 delete op 是无状态重算，spec-sync.js:286-292），progress 冲突时 `sync()` 在 sync.js:696-724 提前 return 把挂在其成功路径上的 `syncSpecTree`（sync.js:907-911）整轮跳过——409 冲突文件长期在场期间删除 op 永远发不出去；而下行落地 `pullSpecBundle`（sync.js:1905 rm 整树 + :1924 逐条回放）写出前零「本地已删」判定。修法两刀：
- **上行解封**：`sync()` 冲突抑制分支补跑 best-effort `syncSpecTree`。选「抑制分支补跑」而非「把 spec 树挪到 progress push 之前」——后者改变 2026-08-16/17 两次变更锚定的「progress 成功后顺带推文档/spec 树」顺序语义，风险大于收益；前者是纯增量，且抑制分支无网络请求、不挤占熔断预算。
- **下行抑制**：`pullSpecBundle` 回放前从基线快照（`.runtime/spec-sync-base.json`，语义=「上次成功同步时刻的本地文件全集」，spec-sync.js:405-414——正是「本地是否删过」的现成无状态数据源）取抑制集=基线键∖盘面存在，回放时跳过。**不新建台账**：基线在删除上行成功后被 `writeBaseSnapshot` 按当前盘面重写（条目自然消失），衰减免费获得；rm 前读基线（rm 会连带删 .runtime）。提供 `restoreDeleted` opt-out（显式意志优先）。`resolve --take-platform` 不动：它只写冲突文件显式列出的路径（用户显式服务器胜出，路径按构造本地在场），无复活面。

**② verify 携载孤儿残行 + 门禁误归属**。`mergeProbeSection` 过滤器（verify-probes.js:3901-3907）只认纯 ASCII `---` 分隔行与字面 `<待填`/`<TODO` 占位——`| :--- |`（冒号对齐）与 `| — |`（em-dash）形态逃逸被当「已填行」携载；门禁 `extractAcceptanceMatrixSlots`（stage-contract.js:898-925）按「最近前置 `**task-NN**` 锚行」归属每条五列行——残行落在最后锚之后被栽给尾任务计 `unfilled`。修法两侧收口：携载过滤器补两类形态判定（对齐分隔行 `/^:?-{3,}:?$/`、全占位行=所有单元格均为 em-dash/`-`/`待填`/`TBD`/`TODO`/空白）；门禁引入段级粘性「表头武装」——首表头行武装整个探针 7 段（锚行不重置：锚下不重复表头的手写/历史形态照旧按锚归属，acceptance-matrix-gate 既有套件钉死该契约）、携载注释行解除武装（直至新表头重新武装），未武装五列行进独立 `strayRows` 桶，`validateAcceptanceMatrix` 对孤行产独立报错要求裁决（不再栽给任何 task）。合法键漂移已填行仍携载（注释块下），由孤行报错引导 agent 裁决——门禁仍阻断（报告不得带垃圾），但归属与出路正确。

**③ 快照降级原因不可见**。`createGateSnapshot`/`createVerifyGateSnapshot` 全部失败分支返回裸 null（gate-snapshot.js:520-524/:626-636/:724-734/:885/:894/:924/:943-945，两处 catch 静默吞异常），调用方 reason 硬编码笼统文案（gates.js:1113、verify-quality-scan.js:665）——把 pnpm symlink-store 布局**设计性拒建**（junction 跨根失效，三次实证，拒建本身正确）误标成「变更文件集为空」。修法选 **failRef 可选出参**（调用方传栈上对象，失败分支写 `failRef.reason`）而非改返回形态 null→哨兵对象——后者破坏既有 17+ 处 truthiness 判定与两个测试文件的 null 断言；catch 分支补 warn 落日志；空集三分成因（git 不可用/HEAD 无 diff/他者声明过滤清空）在 `createVerifyGateSnapshot` 内区分；--done 路径把 `used_snapshot`/`snapshot_fallback_reason` 经既有 observability 通道落进 test-result.json（对齐 2026-10-09 复用观测先例）。「让 pnpm 真能建快照」是 B 档新机制（pnpm deploy/离线 install），不在本变更范围（风险节声明）。

## 接口契约

- `SyncManager.pullSpecBundle(opts)`：opts 新增 `restoreDeleted?: boolean`（缺省 false=启用防复活抑制）；返回值新增 `resurrectSkipped?: string[]`（被抑制路径，仅抑制发生时携带）；新增行为：基线差集抑制（不改变既有 ok/pulled/reason 语义与 local.yaml 保全链路）。
- `sillyspec pull --spec`：新增 `--restore-deleted` flag 透传 `restoreDeleted`；帮助文案补防复活语义。
- `SyncManager.sync()`：冲突抑制分支（未决 progress 冲突提前返回处）新增 best-effort `syncSpecTree` 补跑；返回值新增 `specTreeAttempted: true` 标志；既有 `conflict`/`suppressed` 语义不变。
- `createGateSnapshot(opts)` / `createVerifyGateSnapshot(opts)`：opts 新增 `failRef?: { reason?: string }`（可选出参，函数内失败点写入）；**返回契约不变（null）**；catch 分支新增 warn 日志（有 failRef 与否都落）。
- `extractAcceptanceMatrixSlots(verifyMd)`：返回值新增 `strayRows: Array<{task, acceptance, verdict, evidence}>`；既有 rows/unfilled/missingEvidence 对正常渲染面口径不变。
- `validateAcceptanceMatrix`（contracts.verify.validators 注册项）：`strayRows > 0` 时新增独立 error（孤行裁决报错）。
- test-result.json：extra 新增 `used_snapshot: boolean` 与失败时 `snapshot_fallback_reason: string`（additive，调用方未走快照路径时 used_snapshot 照写）。
- `mergeProbeSection`（模块内函数，经 `applySkeletonPreservingHuman`/`refreshProbeSections` 间接可见）：携载过滤器收紧，新增两类排除形态。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. **乱序/迟到到达**：删除动作与 bundle 拉取乱序——抑制集在每次 pull 时从「当前盘面」即时重算（无状态），bundle 无论迟到多久都持续被抑制；删除 op 一旦上行成功，服务器清单不再含该路径，后续 bundle 自然不携带（衰减，无清理动作）。本地删除后又想恢复的真实改主意场景走 `--restore-deleted` 显式通道或在本地重建文件（重建后盘面有文件，抑制面自动消失，内容按 update op 正常上行）。携载注释块与孤行的乱序：门禁按行序武装/解除武装，注释块出现在表中间的畸形形态也只影响其后行（进孤行桶），不影响此前已计数行。
2. **并发写**：多会话并行——A 会话删除文件、B 会话仍持有并编辑该文件：B 盘面文件存在 → B 侧无抑制，B 的 update op 正常上行（内容真改动）；A 拉取被抑制不复活 → 不出现「A 的拉取覆盖 B 的编辑」。`pullSpecBundle` 的 rm 整树与并发进程读写 .sillyspec 的既有风险面不变（--force 本就是显式破坏性动作）。failRef 是调用方栈上对象无共享状态；抑制分支补跑 `syncSpecTree` 与成功路径调用同受 bg-sync 单飞锁/trigger 竞态约束，不新增并发面。
3. **切换/生命周期**：pullSpecBundle 中途失败——抑制判定在 rm 前完成（内存集合不落盘），rm 后失败走既有 local.yaml .bak 恢复链路，无新增半态；基线被 rm 连带删除是既有行为（bundle 不含 .runtime，回放不重建），本次不新增落盘文件。快照 failRef 在函数返回后由调用方立即消费（同步栈），无跨 await 生命周期问题。
4. **作用域**：specDir 锚定与 sync()/spec 树同源（`safePlatformSpecDir`，平台模式锚 specRoot）；基线键与 tar 条目名统一归一（`./` 前缀剥离、反斜杠→正斜杠）后比对，Windows/Linux 目录形态一致。daemon（sillyhub-daemon 另一仓）有同款「按 spec_version 自动取新」落地路径，本仓修复不覆盖——跨仓待办在风险节与收口报告声明（本仓 local.yaml 注册仓=1，无跨仓冻结面）。

## 风险与死路

- **最大风险（FR-01）**：抑制面误伤——不可能误伤基线外文件（抑制集=基线键∩盘面缺失，交集定义）；真实风险是「用户删除文件后本想借 pull 恢复」，由 `--restore-deleted` 显式通道兜底，默认安全方向与「删除尚未上行成功」的事实一致。
- **FR-03 风险**：手写报告表头措辞变体不被「表头武装」识别 → 该表数据行从「按锚归属计数」变为「孤行报错」。两者都是阻断性报错，从误归属+误计 unfilled 变为准确孤行提示，误报面收敛；渲染器（renderProbe7Lines）是报告唯一生产者，表头字面稳定，回归用例钉「正常渲染零行为变化」。
- **FR-04 弃案**：改返回形态 null→`{error}` 哨兵对象——17+ 处调用与 gate-snapshot-layout-guard / verify-gate-snapshot 两测试文件的 null 断言全要动，收益（类型显式）不抵破坏面；failRef 出参零破坏。**B 档弃案**：让 pnpm 布局真能建快照（pnpm deploy/快照内离线 install/拷贝 node_modules）——新机制非修 bug，且团队已三次实证 junction 跨根失效在先，留待独立立项。
- **FR-02 弃案**：spec 树同步挪到 progress push 之前/并行——改变「progress 成功后顺带推文档与 spec 树」的既有顺序契约（2026-08-16-auto-sync-from-repo / 2026-08-17-spec-file-incremental-sync 锚定），且并行发请求加重熔断窗口竞争；抑制分支补跑是纯增量、无网络请求时零成本。
- **残差（显式不修）**：熔断窗口内 in-flight abort 仍会中断当轮 spec 树同步——无状态重算 + 下轮重试是既有设计（HUB-09 预算语义），本变更只根治「冲突文件长期封锁」这一确定性死锁面；daemon 侧同款复活路径跨仓另修。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/sync.js | pullSpecBundle 防复活抑制（rm 前读基线差集+回放跳过+restoreDeleted opt-out+警告/返回字段）；sync() 冲突抑制分支补跑 syncSpecTree（specTreeAttempted 标志） |
| 改 | src/index.js | pull --spec 新增 --restore-deleted flag 透传与帮助文案 |
| 改 | src/verify-probes.js | mergeProbeSection 携载过滤器收紧（对齐分隔行/全占位行形态排除） |
| 改 | src/stage-contract.js | extractAcceptanceMatrixSlots 表头武装+携载注释解除武装+strayRows 桶；validateAcceptanceMatrix 孤行独立报错 |
| 改 | src/run/gate-snapshot.js | createGateSnapshot/createVerifyGateSnapshot failRef 出参+空集三分成因+catch 补 warn 日志 |
| 改 | src/run/gates.js | 调用方消费 failRef.reason 替换硬编码文案；--done observability 落 used_snapshot/snapshot_fallback_reason |
| 改 | src/run/verify-quality-scan.js | 调用方消费 failRef.reason 替换硬编码文案 |
| 增 | test/pull-spec-bundle-resurrect-guard.test.mjs | FR-01 回归（红→绿） |
| 增 | test/spec-tree-sync-conflict-decouple.test.mjs | FR-02 回归（红→绿） |
| 增 | test/verify-carry-orphan-guard.test.mjs | FR-03 回归（红→绿） |
| 增 | test/gate-snapshot-reason.test.mjs | FR-04 回归（红→绿） |
