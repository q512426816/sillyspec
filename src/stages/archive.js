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
4. 如有遗漏 → **必须暂停等待用户决定**，不要自行判断"可以归档"
   - 调用：\`sillyspec run archive --wait --reason "存在未完成任务，是否继续归档" --options "继续归档,回到execute完成剩余任务" --output "未完成任务列表"\`

### 输出
完成度报告（已勾选/总数 + 未完成任务列表）`,
      outputHint: '完成度报告',
      optional: false
    },
    {
      name: 'extract-module-impact',
      prompt: `按照 \`.sillyspec/workflows/archive-impact.yaml\` 中定义的 \`impact-analyzer\` 角色规则，分析本次变更影响的模块。

### 操作
1. 读取 \`.sillyspec/workflows/archive-impact.yaml\`，了解角色定义和检查规则
2. 读取变更目录下的 proposal.md、design.md、tasks.md
3. 运行 \`git diff --name-only HEAD~1\`（或 \`git diff --name-only --cached\`）获取真实修改文件列表
4. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`
   - **如果不存在**：提示"建议运行 scan 生成模块映射"，但继续执行。跳到步骤 7 生成只有 unmapped 部分的 module-impact.md
5. 三重交叉验证：
   - 声明范围：proposal.md / design.md 中的"变更范围"/"文件变更清单"
   - 任务范围：tasks.md / plan.md 中的任务文件路径
   - 真实变更：git diff 文件列表
   - **以 git diff 为准**（真实 > 声明）
6. 将 git diff 文件按 \`_module-map.yaml\` 的 paths glob 匹配到模块
7. 生成模块影响矩阵：

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|

   影响类型：逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增
   needs_review：如果影响无法完全确定，标记为 true

8. 未匹配到任何模块的文件归入"未匹配文件"表格
9. 生成 \`.sillyspec/changes/<change-name>/module-impact.md\`
10. 完成后运行 workflow 检查：
    \`node -e "import('./src/workflow.js').then(w => { /* 用 loadWorkflow 加载 archive-impact，用 runPostCheck 检查 */ })\``,
      outputHint: 'module-impact.md 路径 + 影响摘要',
      optional: false
    },
    {
      name: 'sync-module-docs',
      prompt: `根据 module-impact.md 同步更新模块索引和卡片文档。

### ⚠️ 核心原则：结构化事实改 _module-map.yaml，语义解释改模块卡片
- \`_module-map.yaml\` 是唯一的结构化索引源（paths/tags/entrypoints/depends_on/used_by/status/needs_review）
- 模块卡片只负责语义说明（定位/契约摘要/关键逻辑/注意事项/人工备注）
- 一个信息只维护一次，不要两边重复

### 操作
1. 读取 \`.sillyspec/changes/<change-name>/module-impact.md\`
2. 如果没有受影响模块（只有 unmapped）→ 提示用户，跳过同步
3. 对每个受影响模块，按影响类型分别更新：

#### 更新 _module-map.yaml 的规则
- **路径变化** → 更新对应模块的 paths
- **依赖变化** → 更新 depends_on / used_by（同时更新反向模块的 used_by / depends_on）
- **导出符号变化** → 更新 entrypoints / main_symbols
- **新增模块** → 添加完整条目
- **模块废弃** → status: deprecated
- **不确定的影响** → needs_review: true, review_reasons 追加原因
- 如果 _module-map.yaml 的 generated_at 已过时，更新为当前时间

#### 更新模块卡片（modules/<module-id>.md）的规则
- **契约语义变化**（新增/删除对外能力） → 更新"契约摘要"
- **关键逻辑变化** → 更新"关键逻辑"
- **边界变化**（模块职责扩大/缩小） → 更新"定位"
- **注意事项变化** → 更新"注意事项"
- **内部实现变化**（不影响对外接口） → 通常不更新卡片
- **人工备注** → 永远保护，不覆盖

#### 人工备注保护
1. 用正则提取 \`<!-- MANUAL_NOTES_START -->\` 到 \`<!-- MANUAL_NOTES_END -->\` 之间的内容
2. 生成新卡片后，原样回填到人工备注区域
3. 如果标记缺失或重复 → 在 _module-map.yaml 中标记 needs_review: true

#### 新建模块卡片模板
\`\`\`markdown
---
schema_version: 1
doc_type: module-card
module_id: <module-id>
---

# <module-id>

## 定位

## 契约摘要

## 关键逻辑

## 注意事项

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
\`\`\`

4. 展示所有更新内容（diff 摘要），**必须暂停等待用户确认**
   - 调用：\`sillyspec run archive --wait --reason "等待用户确认模块文档同步" --options "确认写入,跳过同步" --output "diff 摘要"\`
5. **只有用户通过 --continue --answer "确认写入" 后才写入文件**
   - 写入 _module-map.yaml 和受影响的模块卡片
6. 用户拒绝时，不写入，但提示"module-impact.md 已保留，可稍后手动同步"
7. 回填 module-impact.md 的"更新结果"表格，区分目标：
   - 目标列写 "\`_module-map.yaml: <module-id>\`" 或 "\`modules/<module-id>.md\`"
8. **同步完成后**，运行 \`sillyspec modules rebuild\` 刷新索引（如果需要），或手动更新 dependencies.md

### 输出
已更新的文件路径列表 + 用户确认状态`,
      outputHint: '模块文档更新结果',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `确认归档内容，由 CLI 执行目录移动。

### 操作
1. 展示：变更目录名、包含的文件列表（含 module-impact.md）、生成总结
2. 确保所有 checkbox 都已勾选
3. 让用户确认后，用 \`--confirm\` 完成本步骤：
   \`sillyspec run archive --done --confirm --output "确认归档"\`
4. CLI 会创建 \`.sillyspec/changes/archive/\`，并将变更目录移动到 \`.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/\`

### 输出
归档完成 + archive 目录路径`,
      outputHint: '归档确认',
      optional: false
    },
    {
      name: '更新路线图和提交',
      prompt: `更新路线图并暂存变更。

### 操作
1. 如果 \`.sillyspec/ROADMAP.md\` 存在，标记对应 Phase 为已完成
2. \`git add .sillyspec/changes/\` — 暂存归档结果（不要 commit，由用户通过统一提交工具处理）
3. \`git add .sillyspec/docs/\` — 暂存模块文档更新（如有）
4. 确认 sillyspec.db 中该变更已不再 active（确认归档步骤由 CLI 调用 unregisterChange）

### 输出
归档完成确认 + 累积规范统计`,
      outputHint: '归档完成',
      optional: false
    }
  ]
}
