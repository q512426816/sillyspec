Lint / Format 检查：

```bash
# ESLint
if [ -f .eslintrc -o -f .eslintrc.js -o -f .eslintrc.cjs -o -f .eslintrc.json -o -f .eslintrc.yml ] || grep -q '"eslint"' package.json 2>/dev/null; then
  npx eslint . --max-warnings 0 2>&1 | tail -50
fi

# Prettier（检查而非修复）
if [ -f .prettierrc -o -f .prettierrc.js -o -f .prettierrc.json -o -f .prettierrc.yml ] || grep -q '"prettier"' package.json 2>/dev/null; then
  npx prettier --check . 2>&1 | tail -30
fi

# TypeScript 类型检查
if [ -f tsconfig.json ]; then
  npx tsc --noEmit 2>&1 | tail -30
fi

# Stylelint
if [ -f .stylelintrc -o -f .stylelintrc.js -o -f .stylelintrc.json ] || grep -q '"stylelint"' package.json 2>/dev/null; then
  npx stylelint "**/*.{css,scss,less}" 2>&1 | tail -30
fi
```

**处理策略（AskUserQuestion）：**
1. **自动修复** — 对支持 `--fix` 的工具自动修复后重跑，同一问题最多修复 3 次
2. **只报告** — 仅列出所有 lint 错误，不修改代码
