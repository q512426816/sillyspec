# Progress Format — AI 写入规范

> 本文件供 AI 在各阶段执行时参考，规范 progress.json 和 user-inputs.md 的写入方式。

## 文件位置

- **进度文件：** `.sillyspec/.runtime/progress.json`
- **用户输入记录：** `.sillyspec/.runtime/user-inputs.md`

## progress.json 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_version` | number | 内部版本号，固定为 `1` |
| `schemaVersion` | string | Schema 版本，固定为 `"1.0.0"` |
| `currentStage` | string | 当前阶段：`brainstorm` / `propose` / `plan` / `execute` / `verify` |
| `lastActiveAt` | string | ISO 8601 时间戳，每次更新时刷新 |
| `resumeCount` | number | 恢复次数，每次恢复时 +1 |
| `checkpoint` | string | 一句话描述当前进度（给恢复时快速定位） |
| `stages.<stage>.status` | string | 阶段状态：`not_started` / `in_progress` / `completed` |
| `stages.<stage>.completedSteps` | number[] | 已完成步骤 ID 列表 |
| `stages.<stage>.inProgressStep` | object/null | 当前进行中的步骤：`{ id, name, startedAt, partialContext }` |
| `stages.<stage>.summaries` | object | 步骤结论，key 为步骤 ID，value 见下方 |
| `stages.<stage>.artifacts` | array | 产出文件列表：`[{ stepId, name, paths }]` |
| `stages.<stage>.stageSummary` | string/null | 阶段总结 |

### summaries 结构

```json
{
  "1": {
    "conclusion": "一句话结论",
    "keyEntities": ["实体1", "实体2"],
    "decisions": ["决定A"],
    "rejectedAlternatives": ["被否的方案B"],
    "userMessages": ["用户原话摘要"],
    "openQuestions": ["未解决的问题"]
  }
}
```

## user-inputs.md 格式

每步完成时 **append**（不覆盖）用户在本步说的所有原话：

```markdown
# 用户输入记录

## Step 1 - 需求理解 (2026-04-05 00:30)
- 我们主要做研发项目管理，不搞CRM
- 目标用户是中大型团队，50人以上

## Step 3 - 竞品分析 (2026-04-05 00:45)
- Jira太重了，我们想做轻的
- 排期最烦了，能不能AI帮搞
```

### 时间戳格式

`YYYY-MM-DD HH:MM`

### 获取当前时间

- JavaScript：`new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false }).slice(0, 16)` → `"2026-04-05 13:37"`
- 或 shell 命令：`date '+%Y-%m-%d %H:%M'`

## 每步完成后的保存流程

1. **更新 progress.json**：
   - 将步骤 ID 加入 `completedSteps`
   - 清空 `inProgressStep`（或设为下一步）
   - 在 `summaries` 中写入本步结论
   - 刷新 `lastActiveAt`
   - 更新 `checkpoint`（一句话描述）

2. **Append user-inputs.md**：
   - 追加 `## Step N - 步骤名 (YYYY-MM-DD HH:MM)` 段落
   - 列出用户在本步的所有原话
   - **不要删除之前的内容，只追加**

3. **如果阶段完成**：
   - 设置 `stages.<stage>.status = "completed"`
   - 写入 `stageSummary`
   - 更新 `currentStage` 为下一阶段

## 多任务并行说明

- `quick` 命令**不修改** progress.json，独立执行
- quick 完成后主流程状态不变，直接继续
- `resume` 恢复时忽略 quick 的内容
