---
author: flow-machine-draft
created_at: 2026-10-05T23:15:57.077Z
---
# 需求规格（Requirements）— 2026-10-06-review-anchor-and-negation

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）

flow-review.js 的 renderReviewerTaskbook 必须接受 head 参数并在任务书正文印出评审对象 HEAD 完整 sha 与「照抄」指引（head 缺省时必须引导评审员自填 git rev-parse HEAD 输出）；任务书产物 schema 必须含 reviewedAgainst 字段行；validateReviewJson 对该字段必须可选校验——缺省容忍（旧产物向后兼容零回归），存在时须为 7-40 位 hex 否则进错误清单。

#### 场景：任务书印锚

- Given: flow done 判定需评审且 rev-parse 取到当前 HEAD
- When: 渲染评审任务书（head=40 位 sha）
- Then: 正文含该 sha 与 reviewedAgainst 照抄指引；head 缺省时含「git rev-parse HEAD」自填引导，schema 两形态都含 reviewedAgainst 字段

### FR-02: 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变

flow.js 漂移重冻结的隔离段必须在隔离前比对 review.json.reviewedAgainst 与当前 HEAD（双向前缀口径）：命中 → 必须保留 review.json 不改名不隔离、不重置 review 子步完成标记，并打印锚定保留日志；未锚定 / 字段缺省 / 读失败 / 格式非法 → 必须保持现行隔离行为（fail-safe：宁可多评一次，不放行无锚证据），patch 重冻结两分支都照常执行。

#### 场景：锚定保留（实测竞态复现，2026-10-06-litest-p1-fixes 收口实证）

- Given: patch 冻结后本变更有新提交（drift 触发）、review.json 在场且 reviewedAgainst == 当前 HEAD
- When: flow done 重入漂移检测
- Then: review.json 原样保留（无 .superseded 改名）、review 子步标记不重置、日志说明「已锚定当前 HEAD」；patch 重冻结照常推进

### FR-03: 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线

锚定比对逻辑必须提炼为 flow-review.js 导出的纯函数 reviewAnchoredToHead(reviewPath, head)：双向前缀匹配（全等 / head 以 reviewedAgainst 为前缀 / reviewedAgainst 以 head 为前缀）；reviewedAgainst 缺省、坏 JSON、非 hex、文件不存在、head 为空一律返回 false；flow.js 只做调用接线（含锚定判定自身异常的 catch 兜底）。

#### 场景：主路径

- Given: review.json 与 head 的各种组合
- When: 直接调用 reviewAnchoredToHead
- Then: 全等与双向前缀命中返回 true；异 sha、缺字段、坏 JSON、非 hex、文件缺失、head 空均返回 false

### FR-04: NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级

NEGATED_CROSSTALK_RE 必须追加「不串台」三字整词备选：design 作答含「…过滤不串台」类整词否定时不再触发「串台」承诺词一票升级；「不排除串台」类风险自认形态必须保留一票升级——禁止把裸「不」加进前缀词表（裸前缀会把「不排除串台」等风险自认误消解）。

#### 场景：整词消解

- Given: design 盲维作答「不适用：前缀按 changeName 过滤不串台。」
- When: classifyReviewNeed
- Then: 承诺词信号不触发（其余信号照常独立判定）

#### 场景：风险自认保留

- Given: 作答「高并发下不排除串台可能，评审需重点看。」
- When: classifyReviewNeed
- Then: 「串台」一票升级保留

### FR-05: 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿

上述两向必须有回归测试锁定（flow-review.test.mjs：④ 段加「不串台」消解形态、⑥ 段加「不排除串台」风险自认反向、② 段加任务书锚断言、③ 段加 reviewedAgainst 可选校验三态、⑦ 新增 reviewAnchoredToHead 八态用例）；改动面测试与 npm run lint 必须全绿，flow-protocol 全量回归无破坏。

#### 场景：主路径

- Given: 本变更代码就位
- When: node --test test/flow-review.test.mjs test/flow-protocol.test.mjs + npm run lint
- Then: 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-review.test.mjs「② 评审任务书——head 传入印 sha + reviewedAgainst 照抄指引 / head 缺省引导自填」
FR-02: test/flow-review.test.mjs「⑦ 评审对象锚定——reviewedAgainst 命中 HEAD 保留判定（flow.js 接线段由 test/flow-protocol.test.mjs 全量回归背书）」
FR-03: test/flow-review.test.mjs「⑦ 评审对象锚定——全等/双向前缀命中 true、异 sha/缺省/坏 JSON/非 hex/文件缺失/head 空 false」
FR-04: test/flow-review.test.mjs「④ 否定语境消解——不串台（整词）不升级 + ⑥ 非否定语境保留——不排除串台（风险自认，整词反向）」
FR-05: test/flow-review.test.mjs「③ review.json 校验三态——reviewedAgainst 可选校验（缺省兼容/合法 hex 通过/非 hex 报错）」
