# Resume Dialog Template

> 此模板用于 AI 恢复中断的 SillySpec 工作流程。

## 恢复流程

当用户执行 `resume` 或对话中断后恢复时，按以下步骤操作：

### 1. 读取进度

```
读取 .sillyspec/.runtime/progress.json
读取 .sillyspec/.runtime/user-inputs.md（截取当前阶段相关部分）
读取 .sillyspec/STATE.md
```

### 2. 向用户确认

用简洁的语言告知：

- 当前阶段和步骤
- 上次做到哪里（checkpoint）
- 距上次活跃时间
- 下一步要做什么

**示例：**

> 📋 上次你在 **brainstorm** 阶段的 **Step 4 - 技术选型**，已经讨论了前端框架的选择。
> 距今约 2 小时。要继续技术选型，还是回顾一下之前的结论？

### 3. 恢复上下文

从 `summaries` 和 `user-inputs.md` 中提取之前的关键信息，注入对话：

- 已完成的步骤结论
- 已做的决策和被否的方案
- 未解决的问题
- 用户的关键偏好

### 4. 继续执行

从 `inProgressStep` 指定的步骤继续。如果 `inProgressStep` 为空但从 `completedSteps` 可推断进度，则从下一步开始。

### 5. 更新进度

- `resumeCount` +1
- 刷新 `lastActiveAt`
- 开始执行后更新 `inProgressStep`

## 注意事项

- 不要重新问已完成步骤中已经确认的问题
- 除非用户主动要求，不要从头开始
- 如果 progress.json 损坏，告知用户并建议运行 `sillyspec progress validate`
- quick 任务不影响主流程进度
