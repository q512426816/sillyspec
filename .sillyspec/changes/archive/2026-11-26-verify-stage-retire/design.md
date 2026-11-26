---
author: t
created_at: 2026-11-26 09:36:17
generated_by: sillyspec-design-init
scale: large  # 52 文件消费面 + 状态机改动 + 存量兼容，需 Wave 编排（工具族删除/门迁移/枚举清理/文档镜像可并行簇）
---

# 设计文档（Design）— 2026-11-26-verify-stage-retire

## 背景

verify 阶段历史归档 788 份报告（4.4MB，截至 2026-11-26），结论零 FAIL、friction-ledger 无拦截账，轮均成本约为 brainstorm 段 3-4 倍；用户判定其无实际拦截价值。上一变更 2026-11-26-verify-skip-switch 已加 `verify.mode: skip` 仓级关停止血（本仓已启用）；本变更是止血后的终局：**删除 verify 阶段本身**，收口实测门按 D-008「机制保留、本仓关闭态」并入 archive 前置门（PID 回收随阶段退役）。

**本变更自举路径（执行纪律）**：本变更自身仍是五阶段流程（代码删除在其 execute 期发生）——它走到 verify 时，本仓 local.yaml 的 `verify: {mode: skip}`（2026-11-26-verify-skip-switch 启用）使其自动短路 completed → archive，自洽过门。**因此本变更合入前不得删除本仓 local.yaml 的 verify 段**；合入后该段成为无消费者残留（D-002 语义忽略），清理可选。**执行隔离（E1 承接）**：52 面删除存在「枚举已删、doctor/consistency 报错」的中间态窗口，多 agent 并行仓下公干主干不留半删状态——本变更走 worktree 隔离执行（run execute 自动建 worktree），R-02 grep 清零护栏是合入收口态检查。

## 设计目标

- 完整流程由五阶段收敛为四阶段：`brainstorm → plan → execute → archive`（C1）
- archive 前置门承载收口实测门：测试实测机制保留（无 CI 仓兜底防谎报）、**本仓 unavailable 关闭态归 CI**；PID 回收随阶段退役（D-008 refine D-001/D-005）
- 全部消费面（grep 实测 52 个 src 文件）逐面迁移或清理，收口以双 grep 护栏清零验证（C7）
- 存量兼容：在途 verify 变更 legacy 完成路径、归档区只读、`verify.mode` 读到忽略、不发 npm 版本（C4/C5/C6/D-002/D-003/D-004）

## 非目标

- 不动轻量道（flow start/done 协议与其实测门）
- 不删除归档区 787 份历史 verify-result（只读）
- 不实现平台侧（multi-agent-platform）stage enum 镜像同步——列移交项（R-01）
- 不做独立 `gate close` 命令（D-006 rejected）
- 不恢复任何语义验收面（风险判级门/PASS 封顶/集成证据/探针/矩阵——D-007 已裁决）

## 拆分判断

所有 52 面共享「verify 退役」同一语义根：阶段定义、TRANSITION map、常量枚举、门禁、prompt 组装、文档镜像互为依赖，拆成多个变更会出现「枚举已删、阶段仍在」的中间不一致态（doctor/consistency 直接报错）。故单变更一次收敛，内部用 Wave 分簇并行（见总体方案）。

## 总体方案

### Wave 1：阶段机与门（核心路径）

1. **删阶段定义**：`src/stages/verify.js` 删除；`src/stages/index.js:4,19` 注销 import 与注册。
2. **TRANSITION map 改边**：`execute → archive` 成为合法边（checkTransition 的 map 更新，map 定义于 `src/stage-contract.js:2048`）；同步修订 `.sillyspec/knowledge/conventions.md:47-53` 整段（B 审查扩面：:50-51 StageEnum 的 PROPOSE→PLAN→EXECUTE→VERIFY→ARCHIVE 描述与 :52 咬合，只改一行会段内自相矛盾）为四阶段语义（知识经收口 distill 通道生效）。
3. **常量枚举清理**：`src/progress/shared.js:7` VALID_STAGES、`:14` STAGE_LABELS（删 verify 键）、`:26` STAGE_ORDER、`:31` MAIN_FLOW_ORDER 删 `'verify'`；`src/run/complete-handlers.js:317` REVIEW_STAGES 删 `'verify'`。下游 consistency/doctor/cascade 按 MAIN_FLOW_ORDER 推导自动跟随。
4. **archive 前置门（机制保留、本仓关闭态——D-008 refine D-001/D-005）**：`src/stages/archive.js` 步骤表头部插 noAI 步「收口实测门」（`_cliAction: archiveCloseGate`）——**3→4 步**（现状 3 步：decision-distill / extract-module-impact 与归档语义收尾 / 确认归档）。`src/run/verify-quality-scan.js` 更名 `NEW:src/run/archive-quality-scan.js`：runner、动态子集推断、指纹缓存全保留，仅换调用点；产物前缀一并更名 `archive-quality-scan-`（存量缓存一次性失配——本仓已关闭亲跑无实害，无 CI 仓首用即新前缀）；`.runtime/verify-runs/` 取证目录名保留（历史取证路径兼容，白名单登记）。runner 消费的 `commands.smoke`/`commands.coverage`/`commands.metrics` 键面随 runner 保留（archive 门阻断条件只认 commands.test 失败；smoke/coverage/metrics 为记录面不阻断——PASS 封顶已随 D-007 删除）。门失败阻断归档（exit 1 + 步骤不盖 completed）。**本仓落点**：`local.yaml` 将 `commands.test` 标 `unavailable → 归 pre-push/CI`（与 `commands.lint` 同款逃逸，留痕归 CI——本仓 pre-push 2026-10-16 已将全量测试移交 CI）；机制保留服务无 CI 仓的兜底防谎报能力（AGENTS 00 条开放世界约束）。**lint 不在门内**：轻量道 flow done 已含 lint 实测，archive 门不重复跑（归 flow done/pre-push/CI）。
5. **PID 回收退役（D-008 refine D-001）**：登记源头在 verify prompt（`src/stages/verify.js:221-226`），阶段删除后无写入方——`reapVerifyServices`（`src/run/gates.js:2517`）与 `verify-services` pids 文件读逻辑一并删除（留则死码空转）；execute **不**新增登记指引；存量 `.runtime/verify-services-*.pids` 残文件无害不清理。
6. **gates.js verify 专属块删除**：facts slot-backfill（`src/run/gates.js:747`）、verifyStartAt、cannot_verify 硬门（`src/run/gates.js:902`）、探针 10 预填注（`src/run/gates.js:817`）、风险门控 PASS 封顶、删除对账（runVerifyDeletionCheck）、探针一致性抽查（`src/run/gates.js:2438`）——全随阶段删除（C3/D-007）。

### Wave 2：契约层与命令面

7. `src/stage-contract.js` / `src/stage-contract-spec.js`：verify 规则、`validateVerifyOutputs`、`evaluatePassEligibility`、`checkProbeConsistency`、`resolveFactsExpected`、`isIrStrictVerifyChange` 退役；plan 阶段规则与 target_files 对账不动。
8. `src/run/complete.js` / `src/run/complete-handlers.js`：verify 完成处理、批量快进资格（verify-facts.json 在场判定 `src/run/complete.js:1824`）删除。
9. `src/run/command.js` / `src/index.js`：`run verify` 路由、`verify-probes` 命令族、verify-probes --init 指引删除；`src/run/progress-confirm.js` verify 档提示删。
10. `src/run/prompt.js`：verify prompt 组装、`HANDOVER_SUMMARY` 注入（`src/run/prompt.js:1966`）删除；`src/stages/archive.js:78-80`「确认归档」步的移交项展示块（消费 verify-facts/handover）与 `{HANDOVER_SUMMARY}` 占位符一并删除（A 审查 gap② 补面）。
11. `src/verify-mode.js` 删除；`src/config-schema.js` 删 `verify.mode` 键并退役已删门关联的 `verify.*` 调优键（test_rerun/gate_scope/timeout_policy 的消费点随门消失，键标 deprecated）；`src/run/stage.js` 删 skip 短路块；`src/run/next.js` 删「待验证」与 skip 分支。
12. `src/verify-postcheck.js` 拆分：测试面三源推断、runner 推断、known_failures 解析保留（archive 门与 plan 消费共用）；verify 收尾专属函数删。`src/verify-probes.js`、`src/verify-facts-schema.js`、`src/probe7-anchor-check.js`、`verify-required-evidence` 消费逻辑删除。

### Wave 3：消费面降级与 doctor legacy（可与 Wave 2 部分并行）

13. fail-soft/文案面逐个核对：`src/archive-delta.js`（verify-facts 读取移除、探针指标段容空）、`src/change-risk-profile.js`（design 阶段风险提示保留，verify 收尾消费点与回执槽解析删）、`src/preview-progress.js`、`src/flow.js`/`src/flow-parity.js`（升厚路径文案）、`src/machine-draft.js`、`src/machine-interface.js`、`src/prefill.js`、`src/redlines.js`、`src/scope-audit.js`、`src/ui-visual.js`、`src/run/green-cache.js`、`src/run/shared.js`、`src/runtime-paths.js`、`src/task-review.js`、`src/taskcard-frontmatter.js`、`src/validate-artifacts.js`、`src/verify-draft.js`、`src/watcher.js`、`src/worktree.js`、`src/worktree-apply.js`、`src/foreign-declared.js`、`src/stages/plan.js`、`src/stages/plan-postcheck.js`、`src/stages/quick.js`、`src/mcp-server.js`、`src/hooks/worktree-guard.js`——改文案或删 verify 分支；plan/quick 消费的共享工具保留。
14. `doctor`（`src/doctor-diagnostics.js` + `src/stages/doctor.js`）：**新增**在途 verify 变更检测——进度库 stage 停在 verify 的活跃变更 → 提供一次性 legacy 盖完成戳，显式确认才执行（D-004）。**盖戳通路（A/B 审查追问①收口）**：新增 stage-machine 底层专用方法 `legacyCompleteRetiredStage(changeName)`——一次写两态（verify 行 status=completed + currentStage→archive），**不**经 `progress.js:1437`/`progress/step-store.js:16`/`progress/stage-machine.js:81` 三处 `VALID_STAGES.includes` 拦截（枚举删除后这些通道会把 verify 盖成「未知阶段」），**不**为存量加 TRANSITION 幽灵边；`run verify` 指路语对在途变更补「检测到 verify 在途 → `sillyspec doctor` 走 legacy 盖戳」。verify 专属诊断项退役。

### Wave 4：测试与文档镜像

15. 测试：`NEW:test/archive-quality-scan.test.mjs`（门阻断/放行两态 + 指纹复用）；doctor legacy 盖戳用例；枚举单测（VALID_STAGES/MAIN_FLOW_ORDER 不含 verify）；TRANSITION 边单测（execute→archive 合法、verify 边不存在）；**verify.mode 存量键回归锚**（A 审查补：`NEW:test/verify-mode-retired.test.mjs` 或并入 config 测试——存量 local.yaml 含 `verify: { mode: skip }` 时任意命令运行不报错、键无消费者，锚住 FR-04「读到忽略」承诺）；既有 verify 相关测试面随实现退役改造（`test/verify-skip-mode.test.mjs` 删除、verify-probes 系测试删除）。
16. 文档：`docs/sillyspec/file-lifecycle.md` 阶段表更新（verify 行删、archive 3→4 步——顺带修正文档旧值「archive | 5」、updated_at）；**先改 `docs/prompt/_extract.mjs:68`——staticStages 数组删 `'verify'`（verify.js 删除后 `import(stageUrl('verify'))` 直接失败，B3 盲区）再重跑提取**（verify.md 删除后镜像再生成）；`AGENTS.md`/`CLAUDE.md`/`.claude/CLAUDE.md` 五阶段→四阶段多处修订；`.claude/skills/sillyspec-verify/` 删除、auto/continue/flow 等提及 verify 的 skill 更新；`_module-map.yaml` paths 更新。

## 文件变更清单

**整文件删除（7）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 删除 | src/stages/verify.js | 阶段定义（7 步 prompt、全局护栏；PID 登记段随阶段消亡，不迁移——D-008） |
| 删除 | src/verify-mode.js | D-002：开关随阶段退役 |
| 删除 | src/verify-probes.js | 探针族（C3） |
| 删除 | src/verify-facts-schema.js | facts 槽解析（C3） |
| 删除 | src/probe7-anchor-check.js | 覆盖矩阵锚点检查（C3） |
| 删除 | docs/prompt/verify.md | prompt 镜像 |
| 删除 | .claude/skills/sillyspec-verify/ | skill 目录 |

**更名（1）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 更名 | NEW:src/run/archive-quality-scan.js | ← 更名自 src/run/verify-quality-scan.js（原文件删除）：runner/三源推断/指纹缓存保留，调用点改 archive noAI 步 |
| 删除 | src/run/verify-quality-scan.js | 更名源文件（内容迁 NEW:src/run/archive-quality-scan.js） |

**核心修改（16）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/index.js | 注销 verify 注册 |
| 修改 | src/stages/archive.js | 3→4 步：插 noAI「收口实测门」；「确认归档」步移交项展示块（:78-80）删除 |
| 修改 | src/run/stage.js | 删 skip 短路与 verify 启动分支；checkTransition 调用方核对 |
| 修改 | src/run/gates.js | 删 verify 收尾块族与 reapVerifyServices（PID 退役，D-008） |
| 修改 | src/run/complete.js | verify 完成处理/批量快进删 |
| 修改 | src/run/complete-handlers.js | REVIEW_STAGES 删 verify |
| 修改 | src/progress/shared.js | 四处枚举删 verify |
| 修改 | src/run/next.js | 删待验证/skip 分支 |
| 修改 | src/progress.js | verifyStartAt 等读取退役 |
| 修改 | src/progress/change-registry.js | 同上 |
| 修改 | src/stage-contract.js | verify 规则族退役（plan 规则不动）；**checkTransition（:2048）TRANSITION map 改边：execute→archive 合法、verify 边移除** |
| 修改 | src/stage-contract-spec.js | verify spec 段删 |
| 修改 | src/run/command.js | run verify 路由删 |
| 修改 | src/index.js | 命令注册/verify-probes 命令删 |
| 修改 | src/run/prompt.js | verify prompt 组装/HANDOVER_SUMMARY 删 |

**消费面降级（27）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-postcheck.js | 拆分：测试面推断/runner/known_failures 保留，收尾专属删 |
| 修改 | src/config-schema.js | 删 verify.mode；退役 verify.* 调优键 |
| 修改 | src/archive-delta.js | facts 读取移除、容空 |
| 修改 | src/change-risk-profile.js | verify 收尾消费点删 |
| 修改 | src/doctor-diagnostics.js | 新增在途检测+legacy 盖戳；verify 诊断退役 |
| 修改 | src/stages/doctor.js | 同上（prompt 面） |
| 修改 | src/preview-progress.js | 产物清单更新 |
| 修改 | src/flow.js | 升厚/thick 指路文案 |
| 修改 | src/flow-parity.js | 同上 |
| 修改 | src/machine-draft.js | verify 分支/文案 |
| 修改 | src/machine-interface.js | 同上 |
| 修改 | src/prefill.js | verify 预填删 |
| 修改 | src/redlines.js | 红线条目更新 |
| 修改 | src/scope-audit.js | 对账面更新 |
| 修改 | src/ui-visual.js | 探针挂载点更新 |
| 修改 | src/run/shared.js | verify prompt includes 删 |
| 修改 | src/run/progress-confirm.js | verify 档提示删 |
| 修改 | src/run/green-cache.js | 缓存键面核对 |
| 修改 | src/runtime-paths.js | 注释/路径核对 |
| 修改 | src/task-review.js | verify 对账引用核对 |
| 修改 | src/taskcard-frontmatter.js | verify 字段核对 |
| 修改 | src/validate-artifacts.js | 产物校验面更新 |
| 修改 | src/verify-draft.js | verify 相关骨架逻辑核对 |
| 修改 | src/watcher.js | 事件面核对 |
| 修改 | src/worktree.js | 引用核对 |
| 修改 | src/worktree-apply.js | 引用核对 |
| 修改 | src/foreign-declared.js | 引用核对 |
| 修改 | src/stages/plan.js | 注释/文案核对（plan 消费保留） |
| 修改 | src/stages/plan-postcheck.js | 注释/文案核对（target_files 对账保留） |
| 修改 | src/stages/quick.js | 注释/文案核对（quick 消费保留） |
| 修改 | src/mcp-server.js | stage enum 删 'verify'、facet verify-test 保留、zod description 中文指路 |
| 修改 | src/hooks/worktree-guard.js | 'verify' 枚举核对 |

**新增（5）+ 文档（6）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:test/stage-machine-verify-retired.test.mjs | 枚举/TRANSITION 边单测（task-01） |
| 新增 | NEW:test/archive-quality-scan.test.mjs | 门两态+指纹复用（task-02） |
| 新增 | NEW:test/verify-mode-retired.test.mjs | 存量键读取忽略回归锚（task-03） |
| 新增 | NEW:test/doctor-legacy-retired-stage.test.mjs | legacy 盖戳用例（task-09） |
| 修改 | src/progress/stage-machine.js | 新增 legacyCompleteRetiredStage 方法（一次写两态底层通路，task-09） |
| 修改 | docs/sillyspec/file-lifecycle.md | 阶段表/步数/updated_at |
| 修改 | docs/prompt/_extract.mjs | staticStages 删 `'verify'`（:68，先于重跑，否则 import 失败） |
| 修改 | docs/prompt/_extracted.json | 重跑 _extract.mjs 镜像再生成 |
| 修改 | AGENTS.md | 五阶段→四阶段 |
| 修改 | CLAUDE.md | 同上 |
| 修改 | .claude/CLAUDE.md | 同上 |
| 修改 | .claude/skills/sillyspec-verify/SKILL.md | 删除（目录整删）；auto/continue/flow 等提及更新 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | paths 更新 |
| 修改 | .sillyspec/knowledge/conventions.md | :47-53 段修订（含 StageEnum VERIFY 节点，随 distill） |

| 删除 | test/verify-skip-mode.test.mjs | verify.mode 开关退役，测试随删（回归锚见 NEW:test/verify-mode-retired.test.mjs） |
| 删除 | test/verify-quality-scan.test.mjs | 更名 NEW:test/archive-quality-scan.test.mjs |

**实际改动补录（执行期真实交付面，Gate1 对账）**

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | .claude/skills/sillyspec-archive/SKILL.md | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | .claude/skills/sillyspec-auto/SKILL.md | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | .claude/skills/sillyspec-continue/SKILL.md | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | .claude/skills/sillyspec-execute/SKILL.md | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | docs/prompt/README.md | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | src/stages/execute.js | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/acceptance-matrix-gate.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/acceptance-matrix-probe.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/api-coverage-matrix.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/archive-cli-git-add.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/archive-delta.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/archive-idempotent-selfheal.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/audit-fixes-batch.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/code-face-key-doc-commit-survival.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/coverage-existence.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/cross-repo-probe7-anchor.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/doctor-verify-feedback.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/flag-contract.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/flow-protocol.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/gate-snapshot-e2e.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/gate-snapshot-layout-guard.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/gates-snapshot-fallback-visibility.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/ir-strict-mode.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/module-match-portrace.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/next-command.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/pass-eligibility.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/pitfall-anchor-paren.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/pitfall-facts-apiface.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/pitfall-gate-collect.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/pitfall-probe7-noise.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/platform-dual-root-fixture.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/prefill.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe-suite/wrong-key.fixtures.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe-suite/wrong-key.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe5-mount-prefix.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe5-worktree-parity.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe7-anchor-testfile.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe7-fr-prefill.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe7-prefill-noise.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe7-testpath-anchor.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe8-contract-pivot.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe8-direct-compare.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe8-payload-parity.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/probe9-guard-consistency.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/py-runner-flags.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/receipt-multiline-parse.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/redlines.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/retro-verify-friction-fixes.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/runner-flags-generic.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/smoke-gate.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/stage-contract-spec.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/stage-contract.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/taskcard-frontmatter-hardgate.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-artifact-triage.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-batch-finish.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-carry-orphan-guard.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-conclusion-slot.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-concurrency-fixes.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-deletion-check.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-draft.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-evidence-triple.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-facts-receipt-width.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-facts-v2.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-handover-structured.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-papercuts-batch.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-postcheck-module.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes-facts.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes-platform-note.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes-probe3-dualroot.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes-probe3-java-layout.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes-refresh-backup.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-probes.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-quality-scan-reuse-actual-scope.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-receipt-rerun.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-required-evidence-check.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-reuse-large-repo.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-test-result-reuse-observability.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/verify-window-regression.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |
| 修改 | test/worktree-dual-truth-gates.test.mjs | 实际改动补录（apply Gate1 对账：执行期真实交付面，2026-11-26-verify-stage-retire） |

收口护栏：`grep -rn "verify-result\|verify-probes\|verify-facts\|verify-mode\|'verify'" src --include=*.js` 清零（A 审查 gap④ 补模式 verify-facts/verify-mode；白名单=归档区历史读取 `archive-delta.js`/`preview-progress.js` 历史段 + `archive-quality-scan-` 新前缀命中 + 历史注释，逐条显式登记）。

## 接口定义

本变更接口面：0 端点（无对外 API 变更）。CLI 行为变更：`sillyspec run verify` 命令族移除（调用时报「阶段已退役，请 run archive」指路）；`sillyspec verify` 顶层别名同步移除。

## 生命周期契约表

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| 阶段边 execute→verify 移除 | 本变更（TRANSITION map，checkTransition 定义于 `src/stage-contract.js:2048`） | progress DB | — | 该合法边消失，存量在途行走 legacy 盖戳 |
| 阶段边 execute→archive 新增 | checkTransition（src/stage-contract.js:2048） | progress DB | changeName/stageName | execute completed → archive in-progress（原五阶段的 verify 中间态取消） |
| 收口实测门执行 | archive noAI 首步（archive-quality-scan）；本仓 unavailable 关闭态留痕归 CI（D-008） | .runtime/verify-runs/\<ts\>/test-result.json | 变更测试面+指纹 | 门失败：archive 步骤不盖 completed、exit 1（本仓不亲跑，留痕归 CI） |
| PID 登记/回收退役 | 本变更（D-008） | — | — | reapVerifyServices 与 pids 读逻辑删除；存量 `.runtime/verify-services-*.pids` 残文件无害不清理 |
| 在途 verify 变更 legacy 盖戳 | doctor 显式确认后调 `legacyCompleteRetiredStage`（stage-machine 底层，绕过 VALID_STAGES 拦截） | progress DB | changeName | verify:in-progress → completed + currentStage→archive（一次写两态，一次性，不加幽灵边） |

## 数据模型

无 schema 变更：progress DB stages 表为通用结构，verify 阶段行自然不再产生；存量 DB 中停在 verify 的行由 legacy 盖戳处理，不迁移表结构。

## 测试 seam 约定

- `sillyspec run archive`：能查出「归档前测试失败未拦」；查不出语义验收质量（D-007 裁决移除面）。
- `sillyspec doctor`：能查出在途 verify 变更并给 legacy 路径；查不出平台侧镜像状态（移交项）。
- `sillyspec status` / `progress show`：能查出幽灵阶段残留（枚举一致性）。
- 枚举/边单测：VALID_STAGES/MAIN_FLOW_ORDER 不含 verify、execute→archive 合法、verify 边不存在。

## 兼容策略（brownfield 必填）

- **零新增配置**：本变更不引入任何 local.yaml 新键；未配置任何东西的行为＝四阶段流程。
- **存量 `verify.mode: skip`**：键已无消费者，读到忽略不报错（D-002）。
- **回退路径**：git revert 本变更可整体回到五阶段（阶段定义/枚举/门在同一变更内对称删除/恢复）。
- **在途变更**：doctor legacy 盖戳（D-004），仅显式确认执行。
- **归档区 787 份报告**：只读不动；archive-delta 读历史时容空。
- **发版**：不发（D-003）；下次发版建议 semver major + 迁移说明（README「五阶段→四阶段」段落）。
- **平台侧 stage enum 镜像**：仓外交付面，移交 multi-agent-platform 维护者（R-01）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 平台侧（multi-agent-platform）stage enum 镜像不同步 → 平台渲染断档 | P2 | 移交项明示；平台按 MAIN_FLOW_ORDER 类镜像自行跟随发版节奏 |
| R-02 | 52 面清理遗漏 → 幽灵阶段/收口校验报错 | P1 | 双 grep 护栏清零检查列入收口成功标准；白名单仅归档区读取与历史注释 |
| R-03 | doctor legacy 盖戳误伤在途变更 | P2 | 仅 verify 阶段在途 + 用户显式确认两条件同时满足才执行 |
| R-04 | verify-postcheck 拆分破坏共享消费面（B 审查扩面：plan 之外还有 machine-interface/archive-delta/module-impact/review-material-pack/scope-audit/config-schema readers；plan 审查再补：complete-handlers.js:3442-3460 archive confirm 出口、docs-check 口径） | P1 | 拆分保留签名明列（**十签名**）：`resolveVerifyChangedFiles`/`reconcileTargetFiles`/`runVerifyTestCheck`/`runVerifyLintCheck`/`triageLintOwnership`/`resolveTestTimeoutMs`/`applyTimeoutGuard`/`readTimeoutPolicyConfig`（后三个是轻量道 flow done 共用面，误删即断）+`runCeremonyDualRunCheck`（archive confirm 出口消费）+`extractKnownFailures`（docs-check 与 archive 门 known_failures 面）；上述全部消费面的既有测试回归保护 |
| R-05 | 验收范式降级：完整流程验收强度＝轻量道实测门，独特价值收窄为 plan 编排 + archive 文档同步 | P2 | 接受：D-007 已裁决（source=user），本表登记防后来人误判为疏漏 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Wave1.4/1.5（测试实测门+PID 闭环）；FR-01/FR-02 | 已覆盖 |
| D-002@v1 | Wave2.11（verify-mode.js 删除+键忽略）；FR-04 | 已覆盖 |
| D-003@v1 | 兼容策略「发版」节；FR-06 | 已覆盖 |
| D-004@v1 | Wave3.14（doctor legacy 盖戳）；FR-05；生命周期契约表末行 | 已覆盖 |
| D-005@v1 | Wave1.4（noAI 步内嵌，复用 runner）；FR-01 | 已覆盖 |
| D-006@v1 | 非目标「不做独立 gate 命令」 | 已覆盖（rejected 防复潮） |
| D-007@v1 | 非目标「不恢复语义验收面」+ R-05；FR-07 显式声明 | 已覆盖 |
| D-008@v1 | Wave1.4（门机制保留+本仓 unavailable 关闭态）；Wave1.5（PID 回收退役）；FR-02/FR-03 | 已覆盖（refine D-001/D-005 本仓落点） |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-001@v1~D-008@v1（决策追踪表全覆盖）
- [x] 生命周期关键词命中（state transition）→ 生命周期契约表已填（6 事件矩阵）
- [x] UI 原型：不适用——纯 CLI 后端变更，无前端文件（本行即豁免依据）
- [x] 无「⚠️ 自审存疑」残留项
