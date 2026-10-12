---
author: flow-machine-draft
created_at: 2026-10-12T13:26:06.198Z
---
# 设计记录（Design Record）— 2026-10-12-tick-evidence-multi-anchor

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两个小缺口同批清偿（同一 dogfood 证据源）：① task-tick.js 的 runTaskTick 增加可选 evidence 参数（index.js 分派层解析 --evidence，`@路径` 前缀读文件、帽 8KB、失败 fail-soft 原样登记）——翻格成功时向 changes/<名>/task-evidence.jsonl 追加四键 JSON 行，watcher task-done 事件 best-effort 附 evidence；② flow-review.js 的 reviewedAgainst 从单形态字符串扩展为双形态（字符串零破坏兼容 + 对象 {workspace, repos}），validateReviewJson/reviewAnchoredToHead 双形态化，renderReviewerTaskbook 在跨仓冻结面在场（change-patch.json 含 repos）时印对象形态优先的 schema 说明。设计原则：证据与锚都是**自愿补录面**——不接入任何收口门判据（tick 语义不变），锚对象只是把「对着哪个面评审」从不可机核变为可机核，仓键开放自由（local.yaml repos 注册表键空间，CLI 零枚举——开放世界红线）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CLI：`task tick` 新增可选 `--evidence <文本|@路径>`（无 flag 行为零变化）。
- 新文件产物：`changes/<名>/task-evidence.jsonl`（四键 JSONL：ts 毫秒 / task 归一 id / evidence 文本 / source:'task-tick'；UTF-8 追加写，幂等重勾零追加——与事件直写同口径）。
- watcher 事件：task-done 事件新增可选 evidence 字段（best-effort，写失败不影响翻格与节奏门）。
- review.json 契约：reviewedAgainst 双形态——`"<sha>"`（既有）或 `{"workspace":"<sha>","repos":{"<key>":"<sha>"}}`（workspace 必填；repos 可选；仓键自由，不枚举校验）。
- renderReviewerTaskbook：跨仓面在场（change-patch.json 含 repos 键）时 schema 行印双形态说明（对象优先+各仓取 sha 提示）；单仓零变化。
- task-tick.js 新导出：resolveTickEvidence({ evidence })（纯函数：@file 展开/帽/失败降级）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/task-tick.js | runTaskTick 增 evidence 参数 + task-evidence.jsonl 追加 + 事件附字段 + resolveTickEvidence 导出 |
| M | src/index.js | task tick 分派层解析 --evidence |
| M | src/flow-review.js | validateReviewJson/reviewAnchoredToHead 双形态 + 任务书跨仓 schema 行 |
| A | test/tick-evidence-multi-anchor.test.mjs | 三态/校验矩阵/锚定/任务书双态/回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   证据 JSONL 追加写单调（每 tick 至多一行，ts 记录时点）；中断恢复后重 tick 同一任务是幂等 already 分支——零追加，无重复证据行。锚对象是评审落盘时点快照，与既有字符串锚同语义。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   JSONL 追加写单行原子性（appendFileSync 单次调用 ≤8KB，POSIX/NTFS 追加语义与 watcher 事件流同款）；并发双 tick 不同任务各写各行，交错不撕裂（行级原子）。锚为评审产物单写者。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   证据追加在翻格成功之后（失败翻格无证据行——证据不先于事实）；@file 展开在写盘前完成，无半态。归档后 task-evidence.jsonl 随 change 目录进归档件（只读面不再 tick——既有拒收口径）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   证据文件在 change 目录内变更级隔离。锚对象 repos 键由评审员按 local.yaml repos 注册表如实填写，CLI 只验值形态不验键集合（开放键空间）；reviewAnchoredToHead 只用 workspace 锚对主仓 HEAD 判漂移——跨仓锚是记录面不参与主仓判定，无串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：证据文本自由（≤8KB）可能被塞入超长噪声或敏感内容进归档件。缓解：8KB 帽 + 自愿面定位（不进门禁，无激励灌水）；敏感面与 change.patch 同级暴露（仓库本身私有）。

试过但放弃：① evidence 接入收口哨兵作为替代证据源——改变哨兵判据语义（token/review.json 双源是 L0 硬门），混入自愿补录会稀释假完成拦截强度，明确不做（留待真实需求再立项）；② 锚对象做全仓逐键锚定判定（任一仓漂移即隔离评审）——跨仓 HEAD 由评审环境决定，主仓 CLI 无法可靠 rev-parse 外仓（路径注册逐机不同），判定面收敛在 workspace 锚 fail-safe；③ evidence 强制格式（URL/sha/路径枚举）——开放世界红线，自由文本+@file 引用已够。
