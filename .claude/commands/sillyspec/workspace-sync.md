## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改子项目的代码
- ❌ 删除已有文件（clone 前必须确认）
- ❌ 跳过冲突检查直接覆盖

## 流程

### Step 1: 读取配置

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

无 config.yaml → 提示先执行 `/sillyspec:workspace` 初始化工作区。

### Step 2: 逐个子项目检查

对 config.yaml 中每个子项目，按顺序执行：

```bash
# 检查目录是否存在
ls -d <path> 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

#### 情况 A：目录不存在

```bash
# 检查是否有 repo 配置
grep "repo:" .sillyspec/config.yaml | grep -A 1 "<name>"
```

- **有 repo** → AskUserQuestion："子项目 `<name>` 不存在，是否从 `<repo>` clone 到 `<path>`？"
  - 用户确认 → `git clone <repo> <path>` → ✅ 成功
  - clone 失败 → ❌ 报错，提示用户手动 clone
- **无 repo** → ⚠️ 提示用户："子项目 `<name>` 不存在且无 repo 配置，请手动放置到 `<path>`"

#### 情况 B：目录已存在

```bash
# 检查是否是 git 仓库
git -C <path> rev-parse --is-inside-work-tree 2>/dev/null

# 如果是，检查 remote 是否匹配
git -C <path> remote get-url origin 2>/dev/null
```

- **不是 git 仓库** → AskUserQuestion："目录 `<path>` 存在但不是 git 仓库，可能和其他项目冲突。"
  - 跳过此子项目
  - 让用户指定正确路径
- **是 git 仓库，remote 匹配 repo** → ✅ 跳过，状态正常
- **是 git 仓库，remote 不匹配 repo** → ⚠️ AskUserQuestion：
  - "目录 `<path>` 是 git 仓库但 remote 不匹配（期望 `<repo>`，实际 `<actual>`）。可能是不同项目。"
  - 跳过 / 用户确认覆盖

#### 情况 C：路径冲突

检查两个子项目的 path 是否指向同一目录或互相包含：

```bash
# 将相对路径转为绝对路径后比较
realpath <path1>
realpath <path2>
```

冲突 → ❌ 报错："子项目 A 和 B 的路径冲突，请修改 config.yaml"

### Step 3: 汇总报告

```
📊 工作区同步结果

┌───────────────────┬──────────┬────────────────────────────────────┐
│ 子项目            │ 状态     │ 说明                               │
├───────────────────┼──────────┼────────────────────────────────────┤
│ back-service      │ ✅ 正常   │ 目录存在，git remote 匹配         │
│ sub-grid-security │ 🔄 已克隆 │ 从 https://... clone 成功         │
│ frontend          │ ⚠️ 缺失   │ 无 repo 配置，请手动放置           │
└───────────────────┴──────────┴────────────────────────────────────┘
```

全部正常 → 提示 `/sillyspec:brainstorm '你的需求'` 继续。
有异常 → 提示用户处理后再 sync。

### Step 4: 更新 config.yaml

如果 clone 过程中实际 remote 和 config.yaml 中的 repo 不一致，更新 repo 字段为实际值。
