## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 不写测试（底线是仍然要写测试）
- ❌ 修改无关文件
- ❌ 跳过测试因为"任务太简单"

## 用法

- `/sillyspec:quick "修复用户创建接口漏了手机号校验"` — 独立记录到 QUICKLOG.md
- `/sillyspec:quick --change user-module "修复用户创建接口漏了手机号校验"` — 追加到 user-module 变更的 tasks.md

## 任务
$ARGUMENTS

---

## 流程

1. **解析参数：** 检查是否携带 `--change <变更名>`，确定记录方式
2. **理解任务：** 模糊则问一个问题确认
3. **加载上下文：** `cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null`
4. **先读后写：** 调用已有方法前 `cat` 源文件确认签名，`grep` 确认方法存在
5. **TDD 执行：**
   ```
   🔴 RED    → 先写测试，运行确认失败
   🟢 GREEN  → 写最少代码让测试通过
   🔵 REFACTOR → 清理，保持测试通过
   ✅ COMMIT  → git 提交（测试文件必须包含在提交中）
   ```
   测试文件必须保留在项目中，不能删除。违反 TDD → 删掉代码从测试重新开始。
   - 纯配置/数据/文档可跳过 TDD
   - 其他情况一律走 TDD
6. **运行相关测试：** `pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null`
7. **Git commit：** 展示 commit message 给用户确认后提交。**工作区模式下，确认当前在正确的子项目目录中执行 commit。**
8. **记录：**
   - **有 `--change`：** 在 `.sillyspec/changes/<变更名>/tasks.md` 追加 task 并勾选，**记录精确到秒的时间戳**：

```
- [x] [YYYY-MM-DD HH:MM:SS] 任务描述
```
   - **无 `--change`：** 记录到 `.sillyspec/quicklog/QUICKLOG.md`（见下方规则）
9. **检查复杂度：** 任务比预期复杂 → 建议用完整流程

10. **记录发现的坑：** 执行过程中如果发现项目特有的规律、陷阱或约定（如"某方法参数顺序容易搞反"、"某表有隐藏软删除字段"），追加到 `.sillyspec/codebase/CONVENTIONS.md` 的「注意事项」章节（如不存在则创建）。这样后续所有阶段都能避免踩坑。

### QUICKLOG.md 规则

文件路径：`.sillyspec/quicklog/QUICKLOG.md`

**追加记录格式（时间精确到秒）：**
```markdown
## YYYY-MM-DD HH:MM:SS | fix: 任务描述
- 文件：`修改的文件列表`
- commit：`commit hash`
- 关联归档：`相关的已归档变更名`（如有）
```

**文件轮转：** 追加前检查文件大小，超过 500 行则：
1. 将当前 `QUICKLOG.md` 重命名为 `QUICKLOG-YYYY-MM-DD.md`
2. 创建新的空 `QUICKLOG.md`
