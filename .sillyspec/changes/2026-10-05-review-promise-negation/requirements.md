---
author: flow-machine-draft
created_at: 2026-10-05T03:13:31.258Z
---
# 需求规格（Requirements）— 2026-10-05-review-promise-negation

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（收口做门柱对比）；正文与场景块归你。

### FR-01: design 作答含「无串台面/不会串台/杜绝串台」时不再因承诺词升级（其余信号不受影响）

`classifyReviewNeed` 对 design.md 作答面（剥机器段与四问原文行之后）必须先做否定语境消解再扫承诺词：否定前缀（不会/不存在/没有/无/零/防/杜绝/避免/不含/免）加短距（≤8 字符）内的「串台」不得触发承诺词一票升级；消解必须只作用于 design 作答面，且禁止影响其余四路信号（盲维作答/diff 原语/决策密度/声明通道）的判定。

#### 场景：主路径

- Given：design.md 盲维第 4 问作答写「引导文案为通用命令示例，无串台面」，其余工件与信号全静
- When：运行 `classifyReviewNeed({ changeDir, patchText: '', change: <桶外名> })`
- Then：`required === false` 且 reasons 不含承诺词条；exemptEvidence 含「无高危承诺词」

### FR-02: input/requirements 里非否定「串台」仍一票升级（漏报防护不放松）

input、proposal.md、requirements.md 三面的承诺词扫描口径必须保持不变：非否定语境的「串台」（如「本变更解决串台问题」「仍有串台」）以及全部既有承诺词（不丢失/不重复/不丢不重/不重不漏/at-least-once/exactly-once）在任何工件面命中都必须一票升级评审。

#### 场景：主路径

- Given：requirements.md 正文写「修复跨实例数据串台问题」，design 作答全静
- When：运行 `classifyReviewNeed`
- Then：`required === true` 且 reasons 含承诺词命中「串台」

### FR-03: design 作答里「解决串台问题」等非否定语境仍升级

design 作答面内非否定语境的「串台」必须保留一票升级：否定消解只允许吞掉否定前缀短语，作答写「本设计解决两实例间的串台」「仍存在串台风险」时承诺词信号必须照常命中。

#### 场景：主路径

- Given：design.md 作答写「本设计的核心是解决多实例间串台」，其余信号全静
- When：运行 `classifyReviewNeed`
- Then：`required === true` 且 reasons 含承诺词命中

### FR-04: 新增/扩展测试锁定上述三面，全量测试绿

上述三面行为必须有自动化测试锁定（否定消解豁免 / 用户原话口径不放松 / 非否定语境保留升级），且全量测试套必须绿；既有 flow-review 定档矩阵断言零回归。

#### 场景：主路径

- Given：扩展 `test/flow-review.test.mjs`
- When：单独运行该文件与全量测试
- Then：三面断言全部通过，既有定档矩阵断言不变绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/flow-review.test.mjs「否定语境消解：无串台面/不会串台/杜绝串台不再一票升级」
FR-02: test/flow-review.test.mjs「用户原话口径：requirements 非否定串台仍一票升级」
FR-03: test/flow-review.test.mjs「非否定语境保留：解决串台/仍存在串台照常升级」
FR-04: test/flow-review.test.mjs「三面断言 + 既有定档矩阵零回归」
