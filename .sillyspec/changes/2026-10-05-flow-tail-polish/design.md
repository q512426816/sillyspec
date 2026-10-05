---
author: flow-machine-draft
created_at: 2026-10-05T15:23:16.287Z
---
# 设计记录（Design Record）— 2026-10-05-flow-tail-polish

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四点小修打包：① 根因修复——runArchiveChain 862 行调用 archiveNarrowedGitAdd 时引用未声明标识符 destName，ReferenceError 被外层空 catch{} 静默吞：窄化自动暂存（530 归档目录/543 knowledge 逐文件/571 docs 精确集）在 flow done 路径从未生效，三轮实测「归档后 git 半成品」全是该静默失败的表现。修三层：destName 从 destDir 的 basename 推导（修复后 narrowed add 恢复工作，knowledge 逐文件自动暂存是既有已裁决设计——543 按文件级 status 窄化非目录级，注释明示追加型共享面权衡）；catch{} 改 console.warn 留痕（静默吞正是本次排查难的根因）；探测块加第二道兜底——`??` untracked 归档新目录文件级补暂存（chunkPaths 分批，限 archive/<me>/ 专属零共享）+ knowledge 未暂存项「归档提交待办」清单提示（仅 narrowed add 失败降级时可见，此时人核后提交）。② verify-postcheck.js 对账文案补「并集去重」四字语义。③ flow.js 重入分支 digest 回填 input：writeFlowState 在 start 落 input 字段（增量字段，读侧缺省容错），重入时 st.input ?? proposal.md 动机「任务原话转写：」剥前缀回退。④ flow.js status 分支不存在变更从裸 return 改 process.exit(1)（查询目标缺失=运行错；gate 域不存在场景 exit 2 是用法错语义不同，此处保持 1）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

flow-state.yaml 增量字段 `input`（写侧 start 落盘，读侧缺省容错——存量 change 无此字段不受影响）；flow status exit code 行为变化：查不存在变更 0→1；flow done 归档输出增两条（补暂存归档目录行 + knowledge 待办清单行）；实测子集对账文案措辞。无导出函数签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——四点均为收口尾部一次性动作/查询路径/文案，无事件流。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

knowledge 待办清单只提示不自动暂存——并发 distill 场景他侧 knowledge 文件不会被本变更误 stage（自动 add 的误伤面正是本设计拒绝自动化的原因）；归档目录补暂存限 archive/<me>/ 专属目录零共享。porcelain 扫描与 add 间存在 TOCTOU 窗口——safeGit add 对不存在路径报错被既有 try/catch 吞（best-effort 语义不变）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

flow-state 增量字段：旧版 CLI 读新字段忽略、新版 CLI 读旧文件缺省 undefined 走 proposal 回退——双向兼容；重入 digest 回填失败（proposal 解析空）降级为现状（input:null），不阻断恢复。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用——归档补暂存与 status 查询均限本仓本变更；flow-state.input 是 change 目录内私有字段。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：exit 0→1 是行为变化，依赖旧语义（用 exit 0 判断"查询完成"）的脚本会翻——接受，脚本按惯例以非零为异态，旧行为无法区分不存在才是隐患；machine-interface.test.mjs:420 的 exit 2 断言属 gate execute 域（用法错）不受影响。归档窄化 add 修复后 knowledge 自动入暂存恢复——既有设计已裁决该权衡（文件级 status 窄化非目录级，追加型共享面整文件提交与惯例一致）；兜底层（narrowed add 失败时）才降级为提示不自动暂存。试过但放弃：knowledge 兜底层也自动补暂存——放弃理由：降级场景下无法确认 narrowed add 失败原因，人核后提交更稳（AGENTS.md 规则 11 同因）；再试过：flow-state 不加字段、纯 proposal 回退——放弃理由：proposal 转写含「（未提供 --input）」占位与人工改写风险，state 直存是更可靠的原始面。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete-handlers.js | 归档探测块扩展：untracked 归档目录文件级补暂存 + knowledge 待办清单提示 |
| 修改 | src/verify-postcheck.js | 动态测试子集对账文案补「并集去重」语义 |
| 修改 | src/flow.js | 重入 digest 回填 input（st.input ?? proposal 转写）；flow status 不存在 exit 1；writeFlowState 落 input 字段 |
| 修改 | test/flow-checkpoints.test.mjs | flow status 三态断言同步（不存在 0→1，FR-04 预期行为变化） |
| 新增 | test/flow-tail-polish.test.mjs | FR-01/02 源码级断言 + FR-03/04 行为级断言（makeRepo harness） |
