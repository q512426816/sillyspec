# 模块影响分析 — 2026-09-23-sentinel-rules（plan 审查步首版）

> 归属按 _module-map.yaml paths 前缀匹配；影响类型为语义判断。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| sync | `src/watcher.js` | 逻辑变更+新增（快照四源扩展+四规则引擎+水位回补+循环接线，additive） | 是（观测旁路承重文件，规则误报面） |
| sync | `src/sentinel-assertions.js` | 新增（L0 纯函数，本批无调用方） | 否（纯函数+单测） |
| runtime | `src/run/command.js` | 调用关系变更（runAutoMode 头部 spawnWatcher 单块，避 1727/2073 冲突带） | 是（并行会话 A 同文件） |
| sync | `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 配置变更（sync paths 补录 sentinel-assertions.js） | 否 |
| sync | `test/sentinel-rules.test.mjs` | 新增（fixture 纯函数测试，零 CLI 依赖） | 否 |
| docs-consistency | `docs/sillyspec/platform-interface-map.md` | 修复（command.js 行号锚 2042/1984/2064→2064/2118/2198——本变更插入 20 行致漂移，doc-ref 硬门实测驱动） | 否 |
| sync | `.sillyspec/knowledge/fr/sync.md` | 配置变更（CLI 决策提炼步 FR 索引发号 FR-sync-012~020 入库，归档产物） | 否 |

## 未匹配文件

以下 diff 文件经裁决为本变更无涉（并行会话产物/环境噪声），不入模块矩阵：
- `.idea/vcs.xml`、`package.json`——并行会话在途文件（execute 启动时已知 36 个非本变更未提交文件之二，非本变更 allowed_paths）
- `.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md`——非本变更触碰（本变更 allowed_paths 五文件面外；归档核对时点主仓工作树的并行会话改动）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| W1 实际 diff（c5f42270 watcher.js +97、97f6f5b5 command.js +20） | 与首版矩阵一致（sync 逻辑变更+新增 / runtime 调用关系变更），无未预期文件 | ✅ W1 核对 |
| 归档三重核对（diff 10 文件 vs 矩阵） | 5 差异逐项裁决：platform-interface-map.md=本变更 doc-ref 修复入矩阵；fr/sync.md=CLI FR 索引归档产物入矩阵；.idea/vcs.xml+package.json+scan/ARCHITECTURE.md=并行会话/环境噪声入「未匹配文件」裁决段 | ✅ done |
| `_module-map.yaml: sync` | paths 补录 src/sentinel-assertions.js（task-06 已落，apply 已回主仓） | ✅ done |
| `modules/sync.md` | 职责节增 L1 哨兵段（watcher 四源+四规则+水位回补+L0 函数注记+测试锚） | ✅ done |
| `modules/runtime.md` | runAutoMode 挂点为单块调用接线、无契约面变化——内部实现变化不更新卡片 | skipped |
