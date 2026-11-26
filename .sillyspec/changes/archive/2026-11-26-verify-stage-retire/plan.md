---
author: t
created_at: 2026-11-26T10:22:11
plan_level: full
execution_mode: main  # 缺省直写——单任务规模均 <30min；上下文压力由四 Wave 分批 + 逐步 handoff 吸收（R7/R8 对撞实证派发税 2-3×）
---

# 实现计划（Plan）— 2026-11-26-verify-stage-retire

## Spike 前置验证

无——方案经 S3 两轮独立设计审查（A pass + B 增量复审 5/5 resolved），无未验证技术集成。

## Wave 1（阶段机核心，无依赖）

- task-01

## Wave 2（契约/命令/工具族并行，依赖 Wave 1）

- task-04
- task-05
- task-06
- task-07

> batch: task-04+task-05
> batch: task-06+task-07
> 接受并批护栏提示（wave_inflight_below_floor）：execution_mode=main 下批标注仅为分段提示（无子代理在飞语义），token 优先于墙钟（S-F 型）

## Wave 3（门挂载与退役收口，依赖 Wave 2）

- task-02
- task-03
- task-09

## Wave 4（消费面清理，依赖 Wave 3）

- task-08

## Wave 5（文档镜像，依赖 Wave 4）

- task-10

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 阶段机删除：verify.js 删+index 注销+checkTransition 改边（execute→archive）+四枚举/REVIEW_STAGES 清 verify+单测 | W1 | P0 | — | FR-01, D-005 | progress/shared.js:7/14/26/31、complete-handlers.js:317、stage-contract.js:2048 |
| task-02 | archive 前置门：archive.js 插 noAI 收口实测门（3→4 步）+verify-quality-scan 更名挂载+前缀更名+门两态测试 | W3 | P0 | task-07 | FR-02, D-005, D-008 | 本仓 unavailable 关闭态；lint 不在门内 |
| task-03 | skip/PID/verify-mode 退役：gates.js 删 reapVerifyServices、stage.js 删 skip 短路、**next.js 删待验证/skip 分支（:84-91）**、verify-mode.js 删+config 键清+回归锚测试 | W3 | P0 | task-01 | FR-03, FR-04, D-002, D-008 | 存量 pids 残文件不清理；与 task-04 共写 gates.js 由 W2→W3 屏障消化 |
| task-04 | gates.js verify 收尾块族删除（slot-backfill/verifyStartAt/cannot_verify 硬门/探针10/风险门 PASS 封顶/删除对账/探针一致性）+**progress.js（:1129 verifyStartAt 基准）与 progress/change-registry.js（:90）读取退役** | W2 | P0 | task-01 | FR-01, D-007 | gates.js:747/817/902/2438 |
| task-05 | 契约层退役：stage-contract/stage-contract-spec verify 规则族（validateVerifyOutputs/evaluatePassEligibility/checkProbeConsistency/resolveFactsExpected/isIrStrictVerifyChange）+complete.js 批量快进资格（:1824）；**grep test/ 消费被删导出的测试同步退役** | W2 | P0 | task-01 | FR-01 | plan 规则与 target_files 对账不动；verify 规则族区段（:662-1978）与 checkTransition（:2048）不同函数区块，正交 |
| task-06 | 命令与 prompt 面：run verify 路由/verify-probes 命令族删除+prompt 组装/HANDOVER_SUMMARY+archive.js:78-80 移交项块+progress-confirm | W2 | P0 | task-01 | FR-01 | 指路语「阶段已退役，请 run archive（在途变更走 doctor legacy）」 |
| task-07 | verify-postcheck 拆分（保留十签名，见全局硬约束）+工具族删除（verify-probes/verify-facts-schema/probe7-anchor-check）；**grep test/ 消费被删导出的测试同步退役** | W2 | P0 | task-01 | FR-01, R-04 | validate-artifacts.js:44 的动态 import 到 task-08 清理（W4 由隔离屏障吸收） |
| task-08 | 消费面降级清理 27 面（fail-soft/文案/分支删除，**含 flow-parity.js 升厚文案**——护栏对不带单引号的「run verify」模板文案是盲的，枚举是唯一兜底）+plan/quick 消费回归 | W4 | P0 | task-02, task-03, task-07, task-09 | FR-08 | mcp-server.js：stage enum 删 'verify' + facet `verify-test`（消费保留签名）保留；「指路」语义=zod description 中文指路文案（不改造 enum 拒绝行为） |
| task-09 | doctor legacy：在途 verify 检测+legacyCompleteRetiredStage 底层通路（绕 VALID_STAGES 一次写两态）+指路语+用例 | W3 | P0 | task-01 | FR-05, D-004 | 不加 TRANSITION 幽灵边 |
| task-10 | 文档镜像：file-lifecycle+`_extract.mjs` staticStages 删 'verify' 后重跑+AGENTS/CLAUDE/.claude-CLAUDE 五阶段→四阶段+skills+module-map+conventions :47-53 | W5 | P1 | task-08 | FR-01, FR-07 | `_extract.mjs` 必须先改后跑（import 失败） |

## 关键路径

task-01 → task-07 → task-02 → task-08 → task-10（最长路径；task-04/05/06 与 task-07 并行簇在 W2）

## 全局硬约束（从 design.md 抄录并汇编，绑定所有 task）

- **本变更合入前不得删除本仓 local.yaml 的 verify 段**（自举路径：本变更走到 verify 靠 `verify.mode: skip` 短路过门；删了 skip 而 verify.js 尚在 → 本变更要走真 verify 撞上正被删的门）
- 本变更走 worktree 隔离执行，合入主干前不留半删状态（枚举已删、doctor/consistency 报错的中间态窗口不得暴露给并行会话）；**执行纪律：每 Wave 收口后 handoff 换新会话再续，W2 严格按两个 batch 断**（52 面+大文件单会话撞压缩线后白名单上下文丢失=误删保留签名的温床）
- R-04 保留签名不得删改（**十签名**——B 审查补两枚）：`resolveVerifyChangedFiles`/`reconcileTargetFiles`/`runVerifyTestCheck`/`runVerifyLintCheck`/`triageLintOwnership`/`resolveTestTimeoutMs`/`applyTimeoutGuard`/`readTimeoutPolicyConfig`（后三个是轻量道 flow done 共用面，误删即断）+ **`runCeremonyDualRunCheck`（complete-handlers.js:3442-3460 archive confirm 出口仍消费——删它归档对账直接崩）** + **`extractKnownFailures`（docs-check 口径对齐 + archive 门 known_failures 面消费）**
- AGENTS 00 开放世界约束：不为单仓删机制——收口实测门机制保留（服务无 CI 仓），本仓用 unavailable 逃逸关闭（D-008）
- 收口护栏：`grep -rn "verify-result\|verify-probes\|verify-facts\|verify-mode\|'verify'" src --include=*.js` 按白名单清零（白名单=归档区历史读取+`archive-quality-scan-` 新前缀+历史注释，逐条显式登记）
- 代码兼容 Windows/Linux/macOS（路径/换行/并发）
- 错误文案一律中文，报错一次给全（状态/原因/修复路径）
- 不发 npm 版本（package.json 版本号不变，FR-06，D-003——零动作约束由 diff 事实承载）

## 全局验收标准

1. 所有单元测试通过（新增：阶段机边/门两态/verify-mode 退役锚/doctor legacy/消费面回归）
2. 四阶段流转端到端：execute completed 后可直接 `run archive`；`run verify` 报「阶段已退役」指路
3. （brownfield）未配置任何新键时行为＝四阶段流程；存量 `verify.mode` 残键读取忽略不报错
4. 双 grep 护栏按白名单清零
5. plan/quick/machine-interface 等共享消费面既有测试回归绿

## Review Focus 盲区清单（隐含面）

| # | 输入/条件 | 合理人预期行为 | 承接落点 |
|---|---|---|---|
| 1 | worktree 在场时 archive 收口实测门的测试面推断（原 verify-quality-scan 有 worktree 路径回退） | 更名挂载后推断面不变（主仓/worktree 双路径），门在主仓跑、面含 worktree 变更 | task-02（acceptance） |
| 2 | 存量 DB 中 stage=verify 行在删枚举后对 status/progress show 的表现 | 不崩、doctor legacy 提示接管，不常驻幽灵告警 | task-09（acceptance） |
| 3 | 先重跑 `_extract.mjs` 后删 verify.js 的顺序错误 | 顺序铁律：先删 staticStages 的 'verify' 再重跑（否则 import 失败） | task-10（implementation） |
| 4 | `src/mcp-server.js` 的 'verify' 硬枚举（B 类清单）漏改 | stage enum 删 'verify' 后，zod description 含中文指路文案（enum 拒绝行为不改造）；facet verify-test 保留 | task-08（acceptance） |
| 5 | flow.js/flow-parity.js 升厚路径文案仍指 run verify | 升厚指路改为四阶段语义（execute→archive） | task-08（acceptance） |

## 覆盖矩阵（如存在 decisions.md）

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-03 | 门两态测试；PID 退役锚 |
| D-002@v1 | task-03 | verify-mode 退役回归锚 |
| D-003@v1 | task-10 | package.json 零改动（diff 事实） |
| D-004@v1 | task-09 | legacy 盖戳用例 |
| D-005@v1 | task-01, task-02 | noAI 步挂载+门测试 |
| D-006@v1 | —（rejected 防复潮） | 不做独立 gate 命令 |
| D-007@v1 | task-04 | PASS 封顶/风险门随删 |
| D-008@v1 | task-02, task-03 | 本仓 unavailable 留痕；reapVerifyServices 删除 |
