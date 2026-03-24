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
5. **TDD 执行：** 🔴 写失败测试 → 🟢 写最少代码 → 🔵 重构
6. **运行相关测试：** `pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null`
7. **Git commit：** 展示 commit message 给用户确认后提交
8. **记录：**
   - **有 `--change`：** 在 `.sillyspec/changes/<变更名>/tasks.md` 追加 task 并勾选 `[x]`
   - **无 `--change`：** 记录到 `.sillyspec/QUICKLOG.md`（见下方规则）
9. **检查复杂度：** 任务比预期复杂 → 建议用完整流程

### QUICKLOG.md 规则

文件路径：`.sillyspec/QUICKLOG.md`

**追加记录格式：**
```markdown
## YYYY-MM-DD HH:MM | fix: 任务描述
- 文件：`修改的文件列表`
- commit：`commit hash`
- 关联归档：`相关的已归档变更名`（如有）
```

**文件轮转：** 追加前检查文件大小，超过 500 行则：
1. 将当前 `QUICKLOG.md` 重命名为 `QUICKLOG-YYYY-MM-DD.md`
2. 创建新的空 `QUICKLOG.md`
