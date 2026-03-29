## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 不写测试（底线是仍然要写测试）
- ❌ 修改无关文件
- ❌ 跳过测试因为"任务太简单"

## 用法

- `/sillyspec:quick "修复用户创建接口漏了手机号校验"` — 独立记录到按用户名隔离的 QUICKLOG
- `/sillyspec:quick --change user-module "修复用户创建接口漏了手机号校验"` — 追加到 user-module 变更的 tasks.md

## 任务
$ARGUMENTS

---

## 流程

1. **解析参数：** 检查是否携带 `--change <变更名>`，确定记录方式
2. **理解任务：** 模糊则问一个问题确认
3. **加载上下文：** `cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null`
4. **知识库查询（强制步骤）：**
   ```bash
   cat .sillyspec/knowledge/INDEX.md 2>/dev/null
   ```
   根据当前任务描述中的关键词匹配 INDEX.md 条目，命中时 `cat` 对应知识文件，将内容纳入后续开发考量。未命中则跳过。
5. **先读后写：** 调用已有方法前 `cat` 源文件确认签名，`grep` 确认方法存在
6. **TDD 执行：**
   ```
   🔴 RED    → 先写测试，运行确认失败
   🟢 GREEN  → 写最少代码让测试通过
   🔵 REFACTOR → 清理，保持测试通过
   ✅ COMMIT  → git 提交（测试文件必须包含在提交中）
   ```
   测试文件必须保留在项目中，不能删除。违反 TDD → 删掉代码从测试重新开始。
   - 纯配置/数据/文档可跳过 TDD
   - 其他情况一律走 TDD
7. **运行测试：** 先检查 local.yaml 构建命令配置：
```bash
cat .sillyspec/local.yaml 2>/dev/null
```
如果有则使用 local.yaml 中的命令；否则使用默认命令：
```bash
mvn test -pl <模块> -Dtest=<测试类> 2>/dev/null || ./gradlew test --tests <测试类> 2>/dev/null || pnpm test 2>/dev/null || npm test 2>/dev/null || pytest <测试文件> 2>/dev/null
```
8. **Git commit：** 展示 commit message 给用户确认后提交。**工作区模式下，确认当前在正确的子项目目录中执行 commit。**
9. **记录：**
   - **有 `--change`：** 在 `.sillyspec/changes/<变更名>/tasks.md` 追加 task 并勾选，**记录精确到秒的时间戳**：

```
- [x] [YYYY-MM-DD HH:MM:SS] 任务描述
```
   - **无 `--change`：** 记录到 `.sillyspec/quicklog/QUICKLOG-<git用户名>.md`（见下方规则）
10. **检查复杂度：** 任务比预期复杂 → 建议用完整流程

11. **记录发现的坑：** 执行过程中如果发现项目特有的规律、陷阱或约定（如"某方法参数顺序容易搞反"、"某表有隐藏软删除字段"），追加到 `.sillyspec/knowledge/uncategorized.md`，格式：

```markdown
### [待确认] {简短标题}
> 来源：quick / {时间戳}

{坑的具体描述}
```

**工作区模式下：** 只影响当前子项目 → 写入当前子项目 `.sillyspec/knowledge/uncategorized.md`；影响多个子项目 → 写入工作区根目录 `.sillyspec/knowledge/uncategorized.md`。

12. **知识库审阅提示：** 如果本次执行向 knowledge/ 写入了新条目，提示用户：
> 📚 本次 quick 发现了新知识，请审阅：`cat .sillyspec/knowledge/uncategorized.md`
> 确认后请将 `[待确认]` 改为 `[已确认]`，并可归类到 knowledge/ 下的专题文件中更新 INDEX.md。

### QUICKLOG 规则

**按 git 用户名隔离，避免多人同时操作冲突：**

```bash
USER=$(git config user.name 2>/dev/null || echo "default")
LOG_FILE=".sillyspec/quicklog/QUICKLOG-${USER}.md"
```

文件路径：`$LOG_FILE`

**追加记录格式（时间精确到秒）：**
```markdown
## YYYY-MM-DD HH:MM:SS | fix: 任务描述
- 文件：`修改的文件列表`
- commit：`commit hash`
- 关联归档：`相关的已归档变更名`（如有）
```

**文件轮转：** 追加前检查文件大小，超过 500 行则：
1. 将当前文件重命名为 `QUICKLOG-${USER}-YYYY-MM-DD.md`
2. 创建新的空 `QUICKLOG-${USER}.md`
