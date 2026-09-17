---
author: zcode-feedback-hardening
created_at: 2026-09-17
generated_by: agent
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-17-feedback-hardening

## 背景

2026-09-17 用户工具使用小结负面三条（正面项：worktree 隔离流水线/探针矩阵防篡改/apply --check-only 不属修复面）。逐点源源码勘察确认根因：

1. **verify lint 门环境缺陷（build-id 坑）**：`src/run/gate-snapshot.js` 隔离快照 = HEAD worktree + 会话文件 overlay + 环境目录 junction；friction5-hardening D-002@v1 落地的 `gate_snapshot.copy` 只能从主仓 **junction/复制现态**——主仓侧生成物缺失（fresh clone 未跑 postinstall）或过期（构建期产物随版本变）时供给的是缺失/陈旧态，快照内全量 lint/test 环境性必挂（用户实证「全量快照必挂」，建议「工具侧在快照供给链补 postinstall」）。copy 酒只搬「主仓现有态」，不能产出「本仓应然态」。
2. **探针7 证据锚点摩擦**：硬门 `stage-contract.js matrixEvidenceHasAnchor` 收三形态（`.test.` / file:line / 反引号）；但预填说明（`verify-probes.js:963`）写「证据列给首命中 file:line 锚点**或人工核验提示**」——后半句对 covered/partial 过不了硬门（误导）；advisory（`probe7-anchor-check.js`）只认两形态且文案施压「审查会要求回补」——反引号路径（行号漂移场景正解）过硬门仍被催补行号，agent 三轮往返。
3. **轻量计划口径打架**：`stages/plan.js:199` 宣称「light 级 plan.md 无任务区——execute 自动把注册表合成为单个隐式 Wave 串行执行」，`execute.js:663` 注释同款；但 buildWavePrompt 对隐式 Wave 实际下发「同一 Wave 的多个子代理必须并行启动」（:1330）——真实行为全并行；`plan-postcheck.js:594-599` 按全并行口径硬拦「无显式 Wave + 多 task 共享路径」，用户被迫补 6 个 Wave 段。

## 设计目标

- 三处摩擦逐一收口，全部增量式：存量合法产物的门禁判定逐一不变（零新假阴性/零新阻断）
- 复潮条目按 decisions 路由规则记 @v2 新版本并注明 supersedes 源与复潮依据（D-002@v2 / D-005@v2）；新决策 D-003@v1 含 B/C 否决理由
- 每 FR 配直测（纯函数优先，不依赖真实 git 仓的用例不建仓）

## 非目标

- 不做快照内 package.json postinstall 自动探测执行（B 否决）；不做 lint 按报错文本豁免启发式（C 否决）
- 不动 stage-contract 硬门三形态口径本身（只对齐 advisory 与预填说明）
- 不做 postcheck 自动拓扑补 Wave 段（C 否决——CLI 静默改写 agent 产物破坏分工）
- 不动显式 Wave 语义：同 Wave 共享 allowed_path 的 error、「必须并行启动」调度指令对显式 Wave 均维持
- 不做 worktree create 侧 supplyCommands（本变更只收口门禁快照链；worktree 侧已有 supplyFiles 同类机制，如需另行立项）

## 拆分判断

三修复同属「门禁摩擦收敛」主题，模块相邻（gate-snapshot/verify-probes/stage-contract/plan-postcheck/execute 均为门禁与调度面），单变更三 FR 交付；无批量模式特征。

## 总体方案

**Phase R1（FR-01）快照供给链命令面**：
- `gate-snapshot.js` 新增 `parseGateSnapshotCommands(yamlText)`（与 parseGateSnapshotCopy 同风格的段内单键扫描，认 `commands:` 块列表/inline flow）与 `runGateSnapshotCommands(snapshotRoot, commands)`（逐条 spawnSync shell、cwd=快照根、timeout 300s/条、非零/超时 warn 继续）。
- createGateSnapshot 接线点：环境目录链接+完整性预检（envMissing 检查）之后、applyGateSnapshotCopy 之前。理由：①命令可用的依赖（node_modules/venv junction）已就位；②命令产出真实文件 → copy 面 dst 已存在即跳过（新鲜度优先），且天然规避「命令写穿 copy 面 junction 回主仓」；③local.yaml 复制段在 copy 面之后，命令配置从主仓 cwd 读取（与 copy 键同源，agent 可写的快照内副本不采信）。
- 执行段打印一次警示：命令不得改写 node_modules 等环境目录（活链接，写穿透主仓）。

**Phase R2（FR-02）探针7 锚点口径对齐**：
- `verify-probes.js` 预填说明改写：明示三形态 + 行号可省 + uncovered/non-testable 自由形态，删「或人工核验提示」。
- `probe7-anchor-check.js` 判定补第三形态（本地正则，不 import stage-contract——维持零依赖单文件定位），头注释口径更新（D-005@v2）。
- `run/gates.js` advisory 文案同步三形态。

**Phase R3（FR-03）隐式 Wave 串行**：
- `execute.js buildWavePrompt`：`wave.implicit` 时——返回头 `## Wave 1（隐式合成——plan.md 无显式 Wave 划分，串行执行）`；「你的角色」清单第 1 条与「调度要求」第 1 条换为串行铁律（禁并行启动；单子代理逐个完成或逐个启动等待完成）；batch 指引保留（batch 本身就是串行形态，天然合规），但条件 2 括注内嵌的「契约 task 由独立子代理**并行处理**或落在不同 Wave」（:1274）在隐式分支收敛为「契约 task 由独立子代理逐个（串行）处理或落在不同批次」——与串行铁律同口径，防同一 prompt 内自相矛盾（Design Grill P1）。
- 检查 0.8 错误文案重述：未识别 Wave 标题 → 引用行不被收容、任务退化为隐式串行（Wave 结构意图丢失）。
- `plan-postcheck.js` waveOfTask===null 分支：error → warning（措辞：execute 隐式单 Wave 串行执行，共享文件安全；显式分 Wave 可获并行收益，同 Wave 内仍禁共享文件）。注释同步（:590-591 全并行口径改为串行口径）。
- `test/plan-optimization.test.mjs` Test 5f 断言随行（error→warning + 新措辞锚点）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/gate-snapshot.js | 新增 parseGateSnapshotCommands + runGateSnapshotCommands（内部导出供直测）；createGateSnapshot 环境预检后、copy 面前接线执行段。数据流：producer=主仓 `.sillyspec/local.yaml` `gate_snapshot.commands`（string[]）→ parseGateSnapshotCommands（本地正则解析，剥尾注/引号，块列表+inline flow）→ consumer=createGateSnapshot 执行段（cwd=快照根逐条执行；快照内 local.yaml 副本不采信——配置恒从主仓 cwd 读） |
| 修改 | src/config-schema.js | gate_snapshot 段登记 `gate_snapshot.commands` 键（optional，live；desc 含活链接警示与「只放生成物命令」建议）+ 示例注释 |
| 修改 | src/verify-probes.js | renderProbe7Lines 预填说明行改写（三形态+行号可省+两自由形态） |
| 修改 | src/probe7-anchor-check.js | 判定正则补反引号第三形态；头注释口径更新（D-005@v2 supersedes） |
| 修改 | src/run/gates.js | probe7 advisory 提示文案三形态化 |
| 修改 | src/stages/execute.js | buildWavePrompt implicit 分支（头标注+调度要求+角色清单串行措辞）；检查 0.8 错误文案；parseWavesFromPlan 注释扶正（「单 Wave 串行执行」现为真实行为，锚 buildWavePrompt） |
| 修改 | src/stages/plan-postcheck.js | waveOfTask===null 共享路径 error→warning + 注释口径更新 |
| 修改 | test/plan-optimization.test.mjs | Test 5f 断言随行（error→warning，契约变更随行非改测试凑绿） |
| 修改 | test/plan-postcheck-cross-repo.test.mjs | 场景 5 断言随行（同走 waveOfTask===null error→warning 分支，plan-review P1 补漏） |
| 修改 | src/stages/verify.js | 阶段 prompt 锚点措辞三形态化（:163 两形态→三形态+行号可省，D-004@v1 W2 镜像核对发现的同源漂移） |
| 新增 | NEW:test/gate-snapshot-commands.test.mjs | FR-01 直测：解析（块列表/inline flow/尾注/未配置空）/执行段（成功、非零退出 fail-open、未配置零行为） |
| 修改 | test/probe7-anchor-testfile.test.mjs | 反转既有断言：裸反引号证据从「计 missing」改「不再 missing」（:42-49 现断言 missingAnchors.length===2 恰被 D-005@v2 反转）；file:line/.test. 原用例不变 |
| 修改 | test/plan-execute-contract.test.mjs | 补 buildWavePrompt implicit 串行指令断言（头标注+禁并行措辞在场、显式 Wave 原文不变） |
| 修改 | docs/prompt/execute.md、docs/prompt/verify.md、docs/prompt/plan.md | prompt 镜像同步（调度串行段/探针7口径/无 Wave 提示） |
| 修改 | .claude/skills/sillyspec-execute/SKILL.md、.claude/skills/sillyspec-verify/SKILL.md、.claude/skills/sillyspec-plan/SKILL.md | 技能镜像同步 |
| 修改 | docs/sillyspec/troubleshooting.md | 坑③供给链补命令面口径 + gate_snapshot 配置示例扩 commands |

## 接口定义

```js
// gate-snapshot.js（新增，均内部导出）
export function parseGateSnapshotCommands(yamlText) // → string[]（未配置/读失败 → []）
export function runGateSnapshotCommands(snapshotRoot, commands) // → { ran: number, failed: Array<{cmd, reason}> }
  // 逐条 spawnSync(cmd, { shell: true, cwd: snapshotRoot, timeout: 300_000, encoding:'utf8' })
  // 非零/超时：warn（含 cmd 与 tail 输出）继续下一条；返回值供直测断言，不作废快照

// probe7-anchor-check.js（口径扩）
const ANCHOR_RE = /:\d+\b/                        // 不变
const BACKTICK_RE = /`[^`]+`/                     // 新增第三形态（与硬门 matrixEvidenceHasAnchor 同权）
// 判定：ANCHOR_RE.test(evidence) || /\.test\./.test(evidence) || BACKTICK_RE.test(evidence)

// execute.js buildWavePrompt（行为分支）
wave.implicit === true → 头部「（隐式合成——plan.md 无显式 Wave 划分，串行执行）」
                       + 调度要求 1：「隐式 Wave 串行铁律：任务逐个完成…禁止并行启动」
wave.implicit !== true → 原文逐字节不变（「必须并行启动」）
```

## 生命周期契约表

不适用 lifecycle contract——本变更是门禁快照供给/解析口径/调度 prompt 文案与配置键扩展，不新增 session/lease/agent_run/daemon/claim/heartbeat 事件，无状态流转。

## 数据模型

无 schema 变更——进度库（SQLite）表结构与既有 JSON 产物 schema 零改动。local.yaml 新键 `gate_snapshot.commands` 是配置面扩展，config-schema.js 登记即数据源；快照是临时目录，命令执行结果不落 meta（门禁即用即弃，console 输出即审计面）。

## 兼容策略（brownfield 必填）

- **R1**：未配置 `gate_snapshot.commands`（全部存量 local.yaml）→ parse 返回 []，执行段空转零输出，快照构建行为逐字节不变。命令失败 fail-open（warn 不作废快照——与 copy 面同策略，SNAPSHOT_OFF 逃生口仍在）。
- **R2**：file:line 与 `.test.` 锚的 advisory 判定不变；只新增反引号形态的放行（advisory 不阻断，无门禁语义变化）。硬门三形态零改动。预填说明是注释行（`<!-- … -->`），不改表格结构——ensureAcceptanceMatrixSection 幂等口径（段在场不触碰）不受影响。
- **R3**：显式 Wave 的 plan（全部存量 full 级）行为不变——「必须并行启动」、同 Wave 共享路径 error、检查 0.8/0.9 全维持。无显式 Wave 的 plan：plan --done 从 error 转 warning（有意放宽，用户建议方向）；execute 侧隐式 Wave 从「并行指令」转「串行指令」（安全性严格不劣——串行不可能互相覆盖；并行收益经显式 Wave 声明获得）。`implicit: true` 标记与 test/plan-execute-contract 既有断言兼容。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 命令经 junction 写穿主仓依赖目录（node_modules/venv 是活链接） | P1 | 执行段固定打印警示 + config desc 明示「命令不得改写依赖目录，只放生成物命令（gen/build-id 类）」；置位先于 copy 面使命令产出为真实文件 |
| R-02 | 命令慢/挂拖慢每次门禁 | P2 | 每条 300s 超时帽；失败 warn 继续；文档建议只放生成物命令不放 install/build 全家桶 |
| R-03 | shell 注入面（commands 是任意 shell 字符串） | P2 | 信任级与 commands.install/test/lint 相同：主仓 local.yaml 是用户自持配置（worktree 副本不采信）；不加白名单（加白名单即失去「postinstall 类自定义脚本」能力，B 方案否决理由） |
| R-04 | 隐式串行让 full 级 plan 漏写 Wave 段静默退化（慢但安全） | P2 | 检查 0.8/0.9 仍拦 wave-like 畸形标题；postcheck warning 提示并行收益；无安全面劣化 |
| R-05 | 多文件并行修改撞多会话冲突面（execute.js/plan-postcheck.js 高频改动） | P2 | Edit 前重读最新态（AGENTS 规则 16）；每文件改动收敛在单段 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-002@v2（supersedes friction5 D-002@v1 B 否决） | FR-01 / Phase R1 / 文件清单 gate-snapshot+config-schema | 已覆盖 |
| D-005@v2（supersedes friction5 D-005@v1 裸反引号不收） | FR-02 / Phase R2 / 文件清单 verify-probes+probe7-anchor-check+run/gates | 已覆盖 |
| D-003@v1 | FR-03 / Phase R3 / 文件清单 execute+plan-postcheck+plan-optimization | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/拆分判断/总体方案/文件变更清单/接口定义/生命周期契约表/数据模型/兼容策略/风险登记/决策追踪）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-002@v2/D-005@v2/D-003@v1，复潮条目注明 supersedes 源）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（已写「不适用 lifecycle contract」）
- [x] UI 原型分级核对（纯 CLI/配置/文档，无界面变化——brainstorm Step 5 已声明跳过）
- [x] 不确定的问题标注——R-03 shell 信任级取舍已入风险登记，无存疑项

## 全局硬约束（绑定所有 task，冲突以本段为准并上报主代理）

1. **版本底线**：纯 JavaScript（ESM），无 TypeScript，无构建步骤；Node.js >= 22.13（node:sqlite）。
2. **跨平台**：Windows / Linux / macOS 三平台兼容——路径用 `path.join`/POSIX 归一，换行容忍 CRLF/LF（既有 parse 已如此，新 parse 同风格）；junction 仅 Windows 语义、symlink fallback 既有先例不动。
3. **零依赖**：gate-snapshot.js / probe7-anchor-check.js 维持零新依赖（本地正则解析，不引 js-yaml，不 import stage-contract）。
4. **fail-open 边界**：快照供给链（命令面/copy 面）失败只 warn 不作废快照；plan-postcheck / 硬门 / execute 检查的既有 fail-closed 语义不变。
5. **精确值**：超时 300_000ms/条；隐式 Wave 判定 `wave.implicit === true`；advisory 第三形态正则 `` /`[^`]+`/ ``。
6. **兼容策略**：三段 R1/R2/R3 的存量零回归承诺（未配置空转/显式 Wave 原文不变/advisory 不阻断）。
7. **非目标边界**：不做 postinstall 自动探测、不动硬门三形态、不做拓扑自动补 Wave、不动 worktree create 侧。
