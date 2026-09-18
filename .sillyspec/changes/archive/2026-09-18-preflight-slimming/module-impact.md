# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/run/prompt.js` → stages（prompt 渲染核心，收尾 quick 补卡）（骨架生成早于 module-map 增量登记——非游离）
- `src/run/command.js` → cli-entry（骨架生成早于 module-map 增量登记——非游离）
- `src/run/complete.js` → runtime（骨架生成早于 module-map 增量登记——非游离）
- `src/index.js` → cli-entry（骨架生成早于 module-map 增量登记——非游离）
- `src/run/complete-handlers.js` → runtime（骨架生成早于 module-map 增量登记——非游离）
- `src/decisions-io.js` → core-engine（骨架生成早于 module-map 增量登记——非游离）
- `src/stages/brainstorm.js` → stages（骨架生成早于 module-map 增量登记——非游离）
- `src/stages/plan.js` → stages（骨架生成早于 module-map 增量登记——非游离）
- `src/stages/execute.js` → stages（骨架生成早于 module-map 增量登记——非游离）
- `templates/prompts/taskcard-rules.md` → docs-consistency（骨架生成早于 module-map 增量登记——非游离）
- `docs/prompt/brainstorm.md` → docs-consistency（骨架生成早于 module-map 增量登记——非游离）
- `docs/prompt/plan.md` → docs-consistency（骨架生成早于 module-map 增量登记——非游离）
- `docs/prompt/_extracted.json` → docs-consistency（骨架生成早于 module-map 增量登记——非游离）
- `test/preflight-slimming.test.mjs` → core-engine（骨架生成早于 module-map 增量登记——非游离）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 全部清单文件已登记（runtime/stages/core-engine/cli-entry/docs-consistency paths 覆盖 14/14） | done（同步已落：runtime/stages 模块卡待收尾 quick 补「注入分叉/wait 盖章」摘要；_module-map 已含全部清单文件路径登记） |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
