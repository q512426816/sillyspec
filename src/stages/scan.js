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
3. 显示子项目列表供选择扫描范围

### ⛔ 重要：已有文档时的处理
如果发现已有 scan 文档（如 7 份齐全），**必须停下来问用户**：
- 列出已有文档状态（哪些存在、哪些缺失）
- 明确提供两个选项：**重新扫描（全部覆盖）** 或 **只补扫描缺失的文档**
- **不要自行决定跳过**，等用户选择后再继续

### 输出
已有文档状态 + 等待用户选择`,
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
1. \`PROJECT=$(sqlite3 -json '.sillyspec/.runtime/sillyspec.db' "SELECT name FROM project WHERE id=1" 2>/dev/null | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.length>0?r[0].name:'')" 2>/dev/null || basename "$(pwd)")\`
2. 检查 7 份文档是否存在：ARCHITECTURE、STRUCTURE、CONVENTIONS、INTEGRATIONS、TESTING、CONCERNS、PROJECT
3. 列出已有 ✅ 和缺失 ⬜
4. 只生成缺失的文档

### 输出
已有/缺失文档列表`,
      outputHint: '断点续扫状态',
      optional: false
    },
    {
      name: '深度扫描 — 7 份文档（子代理并行）',
      prompt: `使用子代理并行生成 7 份扫描文档。**你必须使用子代理执行，不要自己写文档。**

### 执行方式
1. 为每个扫描任务启动独立子代理（可并行），每个子代理负责 1-2 份文档
2. 子代理直接用 grep/rg 搜索源码并写入文件，结果不回传到你的上下文
3. 等待所有子代理完成后，验证文件是否生成且非空

### 子代理任务分配

**子代理 A — 技术架构**
目标文件：\`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
搜索范围：技术栈 + 数据库 Schema + 架构模式
- 用 grep/rg 搜索（\`@Entity\`、\`schema.prisma\`、\`models.py\` 等），**禁止读源码全文**
- Schema 只记表名+说明+字段数
- 包含 \`## 技术栈\` \`## 架构概览\` \`## 数据模型（摘要）\`
- 参考 _env-detect.md（如存在）

**子代理 B — 代码约定**
目标文件：\`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
搜索范围：框架隐形规则 + 实体继承 + 代码风格
- 用 grep 搜索拦截器/插件/逻辑删除/基类/审计字段，**禁止读源码全文**
- 根据检测到的语言/框架自行决定搜索什么模式
- 提取 3-5 个典型示例
- 包含 \`## 框架隐形规则\` \`## 实体继承规范\` \`## 代码风格\`
- 参考 _env-detect.md（如存在）

**子代理 C — 目录结构 + 外部集成**
目标文件：\`.sillyspec/docs/<project>/scan/STRUCTURE.md\` + \`.sillyspec/docs/<project>/scan/INTEGRATIONS.md\`
搜索范围：目录树 + 模块说明 + 外部集成
- 用 find/ls/tree 和 grep，**禁止读源码全文**
- 搜索 API 调用、MQ 配置、缓存、第三方 SDK
- STRUCTURE.md：目录树+模块说明
- INTEGRATIONS.md：外部集成（按类型分组）
- 参考 _env-detect.md（如存在）

**子代理 D — 测试 + 债务 + 项目概览**
目标文件：\`.sillyspec/docs/<project>/scan/TESTING.md\` + \`.sillyspec/docs/<project>/scan/CONCERNS.md\` + \`.sillyspec/docs/<project>/scan/PROJECT.md\`
搜索范围：测试文件 + TODO/FIXME + 过时依赖 + 项目信息
- 用 grep 搜索测试文件、TODO/FIXME、过时依赖，**禁止读源码全文**
- TESTING.md：测试结构
- CONCERNS.md：技术债务（按严重程度分组）
- PROJECT.md：项目概览
- 参考 _env-detect.md（如存在）

### 每个子代理的共同要求
- **上下文注入**：主 agent 在启动子代理前，必须将以下信息拼入子代理 prompt：
  - 项目名（<project>）
  - 断点续扫步骤列出的缺失文档列表（哪些要生成、哪些跳过）
  - 环境探测结果摘要（构建工具、语言框架、关键依赖）
  - _env-detect.md 内容（如存在，直接贴入）
- 路径用反引号，不编造
- 目标文件不存在则创建，已存在则覆盖
- 只生成缺失文档（根据断点续扫结果）

### 完成后
验证 7 份文档全部生成且非空，列出结果：
- ✅ ARCHITECTURE.md / ❌ 缺失
- ✅ CONVENTIONS.md / ❌ 缺失
- ...`,
      outputHint: '7 份文档生成状态',
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
      name: '生成模块核心文档',
      prompt: `根据 _module-map.yaml 中的模块划分，为每个模块生成核心文档（用于后续归档和开发上下文）。

### 操作
1. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`，获取模块列表和路径
2. 检查 \`.sillyspec/docs/<project>/modules/\` 下已有的模块文档（<module>.md）
3. 列出每个模块的状态：已有文档 / 缺失
4. **必须停下来问用户**：
   - 展示模块列表及现有文档状态
   - 明确提供选项：**为缺失模块生成初始文档** / **全部重新生成（覆盖已有）** / **跳过**
5. 用户选择后执行

### 生成方法（子代理并行，只针对用户选中的模块）
**你必须为每个模块启动独立子代理执行，不要自己写文档。**

每个子代理的 prompt（**主 agent 启动前必须拼入**：
- 模块名和路径（从 _module-map.yaml 读取）
- 环境探测结果摘要（构建工具、语言框架）
- scan 文档关键信息摘要（ARCHITECTURE.md 的技术栈、CONVENTIONS.md 的代码风格要点，如已生成）
\`\`\`
模块名：<module-name>
模块路径：<glob patterns>
目标文件：.sillyspec/docs/<project>/modules/<module>.md

操作：
1. 用 grep/rg 搜索模块路径范围内的源码（禁止读源码全文）
2. 提取：模块职责、对外接口（导出函数/API）、关键依赖、设计要点
3. 按以下模板写入目标文件：

# <module-name>
> 最后更新：<now-date>
> 最近变更：scan（初始生成）
> 模块路径：<glob patterns>

## 职责
## 当前设计
## 对外接口（表格）
## 关键数据流
## 设计决策（表格）
## 依赖关系
## 注意事项
## 变更索引（表格，初始为空）

规则：
- 不要编造接口或依赖，只写 grep/rg 能搜到的
- 模板与 archive 阶段格式一致
\`\`\`

等待所有子代理完成，验证文件是否生成且非空。

### 输出
已生成的模块文档路径列表`,
      outputHint: '模块文档生成状态',
      optional: true
    },
    {
      name: '自检和提交',
      prompt: `验证扫描完整性，清理并提交。

### 操作
1. 检查 7 份 scan 文档是否全部生成
2. 检查模块文档状态（如有）
3. 自检门控：ARCHITECTURE（技术栈+Schema摘要）、CONVENTIONS（隐形规则+代码风格）、STRUCTURE（目录结构）、INTEGRATIONS（外部依赖）、TESTING（测试现状）、CONCERNS（技术债务）、PROJECT（项目概览）
4. 清理：\`rm -f .sillyspec/docs/<project>/scan/_env-detect.md\`
5. \`git add .sillyspec/\` — 暂存扫描结果（不要 commit，由用户通过统一提交工具处理）

### 输出
扫描完整性报告

### 注意
- ❌ 修改代码 / 编造路径 / 读源码全文`,
      outputHint: '自检报告',
      optional: false
    }
  ]
}
