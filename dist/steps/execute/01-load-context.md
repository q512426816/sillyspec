**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 跳步执行（不允许跳过 plan 直接 execute）
- ❌ 先写代码后补测试
- ❌ 编造不存在的方法/注解/路径/类/字段
- ❌ 自行补全缺失的接口/方法（应报告 BLOCKED）
- ❌ 意外修改了计划外的文件却不报告

**所有任务通过子代理执行，主代理负责调度和记录。**

## 加载上下文

```bash
ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .
```

**工作区模式：** 根据计划 Task 标注确定子项目，额外加载共享规范 + `.sillyspec/workspace/CODEBASE-OVERVIEW.md`。所有代码修改、测试运行在子项目目录中执行。

```bash
PLAN=$(ls -t .sillyspec/changes/*/tasks.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
cat .sillyspec/docs/<project>/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

**知识库查询（强制步骤）：**
```bash
cat .sillyspec/knowledge/INDEX.md 2>/dev/null
```
根据当前 task 描述中的关键词匹配 INDEX.md 条目。命中时读取对应 knowledge 文件，注入子代理 prompt。未命中则跳过。

## 确认频率

用 AskUserQuestion 询问用户选择：
- **每个 Wave 确认** — 每个 Wave 完成后展示结果，等用户确认后继续下一 Wave
- **AI 自主判断** — AI 在遇到 BLOCKED 或计划外变更时才询问，其余自动推进
- **全自动** — 全部自动执行，不在中途打断用户

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。
