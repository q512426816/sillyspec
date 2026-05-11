主代理在 dispatch 子代理前执行以下扫描。

## 编码规范扫描

```bash
for f in .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml \
         .prettierrc .prettierrc.js .prettierrc.json .prettierrc.yml \
         tsconfig.json tsconfig.base.json \
         .editorconfig \
         .tailwind.config.js .tailwind.config.ts \
         .stylelintrc .stylelintrc.js .stylelintrc.json \
         CONTRIBUTING.md CODE_STYLE.md; do
  [ -f "$f" ] && echo "=== $f ===" && cat "$f"
done
cat package.json 2>/dev/null | grep -A5 '"lint\|"format\|"typecheck\|"type-check'
```

扫描后生成**编码规范摘要**（提炼关键约束，非原文粘贴），格式：

```
## 编码规范约束（自动扫描）
### ESLint
{关键规则}
### Prettier
{格式化规则}
### TypeScript
{严格模式设置}
### Import / 命名约定
{导入排序、命名风格}
### 框架约定
{框架特定约定}
```

注入到子代理 prompt，追加铁律：**遵守编码规范：如规范与任务描述冲突，优先遵守规范并报告。**

## 测试模式扫描（E2E/测试任务时执行）

```bash
cat package.json 2>/dev/null | grep -E "playwright|cypress|jest|vitest|mocha"
find . -name "*.spec.ts" -o -name "*.test.ts" -o -name "*.spec.tsx" -o -name "*.spec.js" \
     -o -name "playwright.config.*" -o -name "vitest.config.*" -o -name "jest.config.*" \
  2>/dev/null | grep -v node_modules | head -10
```

读取 1-2 个已有测试文件作为风格参考，生成测试模式摘要（框架、断言风格、Fixtures、文件组织、配置要点），注入到 E2E/测试子代理 prompt。

追加铁律：**参照已有测试风格编写新测试，不要凭记忆写测试。**
