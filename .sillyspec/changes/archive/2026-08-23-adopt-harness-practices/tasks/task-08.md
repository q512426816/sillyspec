---
id: task-08
title: 'quick.js :103 警告文案修正 + step3 模板四子字段提示'
title_zh: 'quick.js :103 警告文案修正 + step3 模板四子字段提示'
author: 'qinyi'
created_at: 2026-08-23 13:48:23
priority: P1
depends_on: ['task-07']
blocks: []
requirement_ids: [FR-08]
decision_ids: [D-008@v1]
allowed_paths:
  - src/stages/quick.js
goal: >
  落地 D-008@v1 最小纳入（设计 W2 第 2 点、B-3 裁决）：修正 quick.js step3 模板
  103 行附近「避免嵌套全角冒号」警告文案，明确嵌套列表行子字段是合法形态，消除与
  task-07 四子字段形态的自相矛盾；step3 模板补一句可选四子字段提示；不改流程结构。
implementation:
  - 修正 103 行附近警告——原文「旧形式正文内避免嵌套全角冒号」会让 agent 误判根因块内嵌套列表行子字段非法；改为精确表述，仅紧跟顶层标签参与拆分判定的嵌套冒号才有缺字段风险
  - 文案明确写入嵌套列表行子字段（现象/根因/护栏/证据）是合法形态、顶层标签边界不受影响
  - step3 模板（暂存和更新记录步骤）补一句可选提示——根因字段为 postmortem 场景时可按列表行形态补四子字段，可选非必填
  - 不改 step 数量与名称、不改 --done 硬校验逻辑、不动四参数推荐形式的主导地位
acceptance:
  - 警告文案不再与四子字段嵌套形态矛盾，且明确列表行嵌套合法
  - step3 模板含四子字段可选提示并标注可选不强制
  - quick.js 流程结构（step 数量、名称、校验逻辑）零变化
verify:
  - node --check src/stages/quick.js
  - 新文案与四子字段形态一致性锁定交 task-10
constraints:
  - 最小纳入不改流程结构（D-008@v1）——仅文案级修改
  - 提示为可选引导，不新增必填项与硬校验
  - docs/prompt/quick.md 镜像同步不在本 task（task-14 统一处理）
---
