**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码（只写计划中的代码示例）
- ❌ 每个步骤缺验证命令和预期输出
- ❌ 编造表名、字段名（必须来自 ARCHITECTURE.md 或 design.md）

## 加载上下文

```bash
ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .
```

**工作区模式：** 加载 `.sillyspec/workspace/CODEBASE-OVERVIEW.md` + 共享规范 + 子项目的 CONVENTIONS/ARCHITECTURE/STACK + `.sillyspec/REQUIREMENTS.md`。

**单项目模式：**
```bash
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{design,tasks}.md 2>/dev/null
cat .sillyspec/docs/<project>/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
```
