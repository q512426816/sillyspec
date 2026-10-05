---
author: flow-machine-draft
created_at: 2026-10-05T05:04:04.105Z
---
# 提案书（Proposal）— 2026-10-05-guidance-consistency

## 动机

任务原话转写：两处指引文本与实态脱节（实测撞见）：① AGENTS.md 选道表只写 --input "<描述＋成功标准>"，未说过门格式（成功标准：须独立成行、每行一条 "- <可验证标准>"）——首次调用必然 exit 2 撞门后才从报错学格式（2026-10-05 实测）；② src/run/command.js:1116 注释仍写 READONLY_AUXILIARY_STAGES（status/doctor），而 doctor 已于 2026-09-09-doctor-noai 移出该常量（现仅 status）——注释误导后来者以为 doctor 也走只读短路。修：AGENTS.md 轻量道两处 input 提法补格式要点一行；command.js 注释改 status（引用移出记录）。
成功标准：
- AGENTS.md 轻量变更行的 --input 提法包含「成功标准：独立成行＋每行一条 - 可验证标准」格式要点
- command.js READONLY 短路注释与 constants.js 实态一致（只列 status，注明 doctor 已移出）
- 纯文档/注释改动零行为面，全量测试绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. AGENTS.md 轻量变更行的 --input 提法包含「成功标准：独立成行＋每行一条 - 可验证标准」格式要点
2. command.js READONLY 短路注释与 constants.js 实态一致（只列 status，注明 doctor 已移出）
3. 纯文档/注释改动零行为面，全量测试绿

## 成功标准（可验证）

1. AGENTS.md 轻量变更行的 --input 提法包含「成功标准：独立成行＋每行一条 - 可验证标准」格式要点
2. command.js READONLY 短路注释与 constants.js 实态一致（只列 status，注明 doctor 已移出）
3. 纯文档/注释改动零行为面，全量测试绿
