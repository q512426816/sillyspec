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
1.5 **归属检查：** 如果没有 `--change` 参数，检查 `.sillyspec/docs/<project>/changes/` 下是否有非 archive 的活跃变更目录：
   ```bash
   ls -d .sillyspec/docs/<project>/changes/*/ 2>/dev/null | grep -v archive
   ```
   - 有活跃变更 → AskUserQuestion 询问本次 quick 归属哪个变更，默认选当前活跃的
   - 用户选择后将日志写入 `.sillyspec/docs/<project>/changes/<变更名>/quicklog/` 而非独立 QUICKLOG
   - 用户选择"无归属" → 走原有的独立 QUICKLOG 流程
   - 无活跃变更 → 走原有的独立 QUICKLOG 流程
2. **理解任务：** 模糊则问一个问题确认
3. **加载上下文：** `cat .sillyspec/docs/<project>/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null`
3b. **编码规范扫描：** 检测项目中的编码规范配置文件（`.eslintrc*`、`.prettierrc*`、`tsconfig.json`、`.editorconfig`、`tailwind.config.*`、`CONTRIBUTING.md`），提取关键规则生成摘要。写作代码时必须严格遵守这些规则（分号/引号/缩进/命名风格等），如不确定优先遵守规范约束。
4. **知识库查询（强制步骤）：**
   ```bash
   cat .sillyspec/knowledge/INDEX.md 2>/dev/null
   ```
   根据当前任务描述中的关键词匹配 INDEX.md 条目，命中时 `cat` 对应知识文件，将内容纳入后续开发考量。未命中则跳过。
   **MCP 检测：** 检查当前可用工具列表中是否存在 MCP 工具（Context7/浏览器/数据库/搜索等），根据检测结果动态利用：
   - 有 Context7 → 查询不熟悉库/API 的最新文档
   - 有浏览器 MCP → 验证页面改动效果
   - 有数据库 MCP → 查询表结构和数据验证（只读）
   - 有搜索 MCP → 搜索最佳实践和解决方案
   - 有其他 MCP → 按任务需要灵活使用
   - 无 MCP → 使用 web search
5. **先读后写：** 调用已有方法前 `cat` 源文件确认签名，`grep` 确认方法存在
6. **数据操作安全：** 任何改变现有数据的操作（非 SELECT 的数据库操作）必须暂停并报告给用户确认，不得自动执行。新建表不受此限制
6. **TDD 执行：**
   ```
   🔴 RED    → 先写测试，运行确认失败
   🟢 GREEN  → 写最少代码让测试通过
   🔵 REFACTOR → 清理，保持测试通过
   ✅ STAGE   → git add 暂存（测试文件必须包含在暂存中）
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
8. **Lint 校验（如项目配置了）：** 写完代码后、暂存前，运行项目的 lint 工具验证代码质量：
   ```bash
   # 检测并运行可用的 lint 工具
   npx eslint <修改的文件> 2>/dev/null || \
   npx prettier --check <修改的文件> 2>/dev/null || \
   npx tsc --noEmit 2>/dev/null || \
   true  # 没有 lint 工具则跳过
   ```
   - **有报错 → 自动修复：** `npx eslint --fix <修改的文件>` / `npx prettier --write <修改的文件>`
   - **修复后仍有报错 → 在 QUICKLOG 中标注，提醒用户手动处理**
   - **工作区模式下，在子项目目录中执行，不要在主项目目录执行**
9. **Git 暂存：** `git add -A`。**不要 commit**，由用户通过 `/sillyspec:commit` 统一提交。**工作区模式下，确认当前在正确的子项目目录中执行暂存。**
10. **记录：**
   - **有 `--change`：** 在 `.sillyspec/docs/<project>/changes/<变更名>/tasks.md` 追加 task 并勾选，**记录精确到秒的时间戳**：

```
- [x] [YYYY-MM-DD HH:MM:SS] 任务描述
```
   - **无 `--change` 但步骤 1.5 确认了归属变更：** 记录到 `.sillyspec/docs/<project>/changes/<变更名>/quicklog/YYYY-MM-DD-HHMMSS-任务简述.md`，格式：

```markdown
# quick: 任务描述

- 时间：YYYY-MM-DD HH:MM:SS
- 关联变更：<变更名>
- 修改文件：
  - `path/to/file1`
  - `path/to/file2`
- 改动说明：（2-3 句描述做了什么）
- 发现的坑：（如有，简要记录）
```

   - **无 `--change` 且无归属：** 记录到 `.sillyspec/docs/<project>/quicklog/QUICKLOG-<git用户名>.md`（见下方规则）
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
LOG_FILE=".sillyspec/docs/<project>/quicklog/QUICKLOG-${USER}.md"
```

文件路径：`$LOG_FILE`

**追加记录格式（时间精确到秒）：**
```markdown
## YYYY-MM-DD HH:MM:SS | fix: 任务描述
- 文件：`修改的文件列表`
- 关联归档：`相关的已归档变更名`（如有）
```

**文件轮转：** 追加前检查文件大小，超过 500 行则：
1. 将当前文件重命名为 `QUICKLOG-${USER}-YYYY-MM-DD.md`
2. 创建新的空 `QUICKLOG-${USER}.md`
