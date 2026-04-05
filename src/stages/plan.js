export const definition = {
  name: 'plan',
  title: '实现计划',
  description: '编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码',
  steps: [
    {
      name: '状态检查',
      prompt: `检查当前状态，确认可以执行 plan。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "plan"

### 输出
当前状态摘要`,
      outputHint: '状态摘要',
      optional: false
    },
    {
      name: '加载上下文',
      prompt: `加载所有规范文件和代码库上下文。

### 操作
1. 检测工作区模式
2. 读取 proposal.md、design.md、tasks.md、requirements.md
3. 读取 CONVENTIONS.md、ARCHITECTURE.md、STACK.md
4. 工作区模式：额外加载 CODEBASE-OVERVIEW.md + 各子项目上下文

### 输出
已加载的文件清单`,
      outputHint: '文件清单',
      optional: false
    },
    {
      name: '锚定确认',
      prompt: `确认已读取的文件。

### 操作
列出已读取的文件，标注存在/不存在。

### 输出
文件加载确认清单`,
      outputHint: '文件确认清单',
      optional: false
    },
    {
      name: '逐任务展开',
      prompt: `把 tasks.md 中每个 checkbox 展开为详细步骤。

### 操作
对每个 Task：
1. 标注精确文件路径（新建/修改/测试）
2. 每个步骤 2-5 分钟可完成
3. 包含完整可运行的代码示例
4. 包含验证命令和预期输出
5. 频繁 commit，每个任务独立提交
6. 引用已有代码的方法签名（从 CONVENTIONS.md 或源码获取）

### 输出
展开后的详细计划

### 注意
- 假设执行者是熟练开发者但对你项目零上下文
- 不要写"添加验证逻辑"这种模糊描述
- 要写"在 UserController.java 添加方法：public Result<UserVO> createUser(...)"
- 调用已有方法前必须 grep 确认存在`,
      outputHint: '详细计划',
      optional: false
    },
    {
      name: '标注执行顺序',
      prompt: `按依赖关系分组，标注执行顺序。

### 操作
1. 分析 Task 间依赖
2. 无依赖的 Task 归入同一 Wave（可并行）
3. 有依赖的 Task 按顺序排列

### 输出
Wave 分组列表 + 依赖说明

### 示例
Wave 1（并行）：Task 1 + Task 2
Wave 2（依赖 Wave 1）：Task 3
Wave 3（依赖 Wave 2）：Task 4`,
      outputHint: 'Wave 分组和依赖关系',
      optional: false
    },
    {
      name: '自检门控',
      prompt: `自检计划质量。

### 操作
检查以下各项：
- [ ] 每个 task 有具体文件路径
- [ ] 每个 task 有验证命令和预期输出
- [ ] 已标注 Wave 和执行顺序
- [ ] plan 与 design.md 的文件变更清单一致

### 输出
自检通过/不通过`,
      outputHint: '自检结果',
      optional: false
    },
    {
      name: '保存并更新进度',
      prompt: `保存计划文件，更新进度。

### 操作
1. 保存到 \`.sillyspec/plans/YYYY-MM-DD-<change-name>.md\`

### 输出
计划文件路径 + 下一步命令`,
      outputHint: '计划文件路径',
      optional: false
    }
  ]
}
