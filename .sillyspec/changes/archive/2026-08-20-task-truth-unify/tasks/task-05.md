---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-05
title: 五阶段提示词联动
title_zh: 五阶段提示词联动（brainstorm/plan/execute/verify/archive）
priority: P0
goal: 提示词与新契约字面一致：plan 写回 tasks.md（保留非 task-XX 行）+Wave 纯 ID 引用模板+勾选指向 tasks.md
implementation: plan.js full/light 模板改 ID 引用+新增写回动作+light 去 Tasks 段；brainstorm(-auto) 骨架注释改事实；execute 勾选/续跑/batch 协议指向；verify 对照来源说明；archive 勾选指向
acceptance: grep 五阶段提示词无残留「勾选 plan.md」语义；写回规则含保留非 task-XX 行明确指令
verify: node docs/prompt/_extract.mjs 镜像一致；相关阶段测试回归
constraints: none 级最小占位不动；术语统一「任务卡/任务清单」
depends_on: [task-02]
blocks: [task-06]
allowed_paths:
  - src/stages/plan.js
  - src/stages/brainstorm.js
  - src/stages/brainstorm-auto.js
  - src/stages/execute.js
  - src/stages/verify.js
  - src/stages/archive.js
expects_from:
  task-02:
    - contract: validatePlanForExecute
      needs: [errors, tasks, waves]
---

# task-05: 五阶段提示词联动

## 修改文件（必填）
- `src/stages/plan.js`：full/light 模板 Wave 段改纯 ID 引用行（`- task-XX`）；新增「展开写回 tasks.md」动作——写回规则=保留 frontmatter/中文标题/所有非 task-XX 行（ql-xxx 行等），仅重写 task-XX checkbox 行集合（D-002@v1）；light 级取消 `## Tasks` checkbox 段；「Wave 下的 checkbox 行必须保留」约束改为「Wave 段 ID 引用行必须保留（机器解析依赖）」
- `src/stages/brainstorm.js` :540 与 `src/stages/brainstorm-auto.js` :220：骨架模板注释改「plan 阶段展开写回 tasks.md」（承诺改事实）
- `src/stages/execute.js`：勾选指引改 tasks.md（:858 勾选对象、:877 batch 协议禁止勾选、:892-893 Wave 中断恢复判定、:922 review gate 勾选）；:137 补「任务注册表与勾选都在 tasks.md；plan.md 只提供 Wave/依赖结构」
- `src/stages/verify.js` :101：对照说明补勾选来源（agent 手动 + complete.js 机器勾选器）
- `src/stages/archive.js` :10-18/:130：checkbox 显示态/全勾校验指向改 tasks.md

## 实现要求
1. 提示词改动与 task-02 契约字面一致（行格式示例直接照抄新契约）
2. 术语统一：「任务卡（tasks/task-XX.md）」vs「任务清单（tasks.md）」
3. none 级最小占位 plan 不动

## 验收标准
- [ ] 五阶段提示词无残留「勾选 plan.md」语义（grep 复核）
- [ ] 写回规则在 plan 提示词中含保留非 task-XX 行的明确指令
