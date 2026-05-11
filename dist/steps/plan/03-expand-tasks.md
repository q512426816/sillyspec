把 tasks.md 每个 checkbox **保留 `- [ ]` 格式**并展开为任务描述，按 Wave 分组组织。工作区模式下每个 Task 标注所属项目。

**输出格式要求（必须严格遵守）：**

```markdown
### Wave 1（并行，无依赖）
- [ ] 添加用户创建接口
  - 修改: `UserController.java`、`UserService.java`
  - 参考: `RoleController.createRole`
  - 步骤:
    1. 写测试 UserControllerTest.testCreateUser
    2. 运行测试确认失败
    3. 写 UserController.createUser
    4. 运行测试确认通过

- [ ] 添加角色创建接口
  - ...
```

**每个 Task 必须保留 `- [ ]` checkbox，这是 execute 阶段勾选完成状态的依据。** 禁止写成纯文本列表。

**每个 Task 必须包含「步骤」字段，列出 TDD 执行顺序：**
- 1. 写测试 → 2. 运行确认失败 → 3. 写代码 → 4. 运行确认通过

**纯配置/数据/文档类任务可跳过 TDD，步骤简化为：1. 实现 → 2. 验证**

**注意：不需要写精确方法签名和代码示例。** 方法签名和代码风格由 execute 阶段先读后写确认。plan 专注"做什么"和"执行顺序"。

**每个 Task 包含：**
- 精确文件路径（修改哪个文件）
- 任务描述（做什么，一两句话说清楚）
- 涉及已有类调用时，标注参考文件（如"参考 `RoleController.createRole`）
- 依赖关系
