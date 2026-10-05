---
author: flow-machine-draft
created_at: 2026-10-05T00:14:27.780Z
---
# 需求规格（Requirements）— 2026-10-05-wordpos

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写

- FR 行为句正文里的英文强度词（SHALL 或 MUST 或 SHOULD，SHOULD NOT 由前缀覆盖）在句中任意位置出现即视为已撰写——与中文必须/禁用的任意位置命中同构

#### 场景：句中英文强度句

Given 某条 FR 正文写「本变更 MUST …」或「边界场景 SHOULD …」（强度词不在行首）
When flow done 执行 verifyThinDocsV2
Then 该 FR 不因位置锚定被误拒收（行首「- 系统 MUST」旧形态继续放行）

### FR-02: 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写

- 待撰写占位行仍然拒收——占位句自带的词表字样（必须/禁用/SHOULD/可以）不算已撰写，由 pending 前缀检查独立拦截

#### 场景：占位句词表字样

Given 某条 FR 正文仍是「（待撰写：…必须/禁止/SHOULD/可以）」占位行
When flow done 执行 verifyThinDocsV2
Then 该 FR 因 pending 前缀被拒收（本判据放宽不构成绕过面）

### FR-03: 既有测试回归绿且 lint 零死导出

- 既有测试全绿交付，且 lint 零死导出零告警

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-docs-v2.test.mjs「⑥ 强度词表含 SHOULD/SHOULD NOT 且中英位置同构」——句中 MUST/SHOULD 唯一句、行首 SHOULD NOT 三态放行断言
FR-02: test/thin-docs-v2.test.mjs「⑥」末段——占位句自带词表字样仍拒收且只拒一处
FR-03: test/thin-docs-v2.test.mjs 全 6 用例 + test/flow-draft.test.mjs 全 16 用例 + node test/check-syntax.mjs（收口由 CLI 实测门复跑）
