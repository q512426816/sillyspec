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

### 模块文档加载
4. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
5. 根据当前提案初步判断涉及的模块（匹配提案中的文件路径到 _module-map.yaml 的 paths）
6. 读取匹配到的 \`.sillyspec/docs/<project>/modules/<module>.md\`
7. 如果发现提案中的变更范围与某个模块文档描述的当前设计存在潜在冲突，在后续提案中明确标注并说明处理方案

### 输出
已加载的文件列表（含模块文档）`,
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

### proposal.md 格式要求
- **动机**：为什么做、解决什么核心问题
- **关键问题**：为什么现有方案不够（展开 2-3 个具体痛点）
- **变更范围**：本次做什么
- **不在范围内**（显式清单）：不做 X、不做 Y
- **成功标准**（可验证条件）：旧配置默认行为不变、新功能配置后可用

### requirements.md 格式要求
- **角色表**：涉及的角色和说明
- **FR 编号需求**：FR-01、FR-02 ... 每条需求用 Given/When/Then 格式
- **每个边界条件**独立 GWT 块
- **非功能需求**：兼容性、可回退、可测试、可扩展

### design.md 格式要求
- **架构决策** + **文件变更清单表格** + **接口定义**
- **兼容策略**（brownfield 必填）：未配置新功能时行为不变、回退路径
- **风险登记**表格：编号/风险/等级/应对策略
- **自审**：需求覆盖、真实性、YAGNI、非目标

### tasks.md 格式要求
- 任务列表（只列名称，不展开步骤）
- 每个 task 附文件路径

### 操作
1. 生成 proposal.md
2. 生成 requirements.md
3. 生成 design.md
4. 生成 tasks.md

### 输出
四个文件路径

### 注意
- 表名/字段名/类名必须来自真实代码或标注"新增"
- 用户场景必须用 Given/When/Then 格式
- tasks.md 只列任务名，细节在 plan 阶段展开`,

      name: '自检门控',
      prompt: `自检生成的规范文件。

### 操作
检查以下各项：
- [ ] proposal.md 有动机、关键问题、变更范围、不在范围内、成功标准
- [ ] design.md 有文件变更清单表格
- [ ] design.md 有兼容策略（brownfield 时）
- [ ] design.md 有风险登记表格
- [ ] requirements.md 有角色表
- [ ] requirements.md 有 FR 编号和 Given/When/Then 用户场景
- [ ] tasks.md 每个 task 有文件路径

任何不通过 → 修正后重新检查。

### 输出
自检通过/不通过`,

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
