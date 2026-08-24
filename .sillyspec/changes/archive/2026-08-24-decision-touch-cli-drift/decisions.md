---
author: qinyi
created_at: 2026-08-24T02:20:00+08:00
---

# 决策记录（Decisions）— 2026-08-24-decision-touch-cli-drift

## D-001@v1 方案A：复用现有管道（用户批准）

- type: architecture
- status: confirmed
- source: 用户 2026-08-24"按你的计划来搞吧"（对二期学习批次①分析的批准）
- question: 锚点触碰提示与 CLI 漂移检测的实现载体？
- answer: 锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
- normalized_requirement: 全部 advisory；复用既有注入与检查形态；零阻断
- impacts: src/docs-debt.js, src/run/prompt.js, src/stages/doctor.js
- evidence: 最小改动面；备选（新占位符/新步骤/quick 拆分）无增益且有步骤数连带债
- priority: P0
- 锚点: src/docs-debt.js:1
- 模块域: docs-consistency, runtime, stages

## D-002@v1 doctor 漂移检测优先并入既有 step

- type: architecture
- status: confirmed
- source: design 自审（R-01 规避）
- question: CLI 版本漂移检测做独立 doctor step 还是并入既有段？
- answer: 优先并入既有检查段（决策待复核检查同段或汇总报告前），避免 doctor 步骤数再动（上一变更六步化已连带改 6 个测试）
- normalized_requirement: doctor 步骤数不变；探测失败静默降级
- impacts: src/stages/doctor.js, R-01
- evidence: 步骤数变化的连带测试债上一变更实证过（archive 六步化连带 stage-definitions 等 6 文件，doctor 侧现无步骤数断言但方向保守）；advisory 检查项无独立步骤价值
- priority: P1
- 锚点: src/stages/doctor.js:1
- 模块域: stages

## D-003@v1 决策触碰注入必须覆盖 Wave 步 prompt

- type: architecture
- status: confirmed
- supersedes: 无（修订 design 初稿注入时机）
- source: design-grill（brainstorm-review-manual）高优发现
- question: {DOCS_DEBT} 仅 execute 前缀第 4 步渲染且单过流程该时刻 changedFiles 恒空——注入放哪才闭合"事中提示"动机？
- answer: 双渲染点：既有第 4 步注入（重入/reset 场景）+ Wave 步 prompt 追加渲染（buildWavePrompt 复用同一 facts 计算，changedFiles=porcelain ∪ baseline..HEAD），无新占位符
- normalized_requirement: Wave 步注入为本特性主渲染点；无触碰零输出
- impacts: src/run/prompt.js, src/stages/execute.js, G1
- evidence: Grill 实证 prompt.js:502-550 注入实现 + execute.js:306-329 唯一占位符位置 + baseline 启动快照语义 worktree.js:584-586
- priority: P0
- 锚点: src/run/prompt.js:502
- 模块域: runtime, stages

## D-004@v1 CLI 漂移检测双轨：git 比较 + version 兜底

- type: architecture
- status: confirmed
- source: design-grill（中高优发现：npm i -g . 补救后 git 轨永久失明）
- question: 安装根无 .git（registry/npm i -g . 拷贝）时如何检测漂移？
- answer: git 轨（有 .git 时 commit+归一化 remote 同源比较）+ version 兜底轨（package.json version 双仓比较）；同 version 不同 commit 的热改残余盲区显式声明
- normalized_requirement: 安装根独立解析（不复用决策待复核检查的 SRC_ROOT）；remote 归一化规则可测试
- impacts: src/stages/doctor.js, W-B
- evidence: npm 打包恒排除 .git；version 随打包更新
- priority: P1
- 锚点: src/stages/doctor.js:331
- 模块域: stages
