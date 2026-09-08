---
author: qinyi
created_at: 2026-09-09 04:19:26
scale: large
---

# 设计文档（Design）— 2026-09-09-plan-derived

## 背景

plan.md 的 Wave 段与 tasks/*.md 的 depends_on 是同一依赖事实的两份手写表示——「双写漂移」已实证到专门做了 `sillyspec plan-adopt-waves` 收敛命令（坑 wave-manual-mismatch-noise），plan-postcheck:564 注释自认「Wave 口径=显式段 vs topo 比对不一致」是持续噪音源：agent 手排 Wave → postcheck 硬拦 → agent 手改或跑命令 → 重跑 --done。任务总表 W 列重抄 Wave（plan.js:264 自认漂移源）。plan_level（none/light/full）纯 agent 自判，light 即免独立审查，无客观信号锚点。

轮次经济学定稿原则：**手写机器要读的格式 → CLI 派生渲染**。Wave 本就是 depends_on 拓扑的确定性函数（topoSortWaves），应降级为派生视图。

## 设计目标

- **FR-01 Wave 违规自动修复**：plan --done 检出依赖方向违规 → 拓扑提案经一致性+同 Wave 文件重叠双验证后自动落盘（Wave 段+W 列）；合法手工布局（保守串行）永不改写、静默放行。
- **FR-02 修复回执**：自动修复落回执行（违规明细→提案验证结果→落盘段数），plan.md 无静默变更；提案不干净时保留原文并透出冲突明细。
- **FR-03 plan_level 客观复核**：--done 时用 design 文件清单数/模块跨度比对声明档位，不一致 → warning（不阻断，agent 可豁免说明）。
- **FR-04 文档同步**：plan.js prompt 删手排指引（改「Wave 由 --done 自动派生」）；docs/prompt 镜像；模块卡 sidecar。

## 非目标

- execute 解析口径变更（buildExecuteSteps/parseTaskWavesFromPlan 零改动，D-004）。
- plan_level 接管判定（只加第二把尺子 warn，D-003）。
- 任务总表整行派生（仅 W 列，D-002）。
- Wave 手排禁令的强拦截（归一优先于拦截——agent 预排正确的 Wave 归一零改动幂等）。

## 拆分判断

三件事同消费 depends_on→topo 单源、同落 plan --done 链路，不拆。非批量。

## 总体方案

### Phase 1：Wave 依赖违规自动修复（task-01）

改造点 = executePlanPostcheck 的 section 2「Wave 重排」（:1593-1685，唯一比较器，就地重构不另开）。三类失配分流（Design Grill 首轮 P0 修正：手工保守串行是现行合法安全模式——plan.js:431-434 主动教学「共享文件分 Wave」，自动归一合并它会制造同 Wave 冲突陷阱）：

1. **方向违规**（depends_on 同 Wave / 后置 Wave，:1666-1681 现 throw）：拓扑布局方向必然合法 → **提案-验证-落盘**三段式自动修复：
   a. `adoptPlanWaves({ changeDir, mode: 'proposal' })` 产拓扑布局提案（不落盘）；
   b. 提案验证：①蓝图一致性复跑（同 check 1 口径含 repoRegistry）②**同 Wave 文件面重叠**（逐 Wave 两两 allowed_paths 交集——topo 只看依赖看不见重叠）；
   c. 干净 ⇒ 落盘（Wave 段 + W 列）+ 回执「🔧 Wave 依赖方向违规已按 depends_on 拓扑自动修复（N 段）」，继续后续检查；不干净 ⇒ 保留手排原文，throw 原失败信息（真冲突需人裁决，adopt 提示改「拆 Wave 或补 depends_on」）。
2. **结构不一致但方向合法**（保守串行/等价重组，:1676-1681 现打印 ⚠️ 提示）：**静默放行**（合法模式，消每轮提示噪音；CLI adopt 命令保留手动对齐出口）。
3. **结构一致**：✅ 不变。

adoptPlanWaves 现有防误删护栏（段内非引用内容拒绝重写/LF/幂等）全部保留；`mode: 'proposal'` 为新增只读档。topoError（环）维持 throw。

### Phase 2：plan_level 客观复核（task-02）### Phase 2：plan_level 客观复核（task-02）

plan --done 时（executePlanPostcheck 尾部）：读 design 文件清单条数 + 模块跨度（_module-map 前缀命中不同模块数）+ task 卡数，与 plan.md frontmatter plan_level 比对：

- plan_level=light/full 且 文件数 > 8 或 模块跨度 > 2 → warning「声明 <档> 但客观规模信号偏大（X 文件/Y 模块/Z task）——若确属轻量请在 plan.md 附一行理由，否则建议 full（独立审查）」；
- plan_level=full 且 ≤2 文件单模块 → 提示性 warning（可选降档，非强制）。
- 阈值常量单点（PLAN_LEVEL_SIGNALS），warning 不阻断。

### Phase 3：prompt 与文档（task-03）

plan.js「生成计划」步 Wave 指引（:431-434 共享文件分 Wave 教学保留）补一句：「依赖方向违规（同 Wave/后置 Wave 依赖）在 --done 时会按拓扑自动修复；共享文件的手工分 Wave 是合法安全模式，不会被改写」；审查清单措辞同步。docs/prompt 镜像（_extract/_sync）+ stages 卡 + sidecar。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/plan-adopt-waves.js | 既有 adoptPlanWaves 扩展：mode=proposal 只读档 + rewritten/conflicts 返回字段（核心逻辑已在函数内，增量小）。数据流：producer=collectTaskDepMap+topoSortWaves（同源）→ adoptPlanWaves(proposal) → consumer=postcheck 提案验证落盘/CLI 命令 |
| 修改 | src/stages/plan-postcheck.js | section 2（:1593-1685）就地重构：方向违规→提案-验证-落盘；合法串行→静默；validateWaveProposal + PLAN_LEVEL_SIGNALS 单点；plan_level 复核尾部接入 |
| 修改 | src/stages/plan.js | 「生成计划」步 Wave 指引改派生口径；审查清单措辞同步 |
| 修改 | docs/prompt/plan.md | 镜像（_extract/_sync） |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md（+sidecar） | 归一接线与 prompt 变更登记 |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md（+sidecar） | adoptPlanWaves proposal 档登记 |
| 修改 | docs/prompt/_extracted.json | 镜像（随 plan.md 同步） |
| 新增 | NEW:test/plan-wave-autoderive.test.mjs | 违规→提案干净→自动修复回执；违规→提案脏（同 Wave 重叠 fixture）→保留原文仍拦；合法串行→静默零改写；幂等；plan_level 复核 warn 分支 |
| 修改 | test/plan-adopt-waves.test.mjs | §4/§4b 方向违规断言随自动修复翻转（改锚定修复回执；「仍拦」分支由脏提案 fixture 承接，Design Grill 复审 P1） |

## 接口定义

```js
// plan-adopt-waves.js（扩展既有 adoptPlanWaves——不另起新 API，Design Grill P2 修正）
export function adoptPlanWaves({ changeDir, dryRun = false, mode = 'write' })
// mode='proposal'（新增）：只读产提案 { waves: string[][], planMdDraft: string } 不落盘
// 返回扩展：{ ok, rewritten: boolean, waves: string[][], conflicts: string[]（同 Wave 文件重叠/护栏拒绝，可空）, postcheck }
// CLI 命令行为等价（输出契约由既有测试锁定；「逐字节不变」放宽为行为等价）

// plan-postcheck.js（section 2 就地重构，内部）
function validateWaveProposal(changeDir, waves) // 一致性复跑（validateBlueprintConsistency 加可选 waves 覆盖参——提案验证不落盘，读侧注入而非改 plan.md）+ 逐 Wave allowed_paths 两两交集
const PLAN_LEVEL_SIGNALS = { files: 8, modules: 2 } // plan_level 复核阈值单点
function reviewPlanLevelSignal(changeDir, planLevel) // → warning|null
```

## 生命周期契约表

不涉及生命周期契约（plan 完成门禁的判定条件变更，非新事件契约）。

## 数据模型

无 DB schema 变更。plan.md Wave 段/W 列格式不变（消费侧透明，D-004）。

## 兼容策略（brownfield 必填）

- 提案生成/验证异常 → 回落现状行为（方向违规照旧 throw），零新阻断面；none/light 无 task 卡变更 section 2 本就跳过（taskFiles 守卫保留）。
- agent 预排正确/保守串行的 Wave：零改写零输出（静默）。
- 存量变更（已过 plan）：不受影响（归一只在 --done 触发）。
- plan-adopt-waves CLI 命令行为等价（输出契约由既有测试锁定）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 自动修复触碰合法手工布局（保守串行——plan.js:431-434 教学的共享文件分 Wave 模式） | P0 | 方案已按 Grill P0 重设计：自动修复仅作用于方向违规（手排必错态）；合法串行静默放行永不改写；提案先验证同 Wave 重叠再落盘，不干净保留原文 |
| R-02 | 提案引入同 Wave 文件重叠（拓扑合并本就隔 Wave 的共享文件） | P1 | 提案验证含逐 Wave allowed_paths 两两交集，命中即弃提案保原文（不落盘无回滚需求） |
| R-03 | plan_level 复核误伤（大文件清单但确属轻量） | P2 | warning 不阻断 + 豁免说明出口（一行理由） |
| R-04 | UI 原型：无界面变化，跳过生成 | P2 | 纯 CLI/门禁/文档变更 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 + Phase 1（自动归一 + 安全冲突仍拦） | 已覆盖 |
| D-002@v1 | FR-01（W 列随 adopt 同步，现成） | 已覆盖 |
| D-003@v1 | FR-03 + Phase 2（第二把尺子 warn） | 已覆盖 |
| D-004@v1 | 非目标 + 兼容策略（execute 零变更） | 已覆盖 |

## 自审（Self-Review）

- [x] 章节齐全 / frontmatter 齐全 / 全部当前版本 D 映射 / 生命周期豁免短语在位 / 原型跳过依据 R-04
- [x] 无存疑项（adopt 函数提炼是唯一结构性改动，命令行为不变有测试锁）
