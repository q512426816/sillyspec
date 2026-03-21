---
description: 查看项目进度和状态
---

你现在是 SillySpec 的状态检查器。

## 流程

### 0: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**如果是工作区模式：**

1. 读取 config.yaml 获取子项目列表
2. 对每个子项目执行 Step 1-5 的检查（在子项目目录下）
3. 检查共享规范：
   ```bash
   ls .sillyspec/shared/ 2>/dev/null
   ```
4. 检查工作区概览：
   ```bash
   ls .sillyspec/workspace/ 2>/dev/null
   ```
5. 输出汇总：

```
🏢 工作区状态

📦 子项目：

  ✅ frontend  ./frontend
     📋 项目：已初始化
     📂 代码库：已扫描（7 份文档）
     🔄 进行中：1 个变更
        - [user-auth] Phase 3 (Execute) — tasks 5/8
     ✅ 已归档：3 个变更

  ⚠️ backend   ./backend
     📋 项目：已初始化
     📂 代码库：未扫描
     🔄 进行中：0 个变更

📄 共享规范：2 份
  - api-contract.md
  - data-models.md

💡 下一步：
  - 扫描 backend：/sillyspec:scan backend
  - 继续开发：/sillyspec:continue
```

然后结束，不执行下面的单项目流程。

**如果不是工作区模式：** 继续下面的单项目流程。

### 1. 项目基础

```bash
cat .sillyspec/PROJECT.md 2>/dev/null || echo "未初始化"
ls .sillyspec/codebase/ 2>/dev/null | head -10
cat .sillyspec/REQUIREMENTS.md 2>/dev/null | head -20
cat .sillyspec/ROADMAP.md 2>/dev/null
```

### 2. 进行中的变更

```bash
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
```

对每个进行中的变更，检查文件完成度：
- proposal.md ✅/❌
- design.md ✅/❌
- specs/requirements.md ✅/❌
- tasks.md — X/Y 完成
- 对应计划 .sillyspec/plans/ ✅/❌

### 3. 归档历史

```bash
ls .sillyspec/changes/archive/ 2>/dev/null | wc -l
```

### 4. 中断状态

```bash
cat .sillyspec/HANDOFF.json 2>/dev/null
```

### 5. 代码库文档

```bash
ls .sillyspec/codebase/ 2>/dev/null
```

### 6. 输出

```
📊 SillySpec 状态

📋 项目：xxx（已初始化 / 未初始化）
📂 代码库：已扫描（7 份文档）/ 未扫描

🔄 进行中：N 个变更
  - [change-1] Phase 3 (Execute) — tasks 5/8
  - [change-2] Phase 2 (Propose) — 缺少 design.md

✅ 已归档：N 个变更
📝 设计文档：N 份
📝 实现计划：N 份

💡 下一步：/sillyspec:continue
```

## 绝对规则
- 不修改任何文件
