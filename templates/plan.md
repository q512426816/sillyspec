## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码（只写计划中的代码示例）
- ❌ 每个步骤缺验证命令和预期输出
- ❌ 编造表名、字段名（必须来自 ARCHITECTURE.md 或 design.md）

## 状态检查（必须先执行）

```bash
sillyspec status --json
```

- `phase: "plan"` → ✅ 继续
- 其他 phase → 提示 `sillyspec next`

---

## 流程

### 1. 加载上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 加载 CODEBASE-OVERVIEW.md + 共享规范 + 子项目的 CONVENTIONS/ARCHITECTURE/STACK + REQUIREMENTS.md。

**单项目模式：**
```bash
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{design,tasks}.md 2>/dev/null
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
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

- [ ] 添加角色创建接口
  - ...
```

**每个 Task 必须保留 `- [ ]` checkbox，这是 execute 阶段勾选完成状态的依据。** 禁止写成纯文本列表。

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

**直接覆盖** `.sillyspec/changes/<变更名>/tasks.md`。不再生成单独的 plan.md 文件。

### 5. 自检门控

- [ ] 每个 task 有具体文件路径？
- [ ] 标注了 Wave 和依赖关系？

### 6. 完成

```bash
sillyspec status --json && sillyspec next
```

更新 `.sillyspec/STATE.md`：阶段改为 `plan ✅`，下一步 `/sillyspec:execute`。
