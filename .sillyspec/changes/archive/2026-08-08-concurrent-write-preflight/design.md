---
author: qinyi
created_at: 2026-08-08T13:01:18+08:00
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 多 agent 并发写预检

## 1. 背景

SillySpec 的立身之本是「多 agent 同时操作代码」（CLAUDE.md 第一段）。但当前 CLI 无任何机制让 agent 在写操作（`quick --done` / `execute --done`）前感知「工作树里有他者未提交改动 / 存在其他活跃变更目录」。

证据：`src/run/shared.js:406` 的 `isQuickMetadata()` 已在 quick-audit 内部把 `.sillyspec/changes/<他者变更>/` 下的脏文件识别为「并发他者会话的工作」，却作为元数据噪音**整体静默放行**，agent 完全无从知情。2026-08-08 自审 + multi-agent-review 同步推进中，主会话与并行会话在同一仓库实打实撞车（俩会话都改 `quick-audit.js` / `shared.js` / `complete.js`），把这一缺口从抽象论据变成体感。

对应债单：`docs/sillyspec/prompt-control-debt.md`「### 2026-08-08 候选增补」段（commit 27d2e41）。本变更即落实该候选。

## 2. 设计目标

- **写操作前预检并发**：`quick --done` 与 `execute --done` 完成前，扫描工作树，识别「非本变更关联的他者未提交改动」与「其他活跃变更目录」。
- **非阻塞 advisory**：检测到他者并发时打印 `⚠️` 警告（含文件清单 + 活跃变更 + 提交卫生提示），**绝不阻断**——不改 audit result.status、不改 gate 通过性。
- **复用现成分类**：不新建分类语义，复用 `isQuickMetadata()` 的「关联 vs 他者」判定，仅从「静默放行」转为「对外报告」。
- **fail-open**：`git status` 读不到时不崩、不阻断、不误报（advisory 本就非阻塞，最坏漏报而非误阻）。

## 3. 非目标（Non-Goals）

- **不做 worktree 扫描**：`git worktree list` 逐 worktree 查脏，覆盖在独立 worktree 工作的会话——留 v2（本变更只覆盖同主工作树会话，即当前最常见撞车场景）。
- **不上只读 `sillyspec doctor` 子命令**：主动查询入口留 follow-up，本变更只做写操作预检 hook。
- **不做硬阻断**：并发是项目立身前提，阻断破坏合法协作；且「是否撞车」属软/意图判定，按 P4.3/sillyhub 语义边界归 advisory，不归 SillySpec 确定性 gate。
- **不改 `isQuickMetadata` 语义**：现有 quick-audit 依赖其放行行为，本变更只新增对外报告函数，不改其返回值。
- **不检测 quick/execute 启动点**：仅 `--done` 写入点预检（对齐用户决策①）。

## 4. 拆分判断

单变更、单模块（runtime/`src/run/`）、无跨模块依赖。不拆分、不走批量。规模判 **large**（跨 quick + execute 两条写路径的行为变更 + 新文件 + 钩子 + 测试），走完整流程。

## 5. 总体方案

**Wave 1（检测核心）**：新建 `src/run/concurrent-detect.js`，导出纯函数 `detectConcurrentChanges()` + `formatConcurrentWarning()`。单次 `git status --porcelain` 扫描，复用 `isQuickMetadata` 分类，产出 `foreignFiles`（他者真实业务文件）+ `otherActiveChanges`（他者变更目录）两类信号。

**Wave 2（钩子接入）**：
- quick 钩子：`complete-handlers.js` quick 完成路径（auditQuickCompletion 调用点旁），ownFiles=本会话 `review.changedFiles`。
- execute 钩子：`gates.js completeStageGates` 入口处 guard `stageName==='execute'`，ownFiles=本变更声明交付文件（取不到则空，foreignFiles 退化为保守噪音，otherActiveChanges 始终可靠）。

两处钩子统一形态：`const d = detectConcurrentChanges(...); const w = formatConcurrentWarning(d); if (w) console.warn(w)`，随后照常推进，不阻断。

**Wave 3（测试）**：纯函数测（造 git fixture）+ 2 集成测试（quick/execute --done 存在他者脏文件时 warn 触发）。

## 6. 文件变更清单（File Changes）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `src/run/concurrent-detect.js` | 检测核心：`detectConcurrentChanges()` + `formatConcurrentWarning()` 纯函数，复用 `isQuickMetadata` + `safeGit` |
| 修改 | `src/run/complete-handlers.js` | quick --done 完成路径（auditQuickCompletion 调用点 :588 旁）加并发预检 warn，ownFiles=`review.changedFiles` |
| 修改 | `src/run/gates.js` | `completeStageGates` 入口 guard `stageName==='execute'` 加并发预检 warn，ownFiles=本变更交付文件 |
| 新增 | `test/concurrent-detect.test.mjs` | 纯函数测：foreignFiles/otherActiveChanges/gitError/ownFiles 排除四路 |
| 新增 | `test/concurrent-preflight-hooks.test.mjs` | 集成测：quick/execute --done 他者脏文件在场时 console.warn 触发、不阻断 |

**字段数据流标注**：本变更无新增对外字段/接口/DTO/事件 payload。`detectConcurrentChanges` 返回值仅在调用点本地消费（→ `formatConcurrentWarning` → `console.warn`），不跨进程、不落盘、不入 gate-status.json。故无 producer→consumer 透传链，无需标注。

## 7. 接口定义

```js
// src/run/concurrent-detect.js

/**
 * 检测工作树里的并发他者改动（非阻塞 advisory 用）。
 * 单次 git status --porcelain 扫描，复用 isQuickMetadata 分类。
 *
 * @param {string} cwd 主仓库根
 * @param {{ changeName: string, linkedChanges?: string[], ownFiles?: string[], specDir?: string }} opts
 *   - changeName: 当前变更名（排除自身变更目录）
 *   - linkedChanges: 关联变更（透传给 isQuickMetadata 的关联归类）
 *   - ownFiles: 本 --done 负责的文件（从 foreignFiles 排除，避免把自己当他者）
 *   - specDir: 规范目录（默认由 cwd 推导，用于定位 .sillyspec/changes/）
 * @returns {{ hasForeign: boolean, foreignFiles: string[], otherActiveChanges: string[], gitError: string|null }}
 *   - foreignFiles: 脏文件里非 metadata、不在 ownFiles 的真实业务文件
 *   - otherActiveChanges: 脏文件落在 .sillyspec/changes/<他者变更>/ 下，去重成的变更名集合
 *   - gitError: git status 读失败时填错误串，hasForeign=false（fail-open）
 */
export function detectConcurrentChanges(cwd, { changeName, linkedChanges = [], ownFiles = [], specDir })

/**
 * 把检测结果格式化为多行 ⚠️ 警告串。
 * @returns {string|null} 无他者并发返回 null（调用点据此跳过 console.warn）
 */
export function formatConcurrentWarning(detected)
```

**分类口径（与 isQuickMetadata 同源，不改其语义）**：对每个脏文件 `f`：
1. 若 `f` 落在 `.sillyspec/changes/<dir>/` 且 `<dir> !== changeName` 且 `<dir>` 不在 linkedChanges → 归入 `otherActiveChanges`（去重 `<dir>`）。
2. 否则若 `isQuickMetadata(f, linkedChanges) === true` → 跳过（其他元数据）。
3. 否则（真实业务文件）→ 若不在 `ownFiles` → 归入 `foreignFiles`。

## 7.5 生命周期契约

不涉及生命周期契约。本变更是只读检测 + 非阻塞 advisory 打印，不引入/修改任何 session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat 事件，不改状态机、不改 DB schema、不改阶段流转。`--done` 的推进与 gate 通过性完全不变。

## 8. 数据模型

无变更。不新增/修改 DB 表、字段、gate-status.json 结构。检测结果为调用点本地临时对象，不持久化。

## 9. 兼容策略（brownfield）

- **未触发他者并发时零行为变化**：`detectConcurrentChanges` 返回 `hasForeign=false` → `formatConcurrentWarning` 返回 null → 不打印，调用点照常推进。现有所有 quick/execute --done 流程输出不变。
- **git status 不可读时 fail-open**：返回 `gitError` + `hasForeign=false`，不崩不阻断（与 quick-audit 的 safeGit fail-closed 不同——audit 阻断是因为无锚点不能放行业务审计；并发预检是 advisory，漏报可接受）。
- **不改 `isQuickMetadata` 返回值**：现有 quick-audit 的元数据放行行为完全保留。
- **不改 audit result.status / gate 通过性**：warn 纯副作用（console.warn），不进入返回值/决策。

## 10. 风险登记（Risk）

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | `complete-handlers.js` 被并发会话活跃编辑（quick 钩子落此文件） | P1 | execute 阶段 Edit 前重跑 git status + 重读最新态（规则17）；用最小 scoped edit；若冲突让出或 rebase |
| R-02 | `ownFiles` 传入不准致 foreignFiles 误报（把自己当他者） | P1 | quick 用 audit 的 `review.changedFiles`（权威本会话改动）；execute ownFiles 取不到时 foreignFiles 退化但 otherActiveChanges 仍可靠；warn 文案明确「可能」非「一定」 |
| R-02b | 同工作树 git status 看不见 worktree 会话 → 漏报 | P2 | 非目标（v2 worktree 扫描）；warn 触发即有价值，漏报不误阻，文案不承诺全覆盖 |
| R-03 | warn 噪音（干净仓也打印） | P2 | `formatConcurrentWarning` 无他者返回 null，调用点跳过 console.warn；干净仓零输出 |
| R-04 | 纯函数测试的 git fixture 在 Windows CRLF/路径敏感 | P2 | 复用现有 quick-audit 测试的 fixture 模式（`safeGit` + `parsePorcelainPath` 已跨平台）；用 `os.tmpdir()` 隔离 |

## 11. 决策追踪

本变更落实债单「### 2026-08-08 候选增补」段的 3 个待决策项（用户 brainstorm step3 答复）：
- **决策①（写入点）**：仅 `--done`（quick --done + execute --done）→ 覆盖 §5 Wave 2、§3 非目标「不检测启动点」。
- **决策②（检测范围）**：他者脏文件 + 活跃 change 目录 → 覆盖 §7 分类口径（foreignFiles + otherActiveChanges）；worktree 扫描留 v2 → §3 非目标。
- **决策③（doctor 子命令）**：暂不上 → §3 非目标「不上只读 doctor 子命令」。

方案选 A（纯函数检测 + 薄包装），否决 B（结构化字段并入 result，对 advisory 过重 + 影响面大）与 C（中间件 + worktree，违 YAGNI 塞回 v2）。

## 自审（Self-Review）

- [x] 非阻塞不变量明确：§2/§9 三处强调不改 audit status / gate 通过性 / isQuickMetadata 语义。
- [x] 复用而非新建分类：§7 分类口径逐字对齐 isQuickMetadata，不改其返回值。
- [x] fail-open 路径定义：§9 git status 不可读 → hasForeign=false + gitError，不崩。
- [x] 文件清单 5 项全覆盖（1 新核心 + 2 钩子修改 + 2 测试），无对外字段故无数据流透传链。
- [x] 生命周期关键词命中（"complete"/"会话"）但确不涉及生命周期契约 → §7.5 用规范豁免短语「不涉及生命周期契约」标注。
- [x] 风险登记含并发编辑碰撞（R-01，本变更正身处多 agent 仓的现实约束）。
- [ ] 待 plan 阶段：钉死 complete-handlers.js / gates.js 的精确插入行号 + execute ownFiles 的取值来源（plan allowed_paths / design 文件清单 / 工作树 applied 文件三者择一）。
