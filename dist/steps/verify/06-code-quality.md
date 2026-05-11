代码质量扫描：

```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/ lib/ app/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" 2>/dev/null | head -20
```

审查 design.md「文件变更」中列出的文件：
- 安全问题（输入校验、SQL拼接、硬编码敏感信息）
- 潜在 bug（空值、边界条件）
- 与 `.sillyspec/docs/<project>/scan/CONVENTIONS.md` 一致性

每个问题标 🔴必须 / 🟡建议 / 🔵优化。

## MCP 基础设施验证

检查当前可用工具列表中是否存在以下 MCP 工具：
- 数据库相关工具（postgres/sqlite/mysql/redis）
- 浏览器相关工具（browser/chrome/puppeteer/playwright/devtools）
- 搜索相关工具（search/web_search）

**数据库 MCP：** 对照 design.md 验证表/集合、字段类型、约束。⚠️ 只执行 SELECT 查询。

**浏览器 MCP：** 验证页面加载、UI 元素、基础交互。

**无 MCP → 跳过此部分。**
