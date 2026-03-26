## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改任何代码
- ❌ 编造文件路径或代码模式（必须包含真实路径）
- ❌ 跳过构建环境探测
- ❌ 跳过 Schema/框架隐形规则/实体继承/代码风格扫描
- ❌ 生成文档到非 `.sillyspec/codebase/` 目录

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

无 STATE.md 或 phase 为 init → 继续。其他 phase → 提示用 `/sillyspec:continue`。

## 参数处理

`$ARGUMENTS` 包含 `--quick` → **快速扫描模式**：只读配置文件和目录结构，不读源码，不执行五项强制扫描。流程参考 `.sillyspec/.templates/scan-quick.md`，或直接执行：读配置 → 生成 ARCHITECTURE.md + STRUCTURE.md + PROJECT.md → git commit → 完成。

其余情况 → 继续下方深度扫描流程。

---

## Step 1: 检查工作区模式

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

有 `projects` 字段 → 工作区模式。

## 🚨 工作区扫描铁律

**工作区模式下，必须逐个子项目扫描并写入，禁止跨子项目累积上下文：**

```
子项目 A → 构建探测 → 代码扫描 → 写入文档 → cd 回工作区
子项目 B → 构建探测 → 代码扫描 → 写入文档 → cd 回工作区
...
最后 → 读各子项目 ARCHITECTURE.md 生成 CODEBASE-OVERVIEW.md
```

- ✅ 每个子项目**立即写入**后再扫描下一个
- ❌ 禁止同时读取多个子项目源码

---

## Step 2: 构建环境探测（每个子项目/项目执行一次）

**目的：** 解决 IDEA 有私服配置但终端跑不了测试的问题。

```bash
ls pom.xml build.gradle package.json requirements.txt go.mod pyproject.toml 2>/dev/null
ls mvnw gradlew 2>/dev/null
grep -r "mavenHome\|settings\.xml" .idea/workspace.xml 2>/dev/null | head -5
```

**AskUserQuestion：** "检测到 [Maven/Gradle/npm/...]，终端执行构建命令是否需要特殊配置？"
- 不需要
- 需要指定配置文件 → 输入路径
- 不确定，先试试默认命令

**写入 `.sillyspec/local.yaml`（不提交 git）：**

```yaml
build:
  tool: maven
  test_cmd: 'mvn test -s "D:/software/maven/conf/settings.xml"'
  compile_cmd: 'mvn compile -s "D:/software/maven/conf/settings.xml"'
  single_test_cmd: 'mvn test -s "D:/software/maven/conf/settings.xml" -pl {module} -Dtest={test_class}'
```

**铁律：execute / verify 必须先读 local.yaml 中的 build 配置再执行测试命令。**

无构建工具 → 写"本项目无构建工具，跳过构建环境探测"并跳过。

---

## Step 3: 数据库 Schema 扫描

```bash
find . \( -name "*.entity.java" -o -name "*Mapper.xml" -o -name "*.sql" -o -name "schema.prisma" -o -name "*.model.ts" -o -name "models.py" \) \
  -not -path "*/node_modules/*" -not -path "*/{.git,dist,build,vendor,target}/*" | head -30
```

**写入 ARCHITECTURE.md：**

```markdown
## 数据模型（摘要）
| 表名 | 说明 | 字段数 | 来源文件 |
|---|---|---|---|
```

无数据库 → 写"本项目无数据库"。**铁律：所有阶段引用的表名必须来自此摘要。**

## Step 4: 框架隐形规则扫描

```bash
find . \( -name "*Interceptor*.java" -o -name "*Listener*.java" -o -name "*Auditor*.java" -o -name "*Plugin*.java" \) \
  -not -path "*/node_modules/*" -not -path "*/{.git,dist,build,vendor,target}/*" | head -20
find . -name "*.java" -not -path "*/{node_modules,.git}/*" | xargs grep -li "is_deleted\|deleted_at\|soft_delete" 2>/dev/null | head -10
```

**写入 CONVENTIONS.md：**

```markdown
## 框架隐形规则
### 自动注入字段（SQL 中不要手动写）
| 字段 | 来源 | 说明 |
|---|---|---|

### DELETE 行为
- 逻辑删除 / 物理删除说明
```

无发现 → 写"未发现框架级别的自动处理配置"。

## Step 5: 实体继承规范扫描

```bash
find . \( -name "Base*.java" -o -name "Abstract*.java" \) \
  \( -path "*/entity/*" -o -path "*/model/*" -o -path "*/po/*" \) \
  -not -path "*/{node_modules,.git}/*" | head -10
find . -name "*.java" -not -path "*/{node_modules,.git}/*" | xargs grep -l "@MappedSuperclass" 2>/dev/null | head -10
```

**追加到 CONVENTIONS.md：**

```markdown
## 实体继承规范
### 基类通用字段（新建表必须包含）
| 字段 | 类型 | 说明 |
|---|---|---|
```

无基类 → 写"本项目没有实体基类"。

## Step 6: 代码风格深度提取

读取 2-3 个典型的 Controller、Service、Entity 源文件，提取：

1. **注解风格**：Controller 用 `@RestController`？映射注解？参数校验？
2. **返回值约定**：`Result<T>` / `ResponseEntity<T>` / 其他？
3. **异常处理**：全局异常处理器？
4. **Service 层约定**：命名、继承、事务注解
5. **实体风格**：Lombok、ID 生成策略
6. **Mapper/DAO**：XML 还是注解？通用基类？

写入 CONVENTIONS.md「代码风格」章节。非 Java 项目参考同等概念。

## Step 7: 补充深扫文档

```bash
mkdir -p .sillyspec/codebase/details
```

生成以下文档（从已有信息提取，不额外读大量源码）：
1. `codebase/details/STRUCTURE.md` — 目录结构
2. `codebase/details/INTEGRATIONS.md` — 外部依赖和集成
3. `codebase/details/TESTING.md` — 测试现状
4. `codebase/details/CONCERNS.md` — 技术债务和风险

更新 `.sillyspec/PROJECT.md`。

---

## 完成后

### 路径校验

```bash
for f in $(find . -maxdepth 2 -name "{ARCHITECTURE,STRUCTURE,CONVENTIONS,INTEGRATIONS,TESTING,CONCERNS,PROJECT}.md" ! -path "./.sillyspec/codebase/*" ! -path "./.sillyspec/codebase/details/*"); do
  [ -f "$f" ] && mkdir -p .sillyspec/codebase && mv "$f" ".sillyspec/codebase/$(basename $f)"
done
```

### 自检

- [ ] ARCHITECTURE.md 含架构 + 技术栈 + 数据模型摘要？
- [ ] CONVENTIONS.md 含框架隐形规则 + 实体继承规范 + 代码风格？
- [ ] details/ 下 4 份深扫文档存在？
- [ ] local.yaml 构建命令已配置（如有构建工具）？

### Git 提交

**单项目：**
```bash
git add .sillyspec/ && git commit -m "chore: sillyspec scan - codebase mapped"
```

**工作区：**
```bash
for proj in $(cat .sillyspec/config.yaml | grep -oP 'path:\s*\K.*'); do
  cd "$proj" && git add .sillyspec/ 2>/dev/null && git commit -m "chore: sillyspec scan - codebase mapped" && cd - > /dev/null
done
```

工作区扫描完成后生成 `.sillyspec/workspace/CODEBASE-OVERVIEW.md`。
