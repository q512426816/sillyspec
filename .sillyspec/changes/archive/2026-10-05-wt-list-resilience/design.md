---
author: flow-machine-draft
created_at: 2026-10-05T11:24:54.199Z
---
# 设计记录（Design Record）— 2026-10-05-wt-list-resilience

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

修复点收口在 WorktreeManager.list()（src/worktree.js）读侧：对每条 meta 做 changeName/branch 兜底归一化（changeName 缺失取注册表目录名——create() 恒以 validateChangeName 过的变更名建目录，目录名即权威事实；branch 缺失取 '-'）。不选逐写入路径加固：create() 主路径本就恒写两字段（worktree.js:916-917），缺字段件来自旧版/外部写入形态（实证残留为 mode:"native" 旧形态），读侧收口对任何历史写入方免疫，且渲染器（index.js case 'list' 的 i.changeName.length 崩溃点）与 doctor（metaNames 匹配 undefined 失配）双双受益。meta.json 落盘内容不改写——归一化只发生在返回对象上。

交付路径走会话专属 worktree（顺带实测 worktree create/wt-commit/apply 独占树链路）：create 建树 → 树内改码+单测 → wt-commit（message 带变更名后缀）→ apply 回主树 → 主树显式 pathspec 提交 → flow done 收口。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

WorktreeManager.list() 返回项的 changeName/branch 字段由「meta 缺字段时为 undefined」变为「恒为 string」（缺失时兜底注册表目录名 / '-'）；该函数无其他签名变化。meta.json 落盘格式无变化（归一化不回写）。CLI `sillyspec worktree list` 对完整 meta 输出逐字不变，对缺字段 meta 由 TypeError 崩溃改为正常列出。doctor 经 list() 的孤儿匹配（metaNames 集合）随之由 undefined 失配修复为按目录名匹配。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——list() 是无状态全量扫描（每次调用重读注册表目录），无缓存无累积序；meta 写入与读取乱序只影响单次读到的快照集合，兜底归一化对任意快照子集行为一致。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   meta.json 走 writeAtomicSync 原子替换，读到半写文件时 parseJSON 失败被既有跳过分支吞掉（不进列表）；cleanup 与 list 并发删目录时 metaPath existsSync 失败即跳过——两路径都不触达兜底逻辑的异常面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——归一化仅在 list() 返回对象上现场计算，不落盘不缓存，中途中断无残留状态；重跑 list() 幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：worktree 注册表（.sillyspec/.runtime/worktrees/）本身单仓作用域，WorktreeManager 构造按 git-common-dir 锚定主仓注册表；changeName 兜底取的是本注册表目录名，不读任何跨仓/他工作区数据，多实例各自扫描各自注册表互不可见。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：changeName 兜底目录名后，若某历史注册表目录名与变更名不一致（理论上只在手工改名目录时出现），list/doctor 会按目录名匹配——但该形态下旧行为是 undefined 崩溃/失配，兜底严格更优，不构成回退面。放弃的方案：① 渲染器（index.js）侧判空——只修 CLI 一处，doctor 的 undefined 失配仍在，且 index.js 当前被并行会话在途占用（不可改）；② 写入侧强制补全历史件——要迁移已落盘 meta，读侧问题写侧修，收益错位。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | WorktreeManager.list() 读侧归一化：changeName 兜底注册表目录名、branch 兜底 '-' |
| 新增 | test/worktree-list-resilience.test.mjs | 缺字段兜底/完整原值/解析失败跳过三形态单测 |
