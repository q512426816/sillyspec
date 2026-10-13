---
author: flow-machine-draft
created_at: 2026-10-13T12:01:44.383Z
---
# 需求规格（Requirements）— 2026-10-13-commit-guard-s3

## 功能需求

### FR-01: pathspec 提交且某路径临时索引与真实暂存区 blob 不一致时，S3 警告点名路径与机理，写 write-audit 留痕，exit 恒 0 不阻断提交

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 规则 11 正常流转（add 净版后不再改文件+同清单 pathspec 提交）与普通全量提交两形态零 S3 警告（GIT_INDEX_FILE 未设或等于真索引即跳过）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 纯函数四态可直测：同 sha 零告、异 sha 点名、仅临时索引（未 add 的新文件随 pathspec 提交）点名、仅真实索引（staged 但不在本次 pathspec）不点名；冲突态 stage 大于 0 条目忽略

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: 真仓集成测试：真实 git 钩子复现 055080e4 形态必告警且提交放行；干净流转与全量提交零误报

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 既有 S1/S2 行为零回归（test/commit-guard.test.mjs 既有断言零改动全绿）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/commit-guard.test.mjs「S3 集成：055080e4 形态必告警且放行（真实 git 钩子路径）」
FR-02: test/commit-guard.test.mjs「S3 集成：干净 pathspec 流转与全量提交零告警」
FR-03: test/commit-guard.test.mjs「analyzeIndexDivergence 四态纯函数用例」
FR-04: test/commit-guard.test.mjs「S3 集成（同 FR-01 场景断言 write-audit 与 exit 0）」
FR-05: test/commit-guard.test.mjs 既有 S1/S2 断言零改动全绿
