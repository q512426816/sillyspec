---
author: flow-machine-draft
created_at: 2026-10-12T14:28:08.645Z
---
# 设计记录（Design Record）— 2026-10-12-thick-taskbook-cli

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

补齐厚档阶段评审在 agent 通道的「可原样粘贴派发任务书」：新增 renderStageReviewerTaskbook（放在 stage-review.js——契约渲染器与校验器同模块，且 review-dispatch 静态 import 本模块、放 review-dispatch 会成环）；内容=角色+主文档+REVIEW_CHECKLISTS 检查单+探针（scope=thick）+预算帽 12+只读纪律+产物路径+完成动作，契约复用 renderReviewJsonContract 单源。接线两个**既有**出口：①printStageReviewResult 失败路径——仅「缺 review.json」形态打印（thin 任务书同款时机：评审需要而未产时）；②register-stage-review 骨架生成分支打印（派发前获取点，免先撞门）。选打印出口而非改步骤指引模板：模板是静态长文且被指纹测试钉死，打印出口是纯增面零回归；也不做新子命令——两个既有出口已覆盖「撞门后」与「派发前」两个获取时机。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新导出 src/stage-review.js：`renderStageReviewerTaskbook({ stage, changeDir, changeName, reviewRunId, reviewPath, probeLines = null }) → string`（纯函数）。
- printStageReviewResult：errors 分支新增条件性任务书打印（缺 review.json 且有 reviewRunId 时；探针装配 dirname(runtimeRoot) fail-soft）。
- register-stage-review 命令（src/index.js）：骨架生成分支（非 --from、非 --refresh-hash、非 --json）打印任务书。
- 零变化面：review-dispatch.js（平台通道 buildReviewerTaskBook 及调用点）、src/stages/ 模板、validateStageReviewSchema 判定、gate 放行/阻断语义、退出码。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/stage-review.js | renderStageReviewerTaskbook 新增 + 门失败路径条件打印 + dirname/清单/探针 import |
| M | src/index.js | register-stage-review 骨架分支任务书打印 |
| A | test/thick-taskbook-cli.test.mjs | 渲染/条件打印/CLI 双态/回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   任务书是渲染时点快照（探针/检查单/路径即时装配），评审员拿到的文本即派发时点状态；主文档后续改版由既有 docHash 失配→自动重算/人工复核链兜底（renderReviewJsonContract 已写明），无新增乱序面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   纯打印零写盘；probeLines 装配只读 local.yaml。打印与 register-stage-review 骨架生成同进程串行。无并发面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   打印是 best-effort 输出，中断无半态；失败面已有既有提示兜底（任务书打印 try/catch fail-soft，打印失败不影响 gate 原有错误输出与退出码）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   探针读主工作区 specBase 的 local.yaml（平台模式 runtimeRoot 在外时 dirname 推导 miss → 零注入 fail-soft，任务书主体不受影响）；检查单是仓内单源常量。无跨仓写入面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：任务书内嵌 renderReviewJsonContract 全文（含面向主代理的通道优先序段）——评审员视角读到达人指引略错位。接受：单源胜过第二套摘要（契约漂移的代价大于文案错位；通道段落对评审员无害——其通道已由派发方决定）。诚实边界：任务书仍由主代理复制转发，理论上可被篡改——与 thin 任务书同界（CLI 单源降低手写 leading 概率，不防恶意篡改；强凭据属平台层课题）。

试过但放弃：①改 stages/*.js 步骤指引模板内嵌任务书——模板被指纹测试钉死且三阶段重复维护，打印出口纯增面零回归；②新子命令 `review taskbook`——两个既有出口（撞门后/骨架生成时）已覆盖全部获取时机，新命令徒增维护面；③任务书内嵌前轮 findings 注入（thin 有）——厚档复审链由 register-stage-review --refresh-hash 与 docHash 机制承担，v1 不做（YAGNI，留待真实复审痛点出现）。
