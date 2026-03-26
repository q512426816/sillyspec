## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

> 本模板由 `/sillyspec:scan --quick` 触发。如需完整深度扫描，使用 `/sillyspec:scan`。

## 核心约束（必须遵守）
- ❌ 修改任何代码
- ❌ 编造文件路径或代码模式（必须包含真实路径）
- ❌ 读源码文件（快扫只读配置和目录）

## 快速扫描流程

### Step 1: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

有 `projects` 字段 → 工作区模式：逐个子项目快扫。

### Step 2: 读配置文件

```bash
cat package.json tsconfig.json requirements.txt Cargo.toml go.mod pom.xml build.gradle 2>/dev/null
find . -maxdepth 2 -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20 | xargs cat 2>/dev/null
```

### Step 3: 生成文档

`mkdir -p .sillyspec/codebase`，生成 3 份文档：

1. **ARCHITECTURE.md** — 架构 + 技术栈（合并原 STACK.md）
2. **STRUCTURE.md** — 目录结构（`find . -type f | head -200`）
3. **PROJECT.md** — 项目概览

### Step 4: Git 提交

```bash
git add .sillyspec/ && git commit -m "chore: sillyspec quick scan"
```

工作区模式在每个子项目分别提交。

### 完成

提示用户：快扫只提取基础信息。如需完整代码规范（框架规则、实体继承、代码风格），执行 `/sillyspec:scan` 进行深度扫描。
