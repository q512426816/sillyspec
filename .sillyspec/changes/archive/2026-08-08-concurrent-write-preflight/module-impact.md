---
author: qinyi
created_at: 2026-08-08T14:40:00+08:00
type: module-impact
---

# 模块影响分析（Module Impact）— 多 agent 并发写预检

## 变更概要
新增并发写预检：quick --done + execute --done 完成前扫描工作树他者改动，非阻塞 advisory console.warn。纯函数检测核心（detectConcurrentChanges + formatConcurrentWarning）+ 两处完成路径钩子（complete-handlers.js quick / gates.js execute）+ 单元/集成测试。

## 数据源（三重交叉验证）
- 声明范围：design.md §6 文件清单（concurrent-detect.js 新 + complete-handlers.js/gates.js 改 + test/concurrent-detect.test.mjs/test/concurrent-preflight-hooks.test.mjs 新）
- 任务范围：plan.md task-01..05 allowed_paths
- 真实变更（git diff 主仓工作区未 commit）：src/run/concurrent-detect.js(??新) + src/run/complete-handlers.js(M) + src/run/gates.js(M) + test/concurrent-detect.test.mjs(??新) + test/concurrent-preflight-hooks.test.mjs(??新) + .sillyspec/changes/2026-08-08-concurrent-write-preflight/ 文档
- 三重一致：声明 = 任务 = 真实，本变更核心 5 文件齐
- ⚠️ git diff 另含 `.sillyspec/quicklog/QUICKLOG-qinyi.md`(M) + `docs/sillyspec/prompt-control-debt.md`(M)，**非本变更**（并发会话/历史改动残留），不入本模块影响分析；archive commit 须精确 pathspec 排除，勿 git add . 扫入

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|---|---|---|---|---|
| runtime | 新增 | src/run/concurrent-detect.js | 新检测核心：detectConcurrentChanges(cwd,{changeName,linkedChanges,ownFiles})→{hasForeign,foreignFiles,otherActiveChanges,gitError} + formatConcurrentWarning(detected)→string|null + 内联 extractChangeDir；复用 shared.js 的 isQuickMetadata/safeGit/parsePorcelainPath，不改其语义 | false |
| runtime | 逻辑变更 | src/run/complete-handlers.js | handleQuickStageCompletion 内 auditQuickCompletion 调用后加并发预检钩子（+29 行）：ownFiles=review?.changedFiles∪mergedGuard?.baselineFiles（D-001），review=null brownfield ??[]兜底（D-003），try/catch fail-open（FR-07），不改 review.status/不 exit/不 return early | false |
| runtime | 逻辑变更 | src/run/gates.js | completeStageGates 入口 guard stageName==='execute' 加并发预检钩子 + 新 helper readDesignOwnFiles(specBase,changeName)（design §6 文件清单解析）：ownFiles 两分支 meta.mode==='in-place-fallback'→readDesignOwnFiles / 否则 worktree→[]（D-002），双 try/catch fail-open（FR-07），guard 仅 execute 不影响他 stage | false |

## 测试文件（runtime 模块测试覆盖）
| 文件 | 类型 | 覆盖 |
|---|---|---|
| test/concurrent-detect.test.mjs | 新增单元测（30 断言） | detectConcurrentChanges + formatConcurrentWarning 纯函数：foreignFiles 分类 / otherActiveChanges 去重 / ownFiles baseline 排除 / gitError fail-open / trim:false（?? + space-leading M 两路）/ format null+清单+D-005 文案 / 端到端 |
| test/concurrent-preflight-hooks.test.mjs | 新增集成测（25 断言） | Part A 钩子行为（A1 quick ownFiles D-001 / A2 execute in-place D-002 / A3 干净仓 warn=null AC-08 / A4 他者脏变更目录 D-005）+ Part B 挂载契约（B1 quick 钩子在 complete-handlers / B2 execute 钩子在 gates completeStageGates） |

## 未匹配文件
- `.sillyspec/changes/2026-08-08-concurrent-write-preflight/` 下文档（design/proposal/requirements/tasks/plan/decisions/verify-result/tasks/task-NN.md）：变更过程文档，非源码模块，随 change 目录归档。
- `.sillyspec/quicklog/QUICKLOG-qinyi.md` + `docs/sillyspec/prompt-control-debt.md`：**非本变更**（git diff 夹带的并发/历史残留），不入模块影响，commit 须排除。

## 模块文档同步评估
- runtime 模块卡片（modules/runtime.md）：本变更新增 concurrent-detect.js（并发预检检测核心）+ complete-handlers/gates 两处 advisory warn 钩子。属纯加性 advisory，不改 runtime 模块核心职责（流程控制/阶段推进/gate 校验）。可选补 concurrent-detect.js 条目；needs_review=false（影响确定）。
- _module-map.yaml：schema_version=1 旧格式（无 paths glob），模块集合不变（只新增文件不新增模块），runtime 条目无需改。
- 不触发 file-lifecycle / prompt / SKILL 文档同步（本变更不涉 src/stages/*.js 或 src/run.js/src/progress.js 阶段定义）。

## 结论
本变更影响集中在 **runtime 模块**（src/run/），纯加性 advisory（新检测函数 + 两处非阻塞 warn 钩子），不改模块核心职责/对外接口/数据结构/gate 语义/状态机。needs_review=false（影响完全确定）。非阻断 advisory 设计（FR-07）保证零行为回归风险（干净仓零输出，design §9）。
