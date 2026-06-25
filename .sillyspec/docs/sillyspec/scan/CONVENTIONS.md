---
author: qinyi
created_at: 2026-05-13T08:37:40
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# CONVENTIONS

> 本文档记录 sillyspec 仓库中**实际存在但未显式写在 lint/格式化配置里**的隐形约定（项目无 eslint/prettier/biome）。每条约定均由 grep 扫描真实代码佐证。

## 框架隐形规则

### 1. ESM 顶层 + 函数体内 CJS 懒加载混用

项目 `package.json` 声明 `"type":"module"`，所有源文件顶层一律用 `import ... from`（如 `src/worktree.js:11-14`、`src/setup.js:1-6`）。**但有少量文件在函数体内用 `require()` 做惰性加载**，这是一种刻意模式——把可选/重依赖推迟到真正调用时再加载，避免影响 CLI 启动速度或形成循环依赖：

```
src/run.js:38       const { execSync } = require('child_process')
src/run.js:127-128  const { existsSync, readFileSync } = require('fs')
                     const { join } = require('path')
src/worktree-apply.js:373  const { execSync: es } = require('child_process');
src/stages/execute.js:414  const { buildContractMatrix } = require('../contract-matrix.js')
src/stages/doctor.js:61    const fs = require('fs');
```

**隐形规则**：新代码默认顶层 `import`；只有当需要 (a) 推迟启动开销、(b) 打破循环依赖、(c) 在 bash heredoc 嵌入的 node 单行脚本里（doctor.js 中的内联诊断脚本）时，才在函数体内用 `require`。**不要把这种混用统一改成纯 import**——doctor.js 内嵌的 bash 诊断脚本必须保留 `require`（它在独立 node 进程里执行，没有 ESM 上下文）。

### 2. 阶段（stage）定义的固定 shape

`src/stages/*.js` 每个文件 `export const definition`，字段顺序和命名高度统一（见 `verify.js`、`scan.js`、`quick.js`、`explore.js` 等）：

```js
export const definition = {
  name: 'verify',                    // kebab/lower，与文件名一致
  title: '验证确认',                  // 中文短标题
  description: '对照规范检查 + 测试套件',
  auxiliary: true,                   // 可选：辅助阶段（scan/status/quick/explore 带）
  _globalGuardrails: `...`,          // 可选：阶段级护栏 prompt（verify 强制有）
  steps: [ { name, prompt, ... } ]   // execute 的 steps 动态构建（= []，由 buildExecuteSteps 生成）
}
```

**隐形规则**：`name` 必须等于文件名（去 `.js`）；辅助/查询类阶段（不推进主流程）必须加 `auxiliary: true`；verify 这类「只读护栏」阶段必须用 `_globalGuardrails` 字段（下划线前缀）声明禁止操作清单，且 prompt 里固定出现 `### ⛔ verify 阶段绝对禁止的操作` 段。

### 3. 步骤 prompt 的「铁律」段固定格式

子代理步骤 prompt 普遍内嵌一个 `### 铁律` 段（中文标题），用 `- ` 列表枚举绝对禁止动作。grep 实证：

```
src/stages/explore.js:25  ### 铁律
src/stages/quick.js:63    ### 铁律
src/stages/scan.js:536    - ❌ 修改代码 / 编造路径 / 读源码全文
```

**隐形规则**：任何会派发给子代理的 step prompt，结尾必须有 `### 铁律`（或 `⚠️ 路径注意` 等同义警示段），用 `❌/✅/⚠️` emoji + 中文短句声明边界。这是 sillyspec 控制 AI 行为的核心机制——**新增 step 时不可省略此段**。

### 4. 同步/网络类代码「只 warn 不抛」vs 本地校验「throw 中文」

`src/sync.js` 文件头注释明确写出该模块契约：`Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。`（`src/sync.js:5`）。grep 全文一致执行：

```
src/sync.js:99   console.warn(`[sync] ${method} ${url} → ${res.status} ...`)
src/sync.js:109  console.warn(`[sync] ${url} 请求超时`)
src/sync.js:111  console.warn(`[sync] ${url} 请求失败: ${err.message}`)
```

而 `src/worktree.js` 这类**本地确定性操作**则相反——参数校验失败用中文 `throw new Error`：

```
src/worktree.js:89   throw new Error('changeName 不能为空');
src/worktree.js:94   throw new Error(`changeName 不合法: "${changeName}"，不能包含 ..、/ 或 \\`);
```

**隐形规则**：网络/平台类「尽力而为」逻辑用 `console.warn` 吞掉异常；本地文件/git/参数校验类「必须成立」逻辑用 `throw new Error('中文消息')`。CLI 入口 `src/index.js` 统一 `try/catch` 后 `console.error` + `process.exit(1)`（见 index.js 大量 `process.exit(1)`/`process.exit(2)`）。**不要给 sync 类加 throw，也不要给参数校验类加 warn 吞错。**

### 5. 资产保护「双标记」注释

涉及删除/清理的代码点有刻意保留的 `// ⚠️` 中文警示注释，指向同一份「真实资产」清单：

```
src/init.js:1191   // ⚠️ 同 init.js：必须保护真实资产（changes/、projects/、sillyspec.db）。
src/init.js:112    // ⚠️ 必须保护真实资产：若本地 .sillyspec 含 changes/（非空）、projects/（非空）...
```

**隐形规则**：任何会触碰 `.sillyspec/changes/`、`.sillyspec/projects/`、`.sillyspec/.runtime/sillyspec.db` 的清理/重置代码，必须保留 `// ⚠️ 必须保护真实资产` 注释并枚举受保护路径。修改这些函数时不可删除该注释。

## 代码风格

- **模块系统**：ESM only（`"type":"module"`），顶层 `import/export`，例外见上方「框架隐形规则 #1」。入口 `bin/sillyspec.js` 仅 2 行：`#!/usr/bin/env node` + `import '../src/index.js'`。
- **导出**：命名导出为主（`export function`/`export const`/`export class`），仅 `src/db.js` 的 `DB` 用 `export class`。无默认导出（stages 用 `export const definition` 而非 `export default`）。
- **git 子进程**：统一走 `execSync(\`git ${args}\`, { cwd, encoding:'utf8', stdio:['pipe','pipe','pipe'] })`（见 `worktree.js`/`worktree-apply.js` 多处），**stdio 三段 pipe 是为了吞掉 stderr 噪音**——新增 git 调用请沿用此形状。
- **数字解析**：优先 `parseInt(x, 10)`（显式基数，见 `worktree.js:109-110`、`progress.js:1407`），NaN 判断用 `Number.isNaN`（`worktree-guard.js:149`）而非全局 `isNaN`。
- **时间戳**：落盘统一 `new Date().toISOString()`（`contract-matrix.js:152`、`scan-postcheck.js:256`）。

## 命名规范

- **文件名**：`src/` 下全部 **kebab-case**（`worktree-apply.js`、`change-risk-profile.js`、`stage-contract.js`、`scan-postcheck.js`），包括多词模块。`src/stages/` 下每个阶段一个文件，文件名 = `definition.name`。
- **目录**：`src/stages/`（阶段定义）、`src/hooks/`（CLI 钩子）。子目录复数名词。
- **函数/变量**：camelCase（`detectIsolation`、`loadWorkflow`、`validateTaskReviews`）。
- **常量**：UPPER_SNAKE_CASE（`REVIEW_SCHEMA_VERSION`、`VALID_VERDICTS`、`BRANCH_PREFIX`）。
- **prompt 内标题**：中文（`### 铁律`、`### ⚠️ 重要`、`### ⛔ verify 阶段绝对禁止的操作`），不用英文。

## 文档 / prompt 约定

- **用户面向语言**：全中文（prompt、错误消息、`console.warn/error` 文案、注释、阶段 title/description 均中文）。`throw new Error('changeName 不能为空')` 这类也是中文。
- **prompt 结构**：步骤 prompt 普遍含「状态检查 → 加载锚定 → 主体 → 铁律/护栏」四段式；带 emoji 标记位（`✅/❌/⚠️/⛔`）做视觉分级。
- **护栏段位置**：阶段级护栏放 `definition._globalGuardrails`（下划线前缀表示「元字段，非 step」）；step 级护栏放 prompt 结尾 `### 铁律`。
- **design.md 是 truth source**：`verify` 阶段 prompt 明确写 `design.md 是唯一 truth source，不符合 design.md 的实现 = Bug`（`verify.js:112`），且 quick 阶段要求 **Reverse Sync**（发现 Bug 是 design 遗漏时先改 design 再改代码，`quick.js:66`）。
