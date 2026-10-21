---
author: flow-machine-draft
created_at: 2026-10-21T14:12:39.701Z
---
# 需求规格（Requirements）— 2026-10-21-cli-manifest-since-cache

## 功能需求

### FR-01: 有缓存时 GET 带 ?since=<spec_version>，响应增量行合并进缓存（含墓碑行）

- `syncSpecTree` 读清单前**必须**先读本地缓存（`.runtime/state/spec-manifest-cache.json`，形态 `{spec_version, files, inc_count}`）；缓存可用（spec_version 整数、files 对象、inc_count 未超对账阈值）时**必须**以 `GET <manifestUrl>?since=<spec_version>` 拉增量并把响应 `files` 逐行覆盖合并进缓存 `files`（含 `exists=false` 墓碑行——与服务器全量清单语义一致），以响应 `spec_version` 作新游标，`inc_count+1` 原子落盘；合并结果作为 diff 锚（与拉全量等价）。

#### 场景：增量主路径

- Given：缓存 `{spec_version:5, files:{A,B}}`，服务端落地 C/D 后 spec_version=6
- When：syncSpecTree 拉清单
- Then：请求 URL 含 `?since=5`；锚 = {A,B,C,D}；缓存更新为 `{spec_version:6, files:{A,B,C,D}, inc_count:+1}`

#### 场景：墓碑行经增量流合并

- Given：缓存含活跃行 A，服务端软删 A（增量响应 A.exists=false）
- When：syncSpecTree 拉清单
- Then：合并后锚中 A 为墓碑行（后续 diff 语义与全量清单一致）

### FR-02: 无缓存/对账轮/环境变量 SILLYSPEC_SPEC_SYNC_FULL=1 走全量并落缓存

- 无缓存、缓存形态非法、`inc_count` 达到对账阈值（默认 50，`SILLYSPEC_SPEC_SYNC_RECONCILE_EVERY` 可调 1~10000）或 `SILLYSPEC_SPEC_SYNC_FULL=1` 时**必须**不带 since 全量拉取；响应含 `spec_version` 时**必须**以全量 files 重置落盘缓存（inc_count=0）。

#### 场景：首次同步

- Given：无缓存文件
- When：syncSpecTree 拉清单
- Then：请求无 since 参数；缓存写入 `{spec_version, files: 全量, inc_count:0}`

#### 场景：对账轮

- Given：缓存 inc_count 达到阈值
- When：syncSpecTree 拉清单
- Then：请求无 since 参数（全量对账后计数归零）

### FR-03: 旧平台响应（无 spec_version）自动作废缓存回退全量，行为与现状一致

- 响应体无 `spec_version` 字段（平台未部署 2026-10-21-spec-manifest-incremental）时**必须**把响应 `files` 当全量清单直接使用（旧平台忽略 since 参数恒回全量），并**必须**作废本地缓存（删除缓存文件，不写新缓存）——未部署窗口内行为与现状完全一致。

#### 场景：旧平台兼容

- Given：缓存存在，服务端为旧版本（响应无 spec_version）
- When：syncSpecTree 带 since 拉清单
- Then：以响应 files（旧平台恒全量）为锚正常工作；缓存文件被删除；后续轮次仍走全量

### FR-04: 服务端 spec_version 倒退（重建）时一次性全量重拉对账

- 带 since 请求的响应 `spec_version` 小于缓存 `spec_version`（服务端重建/回滚）时**必须**判定缓存脱离服务端纪元：一次性重发**不带 since** 的全量请求对账，以其结果重置缓存（inc_count=0）；全量对账请求失败时**必须**按拉取失败处理（ok:false 返回，禁用空锚触发全量 add 风暴）。

#### 场景：服务端重建

- Given：缓存 spec_version=100，服务端重建后响应 spec_version=3
- When：syncSpecTree 带 since=100 拉清单
- Then：紧接重发无 since 全量请求；缓存以全量+spec_version=3 重置

### FR-05: 稳态清单请求 <1s（本地 mock e2e 实证）

- 增量请求传输量**必须**只含变化行（与工作区历史总量无关）；本地 mock e2e**必须**实证稳态（无变化轮）syncSpecTree 端到端 <1s 且不发出 POST ops。

#### 场景：稳态 e2e

- Given：缓存与服务端一致（无差异），mock 服务器本地回环
- When：syncSpecTree 全流程
- Then：总耗时 <1s、无 POST、ok:true

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/spec-sync-manifest-cache.test.mjs「增量主路径合并+缓存推进 / 墓碑行合并」
FR-02: test/spec-sync-manifest-cache.test.mjs「首拉全量落缓存 / 对账轮全量 / SILLYSPEC_SPEC_SYNC_FULL 强制全量」
FR-03: test/spec-sync-manifest-cache.test.mjs「旧平台无 spec_version 回退全量并作废缓存」
FR-04: test/spec-sync-manifest-cache.test.mjs「spec_version 倒退全量对账 / 对账请求失败 fail-closed」
FR-05: test/spec-sync-manifest-cache.test.mjs「稳态无差异端到端 <1s 且零 POST」
