---
author: flow-machine-draft
created_at: 2026-11-26T00:16:56.841Z
---
# 需求规格（Requirements）— 2026-11-26-verify-skip-switch

## 功能需求

### FR-01: local.yaml 配置 verify.mode: skip 时，run verify 不渲染 7 步提示词、不产出 verify-result.md 与 verify-facts.json，并打印跳过留痕

- 当 local.yaml 配置 `verify.mode: skip` 时，`sillyspec run verify` **必须** 不渲染任何步骤提示词、不产出 `verify-result.md` / `verify-facts.json`，并 **必须** 打印一行跳过留痕（含跳过原因与恢复方式）。
- 跳过时 verify 阶段的全部步骤与阶段本身 **必须** 被标记为 completed，使 `run archive` 可直接进入。

#### 场景：skip 档进入 verify
- Given 仓内 local.yaml 含 `verify: { mode: skip }`
- When 执行 `sillyspec run verify --change <名>`
- Then 输出跳过留痕，verify 阶段 completed，变更目录不新增任何 verify 产物

#### 场景：skip 档重复进入
- Given verify 阶段已因 skip 被标记 completed
- When 再次执行 `sillyspec run verify --change <名>`
- Then 按既有「阶段已完成」守卫返回，不重复输出、不报错

### FR-02: 缺省未配置时，run verify 行为与现状逐字一致

- 未配置 `verify.mode`（或值不是 `skip`）时，`sillyspec run verify` 的步骤渲染、产物要求与门禁行为 **必须** 与现状逐字一致，不得新增任何提示。

#### 场景：缺省 full
- Given local.yaml 无 `verify.mode` 键
- When 执行 `sillyspec run verify --change <名>`
- Then 渲染第一步提示词，行为与变更前一致

### FR-03: skip 模式下 archive 不因 verify-facts.json 缺失被 fail-closed 拦下

- 当 `verify.mode: skip` 时，verify 完成门与 archive 完成门 **必须** 不因 `verify-facts.json` 缺失触发 factsExpected fail-closed；结论封顶相关判定 **必须** 按「无事实面」跳过（等价存量兼容口径）。

#### 场景：skip 后归档
- Given 变更未产出 `verify-facts.json` 且 local.yaml 为 skip 档
- When 执行 `sillyspec run archive --change <名>`
- Then factsExpected 判定为 false，不出现 `[pass-eligibility] verify-facts.json 缺失` 类阻断

### FR-04: 新增开关的单元测试覆盖 skip/full 两态

- 开关读取、阶段跳过判定、factsExpected 口径、next 推断 **必须** 具备单元测试，分别覆盖 skip 与 full 两态。

#### 场景：两态测试
- Given 测试临时仓分别写入 skip / 缺省配置
- When 调用对应纯函数
- Then skip 返回跳过语义、缺省返回现行语义

## 测试绑定

FR-01: test/verify-skip-mode.test.mjs「shouldSkipVerify skip 档为 true 并渲染留痕」
FR-02: test/verify-skip-mode.test.mjs「缺省/非 skip 值为 false」
FR-03: test/verify-skip-mode.test.mjs「resolveFactsExpected skip 档为 false」
FR-04: test/verify-skip-mode.test.mjs「skip/full 两态与 next 推断」
