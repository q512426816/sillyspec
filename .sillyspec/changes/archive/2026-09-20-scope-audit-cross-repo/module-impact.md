# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/cross-repo-reconcile.js | 接口变更（新增导出 collectRepoActual；reconcileCrossRepoDeclarations 签名增量可选参+返回增量 anchor 字段） | 否（execute stage review 8/8 pass） |
| core-engine | src/scope-audit.js | 接口变更（--json 契约 v2：rows 跨仓行真实三态+信封 repos[]，additive）+ 逻辑变更（跨仓分仓对账/settled 快照语义） | 否（同上；单仓逐字节等价实证） |
| core-engine | src/verify-postcheck.js | 调用关系变更（reconcile 调用点传参贯通）+ 逻辑变更（notes 锚点档动态化） | 否 |
| runtime | src/run/gates.js | 逻辑变更（printCrossRepoReconcile 明细行补锚点档标签，纯渲染） | 否 |
| cli-entry | src/index.js | 配置变更（scope-audit 帮助文案两句，:119/:1422） | 否 |
| core-engine | test/scope-audit-cross-repo.test.mjs | 新增（专项测试 12 用例） | 否 |
| core-engine | test/scope-audit.test.mjs | 逻辑变更（「改进点 2」用例断言按行为升级：degraded ⊘ 兼容+可达仓真实三态新断言） | 否（AGENTS 规则 11 核对：断言目标=跨仓不恒 untouched 的本意，非凑绿） |
| core-engine（模块文档本体） | .sillyspec/docs/sillyspec/modules/core-engine.md | 文档变更（task-05 同步：内核条目补录/对外接口扩写 repos[] 与 --file 跨仓路由） | 否（doc-ref-check 88 引用全过） |
| core-engine（FR 索引，归档 Step1 CLI 机械产） | .sillyspec/knowledge/fr/core-engine.md | 配置变更（FR-core-engine-032~038 七条发号入库，CLI 幂等写入） | 否（CLI 机械执行） |

### 终审裁决（archive Step2 三重核对差异）
- `.claude/CLAUDE.md`（diff 有而矩阵未列）：并行会话在途文件，非本变更产出——不补矩阵（真实 > 记录：他者归属，本变更 pathspec 不含）。
- `src/run/complete-handlers.js`、`asset-audit-*` 等 verify 期漂移文件：同上，并行会话产物（verify 输出已注记 drift 22 文件 advisory），非本变更面。
- `_module-map.yaml`（矩阵更新结果列而 diff 无）：裁决=**无需改动**（终审前已逐行核实全部 src 变更文件在既有模块 paths 内）——更新结果表该行语义为「核对后确认无需增改」，与 diff 无 _module-map.yaml 改动**一致**，非遗漏。

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/cross-repo-reconcile.js` → 实际已归属 core-engine（_module-map.yaml core-engine.paths 显式含本文件——CLI 前缀匹配漏归类，索引不缺）
- `src/scope-audit.js` → 同上，core-engine.paths 显式含本文件
- `src/verify-postcheck.js` → 同上，core-engine.paths 显式含本文件
- `src/run/gates.js` → 实际已归属 bin（bin.paths 含 src/run/gates.js）
- `src/index.js` → 实际已归属 cli-entry（cli-entry.paths 含 src/index.js）
- `test/scope-audit-cross-repo.test.mjs` → 游离文件（test/ 不入模块索引——仓内惯例测试不映射模块）
- `test/scope-audit.test.mjs` → 同上（既有测试文件，本就未映射）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无需增改：全部 src 变更文件已在既有模块 paths 内（上节逐行核实）；test/ 按惯例不入索引。core-engine.md 模块文档已同步（task-05：内核四档锚点/repos[] 信封/--file 跨仓路由/对外接口节扩写） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
