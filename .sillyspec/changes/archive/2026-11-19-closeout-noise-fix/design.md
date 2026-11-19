---
author: flow-machine-draft
created_at: 2026-11-19T15:55:46.116Z
---
# 设计记录（Design Record）— 2026-11-19-closeout-noise-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

负面②：flow.js 冻结对账的 _suspects 判定新增删除面跳过——`collectDeletedFace`（flow-parity.js 新纯函数）采集本变更删除面（baseline..HEAD `--diff-filter=D` 已提交删除 ∪ `git status` XY 含 D 的工作树未提交删除），声明路径命中删除面即不落跨仓嫌疑并输出 ℹ️ 留痕行；existsSync 核验仍是第一道（在盘即非嫌疑），删除面是第二道（不在盘但被删=删除语义），余下才点名。负面③：flow.js dirty 权威门与 flow-preflight.js 预检同判定链加签收面剔除（flow-state `accept_dirty_gap.files`，--accept-dirty-gap 签收时持久化写入，对齐 --accept-empty-face 先例）——已签收面免拦、增量面照拦并报增量数；另在权威门加时点快照解释行（函数级变量 `_preflightDirtyCount` 传预检时点数，权威门数字更大即输出「实测窗口内新增、非口径漂移」）。选此方案是因为两处噪音都是「判定面缺一档语义」（删除 vs 跨仓、签收 vs 新增）而非架构问题，最小面补档即可，不动 collectFreezeFiles 的采集口径（残渣剔除 dirty_gate_ignore 既有通道不变）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `collectDeletedFace(cwd, baseline)`（flow-parity.js 新导出）：返回 posix 路径 Set；git 失败 fail-safe 回空集（行为回到现状点名）。
- `collectCloseoutPreflight(...)`（flow-preflight.js）：返回结构新增 `dirtyCount`（预检时点原始缺口数，null=未算）与 findings[].acceptedCount（签收免拦计数）；dirty-gap finding 的 count/files 语义变为增量面（签收过滤后）。
- flow-state 新键 `accept_dirty_gap`（{ at, files, by }）：--accept-dirty-gap 签收时写入，重跑读取；仅签收面记录，不与 accept_empty_face 混用。
- CLI 输出面：新增「N 条声明为删除交付……不按跨仓嫌疑点名」ℹ️ 行、「按签收免拦」行、「（增量——另有 N 个已按签收免拦）」后缀、「缺口数字是时点快照……非口径漂移」解释行；阻断/放行判定语义本身（缺口处置三选一）不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

删除面是 git 状态的时点快照（与冻结面采集同时刻），提交顺序不影响——已提交删除在 diff 源、未提交在 status 源，rename 取新侧路径。签收清单是签收时点的文件清单快照，后续文件改动不使旧签收失效（增量判定按文件路径比对，路径在清单即免拦——内容变化归冻结面口径，非本门职责）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

flow-state 写入走 writeAtomicSync（writeFlowState 既有原子写）；accept_dirty_gap 合并语义（cur 展开）不覆盖他键。并行会话对同一 change 并发签收的形态与既有 accept_empty_face 同款（后写胜出，留痕 by 字段可归属）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

签收持久化发生在权威门放行时（patch 子步内）；中断重跑读 flow-state 续——已签收面免拦正是本变更要修的中断形态。删除面采集零写盘（纯读 git），无中途态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

删除面按 cwd 的 git 状态采集（跨仓声明条目 e.repo 已在上游剔除，不进删除面比对）；签收清单是 change 级 flow-state 键，多变更各自隔离；预检与权威门读同一 st 对象无第二实例问题。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **风险**：删除面过宽（工作树 D 状态含他侧会话的删除）——声明路径恰好撞上他侧删除文件名时被误跳过点名。暴露面极窄（声明清单 ∪ 他侧删除同名文件），且文件在冻结面/缺口面仍有兜底（他侧删除未提交会进 dirty 缺口门），可接受。
- **风险**：签收清单免拦后缺口文件被并行会话追加内容（同路径新内容）——按路径免拦不感知内容变化；该面归冻结面/评审域，dirty 门不重复职责（与 dirty_gate_ignore 前缀豁免同款语义边界）。
- **死路**：首轮实现把 `_preflightDirtyCount` 声明在预检块所在的内层子步骤块里，patch 子步（平级块）引用 ReferenceError 被 patch 段 fail-soft catch 吞掉、patch 子步静默不标记——e2e 夹具抓出后移至 cmdFlowDone 函数体级作用域修复（教训：跨子步骤传状态必须函数级变量，子步骤块的块级作用域互不可见）。
- **放弃方案**：让实测命令自身产生脏文件来测时点快照行（commands.test 注入写盘命令）——实测 runner 按动态子集直接 node --test 跑测试文件，字面命令不注入，形态造不出来；改由 smoke 测试文件（进动态子集）在实测窗口写主仓绝对路径脏文件——同时更真实（并行会话/工具写盘本就是该现象的主来源）。
