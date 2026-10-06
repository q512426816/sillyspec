---
author: flow-machine-draft
created_at: 2026-10-06T11:05:59.743Z
---
# 设计记录（Design Record）— 2026-10-06-flow-status-title

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

标题在 flow start 已写入进度库（ProgressManager→changes.title，面板显示用），flow status 只缺读取与渲染。方案：change-registry 新增只读访问器 `getChangeTitle(cwd, changeName)`（与 getChangeOwner 同族容错，额外做「DB 文件不在场即返回 null」前置判——只读 status 不得触发 _ensureDB 的建库副作用）；flow.js 的 status 分支经 ProgressManager（specBase 锚定，与 start/done 同构）读 title，人类渲染在「📋 <变更名>」行后追加「   标题：<title>」（仅非空时），--json 增补 title 字段（恒在场，缺省 null）。渲染与事实分离：title 读取一次，两路径共用同一变量。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 `ChangeRegistry.getChangeTitle(cwd, changeName) → string|null`（src/progress/change-registry.js），`ProgressManager.getChangeTitle` 为同名委托（src/progress.js）——纯读不抛，DB 缺席/行缺失/title 空 → null，且 DB 文件缺失时不创建。
- `sillyspec flow status --change <名>`：人类输出在登记了非空 title 时多一行「   标题：<title>」（此前无此行——这是行为变化本体）；`--json` 单对象新增 `title` 字段（string|null），既有九字段不变。
- 其余命令、DB schema、文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用级别的影响——status 是时点快照读，title 是低频写入的元数据（start/--title 重入时写）。读到新旧值都是合法时点态，无顺序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   flow status 只读（SELECT），与并行会话经 updateChangeMeta 写 title 之间是 SQLite 单语句读写；本项目 DB 为同进程连接池单例+短进程生命周期（_ensureDB 注释），跨进程并发读不阻塞写（WAL）。读路径不写库（getChangeTitle 前置 existsSync 判 DB 在场，缺失即 null），无锁竞争面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   status 无状态迁移；title 读取失败（库损坏/文件锁）走 try/catch 降级 null——与「无 DB」同输出形态，中断无半态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   DB 定位走 `_runtimePath(cwd)`（=specDir/.runtime），specDir 由 resolvePlatformSpecDir 解析（平台指针/本地同源）——与 start/done 写入侧同一定位逻辑，读的是同一个库，不串台。平台多实例共享远端库不经过本路径（本地 CLI 恒读本地库）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：JSON 消费方对新增字段的兼容性——单对象加字段对 JSON.parse 消费方是非破坏性变更，风险低；人类渲染变更可能影响既有文本匹配测试（test/flow-status-json.test.mjs ③ 人类路径回归已覆盖关键行，本变更加 fixture 断言钉住新旧两态）。放弃的方案：① 在 flow-state.yaml 里冗余存 title（写两处状态有漂移风险，DB 已是权威源）；② status 输出全量改由 DB 驱动（超出本变更范围，且 flow-state/盘面事实才是 status 主源）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/progress/change-registry.js | 新增 getChangeTitle 只读访问器 |
| 修改 | src/progress.js | 同名委托 |
| 修改 | src/flow.js | status 分支读 title+人类渲染行+--json 字段 |
| 新增 | test/flow-status-title.test.mjs | FR-01~03 回归（fixture 临时仓） |
| 修改 | package.json | test:core 清单收录新测试（日常拦截面驻留） |
