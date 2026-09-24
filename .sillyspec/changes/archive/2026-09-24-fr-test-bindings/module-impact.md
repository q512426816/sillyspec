---
author: qinyi
created_at: 2026-09-24 13:06:00
---

# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/test-bindings.js：新增——行模型+两真源读写/晋升/取代/视图（D-002 单点解析）。` <!--TODO: 归属判定-->
- `src/verify-probes.js` <!--TODO: 归属判定-->
- `src/verify-postcheck.js` <!--TODO: 归属判定-->
- `src/stage-contract.js` <!--TODO: 归属判定-->
- `src/fr-index.js` <!--TODO: 归属判定-->
- `src/index.js` <!--TODO: 归属判定-->
- `test/test-bindings.test.mjs：新增——基座/CLI/写点/提升全链单测。` <!--TODO: 归属判定-->

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已补录 src/test-bindings.js → core-engine 模块 paths（lint module-map 覆盖全校验过） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
