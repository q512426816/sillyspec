## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改任何代码
- ❌ 编造文件路径或代码模式（必须包含真实路径）
- ❌ 一次性输出所有步骤（交互模式每步等用户回复）
- ❌ 跳过状态检查，自行推断项目阶段
- ❌ 跳过 Schema/框架隐形规则/实体继承扫描
- ❌ 生成文档到非 `.sillyspec/codebase/` 目录

## 状态检查（必须先执行）

```bash
sillyspec status --json
```

- `phase: "init"` 或无 phase → 继续
- `phase: "scan:quick_done"` → 建议深度扫描
- `phase: "scan:resume"` → `sillyspec check --json` 获取缺失文档，断点续扫
- 其他 phase → 不需要扫描，提示 CLI 建议的下一步

## 参数处理

`$ARGUMENTS` 为空 → **交互式引导模式**；有内容 → **快速模式**（含 `--deep` 则深度扫描，否则快速扫描该区域）。快速模式跳到对应 Step。

---

## 交互式引导流程

### Step 1: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

有 `projects` 字段 → 工作区模式：选择全量扫描、选子项目扫描、或退出。子项目文档存到各自 `<子项目路径>/.sillyspec/codebase/`，最后生成 `.sillyspec/workspace/CODEBASE-OVERVIEW.md`。

### Step 2: 检查已有文档

```bash
ls .sillyspec/codebase/ 2>/dev/null
```

- 无文档 → 直接选扫描模式
- 3 份（快扫完成）→ 升级完整扫描 / 重新快扫 / 跳过
- 7 份（深扫完成）→ 检查距上次扫描时间和新提交数，建议刷新或跳过
- 用户选跳过 → 提示 `/sillyspec:brainstorm '你的需求'` 并结束

### Step 3-5: 扫描模式、范围、排除目录

AskUserQuestion 依次确认：快速⚡/深度🔍、扫描范围（留空全量）、排除目录。

### Step 6: 确认并开始

汇总选择，用户确认后执行。

---

## 快速扫描

**只读入口和配置文件，不读源码。** 生成 3 份文档到 `mkdir -p .sillyspec/codebase`：

1. `STACK.md` — 技术栈
2. `STRUCTURE.md` — 目录结构
3. `PROJECT.md` — 项目概览

扫描命令：
```bash
# 配置文件
cat package.json tsconfig.json requirements.txt Cargo.toml go.mod pom.xml build.gradle 2>/dev/null
find . -maxdepth 2 -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20 | xargs cat 2>/dev/null
# 目录结构
find . -type f -not -path "*/node_modules/*" -not -path "*/{dist,.git,vendor,build,__pycache__,.next,coverage,.nuxt,target}/*" | head -200
# 最近提交
git log --oneline -20
```

## 🚨 三项强制扫描（快速和深度都必须执行）

### A. 数据库 Schema 扫描

**目的：** 防止后续阶段编造表名和字段名。

```bash
find . \( -name "schema.prisma" -o -name "*.model.ts" -o -name "*.entity.ts" -o -name "models.py" -o -name "models.go" -o -name "*.sql" -o -name "migration*" -o -name "*.entity.java" -o -name "*Mapper.xml" -o -name "schema.ts" \) \
  -not -path "*/node_modules/*" -not -path "*/{.git,dist,build,vendor}/*" | head -30
```

**写入 ARCHITECTURE.md（只记摘要，不展开字段）：**

```markdown
## 数据模型（摘要）
| 表名 | 说明 | 字段数 | 来源文件 |
|---|---|---|---|
| users | 用户表 | 12 | `src/entity/User.java` |

### 关系
- users 1:N orders
```

无数据库 → 写"本项目无数据库"。**铁律：所有阶段引用的表名必须来自此摘要，或 design.md 中声明的新增表。**

### B. 框架隐形规则扫描

**目的：** 防止 AI 生成的 SQL/代码违反框架自动处理机制（如自动注入字段、逻辑删除拦截器）。

```bash
# 通用检测：拦截器、审计、中间件、逻辑删除、多租户
find . \( -name "*Interceptor*.java" -o -name "*Plugin*.java" -o -name "*Auditor*.java" \
  -o -name "*EventListener*.java" -o -name "mybatis-config.xml" -o -name "settings.py" \
  -o -name "*event*.py" -o -name "*listener*.py" -o -name "*mixin*.py" \) \
  -not -path "*/node_modules/*" -not -path "*/{.git,dist,build,vendor}/*" | head -20
# 框架特定：Prisma/GORM/TypeORM/Rails/Laravel 中间件和回调
cat prisma/schema.prisma 2>/dev/null | grep -i "middleware\|plugin\|previewFeatures"
find . \( -name "*.go" -o -name "*.ts" -o -name "*.rb" -o -name "*.php" \) \
  -not -path "*/{node_modules,vendor}/*" | xargs grep -l "Callback\|Plugin\|EventSubscriber\|BeforeInsert\|acts_as_paranoid\|acts_as_tenant" 2>/dev/null | head -10
# 逻辑删除/多租户字段
find . \( -name "*.java" -o -name "*.py" -o -name "*.go" -o -name "*.ts" -o -name "*.php" \) \
  -not -path "*/{node_modules,.git,vendor,dist,build}/*" | xargs grep -li "is_deleted\|deleted_at\|soft_delete\|tenant_id" 2>/dev/null | head -20
```

**写入 CONVENTIONS.md：**

```markdown
## 框架隐形规则
### 自动注入字段（SQL 中不要手动写）
| 字段 | 来源 | 说明 |
|---|---|---|

### 自动填充字段（INSERT/UPDATE 不需要手动赋值）
| 字段 | 来源 | 说明 |
|---|---|---|

### DELETE 行为
- 不要写 `DELETE FROM` → 使用逻辑删除（如 UPDATE xxx SET is_deleted=1）
```

无发现 → 写"未发现框架级别的自动处理配置"。**铁律：后续阶段生成 SQL/数据操作代码必须遵守这些规则。**

### C. 实体继承规范扫描

**目的：** 防止新建表时漏掉基类通用字段，导致 ORM 查询报 Unknown column。

```bash
find . \( -name "Base*.java" -o -name "Abstract*.java" \) \
  \( -path "*/entity/*" -o -path "*/model/*" -o -path "*/po/*" \) \
  -not -path "*/{node_modules,.git}/*" | head -20
find . -name "*.java" -not -path "*/{node_modules,.git}/*" | xargs grep -l "@MappedSuperclass" 2>/dev/null | head -10
```

**追加到 CONVENTIONS.md：**

```markdown
## 实体继承规范
### 基类通用字段（新建表必须包含）
| 字段 | 类型 | 说明 |
|---|---|---|
（从扫描到的基类源码中提取，不编造）

### 铁律：新建表 DDL 必须包含基类所有字段
```

无基类 → 写"本项目没有实体基类"。

---

## 深度扫描

### Step 0: 预处理脚本

```bash
bash scripts/scan-preprocess.sh [扫描区域] 2>/dev/null
```

不存在则跳过。脚本输出 `.sillyspec/codebase/SCAN-RAW.md`（文件统计、配置、结构、import、类名/注解、Schema 位置）。

### Step 1: 断点续扫

```bash
for f in STACK ARCHITECTURE STRUCTURE CONVENTIONS INTEGRATIONS TESTING CONCERNS; do
  [ -f ".sillyspec/codebase/${f}.md" ] && echo "✅ ${f}" || echo "⬜ ${f}"
done
```

只生成缺失的文档，展示进度后继续。

### Step 2: 基于 SCAN-RAW.md 分析

**不直接读原始源码。** 读 SCAN-RAW.md，按需深挖相关文件。

按顺序生成 7 份文档（写完立即保存，中断不丢失）：

1. `STACK.md` — 技术栈
2. `ARCHITECTURE.md` — 架构（含数据模型摘要）
3. `STRUCTURE.md` — 目录结构
4. `CONVENTIONS.md` — 编码约定（含框架隐形规则、实体继承规范）
5. `INTEGRATIONS.md` — 集成
6. `TESTING.md` — 测试现状
7. `CONCERNS.md` — 技术债务和风险

同时更新 `.sillyspec/PROJECT.md`。

---

## 完成后

```bash
sillyspec status --json
sillyspec next
```

将 CLI 返回的命令推荐给用户。工作区扫描完成后额外提示生成 `.sillyspec/workspace/CODEBASE-OVERVIEW.md`。

### Git 提交

```bash
git add .sillyspec/
git commit -m "chore: sillyspec scan - codebase mapped"
```

### 路径校验 + 自检门控

**路径校验：** 每份文档写完后检查必须在 `.sillyspec/codebase/` 下，误放则自动修正：

```bash
for f in $(find . -maxdepth 2 -name "{ARCHITECTURE,STACK,STRUCTURE,CONVENTIONS,INTEGRATIONS,TESTING,CONCERNS,PROJECT,SCAN-RAW}.md" ! -path "./.sillyspec/codebase/*"); do
  [ -f "$f" ] && mkdir -p .sillyspec/codebase && mv "$f" ".sillyspec/codebase/$(basename $f)"
done
```

**自检门控：**
- [ ] STACK.md 含主要语言和框架？
- [ ] ARCHITECTURE.md 描述了整体架构？
- [ ] STRUCTURE.md 含目录结构？
- [ ] CONVENTIONS.md 含编码约定？（深扫）
- [ ] INTEGRATIONS.md 列出外部依赖？（深扫）
- [ ] TESTING.md 描述测试状况？（深扫）
- [ ] CONCERNS.md 列出技术债务？（深扫）
- [ ] PROJECT.md 已生成？

```bash
bash scripts/validate-scan.sh .sillyspec/codebase 2>/dev/null
```
