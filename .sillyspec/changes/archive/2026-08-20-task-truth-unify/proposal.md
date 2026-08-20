---
author: qinyi
created_at: 2026-08-20T11:25:00+08:00
---
# 提案书（Proposal）

## 动机
任务清单存在三份表示（tasks.md 骨架、plan.md Wave checkbox、plan.md 任务总表），真相分裂已产生实际漂移与误报。统一为 tasks.md 单一任务真相，plan.md 退为策略文档，结构性杜绝双写漂移。

## 关键问题
1. **漂移已发生**：变更 `2026-07-10-quick-session-isolation` 中 tasks.md 与 plan.md 的 task-04/05 编号对调、内容各说各话，人工追溯对不上号。
2. **僵尸骨架**：brainstorm 承诺「plan 阶段展开」tasks.md（brainstorm.js:540），但 plan 阶段只读不写，骨架永远停留在初始时刻、永远未勾。
3. **消费方指向分裂**：execute 提示词「读取 tasks.md（执行计划）」但机器解析读 plan.md（execute.js:137 vs :399/:456/:617-627/:975）；verify「对照 tasks.md 检查完成」对着僵尸骨架必然误报（verify.js:101）。

## 变更范围
- tasks.md 升级为唯一 checkbox 注册表；plan 阶段展开写回（保留非 task-XX 行）。
- plan.md Wave 段改纯 ID 引用；light 级取消 Tasks 段。
- validatePlanForExecute 重构为双文件交叉校验；execute 勾选（agent 手动 + complete.js 机器勾选器）指向 tasks.md。
- 五阶段提示词联动（brainstorm/brainstorm-auto/plan/execute/verify/archive）+ 10+ 机器消费点迁移 + 文档三线同步。

## 不在范围内（显式清单）
- 不做旧格式兼容层与存量迁移工具（经独立审查核实三个旧格式变更均已归档，当前无活跃旧格式，无迁移负担）
- 不做 tasks.md↔plan.md 双向同步
- 不改 quick 的 ql-xxx 追加/勾选机制与自动归档判定
- 不改 plan_level 分级机制与 none 级最小占位 plan
- 不改任务卡（tasks/task-XX.md）机制

## 成功标准（可验证）
- 新契约下：plan.md 引用悬空 / Wave 覆盖缺失 / 编号断档均被门禁拦截且文案指路
- execute 勾选双路（agent 手动 + complete.js 机器勾选器）落 tasks.md；Wave 中断恢复按 tasks.md 勾选态判定
- verify 对照 tasks.md 结果与实际完成一致（不再误报）
- quick 挂载的 ql-xxx 行在 plan 写回后原样保留（回归测试）
- 独立审查点名的 10+ 机器消费点全部迁移且各自既有测试回归通过（契约点清单逐项核对即验收）
