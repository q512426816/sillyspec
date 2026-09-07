---
author: qinyi
created_at: 2026-09-08T06:55:00+08:00
---

# 任务注册表（Tasks）— 2026-09-08-auto-driver

> 唯一真相表：Wave 结构与依赖见 plan.md（Wave 段纯 ID 引用）；本表是任务清单与勾选状态。

- [x] task-01: SS-META 块——outputStep autoMeta 参数 + requiresUser 四源纯函数 + 正文模板同源 (depends_on: )
- [x] task-02: 三态 --change——单活跃回显 + 多活跃 auto 文案 + 零活跃建变更 (depends_on: )
- [x] task-03: --wait-interactive TTY 直通（readline + 既有 wait/continue 状态机复用） (depends_on: task-01)
- [x] task-04: CLI 收尾总结（:1726 挂点 + :1616 复用 helper + last-delta 消费） (depends_on: )
- [x] task-05: auto SKILL.md 瘦身重写（三段退役 + SS-META 消费 + 终止条件修正） (depends_on: task-01)
- [ ] task-06: 测试两件——auto-driver-meta（四源/单阶段零输出/三态/收尾）+ auto-wait-interactive（TTY stub/回退/缺省零变化）+ 既有套件回归 (depends_on: task-01, task-02, task-03, task-04)
- [x] task-07: 文档同步——file-lifecycle 注记 + docs/prompt/README SS-META 条目 + 全量回归 (depends_on: task-06)
