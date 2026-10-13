---
author: flow-machine-draft
created_at: 2026-10-13T09:15:39.251Z
---
# 需求规格（Requirements）— 2026-10-13-extract-head-guard

## 功能需求

### FR-01: 前置行行尾出现未闭合全角左括号时「成功标准：」节标题不被并入，条目正常提取、flow start 清晰度门不再误拒

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 续行合并既有语义零回归：括号跨行并回、悬空冒号并回、markdown 标题、分号斜杠不拆四项既有断言零改动全绿

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 验收标准 等价节标题同样受守卫；守卫只影响当前行是节标题的合并判定，不改 needsContinuationMerge 本体

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/draft-continuation.test.mjs「节标题合并守卫用例组（裸动机未闭合括号/验收标准等价/既有四锚零回归）」
FR-02: test/draft-continuation.test.mjs「节标题合并守卫用例组（裸动机未闭合括号/验收标准等价/既有四锚零回归）」
FR-03: test/draft-continuation.test.mjs「节标题合并守卫用例组（裸动机未闭合括号/验收标准等价/既有四锚零回归）」
