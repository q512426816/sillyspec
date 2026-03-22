---
description: 代码库扫描 — 支持快速扫描和深度扫描两阶段
argument-hint: "[可选：指定区域，如 'api' 或 'auth'] [--deep 深度扫描]"
---

你现在是 SillySpec 的代码库扫描器。

## 扫描参数

解析 `$ARGUMENTS`：
- 包含 `--deep` → 深度扫描模式
- 否则 → 快速扫描模式（默认）
- `--deep` 前后的其他内容为扫描区域（如 `api --deep` → 深扫 api 区域）

## 排除目录

快扫和深扫都排除以下目录：`node_modules`、`dist`、`.git`、`vendor`、`build`、`__pycache__`、`.next`、`coverage`、`.nuxt`、`target`

## 核心流程

### Step 0: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

如果 config.yaml 存在且包含 `projects` → 工作区模式：

1. 如果指定了子项目名称，只扫描该项目
2. 否则，询问扫描范围：
   ```
   检测到工作区模式，请选择扫描范围：
     1) 全部子项目
     2) 指定子项目
   ```
3. 对每个子项目，**切换到子项目目录**执行后续步骤
4. 每个子项目的文档存到各自的 `<子项目路径>/.sillyspec/codebase/` 下
5. 所有子项目扫描完成后，在工作区级别生成汇总文档：
   - 创建 `mkdir -p .sillyspec/workspace`
   - 生成 `.sillyspec/workspace/CODEBASE-OVERVIEW.md`：

   ```markdown
   # 工作区代码库概览

   ## 子项目一览

   | 项目 | 路径 | 角色 | 扫描模式 | 文档数 |
   |---|---|---|---|---|
   | frontend | ./frontend | 前端 - Vue3 + TypeScript | 快扫 | 3 |
   | backend | ./backend | 后端 - Node.js | 深扫 | 7 |

   ## 跨项目关注点

   ### 共享技术
   - [从各 STACK.md 提取共同技术]

   ### 项目间依赖
   - [从各 INTEGRATIONS.md 提取跨项目 API 调用]

   ### 技术债务汇总
   - [从各 CONCERNS.md 汇总严重问题]

   ## 共享规范
   - [列出 .sillyspec/shared/ 下的文件]
   ```

6. 最后说（根据扫描模式调整）：

   > ✅ 工作区扫描完成！
   >
   > - 子项目 frontend：`frontend/.sillyspec/codebase/`（快扫，3 份文档）
   > - 子项目 backend：`backend/.sillyspec/codebase/`（深扫，7 份文档）
   > - 工作区概览：`.sillyspec/workspace/CODEBASE-OVERVIEW.md`

否则 → 单项目模式，继续后续步骤。

### Step 1: 检查已有文档

```bash
ls .sillyspec/codebase/ 2>/dev/null
```

- 快速扫描：如果已有全部 7 份文档 → 询问「`.sillyspec/codebase/` 已有完整扫描结果。刷新 / 跳过？」；如果只有 3 份 → 直接覆盖更新
- 深度扫描：如果已有 7 份文档 → 询问「`.sillyspec/codebase/` 已有完整扫描结果。刷新 / 跳过？」；如果只有 3 份（快扫结果）→ 告知「检测到快速扫描结果，将补充生成剩余 4 份文档」然后继续

### Step 2: 执行扫描

如果指定了区域，只扫描该区域。否则全量扫描。

#### 快速扫描（默认）

**只读取入口和配置文件，不读源代码：**

```bash
# 读取配置文件
cat package.json 2>/dev/null
cat tsconfig.json 2>/dev/null
cat requirements.txt 2>/dev/null
cat Cargo.toml 2>/dev/null
cat go.mod 2>/dev/null
find . -maxdepth 2 -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20 | xargs cat 2>/dev/null

# 查看目录结构（排除依赖和构建产物）
find . -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/vendor/*" -not -path "*/build/*" -not -path "*/__pycache__/*" -not -path "*/.next/*" -not -path "*/coverage/*" -not -path "*/.nuxt/*" -not -path "*/target/*" | head -200

# 最近提交
git log --oneline -20
```

## 🚨 数据库 Schema 强制扫描（必须执行）

**无论快速还是深度模式，必须执行以下步骤。** 防止 AI 在后续阶段编造表名和字段名。

### 第一步：查找 Schema 定义文件

```bash
find . \( -name "schema.prisma" -o -name "*.model.ts" -o -name "*.entity.ts" \
  -o -name "models.py" -o -name "models.go" \
  -o -name "*.sql" -o -name "migration*" \
  \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" \
  -not -path "*/build/*" -not -path "*/vendor/*" | head -30
```

支持的格式：

| 框架 | 识别文件 |
|---|---|
| Prisma | `prisma/schema.prisma` |
| SQLAlchemy / Django | `**/models.py` |
| TypeORM | `**/*.entity.ts` |
| Mongoose | `**/*.model.ts`（检查 mongoose schema） |
| Java JPA / Hibernate | `**/entity/*.java`、`**/model/*.java`（含 `@Entity` / `@Table` 注解的类） |
| MyBatis | `**/*Mapper.xml`（提取 `resultMap` 和表名） |
| Go GORM | `**/models.go`、`**/model.go` |
| Drizzle | `**/schema.ts` |
| 原始 SQL | `**/migrations/*.sql` |

### 第二步：生成 Schema 摘要

**只记录表名 + 说明 + 字段数量，不展开字段细节。** 写入 ARCHITECTURE.md：

```markdown
## 数据模型（摘要）

| 表名 | 说明 | 字段数 | 来源文件 |
|---|---|---|---|
| users | 用户表 | 12 | `src/entity/User.java` |
| roles | 角色表 | 5 | `src/entity/Role.java` |
| orders | 订单表 | 18 | `prisma/schema.prisma` |

### 关系
- users 1:N roles
- users 1:N orders
```

如果项目没有数据库 → 写"本项目无数据库"，后续阶段不准引用任何表。

### 第三步：在后续命令中按需深挖

**brainstorm/propose/plan 阶段，根据当前需求只读取相关表的详细 schema。**

执行规则：
1. 先读 ARCHITECTURE.md 的 Schema 摘要，确定涉及哪些表
2. 只读取相关表的源文件（`cat src/entity/User.java`）
3. 没涉及的表不要读，节省上下文
4. 如果摘要中没有但需要新表 → 必须在 propose 的 design.md 中声明

**铁律：所有阶段引用的表名必须来自 Schema 摘要列表，或 design.md 中声明的新增表。**

---

**生成 3 份文档：**

创建目录 `mkdir -p .sillyspec/codebase`

**1. `.sillyspec/codebase/STACK.md`** — 技术栈

```markdown
# 技术栈
## 语言
- TypeScript 5.x（主要）、Python 3.11（脚本）
## 框架
- Next.js 14（前端+API）
## 包管理
- pnpm 9.x
## 数据库
- PostgreSQL 16 + Prisma 5
## 部署
- Vercel
## 关键文件
- `package.json` — 依赖声明
- `tsconfig.json` — TypeScript 配置
```

**2. `.sillyspec/codebase/STRUCTURE.md`** — 目录结构

```markdown
# 目录结构
[实际的目录树，标注每个目录的职责]
src/
├── app/           # Next.js App Router 页面
│   ├── (auth)/   # 认证相关页面
│   └── api/      # API 端点
├── components/    # 共享 React 组件
│   └── ui/       # 基础 UI 组件（shadcn）
├── lib/          # 工具函数和配置
├── hooks/        # 自定义 React Hooks
└── prisma/       # 数据库 schema 和迁移
```

**3. `.sillyspec/codebase/PROJECT.md`** — 项目概览

```markdown
# PROJECT.md

## 项目名：xxx
## 一句话：xxx
## 技术栈：xxx
## 最近活跃：基于 git log 的时间线
## 状态：快速扫描完成，可开始开发
```

**最后说：**

> ✅ 快速扫描完成！
>
> 生成文档到 `.sillyspec/codebase/`：
> - STACK.md — 技术栈
> - STRUCTURE.md — 目录结构
> - PROJECT.md — 项目概览
>
> 需要更完整的分析？运行：
> - `/sillyspec:scan --deep` — 生成完整 7 份文档

进入 Step 4。

#### 深度扫描（`--deep`）

**读取所有源代码文件（排除依赖和构建产物目录）：**

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" -o -name "*.php" -o -name "*.vue" -o -name "*.svelte" -o -name "*.md" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.toml" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/vendor/*" -not -path "*/build/*" -not -path "*/__pycache__/*" -not -path "*/.next/*" -not -path "*/coverage/*" -not -path "*/.nuxt/*" -not -path "*/target/*"
```

**并行分析以下 7 个维度，每个维度直接写文档：**

如果已有快扫的 STACK.md 和 STRUCTURE.md，可以更新而非完全重写。

**1. `.sillyspec/codebase/STACK.md`** — 技术栈

```markdown
# 技术栈
## 语言
- TypeScript 5.x（主要）、Python 3.11（脚本）
## 框架
- Next.js 14（前端+API）
## 包管理
- pnpm 9.x
## 数据库
- PostgreSQL 16 + Prisma 5
## 部署
- Vercel
## 关键文件
- `package.json` — 依赖声明
- `tsconfig.json` — TypeScript 配置
```

**2. `.sillyspec/codebase/ARCHITECTURE.md`** — 架构

```markdown
# 架构
## 模式
- Next.js App Router（全栈）
## 核心模块
- `src/app/` — 页面路由
- `src/lib/` — 工具库
- `src/components/` — React 组件
## 数据流
- Server Components → 数据获取 → Client Components 交互
## 关键决策
- 使用 Server Actions 代替 API Routes
```

**3. `.sillyspec/codebase/STRUCTURE.md`** — 目录结构

```markdown
# 目录结构
[实际的目录树，标注每个目录的职责]
src/
├── app/           # Next.js App Router 页面
│   ├── (auth)/   # 认证相关页面
│   └── api/      # API 端点
├── components/    # 共享 React 组件
│   └── ui/       # 基础 UI 组件（shadcn）
├── lib/          # 工具函数和配置
├── hooks/        # 自定义 React Hooks
└── prisma/       # 数据库 schema 和迁移
```

**4. `.sillyspec/codebase/CONVENTIONS.md`** — 代码约定

```markdown
# 代码约定
## 命名
- 组件：PascalCase（`UserProfile.tsx`）
- 工具函数：camelCase（`formatDate.ts`）
- 测试：`*.test.ts` 与源文件同目录
## 风格
- ESLint + Prettier 已配置
- 使用 `import type` 区分类型导入
## Git
- 分支：`feat/*`, `fix/*`, `chore/*`
- Commit：Conventional Commits
## 已发现的模式
- API 错误处理使用自定义 `AppError` 类
- 数据库查询都通过 `prisma.xxx.findMany()` 封装在 `lib/db.ts`
```

**5. `.sillyspec/codebase/INTEGRATIONS.md`** — 集成

```markdown
# 集成
## 外部服务
- NextAuth.js — 认证（GitHub + Email）
- Resend — 邮件发送
- UploadThing — 文件上传
## API
- `/api/auth/*` — NextAuth
- `/api/trpc/*` — tRPC（如适用）
## 环境变量
- `DATABASE_URL` — PostgreSQL 连接
- `NEXTAUTH_SECRET` — 认证密钥
```

**6. `.sillyspec/codebase/TESTING.md`** — 测试现状

```markdown
# 测试现状
## 框架
- Vitest（单元测试）
- Playwright（E2E，仅基础配置）
## 覆盖情况
- `src/lib/` — 有测试（约 60%）
- `src/components/` — 基本没有测试
- `src/app/` — 没有 E2E 测试
## 运行命令
- `pnpm test` — 单元测试
- `pnpm test:e2e` — E2E 测试
## 问题
- 缺少组件测试
- 没有 CI 测试配置
```

**7. `.sillyspec/codebase/CONCERNS.md`** — 技术债务和风险

```markdown
# 技术债务和风险
## 🔴 严重
- `src/lib/legacy.ts` — 800 行上帝文件，职责不清
- `prisma/schema.prisma` — 缺少数据库索引，查询性能差
## 🟡 中等
- 认证逻辑分散在 4 个文件中，没有统一抽象
- 没有 error boundary，运行时错误会导致白屏
## 🟢 低
- 部分组件使用 `any` 类型
- `public/` 下有未使用的图片资源
```

**同时更新 `.sillyspec/PROJECT.md`（如果不存在则创建）：**

```markdown
# PROJECT.md

## 项目名：xxx
## 一句话：xxx
## 技术栈：xxx
## 状态：深度扫描完成，可开始开发
```

**最后说：**

> ✅ 深度扫描完成！
>
> 生成 7 份文档到 `.sillyspec/codebase/`：
> - STACK.md — 技术栈
> - ARCHITECTURE.md — 架构
> - STRUCTURE.md — 目录结构
> - CONVENTIONS.md — 代码约定
> - INTEGRATIONS.md — 集成
> - TESTING.md — 测试现状
> - CONCERNS.md — 技术债务

### Step 3: Git 提交

```bash
git add .sillyspec/
git commit -m "chore: sillyspec scan - codebase mapped"
```

## 绝对规则
- 不修改任何代码
- 文档必须包含真实文件路径（用反引号格式）
- 有具体代码模式就列出来（不要写模糊的描述）
- 如果项目为空 → 告知用户使用 `/sillyspec:init` 初始化新项目

### 自检门控（Hard Gate）

- [ ] STACK.md 是否包含主要语言和框架？
- [ ] ARCHITECTURE.md 是否描述了整体架构？
- [ ] STRUCTURE.md 是否包含目录结构？
- [ ] CONVENTIONS.md 是否描述了编码约定？
- [ ] INTEGRATIONS.md 是否列出外部依赖？
- [ ] TESTING.md 是否描述了测试状况？
- [ ] CONCERNS.md 是否列出了技术债务？
- [ ] PROJECT.md 是否生成？

**7 份文档 + PROJECT.md 全部生成才算通过。**

### 脚本校验（硬验证）

Hard Gate 自检通过后，运行校验脚本：

```bash
bash scripts/validate-scan.sh .planning/codebase
```

- 脚本返回 0 → 自检通过，继续
- 脚本返回非 0 → 根据错误提示修正文档，重新运行脚本
