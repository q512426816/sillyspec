---
author: qinyi
created_at: 2026-08-14 21:34:04
scale: small
---

# Design — 文档行号引用校验脚本（doc-ref-check）

## 总体设计

单文件 `test/doc-ref-check.test.mjs`，纯 Node 内置模块（fs/path），无新依赖。结构：

```
DOCS = ['docs/sillyspec/platform-interface-map.md']   // 白名单（后续渐进加）
main():
  1. extractRefs(md) → [{docLine, file, start, end, ctx}]
  2. resolvePath(file) → 绝对路径 | null
  3. 对每个 ref 跑两层断言 → failures[]
  4. failures 非空 → 逐条 console.error + exit 1；否则打印 ✅ 统计
```

## 接口定义

### 提取正则
```js
/([A-Za-z0-9_.\-\/]+\.(?:js|mjs)):(\d+)(?:-(\d+))?/g
```
- 匹配 `src/sync.js:557`、`sync.js:557`、`complete-handlers.js:985-1102`、`_verify.mjs` 同理
- 排除 code fence 内的 URL（如 `https://...:8080`）——正则要求以 `.`+扩展名结尾的路径形态，URL 不命中（`example.com:8080` 无 .js 后缀）

### 路径解析（resolvePath）
1. 引用含 `/`（如 `src/sync.js`、`backends/sillyhub-mcp.js`）：按仓库根直拼（兼容 `src/`、`test/`、`docs/` 全相对路径）。
2. 裸文件名（`sync.js:557`）：`src/` 递归收集同名文件得候选集：
   - **单候选** → 用之
   - **多候选**（实证存在：`shared.js` 在 `src/run/` 与 `src/progress/` 各一，文档 8+ 处裸引用）→ **逐候选跑层 1+层 2 全部断言，任一候选全过即通过**；全部失败 → fail（输出各候选的失败原因）。宽容策略：现有文档无需批量改写，检测力不损失（真漂移时两候选都对不上）。
   - 0 候选 → fail（文件不存在）。

### 断言层
**层 1 存在性（所有引用）**：
- `existsSync(file)` 为假 → `文件不存在`
- `start >= 1 && start <= totalLines`；范围引用再查 `end <= totalLines` → 否则 `行号超界`

**层 2 关键词断言（条件触发）**：
- 取引用**所在文档行内**所有反引号 token（同行策略，防表格相邻单元格污染；归一：剥函数括号、点分名拆段），过滤「像代码符号」：`/^[A-Za-z_$][A-Za-z0-9_$.]*$/` 且（含大写字母/下划线/点/`$` 之一）——camelCase / PascalCase / SNAKE_CASE / 点分名。纯小写英文单词（`local`、`platform`、`abort`）跳过
- 断言：源文件 `[start-1, end+5]` 行窗口内含**任一** token（子串）。窗口从初始 ±1 放宽到 +5——实现期实证文档行号常指向函数/块起始行而 token 在块体内几行后（`shared.js:331`→triggerSync 在 333）；+5 覆盖函数头+体首几行，真漂移（大段移动）仍全 token miss
- 失败 → `关键词缺失：期望任一「tokenA / tokenB」在窗口内`（附实际行内容首 80 字符，便于修文档）

### 输出与退出码
- 全过：`✅ doc-ref-check: N 处引用全通过（M 处带关键词断言）`
- 有失败：逐条 `❌ [文档:L<docLine>] <ref> → <原因>`；末尾统计；`process.exit(1)`

## 数据流

```
docs/sillyspec/platform-interface-map.md
  → 提取 60+ refs（含 docLine 定位）
  → resolvePath（仓库根/裸名 src/ 递归定位）
  → 层1: existsSync + 行号边界   → 层2: 反引号 token 代码符号判定 + ±1 行子串断言
  → failures[] → console + exit code
```

## 生命周期契约

不适用 lifecycle contract（纯静态文件校验工具，不涉及 session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat——无任何运行时状态、无事件、无接收方）。

## 文件变更清单（File Changes）

| 文件 | 操作 | 说明 |
|---|---|---|
| `test/doc-ref-check.test.mjs` | 新增 | 唯一实现文件：提取 + 两层断言 + 输出 |
| `docs/sillyspec/platform-interface-map.md` | 可能微调 | 首跑若发现裸文件名歧义/关键词误报，修正引用写法（属文档勘误非功能改动） |

不改动：package.json（.test.mjs 自动收集）、run-tests.mjs、_verify.mjs。

## 风险登记（Risk）

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 反引号 token 误判为代码符号（如 `local` 判为符号）→ 误报 | 中 | 测试红灯阻断 | token 判定含大写/下划线/点/$ 硬条件；纯小写跳过；首跑全绿为验收门 |
| 裸文件名在 src/ 撞名（shared.js 双命中实证存在）→ 逐候选校验后仍全失败 | 低 | 红灯提示 | 多候选任一全过即通过（宽容策略，Grill 修正）；全失败时输出各候选原因便于定位 |
| 文档引用非源码文件（如 docs/prompt/_extract.mjs）路径解析失败 | 低 | 误报 | resolvePath 候选目录含 docs/；仍失败则 fail 暴露（文档该写清路径） |
| 行号合法漂移（源码正常重构）→ 红灯需要人修文档 | 确定 | 维护成本 | 这是特性非缺陷：强制文档与源码同步；修文档即对（quick 可收尾） |
| 并行 agent 改源码导致本测试 flaky | 低 | 假阳性 | 校验只读文件无状态；漂移是真漂移（该修文档） |

## 自审（Self-Review）

1. **方案 A 是否够**：单文件 ~150 行覆盖提取/断言/输出，无模块化必要；演进路径（抽 resolvePath 到共享模块）已留但本次不做（YAGNI）。
2. **误报控制**：层 2 仅在「token 像代码符号」时触发，跳过自然语言；±1 行窗口容忍相邻行小漂移；这两点是误报/漏报的平衡点。窗口再大（±3）会漏报真漂移，再小（同行）会因格式化误报。
3. **漏报边界**：纯位置引用（无反引号 token）只做存在性——接受，文档改写时逐步补关键词。
4. **检测力验证**：成功标准 2（人为 +10 行号变红）是验收必测项，防「全绿但什么都没查」的假阴性。
5. **与并行改动冲突**：另一 agent 在改 `src/sillyhub-mcp/client.js` + `bin/sillyspec.js`；本变更只新增 test 文件，文件级无交集；若对方改动了 platform-interface-map.md 引用的行号（MCP 握手修复动 client.js），首跑可能真红——那正是工具该报的，修文档即可。
