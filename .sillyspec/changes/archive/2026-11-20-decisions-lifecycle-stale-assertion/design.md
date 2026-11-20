---
author: flow-machine-draft
created_at: 2026-11-20T00:13:11.803Z
---
# 设计记录（Design Record）— 2026-11-20-decisions-lifecycle-stale-assertion

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只改测试不动实现。诊断链：用例期望 written 含 `core.md@v1:supersede` + `util.md@v2:append`（2026-10-14 epoch 时代的迁移语义）；实际只有 `core.md@v2:supersede`。git log 二分定位引入提交 d15c2e23（2026-11-12-freeze-decision-recall task-04），其 design.md R-03 明确记载：`distillIntoKnowledge` 复用存量条目的号却重新判定域，把经 redomain 治理过的 D-unmapped-435/436 从 docs-consistency/docs 拉回 unmapped——修复为「存量条目所在域优先于 resolveDomains」，并声明「域迁移是 knowledge redomain-unmapped 的显式职责，不是蒸馏的副作用」。该提交改了 src/decision-distill.js 与 design.md，**漏更新本测试**（测试最后一次改动是 2026-10-21 的路由行断言），此后恒红。故判定：断言过时，实现为有意设计；若反过来改实现是复潮已被实证否决的行为。修复=把用例断言对齐新语义 + 补一条显式锁域稳定的断言（该语义自 2026-11-12 起零覆盖）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无。`distillIntoKnowledge` 签名/返回结构、`written` 记账形态、域文件布局全部不变；仅 test/decisions-lifecycle.test.mjs 断言文本与 .sillyspec/local.yaml（gitignore 本地配置）的 known_failures 行。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

测试为纯函数单测（tmp 目录 fixture），无事件流参与；域稳定判定按存量段所在域，与输入条目顺序无关。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

单测各自 mkdtemp 隔离，多 agent 并行跑测试互不影响。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

无状态变更；用例重写是单文件原子编辑。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

fixture 全 tmp 路径；语料（D-007/core/util/unmapped）与真实知识库无交集。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **风险**：改断言等于承认「蒸馏侧跨域迁移能力」被移除——若有下游依赖该能力（在 decisions.md 里改模块域即迁移文件），行为已变且无人告知。已核实迁域仍有显式通道：`sillyspec tests --redomain --decisions --from <源域> --to <目标域>`（src/index.js:3514-3530，支持任意域对，非仅 unmapped），能力未丢失只换了入口。
- **放弃方案**：改实现恢复「v2 显式版本升级时允许迁移」的例外——设计文档只给出 redomain 单一通道，且「显式 v2 + 新域」与「回填重跑带旧域字段」在实现层难以区分（回填正是读历史 decisions.md 的域字段），重新引入的歧义正是 2026-11-12 要消除的。
- 遗留：d15c2e23 当时未同步更新测试，说明「改设计语义时全量回归」未被执行——该纪律缺口已在 known_failures 临时豁免的 8 天里显现，本变更以显式断言补锁，但流程侧仍需 CI 全量门兜底（pre-push 已有）。
