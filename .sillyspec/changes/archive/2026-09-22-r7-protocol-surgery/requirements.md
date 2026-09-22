---
author: zcode-r7-surgery
created_at: 2026-09-22 10:41:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent | 干活主体：读薄流程说明→改代码→例外裁决（AGENT 槽/amend）→flow done |
| CLI | 记账主体：起草工件/跑门/算距离/推事件/归档 |
| watcher | 观测旁路：best-effort 缓存，provisional 事件，非真相源 |
| 平台 | ingest 展示面：只展示不判定（events 端点为声明依赖） |
| 机械 harness | 验收主体：无智能走流程验协议形状属性 |

## 功能需求

### FR-01: watcher 事件三源解耦（承接 FR-core-engine-003 观察指标事件流的独立事件面）
Given 活跃 change 且 watcher 拉起（detached+单飞锁+心跳租约）
When change 子树文件签名变化/git 新提交/工件出现或翻格
Then watcher-events-<change>.jsonl 追加事件（ts/kind/stage/detail/**provisional:true**），
且事件数不随 CLI 调用数等比例下降（轮询独立采样）；watcher 崩溃/被杀/SILLYSPEC_WATCHER=0
主流程零影响

### FR-02: 阶段推断与墙钟拆账
Given 产物 mtime 序列（proposal.md→requirements.md→design.md→tasks.md→checkbox 翻格→
git 提交→verify 工件→archive 移动）
When watcher 聚合执行
Then 每事件带推断 stage 字段；watcher-stage-timing-<change>.json 落阶段耗时拆账
（替代 transcript 抽取）

### FR-03: 协议必需交互=2（协议形状属性，机械 harness 可验）
Given flow:thin（缺省）且新任务
When harness 无 agent 走薄跑道
Then CLI 必需调用恰为 flow start 与 flow done 两次；中间零协议必需交互
（自愿 status/verify 合法不计入）

### FR-04: flow start 一次下发（含显式档入口）
Given flow start --change <名> --input "<任务原话>" [--thick|--with-tasks]
When 执行
Then 建 change（initChange 语义：目录+stages 行；ghost 免疫）+机器起草四件+输出
薄流程说明与全部材料**路径**清单（稳定前缀）；对已存在 change 输出恢复简报
（盘面状态：checkbox/提交/账本/dirty files→做到哪、剩什么）；--thick=起始即厚档、
--with-tasks=薄协议+任务卡（人/输入侧声明，不做覆盖度启发式）

### FR-05: flow done 唯一裁决点（幂等原子，fail-closed 三句钉死）
Given flow done --change <名>
When 执行六子步（工件校验/账本对账/探针/distill/归档/事件收口）
Then 每子步查自身完成标记（幂等跳过）；中段失败精确报告已完成子步；重入断点续；
测试门=runQuickTestLintGate 同源（P2 账本优先，无记录亲测，fail 阻断——判定语义零改动），
changedFiles=git diff 对 flow-state 的 baseline_commit；实测后 recordTestLedger 落账；
**实测失败=整单 FAIL exit≠0（不继续 distill/归档）；实测超时=失败（无部分成功当绿）；
半态可重入不可假绿（归档子步未完成前 change 仍 active）**

### FR-06: thin|legacy 开关
Given local.yaml flow 键（config-schema 注册）
When flow:legacy（或一行改回）
Then 既有 run <stage> 全族行为逐字不变；thin change 上跑 run <stage>=该 change 回 legacy
记账（flow-state legacy_fallback，不叠加记账）

### FR-07: 全件机器起草（工件回填轮=0，任务卡分岔）
Given flow start 起草 proposal（--input 转写）/requirements（机械摘成功标准）/tasks（机械推导）/
decisions（只记真实新增）
When 薄跑道会话进行
Then agent 会话内 .sillyspec 写入仅例外裁决（AGENT 槽填充/amend-draft 留痕）——harness 验
产物面；**任务卡分岔**：默认 thin+直写=零任务卡（薄跑=quick 的协议兄弟）；--thick/
--with-tasks=生成任务卡；禁止大任务默认零卡自称 thin 全流程

### FR-08: 机器稿指纹与篡改门禁（verify-draft 三件套泛化）
Given 机器段以 MACHINE-DRAFT sha256 标记对包裹+draft-ledger 台账（首版原文永存）
When flow done 验收
Then 三态拒收：标记删除/内容哈希失配/手工重锚未审计；AGENT 槽合法放行；
flow amend-draft 是唯一留痕修改通道；verify-result.md 既有语义零回归（消费方化）

### FR-09: 编辑距离路由信号（advisory 定案）
Given agent 经 flow amend-draft 改写机器段（唯一合法通道）
When CLI 计算 ledger 首版原文 vs 当前内容的行级 editRatio
Then editRatio>阈值（flow.edit_ratio_threshold 缺省 0.5）→ **测绿可薄档过**（advisory
不强制）；flow done 输出醒目打印 route_hint:thick+editRatio 数值；遥测四列记一笔；
flow.edit_ratio_enforcement advisory|block 缺省 advisory；AGENT 槽书写不计入

### FR-10: 失败触发升级（不靠 agent 主动）
Given flow done 的 verify 失败/审查否决/distill rejected|needsWait
When 升级判定执行
Then flow-state tier:thick+upgrade_reason，剩余流程按厚档走（完整仪式）；
薄跑误判兜底由此闭合

### FR-11: plan 提示词反细拆（协议税源头修正）
Given plan 阶段步骤指引文本（src/stages/plan.js）
When agent 按指引分解任务
Then 默认「实现+单测同卡」；不出现「纯接线/纯 module-map 录入/纯全量回归绿」独立成卡的
引导；验收钉（含回归绿/module-map 收尾）写在实现卡的 acceptance/implementation 内；
「同 Wave 文件不相交」约束的解释文案明确其防并行互盖语义、不暗示测试/接线须另立任务

## 非功能需求
- 红线：不动 fail-closed 判定语义/P2 账本口径/allowed_paths/多会话所有权/DB schema。
- 兼容：legacy 全保留；thin 只影响新 change（flow-state 缺失=未参与 thin）；
  平台未升级 events 端点 fail-soft 本地降级。
- Windows：轮询 diff（弃 fs.watch）；detached+windowsHide；path.join；jsonl appendFileSync。
- 性能：watcher 轮询面限 change 子树+git 头指针+runtime 工件，3s 间隔，日志 1MB 截尾。

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 观测挂状态不挂对话（watcher=缓存，--done=真相）；轮询弃 fs.watch |
| D-002@v1 | FR-03, FR-04, FR-06 | 协议折叠为 2 调用；flow start 一次下发路径清单；legacy 开关并存 |
| D-003@v1 | FR-05 | flow done 幂等原子循 task-done 先例；测试门清单=git diff 对基线 |
| D-004@v1 | FR-07, FR-08 | 机器起草全件面+指纹泛化；守卫在验收侧零 prompt 劝说 |
| D-005@v1 | FR-09, FR-10 | editRatio 与守卫汇合于 amend 通道（ledger 存首版原文）；失败自动升厚 |
| D-006@v1 | FR-11 | plan 细拆诱导缺陷：本次收口 6+1 卡+提示词修正；根治=切片二协议记账单位解耦 |
