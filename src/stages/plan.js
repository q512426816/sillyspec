export const definition = {
  name: 'plan',
  title: '实现计划',
  description: '编写实现计划 — 按 Wave 分组，TDD 步骤，精确到文件路径',
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
1. 读取 CODEBASE-OVERVIEW.md + 各子项目上下文
2. 读取 proposal.md、design.md、requirements.md
3. 读取 CONVENTIONS.md、ARCHITECTURE.md、STACK.md
4. 读取 local.yaml 获取构建/测试命令

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
      name: '展开任务并分组',
      prompt: `把 tasks.md 每个 checkbox 展开为任务描述，按 Wave 分组组织。

### 输出格式要求（必须严格遵守）

每个 Task 必须保留 \`- [ ]\` checkbox，这是 execute 阶段勾选完成状态的依据。禁止写成纯文本列表。

每个 Task 必须包含「步骤」字段，列出 TDD 执行顺序：
1. 写测试 → 2. 运行确认失败 → 3. 写代码 → 4. 运行确认通过

纯配置/数据/文档类任务可跳过 TDD，步骤简化为：1. 实现 → 2. 验证

注意：不需要写精确方法签名和代码示例。方法签名和代码风格由 execute 阶段先读后写确认。plan 专注"做什么"和"执行顺序"。

### 示例

\`\`\`markdown
### Wave 1（并行，无依赖）

- [ ] 添加用户创建接口
  - 修改: \`UserController.java\`、\`UserService.java\`
  - 参考: \`RoleController.createRole\`
  - 步骤:
    1. 写测试 UserControllerTest.testCreateUser
    2. 运行 <test-cmd> 确认失败
    3. 写 UserController.createUser
    4. 运行 <test-cmd> 确认通过

- [ ] 添加角色创建接口
  - 修改: \`RoleController.java\`
  - 步骤:
    1. 写测试 RoleControllerTest.testCreateRole
    2. 运行 <test-cmd> 确认失败
    3. 写 RoleController.createRole
    4. 运行 <test-cmd> 确认通过

### Wave 2（依赖 Wave 1）

- [ ] 用户创建接口联调
  - 修改: \`UserController.java\`
  - 依赖: Wave 1 的用户创建接口 + 角色创建接口
  - 步骤:
    1. 写集成测试 UserControllerTest.testCreateUserIntegration
    2. 运行 <test-cmd> 确认失败
    3. 补充联调逻辑
    4. 运行 <test-cmd> 确认通过

### Wave 3（纯配置）

- [ ] 配置用户创建接口路由
  - 修改: \`application.yml\`
  - 步骤:
    1. 实现路由配置
    2. 验证: 运行 <test-cmd> 确认通过
\`\`\`

### 每个 Task 必须包含
- 精确文件路径（修改哪个文件）
- 任务描述（做什么，一两句话说清楚）
- 涉及已有类调用时，标注参考文件（如"参考 \`RoleController.createRole\`"）
- 依赖关系（无依赖可省略）

### 分组规则
1. 分析 Task 间依赖
2. 无依赖的 Task 归入同一 Wave（可并行）
3. 有依赖的 Task 按顺序排列
4. Wave 编号从 1 开始

### 操作
1. 读取 tasks.md 获取任务列表
2. 读取 design.md 获取文件变更清单
3. 逐个展开为详细任务描述
4. 分析依赖关系，按 Wave 分组
5. 每个任务独立 \`git add\` 暂存，不 commit

### 输出
按 Wave 分组的完整计划`,
      outputHint: 'Wave 分组计划',
      optional: false
    },
    {
      name: '自检门控',
      prompt: `自检计划质量。

### 操作
检查以下各项：
- [ ] 每个 task 有 \`- [ ]\` checkbox
- [ ] 每个 task 有精确文件路径
- [ ] 代码类 task 有 TDD 步骤（写测试→确认失败→写代码→确认通过）
- [ ] 配置/文档类 task 步骤简化为（实现→验证）
- [ ] 已标注 Wave 分组和依赖关系
- [ ] plan 与 design.md 的文件变更清单一致
- [ ] 没有写精确方法签名和代码示例

### 输出
自检通过/不通过`,
      outputHint: '自检结果',
      optional: false
    },
    {
      name: '保存并更新进度',
      prompt: `保存计划文件，更新进度。

### 操作
1. 确认变更目录存在：\`mkdir -p .sillyspec/changes/<变更名>\`
2. 保存到 \`.sillyspec/changes/<变更名>/plan.md\`
3. \`git add .sillyspec/\` — **不要 commit**

### 输出
计划文件路径 + 下一步命令`,
      outputHint: '计划文件路径',
      optional: false
    }
  ]
}
