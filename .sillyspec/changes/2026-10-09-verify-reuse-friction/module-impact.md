# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| cli-entry | `src/index.js` | 逻辑变更 | 否——wt-commit 推断内部化，回归 test/wt-commit-crossrepo-infer |
| core-engine | `src/verify-postcheck.js` | 逻辑变更+接口变更（additive） | 是——trace per-repo 解析/观测穿参/跨仓窗口，回归 crossrepo-row-resolution+observability |
| core-engine | `src/test-bindings.js` | 数据结构变更（additive repo 字段） | 否——存量行零迁移，回归 normalizeRow 用例 |
| core-engine | `src/cross-repo-reconcile.js` | 逻辑变更（B' 档新锚点） | 是——回归 cross-repo-reconcile-baseline-anchor |
| runtime | `src/run/code-face-key.js` | 新增 | 是——两指纹消费方，回归 code-face-key-doc-commit-survival |
| runtime | `src/run/green-cache.js` | 逻辑变更（指纹树键化+re-export） | 否——签名不变，回归 green-cache 5 用例 |
| runtime | `src/run/verify-quality-scan.js` | 逻辑变更+接口变更（additive store 参数） | 是——死循环断根+观测，回归 reuse-actual-scope+observability |
| runtime | `src/run/gates.js` | 逻辑变更（门序前移+可见性） | 是——回归 gates-verify-cheap-gates-first+smoke-gate |
| runtime | `src/friction-tally.js` | 配置变更（枚举 +1） | 否——回归 friction 1 用例 |
| worktree | `src/wt-commit.js` | 逻辑变更（目标定向） | 是——回归 wt-commit-crossrepo-infer |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `test/verify-quality-scan-reuse-actual-scope.test.mjs` <!--TODO: 归属判定-->
- `test/gates-snapshot-fallback-visibility.test.mjs` <!--TODO: 归属判定-->
- `test/code-face-key-doc-commit-survival.test.mjs` <!--TODO: 归属判定-->
- `test/verify-test-result-reuse-observability.test.mjs` <!--TODO: 归属判定-->
- `test/gates-verify-cheap-gates-first.test.mjs` <!--TODO: 归属判定-->
- `test/test-bindings-crossrepo-row-resolution.test.mjs` <!--TODO: 归属判定-->
- `test/cross-repo-reconcile-baseline-anchor.test.mjs` <!--TODO: 归属判定-->
- `test/wt-commit-crossrepo-infer.test.mjs` <!--TODO: 归属判定-->

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | 更新cli-entry模块卡（本次变更涉及） | pending |
| `modules/core-engine.md` | 更新core-engine模块卡（本次变更涉及） | pending |
| `modules/runtime.md` | 更新runtime模块卡（本次变更涉及） | pending |
| `modules/worktree.md` | 更新worktree模块卡（本次变更涉及） | pending |
| `_module-map.yaml` | <!--TODO: 有未匹配文件，判定模块索引是否需增改（modules rebuild）--> | pending |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
