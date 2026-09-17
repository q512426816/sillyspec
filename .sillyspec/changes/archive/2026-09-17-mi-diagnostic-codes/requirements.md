---
author: qinyi
created_at: 2026-09-17 14:04:39
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 程序化消费方 | SillyHub daemon / 未来 MCP 消费者，按退出码与诊断码做机器分支，不解析中文散文 |
| sillyspec 维护者 | 需要码表↔契约文档不漂移的 CI 防线（parity 测试） |
| 契约文档读者 | 以 interface-contract.md 为对账基准的 SillySpec↔SillyHub 协作双方 |

## 功能需求

### FR-01: 诊断码表单一源与信封加法式发射
覆盖决策：D-001@v1, D-004@v1
Given `src/diagnostic-codes.js` 导出冻结表 DIAGNOSTIC_CODES（恰 10 码：信封级 db_missing/change_not_found/unknown_facet/internal_error + check 级 artifacts_invalid/design_file_ref_invalid/transition_blocked/execute_evidence_unchanged/task_reviews_invalid/verify_test_failed，surface 含 gate/derive/progress show 真实错误面）
When 消费方调用 `sillyspec gate <stage> --change <name> --json` 或 `derive <facet>` 或 `progress show --json` 且任一检查失败或命中信封级错误路径
Then 信封携带 `checks[].code`（恒在场，通过时也在场，身份码非失败标志）与顶层 `codes: string[]`（按失败 check 顺序去重聚合；信封级错误路径单码），且 `errors`/`warnings`/退出码/中文 message/schema_version=1 全部与现状逐字节语义一致

#### 场景：check 级失败聚合
Given 某 change 的 gate 调用中 artifacts 与 transition 两 check 均失败（artifacts 先 push）
When 信封组装
Then `codes` = `["artifacts_invalid", "transition_blocked"]`（push 序，非字母序），`checks[].code` 与各自 check id 对应

#### 场景：信封级错误路径单码
Given 进度库不存在的 spec 目录
When 调用任一 machine 命令
Then `codes` = `["db_missing"]`，exit 2，message 文案不变

### FR-02: 范围边界与 parity 双向测试
覆盖决策：D-002@v1, D-004@v1
Given 码表面向 machine-interface 三面自产错误（stage-contract/doctor/validate 族零改动）
When 运行 `test/diagnostic-codes-parity.test.mjs`
Then ①注册码 ⊆ 契约文档诊断码目录 ∧ 目录码 ⊆ 注册表（双向，防单侧漂移）②运行时发射抽查通过（fixture 实证 db_missing/change_not_found/unknown_facet 三信封级码 + gate check.code 恒在场）③文档目录码 token 出现表外码或表内码缺席即测试红

#### 场景：文档漂移即红
Given 有人向契约码目录新增了一个码表里没有的码，或删除了码表里有的码
When CI 跑 parity 测试
Then 测试失败（双向核对任一方向都不许静默通过）

### FR-03: 加法式兼容（消费方零破坏）
覆盖决策：D-001@v1, D-004@v1
Given 现网 SillyHub 只读 exit_code + errors（gate.py:160 三分支 + dispatch.py _read_gate_result 透传，已实证）
When 信封新增 `codes`/`check.code` 字段
Then 未知字段被现有消费方忽略、行为零变化；`codes` 遵循 optional-once 约定（!== undefined 才挂）；回退路径=删除发射侧挂码即回现状，既有键从未动过

#### 场景：旧消费方无感
Given 一个只解析 exit_code 与 errors 的消费方
When 收到带 codes 的信封
Then 其退出码判定与错误转发行为与变更前完全一致

### FR-04: 契约三项对账与披露式语义变更记录
覆盖决策：D-003@v1, D-005@v1
Given interface-contract.md 存在三处漂移 + 模块卡 :28 第三真相源
When 本变更执行
Then ①命令面新增 progress show 子节（编号顺延，不撞现有 §1.3/§1.3b）②check 表补 design-file-list 行 ③transition §2.3 重写为参与综合 ok（与 completeStep 硬阻断一致）+ :123/:135/:241 informational 残留全清 + 161-173 旧示例替换 ④新增「v1 存续期语义变更记录」节（transition 条目含日期/旧语义/新语义/SillyHub 消费侧实证）⑤模块卡 :28 同步改写并补 codes 契约摘要——对账后契约、模块卡、实现三处无第二真相

#### 场景：语义变更可追溯
Given 未来的 SillyHub 协作方查阅契约
When 读到语义变更记录节
Then 能获知 transition 语义在 v1 存续期内何时变过、旧语义是什么、消费侧影响评估结论（旧语义非法转移会被 exit_code 三分支判「推进」，改约对消费方有利）

## 非功能需求
- 兼容性：schema_version 保持 1；既有 machine-interface.test.mjs 断言零回归；全量测试套件绿；Windows/Linux 双平台（纯 JS 无平台面）
- 可维护性：码表冻结（Object.freeze），扩码走变更流程；parity 测试钉死文档目录格式

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-03 | 加法式键与零破坏兼容 |
| D-002@v1 | FR-02 | 恰 10 码范围边界 |
| D-003@v1 | FR-04 | 三项对账 + 模块卡同步 |
| D-004@v1 | FR-01, FR-02, FR-03 | 单一源 + parity 双向 |
| D-005@v1 | FR-04 | 语义变更记录节 |
