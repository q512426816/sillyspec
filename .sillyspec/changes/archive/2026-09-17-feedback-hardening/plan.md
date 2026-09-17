---
plan_level: full
---

# 实现计划（Plan）— 2026-09-17-feedback-hardening

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-03

## Wave 2（依赖 Wave 1）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | gate_snapshot.commands 配置键解析 + 快照构建期执行段 + config-schema 登记 + 新直测 | W1 | P0 | — | FR-01, D-002@v2 | 命令面插环境预检后 copy 面前；fail-open + 300s/条超时帽 |
| task-02 | 探针7 锚点三形态口径对齐——预填说明改写 + advisory 补反引号形态 + gates 文案 + 断言反转 | W1 | P0 | — | FR-02, D-005@v2 | 与硬门 matrixEvidenceHasAnchor 同权，零依赖不 import |
| task-03 | 隐式 Wave 串行——buildWavePrompt implicit 分支 + 检查 0.8 文案 + plan-postcheck error→warning + 测试随行 | W1 | P0 | — | FR-03, D-003@v1 | 显式 Wave 语义逐字节不变；batch 指引「并行处理」子句隐式分支收敛 |
| task-04 | 文档镜像同步——docs/prompt 三 md + 技能 SKILL 三份 + troubleshooting gate_snapshot 段 | W2 | P1 | task-01,02,03 | FR-04 | 镜像 task-01~03 落地后的最终行为，不先行 |

## 关键路径
task-01 → task-04（W1 三任务并行，W2 文档镜像收口）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
1. **版本底线**：纯 JavaScript（ESM），无 TypeScript，无构建步骤；Node.js >= 22.13（node:sqlite）。
2. **跨平台**：Windows / Linux / macOS 三平台兼容——路径用 `path.join`/POSIX 归一，换行容忍 CRLF/LF（既有 parse 已如此，新 parse 同风格）；junction 仅 Windows 语义、symlink fallback 既有先例不动。
3. **零依赖**：gate-snapshot.js / probe7-anchor-check.js 维持零新依赖（本地正则解析，不引 js-yaml，不 import stage-contract）。
4. **fail-open 边界**：快照供给链（命令面/copy 面）失败只 warn 不作废快照；plan-postcheck / 硬门 / execute 检查的既有 fail-closed 语义不变。
5. **精确值**：超时 300_000ms/条；隐式 Wave 判定 `wave.implicit === true`；advisory 第三形态正则 `` /`[^`]+`/ ``。
6. **兼容策略**：三段 R1/R2/R3 的存量零回归承诺（未配置空转/显式 Wave 原文不变/advisory 不阻断）。
7. **非目标边界**：不做 postinstall 自动探测、不动硬门三形态、不做拓扑自动补 Wave、不动 worktree create 侧。

## 全局验收标准
1. 所有单元测试通过（npm test 全量）
2. 未配置 gate_snapshot.commands 的快照构建行为逐字节不变；显式 Wave 的 plan 行为逐字节不变；file:line/.test. 锚判定不变（存量零回归）
3. 三负面场景逐一修复可复现（快照内生成物可由命令产出 / 反引号路径证据一轮过硬门零 advisory / light 级无 Wave plan --done 仅 warning 且 execute 下发串行指令）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-002@v2 | task-01 | test/gate-snapshot-commands.test.mjs（NEW）解析+执行段+fail-open |
| D-005@v2 | task-02 | test/probe7-anchor-testfile.test.mjs 断言反转 + 预填说明新文案 |
| D-003@v1 | task-03 | test/plan-optimization.test.mjs Test 5f warning 化 + plan-execute-contract 串行指令断言 |
| FR-04 | task-04 | 文档镜像 diff 与代码行为一致 |
