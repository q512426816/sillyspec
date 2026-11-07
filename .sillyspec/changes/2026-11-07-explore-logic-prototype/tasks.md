---
author: flow-machine-draft
created_at: 2026-11-07T12:59:56.828Z
---
# 任务注册表（Tasks）— 2026-11-07-explore-logic-prototype

- [x] task-01: 改 src/stages/explore.js「HTML 原型生成」节 prompt 三处（首句扩触发面 + 逻辑形 bullet 三要素/失真声明/不进变更目录 + 对比判据 bullet），验证＝node -e 读 definition.steps[0].prompt 断言关键词在场（状态机、纯逻辑模块、结构性分歧）
- [ ] task-02: 跑 node docs/prompt/_extract.mjs 再生 _extracted.json，同步 docs/prompt/explore.md prompt 正文与源码逐字一致，验证＝比对 md 与 _extracted.json 对应段
- [ ] task-03: 同步 .claude/skills/sillyspec-explore/SKILL.md（「生成 HTML 原型」段两形态与触发面 + description 补状态机/流程推演触发词），验证＝目视比对与 prompt 一致
- [ ] task-04: 跑 explore 相关三个测试面（change-exists-validation / cli-top-level-aliases / default-no-dir-and-affinity）全绿 + git diff --name-only 确认 brainstorm.js 零改动、改动面仅清单四文件
