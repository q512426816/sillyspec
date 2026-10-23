---
author: flow-machine-draft
created_at: 2026-10-23T02:41:14.198Z
---
# 需求规格（Requirements）— 2026-10-23-release-3-33-5

## 功能需求

### FR-01: package.json 与 package-lock.json version 同步 3.33.5；test/quick-retired.test.mjs R5 版本锚断言同步 3.33.5 且该套件跑绿

- package.json 与 package-lock.json 的 version 字段 MUST 同步为 3.33.5，R5 版本锚（test/quick-retired.test.mjs）断言 MUST 同步且套件 MUST 跑绿；npm run lint MUST 过。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: npm run lint 过（pre-push 同款快速门）

- package.json 与 package-lock.json 的 version 字段 MUST 同步为 3.33.5，R5 版本锚（test/quick-retired.test.mjs）断言 MUST 同步且套件 MUST 跑绿；npm run lint MUST 过。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 提交推送 origin main（只带版本面与变更目录 pathspec，不夹带并行会话在途文件）；npm publish 发布 3.33.5 成功（或如实报告失败原因）

- package.json 与 package-lock.json 的 version 字段 MUST 同步为 3.33.5，R5 版本锚（test/quick-retired.test.mjs）断言 MUST 同步且套件 MUST 跑绿；npm run lint MUST 过。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯版本面机械变更（版本号/锁文件/锚断言），无独立新测试面——锚套件即验证
FR-02: 不适用：纯版本面机械变更（版本号/锁文件/锚断言），无独立新测试面——锚套件即验证
FR-03: 不适用：纯版本面机械变更（版本号/锁文件/锚断言），无独立新测试面——锚套件即验证
