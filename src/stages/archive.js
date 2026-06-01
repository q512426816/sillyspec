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
      name: 'extract-module-impact',
      prompt: `分析本次变更影响的模块，生成模块影响记录。

### 操作
1. 读取变更目录下的 proposal.md、design.md、tasks.md
2. 运行 \`git diff --name-only HEAD~1\`（或 \`git diff --name-only --cached\`）获取真实修改文件列表
3. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`
   - **如果不存在**：提示"建议运行 scan 生成模块映射"，但继续执行。跳到步骤 7 生成只有 unmapped 部分的 module-impact.md
4. 三重交叉验证：
   - 声明范围：proposal.md / design.md 中的"变更范围"/"文件变更清单"
   - 任务范围：tasks.md / plan.md 中的任务文件路径
   - 真实变更：git diff 文件列表
   - **以 git diff 为准**（真实 > 声明）
5. 将 git diff 文件按 \`_module-map.yaml\` 的 paths glob 匹配到模块
6. 生成模块影响矩阵：

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 |
|------|----------|----------|-------------|

   影响类型：逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增

7. 未匹配到任何模块的文件归入"未匹配文件"表格
8. 生成 \`.sillyspec/changes/<change-name>/module-impact.md\`，格式：

\`\`\`markdown
# 模块影响分析

author: <git-user>
created_at: <now-datetime>

## 变更：<change-name>

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 |
|------|----------|----------|-------------|

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|

## 更新结果
（sync-module-docs 步骤完成后回填）
| 模块文档 | 操作 | 状态 |
|----------|------|------|
\`\`\`

### 输出
module-impact.md 路径 + 影响模块数量 + 未匹配文件数量`,
      outputHint: 'module-impact.md 路径 + 影响摘要',
      optional: false
    },
    {
      name: 'sync-module-docs',
      prompt: `根据 module-impact.md 同步更新模块设计文档。

### 原则
- 模块文档正文**永远描述当前状态**（快照模式），不是变更日志
- 底部只保留轻量变更索引
- 模块文档是下一次 AI 开发前必须读取的上下文

### 操作
1. 读取 \`.sillyspec/changes/<change-name>/module-impact.md\`
2. 如果没有受影响模块（只有 unmapped）→ 提示用户，跳过同步
3. 对每个受影响模块：
   a. 读取 \`.sillyspec/docs/<project>/modules/<module>.md\`（如不存在则新建）
   b. 根据 module-impact.md 中的"更新内容摘要"，更新模块文档
   c. **更新规则**：
      - 新建：全量生成，使用下方模板
      - 更新：只改相关章节（当前设计/对外接口/依赖关系等），保持其他章节不变
      - 正文重写为当前状态，不追加历史
      - 底部"变更索引"追加一行：\`| <日期> | <变更名> | <一句话摘要> |\`
   d. 更新头部元数据：\`> 最后更新：<now-date>\`、\`> 最近变更：<change-name>\`
4. 展示所有模块文档的更新内容（diff 摘要），请用户确认
5. 用户确认后，写入 \`.sillyspec/docs/<project>/modules/*.md\`
6. 用户拒绝时，不写入模块文档，但提示"module-impact.md 已保留，可稍后手动同步"
7. 回填 module-impact.md 的"更新结果"表格

### 模块文档模板
\`\`\`markdown
# <module-name>

> 最后更新：<now-date>
> 最近变更：<change-name>
> 模块路径：<glob patterns>

## 职责
（一句话说清这个模块做什么）

## 当前设计
（架构、数据流、关键逻辑 — 描述当前状态，不是历史）

## 对外接口
| 接口 | 说明 | 调用方 |
|------|------|--------|

## 关键数据流
\`\`\`text
调用方 → 模块.方法() → 依赖模块.方法() → 返回结果
\`\`\`

## 设计决策
| 决策 | 理由 | 来源 |
|------|------|------|

## 依赖关系
### 依赖本模块
### 本模块依赖

## 注意事项
（维护提醒、已知限制、修改时需同步检查的模块）

## 变更索引
| 日期 | 变更 | 摘要 |
|------|------|------|
\`\`\`

### 输出
已更新的模块文档路径列表 + 用户确认状态`,
      outputHint: '模块文档更新结果',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `确认归档内容并执行目录移动。

### 操作
1. 展示：变更目录名、包含的文件列表（含 module-impact.md）、生成总结
2. **直接执行归档**（本步骤完成后自动移动）：
   - 创建 archive 目录：\`mkdir -p .sillyspec/changes/archive\`
   - 移动变更目录：\`mv .sillyspec/changes/<change-name> .sillyspec/changes/archive/<change-name>\`
   - 确认移动成功：\`ls .sillyspec/changes/archive/<change-name>/\`
3. 确保所有 checkbox 都已勾选

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
4. 更新 sillyspec.db 中的阶段状态：
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
