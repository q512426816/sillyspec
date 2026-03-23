---
description: 编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码
argument-hint: "[计划名]"
---

你现在是 SillySpec 的计划编写器。

## 流程

### 0. 检查状态（必须先执行）

**在开始任何工作之前，先调用 SillySpec CLI 检查当前状态：**

```bash
sillyspec status --json
```

**根据 CLI 返回的 phase 决定是否允许执行 plan：**
- `phase: "plan"` → ✅ 可以继续
- 其他 phase → ❌ 不允许跳步，提示用户运行 `sillyspec next` 获取正确步骤

**不要跳过状态检查。不要自己推断阶段。以 CLI 为准。**

### 1. 加载所有上下文

首先检查工作区配置：

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**如果是工作区模式：**

```bash
# 工作区概览（了解所有子项目）
cat .sillyspec/workspace/CODEBASE-OVERVIEW.md 2>/dev/null

# 共享规范
cat .sillyspec/shared/*.md 2>/dev/null

# 规范（最近非归档变更）
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST/proposal.md"
cat "$LATEST/design.md"
cat "$LATEST/tasks.md"
cat "$LATEST/specs/requirements.md" 2>/dev/null

# 各子项目的代码库上下文
# 从 config.yaml 读取项目列表，对每个子项目：
cat <子项目路径>/.sillyspec/codebase/CONVENTIONS.md 2>/dev/null
cat <子项目路径>/.sillyspec/codebase/ARCHITECTURE.md 2>/dev/null
cat <子项目路径>/.sillyspec/codebase/STACK.md 2>/dev/null

# 项目需求
cat <子项目路径>/.sillyspec/REQUIREMENTS.md 2>/dev/null
```

**如果不是工作区模式：**

```bash
# 规范（最近非归档变更）
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST/proposal.md"
cat "$LATEST/design.md"
cat "$LATEST/tasks.md"
cat "$LATEST/specs/requirements.md" 2>/dev/null

# 代码库上下文（棕地）
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
cat .sillyspec/codebase/ARCHITECTURE.md 2>/dev/null
cat .sillyspec/codebase/STACK.md 2>/dev/null

# 项目需求
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
```

### 1.5 锚定确认（必须完成）

读取相关规范文件。对于存在的文件，确认理解；对于不存在的文件，标注跳过：

```
已读取并理解：
- [x] proposal.md — 变更动机和范围
- [x] design.md — 技术方案和文件变更（如果存在）
- [x] tasks.md — 实现清单
- [x] specs/requirements.md — 需求和场景（如果存在）

所有可用上下文已加载，开始执行。
```

**文件不存在不是错误**。只确认实际存在的文件。不准跳过此步骤。

### 2. 逐任务展开

把 tasks.md 中每个 checkbox 展开为详细步骤。

**工作区模式下，每个 Task 必须标注所属项目：**

```markdown
### Task 1: [frontend] 数据库 User 模型

**项目：** frontend
**文件：**
```

如果不是工作区模式，保持原有 Task 格式不变。

**非工作区模式示例：**

```markdown
### Task 1: 数据库 User 模型

**文件：**
- 修改：`prisma/schema.prisma`
- 新建：`prisma/migrations/xxx/migration.sql`
- 测试：`tests/models/user.test.ts`

**步骤：**
- [ ] 写失败测试：
  ```typescript
  // tests/models/user.test.ts
  import { prisma } from '@/lib/db'

  describe('User model', () => {
    it('should create user with hashed password', async () => {
      const user = await prisma.user.create({
        data: { email: 'test@test.com', passwordHash: 'hashed' }
      })
      expect(user.id).toBeDefined()
      expect(user.passwordHash).toBe('hashed')
    })
  })
  ```
  运行：`pnpm test tests/models/user.test.ts` → 预期 FAIL（模型不存在）

- [ ] 写最少代码让测试通过：
  ```prisma
  // prisma/schema.prisma
  model User {
    id           String   @id @default(cuid())
    email        String   @unique
    passwordHash String
    createdAt    DateTime @default(now())
  }
  ```
  运行：`npx prisma migrate dev --name add-user-model`
  运行：`pnpm test tests/models/user.test.ts` → 预期 PASS

- [ ] 运行全量测试 → 预期 ALL GREEN
- [ ] git commit -m "feat: add User model"

**验证命令：**
`pnpm test tests/models/user.test.ts -v`
```

### 3. 标注执行顺序

```markdown
## 执行顺序

**Wave 1**（并行，无依赖）：
- Task 1: 数据库模型
- Task 2: 邮件服务（独立模块）

**Wave 2**（依赖 Wave 1）：
- Task 3: 注册 API（需要 User 模型）

**Wave 3**（依赖 Wave 2）：
- Task 4: 验证流程（需要注册完成）
```

### 4. 计划原则

**假设执行者是：** 熟练开发者，但对你项目零上下文、品味存疑、讨厌写测试。

- 每个步骤 2-5 分钟可完成
- 包含完整可运行的代码（不要写"添加验证逻辑"）
- 包含精确文件路径（不要写"在适当位置"）
- 包含运行命令和预期输出
- 频繁 commit，每个任务独立提交
- 如果发现设计有矛盾 → 停下来告诉用户

### 5. 保存

保存到 `.sillyspec/plans/YYYY-MM-DD-<change-name>.md`

### 6. 自检门控（Hard Gate）

- [ ] 每个 task 是否包含具体文件路径？
- [ ] 每个 task 是否包含验证命令和预期输出？
- [ ] 是否标注了 Wave 和执行顺序？
- [ ] plan 是否与 design.md 的文件变更清单一致？

**任何一项不通过 → 修正后重新检查。**

### 脚本校验（硬验证）

Hard Gate 自检通过后，运行校验脚本：

```bash
bash scripts/validate-plan.sh .sillyspec/changes/<当前变更目录>
```

- 脚本返回 0 → 自检通过，继续
- 脚本返回非 0 → 根据提示修正后重新运行

### 8. 最后说：

**用 CLI 验证并获取下一步：**

```bash
sillyspec status --json
```

展示给用户：
> 计划已保存到 `.sillyspec/plans/xxx.md`。
> 下一步：

```bash
sillyspec next
```

将 CLI 返回的命令推荐给用户。**不要自己编建议。**

### 9. 更新 STATE.md

plan 完成后，**必须自动更新** `.sillyspec/STATE.md`：

- 当前阶段改为 `plan ✅`
- 下一步改为 `/sillyspec:execute`
- 历史记录追加时间 + plan 完成
- 追加 Wave 数量信息

## 绝对规则
- 不写实现代码（只写计划中的代码示例）
- 每个步骤必须有验证命令和预期输出
- 不要遗漏边界情况
- **计划中引用的表名、字段名必须来自 ARCHITECTURE.md 数据模型或 design.md 中声明的新增表。禁止编造。**
