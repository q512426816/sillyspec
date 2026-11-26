---
author: flow-machine-draft
created_at: 2026-11-14T16:34:36.996Z
---
# 提案书（Proposal）— 2026-11-15-change-key-visibility

## 动机

任务原话转写：变更创建时向用户展示完整 key 与名称

动机与背景：用户反馈——头脑风暴和轻量变更触发创建变更后，agent 不向用户展示变更完整 key 与名称，用户都不知道创建的是啥变更名。CLI 输出里 key/标题虽有但分散且无「必须转述」指令，agent 拿到横幅直接干活。要求在两个入口的 CLI 输出中嵌入变更身份（key+名称）并明确指令要求 agent 原样转述给用户。

成功标准：
- flow start 新建路径横幅含变更身份行：完整 key 与名称 + 必须转述给用户的指令
- flow start 头脑风暴收编（adopt）路径含同款变更身份指令行
- run brainstorm 自动创建变更输出含完整 key + 名称 + 转述指令
- run <stage> 显式 --change 净新建（brainstorm 显式入口走此路径）输出含完整 key + 名称 + 转述指令

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow start 新建路径横幅含变更身份行：完整 key 与名称 + 必须转述给用户的指令
2. flow start 头脑风暴收编（adopt）路径含同款变更身份指令行
3. run brainstorm 自动创建变更输出含完整 key + 名称 + 转述指令
4. run <stage> 显式 --change 净新建（brainstorm 显式入口走此路径）输出含完整 key + 名称 + 转述指令

## 成功标准（可验证）

1. flow start 新建路径横幅含变更身份行：完整 key 与名称 + 必须转述给用户的指令
2. flow start 头脑风暴收编（adopt）路径含同款变更身份指令行
3. run brainstorm 自动创建变更输出含完整 key + 名称 + 转述指令
4. run <stage> 显式 --change 净新建（brainstorm 显式入口走此路径）输出含完整 key + 名称 + 转述指令
