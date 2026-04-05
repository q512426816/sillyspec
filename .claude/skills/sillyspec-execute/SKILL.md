---
name: sillyspec:execute
description: 波次执行 — 子代理并行 + 强制 TDD + 两阶段审查
---

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
sillyspec progress show 2>/dev/null
```

检查 progress.json 中 currentStage 是否为 execute。如果不是 → 检查是否有未完成的 tasks.md：

```bash
ls .sillyspec/changes/*/tasks.md 2>/dev/null | xargs grep -l '\- \[ \]' 2>/dev/null
```

有未完成的 tasks.md → 继续。没有 → 提示 `/sillyspec:continue`。

## 执行范围
$ARGUMENTS

---

## 加载上下文

```bash
ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .
```

**工作区模式：** 根据计划 Task 标注确定子项目，额外加载共享规范 + CODEBASE-OVERVIEW.md。所有代码修改、测试运行在子项目目录中执行。

**加载以下文件（主代理读取，后续注入子代理）：**
```bash
PLAN=$(ls -t .sillyspec/changes/*/tasks.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
PROJECT=$(python3 -c "import sys,json; print(json.load(open('.sillyspec/.runtime/progress.json')).get('project',''))" 2>/dev/null || basename "$(pwd)")
cat docs/${PROJECT}/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

**知识库查询（强制步骤）：**
主代理在 dispatch 每个子代理前，必须执行：
```bash
cat .sillyspec/knowledge/INDEX.md 2>/dev/null
```
根据当前 task 描述中的关键词（技术名词、模块名、文件路径等）匹配 INDEX.md 条目。命中时读取对应 knowledge 文件，将内容注入子代理 prompt 的「相关知识」段。未命中则跳过，不注入空段。

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

---

## 任务分类→模型路由（强制）

主代理在 dispatch 子代理前，根据任务特征选择模型：

| 分类 | 触发条件 | 推荐模型 |
|------|---------|---------|
| **架构/复杂推理** | 任务含"设计"、"架构"、"重构"、"性能优化"、"算法" | 最强模型（如 Claude Sonnet 4 / Hunter Alpha） |
| **常规实现** | 一般 CRUD、业务逻辑、接口开发 | 中等模型（如 GPT-4o / GLM-5） |
| **简单修改** | 改配置、改文案、改样式、修 bug | 快速模型（如 DeepSeek / Llama） |
| **文档/写作** | 写文档、写注释、写 README | 写作模型（如 GPT-4o / DeepSeek） |

**默认模型**：如无法判断，使用当前默认模型。

**用户覆盖**：用户可在 tasks.md 中用标签指定模型，如：
```markdown
- [ ] [model:openrouter/anthropic/claude-sonnet-4] 实现支付模块架构设计
```

主代理读取标签后覆盖自动分类。

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
2. 根据「任务分类→模型路由」规则为每个任务选择模型
3. 同一 Wave 内的任务**并行启动**子代理，不同 Wave **串行等待**
4. 每个 Wave 完成后，根据用户选择的确认频率决定是否暂停
5. 子代理返回结果后，主代理勾选 tasks.md、更新 progress.json（`sillyspec progress update-step`）

**dispatch 时指定 model 参数：**
```bash
# 根据任务分类选择模型
if [[ "$TASK_LABEL" =~ model: ]]; then
  MODEL=$(echo "$TASK_LABEL" | grep -oP 'model:\S+')
elif [[ "$TASK_DESC" =~ 设计|架构|重构|性能优化|算法 ]]; then
  MODEL="openrouter/anthropic/claude-sonnet-4"  # 最强模型
elif [[ "$TASK_DESC" =~ 配置|文案|样式|修.?bug ]]; then
  MODEL="zai/glm-5-turbo"  # 快速模型
else
  MODEL="openrouter/openai/gpt-4o"  # 中等模型
fi
```

### 子代理 Prompt 模板

主代理在 dispatch 子代理前，根据「任务分类→模型路由」选择模型，然后准备以下 prompt（所有内容**内联**，不让子代理自己读文件）：

**模型选择示例：**
```
# 架构任务 → dispatch 时指定 model=openrouter/anthropic/claude-sonnet-4
# 普通实现 → dispatch 时指定 model=openrouter/openai/gpt-4o
# 简单修改 → dispatch 时指定 model=zai/glm-5-turbo
```

```
你正在执行任务：

## 任务描述
{tasks.md 中当前 task 的完整内容，包括步骤字段}

## 项目约定
{CONVENTIONS.md 全文}

## 项目架构
{ARCHITECTURE.md 全文}

## 构建命令
{local.yaml 中的 build 命令，如无则给默认命令}

## 工作目录
{子项目目录路径，工作区模式需要 cd 到此目录}

## 相关知识（如有）
{主代理从 knowledge/ 中按任务关键词匹配到的内容，未命中则删除此段}

## 文档/代码查询（强制步骤）

**在写代码前，如果涉及不熟悉的库/框架/API，必须先查询：**

```bash
# 1. 查官方文档（Context7 MCP）
# 用法：在 prompt 中说明需要查询的库名
# 主代理会在 dispatch 前通过 MCP 查询并注入结果

# 2. 查开源实现（grep.app MCP）  
# 用法：如果文档不够，搜 GitHub 上的真实实现
# 主代理会在 dispatch 前通过 MCP 查询并注入结果
```

**主代理 dispatch 前的查询流程：**
1. 读取当前 task 描述
2. 提取涉及的库/框架/技术关键词
3. 通过 Context7 MCP 查询官方文档
4. 如果文档不足以解决问题，通过 grep.app MCP 搜索开源代码
5. 将查询结果注入子代理 prompt 的「相关知识」段

## 铁律（必须遵守）
1. **先读后写：** 先 cat 要修改的文件和参考文件，确认风格和方法签名后再写
2. **grep 确认：** 调用已有方法前必须 grep 确认存在，grep 不到 → 报告 BLOCKED
3. **不编造：** 不编造不存在的方法/注解/类/字段
4. **不自行补全：** 发现缺失接口/方法，不自己写，报告 BLOCKED
5. **TDD 不跳步：** 按任务步骤逐步执行，每步必须运行测试命令并确认结果
6. **测试直接通过 = 测了已有行为，重写测试**
7. **暂存：** 完成后在工作目录执行 git add -A（不要 commit，由用户通过 /sillyspec:commit 统一提交）
8. **不修改计划外的文件**，如必须修改则在报告中说明

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

更新进度：`sillyspec progress update-step execute "步骤名" --status completed --output "结果"`。全部完成后 `sillyspec progress complete-stage execute`。
