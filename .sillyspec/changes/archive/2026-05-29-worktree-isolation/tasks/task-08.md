---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-08
title: execute 阶段后缀步骤改造
priority: P0
estimated_hours: 2h
depends_on: [task-03, task-04]
blocks: []
allowed_paths:
  - src/stages/execute.js (修改)
---

# task-08: execute 阶段后缀步骤改造

## 修改文件（必填）
- 修改 `src/stages/execute.js`

## 实现要求
1. 修改 `fixedSuffix` 中「完成确认」步骤的 prompt
2. 改为 apply 流程：先 check-only → 展示 diff 摘要 → 用户确认 → apply
3. 用户拒绝 apply → 提供 cleanup 选项
4. apply 失败 → 展示错误详情

## 接口定义（代码类任务必填）

```javascript
// 修改 fixedSuffix 中「完成确认」的 prompt：

const fixedSuffix = [
  // ... 知识库审阅（不变）...

  {
    name: '完成确认',
    prompt: `所有任务完成后的收尾。

### 操作
1. 运行 \`sillyspec worktree apply --check-only <change-name>\`
2. 展示 diff 摘要（文件列表 + 变更统计）
3. 检查结果说明（是否通过文件清单校验）
4. 用户确认后运行 \`sillyspec worktree apply <change-name>\`
5. apply 成功 → 自动 cleanup
6. apply 失败 → 展示错误详情，用户选择重试或手动处理
7. 如果用户不想 apply → 运行 \`sillyspec worktree cleanup <change-name>\` 丢弃
8. 建议下一步：\`sillyspec run verify\`

### 输出
apply 结果 + 下一步建议

### 注意
- 如果用户不想 apply → 运行 cleanup 丢弃
- 完成后运行 \`sillyspec run execute --done\` 即可自动推进阶段`,
    outputHint: 'apply 结果',
    optional: false
  }
]
```

### 控制流伪代码
```
fixedSuffix 修改：
  - 「知识库审阅」步骤不变
  - 「完成确认」步骤的 prompt 替换为上述内容
  - 不新增/删除步骤
```

## 边界处理（必填）
- apply --check-only 发现清单外文件 → prompt 指导 AI 展示清单外文件列表，让用户决定
- apply 时主工作区已被修改 → check-only 会报 base hash 不一致，prompt 指导 AI 展示错误
- 用户选择不 apply → prompt 指导 AI 运行 cleanup 丢弃 worktree
- changeName 不存在 → progress.json 中应已有
- 不修改其他后缀步骤

## 非目标（本任务不做的事）
- 不修改 acceptanceSteps（对照设计检查、运行测试、代码审查）
- 不修改前缀步骤（task-06 负责）
- 不修改 applyWorktree 内部逻辑（task-03 负责）

## 参考
- `src/stages/execute.js` — fixedSuffix 数组定义（约第 100-120 行）
- design.md §4.2 — 后缀步骤改造设计

## TDD 步骤
1. 执行到「完成确认」步骤，验证 prompt 包含 apply 流程指令
2. 手动验证 apply --check-only → apply 的完整流程

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | execute 到达「完成确认」步骤 | prompt 包含 `sillyspec worktree apply --check-only` 和 `sillyspec worktree apply` 指令 |
| AC-02 | prompt 包含 cleanup 选项 | prompt 包含 `sillyspec worktree cleanup` 指令 |
| AC-03 | prompt 包含下一步建议 | prompt 包含 `sillyspec run verify` 建议 |
| AC-04 | 其他后缀步骤不变 | 知识库审阅步骤内容未改变 |
