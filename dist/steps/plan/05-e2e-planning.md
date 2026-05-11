识别 design.md 中是否有 UI 交互功能（页面跳转、表单提交、按钮操作等），如有则：

**检测测试能力（按优先级）：**
```bash
# 优先级 1：专业 E2E 框架
cat package.json 2>/dev/null | grep -E "playwright|cypress" ; ls node_modules/playwright node_modules/cypress 2>/dev/null
# 优先级 2：通用测试框架
cat package.json 2>/dev/null | grep -E "jest|vitest|mocha" ; ls node_modules/jest node_modules/vitest 2>/dev/null
# 优先级 3：浏览器 MCP
cat .claude/mcp.json .cursor/mcp.json 2>/dev/null | grep -i "browser\|chrome\|devtools"
```

- **有 E2E/测试框架** → tasks.md 中添加 E2E 测试任务（同波次，编码后编写）
- **无框架但有浏览器 MCP** → tasks.md 中添加"编写 e2e-steps.md 测试步骤"任务
- **什么都没有** → 提示用户运行 `sillyspec setup` 安装 MCP 工具，或手动安装测试框架

纯后端/无 UI 的变更跳过此步骤。
