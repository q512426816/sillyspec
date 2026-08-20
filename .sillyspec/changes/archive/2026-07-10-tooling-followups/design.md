---
author: qinyi
created_at: 2026-07-10T17:30:00+08:00
scale: large
status: design ready（待新会话 plan/execute）
---

# 设计 — sillyspec 工具侧 follow-up（local.yaml 轻量 + module 策略 + §4.6 收尾）

## 背景

来自 P3 driver gate pilot 联调反馈 + Bug2 known limitation + scan 重讨论。gate verify-test 要真跑，暴露 3 个 sillyspec 工具侧缺口。

## #1 local.yaml 轻量生成（与 scan 解耦）

**问题**：local.yaml 生成绑在 scan（scan.js:193），但 scan 半小时 + 大量 token（生成 7 份架构文档）。create/gate 只需 local.yaml（几行 project.type + commands），却被迫跑完整 scan。

**方案**：抽出轻量探测，独立命令。
- 新增 `src/local-detect.js`：`detectLocalYaml(workdir)` —— 纯 fs 嗅探（零 AI/零 token，几秒）：
  - `package.json` 存在 → nodejs，`commands.test = npm test`，`lint = npm run lint`
  - `pom.xml` → maven，`commands.test = mvn test`
  - `build.gradle` → gradle，`commands.test = gradle test`
  - `Makefile` → 读 `test:` 目标
  - 都没有 → generic
- 新命令 `sillyspec local detect`（index.js 路由）：调 detectLocalYaml + 写 local.yaml
- scan.js:193 复用 detectLocalYaml（不重写探测逻辑）
- daemon-client create 后调 `sillyspec local detect`（轻量，几秒），不调 scan

**文件**：新增 src/local-detect.js + src/index.js（路由）+ src/scan.js（复用）+ test/local-detect.test.mjs

## #2 test_strategy:module 支持（方案 A：local.yaml modules 显式映射）

**问题**：monorepo（SillyHub backend=python + frontend=next + daemon=node）全量 commands.test 12min > gate timeout。verify-postcheck 不读 test_strategy，直接跑整个 commands.test。

**方案 A（选定）**：local.yaml modules 显式映射，gate 按变更命中模块跑子集。
- local.yaml 扩展：
  ```yaml
  test_strategy: module   # full（默认，跑 commands.test）/ module（按模块子集）
  modules:
    backend: { path: "backend/", test: "cd backend && uv run pytest" }
    frontend: { path: "frontend/", test: "cd frontend && pnpm test" }
    daemon: { path: "sillyhub-daemon/", test: "cd sillyhub-daemon && pnpm test" }
  ```
- verify-postcheck.js `runVerifyTestCheck`：
  - 读 local.yaml test_strategy
  - `module` 策略：git diff（base..head 或 worktree uncommitted）命中哪些 module.path → 跑对应 module.test（串行，结果聚合）
  - 无命中 / 无 modules 配置 → fallback commands.test（向后兼容）
  - 聚合 status：全 passed→passed，任一 failed→failed
- gate/derive（machine-interface.js）verify-test 透传聚合 status（不变）

**文件**：src/verify-postcheck.js（读 test_strategy + 模块子集）+ test/verify-postcheck-module.test.mjs

**决策依据**：方案 A 最自描述（local.yaml 含全部映射）、不依赖 Makefile 约定（方案 B）、不绕回 scan（方案 C 的 module-map 是 scan 产物）。

## #3 §4.6 收尾 gap（progress.quickGuard 不持久化）

**问题**（Bug2 known limitation）：`progress.quickGuard` 是 JS 对象，但 `_write`（progress.js）只持久化 stages/batchProgress，**不持久化顶层 quickGuard**。completeStep 跨进程 --done 时 read 出的 progress 无 quickGuard → 收尾块（auditQuickCompletion + session 目录清理）`if (progress.quickGuard)` 恒 falsy 不执行 → session 目录残留僵尸。

**方案**：completeStep 收尾改从 session guard.json 读 guard（不依赖 DB progress.quickGuard）。
- run.js completeStep quick 收尾块（~run.js:2969-2992，Bug2 task-02/03 改的区域）：
  - 从 `.runtime/quick-sessions/<sessionId>/guard.json` 读 guard（sessionId = 当前 changeName）
  - 用文件 guard 驱动 auditQuickCompletion + 清理（不依赖 progress.quickGuard）
  - fallback：session guard.json 不存在 → 旧单文件 quick-guard.json → 都没有则跳过审计（只清理）

**文件**：src/run.js（completeStep quick 收尾块）+ test（quick 收尾删 session 目录，跨进程场景）

## 文件变更清单

| 操作 | 文件 | # |
|---|---|---|
| 新增 | src/local-detect.js | #1 |
| 修改 | src/index.js（local detect 路由） | #1 |
| 修改 | src/stages/scan.js（复用 detectLocalYaml） | #1 |
| 修改 | src/verify-postcheck.js（test_strategy:module） | #2 |
| 修改 | src/run.js（completeStep 读 session guard.json） | #3 |
| 新增 | test/local-detect.test.mjs | #1 |
| 新增 | test/verify-postcheck-module.test.mjs | #2 |
| 新增 | test/quick-session-guard-cleanup.test.mjs | #3 |

## 决策

- **D-001@v1**：local.yaml 轻量探测独立（与 scan 解耦）。否决"create 带 scan"（scan 重）。
- **D-002@v1**：module 策略用方案 A（local.yaml modules 显式映射）。否决 B（依赖 Makefile）、C（绕回 scan）。
- **D-003@v1**：§4.6 收尾从 session guard.json 读（不修 db 持久化 quickGuard——那是更大改动，且 quickGuard 本就该是文件级会话状态）。

## 新会话 execute

设计就绪。新会话：
```bash
sillyspec run plan --change 2026-07-10-tooling-followups   # 拆 task（3 个改进 + 测试）
sillyspec run execute --change 2026-07-10-tooling-followups
```

plan.md 建议 Wave：W1 #3（最小，run.js）+ #1（local-detect，独立）并行 → W2 #2（verify-postcheck，依赖 local.yaml modules 概念） → W3 测试。
