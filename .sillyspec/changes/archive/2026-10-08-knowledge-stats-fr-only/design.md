---
author: flow-machine-draft
created_at: 2026-10-08T01:25:54.557Z
---
# 设计记录（Design Record）— 2026-10-08-knowledge-stats-fr-only

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `knowledge stats` 命令的输出组装层加一个 `--fr-only` flag：CLI 路由层解析 flag 后，人类模式只保留「FR 索引实验」段的 markdown 渲染，--json 模式只保留 data.frIndex 键。选在渲染层过滤而不是在计算层跳过——计算层保持全量（buildHitMatrix/buildFrIndexStats 共用函数签名零改动），过滤是纯输出面关注点。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `sillyspec knowledge stats [--fr-only] [--json]`：新可选 flag `--fr-only`
- 人类模式：`--fr-only` 在场时输出仅含 FR 索引实验段
- `--json` 模式：`--fr-only` 在场时 data 对象仅含 `frIndex` 键
- 不带 flag：行为零变化（字节一致）
- 内部函数签名（buildHitMatrix/buildFrIndexStats/outputJson）零改动

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——纯输出过滤，无输入流或事件序。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用——只读命令，不写任何文件或 DB。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用——单次 CLI 调用，无状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用——单仓单项目命令，不跨仓。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-stats.js | cmdKnowledgeStats 内加 --fr-only 分支（渲染层过滤，计算层零改动） |
| 新增 | NEW:test/knowledge-stats-fr-only.test.mjs | 三态 4 断言测试 |

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：输出层过滤遗漏某个段导致「跳过」不完全。对策：测试覆盖三态断言段级完整性与字节一致性。放弃的方案：在计算层直接跳过 matrix/conventions 计算——弃，因为计算层是共用函数（被其他消费方引用），跳过会改共用函数签名引入回归面。
