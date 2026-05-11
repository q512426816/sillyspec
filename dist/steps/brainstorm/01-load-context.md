**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码（任何语言）
- ❌ 修改任何源代码文件
- ❌ 安装依赖或执行构建命令
- ❌ 创建数据库迁移脚本
- ❌ 跳过 brainstorm 直接进入 execute/plan
- ❌ 在 checklist 未完成前开始写设计文档
- ❌ 编造不存在的表名、字段名、API 端点
- ❌ 一次性抛出多个问题（必须逐个等待回答）
- ❌ 用户确认前自行推进到 plan 或任何后续阶段

**终态：** brainstorm 完成后唯一出口是 plan 阶段。不允许直接进入 execute 或任何代码操作。

## 加载项目上下文

```bash
ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .
```

**工作区模式：** AskUserQuestion 选子项目，**cd 到子项目目录执行**，加载子项目上下文 + 共享规范 + 工作区概览，设计文档保存到子项目 `.sillyspec/docs/<project>/changes/`。修改在子项目目录中暂存。

**单项目模式：**
```bash
cat .sillyspec/{PROJECT,REQUIREMENTS,ROADMAP}.md 2>/dev/null
cat .sillyspec/docs/<project>/scan/{STRUCTURE,CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
ls .sillyspec/knowledge/ 2>/dev/null
```
