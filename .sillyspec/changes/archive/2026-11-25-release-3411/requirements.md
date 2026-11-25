---
author: flow-machine-draft
created_at: 2026-11-25T10:04:38.301Z
---
# 需求规格（Requirements）— 2026-11-25-release-3411

## 功能需求

### FR-01: package.json 与 package-lock.json 版本升至 3.34.11

package.json 与 package-lock.json 的 `version` 必须同步升为 `3.34.11`（patch 最小升级），两处版本必须一致。

#### 场景：版本面升级

- Given 当前版本 3.34.10
- When 执行最小版本升级
- Then 两个文件的 version 均为 3.34.11

### FR-02: test/quick-retired.test.mjs 的 R5 版本锚同步为 3.34.11

`test/quick-retired.test.mjs` 的 R5 版本锚必须同步断言 `3.34.11`，避免发版后该套件因版本号不匹配转红。

#### 场景：版本锚同步

- Given R5 锚断言当前为 3.34.10
- When 版本升到 3.34.11
- Then 锚断言同步为 3.34.11 且套件跑绿

### FR-03: 变更测试面（quick-retired）绿、lint 通过

交付前 `quick-retired` 测试面必须跑绿，`npm run lint`（check-syntax）必须通过。

#### 场景：收口实测

- Given 版本面与锚点已升级
- When 运行 quick-retired 测试与 lint
- Then 全绿、零错误

### FR-04: npm publish 后 npm view sillyspec version 返回 3.34.11

发布完成后 `npm view sillyspec version` 必须返回 `3.34.11`；若因认证/网络失败，必须如实报告失败原因，不伪造成功。

#### 场景：发布核验

- Given 版本提交已推送 origin main
- When 执行 npm publish 并查询远端版本
- Then 远端版本为 3.34.11

## 测试绑定

FR-01: test/quick-retired.test.mjs「R5 package.json 版本 3.34.11」
FR-02: test/quick-retired.test.mjs「R5 package.json 版本 3.34.11」
FR-03: test/quick-retired.test.mjs「全量」；lint 走 npm run lint（check-syntax）
FR-04: 不适用：发布动作由 npm publish 实测核验（npm view sillyspec version），无测试文件
