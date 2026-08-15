---
author: qinyi
created_at: 2026-08-15 21:00:00
updated_at: 2026-08-15 21:00:00
change: 2026-08-15-docs-debt-inject
scale: medium
risk_level: low
---

# 设计文档：execute Wave 级模块文档欠账事实注入（[docs-debt]）

## 自审（Self-Review）

章节齐全（目标/前置问题/接口/决策/风险/生命周期契约/验收/文件清单）；Grill 待跑；FR 与文件清单对齐；scale=medium（1 新模块 + 2 修改 + 1 测试）。

## 1. 目标

落地债单第六节愿景核心拼图：execute 各 Wave 时，CLI 用 git 事实算出「本变更触及模块的文档欠账」一屏注入 Wave prompt——agent 拿到事实自己改，不是劝说（第六节试金石：改动落点在 `src/` 计算逻辑，prompt 侧只留一个占位符）。

## 2. 前置问题（必须一并修）

| # | 问题 | 证据 | 修法 |
|---|---|---|---|
| P1 | `parseModuleMapSimple` 在 CRLF 行尾 map 上整体解析为空（`/^  ([a-zA-Z0-9_-]+):$/` 不容 `\r`） | 本仓 `_module-map.yaml` 即 CRLF（cat -A `^M$`），loadModuleContextIndex 返回 `{}` | 解析前归一化 `\r\n`→`\n`（该函数是纯函数，入口一行归一） |
| P2 | 本仓 map schema_version=1 无 `paths` 字段，模块→文件归属缺失 | map 第 42 行注释自认"待升级补录" | 归属计算三级退路：map paths → 模块卡 doc 内文件路径引用（契约摘要本就含 file 引用）→ 算不出输出单行事实"归属数据缺失，跑 modules rebuild" |

## 3. 接口设计

### 3.1 模块（src/docs-debt.js）

```js
// 纯函数
matchFilesToModules(changedFiles, moduleIndex, { cardsDir }) → Map<moduleId, { doc, files }>
  // 归属三级（Grill B3 修订）：module.paths || module.core_files（读端既定口径，prompt.js:80/101 同款）
  //   → 模块卡 doc 内容中的文件路径字面量命中 → 未匹配文件归 unmapped

// IO 入口（全降级不抛）
computeDocsDebt({ projectRoot, specBase, projectName, changedFiles }) → {
  ok: boolean,               // false = 归属数据缺失（map 不存在/解析空），此时 facts 为单行说明
  facts: string,             // 注入文本（无债 = 空字符串，调用方据此零输出）
  entries: [ { module, doc, files: string[], srcLastCommit: string, docLastCommit: string, behind: number } ]
}
// behind 口径（Grill B4 修订，算法二选一定死）：每模块两次 git log -1 --format="%h %ct" 取时间戳，
// srcLast.ct > docLast.ct 即欠账，behind = rev-list --count docCommit..srcCommit（仅当两者都存在）；
// doc 文件 untracked（从未 commit）→ behind = null，事实行写"卡片从未提交"（欠账更重的显式形态）；
// 任一 git 调用失败/超时（5s）→ 该模块 behind = null + 降级注记，不抛
```

### 3.2 注入点（Grill B1 修订：走 outputStep 占位符链，非 buildWavePrompt）

与既有动态注入（`{KNOWLEDGE_HIT_REPORT}`/`{REVIEW_TIER}`）同范式：execute.js Wave prompt 模板尾部加 `{DOCS_DEBT}` 占位符，`src/run/prompt.js` outputStep 在 stageName==='execute' 且 promptText 含占位符时调 computeDocsDebt 替换——specBase/platformOpts 三态由 outputStep 现有上下文解析（resolvePromptSpecBase），不穿 buildExecuteSteps 透传链。Wave prompt 逐字节不变。

注入文案（Grill B2 修订：范围=变更起点累计，非 Wave 增量）：

```
[docs-debt] 本变更已触及以下模块（CLI 算，worktree diff × _module-map.yaml，累计）：
  - stages：源码 3 commit 未同步卡（卡停 a1b2c3d，源码到 e4f5g6h）
    涉及文件：src/stages/execute.js
```

**changedFiles 来源**：execute worktree（`meta.json` 所在 worktree 根）`git status --porcelain + git diff --name-only <baselineCommit>..HEAD` 并集——含已 commit 与未 commit 改动（Grill B2：git log 看不到未 commit 改动，故 behind 口径下移到 3.1 双 commit 对账只用已 commit 历史判"卡落后"，而"本变更触及"用 status+diff 全量事实）。worktree 不可得（in-place 模式）时退 cwd。

### 3.3 无债零输出

`facts === ''` 时 Wave prompt 不变——第六节"无文档债时零输出"承诺。

## 4. 决策记录

- **D-001 Wave 渲染时算变更起点累计 diff**（方案 A + Grill B2 修订）：diff 是唯一确定事实源；范围=baselineCommit..HEAD + 未提交并集（worktree 锚），文案"本变更已触及（累计）"；plan 预估违背"算事实"（B 否决）；verify 阻断违背 advisory 定位（C 否决，D-8 同理）。
- **D-002 P1 CRLF 修复并入本变更**：归属计算依赖 map 解析，不修则本变更在本仓空转。行为扩散（模块注入激活）见风险表第 4 行。
- **D-003 归属三级退路**：`paths || core_files`（读端既定口径，Grill B3）→ 卡片 doc 文件引用（v1 兼容）→ 单行缺失事实。不做"必须先升级 v2"硬依赖（存量项目零迁移成本）。
- **D-004 新鲜度口径 = 双 commit 时间戳 + rev-list 计数**（Grill B4 修订）：`git log -1 --format="%h %ct"` 两次取时间戳判欠账方向，behind 用 `rev-list --count doc..src`；untracked 卡片 → behind=null 显式"卡片从未提交"；git 失败/超时降级不抛。不用 mtime（checkout 污染）。
- **D-005 advisory 不阻断**：注入事实，不设 gate（第六节定位；硬门已有 D-1/D-5 死信探针兜底真实性）。
- **D-006 注入走 outputStep 占位符链**（Grill B1 修订）：`{DOCS_DEBT}` 与 `{KNOWLEDGE_HIT_REPORT}` 同范式，specBase 三态由 outputStep 现有上下文解析；不改 buildWavePrompt 签名。

## 5. 风险登记（Risk）

| 风险 | 概率 | 缓解 |
|---|---|---|
| 卡片 doc 文件引用粗归属误配（卡片引用了别模块文件） | 中 | 字面量命中要求路径精确子串；误配只产生多余提示行，advisory 容忍 |
| 大仓 git log 每模块一次的性能（模块数 × 2 次 git 调用） | 低 | Wave 渲染频率低（每 Wave 一次）；超时 5s/次降级单行事实 |
| CRLF 归一化改变 parseModuleMapSimple 既有调用方行为 | 低 | 纯文本行级归一，无语义变化；既有测试全量跑 |
| **CRLF 修复激活本仓全部模块上下文注入**（Grill B5：现状 `{}` 静默跳过 → 修复后 brainstorm/plan/execute 每步 prompt 头部新增模块注入块——用户可感知的行为扩散） | 高（必然发生） | 这是修复的本意（注入本该工作）；file-lifecycle.md 行为说明同步；若注入过长由 buildModuleContextInjection 自身的精简逻辑控制 |

## 6. 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新增 | src/docs-debt.js | matchFilesToModules + computeDocsDebt |
| 修改 | src/modules.js | parseModuleMapSimple 入口 CRLF 归一（P1） |
| 修改 | src/stages/execute.js | Wave prompt 模板加 `{DOCS_DEBT}` 占位符（仅模板，逻辑在 prompt.js） |
| 修改 | src/run/prompt.js | outputStep 加 `{DOCS_DEBT}` 替换分支（Grill B1：占位符链注入） |
| 新增 | test/docs-debt.test.mjs | 归属三级/欠账口径/零输出/CRLF/降级 |
| 修改 | docs/sillyspec/file-lifecycle.md | execute 行 + 注入说明 + CRLF 行为扩散说明 |
| 修改 | docs/sillyspec/doc-consistency-debt.md | 第六节愿景拼图登记 |
| 修改 | docs/sillyspec/platform-interface-map.md | execute.js 行号连带漂移修正（docs check 自检发现，Reverse Sync 实现期补充） |
| 修改 | docs/prompt/_extracted.json | 镜像重跑（execute prompt 占位符变动） |

## 7. 生命周期契约（lifecycle contract）

| 文件 | 产生 | 消费 | 生命周期事件 |
|---|---|---|---|
| src/docs-debt.js | 本变更 execute 新增 | execute.js Wave prompt 渲染 | 新增运行时信号源；advisory 无 gate |
| parseModuleMapSimple 行为 | 本变更修改（CRLF 归一） | prompt.js loadModuleContextIndex / modules.js status | 行为修复非破坏（原 CRLF 输入下本就解析空） |

## 8. 验收标准

- FR-001 computeDocsDebt 在含 paths/core_files 的 map fixture 上正确归属 + 算出 behind
- FR-002 v1 无 paths map 退路（卡片引用粗归属）工作；全缺失输出单行事实不抛
- FR-003 CRLF map 解析修复后 loadModuleContextIndex 返回非空（本仓实测）
- FR-004 Wave prompt 注入：有债出现 [docs-debt] 块；无债 `{DOCS_DEBT}` 替换为空且 prompt 无残留占位符
- FR-005 npm test 全量绿 + lint 过
- FR-006 单测覆盖：归属三级（含 core_files）/双 commit 口径/untracked 卡片/零输出/CRLF/超时降级
- FR-007 changedFiles 口径：worktree baselineCommit..HEAD + 未提交并集；in-place 退 cwd（集成测试或实测）
