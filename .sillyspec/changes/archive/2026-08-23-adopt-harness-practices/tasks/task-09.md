---
id: task-09
title: 'verify/doctor 触发提示段 + 证据引用指引 + 护栏回流链路确认'
title_zh: 'verify/doctor 触发提示段 + 证据引用指引 + 护栏回流链路确认'
author: 'qinyi'
created_at: 2026-08-23 13:48:23
priority: P1
depends_on: ['task-05', 'task-08']
blocks: []
requirement_ids: [FR-09]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/verify.js
  - src/stages/doctor.js
goal: >
  打通 postmortem 触发点（设计 W2 第 3/4/5 点）：verify 检出实现偏差、doctor 检出
  状态错乱时，对应 step prompt 追加「按四子字段补 postmortem 进 quicklog」提示段
  （advisory 不强制），附证据引用指引，并确认护栏结论回流走既有 knowledge 链路。
implementation:
  - verify.js「对照设计检查」步骤 prompt 追加触发提示段——探针或 postcheck 检出实现偏差时，建议按四子字段（现象/根因/护栏/证据）补 postmortem 到 quicklog
  - doctor.js「汇总报告」步骤 prompt 修复建议段追加同类提示——检出状态错乱或不一致时建议补写 postmortem；决策待复核检查项已由 task-05 落地，本 task 只加提示不改检查项结构
  - 证据引用指引随提示段给出——证据子字段引用 sillyspec agent-log --json 输出的本地 jsonl 路径，或 review.json 与 verify-result.md 路径
  - 护栏回流确认——提示段注明护栏结论经人工确认后归入 .sillyspec/knowledge/known-issues.md，走既有 knowledge 追加链路（同 quick.js step3 的 knowledge 写入先例），不新建链路不加命令
acceptance:
  - verify 偏差场景与 doctor 异常场景的 step prompt 均含四子字段补写提示且标注 advisory
  - 提示段含 agent-log jsonl、review.json、verify-result.md 三类证据路径指引
  - 护栏回流指向既有 known-issues.md 链路，无新命令无新文件
verify:
  - node --check src/stages/verify.js
  - node --check src/stages/doctor.js
  - 提示段存在性断言交 task-10 测试锁定
constraints:
  - 提示为 advisory 不强制——不改任何 --done 校验、不新增阻断
  - 只加提示段，不改 doctor 检查项结构（决策待复核检查项属 task-05）
  - 不新建回流链路（走既有 knowledge 追加机制）；docs/prompt 镜像同步交 task-14
---
