---
author: qinyi
created_at: 2026-05-13T08:37:40
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# CONVENTIONS

> 本文档记录 sillyspec 仓库中**实际存在但未显式写在 lint/格式化配置里**的隐形约定（项目无 eslint/prettier/biome）。每条约定均由 grep 扫描真实代码佐证。

## 框架隐形规则

### 1. ESM 顶层 + 函数体内 CJS 懒加载混用

项目 package 清单声明 `"type":"module"`，所有源文件顶层一律用 `import ... from`（如 `src/worktree.js` 顶部、`src/setup.js:1-3`）。**但有少量文件在函数体内用 `require()` 做惰性加载**，这是一种刻意模式——把可选/重依赖推迟到真正调用时再加载，避免影响 CLI 启动速度或形成循环依赖：

```
src/run/command.js      （动态 import('./init.js') 等——W6 拆分后 require 惰性加载改为动态 import）
src/worktree-apply.js   （安全修复后 git 子进程迁 execFileSync 数组参数）
src/stages/doctor.js:64 const fs = require('fs');
src/stages/doctor.js:67 const { execSync } = require('child_process');
```

**隐形规则**：新代码默认顶层 `import`；只有当需要 (a) 推迟启动开销、(b) 打破循环依赖、(c) 在 bash heredoc 嵌入的 node 单行脚本里（doctor.js 中的内联诊断脚本）时，才在函数体内用 `require`。**不要把这种混用统一改成纯 import**——doctor.js 内嵌的 bash 诊断脚本必须保留 `require`（它在独立 node 进程里执行，没有 ESM 上下文）。

另一个刻意形态：`src/index.js` 大量用 `await import(...)` 懒加载子命令模块（49 处）——CLI 启动只加载路由层，`--version` 走轻量 `src/version.js`（不为 getVersion 付 init.js 的 inquirer 加载税）。

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

**隐形规则**：`name` 必须等于文件名（去 `.js`）；辅助/查询类阶段（不推进主流程）必须加 `auxiliary: true`（注册表 `src/stages/index.js` 用 `{ ...definition, auxiliary: true }` 展开注入，常量清单 `AUXILIARY_STAGES` / `READONLY_AUXILIARY_STAGES` 在 `src/constants.js`）；verify 这类「只读护栏」阶段必须用 `_globalGuardrails` 字段（下划线前缀）声明禁止操作清单，且 prompt 里固定出现 `## ⛔ verify 阶段绝对禁止的操作` 段。

### 3. 步骤 prompt 的「铁律」段固定格式

子代理步骤 prompt 普遍内嵌一个 `### 铁律` 段（中文标题），用 `- ` 列表枚举绝对禁止动作。grep 实证：

```
src/stages/explore.js:25   ### 铁律
src/stages/quick.js:61     ### 铁律
src/stages/execute.js:189/224/271  ### 铁律
src/stages/scan.js:601     - ❌ 修改代码 / 编造路径 / 读源码全文
```

**隐形规则**：任何会派发给子代理的 step prompt，结尾必须有 `### 铁律`（或 `⚠️ 路径注意` 等同义警示段），用 `❌/✅/⚠️` emoji + 中文短句声明边界。这是 sillyspec 控制 AI 行为的核心机制——**新增 step 时不可省略此段**。

### 4. 同步/网络类代码「只 warn 不抛」vs 本地校验「throw 中文」

`src/sync.js` 文件头注释明确写出该模块契约：`Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。`（`src/sync.js:5`）。grep 全文一致执行：

```
src/sync.js:204  console.warn(`[sync] ${options.method || 'GET'} ${url} → ${res.status} ...`)
src/sync.js:214  console.warn(`[sync] ${url} 请求超时 (${REQUEST_TIMEOUT_MS}ms)`)
src/sync.js:216  console.warn(`[sync] ${url} 请求失败: ${err.message}`)
```

SillyHub MCP 客户端同样遵守（`src/sillyhub-mcp/client.js` 头注释：「网络失败 / 非 2xx / 异常一律 console.warn 不抛错，绝不抛穿到 execute」）；dispatch probe 也「探测失败保守 fallback，绝不抛异常阻断 execute」。

而 `src/worktree.js` 这类**本地确定性操作**则相反——参数校验失败用中文 `throw new Error`：

```
src/worktree.js:183  throw new Error('changeName 不能为空');
src/worktree.js:188  throw new Error(`changeName 不合法: "${changeName}"，不能包含 ..、/ 或 \\`);
```

**隐形规则**：网络/平台类「尽力而为」逻辑用 `console.warn` 吞掉异常；本地文件/git/参数校验类「必须成立」逻辑用 `throw new Error('中文消息')`。CLI 入口 `src/index.js` 统一 `try/catch` 后 `console.error` + `process.exit(1)`。**不要给 sync 类加 throw，也不要给参数校验类加 warn 吞错。**

### 5. 资产保护「双标记」注释

涉及删除/清理的代码点有刻意保留的 `// ⚠️` 中文警示注释，指向同一份「真实资产」清单：

```
src/init.js:301    // ⚠️ 必须保护真实资产：若本地 .sillyspec 含 changes/（非空）、projects/（非空）...
```

**隐形规则**：任何会触碰 `.sillyspec/changes/`、`.sillyspec/projects/`、`.sillyspec/.runtime/sillyspec.db` 的清理/重置代码，必须保留 `// ⚠️ 必须保护真实资产` 注释并枚举受保护路径（平台模式 `platformMode` 下整体绕过清理段——项目内 `.sillyspec/` 常只有 local.yaml，整删丢配置）。修改这些函数时不可删除该注释。

### 6. git 子进程一律 execFileSync 数组参数（禁 shell 拼接）

历史演进：worktree 链路原用 `execSync(\`git ${args}\`)` 字符串拼接（经 shell，有拆词 + 注入面），已收口到 `src/git-helper.js` 统一入口——`execFileSync('git', [args数组])` + per-command `-c safe.directory=<cwd>`（不污染全局 config），提供抛错版 `git` / 静默版 `gitQuiet` 供 worktree 链与 run 层共用。

**隐形规则**：新增 git 调用一律走 `git-helper.js`（或同形状 `execFileSync` 数组 + stdio 三段 pipe 吞 stderr 噪音），**禁止新的 `execSync(\`git ...\`)` 字符串拼接**。

### 7. QUICKLOG 由 CLI 接管（agent 不手写 ql-ID）

`src/quicklog.js` 头注释写明历史问题：QUICKLOG 条目原本由 agent（LLM）手写，导致 (1) 漏写静默通过、(2) 多会话并发写同一文件丢更新（实证 ql-ID 重复）。现 ql-ID 分配与追加全部下沉 CLI 进程内，O_EXCL lockfile 串行化。

**隐形规则**：任何写 QUICKLOG 的新路径必须走 `src/quicklog.js` 接口，不允许 agent 手写 ql-ID；`--done` 后允许人工精修条目语义（标题/括注），但 ID 与骨架由 CLI 生成。

### 8. 原子文件写走 fs-atomic，DB 不走

`src/fs-atomic.js`：会被其他进程 / hook 读取的运行时文件（pointer / guard.json 等）必须用 `writeAtomicSync`（同目录 tmp + rename + Windows EPERM/EBUSY 退避重试）。DB 持久化由 node:sqlite 引擎承担（提交即落盘 sillyspec.db + WAL 侧车），**不经**原子写改名层。

### 9. 文档 file:line 引用必须可校验

`src/docs-check.js` + `test/doc-ref-check.test.mjs`（npm test 自动收集）+ `.husky/pre-push` 的 docs gate 构成引用校验链：文档里的 `file.js:line` 引用必须文件存在且行号在界，关键词断言要求引用行的反引号 token 在源码对应窗口内命中。

**隐形规则**：文档引用源码一律带实测行号（`worktree.js:262` 形态）；改源码后同步受影响文档的行号引用；失效数走 ratchet 门只许减少不许增加（基线 `.sillyspec/docs-check-baseline`）。

## 代码风格

- **模块系统**：ESM only（`"type":"module"`），顶层 `import/export`，例外见上方「框架隐形规则 #1」。入口 `bin/sillyspec.js` 仅 2 行：`#!/usr/bin/env node` + `import '../src/index.js'`。
- **导出**：命名导出为主（`export function`/`export const`/`export class`），`src/db.js` 的 `DB`、`src/sync.js` 的 `SyncManager`、`src/progress.js` 的 `ProgressManager` 用 `export class`。无默认导出（stages 用 `export const definition` 而非 `export default`）。
- **数字解析**：优先 `parseInt(x, 10)`（显式基数，见 `worktree.js:262`），NaN 判断用 `Number.isNaN` 而非全局 `isNaN`。
- **时间戳**：落盘统一 `new Date().toISOString()`（`contract-matrix.js:164`、`scan-postcheck.js:243`）。
- **barrel 模式**：W6 重构后 `src/run.js`（23 行）/`src/progress.js`（facade）为纯 re-export / delegate 层，外部 import 契约不变——叶子模块实现细节不得穿透 facade（改内部拆分零感知）。

## 命名规范

- **文件名**：`src/` 下全部 **kebab-case**（`worktree-apply.js`、`change-risk-profile.js`、`stage-contract.js`、`scan-postcheck.js`、`sillyhub-mcp/`），包括多词模块。`src/stages/` 下每个阶段一个文件，文件名 = `definition.name`。
- **目录**：`src/stages/`（阶段定义）、`src/hooks/`（CLI 钩子）、`src/run/`、`src/progress/`、`src/dispatch/`、`src/dispatch/backends/`、`src/sillyhub-mcp/`（W6/后续拆分的子系统目录）。子目录复数名词或子系统名。
- **函数/变量**：camelCase（`detectIsolation`、`loadWorkflow`、`validateTaskReviews`）。
- **常量**：UPPER_SNAKE_CASE（`REVIEW_SCHEMA_VERSION`、`VALID_VERDICTS`、`AUXILIARY_STAGES`）。
- **prompt 内标题**：中文（`### 铁律`、`### ⚠️ 重要`、`## ⛔ verify 阶段绝对禁止的操作`），不用英文。

## 文档 / prompt 约定

- **用户面向语言**：全中文（prompt、错误消息、`console.warn/error` 文案、注释、阶段 title/description 均中文）。`throw new Error('changeName 不能为空')` 这类也是中文。
- **prompt 结构**：步骤 prompt 普遍含「状态检查 → 加载锚定 → 主体 → 铁律/护栏」四段式；带 emoji 标记位（`✅/❌/⚠️/⛔`）做视觉分级。
- **护栏段位置**：阶段级护栏放 `definition._globalGuardrails`（下划线前缀表示「元字段，非 step」）；step 级护栏放 prompt 结尾 `### 铁律`。
- **design.md 是 truth source**：`verify` 阶段 prompt 明确写 `design.md 是唯一 truth source，不符合 design.md 的实现 = Bug`（`src/stages/verify.js:121`），且 quick 阶段要求 **Reverse Sync**（发现 Bug 是 design 遗漏时先改 design 再改代码，`src/stages/quick.js:64`）。
- **提示词文档单一数据源**：`src/stages/*.js` 的 `definition.steps[].prompt` + `src/run/prompt.js` 是唯一数据源，`docs/prompt/*.md` 是机械提取镜像（`node docs/prompt/_extract.mjs` 再生），**禁止手改 md 里的 prompt 原文**。
- **worktree 隔离纪律**：CLI 一律在主仓库根跑（`cd` 进 worktree 会写分裂进度库）；execute/verify 副本漂移由 command.js 守卫自动锚回主仓 specBase（不 exit，纠正后继续）——新命令实现须保持「进度/产出落主仓」的锚定语义。
