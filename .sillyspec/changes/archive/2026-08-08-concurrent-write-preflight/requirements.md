---
author: qinyi
created_at: 2026-08-08 13:10:07
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| Agent（主消费者） | 跑 `quick --done` / `execute --done` 的 agent，靠 warn 感知他者并发，提交时用显式 pathspec 隔离 |
| 多 agent 仓 | 立身前提就是多 agent 并发编辑同一仓库，本功能为其提供撞车预警 |

## 功能需求

### FR-01: 检测他者脏文件（foreignFiles）
覆盖决策：B-01@v1, B-04@v1, B-08@v1
Given 主仓工作树存在脏文件，其中部分属他者会话真实业务文件、部分属本变更（ownFiles）、部分属 quick 元数据
When `detectConcurrentChanges(cwd, { changeName, linkedChanges, ownFiles })` 调用
Then 返回 `foreignFiles` = 脏文件里非 metadata、不在 ownFiles 的真实业务文件；`hasForeign=true` 当且仅当 foreignFiles 或 otherActiveChanges 非空

### FR-02: 检测脏变更目录（otherActiveChanges）
覆盖决策：B-05@v1, B-08@v1
Given 脏文件落在 `.sillyspec/changes/<他者变更>/` 下
When detectConcurrentChanges 调用
Then 返回 `otherActiveChanges` = 去重的他者变更名集合（排除 changeName 自身、排除 linkedChanges）；该信号不受 ownFiles 准确性影响，始终可靠

### FR-03: 非阻塞 advisory 警告格式
覆盖决策：design §2/§9
Given detectConcurrentChanges 返回 hasForeign=true
When `formatConcurrentWarning(d)` 调用
Then 返回多行 `⚠️` 警告串，含 foreignFiles 清单 + otherActiveChanges + 「提交用显式 pathspec 隔离，勿 git add .」提示；hasForeign=false 时返回 null

### FR-04: fail-open（git status 不可读）
覆盖决策：design §9
Given `git status --porcelain` 读失败（safeGit error）
When detectConcurrentChanges 调用
Then 返回 `{ hasForeign:false, foreignFiles:[], otherActiveChanges:[], gitError:<错误串> }`，不抛异常、不阻断、不误报

### FR-05: quick --done 钩子（ownFiles 含 baseline）
覆盖决策：B-01@v1, B-03@v1
Given 多 agent 脏工作树下跑 `quick --done`，本会话预存文件在 baselineFiles
When quick 完成路径执行（complete-handlers.js auditQuickCompletion 调用点旁）
Then 调 detectConcurrentChanges({ ownFiles: `review.changedFiles ∪ guard.baselineFiles` })，有他者则 console.warn，不阻断；review=null（brownfield 无 guard）时 ownFiles 兜底为 []，不抛 TypeError

### FR-06: execute --done 钩子（ownFiles 源优先级链）
覆盖决策：B-02@v1
Given `execute --done` 完成门（gates.js completeStageGates，stageName==='execute'）
When 钩子执行
Then ownFiles 取值优先级链 = worktree applied 文件 > plan allowed_paths > design §6 文件清单 > 空（仅 worktree 模式允许空）；in-place 模式至少用 design/plan 声明文件，避免自身交付被误报他者；有他者则 console.warn 不阻断

### FR-07: 不改既有语义（回归守护）
覆盖决策：design §2/§9
Given 任意 quick/execute --done 流程
When 并发预检启用
Then audit result.status / gate 通过性 / isQuickMetadata 返回值 / 阶段流转 / gate-status.json 结构 完全不变；干净仓零额外输出

## 非功能需求

- **跨平台**：Windows/Linux/macOS 路径与 CRLF 兼容（复用 safeGit + parsePorcelainPath 既有跨平台处理，B-04 强制 trim:false）。
- **性能**：单次 git status 调用，不额外增重 quick/execute --done。
- **可测**：检测核心为纯函数，无需起完整 CLI 即可单测。
