---
author: qinyi
created_at: 2026-09-20 08:25:18
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 平台消费方（SillyHub daemon） | 读 `scope-audit --json` 的 rows/repos 投影出变更中心对账卡（外仓独立变更，本仓只定型契约） |
| agent / 用户 | 跑 `sillyspec scope-audit --change <c> [--json] [--file <p>]` 查多仓变更真实对账 |
| verify 阶段 | 旁支消费 reconcileCrossRepoDeclarations（锚点经共享内核升级，advisory 定位不变） |

## 功能需求

### FR-01: 跨仓条目按仓真实对账
Given 多仓变更（design 清单含跨仓子段/`cross-repo:` 前缀条目，repoKey 已在 local.yaml repos 注册）且变更已进入 execute（非预执行形态）
When computeChangeScopeAudit 运行
Then 跨仓行携带真实 `verdict`（planned/unplanned/untouched 三态，按该仓 actual × 声明面差集）、`additions/deletions/kind`（该仓锚点窗口行数）、`crossRepo: repoKey`；不再恒 untouched

### FR-02: 锚点分级
Given collectRepoActual 对某跨仓仓采集
When 依次判定锚点
Then 按优先级取首个可得档：①reviews-range（execute-runs task review 的 base..head 区间文件集并集，有 diffPaths 按其收窄，∪ 该仓 status 未提交）②head~1-window（HEAD~1..HEAD ∪ status，降级注记）③head-uncommitted-window（仅 status，降级注记）④degraded（三类判据：仓未注册/注册路径不可达/git 不可用含非仓库〔diff 与 status 双源失败合并判定〕→ degradedReason 非空、无 actual、不炸整体）；anchor 携带 {source, base, head, label} 结构化字段；行数采集不进内核（防循环 import）——由调用方对内核产物跑 collectNumstatByPath

### FR-03: --json 契约仓库维度（第一交付物，additive）
Given `scope-audit --change <c> --json`
When 计划侧含跨仓条目且非预执行形态
Then 信封新增 `repos: [{key, repoPath, anchor, totals{files,additions,deletions,planned,unplanned,untouched}, degraded, degradedReason}]`（main 条目始终首位）；行级跨仓行如 FR-01；主仓行形状逐字段不变；单仓变更/预执行视图零新增字段——输出与 v1 逐字节等价；仓不可达三类态各出对应 degradedReason 文案（cross-repo-reconcile 同款边界）

### FR-04: 预执行与降级形态
Given 变更未进入 execute（主仓三信号全无+四类证据全缺）或某跨仓仓 degraded
When computeChangeScopeAudit 运行
Then 预执行形态跨仓行保持清单视图（untouched+crossRepo 标注，不调内核——B/C 档 status 会捕该仓他人脏文件）；degraded 仓跨仓行退 ⊘ 形态+降级注记进 note，主仓表不受影响

### FR-05: 文本表与 --file
Given renderScopeAuditTable / getFileDiff 消费含跨仓行的结果
When 渲染/查询
Then 跨仓行 label 为真实三态带仓标（如「✓ 计划内 [sub-grid-security]」，degraded 仓保留 ⊘）；表尾出 per-repo 汇总行（仓 key/锚点档 label/三态计数）；`--file` 跨仓行路由该仓根按该仓锚点出 diff（A 档优先 `git diff base..head -- file`，跳过主仓冻结 patch 捷径防误报窗口外）

### FR-06: 快照与冻结语义
Given execute --done 落快照 / 查询面读快照
When 结果对象含跨仓真实行与 repos[]
Then 新快照自动冻结（落盘链零改动）；查询面跨仓照快照回放（settled 回放 return 增量透传 snap.repos，旧快照无键不输出）；settled needsStats 行数补采**跳过 crossRepo 行**（补采对主仓根跑，跨仓行会落 {0,0,'deleted'} 伪数据——违反「不出伪数据」）；存量旧快照（无 repos、跨仓恒 untouched）照旧 ⊘ 输出+note「快照冻结于跨仓对账上线前，跨仓段未对账」；scope-audit.patch 保持主仓单仓、patchSha256 校验语义不变

### FR-07: 共享内核单一真相源
Given scope-audit 与 verify-postcheck 两消费方
When 跨仓 per-repo 采集
Then 均消费 collectRepoActual 共享内核（仓解析/路径归一/大小写折叠/porcelain 解析/锚点分级单点实现，行数采集留调用方）；reconcileCrossRepoDeclarations 签名增量可选参数 {runtimeRoot, changeName}（A 档 reviews 解析，缺省 null 跳 A 档向后兼容），verify-postcheck 调用点传参贯通；声明差集逻辑与既有字段形状不变，增量携带 anchor 字段；verify notes 文案按 anchor.label 动态化

## 非功能需求
- 兼容性：单仓变更逐字节等价；`computeChangeScopeAudit` 入参签名不变；buildFrozenPatch/patchSha256 链不变；旧快照读取兼容
- 健壮性：全链 fail-soft（D-006）——内核异常 → 跨仓组退 v1 ⊘ 形态+degradedReason，主仓表不受影响
- 跨平台：路径正斜杠归一、Windows 盘符/相对注册路径、win32/darwin 大小写折叠
- 纯读：不写门禁状态、不落进度库、不新增运行时文件类型

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01/02/03/07 | 共享内核+锚点分级方案 A；repos[] 仅多仓输出保单仓等价 |
| D-002@v1 | FR-05/06 | 快照 json 自动继承；patch 主仓单仓；--file 跨仓走锡点区间 diff |
