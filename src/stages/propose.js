export const definition = {
  name: 'propose',
  title: '方案设计',
  description: '生成结构化规范 — proposal + design + tasks',
  steps: [
    {
      name: '状态检查',
      prompt: `检查当前状态，确认可以执行 propose。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "propose"
3. 如果没有设计文档 → 提示先运行 brainstorm

### 输出
当前状态摘要`,
      outputHint: '状态摘要',
      optional: false
    },
    {
      name: '加载上下文',
      prompt: `加载所有相关规范和代码库上下文。

### 操作
1. 加载 CODEBASE-OVERVIEW.md 和子项目上下文
2. 读取最新设计文档、需求文档、代码库约定
3. 如果是子阶段变更，读取 MASTER.md 和前序阶段设计

### 输出
已加载的文件列表`,
      outputHint: '文件列表',
      optional: false
    },
    {
      name: '锚定确认',
      prompt: `确认已读取的文件。

### 操作
1. 列出已读取的文件，标注存在/不存在
2. 格式：\`[x] 文件名 — 说明\` 或 \`[ ] 文件名 — 不存在（正常）\`

### 输出
文件加载确认清单

### 注意
- 文件不存在不是错误，正常标注即可`,
      outputHint: '文件确认清单',
      optional: false
    },
    {
      name: '探索现有代码',
      prompt: `理解相关模块的当前实现，识别影响范围。

### 操作
1. 根据设计文档中的文件变更清单，读取相关源码
2. 识别现有接口、方法签名、数据结构
3. 记录可能受影响的模块

### 输出
影响范围分析（涉及模块、需修改的文件、风险点）`,
      outputHint: '影响范围分析',
      optional: false
    },
    {
      name: '生成规范文件',
      prompt: `在 \`.sillyspec/changes/<变更名>/\` 下生成四个文件。

### 操作
1. 生成 proposal.md：动机、变更范围、不在范围内、成功标准
2. 生成 requirements.md：功能需求、用户场景（Given/When/Then）、非功能需求
3. 生成 design.md：架构决策、文件变更清单、数据模型、API 设计、代码风格参照
4. 生成 tasks.md：任务列表（只列名称，不展开步骤）

### 输出
四个文件路径

### 注意
- 表名/字段名必须来自真实 schema 或标注"新增"
- 用户场景必须用 Given/When/Then 格式
- tasks.md 只列任务名，细节在 plan 阶段展开`,
      outputHint: '四个文件路径',
      optional: false
    },
    {
      name: '自检门控',
      prompt: `自检生成的规范文件。

### 操作
检查以下各项：
- [ ] proposal.md 有动机、变更范围、不在范围内、成功标准
- [ ] design.md 有文件变更清单表格
- [ ] requirements.md 有 Given/When/Then 用户场景
- [ ] tasks.md 每个 task 有文件路径

任何不通过 → 修正后重新检查。

### 输出
自检通过/不通过`,
      outputHint: '自检结果',
      optional: false
    },
    {
      name: '展示并更新进度',
      prompt: `展示规范给用户，更新进度。

### 操作
1. 展示 proposal.md 和 design.md 摘要

### 输出
展示结果 + 下一步命令`,
      outputHint: '展示结果',
      optional: false
    }
  ]
}
