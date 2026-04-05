export const definition = {
  name: 'archive',
  title: '归档变更',
  description: '规范沉淀，可追溯',
  auxiliary: true,
  steps: [
    {
      name: '任务完成度检查',
      prompt: `检查 tasks.md 中所有 checkbox 是否已勾选。

### 操作
1. 读取 \`.sillyspec/changes/<change-name>/tasks.md\`
2. 检查所有 checkbox 是否已勾选
3. 如有遗漏 → 询问用户是否继续归档

### 输出
完成度报告`,
      outputHint: '完成度报告',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `展示即将归档的内容，请用户确认。

### 操作
1. 展示：变更目录名、包含的文件列表、生成总结
2. 请用户确认是否执行归档
3. 确认后：将 \`.sillyspec/changes/<change-name>/\` 移动到 \`.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/\`
4. 确保所有 checkbox 都已勾选

### 输出
归档确认`,
      outputHint: '归档确认',
      optional: false
    },
    {
      name: '更新路线图和提交',
      prompt: `更新路线图并 Git 提交。

### 操作
1. 如果 \`.sillyspec/ROADMAP.md\` 存在，标记对应 Phase 为已完成
2. \`git add .sillyspec/ && git commit -m "docs: archive sillyspec change <change-name>"\`
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
