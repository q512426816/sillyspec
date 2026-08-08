---
author: qinyi
created_at: 2026-08-08 13:16:00
plan_level: light
---

# 轻量计划（Light Plan）：多 agent 并发写预检

## 来源
brainstorm 四件套：design.md（方案 A 纯函数检测 + 薄包装，独立审查 pass/pass，docHash `a3f5662371ab526d79ffc41c1e44c44d98c315f85f1182f1de72b4c795b80130`）/ proposal.md / requirements.md（FR-01..FR-07）/ tasks.md / decisions.md（D-001..D-008，P1 全 accepted、D-008 deferred）。本计划仅拆 Wave + 依赖，不重新扩写设计。

## 范围
- `src/run/concurrent-detect.js`（新）：detectConcurrentChanges + formatConcurrentWarning 纯函数 + 内联 extractChangeDir
- `src/run/complete-handlers.js`（改）：quick --done 完成路径加并发预检 warn
- `src/run/gates.js`（改）：completeStageGates guard execute 加并发预检 warn
- `test/concurrent-detect.test.mjs`（新）：纯函数测
- `test/concurrent-preflight-hooks.test.mjs`（新）：quick/execute 钩子集成测

不在范围（design §3）：worktree 扫描（v2）/ doctor 子命令（follow-up）/ 硬阻断 / 启动点预检 / verify-archive --done / 改 isQuickMetadata 语义。

## Wave 1（producer，无依赖）
- [x] task-01: 新增 concurrent-detect.js 检测核心 + 纯函数测（覆盖：FR-01, FR-02, FR-03, FR-04, D-004, D-005, D-008）✅ 30/30 PASS（concurrent-detect.test.mjs 自跑 EXIT=0）

## Wave 2（consumer，依赖 Wave 1；task-02/03 不同文件可并行）
- [x] task-02: complete-handlers.js quick --done 并发预检钩子（覆盖：FR-05, FR-07, D-001, D-003）✅ quick-baseline 31/31 + audit-quick 14/14 + run-complete-step-quick(D-003 brownfield) 20/20 自跑全 PASS
- [x] task-03: gates.js execute --done 并发预检钩子（覆盖：FR-06, FR-07, D-002）

## Wave 3（依赖 Wave 1+2）
- [x] task-04: concurrent-preflight-hooks.test.mjs 集成测（覆盖：FR-05, FR-06, FR-07）

## Wave 4（依赖 Wave 1+2+3；回归须在集成测落盘后串行，禁与 task-04 同 Wave 并行——execute.js:651 同 Wave 强制并行会致 npm test 与写测试文件竞争）
- [x] task-05: npm test + lint 全量回归 + 文档同步评估（覆盖：FR-07, D-006, D-007）

## 任务总表
| Task | 标题 | 优先级 | 模块 | depends_on | allowed_paths |
|---|---|---|---|---|---|
| task-01 | concurrent-detect 检测核心 + 单测 | P0 | runtime | — | src/run/concurrent-detect.js, test/concurrent-detect.test.mjs |
| task-02 | quick --done 并发预检钩子 | P0 | runtime | task-01 | src/run/complete-handlers.js |
| task-03 | execute --done 并发预检钩子 | P0 | runtime | task-01 | src/run/gates.js |
| task-04 | quick/execute 钩子集成测 | P0 | runtime | task-02, task-03 | test/concurrent-preflight-hooks.test.mjs |
| task-05 | 全量回归 + 文档同步评估 | P0 | runtime, docs | task-01..04（Wave 4 串行） | src/run/concurrent-detect.js |

## 验收（AC）
- AC-01: detectConcurrentChanges 正确分类 foreignFiles（非 metadata、非 ownFiles）与 otherActiveChanges（去重脏变更目录）（FR-01/02）
- AC-02: formatConcurrentWarning hasForeign=true 返回多行 ⚠️ 串含文件清单 + pathspec 提示；hasForeign=false 返回 null（FR-03）
- AC-03: git status 读失败 → hasForeign=false + gitError，不抛异常（FR-04 fail-open）
- AC-04: quick --done 多 agent 脏工作树场景，本会话 baselineFiles 不被误报他者（D-001）
- AC-05: quick --done review=null（brownfield 无 guard）不抛 TypeError（D-003）
- AC-06: execute --done in-place 模式本变更交付文件不被误报他者（D-002）
- AC-07: 检测不阻断——audit result.status / gate 通过性 / isQuickMetadata 语义不变（FR-07）
- AC-08: 干净仓（无他者并发）quick/execute --done 零额外输出（FR-07）
- AC-09: npm test 全绿（含 2 新测试文件）+ npm run lint 通过
- AC-10: 文档同步评估完成（预期无 file-lifecycle/prompt/SKILL 改动，如实记录）

## 覆盖矩阵（FR/D × Task）
| FR / D | 覆盖 Task | 验收证据 |
|---|---|---|
| FR-01 foreignFiles | task-01 | AC-01 |
| FR-02 otherActiveChanges | task-01 | AC-01 |
| FR-03 warn 格式 | task-01 | AC-02 |
| FR-04 fail-open | task-01 | AC-03 |
| FR-05 quick 钩子 | task-02, task-04 | AC-04, AC-05 |
| FR-06 execute 钩子 | task-03, task-04 | AC-06 |
| FR-07 不改语义 | task-02..05 | AC-07, AC-08, AC-09 |
| D-001 ownFiles+baseline | task-02 | AC-04 |
| D-002 execute ownFiles 源 | task-03 | AC-06 |
| D-003 review=null 兜底 | task-02 | AC-05 |
| D-004 trim:false | task-01 | AC-01 |
| D-005 术语澄清 | task-01 | AC-02 |
| D-006 措辞 | task-05 | AC-10 |
| D-007 verify/archive 排除 | task-05 | AC-10 |
| D-008 helper | task-01（deferred 内联） | AC-01 |
