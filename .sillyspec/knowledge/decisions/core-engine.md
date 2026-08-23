---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — core-engine

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-903@v1 SQLite 引擎访问收敛 db-engine.js 单点
状态：implemented
锚点：src/db-engine.js:12
最近确认：71a7fe6
理由：所有 SQLite 访问必须经 src/db-engine.js 单一换引擎点——sql.js（WASM）时代无 FTS5/native 扩展且纯内存需整库 export 落盘，2026-08-11 换 node:sqlite DatabaseSync；引擎能力取舍（pragma/transaction/pluck 缺口消解）都在此层判断，勿绕过 db.js/db-engine.js 直用驱动。

## D-005@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
锚点：未记录
最近确认：2c35ab2
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
supersedes：D-005@v1

## D-006@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤
状态：implemented
锚点：未记录
最近确认：2c35ab2
理由：扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
