---
author: flow-machine-draft
created_at: 2026-11-21T15:30:29.822Z
---
# 提案书（Proposal）— 2026-11-21-prompt-microdesign-pack

## 动机

任务原话转写：阶段提示词吸收微设计技巧包
mattpocock/skills 调研（docs/ROADMAP.md「mattpocock/skills 吸收路线」批 1）提示词微设计视角结论：五条一行级技巧可直接吸收进阶段提示词，提升测试落点质量、审查判别力与提问效率；另建 out-of-scope 被拒概念沉淀位。改动均为提示词内容级，不改步骤结构与文件生命周期。
成功标准：
- brainstorm.js 的 design.md 模板新增「测试 seam 约定」节：列出本变更测试落点，每个 seam 附一行「能查出什么/查不出什么」
- brainstorm.js 提问纪律补「问题措辞让『是』即接受推荐答案」
- execute.js 代码审查步骤补三层优先级：CONVENTIONS 覆盖 smell 基线、基线仅 judgement call、工具已拦不人工报
- execute.js 测试纪律补 [DEBUG-<id>] 前缀约定与「变异造红后 diff 干净副本自证」
- verify.js 的 verify-result 风险节补「单向门/双向门+一词爆炸半径」字段
- 新建 docs/sillyspec/out-of-scope/（README 说明用途+首个被拒概念文件）
- 改动后运行 node docs/prompt/_extract.mjs 同步 docs/prompt/ 镜像
- 相关既有测试零回归

## 变更范围

按成功标准机械推导，共 8 条验收面：
1. brainstorm.js 的 design.md 模板新增「测试 seam 约定」节：列出本变更测试落点，每个 seam 附一行「能查出什么/查不出什么」
2. brainstorm.js 提问纪律补「问题措辞让『是』即接受推荐答案」
3. execute.js 代码审查步骤补三层优先级：CONVENTIONS 覆盖 smell 基线、基线仅 judgement call、工具已拦不人工报
4. execute.js 测试纪律补 [DEBUG-<id>] 前缀约定与「变异造红后 diff 干净副本自证」
5. verify.js 的 verify-result 风险节补「单向门/双向门+一词爆炸半径」字段
6. 新建 docs/sillyspec/out-of-scope/（README 说明用途+首个被拒概念文件）
7. 改动后运行 node docs/prompt/_extract.mjs 同步 docs/prompt/ 镜像
8. 相关既有测试零回归

## 成功标准（可验证）

1. brainstorm.js 的 design.md 模板新增「测试 seam 约定」节：列出本变更测试落点，每个 seam 附一行「能查出什么/查不出什么」
2. brainstorm.js 提问纪律补「问题措辞让『是』即接受推荐答案」
3. execute.js 代码审查步骤补三层优先级：CONVENTIONS 覆盖 smell 基线、基线仅 judgement call、工具已拦不人工报
4. execute.js 测试纪律补 [DEBUG-<id>] 前缀约定与「变异造红后 diff 干净副本自证」
5. verify.js 的 verify-result 风险节补「单向门/双向门+一词爆炸半径」字段
6. 新建 docs/sillyspec/out-of-scope/（README 说明用途+首个被拒概念文件）
7. 改动后运行 node docs/prompt/_extract.mjs 同步 docs/prompt/ 镜像
8. 相关既有测试零回归
