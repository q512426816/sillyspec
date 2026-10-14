---
author: flow-machine-draft
created_at: 2026-10-14T02:07:28.825Z
---
# 设计记录（Design Record）— 2026-10-14-scale-large-evidence

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

镜像误判根治（2026-10-14-prestage-consent-gate 的对侧面）：deploy-release-notes 实证里，头脑风暴定稿方案已缩水为零建表零迁移，Step 8 却沿用早期「跨三端含建表」印象判 scale=large 走了完整五阶段——而 plan 阶段自判 execution_mode=main 反证 Wave 并非真需求。本变更在 brainstorm Step 8「规模评估」的 large 判据下加三条反判据（跨多端/多仓/多文件不是依据——thin 支持多文件与跨仓交付；任务间顺序依赖不是 Wave 证据——正是 thin 任务循环天然形态；Wave 证据=可真并行任务簇+单上下文吃不下两条同时成立），并要求判 large 时把 Wave 证据落进 design.md（写不出即改判 small）、方案缩水后按定稿实质重判（不沿用 Step 2 早期筛查印象）。Step 2 收尾注与 design-init 骨架的 scale TODO 提示行同步同口径。纯指引面变更（prompt 措辞），无逻辑改动——出口分叉（complete.js 读 scale）本身工作正常，修的是喂给它的判断质量。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。`src/stages/brainstorm.js` Step 8「生成规范文件」prompt 的规模评估节新增反判据/Wave 证据落盘/定稿重判三块指引，Step 2「加载项目上下文」收尾注补一句重判指路；`src/design-facts.js` generateDesignSkeleton 的 `scale: ""` TODO 注释行扩展反判据口径（仅注释文本，`scale: ""` 留空语义不变——readDesignScale 三态不受影响）；`docs/prompt/brainstorm.md` 与 `_extracted.json` 按 _extract→_sync→_verify 流水线再生成。措辞锁测试挂在既有 brainstorm-exit-thin-default.test.mjs 家族（新增 ④ 用例 + ① 扩一行）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
不适用：纯静态 prompt 文本，无输入流/事件序。指引在 Step 8 渲染时点随步骤 prompt 一次性呈现，无时序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
不适用：改的是源码内的 prompt 常量与骨架生成函数的注释行，静态文件由 git 并发模型管理；运行期无共享可变状态新增。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
不适用：无运行期状态。design-init 骨架生成是幂等的（已存在不覆盖——既有契约不变），scale 留空语义与 readDesignScale 三态均未动。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
不适用：指引随 sillyspec 版本分发到各仓（发布后 init 重跑传播——同版本不更新既有契约），无 per-repo 状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：指引是软约束——agent 仍可能「自信地判错」（写出形式化的 Wave 证据话术而非真实并行分析），反判据只提高误判成本不根除。这是指引面的天然边界；硬面方案（如 CLI 校验 large 必须附 Wave 证据节、否则拒绝 --done）会引入新的 schema 门与存量不兼容，且「真并行/吃不下」本质是语义判断，机器校验只能查形不能查质——留作后续实证后再议。放弃的方案：① 把 large 判定从 agent 手里收走改纯机械规则（文件数/任务数轴）——2026-09-29-brainstorm-exit-thin-default 已实证文件数轴测错轴，复杂度/上下文轴必须留判断力；② 出口分叉处（complete.js）对 large 追问二次确认——收口时点已过设计期，追问只是把同一判断再问一遍，不增信息量。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | Step 8 规模评估 large 判据加三条反判据+Wave 证据落盘要求+定稿重判；Step 2 收尾注补重判指路 |
| 修改 | src/design-facts.js | scale TODO 注释行扩展反判据口径（scale: "" 留空语义不变） |
| 修改 | test/brainstorm-exit-thin-default.test.mjs | 新增 ④ 反判据措辞锁用例；① 扩 TODO 口径断言 |
| 修改 | docs/prompt/brainstorm.md | _sync 再生成（Step 8 fence 同步源措辞） |
| 修改 | docs/prompt/_extracted.json | _extract 再生成 |
