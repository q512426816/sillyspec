---
author: qinyi
created_at: 2026-09-24 12:40:00
---
# 设计（Design）— 2026-09-24-fr-test-bindings

> 设计输入：docs/sillyspec/fr-test-binding-proposal-2026-09-24.md（六轮收敛版，
> 契约以方案 §3.1/§3.2/§5 为准；本文只写实现落点，不复述契约论证）。

## 背景与目标
- 背景：verify 探针 7 已算「acceptance↔测试」候选但只落报告不进归档——答不了
  「谁要求这条测试」（fr-test-binding 方案裁定持久化，本变更=写侧主体）。
- 目标：候选机械落盘→agent 复核晋升→归档提升全局锚→可查询可修复
  （`sillyspec tests` 视图+修理工），契约=方案 §3.1/§3.2/§5 写侧清单。

## 范围与总体方案：架构总览（D-001@v1 / D-002@v1）
- **单点解析模块** `src/test-bindings.js`（新增）：行模型 + 两处真源的读写/晋升/
  取代/视图查询。fr-index、verify-probes、quick 门、CLI 全部经它，不各写解析。
- **变更期载体**：`changes/<名>/test-trace.json`（机器文件，CLI 所有权）。
- **真源①**：knowledge/fr/<域>.md 条目内「测试绑定:」机器子块（fr-index 蒸馏面内）。
- **真源②**：`.sillyspec/quicklog/test-bindings.json`（quicklog 侧机器面）。
- **依赖方向**：test-bindings.js 为叶子（只依赖 fs-atomic/git-helper）；
  fr-index 归档时 import 它做提升——不反向。

## 行模型（两真源共用）
```
anchor:        FR-<域>-NNN | ql-<id> | null     # 变更期=局部 FR-NN
row_id:        <change>:<task-id>:<accRef>       # anchor:null 必填；accRef 含原文短指纹
tests:         [仓相对路径…]
reason:        spec | capability | regression
state:         candidate | active
discovery:     machine | agent
confirmed_by:  agent | null
confirmed_at:  <headHash> | null
reconfirm:     unchanged | rebound | null        # 预留（沉默红二期消费）
status:        active | superseded
source_change: <变更名>                          # 提升期填，机器晋升 upsert 键之一
```
- row_id 的 accRef：FR 锚行=局部 FR 号；orphan 行=`acc-<index>-<textHash8>`。
- 条目子块头注：`<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->`。

## 三个写点（D-003@v1 晋升时机 / D-004@v1 quick 行状态 / D-005@v1 orphan 指纹）
1. **探针 7 构建**（verify-probes）：归属非空行→candidate 写入 test-trace.json
   （整文件重写，幂等——内容 hash 不变跳过写）。
2. **verify --done 晋升**：矩阵门通过后，按 verify-result.md 判定列更新行
   （covered/covered-service→active；partial 留 candidate；uncovered/non-testable
   行删除或保持 candidate-zero —— 落**删除**，缺口信号留给矩阵自身）。
   晋升写 confirmed_by=agent + confirmed_at=HEAD。
3. **quick --done**：窗口测试文件（isTestPath）→ ql 行落真源②（candidate）。

## 归档提升（fr-index 扩展）
- indexRequirements 主入口尾部：读本变更 test-trace.json，逐行锚映射
  （局部 FR-NN→全局 id，用发号时已算的映射表）→ 条目子块 upsert。
- **upsert 键** = `source_change + row_id`；内容全等 no-op（幂等闸门内）。
- **supersede 同步**：承接翻链处置退役条目时，其绑定行 status→superseded。
- 蒸馏重放保护：indexRequirements 对已存在条目的非绑定字段照旧重放；绑定子块
  只经 upsert 键合并——机器不删 agent 行（--unbind 才删，且留 confirmed 痕迹）。

## tests CLI（index.js 注册 `tests` 命令）
- 视图：`--anchor <锚>` / `--change <名>`——两真源合并查询，表格输出。
- 修理工：`--bind --anchor <锚> --tests <p1,p2> [--reason …] [--change <名>]`；
  `--unbind --anchor <锚> --tests <…> | --row-id <id>`。
- 校验：锚可解析（FR=活库 active 条目；ql=QUICKLOG 在册）+ 路径 existsSync
  ——违者硬错退出非零；写入 confirmed_by=agent、confirmed_at=HEAD、原子写。
- 变更期锚（局部 FR-NN）只读不修——修理工仅面向提升后行（方案 §3.2）。

## 边界与风险
- verify-result.md 判定列解析依赖既有 extractAcceptanceMatrixSlots（同源，无新解析）。
- orphan 行（anchor:null）一期纯审计面，不进任何跑集（另案消费）。
- quick 行恒 candidate：诚实优先；消费口径（是否入跑集）由读侧另案裁定。
- 失败模式：提升中途写坏活库 → writeAtomicSync + 内容不变跳写兜底；
  --bind 误操作 → --unbind 可逆（同批落地，不留死路）。
- 退役判据：若绑定查询长期零消费（读侧另案落空），提升降级为 test-trace.json
  原样归档，条目子块停写。

## 文件变更清单
- `NEW:src/test-bindings.js`
  行模型+两真源读写/晋升/取代/视图（D-002 单点解析，task-01）
- `src/verify-probes.js`
  探针 7 构建→candidate 落盘（task-03）
- `src/run/gates.js`
  verify 门通过点晋升接线（task-04——判定列消费既有 extractAcceptanceMatrixSlots 同源形态）
- `src/fr-index.js`
  归档提升+supersede 同步+重放保护（task-06）
- `src/index.js`
  `tests` 命令注册（task-02）；quick --done ql 行接线（task-05）
- `src/run/complete-handlers.js`
  quick --done ql 行落点（task-05——QUICKLOG 标完成点 qlId 在场）
- `NEW:test/test-bindings.test.mjs`
  基座/CLI/写点/提升全链单测（task-01~07 共用，串行波）

## 自审（Self-Review）
- 契约对齐：行模型/晋升/所有权逐字取自方案 §3.1/§3.2/§5，无擅自加项；
  读侧（跑集/悬空硬错）未预支。
- 解析纪律：两真源仅 test-bindings.js 一处解析；无 knowledge/test-trace/ 目录。
- 失败模式闭环：原子写、--unbind 可逆、重放幂等、修理工自校验——各有测试钉。
- 残留不确定：task-04 晋升接线落点（verify-postcheck vs stage-contract）
  待 plan 期看判定列解析既有归属再定，不改变行为契约。
