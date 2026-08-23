---
id: task-05
title: 'docs-debt 导出 computeModuleBehind + docs-check 决策规则族（advisory）+ doctor 决策待复核检查项'
title_zh: 'docs-debt 导出 computeModuleBehind + docs-check 决策规则族（advisory）+ doctor 决策待复核检查项'
author: 'qinyi'
created_at: 2026-08-23 13:45:58
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-003@v1]
allowed_paths:
  - src/docs-debt.js
  - src/docs-check.js
  - src/stages/doctor.js
expects_from:
  task-02:
    - contract: decisions_entry
      needs: [anchor, last_confirmed]
goal: >
  让决策条目可机械校验——docs-debt 导出 computeModuleBehind 复用既有 behind
  git 口径，docs-check 新增决策规则族（锚点存在性 + behind 阈值，advisory 起步），
  doctor 展示「决策待复核」清单。
implementation:
  - src/docs-debt.js 从 moduleDebt 抽公共实现导出 computeModuleBehind(moduleId, lastConfirmedCommit)，返回 behind 计数与降级标记——口径同现有（双 commit 时间戳判向 + rev-list 计数，git 失败 null 不抛），moduleDebt 改为复用，computeDocsDebt/matchFilesToModules 行为不变
  - src/docs-check.js 新增决策规则族（advisory）——解析 knowledge/decisions/*.md 的 D-xxx@vN 条目做两项校验——implemented 锚点路径存在性；锚定模块源码在「最近确认」后 behind 超阈值报待复核（调 computeModuleBehind，默认阈值 10，local.yaml decisions 段可调，未配置用缺省容忍）
  - 豁免走 known_failures 新键 decisions.* 命名空间（条目级语义，不复用 docs-gate 的 baseline ratchet）
  - src/stages/doctor.js 新增「决策待复核」检查项——读 docs-check 决策规则结果 advisory 输出（计 ⚠️ 不计 ❌）；knowledge/decisions/ 不存在时空库提示（R-02 冷启动可见）
acceptance:
  - computeModuleBehind 成为 src/docs-debt.js 公开导出，computeDocsDebt 对既有调用方输出不变（npm test 基线不回归）
  - 决策规则只产生 advisory 警告——runDocsCheck 的 ok/invalid 判定与 docs gate 阻断行为不受影响；known_failures decisions.* 键可豁免单条
  - doctor 检查项输出待复核清单（id、behind 计数、阈值）与空库提示，不修改 knowledge/decisions/ 文件
verify:
  - node --check src/docs-debt.js 与 node --check src/docs-check.js 与 node --check src/stages/doctor.js
  - npm test（docs-debt/docs-check 既有测试不回归）；behind 阈值行为由 task-06 测试锁定
constraints:
  - advisory 不阻断——决策规则只 warn 不进 invalid 阻断链（D-003，dogfood 稳定一周期后另立小变更升 error）
  - docs-debt 只抽公共实现导出 helper——不改 moduleDebt 对外行为与既有返回结构（C-10）
  - doctor 检查项为展示态——复核再确认由用户交互完成，不自动改写「最近确认」
---
