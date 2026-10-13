---
author: flow-machine-draft
created_at: 2026-10-13T08:38:14.250Z
---
# 需求规格（Requirements）— 2026-10-13-declared-paren-strip

## 功能需求

### FR-01: design 清单行「路径加括号注记」全半角形态剥除：列表项与表格 cell 双形态解析出干净路径，含角色前缀与未闭合残片形态

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: normalizePath 兜底剥未闭合尾括号残片，闭合剥既有行为零回归，既有 change-list 测试零改动全绿

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 快照对账兜底合并：declared 污染行剥残片后与实际行同路径时合并单行、verdict 为 planned、totals.files 按唯一路径计

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: incidental 顺带修复嗅探不回归；冒号描述与双尾注两既有剥除形态不回归

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 存量归档件零回填；e2e：污染写法清单的变更收口后 scopeAudit 出单行干净路径

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/change-list-paren-strip.test.mjs「括号注记剥除三层用例组（解析/兜底/合并/e2e）」
FR-02: test/change-list-paren-strip.test.mjs「括号注记剥除三层用例组（解析/兜底/合并/e2e）」
FR-03: test/change-list-paren-strip.test.mjs「括号注记剥除三层用例组（解析/兜底/合并/e2e）」
FR-04: test/change-list-paren-strip.test.mjs「括号注记剥除三层用例组（解析/兜底/合并/e2e）」
FR-05: test/change-list-paren-strip.test.mjs「括号注记剥除三层用例组（解析/兜底/合并/e2e）」
