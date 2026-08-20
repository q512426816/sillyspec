---
author: qinyi
created_at: 2026-08-20T11:25:00+08:00
---
# 决策记录（Decisions）

## D-001@v1: 任务真相存放在 tasks.md（方案A）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 三份任务表示（tasks.md 骨架 / plan.md Wave checkbox / plan.md 任务总表）真相分裂，统一到哪份？
- answer: 用户在三方案对比中选定方案A——tasks.md 唯一真相 + plan.md 纯 ID 引用 + 解析器交叉校验（否决 B「plan.md 真相停骨架」与 C「Wave 结构进 tasks.md」）
- normalized_requirement: task 注册表、勾选、完成检查的唯一来源是 tasks.md；plan.md 不出现任务名级 checkbox 行
- impacts: [FR-01, FR-02, FR-03, FR-04, FR-05]

## D-002@v1: plan 写回 tasks.md 仅重写 task-XX 行集合
- type: consistency
- priority: P1
- status: accepted
- source: code
- question: plan 阶段展开写回 tasks.md 时，quick 挂载的 ql-xxx 勾选行如何保全？
- answer: 写回规则=保留 frontmatter/中文标题/所有非 task-XX 行（ql-xxx 行、自审注记），仅重写 task-XX checkbox 行集合（Design Grill G1 修正）
- normalized_requirement: 写回后非 task-XX 行集合与写回前逐行一致
- impacts: [FR-01, FR-06]

## D-003@v1: depends_on 依赖标注随任务名迁至 tasks.md 行内
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: plan.md Wave checkbox 行消失后，contract-matrix.js 方式2 的行内 depends_on 标注（`- [ ] task-04: …(depends_on: …)`）解析来源失效，依赖标注放哪？
- answer: 新家=tasks.md 任务行内 `(depends_on: task-01,02)`（与 [model:xxx] 同风格）；方式1（plan.md 任务总表依赖列）保留为兜底（独立审查 gaps 8 补录）
- normalized_requirement: 依赖标注的唯一机器解析来源是 tasks.md 行内 depends_on；任务总表依赖列仅为人类视图兜底
- impacts: [FR-07]
