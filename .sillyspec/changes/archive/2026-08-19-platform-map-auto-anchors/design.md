---
author: qinyi
created_at: 2026-08-18T15:00:00+08:00
updated_at: 2026-08-18T16:20:00+08:00
scale: medium
revision: 2
risk_level: unit-sufficient
---

# 设计文档（Design）— platform-interface-map 的 file:line 锚点自动重锚（零侵入）

> 本文档为 revision 2，取代 revision 1 的「源码注释锚标记 + 占位符」方案。
> 修订依据：用户裁决开放比较全部候选方案后选择方案 A（零侵入自动重锚）。

## 1. 背景

`docs/sillyspec/platform-interface-map.md` 是 SillySpec 与 SillyHub 平台接口操作地图，包含大量源码位置引用（如 `sync.js:263`、`src/run/shared.js:425`）。当前这些 `file:line` 锚点靠人工维护，源码增删改后行号漂移，导致：

- `npm test` 中的 `test/doc-ref-check.test.mjs` 报引用失效；
- 修复方式只有人工看 `--suggest` 输出后逐行手改，重复劳动高；
- 多 agent 并行改源码时漂移更频繁。

**关键既有事实**：`src/docs-check.js` 的层 2（关键词断言）已经为每条失效引用计算了 `suggestLines`——在候选源文件里按 token 全量搜索命中行（`docs-check.js:353-362`）。也就是说，**正确行号已经被算出来了，缺的只是「把建议写回文件」这一步**。

## 2. 设计目标

- 失效引用可一键修复：`sillyspec docs check --fix` 自动将失效行号改写为 token 当前所在行；
- 零源码侵入：不在源码加任何锚注释、不改任何业务代码；
- 零文档改造：文档保持标准 `file:line` 形态，无需占位符化；
- 全文档生效：不限于 platform-interface-map.md，所有被 docs-check 覆盖的文档都受益；
- 安全默认：修复前可预览（dry-run），歧义引用不自动改、交人工。

## 3. 非目标

- 不改动 `docs-check.js` 现有两层校验逻辑与 `docs-gate` ratchet 门；
- 不为「纯位置引用」（引用行内无反引号代码符号）提供自动修复——token 缺失时无法定位，保持人工；
- 不在 pre-push / CI 强制跑 `--fix`（保持手动触发，防 token 歧义时误改）；
- 不引入源码锚标记、占位符、新配置 DSL（旧方案的全部机制废弃）；
- 本次为调研设计阶段，不落地实现（维持 D-001@v1）。

## 4. 拆分判断

单一功能增强（CLI 加一个 flag + 修复写回函数 + 测试），无跨模块状态流转，不拆分、不走批量。落地时约 2 个文件改动（`src/docs-check.js` + `src/index.js` docs 子命令路由）+ 1 个测试文件。

## 5. 总体方案

### 5.1 核心机制：复用 suggestLines 的 token 定位

`runDocsCheck` 已对每条失效引用产出 `suggest`（token 在首个候选文件的命中行数组，最多 8 个）。`--fix` 模式在该数据基础上加一层**确定性选择规则**：

1. **零命中**（`suggest` 为空）→ 跳过，报告「无法定位，需人工」；
2. **单命中** → 自动改写为该行号（唯一解，确定性）；
3. **多命中** → 不自动改，报告候选列表交人工（除非 `--fix --force` 且原行号与某候选偏差 ≤ N 行，则取最近候选——此行为默认关闭，仅作逃生口）。

修复写回时保持文档其余字节不动：按 `docLine` + 引用在行内的字符偏移做定点替换，CRLF/LF 由现有 `split(/\r?\n/)` 归一化逻辑保证不破坏。

### 5.2 CLI 接口

```text
sillyspec docs check [--fix] [--dry-run]
  --fix       对可确定性修复的失效引用自动改写行号
  --dry-run   只打印将要修改的内容，不写文件（与 --fix 组合 = 预览模式）
```

行为矩阵：

| 状态 | 无 flag | --dry-run | --fix |
|---|---|---|---|
| 全部引用有效 | exit 0 | exit 0 | exit 0（无操作） |
| 存在失效引用 | 报告 + exit 1 | 报告修复预览 + exit 1 | 修复可确定项；剩余项报告 + exit 1（若全部修复则 exit 0） |

### 5.3 与现有链路的关系

- `--fix` 是 `docs check` 的增量 flag，**不新增前置步骤、不新增脚本**；
- 修复后文档仍是标准 `file:line`，`test/doc-ref-check.test.mjs`、`.husky/pre-push` 的 docs gate、ratchet 基线全部无需改动；
- 工作流变化仅一步：原「跑 check → 看 suggest → 手改」变为「跑 check --fix → 复查 diff → 提交」。

### 5.4 工作流程

```text
改源码（行号漂移）
        │
        ▼
sillyspec docs check --fix --dry-run   （预览将要改什么）
        │
        ▼
确认无误 → sillyspec docs check --fix  （写回）
        │
        ▼
npm test（doc-ref-check 应通过）→ 提交
```

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/docs-check.js` | 新增 `applyFixes(docs, fixes)` 纯函数 + `runDocsCheck` 结果透出 `fixable` 分类；`suggestLines` 复用不改动 |
| 修改 | `src/index.js` | `docs check` 子命令路由透传 `--fix` / `--dry-run` |
| 新增 | `test/docs-check-fix.test.mjs` | 覆盖：单命中自动改、多命中不动、零命中报告、CRLF 保持、dry-run 不写盘 |
| 修改 | `test/check-syntax.mjs` | 未引用导出白名单加 `src/docs-check.js`（`applyFixes` 在 CLI 接线前零文本引用，lint hard fail；task-03 接线后消费方存在，此为过渡期伴随改动） |

> 注：本次为调研设计阶段，上表为落地时预计变更，当前不实际修改。

## 7. 接口定义

```js
// src/docs-check.js 新增导出

/**
 * 将可确定性修复的失效引用写回文档。
 * @param {string} projectRoot
 * @param {Array<{doc: string, docLine: number, ref: string, newRef: string}>} fixes
 * @param {{dryRun?: boolean}} opts
 * @returns {{applied: number, skipped: Array<{ref: string, reason: string}>}}
 */
export function applyFixes(projectRoot, fixes, opts = {}) {}
```

分类标签统一为 `needs-manual`（原 §7 接口注释中 `unfixable` 一词按 plan-review 修正）。数据流：producer = `runDocsCheck` 的 `invalid[].suggest` →（本设计新增）分类为 fixable/needs-manual → consumer = `applyFixes` 按 docLine 定点替换 → 文档落盘。全程内存传递，无 schema/DTO。

## 8. 数据模型

无变更。无新表、无新配置键、无新文件类型。

## 9. 兼容策略

- **未传 `--fix` 时行为与现状完全一致**（flag 缺省即旧路径）；
- 修复只改行号数字，不改引用文件名、不改 token、不动其他行；
- 写文件走普通 `writeFileSync`（文档非多进程竞争的运行时文件，与现有 docs 工具一致）；
- 多命中歧义默认不自动改（fail-safe），保守优先于方便。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | token 在源码多处出现，单引用歧义 | P1 | 多命中默认不自动修；dry-run 预览；`--force` 逃生口默认关闭 |
| R-02 | 纯位置引用（行内无 token）无法定位 | P1 | 明确列为非目标，保持人工修复 |
| R-03 | token 重命名导致 suggest 命中到错误符号 | P2 | 修复后仍要过 npm test 的 doc-ref-check 层 2 校验（窗口断言），错符号会被二次拦截 |
| R-04 | 同一文档行多个失效引用的偏移计算错位 | P1 | 按行内偏移从后往前替换；测试覆盖同行多引用场景 |
| R-05 | Windows CRLF 被破坏 | P1 | 复用 `split(/\r?\n/)` + join 保持原行结束符策略；测试覆盖 CRLF 文档 |

## 11. 决策追踪

| 决策 ID | 类型 | 状态 | 覆盖章节 |
|---|---|---|---|
| D-001@v1 | boundary | accepted | §3 非目标：本次只调研不落地 |
| D-002@v2 | architecture | accepted | §5.1：采用零侵入 --fix 自动重锚，supersedes D-002@v1（源码锚标记） |
| D-003@v2 | architecture | accepted | §5.1：文档保持标准 file:line，无占位符；supersedes D-003@v2-rev1（占位符格式） |
| D-004@v1 | compatibility | accepted | §9：不改动现有 docs-check 校验逻辑与 ratchet 门 |
| D-005@v1 | boundary | accepted | §3：不引入 AST/新依赖（本方案天然满足，正则+token 搜索已在库内） |
| D-006@v1 | boundary | accepted | §3：多命中歧义默认不自动修，保守优先（修订轮新增） |

## 12. 自审（Self-Review）

- ✅ 全部必填章节齐全（背景/目标/非目标/拆分判断/总体方案/文件变更清单/接口定义/数据模型/兼容策略/风险登记/决策追踪/自审）。
- ✅ 不涉及 session/lease/agent_run/daemon/lifecycle 关键词，无需生命周期契约表。
- ✅ 与 revision 1 相比：源码侵入 20-30 处注释 → 0；文档占位符化改造 → 0；新增脚本 200-400 行 → ~100 行 flag 增强；作用范围单文档 → 全部被校验文档。
- ✅ P1 blocker 教训吸收：revision 1 的占位符格式翻车源于「设计了一个新语法再验证兼容性」；本方案不加新语法，直接复用已验证的现有机制（token + suggestLines），无同类风险。
- ⚠️ 自审存疑：`suggestLines` 目前只查 `candidates[0]`（首个候选文件），多候选文件场景（同名文件）下修复可能定位到另一文件的同名符号——落地时 applyFixes 需按 `resolveCandidates` 全量候选校验唯一性，已在 R-01/R-04 中覆盖。
