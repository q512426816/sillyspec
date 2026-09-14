---
author: qinyi
created_at: 2026-09-14 01:28:15
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者（agent） | 按 AGENTS.md 规则选道并执行变更，消费 [gate] 提示补检查项 |
| CLI（quick --done 审计链） | 计算 changedFiles 的 git 事实 → 调画像 → 分级输出 advisory |
| 审查者/人类 | 经 scope-audit 表格与 --json 出口消费画像、审计豁免留痕 |

## 功能需求

### FR-01: 选道判据语义化（规则面改写）
覆盖决策：D-001@v1
Given AGENTS.md 第 6 条与 templates/agents-instruction.md 现行「≤3 文件、范围明确走 quick」
When 规则面改写落地
Then 两处文案的主判据均为「本次改动有无需要落盘的设计决策」（有→完整流程，无→quick），文件数仅作为出口绊线提法出现，不再是选道主判据

### FR-02: 门禁画像信号（纯函数）
覆盖决策：D-002@v1, D-004@v2, D-006@v1, D-007@v1
Given changedFiles（CLI 审计链 git 事实，非 --files 自声明）与 module-map 解析结果
When 调用 src/quick-gate-profile.js 的 computeGateProfile(changedFiles, moduleIndex, opts)
Then 返回画像对象：fileCount/codeFileCount/testFileCount（计数口径见 design.md 接口定义）、moduleSpan、modules、unmappedFiles、riskHits（仅路径模式 {pattern, file}）、level ∈ {L0,L1,L2}、degraded、checks{perFileNotes, testDelta, docClaim, runtimeEvidence}；判定全部在函数内完成、无 IO、阈值集中于 THRESHOLDS 单点

Given 项目未 scan / 无 _module-map.yaml（moduleIndex 为空）
When 调用 computeGateProfile
Then degraded=true、moduleSpan=null、跨度退出判级（L1=≥4 文件、L2=≥8 文件或风险命中），不抛错不阻断

### FR-03: quick --done 分级门禁（advisory）
覆盖决策：D-002@v1, D-003@v1, D-005@v1
Given quick --done 收尾，审计链已算出 changedFiles 与画像
When level=L1（跨≥2 模块或≥4 文件）
Then [gate] 块提示每文件注记检查（--file-notes 覆盖率）与测试增量检查（codeFileCount≥2 且 testFileCount===0 → missing），advisory 不阻断

When level=L2（跨≥4 模块或风险路径命中）
Then [gate] 块追加模块文档认领检查（触及模块的卡片文件在 changedFiles → claimed）与运行时证据要求提示；`--no-docs` 显式豁免时 docClaim=exempt-no-docs 且豁免留痕进 quicklog auditNotes

When 审计发现未声明脏文件
Then 走既有归属分流（--files 追加声明指引），不并入文档认领检查（D-005）

Given 任意 L1/L2 检查项缺失
When --done 完成
Then 全部为 warn+auditNotes 落账、exit 不受影响（advisory；升 blocking 是另立变更的显式决策）

### FR-04: scope-audit 画像出口（双出口 + 重放）
覆盖决策：D-008@v1
Given sillyspec scope-audit --change <变更名或quick会话id>
When 表格出口
Then renderScopeAuditTable 含画像段（级别/跨度/模块清单/命中/缺失检查项）

When --json 出口
Then JSON 含 gateProfile 字段（结构同 FR-02 返回值）
Given 已归档变更或历史 quick 会话（冻结记录态，仅 rows 路径）
When 重放 scope-audit
Then 画像可重放（路径模式下实时态与重放态字段一致），既有三态对账表/归属表/--file 出口零回归

### FR-05: 阈值校准（实证任务）
覆盖决策：D-006@v1
Given THRESHOLDS 初值（L1_SPAN=2/L1_FILES=4/L2_SPAN=4/L2_FILES_DEGRADED=8）与 sillyhub 历史 quick 会话
When 用 scope-audit --json 按真实 _module-map.yaml 批量重放并重算交叉表
Then 校准后阈值定稿回写 THRESHOLDS 常量并在设计/模块卡记录依据；若初值与重算显著冲突，升级用户裁决

## 非功能需求
- 兼容性：未 scan 项目 degraded 降级零强制变化；不传 --no-docs 行为不变；verify 侧 detectChangeRisk 判级零变化；scope-audit 既有出口零回归（gateProfile 为增量字段，消费方按存在性读取）
- 可回退：门禁 advisory 面整体不消费即静默；代码回退等价于删除 Wave 2 接线三行调用，信号模块独立无副作用
- 可测试：画像纯函数矩阵单测（span×files×risk×降级×testDelta×fileNotes）；audit 三态集成；scope-audit 双出口回归

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 选道判据语义化 |
| D-002@v1 | FR-02, FR-03 | 出口分级门禁不新增车道 |
| D-003@v1 | FR-03 | advisory 起步稳定后升 blocking |
| D-004@v2 | FR-02 | 风险命中 v1=路径模式，diff 维度延后（supersedes D-004@v1） |
| D-005@v1 | FR-03 | 未声明脏文件走归属分流 |
| D-006@v1 | FR-02, FR-05 | 阈值真实图谱重算校准 |
| D-007@v1 | FR-02 | 独立纯函数模块形态（方案 B） |
| D-008@v1 | FR-04, FR-05 | scope-audit 双出口+重放=校准数据源 |
