export const definition = {
  name: 'scan',
  title: '代码扫描',
  description: '分析项目结构、约定和架构',
  auxiliary: true,
  steps: [
    {
      name: '探测项目结构并建议子项目',
      prompt: `扫描项目顶层目录结构，自动发现可能的子项目，**需用户确认后才创建 projects 配置**。

### 操作
1. 列出项目顶层目录：\`ls -d */ 2>/dev/null | grep -v node_modules | grep -v '.git' | grep -v '.sillyspec'\`
2. 对每个顶层目录，快速判断是否为独立项目（检查 package.json / pom.xml / build.gradle / pyproject.toml / go.mod 等构建文件）
3. 对每个疑似独立项目，检测技术栈：\`cat <dir>/package.json 2>/dev/null | head -5\` 或类似
4. 对比 \`.sillyspec/projects/\` 已有配置，找出未注册的子项目

### 判断标准（满足任一即为子项目）
- 有独立的构建文件（package.json, pom.xml, build.gradle, pyproject.toml 等）
- 有独立的源码目录结构（src/, app/, lib/ 等）
- 有独立的测试目录（test/, tests/, __tests__/ 等）
- 不是 .git / node_modules / .sillyspec / dist / build 等工具目录

### 输出格式
列出发现的可能子项目列表，每个含：
- 目录名
- 技术栈（如 Next.js + TypeScript、FastAPI + Python）
- 是否已注册到 projects/
- 建议：注册 / 跳过

### ⛔ 红线
- **不要自动创建 projects 配置文件**，只列出建议供用户确认
- **不要修改任何文件**，只做探测和报告

### 输出
子项目建议列表（含技术栈和注册状态）`,
      outputHint: '子项目建议列表',
      optional: false
    },
    {
      name: '检查已有扫描文档和子项目列表',
      prompt: `检查已有扫描文档和子项目列表。

### 操作
1. \`ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .\` — 检查已有文档
1. \`ls .sillyspec/docs/*/scan/ 2>/dev/null\` — 检查已有文档
2. \`wc -l .sillyspec/docs/*/scan/*.md 2>/dev/null\` — 文档行数
3. 已有 3 份 → 建议升级深度扫描；已有 7 份 → 建议刷新或跳过
5. 显示子项目列表供选择扫描范围

### 输出
已有文档状态 + 扫描建议`,
      outputHint: '工作区和文档状态',
      optional: false
    },
    {
      name: '构建环境探测',
      prompt: `探测项目的构建环境和依赖。

### 操作
1. \`cat package.json pom.xml build.gradle go.mod Cargo.toml requirements.txt pyproject.toml Gemfile composer.json 2>/dev/null\`
2. \`find . -maxdepth 2 -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20 | xargs cat 2>/dev/null\`
3. 结果保存到 \`.sillyspec/docs/<project>/scan/_env-detect.md\`（临时文件，扫描完删除）

### 输出
环境探测结果摘要`,
      outputHint: '环境探测摘要',
      optional: false
    },
    {
      name: '断点续扫检测',
      prompt: `检测已有扫描文档，只生成缺失的。

### 操作
1. \`PROJECT=$(python3 -c "import sys,json,glob; files=glob.glob('.sillyspec/changes/*/progress.json'); print(json.load(open(files[0])).get('project','')) if files else print('')" 2>/dev/null || basename "$(pwd)")\`
2. 检查 7 份文档是否存在：ARCHITECTURE、STRUCTURE、CONVENTIONS、INTEGRATIONS、TESTING、CONCERNS、PROJECT
3. 列出已有 ✅ 和缺失 ⬜
4. 只生成缺失的文档

### 输出
已有/缺失文档列表`,
      outputHint: '断点续扫状态',
      optional: false
    },
    {
      name: '深度扫描 — 技术架构',
      prompt: `扫描技术栈 + 数据库 Schema + 架构模式。参考 _env-detect.md。

### 操作
1. 用 grep/rg 搜索（\`@Entity\`、\`schema.prisma\`、\`models.py\` 等），**禁止读源码全文**
2. Schema 只记表名+说明+字段数
3. 写入 \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
4. 包含 \`## 技术栈\` \`## 架构概览\` \`## 数据模型（摘要）\`

### 输出
ARCHITECTURE.md 路径

### 注意
- 路径用反引号，不编造`,
      outputHint: 'ARCHITECTURE.md 路径',
      optional: false
    },
    {
      name: '深度扫描 — 代码约定',
      prompt: `扫描框架隐形规则 + 实体继承 + 代码风格。参考 _env-detect.md。

### 操作
1. 用 grep 搜索拦截器/插件/逻辑删除/基类/审计字段，**禁止读源码全文**
2. 根据检测到的语言/框架自行决定搜索什么模式
3. 提取 3-5 个典型示例
4. 写入 \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
5. 包含 \`## 框架隐形规则\` \`## 实体继承规范\` \`## 代码风格\`

### 输出
CONVENTIONS.md 路径

### 注意
- 路径用反引号，不编造`,
      outputHint: 'CONVENTIONS.md 路径',
      optional: false
    },
    {
      name: '深度扫描 — 目录结构和集成',
      prompt: `扫描目录结构 + 外部集成。参考 _env-detect.md。

### 操作
1. 用 find/ls/tree 和 grep，**禁止读源码全文**
2. 搜索 API 调用、MQ 配置、缓存、第三方 SDK
3. 写入 \`.sillyspec/docs/<project>/scan/STRUCTURE.md\`（目录树+模块说明）
4. 写入 \`.sillyspec/docs/<project>/scan/INTEGRATIONS.md\`（按类型分组）

### 输出
STRUCTURE.md 和 INTEGRATIONS.md 路径

### 注意
- 路径用反引号，不编造`,
      outputHint: 'STRUCTURE.md + INTEGRATIONS.md 路径',
      optional: false
    },
    {
      name: '深度扫描 — 测试和债务',
      prompt: `扫描测试现状 + 技术债务 + 项目概览。参考 _env-detect.md。

### 操作
1. 用 grep 搜索测试文件、TODO/FIXME、过时依赖，**禁止读源码全文**
2. 写入 \`.sillyspec/docs/<project>/scan/TESTING.md\`（测试结构）
3. 写入 \`.sillyspec/docs/<project>/scan/CONCERNS.md\`（按严重程度分组）
4. 写入 \`.sillyspec/docs/<project>/scan/PROJECT.md\`（项目信息）

### 输出
TESTING.md、CONCERNS.md、PROJECT.md 路径`,
      outputHint: '三份文档路径',
      optional: false
    },
    {
      name: '生成本地配置',
      prompt: `自动生成 .sillyspec/.runtime/local.yaml 本地配置文件。

### 操作
1. 检查 .sillyspec/.runtime/local.yaml 是否已存在，已存在则跳过（提示"local.yaml 已存在，跳过生成"）
2. 根据项目类型生成默认配置：
   - **Node.js**（有 package.json）：build: "npm run build", test: "npm test", lint: "npm run lint", type: nodejs
   - **Maven**（有 pom.xml）：build: "mvn compile", test: "mvn test", lint: "mvn checkstyle:check", type: maven
   - **Gradle**（有 build.gradle）：build: "./gradlew build", test: "./gradlew test", type: gradle
   - **通用项目**：只写注释模板, type: generic
3. 确保目录存在：mkdir -p .sillyspec/.runtime
4. 原子写入（先写 tmp 文件再 rename）

### 文件格式
\`\`\`yaml
# SillySpec 本地配置（自动生成，可手动修改）
project:
  type: nodejs  # nodejs/maven/gradle/generic

commands:
  build: "npm run build"
  test: "npm test"
  lint: "npm run lint"

# 测试策略：full=全量测试, module=只测变更模块, skip=跳过测试
test_strategy: module

# 模块测试路径映射（可选）
# module_paths:
#   user-service: "user/"
#   order-service: "order/"
\`\`\`

### 输出
local.yaml 生成结果（已存在/已生成）`,
      outputHint: 'local.yaml 生成状态',
      optional: false
    },
    {
      name: '生成模块映射',
      prompt: `生成模块映射配置文件，建立"文件路径 → 模块"的稳定映射。

### 操作
1. 检查 \.sillyspec/docs/<project>/modules/_module-map.yaml\` 是否已存在，已存在则跳过
2. 分析项目 src/ 目录结构（或主代码目录），识别模块划分：
   - 用 \`find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*"\` 查看目录结构
   - 每个独立目录（有明确职责的）识别为一个模块
   - 路径用 glob 模式（如 \`src/auth/**\`）
3. 生成 \.sillyspec/docs/<project>/modules/_module-map.yaml\`
4. 如果 modules/ 目录不存在，先创建
5. 原子写入（先写 tmp 文件再 rename）

### YAML 格式
\`\`\`yaml
# 模块映射（自动生成，可手动修改）
# 用于 archive 阶段识别变更影响的模块
modules:
  <module-name>:
    paths:
      - <glob-pattern>
    description: <一句话描述>
\`\`\`

### 示例
\`\`\`yaml
modules:
  core:
    paths:
      - src/core/**
      - src/utils/**
    description: 核心工具和公共逻辑

  stages:
    paths:
      - src/stages/**
    description: 阶段定义（brainstorm/plan/execute/verify/archive等）
\`\`\`

### 输出
_module-map.yaml 生成结果（已存在/已生成/模块列表）`,
      outputHint: '_module-map.yaml 生成状态',
      optional: true
    },
    {
      name: '自检和提交',
      prompt: `验证扫描完整性，清理并提交。

### 操作
1. 检查 7 份文档是否全部生成
2. 自检门控：ARCHITECTURE（技术栈+Schema摘要）、CONVENTIONS（隐形规则+代码风格）、STRUCTURE（目录结构）、INTEGRATIONS（外部依赖）、TESTING（测试现状）、CONCERNS（技术债务）、PROJECT（项目概览）
3. 清理：\`rm -f .sillyspec/docs/<project>/scan/_env-detect.md\`
4. \`git add .sillyspec/\` — 暂存扫描结果（不要 commit，由用户通过统一提交工具处理）

### 输出
扫描完整性报告

### 注意
- ❌ 修改代码 / 编造路径 / 读源码全文`,
      outputHint: '自检报告',
      optional: false
    }
  ]
}
