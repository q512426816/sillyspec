---
author: flow-machine-draft
created_at: 2026-10-05T04:22:10.210Z
---
# 需求规格（Requirements）— 2026-10-05-hindsight-checkbox-noise

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: 纯勾选翻格（任务行文本零改动）的 tasksRewriteRatio 必须为 0 且不触发标记

computeHindsightMetrics 的 tasks 比对路必须先做勾选框状态归一（行首 `- [x]`/`- [X]`/`- [ ]` 归一为 `- [ ]`，仅 tasks 面、仅比对输入侧、纯结构 token 替换零语义判定）再算行级改写比；任务全勾而文本零改动的变更禁止被标记 hindsight（2026-10-05 四变更实测 0.75/0.8 恒超阈系勾选翻格被计为整行改写所致）。

#### 场景：全勾零改写

- Given: 首版快照 tasks 正文=标题+3 条 `- [ ] task-NN: …` 镜像行
- When: 终稿为同样 3 条 `- [x] task-NN: …`（文本零改动）
- Then: tasksRewriteRatio === 0，markHindsight 不因 tasks 路落标记

### FR-02: 勾选翻格叠加真实任务文本改写时，改写比只按文本改写行计（翻格不稀释不虚增）

归一必须只消勾选框状态差异：任务行文本真实改写的行照常计入改写比分子；翻格本身禁止使改写比虚增，也禁止因归一误把真实改写行判为相同。

#### 场景：翻格+单行文本改写

- Given: 首版快照 tasks 正文=标题+3 条未勾任务行（contentSurface 面 4 行）
- When: 终稿 3 条全勾且其中 1 条任务文本被改写
- Then: tasksRewriteRatio === 0.25（1/4——只计文本改写行）

### FR-03: design 比对面不做勾选归一（design 文本含 checkbox 形态差异仍计改写）；单测覆盖上述三情形

勾选框归一必须只作用于 tasks 比对面，design 比对面禁止归一（design 的行文本差异——含形如 checkbox 的行——仍按原口径计改写）。本变更必须以自动化单测覆盖 FR-01/02/03 三情形。

#### 场景：design 面口径不变

- Given: 首版快照与终稿 design 某行分别为 `- [x] 旧文本` 与 `- [ ] 旧文本`（仅勾选框字符差异）
- When: computeHindsightMetrics 计算 designRewriteRatio
- Then: 该行计为改写（design 面不做勾选归一，口径与修复前一致）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/route-hindsight.test.mjs「⑤ 勾选翻格零信号：全勾零改写 ratio=0 且不标记」
FR-02: test/route-hindsight.test.mjs「⑤ 翻格+真实改写只计文本行（ratio=0.25）」
FR-03: test/route-hindsight.test.mjs「⑤ design 面不归一：checkbox 形态差异仍计改写」
