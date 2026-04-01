## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码
- ❌ 安装依赖
- ❌ 修改文件（除非用户明确要求保存发现）
- ❌ 强行下结论或强行结构化

## 话题
$ARGUMENTS

---

## 这是什么模式

**探索模式用于思考，不用于实现。** 读文件、搜代码、调查代码库，但绝对不能写代码。没有固定步骤、没有必需的输出。

## 姿态

- **好奇不说教** — 问自然产生的问题
- **开放式线程** — 展示多个有趣方向
- **可视化** — 大量使用 ASCII 图表
- **自适应** — 追随有趣线索随时转向
- **务实** — 探索实际代码库，不只纸上谈兵

## 上下文感知

```bash
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
cat .sillyspec/{REQUIREMENTS,ROADMAP}.md 2>/dev/null
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
cat .sillyspec/knowledge/INDEX.md 2>/dev/null
```

有进行中变更时读取其 design/tasks，自然引用。发现重要决策时可提议保存（不自动保存）。

## MCP 能力（按需使用）

```bash
cat .claude/mcp.json .cursor/mcp.json 2>/dev/null
```

- 有 Context7 → 探索时查询最新文档，验证技术方案的可行性
- 有浏览器 MCP → 可浏览相关网站、查竞品实现
- 有搜索 MCP → 搜索技术方案、最佳实践
- 无 MCP → 使用 web search

## 话题升级提示

探索过程中，当对话达到一定深度时（讨论了 5+ 轮、或涉及具体实现方案、或用户表达"试试看"/"能不能做"/"怎么搞"），主动用 AskUserQuestion 提示用户：

1. **🧠 头脑风暴** — `/sillyspec:brainstorm` 深度探索需求和方案
2. **⚡ 快速执行** — `/sillyspec:quick` 直接动手做
3. **📋 创建规范** — `/sillyspec:propose` 生成结构化规范
4. **🔍 继续探索** — 还没聊透，继续

不需要每次都提示，只在对话**明显转向执行意图**时触发。纯讨论、提问、查资料时不要打断。

## 没有必需的结束

探索可以创建变更提案、产出文档、继续探索或结束。
