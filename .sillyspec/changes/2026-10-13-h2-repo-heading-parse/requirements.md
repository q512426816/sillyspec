---
author: flow-machine-draft
created_at: 2026-10-13T03:33:33.661Z
---
# 需求规格（Requirements）— 2026-10-13-h2-repo-heading-parse

## 功能需求

### FR-01: design 清单用段头「## <注册key> 仓变更」（可含编号前缀与括号备注后缀）时 parseFileChangeListDetailed 解析出该段条目且带 repo 标注——节不再被 h2 段头截断，段头前主仓条目照常解析

- 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 段头 key 未注册（含 main）时条目归主仓（repo=null，fail-closed 同既有口径）；非段头的 ## 章节标题仍截断「文件变更清单」节（既有行为零回归）

- 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 「### <key> 子段」与「cross-repo:<key>: 前缀」两既有形态行为不变（cross-repo-patch-freeze 既有断言全绿）

- 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: REPO_SECTION_HEADER_RE 单一源：定义上移 change-list.js 导出、plan-postcheck 改 import 同一符号（design-coverage/design-facts 既有断言零改动全绿）

- 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: thin 空面 e2e：空冻结面 + 清单用「## libx 仓变更」段头 → 走纯跨仓规范标注路径（advisory 不阻断），不再误触未标注阻断

- 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/change-list-repo-heading.test.mjs「h2 段头解析出条目带 repo（含编号前缀/括号备注）+ 段头前主仓条目照常」
FR-02: test/change-list-repo-heading.test.mjs「未注册 key（含 main）归主仓 + 非段头 ## 章节仍截断节」
FR-03: test/cross-repo-patch-freeze.test.mjs「既有 ### 子段/cross-repo: 前缀断言全绿（零改动回归锚）」
FR-04: test/design-coverage.test.mjs + test/design-facts.test.mjs「RE 上移后 plan-postcheck 消费面零改动全绿」＋src 内 grep 断言单一 import
FR-05: test/thin-empty-face-crosscheck.test.mjs「空面 + ## libx 仓变更 段头 → 纯跨仓标注 advisory 不阻断」
