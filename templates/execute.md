## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 跳过状态检查，自行推断阶段
- ❌ 跳步执行（不允许跳过 plan 直接 execute）
- ❌ 先写代码后补测试
- ❌ 编造不存在的方法/注解/路径/类/字段
- ❌ 自行补全缺失的接口/方法（应报告 BLOCKED）
- ❌ 意外修改了计划外的文件却不报告

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

有 STATE.md 且 phase 为 execute → 继续。无 STATE.md 或 phase 不对 → 检查是否有未完成的 tasks.md：

```bash
ls .sillyspec/changes/*/tasks.md 2>/dev/null | xargs grep -l '\- \[ \]' 2>/dev/null
```

有未完成的 tasks.md → 继续。没有 → 提示 `/sillyspec:continue`。

## 执行范围
$ARGUMENTS

---

## 加载上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 根据计划 Task 标注确定子项目，额外加载共享规范 + CODEBASE-OVERVIEW.md。所有代码修改、测试运行在子项目目录中执行。

**加载以下文件（主代理读取，后续注入子代理）：**
```bash
PLAN=$(ls -t .sillyspec/changes/*/tasks.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

**知识库查询（强制步骤）：**
主代理在 dispatch 每个子代理前，必须执行：
```bash
cat .sillyspec/knowledge/INDEX.md 2>/dev/null
```
根据当前 task 描述中的关键词（技术名词、模块名、文件路径等）匹配 INDEX.md 条目。命中时读取对应 knowledge 文件，将内容注入子代理 prompt 的「相关知识」段。未命中则跳过，不注入空段。

子代理遇到不熟悉的库或 API 时，优先使用已配置的 MCP 工具（Context7 等）或 web search 查最新文档，不要凭记忆猜测用法。

**编码规范扫描（主代理执行）：**
主代理在 dispatch 子代理前，扫描项目中常见的编码规范配置文件，将关键规则注入子代理 prompt 的「编码规范约束」段。

```bash
# 检测存在的配置文件
for f in .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml \
         .prettierrc .prettierrc.js .prettierrc.json .prettierrc.yml \
         tsconfig.json tsconfig.base.json \
         .editorconfig \
         .tailwind.config.js .tailwind.config.ts \
         .stylelintrc .stylelintrc.js .stylelintrc.json \
         CONTRIBUTING.md CODE_STYLE.md; do
  [ -f "$f" ] && echo "=== $f ===" && cat "$f"
done
# 也检查 package.json 中的 lint/format 脚本
cat package.json 2>/dev/null | grep -A5 '"lint\|"format\|"typecheck\|"type-check'
```

扫描后，主代理根据检测结果生成**编码规范摘要**（不是原文粘贴，是提炼关键约束），格式如下。如果某个类别未检测到对应配置文件，则省略该段：

```
## 编码规范约束（自动扫描）

### ESLint
{提取的关键规则，如：禁止 var、要求分号、禁止未使用变量、特定插件规则等}

### Prettier
{提取的格式化规则，如：单引号、2空格缩进、无分号、行宽 80 等}

### TypeScript
{从 tsconfig 提取的严格模式设置，如：strict: true、noUncheckedIndexedAccess 等}

### Import / 命名约定
{从 eslint/import 插件或 editorconfig 提取的导入排序、命名风格等}

### 框架约定
{检测到的框架特定约定，如：Next.js App Router、Tailwind 类名风格等}
```

将此摘要注入到每个子代理 prompt 的「项目约定」段之后，并追加一条铁律：
> **10. 遵守编码规范：** 以上「编码规范约束」中的所有规则必须严格遵守。如规则与任务描述冲突，优先遵守规范约束并报告。

**测试模式扫描（主代理执行）：**
对包含 E2E/测试任务时，扫描项目已有的测试文件，提取测试风格注入子代理 prompt 的「测试模式参考」段。

```bash
# 检测测试框架
cat package.json 2>/dev/null | grep -E "playwright|cypress|jest|vitest|mocha"

# 查找已有测试文件
find . -name "*.spec.ts" -o -name "*.test.ts" -o -name "*.spec.tsx" -o -name "*.spec.js" \
     -o -name "playwright.config.*" -o -name "vitest.config.*" -o -name "jest.config.*" \
  2>/dev/null | grep -v node_modules | head -10

# 读取 1-2 个已有测试文件作为风格参考
# 优先读 E2E 测试，其次读通用测试
find tests/e2e e2e cypress/e2e __tests__ src -name "*.spec.ts" -o -name "*.test.ts" \
  2>/dev/null | grep -v node_modules | head -3 | xargs cat 2>/dev/null
```

扫描后生成**测试模式摘要**：

```
## 测试模式参考（自动扫描）

### 测试框架
{检测到的框架及版本，如：Playwright 1.42、Vitest 1.2}

### 断言风格
{从已有测试提取的断言模式，如：expect(page).toHaveText()、toEqual、toBeTruthy 等}

### Fixtures / Helper
{项目自定义的 test fixtures、page objects、helper 函数}

### 文件组织
{测试文件目录结构、命名约定、文件内组织方式}

### 配置要点
{playwright.config.ts 中的 baseURL、timeout、retries 等关键配置}
```

将此摘要注入到每个 E2E/测试子代理 prompt 的「任务描述」段之后，并追加一条铁律：
> **11. 参照已有测试风格：** 编写新测试时必须参照以上「测试模式参考」中的风格，包括断言方式、fixtures 使用、文件组织。不要凭记忆写测试。
> **12. 参考已有实现：** 写新功能前，先 grep 项目中类似功能的已有代码（`grep -r "关键词" src/`），照着项目现有的模式、风格和封装方式写，不要凭记忆编造。

**Skill 扫描（主代理执行）：**
对每个子代理 dispatch 前，扫描项目中已安装的 skill，匹配相关 skill 注入子代理 prompt 的「本地 Skills」段。

```bash
for skill_dir in .claude/skills/*/SKILL.md .cursor/skills/*/SKILL.md .opencode/skills/*/SKILL.md; do
  [ -f "$skill_dir" ] && echo "=== $skill_dir ===" && cat "$skill_dir"
done
```

扫描后，根据当前任务描述的关键词匹配 skill 的 name 和 description：
- 任务包含"E2E"/"端到端"/"测试用例" → 匹配 playwright-e2e skill
- 未来可扩展更多 skill

匹配到的 skill → 将 SKILL.md 全文注入子代理 prompt。未匹配则省略该段。

**MCP 能力检测（主代理执行）：**
检查当前可用工具列表中是否存在以下类型的 MCP 工具（不要只依赖配置文件路径，不同客户端配置位置不同）：
- Context7 / 文档查询工具
- 数据库工具（postgres/sqlite/mysql/redis）
- 浏览器工具（browser/chrome/playwright/devtools）
- 搜索工具（search/web_search）
根据检测结果，在子代理 prompt 的「文档查询指引」段动态注入：
- 有 `context7` → `遇到不熟悉的库/API，使用 Context7 MCP（resolve-library-id → query-docs）查询最新文档`
- 无 `context7` → `遇到不熟悉的库/API，使用 web search 查询最新官方文档`
- 有数据库 MCP（postgres/sqlite/mysql/redis）→ 在「数据操作」段注入对应 MCP 可用
- 检测为空 → 不注入额外提示

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

---

## 确认频率

用 AskUserQuestion 询问用户选择：
- **每个 Wave 确认** — 每个 Wave 完成后展示结果，等用户确认后继续下一 Wave
- **AI 自主判断** — AI 在遇到 BLOCKED 或计划外变更时才询问，其余自动推进
- **全自动** — 全部自动执行，不在中途打断用户

---

## 子代理执行（强制模式）

**所有任务通过子代理执行，主代理负责调度和记录。**

### 执行流程

1. 解析 tasks.md，按 Wave 分组
2. 同一 Wave 内的任务**并行启动**子代理，不同 Wave **串行等待**
3. 每个 Wave 完成后，根据用户选择的确认频率决定是否暂停
4. 子代理返回结果后，主代理勾选 tasks.md、更新 STATE.md

### 子代理 Prompt 模板

主代理在 dispatch 子代理前，必须准备以下 prompt（所有内容**内联**，不让子代理自己读文件）：

```
你正在执行任务：

## 任务描述
{tasks.md 中当前 task 的完整内容，包括步骤字段}

## 项目约定
{CONVENTIONS.md 全文}

## 编码规范约束（自动扫描）
{主代理扫描项目配置文件后生成的规范摘要，见上方「编码规范扫描」步骤}

## 测试模式参考（自动扫描，仅 E2E/测试任务注入）
{主代理扫描项目已有测试文件后生成的测试风格摘要，见上方「测试模式扫描」步骤。非 E2E/测试任务省略此段}

## 项目架构
{ARCHITECTURE.md 全文}

## 构建命令
{local.yaml 中的 build 命令，如无则给默认命令}

## 工作目录
{子项目目录路径，工作区模式需要 cd 到此目录}

## 相关知识（如有）
{主代理从 knowledge/ 中按任务关键词匹配到的内容，未命中则删除此段}

## 文档查询指引
{主代理根据 MCP 检测结果动态注入：有 Context7 提示用 MCP，无则提示用 web search}

## 本地 Skills（如有）
{主代理在 dispatch 前扫描 .claude/skills/、.cursor/skills/、.opencode/skills/ 下的 SKILL.md，根据当前任务关键词匹配相关 skill，将 SKILL.md 全文注入此段。无匹配 skill 则省略此段。}

## 数据操作
{主代理根据 MCP 检测结果动态注入：如检测到数据库 MCP，提示可用}
⛔ 任何改变现有数据的操作（DML: INSERT/UPDATE/DELETE/DML、DDL: ALTER/DROP/TRUNCATE/RENAME，以及所有非 SELECT 的数据库操作）必须暂停并报告给用户确认，不得自动执行。新建表不受此限制。

## 铁律（必须遵守）
1. **先读后写：** 先 cat 要修改的文件和参考文件，确认风格和方法签名后再写
2. **grep 确认：** 调用已有方法前必须 grep 确认存在，grep 不到 → 报告 BLOCKED
3. **不编造：** 不编造不存在的方法/注解/类/字段
4. **不自行补全：** 发现缺失接口/方法，不自己写，报告 BLOCKED
5. **TDD 不跳步：** 按任务步骤逐步执行，每步必须运行测试命令并确认结果
6. **测试直接通过 = 测了已有行为，重写测试**
7. **E2E 任务：** 如果任务描述包含"E2E"或"端到端"：
   - 先 cat 相关功能代码和页面组件，理解交互逻辑
   - 参考 prompt 中「测试模式参考」段的已有测试风格
   - **查阅 Playwright 用法：** 优先使用已安装的 playwright skill（SKILL.md），不要凭记忆写 API。未安装则通过 Context7 MCP 或 web search 查最新文档
   - 有测试框架则编写测试文件，无框架则编写 `.sillyspec/changes/<变更名>/e2e-steps.md` 结构化测试步骤
   - **写完必须立即跑一遍确认通过**，失败则修复后重跑，不要"写了就算完成"
8. **Lint 校验：** 完成后对修改的文件运行 lint 工具（与 quick 相同规则），自动修复可修复的问题，不可修复的标注在报告中
9. **暂存：** lint 通过后执行 git add -A（不要 commit，由用户通过 /sillyspec:commit 统一提交）
9. **不修改计划外的文件**，如必须修改则在报告中说明
10. **遵守编码规范：** prompt 中「编码规范约束」段的所有规则必须严格遵守。如规范与任务描述冲突，优先遵守规范并报告

## 完成后报告（严格按此格式）

- **Status:** DONE / DONE_WITH_CONCERNS / BLOCKED
- **改动文件：** {列表}
- **测试结果：** {通过/失败/跳过及原因}
- **Commit:** {hash 或 "无"}
- **问题：** {BLOCKED 原因 / DONE_WITH_CONCERNS 描述 / 无}
- **发现的坑：** {执行过程中发现的项目特有规律/陷阱/约定，如无则写"无"。示例："XxxMapper.selectPage() 第一个参数必须是 IPage 对象，传 null 会 NPE 而非返回全部"}
```

### 子代理结果处理

子代理返回后，主代理：

1. **DONE** → 勾选 tasks.md，记录精确到秒的时间戳
2. **DONE_WITH_CONCERNS** → 勾选 tasks.md，记录问题到报告
3. **BLOCKED** → 不勾选，报告给用户，AskUserQuestion 三选一：
   - 重试（重新 dispatch 同一任务）
   - 跳过（勾选并标注 SKIPPED）
   - 停止（暂停执行，用户处理后继续）

**知识库写入：** 如果子代理报告中「发现的坑」不为"无"，主代理将内容追加到 `.sillyspec/knowledge/uncategorized.md`，格式：
```markdown
### [待确认] {简短标题}
> 来源：{变更名} / {task 编号} | {时间戳}

{坑的具体描述}
```

---

## 完成后

**任务勾选自检（必须执行）：**
所有任务完成后，主代理必须执行以下检查：

```bash
cat .sillyspec/changes/*/tasks.md 2>/dev/null
```

逐条验证：
1. **所有返回 DONE/DONE_WITH_CONCERNS 的任务是否已勾选 `- [x]`？**
2. **勾选的任务是否都记录了精确到秒的时间戳 `[YYYY-MM-DD HH:MM:SS]`？**
3. **tasks.md 中是否还有未勾选 `- [ ]` 的已完成任务？**

发现遗漏 → 立即补勾选 + 补时间戳，不要等用户提醒。

**知识库审阅：** 检查是否有待确认的知识条目：
```bash
grep -c '^\### \[待确认\]' .sillyspec/knowledge/uncategorized.md 2>/dev/null
```
如果有待确认条目，提示用户：
> 📚 本轮执行发现了 N 条新知识，请审阅：`cat .sillyspec/knowledge/uncategorized.md`
> 确认后请将 `[待确认]` 改为 `[已确认]`，并可归类到 knowledge/ 下的专题文件中更新 INDEX.md。

💡 所有修改已暂存。准备好后用 `/sillyspec:commit` 提交。

所有任务完成后，用 AskUserQuestion 询问用户下一步：
1. **验证** — 执行 `/sillyspec:verify` 全面验证
2. **归档** — 跳过 verify，执行 `/sillyspec:archive`
3. **继续开发** — 不结束当前阶段

更新 `.sillyspec/STATE.md`：阶段改为 `execute ✅` 或 `execute 🔄 (X/M)`，历史记录追加执行结果（含精确到秒的时间戳）。
