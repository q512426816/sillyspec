---
author: flow-machine-draft
created_at: 2026-10-04T15:57:42.471Z
---
# 需求规格（Requirements）— 2026-10-04-strength-should

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: FR 行为句强度词判定词表纳入 SHOULD（含 SHOULD NOT 形态）——只写 SHOULD 唯一强度句不再误拒收并有回归锁定

- 系统 MUST 在 FR 正文含 SHOULD 或 SHOULD NOT 强度词时判定行为句已撰写（SHOULD 前缀覆盖 NOT 形态）——与模板指引/拒收文案的合法词表一致

#### 场景：SHOULD 唯一强度句

Given requirements 某条 FR 正文只含一句「系统 SHOULD …」强度句
When flow done 执行 verifyThinDocsV2
Then 该 FR 不因词表缺漏被误拒收（fail-closed 缺口闭合）

### FR-02: flow approve 对不存在变更 exit 2 的行为补测试断言锁定

- 系统 MUST 对不存在的变更名拒收 flow approve 并以 exit 2 退出（用法错面，非内部错误）

#### 场景：变更未建先批

Given changes/<名> 目录不存在
When 用户运行 flow approve --change <名>
Then exit 2 且 stderr 指明「变更不存在（approve 在 flow start 之后运行）」

### FR-03: 既有测试回归绿且 lint 零死导出

- 系统 MUST 在既有测试全绿与 lint（未引用导出/module-map/内容规则）零告警状态下交付本微修

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-docs-v2.test.mjs「⑥ 强度词表含 SHOULD/SHOULD NOT」——SHOULD 唯一句与 SHOULD NOT 双放行断言
FR-02: test/flow-draft.test.mjs「⑥c flow approve 对不存在变更 exit 2」
FR-03: test/thin-docs-v2.test.mjs 全 6 用例 + test/flow-draft.test.mjs 全 16 用例 + node test/check-syntax.mjs（收口由 CLI 实测门复跑）
