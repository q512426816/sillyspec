---
author: flow-machine-draft
created_at: 2026-10-16T13:20:04.877Z
---
# 设计记录（Design Record）— 2026-10-16-short-change-title

## 做法概述

病根两处：① `deriveChangeTitle` 对 `--input` 首行超 50 字硬切加 …（轻量/完整流程共用）；② `deriveTitleFromLinkedChange` 遇纯模板 H1（`# 提案书（Proposal）`，brainstorm 模板正文即此形态）剥前缀为空后直接放弃，标题恒变更名兜底，而 proposal「## 动机」节首句本是最好的标题素材却无人取。

改法（quicklog.js 单源，调用点切换）：新增纯函数 `distillShortTitleEx(raw)`——超 30 字长句在自然标点（。！？；：、，…—及 ASCII 标点后随非字母数字时）处截断，截点取「距目标 20 最近、落在 6..30 区间」者并剥尾部标点/悬空引号；无可用截点才 `slice(0,30)+'…'` 并标 `hardCut`。`deriveChangeTitle` 拆出 `deriveChangeTitleRaw`（首行提取/标签剥离/成功标准止，不截断），旧函数契约逐字节不变（≤50 硬切，motiveFromInput 模块摘要同源不牵连）；新增 `deriveShortChangeTitle(Ex)` = Raw+提炼 作为标题面新入口。`deriveTitleFromLinkedChange` 两文档皆无语义标题时回退读 proposal「## 动机」节首个内容行（剥 bullet）过提炼；H1 语义标题返回前同样过提炼封顶 ≤30。调用点：flow.js fresh/resume/adopt、run/command.js 四处 initChange 换 `deriveShortChangeTitle`；fresh/resume `hardCut` 时打一行 `--title` 软提示（不阻断）。

## 接口契约

- `src/quicklog.js` 新增导出：`distillShortTitle(raw, opts)`（返回 string）、`distillShortTitleEx(raw, opts)`（返回 `{ title, hardCut }`）、`deriveChangeTitleRaw(input)`（首行提取不截断）、`deriveShortChangeTitle(input)`（string）、`deriveShortChangeTitleEx(input)`（`{ title, hardCut }`）。
- `deriveChangeTitle(input, max = 50)` 签名与返回口径不变（内部改复用 Raw 提取，输出逐字节等价——motive-from-input/change-title-flow 既有断言为回归锁）。
- `deriveTitleFromLinkedChange(specBase, change)` 返回值口径变化：纯模板 H1 且无 design 语义标题场景从 `''` 变为动机提炼句（≤30 字）；无动机节/无内容行仍 `''`；其余返回值封顶 ≤30 字。空串不刷新语义（complete.js `if (refinedTitle)`）不变。
- `changes.title` 落库口径：新推导标题 ≤30 字（原 ≤50 硬切）。CLI 参数面零新增、命令用法零变化。
- 平台侧零改动：平台收养/不覆盖语义标题逻辑照旧；存量 50 字标题回填归平台侧变更（不在本变更范围）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。标题推导是启动时点纯函数，无跨事件状态；resume 迟到补写仅在库内 title 为空时生效（首写者胜，flow.js 既有 `_cur` 判定保留），不覆盖已落库的语义标题，乱序重入最坏=提示多打一行。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   两会话并发 start 同名 change：initChange/updateChangeMeta 写同值（同输入同推导、确定性函数），无读改写竞态放大；一方带 --title 时与现状一致（显式胜出）。deriveTitleFromLinkedChange 只读文件，refreshChangeTitleFromArtifacts 单行 UPDATE，sqlite 串行写保证安全。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。提炼与动机提取无 IO 无状态（动机提取读文件失败按既有 catch 语义返回空串/跳过文档），任意时点中断不落半态；硬切软提示只是 console 输出，不写状态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。标题只写本 cwd 进度库 changes 行；quicklog 平台推送 payload 沿用同一推导值（同源不漂移）；跨仓基线锚（cross_baselines）路径不触及标题；多实例各自 cwd 各自库，无共享面。

## 风险与死路

- 最大风险：截点启发式对无全角标点的长句（英文/长数字串）退化为硬切 30+…，可读性一般——有 --title 显式通道 + hardCut 软提示兜底，且标题是展示元信息非正确性面，接受。
- 放弃方案①：直接改 `deriveChangeTitle` 内部为提炼口径——motiveFromInput 模块变更索引摘要与其同源，会把 ≤50 摘要一并压成 ≤30（motive-from-input.test.mjs:37 锁定 ≤50 口径），爆炸半径失控；改为拆 Raw + 新函数单点切换。
- 放弃方案②：标题超 30 字时阻断启动或升级警告——标题是面板显示元信息，「阻断」违反其定位且会卡协议面；定为一行软提示（不阻断、不改退出码）。
- 放弃方案③：动机回退取整段再摘要——动机段可能多段多句，整段过提炼截点选择易落在次句腰部；定为首行（首句）提取，语义最接近「一句概括」。
