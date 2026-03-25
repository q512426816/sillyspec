## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改任何文件（只读）

---

## 流程

### Step 1: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 读取 config.yaml 子项目列表，对每个子项目检查 PROJECT.md、codebase 文档数、进行中变更、归档数。检查共享规范和工作区概览。输出汇总后结束，不执行单项目流程。

**单项目模式：** 继续 Step 2。

### Step 2-5: 单项目检查

1. **项目基础：** PROJECT.md、codebase 文档、REQUIREMENTS.md、ROADMAP.md
2. **进行中变更：** 对每个变更检查 design/tasks 完成度
3. **归档历史：** `ls .sillyspec/changes/archive/ | wc -l`
4. **代码库文档：** `ls .sillyspec/codebase/`

### Step 6: 输出

```
📊 SillySpec 状态
📋 项目：xxx（已初始化/未初始化）
📂 代码库：已扫描（7 份文档）/ 未扫描
🔄 进行中：N 个变更
✅ 已归档：N 个变更
💡 下一步：/sillyspec:continue
```
