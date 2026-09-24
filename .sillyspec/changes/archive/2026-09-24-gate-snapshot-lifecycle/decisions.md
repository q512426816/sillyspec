---
author: qinyi
created_at: 2026-09-24
---

# 决策记录（Decisions）

## D-001@v1: 本次做完整生命周期加固三件套（a 清理硬化 / b 崩溃自愈账本 / c doctor 可见面）
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: %TEMP% 门禁快照残留（41 个目录+注册）按哪档处理？
- answer: 用户拍板 P1——走完整流程根治，a/b/c 同批做完；P0 手工回收仅作过渡
- normalized_requirement: 清理路径加 Windows 重试与 git 注册兜底；创建时按账本+TTL 自动回收失活快照；doctor 暴露泄漏维度（warning 级）
- impacts: [FR-01, FR-02, FR-03, task-01, task-02, task-03, task-04, task-05]
- evidence: 2026-09-24 用户「P1」；本次会话清理实录：41 目录+2 prunable 注册
- 锚点: src/run/gate-snapshot.js:cleanup
- 模块域: runtime

## D-002@v1: 回收时机=下一次快照创建前 best-effort 扫描（无常驻进程）
- type: architecture
- priority: P0
- status: accepted
- source: code
- question: 残留靠谁发现——常驻清扫器、run 入口、doctor、还是快照创建点？
- answer: 快照创建前同步扫（复用 quick 守卫 TTL 与 worktree doctor stale 先例）；常驻进程成本高、run 入口过宽、doctor 被动
- normalized_requirement: createGateSnapshot 建快照前调 reclaimStaleGateSnapshots()，全 try/catch 永不阻断建快照；reclaimed 为空时零输出（正常路径逐字节不变）
- impacts: [FR-01, task-03]
- evidence: src/run/quick-audit.js 过期守卫 TTL 先例；src/worktree.js:1670 doctor staleHours=24
- 锚点: src/run/gate-snapshot.js:createGateSnapshot
- 模块域: runtime
- 故障面: 同步扫描在超大 %TEMP% 上有毫秒级开销；账本损坏时退化为零回收（现状不变）
- 退役判据: 账本零残留达 N 周且改用 OS 临时目录隔离时，可并入通用 temp 清理器

## D-003@v2: 失活判据=账本+TTL 24h+pid 活性三态（破坏性操作保守口径，supersedes D-003@v1）
- type: boundary
- priority: P0
- status: accepted
- supersedes: D-003@v1
- source: code
- question: 怎么区分「崩溃残留」与「正在跑的长门禁快照」？无效/不可判 pid 算活还是死？
- answer: create 登记 {root,pid,createdAt}、cleanup 销账；超 TTL(默认 24h，env SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS 覆盖，须为有限正数否则回退 24h) 才进入判定；pid 活性三态：kill(pid,0) 成功或 EPERM→活，ESRCH→死，**无效 pid/探针抛错/其他异常→按活跳过**。破坏性 rmSync 场景从严（与 bg-sync 终止扫描的宽松口径有意分歧：那边误判代价=进程残留，这边误判代价=删活目录）
- normalized_requirement: 回收判定=账本有条目 ∧ 结构合法 ∧ age>TTL ∧ 明确 ESRCH；任何不确定态一律跳过
- impacts: [FR-01, task-01, task-03]
- evidence: src/run/bg-sync.js:60-68 isPidAlive 惯例（EPERM 按活；无效 pid 按死——本决策在破坏性场景收紧）；独立审查 P1-7
- 锚点: src/run/gate-snapshot-ledger.js:selectStaleSnapshots
- 模块域: runtime
- 故障面: pid 复用可能把新进程当旧（TTL 24h 下可忽略，误删代价=门禁 fail-open 回退主仓）

## D-004@v2: 账本落 runtime 域 JSON 原子写；销账以「目录+注册双清确认」为前提（supersedes D-004@v1）
- type: definition
- priority: P1
- status: accepted
- supersedes: D-004@v1
- source: code
- question: 账本放哪、并发写怎么处理、cleanup 何时销账？
- answer: .sillyspec/.runtime/active-gate-snapshots.json，原子写走 src/fs-atomic.js；同 root 重复登记/销账幂等（跨 root 并发 lost update 为已接受退化：丢条目=退现状残留）；**cleanup 与失败 catch 均先尝试清理，仅在目录确已消失且 git worktree list --porcelain 不再含该 root 时才销账**，否则保留条目待下轮回收（删不掉的残留必须留在账本里，否则永久失追踪）
- normalized_requirement: 销账条件=¬exists(root) ∧ ∉worktree list；任一无法确认→保留条目并计入 skipped
- impacts: [FR-02, FR-04, task-01, task-03]
- evidence: src/fs-atomic.js 原子写；独立审查 P0-1/P1-8
- 锚点: src/run/gate-snapshot-ledger.js:unregisterGateSnapshot
- 模块域: runtime

## D-005@v1: 账本驱动的删除须先过 fail-closed 路径守卫
- type: boundary
- priority: P0
- status: accepted
- source: code
- question: 回收器按可变 JSON 里的路径做递归 rmSync/worktree remove，信任边界怎么守？
- answer: 判定层前置双守卫——isSafeSnapshotRoot(root) 管路径（规范化后必须是 resolve(tmpdir()) 的**直接子目录**、basename 严格匹配 sillyspec-gate-*、禁 .. 与嵌套分隔符形态）；isSafeLedgerEntry(entry) 管结构（根过路径守卫 ∧ pid 为正整数 ∧ createdAt 为有限毫秒值）。任一不合即跳过（不按 pid 死处理、不调用任何删除原语）。守卫只约束**账本回收路径**的删除；cleanup 自身 root 来自 mkdtemp（生成即受信）豁免
- normalized_requirement: 账本回收路径删除原语调用前必经 isSafeLedgerEntry(entry)===true（内含 isSafeSnapshotRoot）；恶意/损坏账本条目零删除副作用
- impacts: [FR-01, task-01]
- evidence: 独立审查 P0-2（信任边界扩大）、P1-3（接口签名须可承载结构校验）
- 锚点: src/run/gate-snapshot-ledger.js:isSafeSnapshotRoot / isSafeLedgerEntry
- 模块域: runtime

## D-006@v1: runtimeRoot 显式参数透传，禁从 cwd 猜
- type: architecture
- priority: P0
- status: accepted
- source: code
- question: 账本路径的 runtimeRoot 从哪来？
- answer: createGateSnapshot 新增显式 runtimeRoot 形参；quick 调用侧按 test-ledger 既有先例 resolveRuntimeRoot(null, specBase) 传入（src/run/quick-audit.js:557-559 同款）；verify 侧 createVerifyGateSnapshot 内部已算 resolveRuntimeRoot(platformOpts, specBase)（src/run/gate-snapshot.js:754），直接下传。禁在 gate-snapshot 内从 cwd 拼 runtimeRoot——会破平台模式 runtimeRoot 与 worktree drift 锚
- normalized_requirement: runtimeRoot 缺失时账本读写退 no-op（不猜路径）；quick-audit.js 进 task-03 接线边界
- impacts: [FR-01, FR-04, task-03]
- evidence: src/run/gate-snapshot.js:736-754；src/run/quick-audit.js:557-559；独立审查 P0-3
- 锚点: src/run/gate-snapshot.js:createGateSnapshot
- 模块域: runtime
- 故障面: runtimeRoot 漏传时账本链路退 no-op——回收静默失效（残留照旧泄漏，退现状不恶化）；quick-audit 传参行被并行会话覆盖同理
- 退役判据: 未来 runtimeRoot 若有全局单一面（如平台托管固定 runtime），可去掉形参改内部解析

## D-007@v1: doctor 泄漏维度阈值走 env/24h 口径，不复用顶层 --stale-hours
- type: compatibility
- priority: P1
- status: accepted
- source: code
- question: doctor 维度阈值从哪来？顶层 doctor 实际并无 --stale-hours 参数解析
- answer: 顶层 doctor（src/index.js:133 usage + 2685-2698 三个调用点）不解析 --stale-hours，runDoctorDiagnostics 也不收 staleHours——FR-03 原表述与代码事实不符。阈值统一取 SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS/24h（与 create 前扫同一单源），doctor 维度零新增参数面
- normalized_requirement: doctor 维度阈值与 create 前扫共用同一 env+缺省；usage 与 requirements FR-03 同步修正
- impacts: [FR-03, task-04]
- evidence: src/index.js:133/2685-2698/3651-3655；src/doctor-diagnostics.js:1433；独立审查 P0-4
- 锚点: src/doctor-diagnostics.js:detectGateSnapshotLeak
- 模块域: runtime
