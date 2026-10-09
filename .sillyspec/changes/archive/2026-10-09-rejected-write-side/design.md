---
author: flow-machine-draft
created_at: 2026-10-09T15:09:26.255Z
---
# 设计记录（Design Record）— 2026-10-09-rejected-write-side

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

防复潮机制的读侧（decision-distill rejected 通道、brainstorm `{DECISION_HITS}` 确定性注入、archive needsWait 拦字段缺失）已建好，断在写侧不供料：两条道都没有指令叫 agent 把落选/放弃方案记成独立 rejected 条目，死路全部埋进所选/主条目的 answer 散文，进不了 rejected 通道。本变更只补写侧指令、不动任何读侧机制：厚道在决策产生源头（brainstorm「提出方案」步新增第 6 条 + 「写设计文档」对账步补漏网补记句），轻量道在收割面（flow.js 槽4 收割提示行补底稿定性 + /sillyspec:flow skill「直接干活」节新增底稿整理 bullet）。镜像经既有 _extract/_sync/_verify 流水线机械同步。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无函数签名、端点或文件格式变化。变化面全部为文本：src/stages/brainstorm.js 两段运行时 prompt（提出方案步操作清单新增第 6 条；对账规则「漏网补写」行尾追加放弃方案补记）；src/flow.js 槽4 收割 console.log 文案一句（补「底稿——作答里的放弃方案请拆成 rejected 条目再收口」）；.claude/skills/sillyspec-flow/SKILL.md 新增一条 bullet（skill 源模板，消费仓经 init 同步）。对外可见行为变化仅 flow done 收割提示语与 brainstorm/flow 运行时渲染的指引文本，无协议语义变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。全部改动是静态文本与机械镜像，无顺序依赖；_sync 以 src 为单一源整 fence 替换，乱序重跑结果幂等。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

文本文件级互斥由 git 工作区承担。他侧会话并行改 src/stages/*.js 或 docs/prompt/* 时，镜像以最新 src 重放（本次 _sync 顺带还清了 HEAD 上 brainstorm.md 滞后于已提交 _extracted.json 的存量镜债）；verify/archive 两 stage 的存量漂移（_verify 报 ❌）非本变更引入，属在途 2026-10-09-verify-papercuts 会话范围，未动他侧文件。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。无运行时状态，全部为文件落盘态；变更中断后续跑 flow status/flow done 断点续接，无半写窗口（原子写由 CLI 既有机制承担）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。改动只进本仓（src + docs/prompt + .claude/skills 源模板）；skill 经 npm 包内 .claude/skills → init.js 拷贝分发至消费仓，无跨仓写、无多实例串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：新增指令对 agent 是软约束（prompt 指令无硬校验），rejected 条目仍可能漏记——后盾 needsWait 只拦「已存在的 rejected 条目缺字段」，不拦「该记未记」；接受此风险，先供料后收紧，硬校验（如 flow done 前置 lint 检查收割稿是否含放弃方案未拆条）留待实证漏记率再定。放弃方案①：harvestSlot4Decision 机器自动拆 rejected 条目——收割器是纯机械转写器，无语义判不了「放弃方案」分界，且槽4 模板问题文本每变更一字不差、照抄进条目零检索价值。放弃方案②：distill 侧从 confirmed 散文解析死路自动拆条——把语义判断后移到无 LLM 的纯函数层，散文形态「放弃方案①②③」解析脆弱，误拆漏拆都无兜底。放弃方案③：只修厚道不动轻量道——两道死路埋法同构（轻量收割模板必然埋散文），只修一半防复潮覆盖减半且行为不一致。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 提出方案步操作清单新增第 6 条（落选各记 rejected）；对账步「漏网补写」行追加放弃方案补记 |
| 修改 | src/flow.js | 槽4 收割 console.log 补底稿定性提示 |
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | 「直接干活」节新增收割底稿整理 bullet（skill 源模板） |
| 生成 | docs/prompt/_extracted.json | _extract.mjs 机械重提（brainstorm 两处入 json） |
| 生成 | docs/prompt/brainstorm.md | _sync.mjs 机械同步（含还清 HEAD 已存在的存量镜债） |
| 新增 | .sillyspec/changes/2026-10-09-rejected-write-side/decisions.md | 本变更决策台账：自拆 rejected 条目（按本变更新约定执行，flow done 收割见其在场自动让位） |
