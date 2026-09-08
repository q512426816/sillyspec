---
author: qinyi
created_at: 2026-09-09 05:11:44
scale: large
---

# 设计文档（Design）— 2026-09-09-doctor-noai

## 背景

doctor 阶段现恰 6 步（Grill 核正）以 prompt 教 agent 跑 bash for 循环 / node --input-type=module 直连 sqlite / curl 探测再「汇总，不要编造」——每步一轮 agent、探测逻辑与 `sillyspec doctor --json`（doctor-diagnostics：multi_db/pointer_health/changes_split/change_db_consistency/doc_bloat 等八维）双轨漂移。轮次经济学 §3.1 定性：doctor-diagnostics 已覆盖 SillySpec 内部探测（含 orphan_dirs——2026-09-09 评审修正），净增三类即可折叠。

## 设计目标

- **FR-01 阶段折叠**：doctor 前「SillySpec 内部检查/构建环境/外部依赖」三大 agent 步 → 一个 noAI 步 `_cliAction: doctorRunDiagnostics`（跑 runDoctorDiagnostics + 渲染人类可读摘要）；agent 步保留「解读诊断 → 修复决策 → 执行修复」。
- **FR-02 三类探测器**：worktree 健康（git worktree list × .runtime/worktrees 目录对账 + 残留 sillyspec/* 分支）、构建环境（node 版本 vs package.json engines / 包管理器存在性）、MCP 端点配置在场性（Context7/grep.app 配置文件——零网络请求）。只读 fail-soft，进诊断信封与 --json。
- **FR-03 文档同步**：doctor.js prompt 重写、docs/prompt 镜像、模块卡 + sidecar、file-lifecycle doctor 步骤描述同步。

## 非目标

- 写操作合并（D-003：--confirm flag + dry-run 默认不动）。
- 诊断信封 schema 变更（复用既有 {name,label,pass,severity,findings,safe_actions}）。
- quick/auto 流程改动。

## 拆分判断

探测器与折叠同变更（探测器是折叠的前置——noAI 步要能输出完整诊断）；两 task 串行（同文件面 doctor-diagnostics/doctor.js）。

## 总体方案

### Phase 1：三类探测器（task-01）

doctor-diagnostics.js 新增（全部只读 fail-soft，风格对齐既有 detector）：

- `detectWorktreeHealth(cwd)`：**复用 WorktreeManager.doctor()**（worktree.js:1207-1450——Grill 附加 gap 修正，不重写；其已含 worktree 对账/平台防线）薄封装成 dimension 形状；分支残留对账（sillyspec/* vs 活跃变更）为本封装新增补充。锚定主仓根 .sillyspec/.runtime/worktrees（worktree.js:24——勿用 runtimeRoot，平台模式分离只影响 execute-runs 族）。
- `detectBuildEnv(cwd)`：process.version vs package.json engines.node（semver 简化比较 ^/>= 前缀）；包管理器存在性（packageManager 字段 / lockfile 推断 → which 检测）。
- `detectMcpEndpoints(cwd)`：读 `.cursor/mcp.json` / `.claude/settings.json` / `.mcp.json` 等常见位置查 Context7/grep.app 键（在场性 + 缺失提示，零网络）。

三 detector 并入 runDoctorDiagnostics 数组 + formatDoctorJson 自动携带（现有机制）。探测异常 → 返回 skipped 注记维度（带内降级，对齐 :337-341 等既有惯例——Grill 修正，不返回 null）。MCP 检测为**项目级**配置在场性（.cursor/mcp.json/.mcp.json/.claude/settings.json——覆盖面变化显式声明：doctor 是项目自检非家目录审计）。

### Phase 2：阶段折叠（task-02，Grill 三 blocker 修正版）

**前置破局（BLOCKER-A）**：doctor 现属 READONLY_AUXILIARY_STAGES（constants.js:94-97）——`run doctor` 在 command.js:970-991 只读短路，永远到不了 runStage 的 _cliAction 派发。修法：doctor 移出 READONLY_AUXILIARY 入普通 AUXILIARY（command.js 只读判据读该常量——联动自动生效，无需改码）——`sillyspec run doctor`（阶段形态，agent 修复流程）与顶层 `sillyspec doctor`（独立只读诊断命令，index.js 1981 一带）语义本就双轨：后者不动（只读零副作用承诺保留），前者本就该走状态机（阶段流程有修复写操作步，只读短路是历史误设）。
**顶层非 --json 路由（Grill 复审 P0 补）**：index.js:1989-1991 非 json 顶层 doctor 现委托 runCommand 走同一被改路径——本变更为其改道：非 --json 顶层 `sillyspec doctor` 直接跑 runDoctorDiagnostics + renderDoctorSummary 输出（不进 runCommand/不 initChange/不刷 lastActive——只读零副作用承诺对该命令形态保真；`doctor --status` 改由 index.js case 头部拦截直调等价只读渲染（command.js 只读块随常量移除失效——计划审查 P0 修正））。无/多活跃变更守卫随路径改道自然免疫（不再走 initChange 分支）。index.js 入文件清单。

- stage.js 注册 `doctorRunDiagnostics` _cliAction 分支（跑诊断 + renderDoctorSummary + writeDoctorDiagnosis）；complete.js --done 的 noAI 分支同步注册（:384 未知分支 throw 面）。
- **新步骤清单（BLOCKER-B 修正，从 6 步 → 3 步全枚举）**：
  1. noAI `_cliAction: doctorRunDiagnostics`：八维既有 + 三新 detector + **模块文档健康**（modules.js 模块卡一致性校验 :324/:520 + docs-debt computeDocsDebt behind 计数——原步 4 的 CLI 可算部分；Grill 复审批注：computeModuleDebt 不存在，真实来源在 modules.js）+ **决策版本漂移**（原步 5 的 CLI 可算部分：knowledge decisions implemented 锚点 vs CLI 版本）；输出 = renderDoctorSummary 报告 + doctor-diagnosis.json 落盘。
  2. agent「修复决策与执行」：读 step1 报告，对每个 ⚠️/❌ 维度按 safe_actions/next_step 决策（修/豁免/搁置），可执行的修复当场做（doctor --confirm 写操作按 D-003 独立 flag 语义调用）；原步 5 的语义复核部分（决策该不该复核）并入本步。
  3. agent「汇总」：修复清单 + 剩余风险 + 建议（原步 6）。
- renderDoctorSummary 为**全新输出契约**（BLOCKER-C 修正——顶层无既有渲染可抽）：逐维 `✅/⚠️/❌ <label>` + findings 首行 + safe_actions 提示行；测试锁关键行格式。

### Phase 3：文档（task-03）

doctor.js prompt（如上）+ docs/prompt/doctor.md 镜像 + stages/core-engine 卡与 sidecar + file-lifecycle.md doctor 步骤描述。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/constants.js | doctor 移出 READONLY_AUXILIARY_STAGES（阶段形态走状态机；顶层 sillyspec doctor 命令只读语义不变） |
| 修改 | src/index.js | 顶层非 --json doctor 改道：直跑诊断 + renderDoctorSummary（不走 runCommand/initChange——只读承诺保真）；--json/--status 分支不动 |
| 修改 | src/run/complete.js | --done noAI 分支注册 doctorRunDiagnostics（未知分支 throw 面 :384） |
| 修改 | src/doctor-diagnostics.js | 三 detector（只读 fail-soft）+ renderDoctorSummary（全新契约——顶层与 _cliAction 共用的新渲染函数）。数据流：producer=git/fs 探测 → 诊断信封 → consumer=doctor CLI/--json/_cliAction 步 |
| 修改 | src/run/stage.js | 注册 `doctorRunDiagnostics` _cliAction 分支（跑诊断+渲染+落盘，advance 自动） |
| 修改 | src/stages/doctor.js | steps 重排：noAI 诊断步替换三大 bash 教学步；修复决策步 prompt 重写（消费诊断报告而非自跑探测） |
| 修改 | docs/prompt/doctor.md | 镜像 |
| 修改 | docs/prompt/_extracted.json | 镜像数据 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md（+sidecar） | doctor 阶段折叠登记 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md（+sidecar） | 三 detector 登记 |
| 修改 | docs/sillyspec/file-lifecycle.md | doctor 步骤描述同步 |
| 新增 | NEW:test/doctor-noai-fold.test.mjs | 三 detector 单测（fixture 造残留 worktree 目录/engines 不匹配/缺 mcp 配置）+ doctor steps 结构断言（noAI 步在场、bash 教学步退场）+ renderDoctorSummary 冒烟 |

## 接口定义

```js
// doctor-diagnostics.js（新增导出）
export function detectWorktreeHealth(cwd)   // → dimension（git 不可用 → {name, skipped:原因} 带内降级维度）
export function detectBuildEnv(cwd)         // → dimension（无 package.json → skipped 注记）
export function detectMcpEndpoints(cwd)     // → dimension（无配置文件 → skipped 注记）
export function renderDoctorSummary(diagnostics) // → string（人类可读逐维摘要，CLI 顶层与 _cliAction 共用）

// run/stage.js（_cliAction 分支）
else if (cliAction === 'doctorRunDiagnostics') { await executeDoctorRunDiagnostics(cwd) }
// 内部：runDoctorDiagnostics + renderDoctorSummary + writeDoctorDiagnosis（既有 fail-soft 落盘）
```

## 生命周期契约表

不涉及生命周期契约（诊断只读，无事件/状态机新增）。

## 数据模型

无 DB schema 变更。.runtime/doctor-diagnosis.json 落盘复用既有（--json 路径）。

## 兼容策略（brownfield 必填）

- 三 detector 探测异常 → skipped 注记维度（带内降级不缺项，对齐 :337-421 既有惯例——Grill 复审统一）。
- `sillyspec doctor` 顶层命令输出增三维度（纯增量，既有消费方 doctor --json 的 daemon 侧按 name 订阅，未知 name 忽略）。
- doctor 阶段在途变更：进度库步骤表与新版 definition 漂移由既有「步骤表漂移原样重跑自愈」机制兜底（command.js:158-199 ensureStageSteps 按名重播种 + :1324-1353 fail-closed 提示原样重跑——Grill 已证实存在）。
- 修复执行步与 --confirm 写操作语义零变化（D-003）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | renderDoctorSummary 是全新输出契约（顶层无既有人类可读渲染——Grill BLOCKER-C） | P2 | 格式在设计定稿（逐维图标+label+findings 首行+safe_actions）；测试锁关键行；无既有消费方可破坏 |
| R-02 | 复用 WorktreeManager.doctor() 的封装边界（其输出非 dimension 形状） | P1 | 薄适配层只做形状转换不重复探测；平台防线（:1259-1263）随复用继承 |
| R-03 | engines 语义比较简化误判（复杂 semver 区间） | P2 | 只处理 ^x/>=x/=x 前缀（覆盖 npm 默认产物），复杂区间标 unknown 不判红 |
| R-04 | UI 原型：无界面，跳过 | P2 | 纯 CLI |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 + Phase 2（折叠/复用） | 已覆盖 |
| D-002@v1 | FR-02 + Phase 1（三 detector 只读 fail-soft） | 已覆盖 |
| D-003@v1 | 非目标 + 兼容策略（写操作不动） | 已覆盖 |

## 自审（Self-Review）

- [x] 章节齐全 / frontmatter / D 映射全 / 生命周期豁免短语 / 原型跳过 R-04
- [x] 无存疑项（renderDoctorSummary 抽取是唯一契约敏感点，R-01 有锁定方案）
