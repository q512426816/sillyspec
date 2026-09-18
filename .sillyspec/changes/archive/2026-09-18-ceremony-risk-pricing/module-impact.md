# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/ceremony-tier.js | 新增 | 是（定价引擎核心，execute 评审已覆盖） |
| core-engine | src/review-tier.js | 调用关系变更 | 是（委托引擎） |
| core-engine | src/run/gates.js | 逻辑变更 | 是（升档块+双跑/影子接线） |
| core-engine | src/verify-postcheck.js | 逻辑变更 | 是（双跑检查段） |
| core-engine | src/run/complete-handlers.js | 逻辑变更 | 否（archive 出口警告段） |
| stages | src/stages/plan.js | 配置变更（prompt 文案） | 否 |
| stages | src/stages/brainstorm.js | 配置变更（prompt 文案） | 否 |
| stages | src/run/prompt.js | 逻辑变更 | 否（档位注入渲染） |
| core-engine | src/config-schema.js | 配置变更 | 否（两新键） |
| runtime | src/doctor-diagnostics.js | 逻辑变更 | 否（第 15 维度） |
| sync | src/review-dispatch.js | 逻辑变更 | 是（影子派发框架） |
| core-engine | test/ceremony-tier.test.mjs | 新增 | 否 |
| core-engine | test/stage-review.test.mjs | 逻辑变更 | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/ceremony-tier.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/review-tier.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/run/gates.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/verify-postcheck.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/run/complete-handlers.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/stages/plan.js` → stages（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/stages/brainstorm.js` → stages（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/run/prompt.js` → stages（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/config-schema.js` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `src/doctor-diagnostics.js` → runtime（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `test/ceremony-tier.test.mjs` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）
- `test/stage-review.test.mjs` → core-engine（骨架生成时主仓索引早于 a4029fa 登记/apply 回传——现 map 已覆盖，非游离文件）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已登记 src/ceremony-tier.js → core-engine（worktree a4029fa + apply 回传主仓生效） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
