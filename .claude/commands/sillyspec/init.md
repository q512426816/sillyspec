## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写任何实现代码
- ❌ 安装任何依赖
- ❌ 一次问多个问题
- ❌ 接受模糊需求（❌"好用" → ✅"首屏加载 < 2 秒"）

## 用户输入
$ARGUMENTS

---

## 流程

### Step 1: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

有 `projects` → 工作区模式：AskUserQuestion 选子项目，切换到子项目目录执行。

### Step 2: 检查项目状态

```bash
ls -la
```

已有代码/配置 → 提示用 `/sillyspec:scan`。空目录 → 继续。

### Step 3: 深度提问（一次一个问题）

按需探索（不是每个都要）：项目本质 → 核心功能 → 技术偏好 → 非功能需求 → 设计偏好 → 约束 → 不在范围内。

### Step 4: 技术选型（如需要）

用户无明确偏好时，推荐 2-3 套技术栈并列优劣和推荐理由。可选快速调研选定框架的版本、生态、已知坑。

### Step 5: 生成文档

**`REQUIREMENTS.md`：** 概述、目标用户、功能需求（P0/P1/P2）、非功能需求、不在范围内、技术选型表。

**`ROADMAP.md`：** Phase 分阶段路线图（目标 + 交付物）。

**`PROJECT.md`：** 项目名、一句话描述、状态。

### Step 6: Git 初始化

```bash
git init && git add . && git commit -m "chore: sillyspec init - project initialized"
```

### 最后说：

> ✅ 项目初始化完成！
> 生成文件：PROJECT.md、REQUIREMENTS.md、ROADMAP.md
> 下一步：`/sillyspec:brainstorm "Phase 1: xxx"` 或直接告诉我改什么
