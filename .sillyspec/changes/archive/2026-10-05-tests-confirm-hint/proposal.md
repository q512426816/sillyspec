---
author: flow-machine-draft
created_at: 2026-10-05T13:49:30.016Z
---
# 提案书（Proposal）— 2026-10-05-tests-confirm-hint

## 动机

任务原话转写：tests confirm 语法错配（主清单项 2）：flow start 抽查提示（src/flow.js:200）教的是 sillyspec tests confirm --anchor <id> --evidence <路径>（子命令形态），实现只认 tests --confirm（flag 形态，index.js case 'tests' 的 has('--confirm')）——照提示语逐字抄会静默降级为行展示（confirm 不执行、FR 不翻 active），全部空转。本会话两次 flow start 输出均复现该提示。修法取提示语侧：改为与实现及 index.js 自身 fail 文案一致的 tests --confirm --anchor <id> --evidence <路径>。
成功标准：
- flow start 抽查提示教的命令形态与实现一致：sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>（flag 形态）
- 全仓不再有「tests confirm 」（子命令形态）的提示残留
- 单测锁定提示语形态（防回漂）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. flow start 抽查提示教的命令形态与实现一致：sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>（flag 形态）
2. 全仓不再有「tests confirm 」（子命令形态）的提示残留
3. 单测锁定提示语形态（防回漂）

## 成功标准（可验证）

1. flow start 抽查提示教的命令形态与实现一致：sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>（flag 形态）
2. 全仓不再有「tests confirm 」（子命令形态）的提示残留
3. 单测锁定提示语形态（防回漂）
