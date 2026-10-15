---
author: flow-machine-draft
created_at: 2026-10-15T05:04:25.979Z
---
# 需求规格（Requirements）— 2026-10-15-vector-capability-autodetect

## 功能需求

### FR-01: 缺省（无键）+平台已连接：首查探测一次并落缓存，缓存 1h 内后续检索零探测（跨进程持久）

- knowledge.vector_search 键未写（或 auto）且平台已连接时，向量层必须按能力缓存判定：缓存缺席或过期（probedAt 距今 ≥1h）→ 乐观探测一次并落盘 `.sillyspec/.runtime/vector-capability.json`（{url, available, probedAt}）；404 → available:false（重试窗内后续检索零探测）、200 → available:true。

#### 场景：主路径

- Given 无键+404 mock，When 连续两次 hybrid 检索，Then 首查探测 1 次、缓存 unavailable 落盘且 URL 键匹配、第二次零新增请求（测试⑧）。

### FR-02: local.yaml off 强制关/on 强制开跳过探测；env 三态不变

- yaml `vector_search: off` 必须强制关（即使缓存过期也零网络调用）；`on` 强制开跳过缓存判定；env SILLYSPEC_KNOWLEDGE_VECTOR=on|auto 强制开、off 强制关（既有语义不变）。逃生阀优先级高于能力缓存。

#### 场景：主路径

- Given 缓存 unavailable，When yaml off 后检索，Then 零网络请求（测试⑧尾段）。

### FR-03: 能力缓存按 URL 匹配（换平台失效）；写盘 fail-soft；过期缓存重新探测且部署后自动启用

- 缓存读取必须校验 url 与当前平台配置一致（不一致视同无缓存）；写盘任何异常必须 fail-soft 不影响检索本体；过期 unavailable 缓存必须触发重新探测，平台已实现端点时拿到 vector 结果并把缓存翻 available（「部署后自动启用」闭环）。

#### 场景：主路径

- Given 预置 2h 前 unavailable 缓存+ok mock，When 检索，Then 探测 1 次、vector 结果在场、缓存翻 true（测试⑩）。

### FR-04: hint 语义随迁：auto+unavailable 信息性提示/强制关零提示/开零提示/未连接空/auto 未探测空

- vectorSwitchHint 必须五态：平台未连接 → 空；auto 且缓存 unavailable → 信息性提示（含「自动启用」，不含 vector_search 配置指路）；强制关（yaml off）→ 空；已开 → 空；auto 未探测 → 空。

#### 场景：主路径

- When 五态 fixture 各调一次，Then 空串/空/信息性/空/空精确（测试①组）。

### FR-05: 既有 vector 测试面随契约更新全绿，schema/example 同步

- test/knowledge-vector-recall.test.mjs（⑧ 反转+⑩ 新增）、test/vector-switch-hint.test.mjs（语义随迁）必须全绿；config-schema desc/example 必须改为 auto 语义；knowledge-inject/thin-inject-telemetry/thin-query-slim 零回归。

#### 场景：主路径

- When 六测试文件合跑，Then 零失败（14+ 组）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-vector-recall.test.mjs「⑧ 缺省 auto（2026-10-15-vector-capability-autodetect）：键未写 → 首查探测落缓存，重试窗内零再探测」
FR-02: test/knowledge-vector-recall.test.mjs「⑧」（yaml off 段）+「⑤⑥ 触发纪律：路由命中不调平台；开关关闭不调平台」
FR-03: test/knowledge-vector-recall.test.mjs「⑩ 过期能力缓存：probedAt 超过重试窗 → 重新探测（平台部署后自动启用）」
FR-04: test/vector-switch-hint.test.mjs「① 五态」「② search：auto+unavailable 输出信息性 hint 键」「③ flow 注入零命中：auto+unavailable 追加信息性提示行；已开零新增」
FR-05: test/knowledge-vector-recall.test.mjs（全文件 8 用例）+ test/vector-switch-hint.test.mjs + test/knowledge-inject.test.mjs + test/thin-inject-telemetry.test.mjs + test/thin-query-slim.test.mjs + test/config-schema.test.mjs（合跑零失败）
