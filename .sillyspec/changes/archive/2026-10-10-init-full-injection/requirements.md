---
author: flow-machine-draft
created_at: 2026-10-10T01:32:29.576Z
---
# 需求规格（Requirements）— 2026-10-10-init-full-injection

## 功能需求

### FR-01: AGENTS.md 已存在（无标记）时，追加的受管块内容为完整模板全文（用户原文字节保留在块外）

- init 注入 AGENTS.md 时**必须**不分状态写入完整指引模板（templates/agents-instruction.md 全文）：文件已存在且无 SillySpec 标记时，只允许在文末追加带版本块标记的完整受管段，**禁止**再注入任何缩水小段，块外用户原文字节必须原样保留。

#### 场景：主路径

Given 项目根已有用户自有 AGENTS.md（无 `<!-- SillySpec v` 标记）/ When 执行 sillyspec init（含 --tool codex/claude/zcode）/ Then 文件末尾追加 `START...END` 受管块且块内容为完整模板全文（含选道表与核心规则），用户原文在前且字节不变；同版本重跑必须跳过不写文件（幂等）。

### FR-02: gemini/opencode（GEMINI.md / INSTRUCTIONS.md）同样注入完整指引，版本标记幂等（同版本跳过、异版本刷新块）

- `injectInstructions`（GEMINI.md / INSTRUCTIONS.md）**必须**与 AGENTS.md 走同一全量注入器注入完整模板全文，幂等检测**必须**使用 `<!-- SillySpec v` 版本标记（同版本跳过、异版本刷新受管块），**禁止**再用 `## SillySpec` 文本标题判幂等（完整模板不含该标题，用标题判会重复追加）。

#### 场景：主路径

Given 用户自有 GEMINI.md / INSTRUCTIONS.md（无标记）/ When init --tool gemini / opencode / Then 文末追加完整受管段、原文保留；同版本重跑内容与 mtime 均不变。

### FR-03: codex/gemini/opencode 老安装的旧 ## SillySpec 小段重跑 init 时迁移为完整受管段，不双段

- 指引文件含 v≤3.32.3 旧 `## SillySpec` 小段（无论追加在用户内容后还是整文件即小段）时，init **必须**先截除旧段再追加完整受管段（精确匹配优先，编辑过/CRLF 漂移回退按标题截除），**禁止**出现双 SillySpec 段。

#### 场景：主路径

Given AGENTS.md/GEMINI.md 为 v≤3.32.3 老安装产物（含旧小段）/ When 重跑 init / Then 旧段被截除、恰有一个完整受管段；整文件即旧小段时截除后不得残留空壳（文件起始即受管块）。

### FR-04: INJECTION_CONTENT 常量删除（旧文本仅保留于旧段迁移函数内作精确匹配用）

- `INJECTION_CONTENT` 常量**必须**从 src/init.js 删除，不得再作为任何注入源；旧小段文本**可以**仅以迁移匹配文本的形式保留在旧段截除函数内。

#### 场景：主路径

Given src/init.js / Then 全文无 INJECTION_CONTENT 引用；注入内容唯一来源为 templates/agents-instruction.md。

### FR-05: package.json 版本 bump：已装仓重跑 init 经版本差触发受管段升级为完整内容（2026-09-25-thin-release-pack 实证教训：只改模板不升版本=传播零效果）

- 本次注入行为变更**必须**伴随 package.json 版本号提升（3.32.3→3.32.4）：已装仓重跑 init 时靠版本差触发追加态受管块整块刷新为完整内容，不升版本则同版本跳过、传播零效果。

#### 场景：主路径

Given 已装仓 AGENTS.md 带 v3.32.3 小段受管块 / When 用 v3.32.4 重跑 init / Then 命中异版本追加态分支，块被替换为完整模板全文，块外内容保留。

### FR-06: test/init-agents-injection.test.mjs 及相关测试全绿，lint 通过

- 注入面行为变更**必须**有测试覆盖并全绿：init-agents-injection 全用例通过、lint（check-syntax）通过；**禁止**为过测试改弱断言。

#### 场景：主路径

Given 本变更的 src/test 改动 / When 运行 node test/init-agents-injection.test.mjs 与 npm run lint / Then 全部通过（70/70 + lint 0 错）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/init-agents-injection.test.mjs「Case 2: AGENTS.md 已存在无标记 → 追加完整受管段，原文保留」
FR-01: test/init-agents-injection.test.mjs「Case 4a: AGENTS.md 异版本追加态 → 受管块刷新，块外内容保留」
FR-02: test/init-agents-injection.test.mjs「Case 12: GEMINI.md 无文件 → 写完整指引（同 AGENTS.md 模板）」
FR-02: test/init-agents-injection.test.mjs「Case 13: INSTRUCTIONS.md 用户自有文件 → 追加完整受管段 + 同版本幂等」
FR-03: test/init-agents-injection.test.mjs「Case 6: AGENTS.md 含旧 ## SillySpec 段 → 迁移替换，不双段」
FR-03: test/init-agents-injection.test.mjs「Case 6b: 旧段 CRLF 漂移 → 按标题截除回退，仍不双段」
FR-03: test/init-agents-injection.test.mjs「Case 14: GEMINI.md 整文件即旧小段 → 迁移为完整受管块，无空壳残留」
FR-04: test/check-syntax.mjs「未引用导出/内容规则（lint 面）」+ src/init.js 全文无 INJECTION_CONTENT（Code Review 核验）
FR-05: test/init-agents-injection.test.mjs「Case 4a: 异版本追加态块刷新（版本差触发机制的行为面）」
FR-06: test/init-agents-injection.test.mjs「全套件 70/70（含新增 Case 12-14）」+ npm run lint
