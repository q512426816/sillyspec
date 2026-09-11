---
author: qinyi
created_at: 2026-09-11T14:35:00+08:00
---

# 设计文档（Design）— 跨变更语义护栏

## 背景

2026-09-11 事故：变更 A（恒读 SQLite，implemented 决策 D-001「文件清理后仍可读库」）交付次日，quick 安全批（变更 B）以「上报文件必须真实存在才能走 SQLite 读取」堵任意路径漏洞——恰好禁掉 A 的核心场景（文件不存在才读库）。B 同时改写 A 的测试断言（「零文件 IO」→「lstat 恰好一次」），测试全绿。

三层防线为何全部漏过：
1. **quick `--done` test 硬门禁**按设计工作——但绿灯是 B 自己重定义的（改断言是唯一逃逸路径，护栏的最高杠杆点在守断言）。
2. **知识库匹配键错了**：完整流程 brainstorm 的 `{DECISION_HITS}` 只注入 **rejected** 决策（防复潮用途，`src/run/prompt.js` DECISION_HITS 分支），implemented 决策不在注入面；execute 的 `{KNOWLEDGE_HIT_REPORT}` 按任务措辞关键词匹配——B 的安全措辞命中不了 A 的恒库决策。这类冲突（「我即将破坏别人绑在某文件上的语义承诺」）唯一可靠的 join key 是 **diff 里的文件路径**，不是新变更的意图词。
3. **quick 无主动消费**：quick prompt 对知识库只有一行被动 `cat INDEX.md` 提示（`src/stages/quick.js`），写了没人读等于没写。

方案取舍见 decisions.md **D-001@v1**（advisory 注入系 vs 硬阻断 vs 全流程 file-keyed 改造；选 A 的理由与复潮条件）。排查决策见 **D-002@v1**（ql-020 关联行为定性 + quick --done 自动归档竞态防护——本变更 tasks.md 的自有未勾选任务行即其防护落地）。生命周期契约：无（本变更不新增/修改任何 lifecycle 事件、守护进程或状态机——只读消费既有状态）。

## 技术方案

### 模块一：决策条目「文件」字段契约（FR-01）

`src/decision-distill.js`：
- `applyField` 增 `case '文件': case 'files': entry.files = parseListValue(value)`（列表语义同 模块域）。
- `FIELD_LABEL_RE` 增 `文件|files`（增量安全：新增字段行消费方各自认标签）。
- `renderBlockLines` 在「锚点：」行后增条件行 `文件：${entry.files.join(', ')}`——**仅 entry.files 非空时渲染**，存量条目零迁移。
- 解析→落库全链路幂等：已有条目重归档时不新增空「文件：」行（render 条件化保证）。
- **分隔符与归一双侧对齐**（Grill X-006）：FR-02 解析侧 split `/[,，、\s]+/`；条目侧与查询侧路径值统一 `replace(/\\/g, '/')` POSIX 归一（Windows agent 手写反斜杠容收）。

### 模块二：文件键决策反查（FR-02）

`src/knowledge-match.js`：
- `parseDecisionFile` 的 `DECISION_FIELD_RE` 增 `文件` 标签 → `cur.files`；条目无 `文件` 时从 `锚点：` 值提取路径形态 token（正则 `[\w./-]+\.(js|ts|mjs|cjs|jsx|tsx|py|go|java|rs)`，剥 `:line` 后缀）作兜底命中源。
- **锚点行解析约束**（Grill X-002）：`锚点：` 用单独标签精确匹配读入（仿 docs-check.js:940 先例），**不并入 DECISION_FIELD_RE 的 reason 回填链**——该链 `else if (!cur.reason)` 在锚点行先于理由行出现时会把锚点值误吞进 reason（隐性回归）；测试加「reason 不被锚点污染」反例。
- 新导出 `matchDecisionsByFiles(indexDir, files)`：输入仓库根相对 POSIX 路径数组，输出 `{ file → [{id,title,status,reason,decisionFile}] }`；发现口径复用 `parseDecisionEntries`（INDEX Decisions 段路由）；无 decisions 库 → `{}`。

### 模块三：semantic-guard 聚合模块（新文件 `src/semantic-guard.js`）

无副作用纯函数 + git 只读查询，被 prompt/quick-audit 两端消费：
- `collectRecentForeignDelivery({cwd, files, currentChange, days=7})`：每文件 `git log --since=<days>.days --format=%s -- <file>`，提交信息解析变更名标记（`/\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*/` 与 `/ql-\d{8}-\d{3}-[a-z0-9]{4}/`），最新非本变更标记 → `{file → changeName}`；无标记/仅本变更 → 不记。封顶 20 文件，git 失败 → `{}`。
- `renderSemanticGuardBlock({specBase, cwd, candidateFiles, currentChange})`：组合 FR-02 决策命中 + 交付归因 → advisory 文本（决策段 + 交付段）；零命中 → 空串。
- `detectAssertionRewrites({cwd, files})`：对测试文件（`test/` 前缀或 `*.test.*`/`*_test.*` 命名）跑 `git diff HEAD -U0 -- <file>`——**HEAD 对比而非 index**（Grill X-001：quick step3 契约要求 agent 先 git 暂存，worktree-vs-index 的裸 `git diff` 在标准时序下恒空转），hunk 中**删除或变更侧**断言行（token 启发式：`expect(`、`assert`、`t.equal`、`toBe`、`toEqual`、`strictEqual`、`should.`）计数；纯新增 hunk（无 `-` 行）不算。输出 `{file → sampleLines[]}`，封顶 5 行/文件。
- `readSemanticGuardEnabled(specBase)`：读 `semantic_guard.enabled`，默认 true，读取失败 → true（fail-open，advisory 误开无害）。

### 模块四：quick 进场注入（FR-03，挂载点 `src/run/prompt.js`）

quick step1 prompt 已有 CLI 代读注入先例（项目上下文摘要，prompt.js quick step1 分支）——同分支尾部追加：**入口首行 `readSemanticGuardEnabled`，false → 直接零输出（不采候选文件、不跑反查，开关语义全停非半停，Grill X-012）**。候选文件 = 会话 --files（guard.allowedFiles 可得时）+ `git status --porcelain` 脏文件（**复用 parsePorcelainPath 同款解析口径：引号剥离/`->` rename/反斜杠归一，Grill X-013**），去重封顶 20 → `renderSemanticGuardBlock` → 非空时插到 step1 prompt 末尾。注入判定独立按 quick step1 分支口径，**不与 `{QUICK_CONTEXT_DIGEST}` 占位符存在性耦合**（模板去占位符时护栏静默失效）。失败单行说明。**不改 `src/stages/quick.js` 模板**（注入点在渲染层，模板零变更）。

### 模块五：quick --done 断言 WARNING（FR-04，挂载点 `src/run/quick-audit.js`）

`runQuickTestLintGate` 已在 `--done` 收尾被调用且携 changedFiles/declaredFiles——**在函数内部**（file 清单确定后、返回前）追加：
0. **入口先查 `readSemanticGuardEnabled`，false → 跳过检测**（test/lint 实测门行为不变，开关只管语义护栏自身，Grill X-012）；断言检测对**主仓 cwd** 执行而非 gateCwd 隔离快照——检测对象是本会话工作树改动，快照语义是 test/lint 实测隔离，两者不同层（Grill X-001 附注）。
1. `detectAssertionRewrites` 找断言变更文件集；
2. 与 `collectRecentForeignDelivery` 交集；
3. 交集非空 → gate 返回对象增 `semanticGuard: { hits }` 字段；
4. `printQuickTestLintGate`（渲染函数，同文件）末尾输出 ⚠️ 点名段。
- 早退路径兼容：`SILLYSPEC_QUICK_TEST_GATE=skip` / 无文件 / 纯 doc 改动 → 不跑检测（语义一致：整个审计面停）。
- 调用方（complete-handlers.js，并行会话正在改）**零改动**——返回对象新增字段对调用方是增量安全。

### 模块六：配置（FR-05，`src/config-schema.js`）

新段 `semantic_guard`（`enabled` boolean，optional，默认 true），登记 readers/desc/example，与 friction_hint 同款模板。

## 文件变更清单

| 文件 | 动作 | 要点 |
|---|---|---|
| src/decision-distill.js | 改 | 文件字段契约（解析+渲染，条件化） |
| src/knowledge-match.js | 改 | parseDecisionFile 增文件/锚点路径提取；新 matchDecisionsByFiles |
| NEW:src/semantic-guard.js | 新 | 归因/断言检测/advisory 渲染/开关读取 |
| src/run/prompt.js | 改 | quick step1 注入（渲染层，模板不动） |
| src/run/quick-audit.js | 改 | gate 内断言检测 + 渲染点名 |
| src/config-schema.js | 改 | semantic_guard 段登记 |
| NEW:test/semantic-guard.test.mjs | 新 | 归因解析/断言检测/渲染/开关单测（task-03/06） |
| NEW:test/semantic-guard-prompt-inject.test.mjs | 新 | quick step1 注入单测（task-05，与 task-03/06 隔离——同 Wave 并行不共享文件） |
| NEW:test/decision-file-field.test.mjs | 新 | 文件字段契约 + matchDecisionsByFiles 集成 |

**明确不改**（并行会话在改，提交夹带风险）：src/run/command.js、src/run/complete.js、src/run/complete-handlers.js、src/run/shared.js、src/scope-audit.js、src/stages/brainstorm.js、src/index.js、test/scope-audit.test.mjs。src/stages/quick.js 同样零改动——模板不动，注入在渲染层（D-001@v1 影响清单中的 quick.js 是消费面非改动面，Grill X-008）。

## 测试策略

- 单测先行（AGENTS 规则 5）：两份新测试文件覆盖 FR-01/02 契约与 FR-03/04 核心逻辑（git 交互用真实临时仓 fixture——本仓测试已有 git 临时仓先例）。
- 断言检测用例必须含反例：纯新增断言不算、非测试文件不查、无标记不点名、**reason 不被锚点值污染**（Grill X-002）、**开关 false 时注入与检测双停**（Grill X-012）、**暂存后（git add）检测仍生效**（git diff HEAD 口径，Grill X-001）。
- 存量兼容：无「文件：」字段的既有条目渲染后不变形（字节级对照）；锚点路径提取对 D-905 形态（`src/quicklog.js:493`）生效。
- 回归：全量 `npm test` + `npm run lint`（verify 阶段实测）。

## 风险与缓解

- **断言 token 启发式误报**（格式化触碰断言行）→ WARNING 非阻断 + 文案给解法；advisory 实测误报率后可升 block（D-001@v1 复潮条件）。
- **git log 性能**（每文件一次调用）→ 封顶 20 文件 + `--since` 限窗 + 失败静默。
- **提交夹带**：模块文档更新（.changelog.md 若并行会话仍持有未提交改动）延后到对方落盘后再补，或在 commit 时核对暂存面（AGENTS 规则 18）。

## 自审（Self-Review）

- **YAGNI 复查**：三模块是否都必要？模块一（数据契约）是模块二的依赖（没有文件键，反查只能靠锚点兜底一段活的），模块二是模块三/四的引擎，模块五是消费端——链路上无孤立件。断言 token 启发式表收窄到高频形态（expect/assert/t.equal 族），避免维护长尾。
- **最大风险自查**：`runQuickTestLintGate` 内追加检测会延长 --done 路径（多 N 次 git diff 调用）——已用封顶+fail-soft 限制；quick step1 注入发生在每次 quick 启动——候选文件封顶 20 + git 失败静默，最坏退化即现状（无注入）。
- **并行会话冲突面复核**：六个文件挂载点中 decision-distill.js 与 ql-020（标题变体修复）同文件不同区域（它动 IMPLEMENTED_TYPES/标题正则，我动 applyField/renderBlockLines）；其余五个文件无并行脏改。提交时 decision-distill.js 须核对暂存 hunk 只含本变更（或等 ql-020 先落盘）。
- **反例覆盖自查**：断言检测的三类反例（纯新增断言/非测试文件/无归因标记）与存量兼容反例（无文件字段条目字节级不变形）均已列入测试策略；quick-audit 既有调用方对返回对象新增字段的兼容性（结构增量安全）依赖 JS 解构缺省——确认 complete-handlers.js 只读固定字段，不遍历。
- **决策一致性**：D-001@v1 复潮条件（advisory→block 升级）依赖误报率实证，本设计在 WARNING 文案中内置「解法出口」（写 quicklog --solution / 复查决策），为后续数据回收留钩子；D-002@v1 防护已由 tasks.md 自有任务行落地，闸门热修明确让位并行会话。
