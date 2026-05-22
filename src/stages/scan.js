export const definition = {
  name: 'scan',
  title: '代码扫描',
  description: '分析项目结构、约定和架构',
  auxiliary: true,
  steps: [
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
1. \`PROJECT=$(python3 -c "import sys,json; print(json.load(open('.sillyspec/.runtime/progress.json')).get('project',''))" 2>/dev/null || basename "$(pwd)")\`
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
