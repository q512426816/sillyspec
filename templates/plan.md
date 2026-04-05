## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码（只写计划中的代码示例）
- ❌ 每个步骤缺验证命令和预期输出
- ❌ 编造表名、字段名（必须来自 ARCHITECTURE.md 或 design.md）

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

- phase 为 `plan` 或 STATE.md 中下一步为 `/sillyspec:plan` → ✅ 继续
- 其他 phase → 提示用户当前阶段

---

## 流程

### 1. 加载上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 加载 CODEBASE-OVERVIEW.md + 共享规范 + 子项目的 CONVENTIONS/ARCHITECTURE/STACK + REQUIREMENTS.md。

**单项目模式：**
```bash
LATEST=$(ls -d .sillyspec/docs/<project>/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{design,tasks}.md 2>/dev/null
cat .sillyspec/docs/<project>/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
```

### 1.5 锚定确认（必须完成）

确认实际存在的文件（design / tasks），不存在的标注跳过。

### 2. 逐任务展开

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

**注意：不需要写精确方法签名和代码示例。** 方法签名和代码风格由 execute 阶段先读后写确认。plan 专注"做什么"，execute 负责"怎么做"。

### 3. 标注执行顺序

按 Wave 分组，标注依赖关系：
```markdown
### Wave 1（并行，无依赖）
- [ ] 添加用户创建接口
  - 修改: `UserController.java`、`UserService.java`
  - 参考: `RoleController.createRole`

- [ ] 添加角色创建接口
  - ...

### Wave 2（依赖 Wave 1）
- [ ] 添加用户列表查询（依赖用户创建完成）
  - ...
```

### 4. 保存

**直接覆盖** `.sillyspec/docs/<project>/changes/<变更名>/tasks.md`。不再生成单独的 plan.md 文件。

### 5. E2E 测试规划

识别 design.md 中是否有 UI 交互功能（页面跳转、表单提交、按钮操作等），如有则：

**检测测试能力（按优先级）：**
```bash
# 优先级 1：专业 E2E 框架
cat package.json 2>/dev/null | grep -E "playwright|cypress" ; ls node_modules/playwright node_modules/cypress 2>/dev/null
# 优先级 2：通用测试框架
cat package.json 2>/dev/null | grep -E "jest|vitest|mocha" ; ls node_modules/jest node_modules/vitest 2>/dev/null
# 优先级 3：浏览器 MCP
cat .claude/mcp.json .cursor/mcp.json 2>/dev/null | grep -i "browser\|chrome\|devtools"
```

- **有 E2E/测试框架** → tasks.md 中添加 E2E 测试任务（同波次，编码后编写）
- **无框架但有浏览器 MCP** → tasks.md 中添加"编写 e2e-steps.md 测试步骤"任务
- **什么都没有** → 提示用户运行 `sillyspec setup` 安装 MCP 工具，或手动安装测试框架

纯后端/无 UI 的变更跳过此步骤。

### 6. 自检门控

- [ ] 每个 task 有具体文件路径？
- [ ] 标注了 Wave 和依赖关系？
- [ ] 涉及 UI 的任务是否有对应的 E2E 测试任务？
- [ ] **design.md 中的每个功能点是否都在 tasks.md 中有对应任务？**

### 6.5 设计完整性对照（必须完成）

逐条检查 design.md 中的功能描述，确保每个功能点都有对应的 task。特别关注：

1. **逐功能点扫描：** 将 design.md 中描述的每个功能点（含子功能）列出，与 tasks.md 逐条对照
2. **前后端覆盖检查：** 涉及前后端协作的功能，确认前端和后端各有独立 task
3. **遗漏项处理：** 发现未覆盖的功能点 → 追加 task 到对应 Wave，并提示用户确认

**执行方式：**
```
从 design.md 提取功能点清单：
  功能 A（后端接口）
  功能 B（前端页面）
  功能 C（前后端联动）

与 tasks.md 对照：
  ✅ 功能 A → task-3
  ❌ 功能 B → 无对应 task → 追加
  ⚠️ 功能 C → 只有后端 task，缺少前端 task → 追加
```

发现遗漏时用 AskUserQuestion 确认追加内容，用户确认后再写入 tasks.md。

### 7. 完成

更新 `.sillyspec/STATE.md`：阶段改为 `plan ✅`，下一步 `/sillyspec:execute`。

```bash
cat .sillyspec/STATE.md 2>/dev/null
```
