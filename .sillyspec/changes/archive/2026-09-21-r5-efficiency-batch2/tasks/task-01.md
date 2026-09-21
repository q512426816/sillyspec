---
id: task-01
title: 'M1 指令指纹增量——静态段指纹+落盘+复入短输出（含 test/step-guide-fingerprint.test.mjs）'
title_zh: 'M1 指令指纹增量（静态段 sha256+落盘 step-guides+复入短输出）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 17:25:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/run/prompt.js
  - test/step-guide-fingerprint.test.mjs
target_files:
  - src/run/prompt.js
  - NEW:test/step-guide-fingerprint.test.mjs
goal: >
  压指令注入基数：同步骤复入只印指纹+落盘路径，动态段永不缓存（P8：252KB/73 次全量重印实证）
implementation:
  - outputStep 渲染分静态段/动态段：静态段渲染后 sha256 指纹；首见（指纹新或落盘缺失）全量渲染并写 .sillyspec/.runtime/step-guides/<stage>-<stepIdx>-<fp8>.md
  - 复入（指纹一致）：输出 ≤10 行——步骤名 / fingerprint=8位 / 落盘绝对路径 / 指引未变提示
  - 动态注入段（REVIEW_MATERIALS/DOCS_DEBT/知识命中/进度快照）独立渲染常驻永不缓存
  - withJsonOutput 路径（--json，src/index.js:185）不受影响走全量
acceptance:
  - 同指纹复入静态部分输出 ≤10 行
  - 指纹变更全量重印
  - 动态段两次渲染均在
  - --json 全量输出不变
verify:
  - node --test test/step-guide-fingerprint.test.mjs
  - npm test
constraints:
  - 不改任何步骤语义与门禁判定
  - 指纹=本次实际渲染静态段（非模板原文）
---
