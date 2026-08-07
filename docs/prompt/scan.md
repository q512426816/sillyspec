# scan（代码扫描）阶段提示词

> **源文件**：`src/stages/scan.js`
> **阶段定位**：分析项目结构、约定和架构
> **类型**：辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：无
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）
> **步骤总数**：11

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/11：探测项目结构并建议子项目

**元数据**
- optional：false
- outputHint：子项目建议列表
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{PROJECTS_ROOT}` → 常规模式 `cwd/.sillyspec/projects`；平台模式 `specRoot/projects`

**提示词原文**

````markdown
扫描项目顶层目录结构，自动发现可能的子项目，**需用户确认后才创建 projects 配置**。

### 操作
1. 列出项目顶层目录：`ls -d */ 2>/dev/null | grep -v node_modules | grep -v '.git' | grep -v '.sillyspec'`
2. 对每个顶层目录，快速判断是否为独立项目（检查 package.json / pom.xml / build.gradle / pyproject.toml / go.mod 等构建文件）
3. 对每个疑似独立项目，检测技术栈：`cat <dir>/package.json 2>/dev/null | head -5` 或类似
4. 对比 `{PROJECTS_ROOT}/` 已有配置，找出未注册的子项目

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
子项目建议列表（含技术栈和注册状态）
````

---

## Step 2/11：构建扫描项目列表

**元数据**
- optional：false
- outputHint：结构化项目列表（YAML block 或 BEGIN_PROJECT_LIST）
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{PROJECTS_ROOT}` → 常规模式 `cwd/.sillyspec/projects`；平台模式 `specRoot/projects`
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
确定本次要扫描的项目列表。

### 操作
1. `ls {PROJECTS_ROOT}/*.yaml 2>/dev/null` — 列出所有已注册项目
2. 对每个项目，检查已有的 scan 文档状态：`ls {DOCS_ROOT}/scan/*.md 2>/dev/null`
3. 按以下格式展示：

```
扫描项目列表：
1. sillyspec（主项目）— scan 文档：0/7 已存在
2. dashboard（子项目）— scan 文档：0/7 已存在
```

4. **如果存在歧义（多项目且无法自动判定），必须暂停等待用户**：
   - 选择要扫描的项目（默认全部）
   - 每个项目的扫描策略：**重新扫描（全部覆盖）** / **只补扫描缺失的文档** / **跳过**
   - 调用：`sillyspec run scan --wait --reason "等待用户确认扫描项目列表" --options "全部重新扫描,只补缺失,跳过" --output "项目列表和策略建议"`
5. **如果只有单一项目且已明确，正常完成即可，不需要等待。**

### ⛔ 重要
- **不要自行决定跳过**，有歧义时暂停等用户选择后再继续
- 最终确定的项目列表将用于后续所有步骤
- **后续每个需要生成文档的步骤，都必须对列表中的每个项目分别执行**

### 输出格式规范
--output 必须使用以下结构化格式之一（CLI 只解析这些格式，**不要输出自由文本列表**）：

**格式 A：scan_projects YAML block**
在 --output 中输出：
    scan_projects:
      - id: backend
      - id: frontend
      - id: daemon

**格式 B：BEGIN_PROJECT_LIST 标记块**
在 --output 中输出：
    BEGIN_PROJECT_LIST
    - backend
    - frontend
    - daemon
    END_PROJECT_LIST

如果不需要解析项目列表（如单项目已明确），--output 写普通摘要即可。
````

---

## Step 3/11：构建环境探测

**元数据**
- optional：false
- outputHint：环境探测摘要
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
探测当前项目的构建环境和依赖。

### 操作
对扫描列表中的每个项目重复以下操作：
1. 进入项目目录（子项目用其 path，如 `packages/dashboard/`）
2. `cat package.json pom.xml build.gradle go.mod Cargo.toml requirements.txt pyproject.toml Gemfile composer.json 2>/dev/null`
3. `find <project-dir> -maxdepth 2 -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20 | xargs cat 2>/dev/null`
4. 结果保存到 `{DOCS_ROOT}/scan/_env-detect.md`（临时文件，扫描完删除）

### 输出
每个项目的环境探测结果摘要
````

---

## Step 4/11：断点续扫检测

**元数据**
- optional：false
- outputHint：断点续扫状态
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
检测当前项目已有扫描文档，列出缺失的。

### 操作
对扫描列表中的每个项目分别执行：
1. 检查 7 份文档是否存在：ARCHITECTURE、STRUCTURE、CONVENTIONS、INTEGRATIONS、TESTING、CONCERNS、PROJECT
   路径：`{DOCS_ROOT}/scan/<DOC>.md`
2. 列出已有 ✅ 和缺失 ⬜

### 输出
每个项目的已有/缺失文档列表
````

---

## Step 5/11：深度扫描 — 7 份文档（子代理并行）

**元数据**
- optional：false
- outputHint：7 份文档生成状态（含 workflow 检查报告）
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{WORKFLOWS_ROOT}` → 常规模式 `cwd/.sillyspec/workflows`；平台模式 `specRoot/workflows`
- `<project>` → 当前项目名

**提示词原文**

````markdown
按照 `{WORKFLOWS_ROOT}/scan-docs.yaml` 中定义的角色和检查规则，使用子代理并行生成当前项目的 7 份扫描文档。

**你必须使用子代理执行，不要自己写文档。**
**对扫描列表中的每个项目分别执行以下流程。**

### 操作
1. 读取 `{WORKFLOWS_ROOT}/scan-docs.yaml`，了解角色定义、输出要求和检查规则
2. 对每个项目（扫描列表中标记为需生成/覆盖的项目）：
   a. 将 `<project>` 替换为实际项目名，得到该项目的目标文件路径
   b. 为每个角色启动独立子代理（可并行），每个子代理负责 1-2 份文档
   c. 子代理的搜索范围限定在该项目目录内（子项目如 `packages/dashboard/`，不要搜索主项目源码）
   d. 子代理直接用 grep/rg 搜索源码并写入文件，结果不回传到你的上下文
   e. 等待该项目所有子代理完成后，验证文件是否生成且非空
   f. 该项目完成后，继续下一个项目
3. 所有项目完成后，运行以下命令检查产物：
   `node -e "import('./src/workflow.js').then(w => { const r = w.runPostCheck(w.loadWorkflow('.', 'scan-docs'), '.', '<project>'); console.log(w.formatCheckReport(r)) })`
   对每个项目分别执行（将 `<project>` 替换为实际项目名）
4. 如果检查报告有失败项，按报告中的角色和文件重试失败的部分

### 覆盖保护
- **scan_depth: quick 的浅层文档允许覆盖升级**：读取旧 frontmatter 时，若旧文档含 scan_depth: quick（由 --quick 快速接入生成的浅层版本），即使其 source_commit 与当前 HEAD 一致、updated_at 未变，也允许覆盖重写——深度扫描的目的就是把它升级为完整文档。
- 生成每份 scan 文档时，frontmatter 必须包含：
  ```yaml
  ---
  author: <git 用户名（git config user.name 的输出，如 qinyi）>
  created_at: <精确到秒的时间，如 2026-07-27 10:30:00>
  source_commit: <git-head-short>
  updated_at: <now-iso-datetime>
  generator: sillyspec-scan
  ---
  ```
- 覆盖已有 scan 文档前先读取旧 frontmatter；如果旧文档的 `source_commit` 与当前 HEAD 不一致，或旧文档 `updated_at` 晚于本次 scan 开始时间，不要覆盖。
- 如果用户明确传入 `--force-rescan`，允许覆盖，但仍需写入新的 `source_commit` 和 `updated_at`。

### 子代理上下文注入
启动每个子代理前，将以下信息拼入子代理 prompt：
- 项目名（直接用实际项目名）
- 目标文件路径（从 workflow YAML 中 `<project>` 替换后的路径）
- 检查要求（从 workflow YAML 中该角色的 checks）
- 断点续扫步骤列出的缺失文档列表
- 环境探测结果摘要（如有 _env-detect.md，直接贴入）
- **⚠️ 必须强调：子代理必须用 write 工具将文件写入磁盘**
- **文件标题用中文**（sillyhub 平台解析识别用）：frontmatter 必须在文件最前（第 1 行 --- 起），frontmatter 结束的 --- 之后空一行，再写 # 中文名（English）作为标题。严禁把 # 标题放到 frontmatter 之前（否则 frontmatter 不在头部、Step11 检查项9 会报缺 author/created_at）。各文档标准标题格式：
  - STRUCTURE.md = # 目录结构（Structure）
  - CONVENTIONS.md = # 代码约定（Conventions）
  - ARCHITECTURE.md = # 架构（Architecture）
  - TESTING.md = # 测试（Testing）
  - CONCERNS.md = # 关注点（Concerns）
  - INTEGRATIONS.md = # 集成（Integrations）
  - PROJECT.md = # 项目（Project）

### 完成后
列出每个项目的 7 份文档状态：
- ✅ ARCHITECTURE.md / ❌ 缺失
- ✅ CONVENTIONS.md / ❌ 缺失
- ...
````

---

## Step 6/11：生成本地配置

**元数据**
- optional：false
- outputHint：local.yaml 生成状态
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 `platformOpts.specRoot`

**提示词原文**

````markdown
自动生成 local.yaml 本地配置文件。

### 操作
1. 检查 {SPEC_ROOT}/local.yaml 是否已存在，已存在则跳过（提示"local.yaml 已存在，跳过生成"）
2. 调用 `sillyspec local detect` 命令生成 local.yaml（该命令封装了纯 fs 项目类型嗅探：package.json→nodejs / pom.xml→maven / build.gradle→gradle / Makefile→make / 否则 generic，对应默认 commands）。**不要自行嗅探 package.json/pom.xml/build.gradle 等文件**——探测逻辑唯一归属 local-detect.js，本步骤只负责调用命令并报告结果。
3. 该命令内部已处理：确保目录存在（mkdir -p）、已存在则跳过、原子写入（先写 tmp 再 rename）。
4. 报告生成的 project.type 与 local.yaml 路径。

### 输出格式参考（由 `sillyspec local detect` 自动产出）
```yaml
# SillySpec 本地配置（自动生成，可手动修改）
project:
  type: nodejs  # nodejs/maven/gradle/make/generic

commands:
  build: "npm run build"
  test: "npm test"
  lint: "npm run lint"

# 测试策略：full=全量测试, module=只测变更模块, skip=跳过测试
test_strategy: module
```

### 输出
local.yaml 生成结果（已存在/已生成 + project.type）
````

---

## Step 7/11：生成模块映射

**元数据**
- optional：true
- outputHint：_module-map.yaml 生成状态
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`
- `<now-datetime>` → `YYYY-MM-DD HH:MM:SS`（执行时刻）

**提示词原文**

````markdown
生成当前项目的模块索引文件 `_module-map.yaml`。

### ⚠️ 重要：这个文件是唯一的结构化索引源
所有结构化事实（paths/tags/entrypoints/depends_on/used_by）只维护在这个文件里。
模块卡片（modules/*.md）只负责人类语义说明，不重复索引信息。

### 操作
对扫描列表中的每个项目分别执行：
1. 检查 `{DOCS_ROOT}/modules/_module-map.yaml` 是否已存在，已存在则跳过
2. 分析项目源码目录结构，识别模块划分：
   - 用 `find . -maxdepth 3 -type d -not -path "*/node_modules/*" -not -path "*/.git/*"` 查看目录结构
   - 每个有明确职责的独立目录识别为一个模块
   - 路径用 glob 模式
3. 用 grep/rg 分析每个模块：
   - `main_symbols`：模块导出的主要函数/类/常量（grep export / module.exports / def / class）
   - `entrypoints`：对外 API 端点或命令入口（grep route / router / @Controller / @GetMapping 等）
   - `tags`：模块相关关键词标签
   - `aliases`：模块的别名（其他开发者可能怎么称呼这个模块）
4. 分析跨模块依赖关系：
   - 用 grep import/require 分析模块间的引用链
   - 填充 depends_on（本模块依赖谁）和 used_by（谁依赖本模块）
5. 生成 `{DOCS_ROOT}/modules/_module-map.yaml`
6. 如果 modules/ 目录不存在，先创建
7. 原子写入（先写 tmp 文件再 rename）

### YAML 格式
```yaml
schema_version: 1
project: <project-name>
source_commit: <git-head-short>
generated_at: <now-datetime>
generator: sillyspec-scan

modules:
  <module-id>:
    status: active
    doc: modules/<module-id>.md
    paths:
      - <glob-pattern>
    tags:
      - <tag1>
      - <tag2>
    aliases:
      - <alias1>
    entrypoints:
      - <exported-symbol-or-api-endpoint>
    main_symbols:
      - <exported-class-or-function>
    depends_on:
      - <other-module-id>
    used_by:
      - <other-module-id>
    needs_review: false
    concerns: []
    review_reasons: []
```

### 示例
```yaml
schema_version: 1
project: multi-agent-platform
source_commit: abc1234
generated_at: 2026-06-02 22:00:00
generator: sillyspec-scan

modules:
  auth-service:
    status: active
    doc: modules/auth-service.md
    paths:
      - src/modules/auth/**
      - src/middleware/auth.js
    tags:
      - auth
      - jwt
      - rbac
      - middleware
    aliases:
      - login
      - token
      - authentication
    entrypoints:
      - authenticate
      - authorize
      - signToken
      - refreshToken
    main_symbols:
      - AuthService
      - AuthController
      - hashPassword
      - verifyPassword
    depends_on:
      - users
      - redis
    used_by:
      - api-routes
      - admin-routes
    needs_review: false
    concerns: []
    review_reasons: []
```

### 关键规则
- module-id 用 kebab-case（如 auth-service）
- depends_on / used_by 引用其他模块的 module-id
- tags 和 aliases 用于 brainstorm 阶段的需求→模块匹配，尽量覆盖开发者可能用的词
- entrypoints 和 main_symbols 用于 execute 阶段快速定位源码
- 不要编造无法从源码 grep 到的符号
- 如果无法确定依赖关系，depends_on/used_by 留空列表，不要猜

### 输出
_module-map.yaml 生成结果（已存在/已生成/模块列表）
````

---

## Step 8/11：生成模块卡片文档

**元数据**
- optional：true
- outputHint：模块文档生成状态
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
根据当前项目的 `_module-map.yaml` 生成模块卡片文档。

### ⚠️ 重要：模块卡片只负责人类语义说明
结构化索引（paths/tags/entrypoints/depends_on/used_by）已经在 _module-map.yaml 里维护。
卡片里不要重复这些信息，只写 _module-map.yaml 无法表达的语义内容。

### 操作
对扫描列表中的每个项目分别执行：
1. 读取 `{DOCS_ROOT}/modules/_module-map.yaml`，获取模块列表和路径
2. 检查 `{DOCS_ROOT}/modules/` 下已有的模块文档（<module>.md）
3. 列出每个模块的状态：已有文档 / 缺失
4. **如果有覆盖风险（已有模块文档会被覆盖），必须暂停等待用户**：
   - 展示模块列表及现有文档状态
   - 明确提供选项：**为缺失模块生成初始文档** / **全部重新生成（覆盖已有）** / **跳过**
   - 调用：`sillyspec run scan --wait --reason "检测到已有模块文档覆盖风险" --options "只生成缺失,全部重新生成,跳过" --output "受影响模块列表"`
5. **如果没有覆盖风险（全部都是缺失模块），正常完成即可，不需要等待。**

### 生成方法（子代理并行，只针对用户选中的模块）
**你必须为每个模块启动独立子代理执行，不要自己写文档。**

每个子代理的 prompt（**主 agent 启动前必须拼入**）：
- 模块名和路径（从 _module-map.yaml 读取）
- 环境探测结果摘要（构建工具、语言框架）
- scan 文档关键信息摘要（ARCHITECTURE.md 的技术栈、CONVENTIONS.md 的代码风格要点，如已生成）
```
模块名：<module-id>
模块路径：<glob patterns>
目标文件：{DOCS_ROOT}/modules/<module-id>.md

操作：
1. 用 grep/rg 搜索模块路径范围内的源码（禁止读源码全文）
2. 提取：模块职责、对外接口、关键逻辑、注意事项
3. 按以下模板写入目标文件：

---
schema_version: 1
doc_type: module-card
module_id: <module-id>
---

# <module-id>

## 定位
（负责什么，不负责什么 — 明确边界）

## 契约摘要
（核心能力列表，具体导出符号以 _module-map.yaml 的 entrypoints/main_symbols 为准）

## 关键逻辑
（最核心的流程摘要，用 text 伪代码，不超过 3-5 行）

## 注意事项
（维护提醒、已知限制、修改时需同步检查的模块）

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->

规则：
- 不要编造接口或依赖，只写 grep/rg 能搜到的
- 目标长度：500-1000 字 / 80-150 行
- 如果模块特别复杂（状态机、多角色交互、复杂领域规则），可以在 modules/details/ 下生成扩展文档（如 details/<module-id>-flow.md），agent 默认不读
- 不要重复 _module-map.yaml 中的索引信息
- 不要写设计决策表、完整依赖表、变更索引长表
- 人工备注区域保持空标记，留给用户填写
```

等待所有子代理完成，验证文件是否生成且非空。

### 输出
已生成的模块文档路径列表
````

---

## Step 9/11：生成业务流程和术语表（可选）

**元数据**
- optional：true
- outputHint：流程和术语表生成状态
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。

⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。

### flows/ 目录
目标目录：`{DOCS_ROOT}/flows/`

根据 _module-map.yaml 中的模块依赖关系，识别跨模块业务流程：
1. 读取 `_module-map.yaml`，分析 used_by 链条
2. 用 grep/rg 搜索路由定义、API 端点、事件处理
3. 识别跨模块的完整业务流程（如登录→下单→支付）
4. 每个流程生成一个文件：`flows/<flow-name>.md`

文件格式：
```markdown
# <flow-name>

## 目标
（一句话描述这个流程的业务目的）

## 参与模块
- module-a：做什么
- module-b：做什么

## 流程摘要
```text
step1 → step2 → step3
```

## 失败回滚
| 失败点 | 处理 |
|---|---|
```

### glossary.md
目标文件：`{DOCS_ROOT}/glossary.md`

提取项目专有术语：
1. 用 grep 搜索 TODO/FIXME 注释中的术语定义
2. 从数据库表注释提取
3. 从 README 和文档中提取定义段落

文件格式：
```markdown
# 术语表（Glossary）

## Session
在本项目中，session 指...（项目内特殊含义）

## Order
订单主实体，代表...（业务定义）
```

### 操作
1. 分析模块依赖关系，识别可能的业务流程
2. 如果发现 2+ 个跨模块流程，生成 flows/ 文档
3. 提取术语生成 glossary.md
4. 如果没有明显的流程或术语，跳过此步

### 输出
生成的文件路径列表（或"已跳过"）
````

---

## Step 10/11：Extract Project Knowledge

**元数据**
- optional：false
- outputHint：知识条目数量
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{KNOWLEDGE_ROOT}` → 常规模式 `cwd/.sillyspec/knowledge`；平台模式 `specRoot/knowledge`
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
从本次 scan 产物中提取长期有效、跨变更复用的项目知识，写入知识库。

### 知识分类
| 文件 | 内容 |
|------|------|
| conventions.md | 项目约定：目录规范、命名规范、提交规范、测试规范 |
| patterns.md | 可复用模式：鉴权方式、错误处理方式、模块组织方式 |
| known-issues.md | 已知坑：不可直接改的模块、历史兼容问题、代理限制 |
| uncategorized.md | 不确定分类、需要人工确认的知识 |

INDEX.md 维护索引，格式（每行：关键词1|关键词2 → [条目名](文件#锚点)；关键词用于 execute 阶段命中匹配，必须给出能区分该知识的词）：
```markdown
# 知识索引（Knowledge Index）

## 约定（Conventions）
- ESM|module|import → [ESM Only](conventions.md#esm-only)
```

### ⛔ 硬规则（必须遵守）
1. **只写未来变更会反复用到的知识** — 不要把 scan 报告摘要塞进知识库
2. **不要重复 knowledge 文件中已有的内容** — 读取现有文件，追加新条目，不覆盖
3. **不确定分类或不确定长期有效 → uncategorized.md** — 宁可不确定也不要放错
4. **每个正式分类条目必须更新 INDEX.md** — 添加对应分类下的链接
5. **每个条目用 markdown 锚点格式** — 文件内用 `## 标题`，INDEX 用 `[#标题]` 或 `(文件名#标题)`
6. **knowledge 文件标题用中文**（sillyhub 平台解析识别用）：conventions.md 第一行 # 项目约定（Conventions）、patterns.md = # 复用模式（Patterns）、known-issues.md = # 已知问题（Known Issues）、uncategorized.md = # 未分类知识（Uncategorized）、INDEX.md 见模板（知识索引）

### 操作
1. 读取现有 knowledge 文件：`{KNOWLEDGE_ROOT}/INDEX.md`、`{KNOWLEDGE_ROOT}/conventions.md` 等
2. 遍历 scan 产物（`{DOCS_ROOT}/scan/*.md`、`{DOCS_ROOT}/modules/*.md`），识别可复用知识
3. 将新知识按分类写入对应文件（追加模式，不覆盖已有内容）
4. 更新 INDEX.md 索引
5. 如果确实没有新知识可提取（已有文件已覆盖），输出"无新知识"而非创建空条目

### 输出
新增知识条目数量 + 分类分布（或"无新知识"）
````

---

## Step 11/11：自检和提交

**元数据**
- optional：false
- outputHint：自检报告
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{DOCS_ROOT}` → 常规模式 `cwd/.sillyspec/docs/<project>`；平台模式 `specRoot/docs/<project>`

**提示词原文**

````markdown
验证当前项目的扫描完整性，清理并提交。

### 操作
对扫描列表中的每个项目分别执行：
1. 检查 7 份 scan 文档是否全部生成（`{DOCS_ROOT}/scan/`）
2. 检查模块文档状态（`{DOCS_ROOT}/modules/`）
3. 自检门控：ARCHITECTURE（技术栈+Schema摘要）、CONVENTIONS（隐形规则+代码风格）、STRUCTURE（目录结构）、INTEGRATIONS（外部依赖）、TESTING（测试现状）、CONCERNS（技术债务）、PROJECT（项目概览）
4. 检查 flows/ 和 glossary.md 是否已生成（如有）
5. 清理：`rm -f {DOCS_ROOT}/scan/_env-detect.md`
6. 如果非平台模式：`git add .sillyspec/` — 暂存扫描结果（不要 commit，由用户通过统一提交工具处理）。如果平台模式：跳过 git add（specRoot 不在 sourceRoot 的 git repo 内）。

### ⛔ 路径合规检查（平台模式下必须执行）
7. 确认所有文档都写入 `{DOCS_ROOT}/`（spec-root 下），**而非源码目录下的 .sillyspec/**
8. 检查是否出现 tool_use_error 或 API Error 未恢复
9. 检查 7 份文档 header 是否包含 author 和 created_at
10. 检查 local.yaml 中 commands 是否在 package.json scripts 中真实存在，不存在的必须标记 unavailable

### ⛔ API 错误处理
- 遇到 API Error 529（服务过载）或 rate_limit 时，**停止当前操作并报告**，不要自动重试
- 遇到 tool_use_error 时，记录错误信息并跳过该文件/操作，继续处理下一项
- 如果连续 3 次操作失败，输出失败摘要并停止

### ⛔ 最终状态判定
如果出现以下**任意**情况，最终状态**不能**写"全部通过"，只能写 `completed_with_warnings` 或 `failed_post_check`：
- 源码目录下存在 docs（路径合规检查失败）
- source_commit 为 null
- Write 工具出现过失败
- API Error 529 或 rate_limit
- fallback / retry / skipped validation
- 文档引用不存在的文件或模块
- 文档内容包含 .sillyspec/ 等工具目录的扫描结果

### 输出
每个项目的扫描完整性报告（必须包含路径合规检查结果和最终状态）

### 注意
- ❌ 修改代码 / 编造路径 / 读源码全文
````


---

## profile 运行时裁剪（不在上方 11 步中）

上方 11 步是 `src/stages/scan.js` 的 `definition.steps` 原文。`--quick` / `--standard` / `--deep` profile 的**运行时步骤裁剪**（如 quick 档压缩为 preflight / AI 生成 4 份核心文档 / postcheck 三步、step2 prompt 要求 frontmatter 写 `scan_depth: quick`）由 `src/run/scan-profile.js` 的 `applyScanProfileSteps` 动态生成，不在 `definition.steps` 中，故 `_extract.mjs` 不提取、本文件不展示。要查看 profile 裁剪后的实际 prompt，读 `src/run/scan-profile.js`。
