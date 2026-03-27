## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改子项目目录下的任何文件
- ❌ 写非法 YAML
- ❌ 使用绝对路径（必须是相对路径）

## 用户指令
$ARGUMENTS

---

## 流程

### Step 1: 检查配置

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

不存在 → 询问是否初始化工作区。

### Step 2: 解析指令

- 无参数 / `status` → 显示状态
- `add` → 添加子项目
- `remove` → 移除子项目
- `info <name>` → 子项目详情

### Step 3: 执行操作

**初始化工作区：** 询问名称 → 逐个添加子项目（名称、路径、角色描述，验证路径存在）→ 共享规范 → 生成 config.yaml + `.sillyspec/shared/`

**添加/移除子项目：** 更新 config.yaml，Git 提交。

**状态显示：** 读取每个子项目的 `.sillyspec/` 内容（PROJECT.md、codebase 文档数、进行中变更），输出格式：

```
🏢 工作区：<name>
📦 子项目（N 个）：
  ✅ frontend  ./frontend    前端 - Vue3+TS    已扫描（7 份文档）
  ⚠️ backend   ./backend     后端 - Node.js     已初始化（未扫描）
📄 共享规范：2 份
💡 操作：/sillyspec:workspace add | /sillyspec:init | /sillyspec:scan
```

### config.yaml 格式

```yaml
projects:
  <name>:
    path: <relative-path>
    role: <description>
    repo: <git-remote-url>  # 可选，git remote get-url origin
shared:
  - <filename.md>
```
