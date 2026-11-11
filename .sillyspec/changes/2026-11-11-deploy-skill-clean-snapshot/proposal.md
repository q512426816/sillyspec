---
author: flow-machine-draft
created_at: 2026-11-11T07:57:44.791Z
---
# 提案书（Proposal）— 2026-11-11-deploy-skill-clean-snapshot

## 动机

任务原话转写：发布技能沉淀干净快照发布实战学习

动机与背景：3.34.5 发布实战发现三件事须回写 deploy skill：(1) npm publish 打包工作区实态而非 HEAD——主仓历次发布都夹带了 ~105 个未跟踪残渣（eval/results/logs、r7-test-env 等），且多会话共享仓的并行在途脏文件会混入发布物；本轮改用 HEAD 临时 worktree 干净快照发布验证有效（380 vs 485 文件）。(2) 传播窗口实测可长达 ~10 分钟（3.34.4/3.34.5 均如此），非「数分钟」。 (3) 版本号可跳位（3.34.3 未占用直发 3.34.4），npm 无连续性要求。

成功标准：
- deploy SKILL.md ⑥ 步改为 HEAD 临时 worktree 干净快照发布为唯一路径——写明 why（工作区实态打包夹带并行在途文件与未跟踪残渣）与完整命令序列（worktree add→快照面 pack 核验→publish→worktree remove）
- ①前置检查补 registry dist-tags 现状与目标号占用防呆；③ 版本面补版本号可跳位；④ pack 体量核验移到⑥快照面；坑清单补快照发布与传播窗口时长两行

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. deploy SKILL.md ⑥ 步改为 HEAD 临时 worktree 干净快照发布为唯一路径——写明 why（工作区实态打包夹带并行在途文件与未跟踪残渣）与完整命令序列（worktree add→快照面 pack 核验→publish→worktree remove）
2. ①前置检查补 registry dist-tags 现状与目标号占用防呆；③ 版本面补版本号可跳位；④ pack 体量核验移到⑥快照面；坑清单补快照发布与传播窗口时长两行

## 成功标准（可验证）

1. deploy SKILL.md ⑥ 步改为 HEAD 临时 worktree 干净快照发布为唯一路径——写明 why（工作区实态打包夹带并行在途文件与未跟踪残渣）与完整命令序列（worktree add→快照面 pack 核验→publish→worktree remove）
2. ①前置检查补 registry dist-tags 现状与目标号占用防呆；③ 版本面补版本号可跳位；④ pack 体量核验移到⑥快照面；坑清单补快照发布与传播窗口时长两行
