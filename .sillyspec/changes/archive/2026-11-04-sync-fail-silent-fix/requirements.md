---
author: flow-machine-draft
created_at: 2026-11-04T02:06:05.912Z
---
# 需求规格（Requirements）— 2026-11-04-sync-fail-silent-fix

## 功能需求

### FR-01: syncSpecTreeOnly ok:false 时 platform sync 输出失败信息（含原因）且退出码非零，不再出现成功横幅

- 必须：`platform sync` 全树分支在 `syncSpecTreeOnly` 返回 `ok === false` 时输出失败行（失败原因已由 spec-sync 内部 warn 输出，此处补结果行）并以非零码退出；仅 `ok !== false`（成功或冲突分支）时才打印完成横幅。禁止 ok:false 时出现「✅ 全树 spec 同步完成」。

#### 场景：主路径（拉清单超时/POST 422/5xx）

- Given syncSpecTreeOnly 因任何网络/服务端原因返回 { synced: 0, ok: false }
- When platform sync 全树分支收结果
- Then 输出失败语义行且 process.exit 非零；「✅ 完成」横幅不出现

### FR-02: 全量清单拉取（无 since 参数态）超时提升至慢链路可完成（≥60s），增量拉取维持 10s 不变

- 必须：spec-sync 的清单 GET 在**全量形态**（无 since 参数：首拉/对账轮/倒退对账/SILLYSPEC_SPEC_SYNC_FULL）超时取 120s（对齐 PULL_BUNDLE_TIMEOUT_MS 档）；带 since 的增量拉取维持既有 10s 不变（小响应零回归）。

#### 场景：慢链路全量对账

- Given 全量清单 2.7MB、链路 ~1Mbps（生产实测，拉取需 ~25s）
- When 全量清单拉取
- Then 10s 内未完成不熔断（120s 档内完成即成功）；增量拉取（带 since）仍 10s 熔断

### FR-03: POST 422 失败输出含服务端指明的无效 op 路径，不再只报 HTTP 状态码

- 必须：spec-sync 的 POST !res.ok 分支在响应体含 op 级校验错误文本时，失败行附带该文本（至少含首个无效 op 路径）；响应体无 op 级信息时维持现状（状态码 + 通用 detail）。

#### 场景：SPEC_BUNDLE_INVALID 整批拒收

- Given 服务端返回 422 且 detail 含「path=changes/xxx：同步包无效：…」
- When CLI 处理 !res.ok
- Then 失败 warn 行含该 path 与原因文本（复现时无需开 debug 或查服务端日志定位无效 op）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/sync-fail-silent.test.mjs「T1 ok:false 报失败退出非零无成功横幅」
FR-02: test/sync-fail-silent.test.mjs「T2 全量清单超时 120s/增量维持 10s（源级断言）」
FR-03: test/sync-fail-silent.test.mjs「T3 422 detail 含无效 op 路径透传」
