## Skill 扫描

```bash
for skill_dir in .claude/skills/*/SKILL.md .cursor/skills/*/SKILL.md .opencode/skills/*/SKILL.md; do
  [ -f "$skill_dir" ] && echo "=== $skill_dir ===" && cat "$skill_dir"
done
```

根据任务关键词匹配 skill，匹配到的 SKILL.md 全文注入子代理 prompt。

## MCP 能力检测

检查当前可用工具列表中是否存在以下 MCP 工具：
- Context7 / 文档查询工具
- 数据库工具（postgres/sqlite/mysql/redis）
- 浏览器工具（browser/chrome/playwright/devtools）

有 Context7 → 提示子代理用 MCP 查文档；无 → 提示用 web search。
有数据库 MCP → 在子代理 prompt 注入数据操作可用。
