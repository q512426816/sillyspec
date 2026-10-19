---
author: flow-machine-draft
created_at: 2026-10-19T07:40:03.128Z
---
# 需求规格（Requirements）— 2026-10-19-thin-review-material-pack

## 功能需求

### FR-01: 评审任务书预消化材料包注入

- flow done 渲染评审任务书时，材料可得（requirements.md 可解析出 FR、change.patch 非空）**必须**在任务书材料段之后注入【预消化材料包】段：FR↔测试绑定表（机械解析 requirements.md 的 FR 标题与测试绑定行）+ 冻结 patch 文件级摘要（每文件一行：路径、+增/−删行数、hunk 数——从 change.patch 文本本身解析，**禁止**走活 git）；段尾**必须**带基准面语义行（包=定位索引非证据、包外定向查证须列明、包不足写 cannot_verify）。

#### 场景：主路径

- Given：变更面 requirements.md 含多条 FR 与测试绑定行，change.patch 含多文件 diff
- When：flow done 命中需评审并渲染任务书
- Then：任务书含预消化段，FR 行与绑定行逐条对应，patch 摘要行数与 diff 文件数一致

#### 场景：跨仓 JSON 冻结面

- Given：变更走跨仓空面（主仓无 change.patch，正文在 change-patch.json repos[]）
- When：渲染任务书
- Then：patch 摘要子段零产出（FR 表照常），不读活 git 兜底

### FR-02: 纯机械抽取与体积帽

- 材料包**必须**由 CLI 确定性解析产出（行/正则解析纯函数，同输入同输出，无任何模型生成内容混入）；整段**必须**有体积帽（对齐 review-material-pack.js PACK_MAX_CHARS=12000 先例），超限**必须**截断并注记（超限截断、需全文时定向查证并列明）。

#### 场景：大 patch 截断

- Given：change.patch 为数百文件大体量（实测档 365KB 级）
- When：装配材料包
- Then：注入段总长不超帽且带截断注记，装配不抛错

### FR-03: 零注入逐字一致

- 材料缺件（requirements.md 解析不出 FR 且 change.patch 缺失或为空）时**必须**零注入——渲染产物与本特性上线前的任务书逐字一致（零回归锚）；renderReviewerTaskbook 未传材料包参数时同样零注入。

#### 场景：既有调用方零感知

- Given：不传 packLines 调 renderReviewerTaskbook（既有调用方/既有测试形态）
- When：渲染
- Then：产物与现状逐字一致

### FR-04: 三态测试全绿

- test/flow-review-pack.test.mjs **必须**覆盖零注入一致/注入形态/帽截断三态并全绿；既有 test/flow-review.test.mjs 回归**禁止**失败。

#### 场景：主路径

- Given：本变更交付面提交完毕
- When：跑 test/flow-review-pack.test.mjs 与 test/flow-review.test.mjs
- Then：全部用例通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-review-pack.test.mjs「注入形态——材料可得时任务书含预消化段（FR 表逐条对应+patch 摘要行数与文件数一致+基准面语义行）」
FR-02: test/flow-review-pack.test.mjs「帽截断——超限材料截断并注记；确定性——同输入同输出」
FR-03: test/flow-review-pack.test.mjs「零注入一致——缺件/未传参时渲染产物与现状逐字一致」
FR-04: test/flow-review-pack.test.mjs（全文件三态用例 0 失败）+ test/flow-review.test.mjs（既有回归 0 失败）
