# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| runtime | `src/run/gate-snapshot-ledger.js` | 新增（账本模块：账本读写+双守卫+TTL×pid 三态判定+双清回收，七导出） | 是（execute 独立审查已过） |
| runtime | `src/run/gate-snapshot.js` | 逻辑变更+接口新增（cleanupSnapshot 可注入清理体；createGateSnapshot 加 runtimeRoot 可选形参；建快照前回收接线；create 登记/cleanup 与失败 catch 双清确认销账；根因修正：worktree remove --quiet 非法 flag 除尽） | 是（execute 独立审查已过） |
| runtime | `src/run/quick-audit.js` | 调用关系变更（createGateSnapshot 调用点透传 resolveRuntimeRoot(null,specBase)，一行接线） | 是（同上） |
| core-engine | `src/doctor-diagnostics.js` | 新增+逻辑变更（detectGateSnapshotLeak + gate_snapshot_leak 维度末尾追加；runtimeRoot 走平台指针同源） | 是（同上） |
| runtime | `test/gate-snapshot-lifecycle.test.mjs` | 新增（账本/守卫/判定/回收/真实临时仓集成/doctor 三态，24 例） | 否 |
| runtime | `test/gate-snapshot-cleanup.test.mjs` | 新增（cleanup 故障注入 4 例） | 否 |
| runtime（文档） | `.sillyspec/docs/sillyspec/modules/runtime.md` + `runtime.changelog.md` | 逻辑变更（模块卡与变更索引补账本与自愈机制摘要） | 否 |
| docs-consistency | `docs/sillyspec/file-lifecycle.md`、`docs/sillyspec/platform-interface-map.md` | 逻辑变更（新运行时文件+账本路径登记；14 处行号锚机械重锚——并行会话 97454a6f 漂移） | 否 |
| —（工具链） | `package.json` | 配置变更（test:core 纳入两份新测试） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/run/gate-snapshot-ledger.js` <!--TODO: 归属判定--> → runtime 模块（paths 含目录前缀 `src/run/`，骨架前缀匹配未展开目录前缀所致；lint module-map 覆盖全通过，索引无需增改）
- `src/run/gate-snapshot.js` <!--TODO: 归属判定--> → 同上（runtime；模块卡 runtime.md 既有 M2 段已认领本文件）
- `src/doctor-diagnostics.js` <!--TODO: 归属判定--> → core-engine（paths 明列 `src/doctor-diagnostics.js`；骨架判未匹配系生成时点差异）
- `test/gate-snapshot-lifecycle.test.mjs` <!--TODO: 归属判定--> → runtime（测试面随实现模块；test/ 不在模块 paths 约定内）
- `docs/sillyspec/file-lifecycle.md` <!--TODO: 归属判定--> → docs-consistency（文档面，惯例不入模块 paths）
- `package.json` <!--TODO: 归属判定--> → 工具链根文件，惯例不入模块 paths

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无需增改：`src/run/` 目录前缀已覆盖两份 run 模块文件，`src/doctor-diagnostics.js` 在 core-engine 明列；lint「module-map 覆盖全」通过（新增 ledger 文件零未覆盖）。骨架「未匹配」为目录前缀未展开的生成侧假阳 | done |
| `runtime.md` / `runtime.changelog.md` | execute task-05 已补账本与自愈机制摘要（随归档终校） | done |
| `docs/sillyspec/file-lifecycle.md` | 已登记 src/run/gate-snapshot-ledger.js 与账本路径（frontmatter updated_at 同步） | done |
