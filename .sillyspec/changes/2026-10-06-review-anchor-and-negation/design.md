---
author: flow-machine-draft
created_at: 2026-10-05T23:15:57.077Z
---
# 设计记录（Design Record）— 2026-10-06-review-anchor-and-negation

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两个实测缺口各取最小修法：① 评审时点 vs 重冻结竞态——根因是隔离判定只看「重冻结时刻 review.json 在场」这一个信号，无法区分「对着旧冻结面的过期评审」与「对着当前 HEAD 的刚完成评审」。修法：给评审产物加对象锚——任务书印出当前 HEAD 完整 sha，评审员照抄进 review.json 新增的 reviewedAgainst 字段；漂移隔离前先比对（双向前缀容忍短 sha），命中即保留不隔离。锚定比对提炼为 flow-review.js 纯函数 reviewAnchoredToHead（可单测），flow.js 隔离段仅接线。② 「串台」否定消解漏裸「不」形态——NEGATED_CROSSTALK_RE 只加「不串台」三字整词而不加裸「不」前缀：整词永远是安全声明（口语否定短形），裸前缀会把「不排除串台」风险自认误消解。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- flow-review.js：renderReviewerTaskbook 加可选 head 参数（缺省任务书退自填引导形态，向后兼容）；validateReviewJson 加 reviewedAgainst 可选校验（缺省容忍，存在须 7-40 hex）；新导出 reviewAnchoredToHead(reviewPath, head)；NEGATED_CROSSTALK_RE 内部加「不串台」整词备选（模块私有常量，无签名变化）。
- flow.js：漂移隔离段加锚定保留分支（命中不隔离不重置标记，日志说明）；review 子步任务书调用传入 rev-parse HEAD（取不到传 null best-effort）。
- review.json 产物 schema 增量字段 reviewedAgainst（可选，schemaVersion 维持 1 纯可选增量——与 hub_session_id 同款先例）。
- 测试：flow-review.test.mjs ④/⑥/②/③ 四段扩充 + ⑦ 新增八态用例。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：锚定比对是调用时一次性无状态判定（读文件+字符串前缀比较），无事件序列假设；任务书 sha 印制发生在打印时点，评审员照抄的是当时 HEAD，落盘晚于打印不破坏语义（比对对象就是那个 HEAD）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

review.json 写读竞态：评审子代理落盘瞬间 flow done 恰在读——读失败按未锚定处理（fail-safe 走现行隔离），与既有「读失败容忍」口径一致，不新造崩溃面。锚定保留分支不改写 review.json（只读），无双写。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：锚定判定纯读无半态；保留分支不动 review 子步标记、隔离分支沿用既有 fail-safe（隔离失败整体退回幂等跳过）——中断重入两分支行为幂等（重跑再判一次）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

reviewedAgainst 比对的是本仓 HEAD（drift.head 由 detectPatchDrift 在本仓 rev-parse 取得），review.json 是本变更目录内产物——无跨仓面；多变更并行时各 change 目录隔离，锚定判定按 changeDir 路径定向，按 changeName 前缀过滤口径与既有隔离段同源不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：① reviewedAgainst 伪造（评审员乱填 sha 绕过隔离）——信任层级与 verdict 同级（评审产物本就信任子代理如实填写，schema 校验形态不校验真伪；且填错 sha 的后果是多留一份过期评审，后续 review 子步 validate/P1 判定仍在，防线不单点依赖锚定）。② HEAD 短 sha 前缀碰撞（7 位起）——理论存在但与 git 自身缩写语义一致，碰撞后果同①不致命。
试过放弃：把裸「不」加进 NEGATED_CROSSTALK_RE 前缀词表——「不[0-8字]串台」会把「不排除串台」「不可能没有串台」等风险自认/双重否定误消解（⑥ 用例即反向锁定），放弃，取三字整词精确匹配。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/flow-review.js | 任务书 head 参数 + reviewedAgainst schema/校验 + reviewAnchoredToHead 纯函数 + 「不串台」整词 |
| 修改 | src/flow.js | 漂移隔离段锚定保留分支接线 + 任务书调用传 HEAD |
| 修改 | test/flow-review.test.mjs | ④/⑥/②/③ 扩充 + ⑦ reviewAnchoredToHead 八态 |
