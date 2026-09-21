# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | `src/review-material-pack.js` | 新增（assembleExecuteTaskMaterials 纯增量导出） | 否（additive，无既有签名变更） |
| stages | `src/stages/plan.js` | 逻辑变更（stepGeneratePlan 并批三行 prompt 文本） | 否（文本追加） |
| stages | `src/stages/plan-postcheck.js` | 新增（checkBatchAdvisory 纯增量 advisory） | 否（fail-open，阻断面零变化） |
| stages | `src/stages/execute.js` | 逻辑变更（buildWavePrompt 材料包行+派发契约注入） | 否（对账真相源零触碰，diff grep 实证） |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `test/plan-batch-advisory.test.mjs` → stages 共位测试（测 plan-postcheck checkBatchAdvisory），不属模块索引缺口
- `test/execute-materials.test.mjs` → core-engine/stages 共位测试（测 assembleExecuteTaskMaterials+注入行），不属模块索引缺口
- `test/dispatch-contract.test.mjs` → stages 共位测试（文本钉），不属模块索引缺口
- `test/probe-suite/wrong-key.fixtures.mjs` → verify-probes 资产类测试（新目录），不属模块索引缺口
- `test/probe-suite/wrong-key.test.mjs` → 同上
- `docs/prompt/plan.md` → stages 机械镜像（_extract.mjs 产物），不属模块索引缺口
- `docs/prompt/execute.md` → stages 机械镜像，同上
- `docs/prompt/_extracted.json` → 机械提取产物，同上

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 已增补 assembleExecuteTaskMaterials 行为行（两段式装配/稳定段先行/超限截尾） | done |
| `modules/stages.md` | 已增补 R5 第 1 批三行为段（并批默认/材料包/派发契约）+ changelog sidecar | done |
| `_module-map.yaml` | 未匹配文件全为共位测试/机械镜像（上方逐条判定），模块索引无需增改 | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
