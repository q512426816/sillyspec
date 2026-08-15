---
author: qinyi
created_at: 2026-08-15 16:05:00
updated_at: 2026-08-15 16:05:00
change: 2026-08-15-docs-check-productize
scale: medium
---

# 设计文档：sillyspec docs check——文档引用校验产品化

## 自审（Self-Review）

机械完整性：章节齐全（目标/现状差距/接口设计/配置/dogfood 迁移/文件清单/决策记录 8 条/生命周期契约/验收标准 6 条）；FR 与 D 决策双向闭环（requirements.md 映射）。Design Grill 两轮：第一轮 fail 3 blocker 已全部修正（D-005~D-008），复审 pass。遗留非阻断项：无。

> 来源：docs/sillyspec/doc-consistency-debt.md D-6。用户裁决（2026-08-15）：排进完整流程。
> 方案 A（独立子命令）已选定，brainstorm step4 trade-off 见 quicklog。

## 1. 目标

把 dogfood 仓私有测试 `test/doc-ref-check.test.mjs`（校验 `docs/sillyspec/platform-interface-map.md` 内 file:line 引用有效性）提升为用户项目可用的 CLI 能力：`sillyspec docs check`。

**不做的**：语义校验（引用内容是否相关）——纯确定性存在性校验，符合「确定的事留 SillySpec」定位。

## 2. 现状与差距

| 维度 | 现状（dogfood 私有） | 目标（产品化） |
|---|---|---|
| 校验逻辑 | test/doc-ref-check.test.mjs 内联 | src/docs-check.js 独立模块 |
| 覆盖文档 | 白名单硬编码 1 份（platform-interface-map.md） | local.yaml 可配 + 缺省 docs/**/*.md |
| 调用方式 | npm test 内 | `sillyspec docs check` 独立命令（可进 CI） |
| 输出 | assert 失败 | 人读清单 + --json + exit code |

## 3. 接口设计

### 3.1 CLI

```
sillyspec docs check [--paths <glob,...>] [--json]
```

- `--paths`：覆盖 local.yaml `docs-check.paths`（缺省 `docs/**/*.md`）
- `--json`：结构化输出 `{ ok, total, invalid: [{doc, ref, file, line, reason}], warnings }`
- exit code：0 = 全部有效；1 = 存在无效引用（invalid 非空）；2 = 配置/IO 错误。warnings 不影响 exit code。

### 3.2 模块（src/docs-check.js）

```js
// 纯函数（无 fs 依赖，测试友好）
collectDocRefs(markdownContent) → [{ ref, line, file, fileLine }]   // 全文扫描（见 D-006：不做代码块排除）
validateRefLine(totalLines, refLine) → { ok, reason }               // 行号 ≤ 总行数

// IO 入口（projectRoot 锚定，projectRoot 缺省 = cwd）
runDocsCheck({ projectRoot, paths }) → { ok, total, invalid, warnings }
```

**两层校验全部保留**（Grill B2 裁决：不降级检测力）：
- 层1 存在性：引用的文件存在 + 行号 ≤ 总行数 + **候选解析**（仓库根相对 → `src/` 前缀重试 → 裸文件名 src/ 全树递归），与现测试同口径整体迁移。
- 层2 关键词断言：`looksLikeCodeSymbol` + ±5 行窗口 + 多 token 多候选宽容，同样整体迁移为可配置项 `docs-check.keywordAssert: true`（缺省开启；用户项目可关，关闭时 warnings 提示「关键词断言已关闭」）。

### 3.3 配置（config-schema.js）

```yaml
docs-check:
  paths:              # 缺省 ['docs/**/*.md']
    - docs/**/*.md
  skip: []            # 排除 glob
  keywordAssert: true # 层2 关键词断言（缺省开）
```

平台模式（specRoot 外部）：glob 相对 **projectRoot**（= cwd，源码仓根）展开，而非 specRoot——文档引用的是源码 file:line，锚点必须是源码仓；`.sillyspec/docs/<project>/` 模块卡不在缺省扫描范围（由 modules 子命令管，D-002）。local.yaml 仍从 specDir 读（与现有 commands.* 同路径，无新规则）。

### 3.4 glob 展开（Grill 发现：仓库零 glob 依赖）

不引新依赖：`docs/**/*.md` 只需 `**` + `*.md` 两形态，手写递归 walker（readdirSync 递归 + 后缀过滤 + skip 排除），约 30 行，Windows 路径分隔符归一化（`\` → `/`）后匹配。非通配路径直传。复杂 glob 报 exit 2 提示「当前仅支持 ** 与 * 前缀形态」。

## 4. dogfood 迁移

`test/doc-ref-check.test.mjs` 改为：调 `runDocsCheck({ projectRoot: repoRoot })`（两层校验全开）。**检测力不降级**（Grill B2）：层1 + 层2 关键词断言全部保留，dogfood 继续全开跑（keywordAssert 缺省 true）。真实生效配置走本仓 `.sillyspec/local.yaml`（gitignored）；`local.yaml.example` 同步加 docs-check 段作展示（Grill 发现：config-schema 的 renderExample() 有「live 键必出现于 example 文本」耦合测试，新增配置段须同步 renderExample 否则 npm test 红）。

## 5. 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新增 | src/docs-check.js | 校验核心（纯函数 + IO 入口） |
| 修改 | src/index.js | 注册 `docs` 命令组（`docs check`） |
| 修改 | src/config-schema.js | docs-check 配置键 |
| 新增 | test/docs-check.test.mjs | 纯函数单测 + CLI 冒烟 |
| 修改 | test/doc-ref-check.test.mjs | 迁移调用 runDocsCheck |
| 修改 | docs/sillyspec/file-lifecycle.md | 新命令生命周期 |
| 修改 | docs/sillyspec/interface-contract.md | CLI 接口契约 |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号连带漂移修正（CLI 注册新增代码行致 index.js 引用行号漂移，由 docs check 自检发现——Reverse Sync 实现期补充） |
| 修改 | docs/sillyspec/doc-consistency-debt.md | D-6 销账 |
| 修改 | .claude/skills/（如涉及 SKILL 描述） | 新命令可用性 |

## 6. 决策记录

- **D-001 独立命令而非 doctor/verify 集成**：用户项目随时可跑 + 可进 CI；doctor 是交互自检非门禁、verify 漏 quick 流量（72% 流量走 quick，只挂 verify 违背 D-6 初衷）。
- **D-002 缺省扫 docs/**/*.md**：多数项目文档在根 docs/；.sillyspec/docs/ 模块卡由 modules 子命令管，不重复扫。
- **D-003 exit code 三档**：0/1/2 区分「无效引用」与「配置错误」，CI 可区分处理。warnings 不影响 exit code（欠账显性化哲学，同 D-8）。
- **D-004 不做语义校验**：定位边界——存在性是确定性的，相关性是软判定推 sillyhub/人类。
- **D-005 --strict 已删（Grill B1）**：CLI 面最小化；关键词断言开关走配置不走 flag。
- **D-006 不做代码块排除（Grill B3 修正）**：现测试 REF_RE 本就全文扫描、无代码块排除逻辑——「沿用现有口径」= 继续全文扫描。若未来误报多，加排除是独立小改进。
- **D-007 两层校验全保留（Grill B2）**：层1 存在性 + 候选解析、层2 关键词断言（looksLikeCodeSymbol/±5 行窗口/多 token 宽容）整体迁移；层2 可经 keywordAssert 配置关（用户项目选配），dogfood 全开不断言降级。
- **D-008 glob 手写不引依赖（Grill）**：仅支持 `**` 与 `*` 两形态 + 字面路径，复杂 glob exit 2 显式报错。

## 7. 生命周期契约（lifecycle contract）

| 文件 | 产生 | 消费 | 生命周期事件 |
|---|---|---|---|
| src/docs-check.js | 本变更 execute 新增 | CLI docs check / dogfood 测试 / 用户项目 CI | 新增运行时模块；后续修改属普通代码变更，无迁移 |
| local.yaml docs-check 段 | init/config-schema renderExample | runDocsCheck 读取 | 新增配置键；缺省值向后兼容（无配置 = docs/**/*.md） |
| test/doc-ref-check.test.mjs | 本变更 execute 改写（迁移） | npm test | 从私有测试迁移为 runDocsCheck 调用方，断言面不变 |

## 8. 验收标准

- FR-001 `sillyspec docs check` 在本仓跑通，platform-interface-map.md 等文档全绿
- FR-002 人为注入非法引用（file 不存在 / 行号超界）→ 报告 + exit 1
- FR-003 `--json` 输出结构化结果
- FR-004 local.yaml docs-check.paths 缺省与覆盖行为符合 3.3；平台模式 glob 锚 projectRoot
- FR-005 dogfood 测试迁移后 npm test 全绿且**两层校验全开**（检测力不降级，Grill B2）
- FR-006 纯函数单测覆盖：引用提取（全文扫描口径）、行号校验边界、候选解析三段回退、glob walker（**/* 形态/skip 排除/复杂 glob exit 2）

## 9. 风险登记（Risk）

| 风险 | 概率 | 缓解 |
|---|---|---|
| 全文扫描误报（正文示例路径恰好撞真实文件名） | 低 | 层2 关键词断言宽容（±5 行窗口 + 多 token 多候选）；keywordAssert 可关；advisory 定位不阻断流程 |
| 手写 glob walker 边界 bug（深层目录/符号链接环） | 低 | 限定 **/* 两形态 + maxDepth 兜底；复杂 glob exit 2 显式拒绝；FR-006 单测覆盖 |
| 现有 doc-ref-check 测试迁移后检测力回归 | 中 | FR-005 明确两层全开；迁移 PR 内 diff 对照新旧输出 |
| renderExample 耦合测试红（新配置段漏同步） | 中 | task-03 显式包含 renderExample 同步；npm test 即红即修 |
