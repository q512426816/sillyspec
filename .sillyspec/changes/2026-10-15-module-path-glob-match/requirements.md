---
author: flow-machine-draft
created_at: 2026-10-15T07:37:41.218Z
---
# 需求规格（Requirements）— 2026-10-15-module-path-glob-match

## 功能需求

### FR-01: modulePathMatches 全形态单测：无 glob 旧语义逐字（===/前缀/目录尾/）、**、/**、*、?、**/*.tsx 组合、括号路径

- modules.js 必须导出 modulePathMatches(filePath, rawPattern)：尾部 `/` 目录条目按 startsWith；其余条目按相等或 `p/` 前缀；含 `*`/`?` 的 glob 条目追加 globMatch（双星跨零或多段、单星段内、单问号单字符）；反斜杠两侧归一；空输入 false。无 glob 输入的行为必须与旧各消费点逐字等价（零回归）。

#### 场景：主路径

- When test/module-path-glob-match.test.mjs ① 组运行，Then 19 形态断言全过（含 `**` 深路径/段内前缀不跨、`*` 不跨斜杠、括号路径组合、反斜杠归一）。

### FR-02: 平台仓实测转正：resolveTouchedDomains('backend/app/modules/daemon/router.py') → daemon 真域（修前 auto-backend）；frontend 组件路径命真域

- 修复后对平台仓真实模块图（sillyspec-scan 生成，146 条 glob paths），backend/frontend/sillyhub-daemon 交付路径必须经 glob 命中真域而非投伪域；残留伪域仅限真无覆盖路径（如平台仓 .claude/ 无卡）。

#### 场景：主路径

- Given 平台仓 .sillyspec 真实数据，When resolveTouchedDomains 逐路径求值，Then daemon/backend/frontend 组件等真域命中（实测回执留档）。

### FR-03: 9 消费点接入且既有测试面零回归（fr-index/docs-debt/ceremony-tier/flow-parity/module-impact/design-facts 各面）

- fr-index.matchedModuleIds、decision-distill.matchImpactsToModules、module-impact.classifyFile、docs-debt.matchFilesToModules、design-facts.deriveActualModules、ceremony-tier.matchModuleForFile、flow-parity 两处、knowledge-graph moduleOf 必须全部接入 modulePathMatches；既有测试面零失败（含 scan-diff 反斜杠语义变化经测试更新留痕）。

#### 场景：主路径

- When 相关测试批次（94 用例）+ 全量套件运行，Then 零失败（800/800）。

### FR-04: 新增端到端测试：glob 形态 map + resolveTouchedDomains 不投伪域、decision impacts 命真域

- test/module-path-glob-match.test.mjs 必须含端到端面：glob 形态 module-map 下 resolveTouchedDomains 命真域（修前行为对照——必然投伪域/unmapped）、真无覆盖路径仍投伪域（未过宽兜底）、决策 impacts token 对 glob 条目命中。

#### 场景：主路径

- When ②③ 组运行，Then 全过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/module-path-glob-match.test.mjs「① modulePathMatches 全形态：旧语义逐字 + glob 补充」
FR-02: 不适用：平台仓消费端实测——验收靠 diagnose 脚本对真实图求值的实测回执（daemon/router.py → daemon 等 6 路径留档 verify-result）
FR-03: test/scan-diff.test.mjs「Windows 反斜杠模块路径：两侧归一命中 → 归 core」+ test/fr-index.test.mjs + test/fr-index-l2.test.mjs + test/ceremony-tier.test.mjs + test/docs-debt.test.mjs + test/flow-parity.test.mjs + test/knowledge-graph.test.mjs（各面零回归）
FR-04: test/module-path-glob-match.test.mjs「② 端到端：glob 形态 map → 域路由命真域（修前投伪域）」「③ 决策 impacts 路径对 glob map 命中真域」
