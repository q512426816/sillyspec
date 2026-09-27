---
author: sillyspec-fr-index
created_at: 2026-09-22T09:42:59.537Z
---

# FR 索引 — sync

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/sync.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-sync-001 watcher 事件三源解耦（承接 FR-core-engine-003 观察指标事件流的独立事件面）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 活跃 change 且 watcher 拉起（detached+单飞锁+心跳租约）；When change 子树文件签名变化/git 新提交/工件出现或翻格；Then watcher-events-<change>.jsonl 追加事件（ts/kind/stage/detail/**provisional:true**），
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-01
最近确认：2bd35703

## FR-sync-002 阶段推断与墙钟拆账
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 产物 mtime 序列（proposal.md→requirements.md→design.md→tasks.md→checkbox 翻格→；When watcher 聚合执行；Then 每事件带推断 stage 字段；watcher-stage-timing-<change>.json 落阶段耗时拆账
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-02
最近确认：2bd35703

## FR-sync-003 协议必需交互=2（协议形状属性，机械 harness 可验）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given flow:thin（缺省）且新任务；When harness 无 agent 走薄跑道；Then CLI 必需调用恰为 flow start 与 flow done 两次；中间零协议必需交互
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-03
最近确认：2bd35703

## FR-sync-004 flow start 一次下发（含显式档入口）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given flow start --change <名> --input "<任务原话>" [--thick|--with-tasks]；When 执行；Then 建 change（initChange 语义：目录+stages 行；ghost 免疫）+机器起草四件+输出
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-04
最近确认：2bd35703

## FR-sync-005 flow done 唯一裁决点（幂等原子，fail-closed 三句钉死）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given flow done --change <名>；When 执行六子步（工件校验/账本对账/探针/distill/归档/事件收口）；Then 每子步查自身完成标记（幂等跳过）；中段失败精确报告已完成子步；重入断点续；
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-05
最近确认：2bd35703

## FR-sync-006 thin|legacy 开关
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given local.yaml flow 键（config-schema 注册）；When flow:legacy（或一行改回）；Then 既有 run <stage> 全族行为逐字不变；thin change 上跑 run <stage>=该 change 回 legacy
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-06
最近确认：2bd35703

## FR-sync-007 全件机器起草（工件回填轮=0，任务卡分岔）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given flow start 起草 proposal（--input 转写）/requirements（机械摘成功标准）/tasks（机械推导）/；When 薄跑道会话进行；Then agent 会话内 .sillyspec 写入仅例外裁决（AGENT 槽填充/amend-draft 留痕）——harness 验
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-07
最近确认：2bd35703

## FR-sync-008 机器稿指纹与篡改门禁（verify-draft 三件套泛化）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 机器段以 MACHINE-DRAFT sha256 标记对包裹+draft-ledger 台账（首版原文永存）；When flow done 验收；Then 三态拒收：标记删除/内容哈希失配/手工重锚未审计；AGENT 槽合法放行；
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-08
最近确认：2bd35703

## FR-sync-009 编辑距离路由信号（advisory 定案）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given agent 经 flow amend-draft 改写机器段（唯一合法通道）；When CLI 计算 ledger 首版原文 vs 当前内容的行级 editRatio；Then editRatio>阈值（flow.edit_ratio_threshold 缺省 0.5）→ **测绿可薄档过**（advisory
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-09
最近确认：2bd35703

## FR-sync-010 失败触发升级（不靠 agent 主动）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given flow done 的 verify 失败/审查否决/distill rejected|needsWait；When 升级判定执行；Then flow-state tier:thick+upgrade_reason，剩余流程按厚档走（完整仪式）；
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-10
最近确认：2bd35703

## FR-sync-011 plan 提示词反细拆（协议税源头修正）
变更：2026-09-22-r7-protocol-surgery
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given plan 阶段步骤指引文本（src/stages/plan.js）；When agent 按指引分解任务；Then 默认「实现+单测同卡」；不出现「纯接线/纯 module-map 录入/纯全量回归绿」独立成卡的
全文：.sillyspec/changes/archive/2026-09-22-r7-protocol-surgery/requirements.md#FR-11
最近确认：2bd35703

## FR-sync-012 哨兵规则引擎（四规则，恒 advisory）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-01
最近确认：dd7efa44

## FR-sync-013 假勾选规则（fake-check）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-02
最近确认：dd7efa44

## FR-sync-014 改测试凑绿规则（test-tamper）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-03
最近确认：dd7efa44

## FR-sync-015 范围漂移规则（scope-drift）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-04
最近确认：dd7efa44

## FR-sync-016 停滞规则（stall，分相位阈值）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-05
最近确认：dd7efa44

## FR-sync-017 事件模型扩展（advisory 面与真相库隔离）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-06
最近确认：dd7efa44

## FR-sync-018 L0 纯函数（detectFakeCheckCompletion，本批不接线）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-07
最近确认：dd7efa44

## FR-sync-019 水位回补（幂等，修面板连续性）
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-08
最近确认：dd7efa44

## FR-sync-020 run 族最小挂点
变更：2026-09-23-sentinel-rules
状态：active
摘要：（无场景名）
待复核：2026-09-26-thin-check-cadence
全文：.sillyspec/changes/archive/2026-09-23-sentinel-rules/requirements.md#FR-09
最近确认：dd7efa44

## FR-sync-021 断裂语义收窄
变更：2026-09-26-watcher-timeline-p2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 事件流翻格计数中段不衔接（某拍 from 不等于游标）；When inferFlipTimes 判定；Then 标 broken 且该拍起不再赋值；计数链完整但未覆盖全部任务（尾部未勾）不标 broken
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline-p2/requirements.md#FR-01
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline-p2:flow:FR-01
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline-p2
  status: active

## FR-sync-022 已勾缺时刻的渲染层标注
变更：2026-09-26-watcher-timeline-p2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given tasks.md 某任务已勾但推断时刻为 null（观测盲窗/水位丢失）；When renderTimeline 渲染任务面；Then 该任务行时刻列显示 ?，表下注记「已勾任务缺推断时刻」；不再以笼统断裂注覆盖此形态
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline-p2/requirements.md#FR-02
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline-p2:flow:FR-02
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline-p2
  status: active

## FR-sync-023 逐阶段墙钟输出
变更：2026-09-26-watcher-timeline-p2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 事件流含带 stage 的事件；When renderTimeline 渲染统计段；Then 输出「阶段墙钟」行——复用 watcher 的 aggregateStageTiming 聚合，每阶段 first→last 差按时/分格式化
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline-p2/requirements.md#FR-03
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline-p2:flow:FR-03
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline-p2
  status: active

## FR-sync-024 双路径探测用例
变更：2026-09-26-watcher-timeline-p2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given loadChangeTasks 为活跃>归档双路径探测函数；When tmpdir 下构造活跃/归档/双缺失三种盘面；Then 活跃优先、归档回退、双缺失返回 null——由 test/watcher-timeline.test.mjs 新用例钉住（修正主变更 FR-02 豁免理由失实）
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline-p2/requirements.md#FR-04
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline-p2:flow:FR-04
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline-p2
  status: active

## FR-sync-025 套件实测全绿
变更：2026-09-26-watcher-timeline-p2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更触及 src/ 与 test/；When 运行 npm run test:core 与 npm run lint；Then 全部通过
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline-p2/requirements.md#FR-05
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc
