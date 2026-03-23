---
description: 生成结构化规范 — proposal + design + tasks
---

你现在是 SillySpec 的规范生成器。

## 变更名称
$ARGUMENTS

## 流程

### 0. 检查状态（必须先执行）

**在开始任何工作之前，先调用 SillySpec CLI 检查当前状态：**

```bash
sillyspec status --json
```

**根据 CLI 返回的 phase 决定是否允许执行 propose：**
- `phase: "propose"` → ✅ 可以继续
- 其他 phase → ❌ 不允许跳步，提示用户运行 `sillyspec next` 获取正确步骤

**不要跳过状态检查。不要自己推断阶段。以 CLI 为准。**

### 1. 加载上下文

读取相关文档：

```bash
# 检测是否是子阶段变更
if [[ "$ARGUMENTS" == */stage-* ]]; then
  MASTER_NAME="${ARGUMENTS%%/*}"
  STAGE_NAME="${ARGUMENTS#*/}"
  MASTER_DIR=".sillyspec/changes/$MASTER_NAME"
  CHANGE_DIR="$MASTER_DIR/stages/$STAGE_NAME"
else
  CHANGE_DIR=".sillyspec/changes/$ARGUMENTS"
fi

# 如果存在 MASTER.md，读取主变更上下文
cat .sillyspec/changes/*/MASTER.md 2>/dev/null

# 最新设计文档
ls -t .sillyspec/specs/*.md | head -1
# 需求
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
# 代码库约定（棕地）
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
cat .sillyspec/codebase/ARCHITECTURE.md 2>/dev/null
# 已有变更（排除子阶段）
ls .sillyspec/changes/ | grep -v archive
```

如果是子阶段变更（如 `reward-punishment/stage-1`）：
- 读取 MASTER.md 获取整体方向和技术决策
- 读取 MASTER.md 中"经验记录"章节（前面阶段的踩坑经验）
- 读取前面已完成阶段的设计文件（保持一致性）
- 读取该阶段对应的原型分析结果
- 规范文件保存到 `changes/<变更名>/stages/<stage-N>/`

如果是普通变更，照原流程执行。

如果没有设计文档 → 提示先运行 `/sillyspec:brainstorm`

### 1.5 锚定确认（必须完成）

读取相关规范文件。对于存在的文件，确认理解；对于不存在的文件，标注跳过：

```
已读取并理解：
- [x] proposal.md — 变更动机和范围（如果存在）
- [ ] design.md — 不存在（正常，将在本阶段生成）
- [ ] specs/requirements.md — 不存在（正常，将在本阶段生成）

所有可用上下文已加载，开始执行。
```

**文件不存在不是错误**。只确认实际存在的文件。不准跳过此步骤。

### 2. 探索现有代码

理解相关模块的当前实现，识别影响范围。

### 3. 生成规范文件

创建 `.sillyspec/changes/$ARGUMENTS/`，生成以下文件：

**`proposal.md`** — 变更提案：
```markdown
# [change-name]

## 动机
为什么做这件事

## 变更范围
受影响的核心区域

## 不在范围内
明确排除的内容

## 成功标准
- [ ] 可量化的标准 1
- [ ] 可量化的标准 2
```

**`specs/requirements.md`** — 需求清单：
```markdown
# 需求

## 功能需求
- [ ] REQ-001: 用户可以用邮箱注册
- [ ] REQ-002: 注册后自动发送验证邮件

## 用户场景
### 场景 1: 新用户注册
Given: 用户在注册页面
When: 填写邮箱和密码并提交
Then: 收到验证邮件，账户处于待验证状态

### 场景 2: 邮箱验证
Given: 用户收到验证邮件
When: 点击验证链接
Then: 账户激活，跳转到登录页

## 非功能需求
- 注册接口响应 < 500ms
- 密码使用 bcrypt 哈希
```

**`design.md`** — 技术方案：
```markdown
# 技术设计

## 架构决策
- 使用 JWT 存储 session（而非 server-side session）
- 理由：支持未来微服务拆分

## 文件变更清单
| 操作 | 文件 | 说明 |
|---|---|---|
| 新建 | `src/lib/auth.ts` | 认证核心逻辑 |
| 新建 | `src/app/api/auth/register/route.ts` | 注册接口 |
| 修改 | `prisma/schema.prisma` | 添加 User 模型 |

## 数据模型
[Prisma schema 或数据库表设计]

## API 设计
POST /api/auth/register
Request: { email: string, password: string }
Response: { userId: string, message: "verification email sent" }
```

**`tasks.md`** — 实现清单：
```markdown
# 实现清单

## 准备
- [ ] Task 0: 配置开发环境（依赖、环境变量）

## 实现
- [ ] Task 1: 数据库模型（User 表）
- [ ] Task 2: 注册 API
- [ ] Task 3: 邮件发送服务
- [ ] Task 4: 邮箱验证流程

## 收尾
- [ ] Task 5: 错误处理和边界情况
- [ ] Task 6: 集成测试
```

### 4. 展示关键文件

展示 proposal.md 和 design.md 给用户审阅。tasks.md 只展示任务列表（细节在 plan 阶段展开）。

### 5. 自检门控（Hard Gate）

在展示文件给用户之前，**必须自检**：

- [ ] proposal.md 是否包含"动机"、"变更范围"、"不在范围内"、"成功标准"四个章节？
- [ ] design.md 是否包含"文件变更清单"表格？
- [ ] specs/requirements.md 是否包含 Given/When/Then 格式的用户场景？
- [ ] tasks.md 是否每个 task 都有文件路径？

**任何一项不通过 → 修正后重新检查，不准跳过。**

### 脚本校验（硬验证）

Hard Gate 自检通过后，运行校验脚本：

```bash
bash scripts/validate-proposal.sh .sillyspec/changes/$ARGUMENTS
```

- 脚本返回 0 → 自检通过，继续展示文件
- 脚本返回非 0 → 根据错误提示修正文件，重新运行脚本

### 7. 最后说：

**用 CLI 验证并获取下一步：**

```bash
sillyspec status --json
```

展示给用户：
> 规范已生成到 `.sillyspec/changes/$ARGUMENTS/`。
> 
> 审阅 `proposal.md`（为什么做）和 `design.md`（怎么做）。
> 下一步：

```bash
sillyspec next
```

将 CLI 返回的命令推荐给用户。**不要自己编建议。**

### 8. 更新 STATE.md

propose 完成后，**必须自动更新** `.sillyspec/STATE.md`：

- 当前阶段改为 `propose ✅`
- 下一步改为 `/sillyspec:plan`
- 历史记录追加时间 + propose 完成
- 如果是子阶段（stages/ 下），更新阶段进度

## 绝对规则
- 不写实现代码
- tasks.md 只列任务名，不写具体步骤
- 必须包含可量化的成功标准
- 用户场景用 Given/When/Then 格式
- **禁止编造不存在的表名、字段名、API 端点。** design.md 中引用的数据库对象必须来自 ARCHITECTURE.md 的数据模型章节，或明确标注为"新增"
