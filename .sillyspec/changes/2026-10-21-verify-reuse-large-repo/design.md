---
author: flow-machine-draft
created_at: 2026-10-21T14:37:30.768Z
---
# 设计记录（Design Record）— 2026-10-21-verify-reuse-large-repo

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

根因不是「git 不可用」而是 maxBuffer：code-face-key.js safeGit 的 execFileSync 未设 maxBuffer（默认 1MB），>1MB 的 ls-tree 输出必抛 ENOBUFS 被 catch 吞成 null → 指纹/dedupKey/passedKey/rerunSignature 全 null → 失败签名去重、passed 幂等、green-cache 三层复用在大仓（multi-agent-platform ls-tree 1.95MB，本仓 1.76MB）整体哑火——dsh 会话 0ff6f1c8 里 verify 76 分钟同码态全量实测 6 次。修法三处，全部顺着既有机制补缺口、不发明新轮子：

1. **FR-01（根治）**：safeGit 补 maxBuffer: 256MB（git-helper GIT_MAX_BUFFER 同口径同注释风格）。一行修复，恢复全部既有复用链。
2. **FR-02（堵漏）**：complete.js 批量对齐块改为资格先行——从 detectVerifyBatchFinish 抽出纯判定 isVerifyBatchEligible（不 mutating），仅资格成立且亲测步 pending 时才预跑 executeVerifyQualityScan；资格不成立时中间步 --done 零实测（实测归亲测步自身与收口门）。
3. **FR-03（补面）**：gates.js 收口门实测 else 分支与 machine-interface verify-test facet 真跑前咨询新 helper consultFailedScanReuse（包装既有 loadLastQualityScanRecord/computeQualityScanDedupKey/shouldReuseLastFailedScan，加 30min TTL 与 RERUN 旁路）——同签名失败不重跑、合成 failed 结果照常阻断，阻断信息含复用披露与既有四出路指引。

不做（明确出界）：judgeWithKnownFailures 全豁免已返 passed（语义正确）；该会话里 failed 是「exit≠0 但无可豁免失败行」的保守 fail（vitest 崩溃输出不可解析），属另一诊断问题，不在本变更范围。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/run/code-face-key.js：safeGit 私有函数加 maxBuffer——无导出变化。
- src/run/complete.js：**新导出** `isVerifyBatchEligible({ changeName, specBase, steps })` → `{ eligible: boolean, reason?: string }`（纯判定不 mutating）；detectVerifyBatchFinish 外部行为不变（先资格后 mutating，理由串逐字保留）。
- src/run/verify-quality-scan.js：**新导出** `consultFailedScanReuse({ specBase, cwd, changeName, plannedSnapshot, maxAgeMs?, forceRerun? })` → `{ reuse: true, record } | { reuse: false, reason }`（TTL 缺省 30min）。
- src/run/gates.js：verify 收口门真跑 else 分支前置复用咨询；命中时 testCheck 为合成 failed（`reason: '♻️ 复用上次失败实测（失败签名未变，免重跑）——…'`、`command: '<原命令> (failed-scan-reuse)'`），阻断/rollback 语义不变。
- src/machine-interface.js：verify-test facet 同款前置咨询（plannedSnapshot=false——CLI 门在主仓口径跑，快照口径记录按既有 snapshot-scope 判 miss）。
- 命令行/配置/文件格式：零变化。落盘记录新增零字段（复用命中写 reuse-decisions jsonl 既有观测层，layer='quality-scan-failed'）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

记录读-判-用非原子，但 dedupKey 覆盖代码树+配置+豁免面三源——任何迟到变更（新提交/改 local.yaml）使键失配回退真跑，旧记录被 storeQualityScan 整体覆盖（单文件 writeAtomicSync），无半态消费。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

两会话同时 storeQualityScan 同一 change 记录 → fs-atomic 原子替换后写者胜（既有语义）；consult 只读，读到旧记录按键判定，键失配即真跑，方向保守。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

会话中断在 consult 与真跑之间 → 无状态残留（consult 纯读）；TTL 30min 过期自动回退真跑，无死锁面。批量资格判定与 detectVerifyBatchFinish 之间存在执行间隙（预跑亲测本身），detectVerifyBatchFinish 内部全量复检（不消费资格结果），无 TOCTOU 放大。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

记录按 changeName 隔离（verify-quality-scan-<change>.json），consult 显式传 changeName；跨仓 cwd 由调用方给主仓口径（gates.js/machine-interface 均主仓 cwd，与指纹计算口径一致），不串台。multi-repo 场景 dedupKey 的 tree key 按主仓算——与既有指纹口径同源，无新偏差。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：FR-3 的面漂移假阻断——记录实测面 X 后 agent 手动补了测试绑定（面 X+Δ），dedupKey 不含测试面 → 复用可能拦下「其实新面能过」的收口。缓解：30min TTL 收敛窗口 + RERUN=1/force 逃生阀 + 阻断信息给四出路；错拦后果是「多等一轮人工确认」不是假通过（fail-closed 方向）。FR-2 资格先行理论上有「报告刚就绪、亲测本可在本步顺路跑掉却延后」的调度次优——接受（实测本来就该归亲测步，中间步顺路跑正是本次要消灭的浪费）。

试过放弃的方案：① dedupKey 无 git head 时回退「变更文件集内容哈希」——根因查明后不需要（maxBuffer 修复后主路径恢复，兜底代码纯增维护面）；② 收口门复用不带 TTL（与 noAI 闸完全对称）——面漂移风险无界，放弃；③ 把 gate verify CLI 也接快照口径判定——CLI 门本就主仓口径只读跑，接快照是语义扩张，超出本次修复面。
