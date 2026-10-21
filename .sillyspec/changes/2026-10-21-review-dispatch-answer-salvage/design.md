---
author: flow-machine-draft
created_at: 2026-10-21T07:38:16.101Z
---
# 设计记录（Design Record）— 2026-10-21-review-dispatch-answer-salvage

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

根因（dsh-session-f479c233 实证）：worker 把完整 review JSON 放在**回答正文**返回，而回收链两处断——传输层 `getWorkerResult` 只解析 `{workerId, status, artifacts}` 把 answer 原文丢弃；提取层 `extractReviewFromArtifacts` 只扫 artifacts。于是 --status 误判 completed-no-artifact，且失败文案「确认无法回收再 --kill 降级」把处置（--kill 清在途记录）与通道降级混写，误导 agent 跳过人工核对直接降级 self 自审。

修法五点沿数据流向排布：**传输层透传**（client.js getWorkerResult 增返 answer 原文，answer 字段缺省兜底 result 字段，unavailable 分支补 answer:null——向后兼容，只加字段不裁既有）→ **提取层第三通道**（extractReviewFromArtifacts(artifacts, answer)，artifacts 双通道全失败后从 answer 文本扫首个平衡 JSON；平衡扫描逻辑与既有通道②共用同一实现）→ **回收链接线**（主线/影子 status 链把 gr.answer 传入提取；completed 终态 best-effort 落盘 worker-answer.md 于 stage-reviews run 目录，与 review.json 构成「结构化+原文」证据链）→ **失败出口重写**（① --status --salvage 自动落盘 worker-answer.md 并提示 register-stage-review --from 回收；② 确无结果才按通道优先序降级；删 --kill 降级混写）→ **派发端预防**（任务书产出段补「宿主不支持 artifacts 时把 JSON 放回答正文首个 ```json 块」，让 worker 的兜底行为落在回收链能接住的形态上）。

--salvage 语义：与 --status 组合的显式兜底形态——重取 worker 结果、强制落盘终态原文（answer 优先，缺省序列化 artifacts 原文）、提取仍失败时返回 salvagePath + --from 指引（人工修整出 review.json 后经 register-stage-review --from 收编），在途记录不清（可重试）。降级永远是②且需人工确认平台确无结果，CLI 不自动降级。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

| 面 | 变化 |
|---|---|
| `SillyHubMcpClient.getWorkerResult({missionId, workerId})` | 返回 shape `{workerId, status, artifacts}` → `{workerId, status, artifacts, answer}`；answer = tool 返回值 `answer` 字符串原文，缺省兜底 `result` 字段，双缺 null；unavailable 三分支（未配置/null/isError）→ `{workerId: null, status: 'unavailable', artifacts: [], answer: null}`。既有三字段语义不变 |
| `extractReviewFromArtifacts(artifacts, answer?)` | 新增可选第二参；通道序：① artifacts kind 含 review 直接 JSON.parse → ② artifacts 文本字段扫首个平衡对象 → ③ answer 文本扫首个平衡 JSON（字符串字面量内 } 不计数，同②实现）。缺省 answer=undefined 时行为与改前逐字一致 |
| `runReviewDispatch(opts)` | opts 增 `salvage?: boolean`（仅 status 链消费）；completed 分支：先 best-effort 落盘 worker-answer.md（`{runtimeRoot}/stage-reviews/{stage}-{reviewRunId}/worker-answer.md`，answer 优先、缺省 JSON.stringify(artifacts)），再三通道提取；提取失败返回 guidance 改两步文案（--salvage → --from → ②确无结果才降级），salvage 形态额外带 `salvagePath`；bad-review 分支文案去「--kill 后降级」混写，改指 worker-answer.md + --from |
| CLI `review-dispatch` | 增 `--salvage` flag（仅与 `--status` 组合合法，单独使用 exit 2 用法错误）；usage 文案同步 |
| `buildReviewerTaskBook` | 产出方式段增一条：宿主/平台不支持 artifacts 回传时，把完整 review.json 文本放进**回答正文首个 ```json 代码块**（CLI 回收链从回答正文扫描兜底）。四要素结构与既有行不变 |
| 新文件 | `.runtime/stage-reviews/<stage>-<reviewRunId>/worker-answer.md`——worker 终态原文（writeAtomicSync 原子写；写失败 console.warn 不阻断回收） |

影子链（dispatchShadowReview status）同步把 gr.answer 传入提取（通道③受益，fail 形态仍只记账）；影子不加 salvage/worker-answer.md（影子本就有 review-raw.json 证据面且 accounting-only 无交互指引）。其余命令/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。status 轮询幂等——每次 completed 轮询重取 getWorkerResult，worker-answer.md 覆盖写（原子替换，后到即最新）；answer 为空且 artifacts 为空时不写文件（无原文可落，salvage 返回「确无结果」形态走②）。completed 判定仍以平台 listWorkers 状态机为准，本变更不引入时序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   双 CLI 同时 status 同一 change——getWorkerResult 只读无副作用；worker-answer.md 与 review.json 均 writeAtomicSync 原子替换，读者要么看到旧版要么新版，无半文件；在途记录读写维持现状（completed 回收路径与改前相同的清记录时序）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。salvage 失败**不清在途记录**（可重复 salvage、可人工平台核对后 --kill 处置）；回收成功清记录（现状不变）。CLI 进程在 worker-answer.md 写入与 review.json 落盘之间崩溃 → 重跑 --status / --status --salvage 幂等重做（记录仍在）。--kill 语义完全不变（清记录+平台处置指引）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。worker-answer.md 落 specBase（resolvePlatformSpecDir 与 review.json 同根）下 `.runtime/stage-reviews/<stage>-<reviewRunId>/`，runId 每 change+stage 唯一，跨 change/跨仓不串台；answer 提取是纯函数无全局态。CLI flag --salvage 不进任何持久配置。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**平台 get_worker_result 的 answer 字段形态未拿到 schema 实证**（dsh 会话只证明「平台 UI 可见回答正文」与「artifacts 回收不到」）。缓解：answer/result 双字段兜底 + 任务书 ```json 块指引让原文落在可扫描形态 + salvage 把 artifacts 原文也序列化兜底——三重兜底下最坏退化仍是现状（completed-no-artifact + ②降级），不会更差。

放弃案：
- **仅在 --salvage 时写 worker-answer.md**（正常回收不写）——放弃。终态原文是审计证据面（dsh 事故里人工只能靠平台 UI 贴回原文），回收成功也应留原文；且「写了但没提示」无成本（一个 markdown 文件随 .runtime 生命周期回收）。
- **completed-no-artifact 时 CLI 自动降级写 self review**——放弃。降级是人工决策（②里显式确认「平台确无结果」），CLI 自动降级正是本事故要修的「静默把独立评审降成自审」。
- **--from 直接指向 worker-answer.md**——放弃。register-stage-review --from 对文件做 JSON.parse+schema 校验，原文 markdown（含 ```json 围栏与说明文字）必然解析失败；--from 指向「人工修整出的纯 review.json 文件」，worker-answer.md 是修整素材。
- **client.js 里直接做 JSON 提取**——放弃。传输层保持纯度（task-02 既有约束），语义解析归消费方 extractReviewFromArtifacts，本次只透传原文。
