---
plan_level: full
---

# 实现计划 — tasks.md 任务清单单一真相

## 来源
design.md（2026-08-20 独立审查两轮定稿）+ decisions.md（D-001@v1 方案A / D-002@v1 写回保留非 task-XX 行 / D-003@v1 depends_on 新家）

## Wave 1（审计，无依赖）
- [x] task-01: 契约点全量 grep 审计清单化——按独立审查基准复核 10+ 机器消费/写入点，产出实施核对清单

## Wave 2（核心契约重构，依赖 Wave 1）
- [x] task-02: validatePlanForExecute 双文件签名重构（tasks.md 注册表 × plan.md Wave ID 交叉校验）+ gates.js 调用方与三道门迁移 + complete.js 机器勾选器与批量完成检测迁移（覆盖：D-001@v1, D-003@v1）

## Wave 3（并行，依赖 Wave 2）
- [x] task-03: 其余九处机器消费点迁移——task-review / progress(doctor align) / doctor-diagnostics D5 / taskcard / contract-matrix depends_on / run-prompt / shared 坑7 / plan-postcheck / plan.js 解析函数（覆盖：D-003@v1）
- [x] task-04: 契约测试 task-truth-contract.test.mjs 九类用例（合法/悬空/覆盖缺失/断档/旧格式指路/勾选驱动续跑/机器勾选器/ql-xxx 保留/跨仓聚合回归）

## Wave 4（提示词联动，依赖 Wave 2）
- [x] task-05: 五阶段提示词联动——plan 写回与 ID 引用模板 / brainstorm(-auto) 骨架注释 / execute 勾选与续跑指向 / verify 对照说明 / archive 勾选指向（覆盖：D-001@v1, D-002@v1）

## Wave 5（收尾，依赖全部）
- [x] task-06: 文档三线同步（file-lifecycle / docs/prompt 五文件再生 / .claude/skills / 模块索引）+ 契约点清单逐项核对 + npm test / lint 全量回归

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 契约点审计清单 | W1 | P1 | — | FR-07 前置 | 实施验收基准 |
| task-02 | 核心契约重构 | W2 | P0 | task-01 | FR-03, D-001@v1, D-003@v1 | 校验器+gates+complete |
| task-03 | 九处消费点迁移 | W3 | P0 | task-02 | FR-07, D-003@v1 | 全部以 tasks.md 为唯一源 |
| task-04 | 契约测试 | W3 | P0 | task-02 | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07 | 九类用例锁双端 |
| task-05 | 五阶段提示词 | W4 | P0 | task-02 | FR-01, FR-02, FR-04, FR-05, D-002@v1 | 写回规则+ID 引用模板 |
| task-06 | 文档+全量回归 | W5 | P1 | task-03,04,05 | 全 FR | 清单核对即验收 |

## 关键路径
task-01 → task-02 → task-03 → task-06（最长路径；task-04/task-05 并行窗口在 task-02 后）

## 全局验收标准
- [ ] 新契约九类用例全绿（task-04）
- [ ] 独立审查点名的 10+ 消费点全部迁移且各自既有测试回归通过（task-01 清单逐项核对）
- [ ] npm test 全量 0 失败、npm run lint 通过
- [ ] quick 的 ql-xxx 挂载/勾选/自动归档行为零变化（回归用例）
- [ ] 五阶段提示词与 docs/prompt 镜像一致（_extract.mjs 再生 + file-lifecycle 更新）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-04, task-05 | 契约测试 + 提示词模板 |
| D-002@v1 | task-04, task-05 | ql-xxx 保留回归 + 写回规则文案 |
| D-003@v1 | task-02, task-03 | contract-matrix 方式2 迁移 + 测试 |
