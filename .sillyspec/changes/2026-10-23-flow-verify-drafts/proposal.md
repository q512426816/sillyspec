---
author: flow-machine-draft
created_at: 2026-10-22T16:53:52.764Z
---
# 提案书（Proposal）— 2026-10-23-flow-verify-drafts

## 动机

任务原话转写：flow verify-drafts 起草自查只读命令

动机与背景：spec 面完整性校验（verifyFlowDrafts 只读轨 repair:false）目前只在 flow approve 与 flow done 两处可达——approve 是用户跑的命令，agent 起草完 spec 面后无法自查，violations 只能等用户跑 approve 被 exit 1 硬拒才发现，用户被拒一次往返；2026-10-23 轻量变慢四子代理分析实证：批准往返的拒绝成本无预检面（起草侧就地校验缺失）。新增只读子命令 flow verify-drafts：与批准门同源判定（单一源抽取共享），agent 写完 spec 面先自查通过再请用户批准，用户被召唤一次过。用户已显式授权「干吧，做完有价值的内容并归档」——本变更 autopilot 直跑到底。

成功标准：
- sillyspec flow verify-drafts --change <名> 只读运行 spec 面完整性校验（与 flow approve 批准门同判定同源单一源），零文件写入；有 violations 时 exit 1 一次列出全部违规与修复指引，通过 exit 0
- --json 输出结构化单对象（applicable/schema/violations/advisories/skipDesign/degraded/v1EmptySlots），与人类渲染同判定同退出码
- 变更目录不存在/变更名非法 exit 2 且文案给出路；flow approve 既有输出与退出码零变化（共享抽取单一源，approve-channel-attest/approve-gate-tick 等既有测试零改动全绿）
- flow start 横幅三断点纪律① 增一行自查指引（起草完先 verify-drafts 自查再请批准——agent 零撞门学习）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. sillyspec flow verify-drafts --change <名> 只读运行 spec 面完整性校验（与 flow approve 批准门同判定同源单一源），零文件写入；有 violations 时 exit 1 一次列出全部违规与修复指引，通过 exit 0
2. --json 输出结构化单对象（applicable/schema/violations/advisories/skipDesign/degraded/v1EmptySlots），与人类渲染同判定同退出码
3. 变更目录不存在/变更名非法 exit 2 且文案给出路；flow approve 既有输出与退出码零变化（共享抽取单一源，approve-channel-attest/approve-gate-tick 等既有测试零改动全绿）
4. flow start 横幅三断点纪律① 增一行自查指引（起草完先 verify-drafts 自查再请批准——agent 零撞门学习）

## 成功标准（可验证）

1. sillyspec flow verify-drafts --change <名> 只读运行 spec 面完整性校验（与 flow approve 批准门同判定同源单一源），零文件写入；有 violations 时 exit 1 一次列出全部违规与修复指引，通过 exit 0
2. --json 输出结构化单对象（applicable/schema/violations/advisories/skipDesign/degraded/v1EmptySlots），与人类渲染同判定同退出码
3. 变更目录不存在/变更名非法 exit 2 且文案给出路；flow approve 既有输出与退出码零变化（共享抽取单一源，approve-channel-attest/approve-gate-tick 等既有测试零改动全绿）
4. flow start 横幅三断点纪律① 增一行自查指引（起草完先 verify-drafts 自查再请批准——agent 零撞门学习）
