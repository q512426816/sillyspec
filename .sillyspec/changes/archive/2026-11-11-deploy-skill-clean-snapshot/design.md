---
author: flow-machine-draft
created_at: 2026-11-11T07:57:44.791Z
---
# 设计记录（Design Record）— 2026-11-11-deploy-skill-clean-snapshot

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只改 `.agents/skills/deploy/SKILL.md` 一个文件（name/description 不动，按 skill-creator 更新纪律保持安装身份）。核心改动是把 ⑥ 从「主仓直接 `npm publish`」重写为「HEAD 临时 worktree 干净快照发布」，并把它定为**唯一路径而非条件分支**——不写「工作区脏时才走快照」的判断题，因为脏面归属判别（本变更交付 vs 并行在途 vs 残渣）本身易误判，无条件规则消灭误判面；发布提交已推送（⑤ 在 ⑥ 前）保证 HEAD 恒为发布态，快照路径无前提缺口。配套四处小改（① registry 防呆、③ 版本可跳位、④ pack 移 ⑥、坑清单两行）把本轮实测数字（~380 文件基线、~10 分钟窗口）固化，替换掉旧 guide 里被残渣污染的「~480 文件」基线。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。skill 触发面（description）不变；正文流程对执行 agent 的可见变化：⑥ 的 publish 命令序列从 1 行变 4 步（worktree add→pack→publish→worktree remove），① 多一条 curl dist-tags 检查。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——文档变更，无事件面。流程时序依赖（⑤ 先于 ⑥）在 skill 正文顺序链中已钉死。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

两并行会话同时发布同一仓：临时 worktree 目录名带版本号可撞——skill 正文用 `<版本号>` 命名目录已可区分不同版本；同版本并发发布本身被 npm registry 拒（cannot publish over），属上游防呆。worktree add/remove 是 git 原子操作，与仓内既有 worktree 清单无冲突。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

中断残留临时 worktree：skill 坑清单不新增——`git worktree list` 可见且 `git worktree remove` 幂等可清；发布物已上 registry 不受影响。正文要求「用毕即删」降低残留概率。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

skill 文首已声明只适用于本仓 npm 发布，不适用消费仓；临时 worktree 建在系统 TEMP 不碰仓内 `.worktrees/`。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：快照面跑 pack 时 worktree 缺 node_modules——`npm pack --dry-run` 不需要依赖安装（只读 package.json+.npmignore 做文件清单），实测可行。死路（放弃）：按脏面检测条件分支决定是否走快照——归属判别（变更交付/并行在途/残渣三类）易误判且多一步推理，无条件快照更稳；另一死路：在主仓 `git stash` 清场后发布——stash 动了并行会话在途文件（违反 AGENTS 规则 14「不替人清理」），worktree 快照完全不动主仓工作区。
