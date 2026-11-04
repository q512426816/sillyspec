---
author: flow-machine-draft
created_at: 2026-11-04T01:50:26.999Z
---
# 需求规格（Requirements）— 2026-11-04-model-provider-cascade

## 功能需求

### FR-01: 供应商选择（暂存/预会话/即时三模式）时模型自动选中：该供应商上次显式选过的模型（浏览器本地记忆，无效则回退）→ 无记录取候选第一个 → 无候选为空（跟随）

- 在 SessionConfigBar 选择具体供应商（暂存、预会话、即时三种模式）时，组件必须自动把模型值解析为：该供应商「上次显式选过的模型」（浏览器本地记忆，见 FR-03；记忆值不在当前候选集时必须回退忽略）→ 无记忆记录取模型候选第一个 → 供应商无候选时为空串（跟随供应商配置）；解析结果必须经既有通道同步到发送载荷（暂存模式经 onStagedSwitch 写 model 键、预会话模式经 setProvisionalModel+onProvisionalModelSwitch、即时模式经 companion.model）。自动解析本身禁止写入记忆（记忆仅由显式选模型产生，见 FR-03）。

#### 场景：暂存选供应商自动带上次模型

- Given 会话空闲、模型下拉候选来自供应商 P（P 有候选 [m1, m2]，本地记忆 P→m2）
- When 用户在配置条点选供应商 P
- Then 暂存配置同时写入 llm_provider_id=P 与 model=m2（成对），模型显示值变为 m2

#### 场景：无记忆回退候选第一个

- Given 供应商 P 有候选 [m1, m2]、本地无 P 的模型记忆
- When 用户点选供应商 P
- Then 模型自动选中 m1 并随供应商成对进入暂存/载荷

#### 场景：记忆值已不在候选集

- Given 供应商 P 候选 [m1, m2]、本地记忆 P→m3（已下架）
- When 用户点选供应商 P
- Then 回退选中 m1（禁止选中不存在的 m3）

### FR-02: 模型下拉在选中具体供应商时不再提供「默认」选项；「不指定」态维持现状（模型选择隐藏即默认语义）

- 显示层供应商解析为具体供应商行（含会话 provider NULL 时引擎默认供应商的显示回退）时，模型下拉选项集合必须只含该供应商候选模型（追加越界快照模型兜底），禁止再渲染「默认（跟随供应商配置）」选项；「不指定/无供应商」态维持既有行为（模型下拉不渲染，即默认语义）。既有会话快照模型为空且候选非空时，显示值必须为 FR-01 的自动解析值（仅显示，不产生暂存）。

#### 场景：具体供应商下无默认选项

- Given 显示层供应商为具体供应商 P（候选 [m1, m2]）
- When 打开模型下拉
- Then 选项只有 m1、m2，不含「默认（跟随供应商配置）」

#### 场景：快照模型为空的显示回退

- Given 会话供应商 P 候选 [m1, m2]、会话快照 model 为空、无暂存
- When 渲染模型下拉
- Then 显示值展示自动解析值（记忆→第一个），select 存在对应 option；载荷不带 model（未暂存零变化）

### FR-03: 显式选模型时记忆 供应商→模型（localStorage）

- 用户显式选择模型（暂存/预会话/即时三模式的模型点选）时，必须把「生效供应商 id → 所选模型名」写入浏览器 localStorage（key 形如 `sh:last-model:<providerId>`），写入失败（隐私模式/容量）必须静默忽略不阻塞交互；读取必须容错（坏 JSON/缺键返回 null）。生效供应商 id 取显示层解析值（staged ?? 会话 provider ?? 引擎默认供应商 id）；「不指定（空串）」态不产生模型点选，无记忆写入面。

#### 场景：显式选模型写入记忆

- Given 显示层供应商 P、用户在模型下拉显式选择 m2
- When 点选生效
- Then localStorage `sh:last-model:P` = m2，后续 FR-01 自动解析可命中

#### 场景：读取容错

- Given localStorage 中 `sh:last-model:P` 为坏 JSON
- When 读取 P 的记忆
- Then 返回 null（不抛错），FR-01 回退候选第一个

### FR-04: 会话 provider NULL 时点选模型，暂存配置成对携带显示层供应商 id（engineDefaultProvider），发送载荷不再 422

- 会话 llm_provider_id 为 NULL（显示层回退引擎默认供应商）且无供应商暂存时，用户点选模型必须同时把显示层供应商 id（engineDefaultProvider.id）成对写入暂存配置（llm_provider_id 键），发送载荷携带 model+llm_provider_id 非空对——后端 inject 守卫（model_requires_provider）不再拒绝；预会话模式同样成对（onProvisionalSwitch 写 provider）。engineDefaultProvider 不存在或已显式暂存供应商时维持既有行为。buildStagedInjectOptions 既有 companion 回退保留为兜底。

#### 场景：provider NULL 点模型成对暂存

- Given 会话 llm_provider_id=NULL、引擎默认供应商 D 存在（候选含 deepseek-v4.1-flash）、无暂存
- When 用户点选模型 deepseek-v4.1-flash
- Then 暂存配置同时写入 llm_provider_id=D 与 model=deepseek-v4.1-flash，发送成功不再 422

#### 场景：已显式暂存供应商时不重复配对

- Given 暂存已有 llm_provider_id=P
- When 用户点选模型 m
- Then 仅写 model=m（不覆盖已有供应商暂存）

### FR-05: 发送失败（含 422）即时 toast 提示后端错误信息（面板三发送点位+悬浮窗两点位）

- 会话面板三个发送点位（handleSend/handleResend/sendToServerQueue）与悬浮窗两个发送点位（发送/排队）的 inject 失败路径，除既有横幅/排队条展示外，必须即时 notify.error 弹出后端错误消息（如「模型依赖供应商：选择模型时必须同时指定供应商。」）；既有横幅/占位轮回退/草稿保留行为零变化。

#### 场景：发送 422 即时可见

- Given 处于复现 422 的配置组合
- When 用户点发送
- Then 出现 toast 显示后端 message；面板顶部横幅照旧渲染（既有行为不回退）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「暂存选供应商自动带上次模型/无记忆取第一个/记忆越界回退第一个」
FR-02: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「具体供应商下模型下拉不含默认选项；快照模型空时显示自动解析值」
FR-03: test/frontend/src/lib/__tests__/model-memory.test.ts「remember/get 读写、坏 JSON 容错、缺键 null」
FR-04: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「provider NULL 点模型成对暂存 engineDefaultProvider；已有供应商暂存时不覆盖」
FR-05: test/frontend/src/components/daemon/session-panel/__tests__/page.test.tsx「发送失败 notify.error 即时可见（横幅照旧）」
