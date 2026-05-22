export const definition = {
  name: 'archive',
  title: '归档变更',
  description: '规范沉淀，可追溯',
  steps: [
    {
      name: '任务完成度检查',
      prompt: `检查 plan.md 中所有任务 checkbox 是否已勾选（plan.md 是任务完成的唯一真相源）。

### 操作
1. 读取 \`.sillyspec/changes/<change-name>/plan.md\`
2. 检查所有 \`- [x]\` checkbox 是否已勾选
3. 如果 plan.md 不存在，回退读取 tasks.md 作为备选
4. 如有遗漏 → 询问用户是否继续归档

### 输出
完成度报告（已勾选/总数 + 未完成任务列表）`,
      outputHint: '完成度报告',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `展示即将归档的内容，请用户确认。

### 操作
1. 展示：变更目录名、包含的文件列表、生成总结
2. 请用户确认是否执行归档
3. 确认后：将 \.sillyspec/changes/<change-name>/ 移动到 \.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/
4. 确保所有 checkbox 都已勾选

### 归档执行
确认归档后，执行以下命令自动完成目录移动：
\	\	sillyspec run archive --done --confirm --output "确认归档"
- \`--confirm\` 标志会自动执行目录移动（原子操作）
- 不带 \`--confirm\` 则只提示需要确认

### 输出
归档确认`,
      outputHint: '归档确认',
      optional: false
    },
    {
      name: '更新路线图和提交',
      prompt: `更新路线图并暂存变更。

### 操作
1. 如果 \`.sillyspec/ROADMAP.md\` 存在，标记对应 Phase 为已完成
2. \`git add .sillyspec/changes/\` — 暂存归档结果（不要 commit，由用户通过统一提交工具处理）
3. 更新 progress.json：
   - 清除当前变更信息（归档后不再活跃）
   - 如果是主变更（有 MASTER.md），标记所有阶段为 ✅，然后清除
   - 历史记录追加时间 + 归档完成

### 输出
归档完成确认 + 累积规范统计`,
      outputHint: '归档完成',
      optional: false
    }
  ]
}
