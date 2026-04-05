# 生命周期

## 工作流

### 🟢 绿地项目（空目录）

```
init → brainstorm → plan → execute → [verify] → archive
```

### 🟤 棕地项目（有代码）

```
scan → brainstorm → plan → execute → [verify] → archive
```

### 🧩 大模块

```
brainstorm(多图) → 拆分 → MASTER.md → stage-1 全流程 → stage-2 → ... → archive
```

### ⚡ 快速通道

```
quick "描述" → 直接执行
explore "想法" → 讨论不写码
```

## 进度管理

### progress.json

位于 `.sillyspec/.runtime/progress.json`，记录当前阶段和任务状态：

```json
{
  "project": "my-app",
  "currentStage": "execute",
  "stages": {
    "scan": { "status": "completed", "updatedAt": "2026-04-05T10:00:00Z" },
    "brainstorm": { "status": "completed", "updatedAt": "2026-04-05T11:00:00Z" },
    "plan": { "status": "completed", "updatedAt": "2026-04-05T11:30:00Z" },
    "execute": { "status": "in_progress", "updatedAt": "2026-04-05T12:00:00Z" }
  }
}
```

### STATE.md

每个项目的工作状态文件，AI 直接读写：

```markdown
# 当前状态
- 阶段：execute
- 任务：Wave 2/3
- 下一步：完成登录模块
```

## 中断恢复

工作中断时，使用 resume 恢复：

```bash
/sillyspec:resume
```

会读取 STATE.md 和 progress.json，从上次中断的位置继续。

也可以用 continue 自动判断下一步：

```bash
/sillyspec:continue
```
