---
author: flow-machine-draft
created_at: 2026-10-16T00:25:50.314Z
---
# 需求规格（Requirements）— 2026-10-16-spec-sync-fail-alarm

## 功能需求

### FR-01: spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码

- spec-sync 对平台非 2xx 响应**必须**把响应体摘要（code + message，有则含 details.path；非 JSON 截断原文前 200 字）拼进失败告警行，禁止只输出 HTTP 状态码。

#### 场景：主路径

- Given 平台对 `/api/changes/-/spec-sync` 返回 422 且响应体为 `{code, message, details:{path}}`
- When syncSpecTree 推送失败
- Then 告警行包含 `HTTP_422_SPEC_BUNDLE_INVALID`、`path=<具体路径>` 与 message 全文

#### 场景：非 JSON 响应体

- Given 平台经 nginx 返回 502 HTML
- When 推送失败
- Then 告警行包含截断后的原文前 200 字，不得抛解析异常

### FR-02: 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零

- 同一 label 连续失败达到 3 次，spec-sync **必须**输出一行 🚨 显式告警（指明平台文件树可能持续落后）；任一次成功（含无差异早退）后**必须**清零该 label 计数；不同 label 之间禁止互相影响。

#### 场景：主路径

- Given mock 平台对 spec-sync 连续返回 422
- When 同一变更 label 连续同步 3 轮
- Then 第 1/2 轮不出现 🚨，第 3 轮出现「已连续 3 次同步失败」告警，且计数文件 count=3

#### 场景：成功清零

- Given 连续失败 3 轮后平台恢复 200
- When 再同步一轮成功
- Then 计数文件不再含该 label

### FR-03: npm test + npm run lint 实测通过（flow done 门禁）

- 本变更收口**必须**通过 CLI 实测的 `npm test` 与 `npm run lint`（既有套件零回归 + 新增套件全绿），fail-closed。

#### 场景：主路径

- When flow done 执行实测
- Then npm test 全部通过（含新增 spec-sync-fail-streak 套件全绿）且 npm run lint 0 错

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/spec-sync-fail-streak.test.mjs「A. describeErrorBody 响应体摘要」+「B1. 连续 422 三轮：响应体进告警行」
FR-02: test/spec-sync-fail-streak.test.mjs「B1. 连续 422 三轮：第 3 轮升级 🚨」+「B2. 成功一轮 → 计数清零」+「B3. label 隔离」+「B4. 无差异早退同样清零」
FR-03: test/run-tests.mjs 全量套件（flow done CLI 实测门禁亲跑）
