# 模块影响分析 — 2026-09-23-sentinel-rules（plan 审查步首版）

> 归属按 _module-map.yaml paths 前缀匹配；影响类型为语义判断。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| sync | `src/watcher.js` | 逻辑变更+新增（快照四源扩展+规则引擎+回补+接线，additive） | 是（观测旁路承重文件，规则误报面） |
| sync | `src/sentinel-assertions.js` | 新增（L0 纯函数，本批无调用方） | 否（纯函数+单测） |
| runtime | `src/run/command.js` | 调用关系变更（runAutoMode 头部 spawnWatcher 单块，避 1727/2073 冲突带） | 是（并行会话 A 同文件） |
| sync | `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 配置变更（sync paths 补录 sentinel-assertions.js） | 否 |
| sync | `test/sentinel-rules.test.mjs` | 新增（fixture 纯函数测试，零 CLI 依赖） | 否 |

## 未匹配文件

无——五条变更文件全部命中 sync/runtime 模块（test 文件按 sync 模块测试面认领）。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| W1 实际 diff（c5f42270 watcher.js +97、97f6f5b5 command.js +20） | 与首版矩阵一致（sync 逻辑变更+新增 / runtime 调用关系变更），无未预期文件 | ✅ W1 核对 |
| sync 模块卡（modules/sync.md） | 归档时按 delta 更新（哨兵规则引擎注记） | 归档步执行 |
| runtime 模块卡（modules/runtime.md） | runAutoMode 挂点一行注记 | 归档步执行 |
