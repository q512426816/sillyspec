---
id: task-10
title: 'test/quicklog-postmortem-fields.test.mjs'
title_zh: 'test/quicklog-postmortem-fields.test.mjs'
author: 'qinyi'
created_at: 2026-08-23 13:48:23
priority: P1
depends_on: ['task-07', 'task-08', 'task-09']
blocks: []
requirement_ids: [FR-07, FR-08, FR-09]
decision_ids: []
allowed_paths:
  - test/quicklog-postmortem-fields.test.mjs
goal: >
  新建 Wave 2 回归测试，锁定 task-07/08/09 三项产出——四子字段解析（含单行压缩
  兼容与旧条目回退）、quick.js 新文案与嵌套形态一致性、verify/doctor 提示段存在性，
  防 R-03（quicklog 四子字段与严格标签边界冲突）回归。
implementation:
  - quicklog 解析用例——根因块含列表行四子字段的条目解析后子字段行完整保留；--output 压成单行且含嵌套子字段时归一后不错切；旧条目纯文本根因解析不变
  - 文案一致性用例——quick.js step3 模板含列表行嵌套合法表述、不再含与嵌套形态矛盾的旧警告表述（103 行附近段落）
  - 提示段存在性用例——verify.js 与 doctor.js 对应 step prompt 含四子字段提示与证据引用指引关键词
  - 按 test/ 目录既有 node --test 风格编写（.test.mjs 先例），不依赖网络与平台推送
acceptance:
  - node --test test/quicklog-postmortem-fields.test.mjs 全绿
  - 覆盖四子字段解析、单行压缩兼容、旧条目回退、文案一致、提示段存在五类用例
  - npm test 全量纳入新测试且现有 220 项基线不回归
verify:
  - node --test test/quicklog-postmortem-fields.test.mjs
constraints:
  - 只新建测试文件不改 src 产物——发现产物缺陷回流对应 task 修复后重跑
  - 测试不依赖网络与平台推送（quicklog push 为 best-effort 静默跳过路径）
---
