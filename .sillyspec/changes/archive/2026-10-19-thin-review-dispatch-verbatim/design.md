---
author: flow-machine-draft
created_at: 2026-10-19T15:20:22.534Z
---
# 设计记录（Design Record）— 2026-10-19-thin-review-dispatch-verbatim

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台仓实测（sess_716d924d）暴露两个断点：① CLI 任务书含预消化材料包，但主会话派发子代理时手写缩编 prompt——4 次派发全部丢包（rollout 日志验证：派发 prompt 1943/2506/1875 字符均无 pack 标记，而 CLI 任务书 7240 字符含全量 pack）；② 冻结面混入并行会话文件时评审员要自己做 git 考古甄别（实测 22 次 git 调用）。修法两刀：第一刀把厚道流程已有的派发纪律（stage-review.js:803「原样复制给子代理——检查单生产权在 CLI，勿自行改写增删」）对齐到薄道双通道（flow.js 横幅句 + renderReviewerTaskbook 头部行）——治手写改写；第二刀给 assembleReviewPack 增「冻结面归属切分」子段——声明内/声明外/他侧归因三分类机械核算（声明清单走 parseFileChangeListDetailed 既有单源、他侧归因走 splitOwnVsForeignDiffFiles 既有单源、冻结面走 change.patch 解析既有路径），声明外带「抽查即可勿逐文件考古」标注——治考古税。

归属核算纪律：只读既有单源函数（patch 子步同款），不新造归属语义；git 调用限定在 flow-state 锚定的 baseline..HEAD 窗口（冻结锚窗口非活 HEAD 状态）；fail-soft——任一源失败该子段零注入，FR 表/文件摘要不受影响；行计入 12000 帽（行级截断语义不变）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- assembleReviewPack 签名扩展：增可选参数 attribution（{ declaredIn: string[], declaredOut: string[], foreign: Array<{file, owners}> } | null）——缺省/ null 零注入该子段，既有调用方零感知；lines 结构不变（string[]）。
- renderReviewerTaskbook：头部（═══ 分隔线后、【角色】前）增一行派发纪律「（派发纪律：本任务书原样复制给干净上下文子代理——检查单/材料包生产权在 CLI，勿自行改写、增删或缩编）」——无条件在场（非可选注入）。
- flow.js review 子步横幅句：改「起一个干净上下文的子代理执行后重跑本命令」为含「任务书原样复制给子代理（勿自行改写增删）」的表述。
- CLI 命令/子命令签名：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
不适用——归属切分的输入是渲染时点的冻结件与 git 历史快照（baseline..HEAD 为 flow-state 锚定窗口）；git 历史在窗口内被 rebase 改写时 splitOwnVsForeignDiffFiles 返回既有降级形态（null/空分），fail-soft 零注入该子段。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
不适用——材料包与任务书均为只读渲染产物，不写任何共享状态；归属核算只读 git 与工件。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
不适用——纯函数渲染 + fail-soft，断点续跑重渲染同输入同输出（幂等）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
不适用——归属核算范围=本变更冻结面文件（cwd 为项目根的 baseline..HEAD 窗口）；跨仓 JSON-only 冻结面（主仓无 change.patch）文件摘要本就零产出，归属切分随文件摘要同判（无冻结面文件则该子段零产出）。

## 文件变更清单（自声明对账面）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/flow-review-pack.js | assembleReviewPack 增 attribution 可选参数与归属切分子段渲染（计入 12000 帽） |
| 修改 | src/flow-review.js | renderReviewerTaskbook 头部增派发纪律行（无条件在场） |
| 修改 | src/flow.js | review 子步横幅句改原样复制表述；装配归属切分（parseFileChangeListDetailed + splitOwnVsForeignDiffFiles，fail-soft）传入 |
| 修改 | test/flow-review-pack.test.mjs | 增派发纪律/归属切分注入/fail-soft 零注入/他侧归因四组用例 |

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：纪律行是文案不是强制——主会话仍可能改写（厚道同款指令也只能约束守规矩的模型）；对策是双通道（横幅+任务书）重复声明 + 材料包自含（即使改写，评审员仍有 FR 表/摘要/归属切分锚可对）。已知局限：归属切分的「声明外」类是候选提示非定论（评审员仍需抽查），只省「逐文件全量考古」不省「抽查」。已放弃方案：把任务书落盘文件让主会话传路径给子代理（改派发协议形态，动的是宿主行为面，CLI 管不到）；归属结果持久化进 change-patch.json 再读（引入新持久化字段与读写时序耦合，现算更简单且同源）。
