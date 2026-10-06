---
author: flow-machine-draft
created_at: 2026-10-06T13:13:33.950Z
---
# 设计记录（Design Record）— 2026-10-06-resume-domain-flip

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

缺陷机理：flow start 重入的知识注入域路由只用 `changedFilesSinceBaseline`（区间 diff + `git status --porcelain` 全量扫）作路由面，porcelain 会把先于变更存在的他侧未跟踪目录一并扫入；重入发生在干活开始前时区间 diff 为空、本变更工作树无改动，路由面只剩这批垃圾，域被劫持成伪域 auto-*，fresh 简报从 --input 路由出的真实域与 FR 注入全部丢失。

修法两层（都在 flow.js resume 分支调用侧，不动 changedFilesSinceBaseline 签名与语义——fr-rot-precision ⑥ 源码钉保持）：①新增 `filterPreChangeUntracked(cwd, files, birthTs)`：对 porcelain `??` 条目做时间过滤——条目最新 mtime（目录递归取成员最大值，walk 带 2000 条安全帽）早于变更出生时刻即剔除；判据是时间不是路径形态（开放世界：文件系统时间戳是唯一裁判，不建路径白名单）。出生时刻读进度库 `changes.created_at`（无 DB/无行/解析失败 → 不过滤，保守=现状）。②并集：过滤后的文件面 ∪ `extractRoutingInputPaths(cwd, specBase, resumeInput)`（resumeInput 即重入回填已恢复的 flow-state.input），保证重入知识面 ⊇ fresh 知识面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出：`flow.js` 的 `filterPreChangeUntracked(cwd, files, birthTs, opts?)`（纯函数 + git 只读 porcelain，供直测；opts.statFn 为测试注入缝——resolveArchiveCommitPathspecs 的 existsFn 同款先例）；新增私有 `newestMtime` 递归取最大 mtime（不导出）。
- `changedFilesSinceBaseline`：签名与语义不动（过滤在调用侧包裹）。`flowKnowledgeDigest` / `extractRoutingInputPaths`：不动。
- 行为变化：仅 flow start 重入简报的知识注入触达域（恢复场景）；fresh、adopt、flow done 收口各面不变。
- 端点/命令/文件格式：无。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——过滤是纯时间点比较（条目 mtime vs 变更出生时刻），与事件到达顺序无关；并集运算是可交换的。mtime 只增不回拨（正常语义下），晚写的成员永远把目录 mtime 面拉高到出生时刻之后。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   walk 期间他侧正在写未跟踪目录成员：读到的新 mtime 只会更晚 → 保留（保守方向正确）；成员被并发删除 → readdir/stat 抛错 → 保守保留。两方向都不会把真在干活的文件误剔。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——过滤无状态、不落盘；重入任意次结果一致（幂等）。出生时刻是 DB 既有的 created_at 快照，不随重入漂移。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——cwd 相对路径 + 本仓 porcelain + 本仓 DB，无跨仓读取；他侧会话的未跟踪遗留正是本修复要剔的对象（时间判据天然只认「本变更存活期内写过」）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：mtime 不可信场景误剔——工具保留旧 mtime（cp -p / 归档解包）落进未跟踪区且恰在本变更期间成为交付面。对称面：收口冻结面（collectFreezeFiles）不做此过滤，未提交交付仍走「无法归属警告/--freeze-dirty」既有出口，路由面少一个域只是 advisory 注入变窄，不丢审计事实。clock skew：出生时刻与 mtime 同机同时钟，无跨机比较。
试过放弃①：按路径形态过滤（排除 .claude/ 等目录）——开放世界枚举，写死目录清单必漏新形态，违反本变更自己的成功标准，放弃。
试过放弃②：fresh 时把 porcelain 未跟踪面快照进 flow-state、重入时对照差集——状态面翻倍且 flow-state 并入 patch 冻结件的口径要跟着改；快照后文件被本会话编辑的差集判定仍要回退到 mtime，多一层状态没有多一层判据，放弃。
试过放弃③：在 changedFilesSinceBaseline 内部加过滤参数——fr-rot-precision ⑥ 源码钉断言调用形态 `changedFilesSinceBaseline(cwd, st.baseline_commit)`，改签名要么破坏钉要么连带改三个消费面（resume 路由/dirty 计数/收口测试门），收口测试门语义不该被路由面需求带着动，放弃，改在调用侧包裹。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | 新增 filterPreChangeUntracked/newestMtime；resume 分支路由面 = 过滤后文件面 ∪ input 路由面；出生时刻读 DB created_at |
| 新增 | test/resume-domain-flip.test.mjs | 过滤判据各分支 + 重入简报端到端回归 |
| 修改 | package.json | test:core 清单追加新测试文件 |
