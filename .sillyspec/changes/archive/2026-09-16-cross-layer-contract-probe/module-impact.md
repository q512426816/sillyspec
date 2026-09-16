---
author: qinyi
created_at: 2026-09-16 12:45:00
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

- `src/verify-probes.js` 未匹配——verify 探针域实现文件（探针1-8+骨架），归 archive 定夺（独立成卡或并入 core-engine）
- `src/verify-postcheck.js` 未匹配——verify 门禁/一致性抽查域，归 archive 定夺
- `test/probe8-contract-pivot.test.mjs` 未匹配——探针8 契约维度测试，随实现文件归属

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 3 个未匹配文件（verify-probes.js/verify-postcheck.js/test 新文件）属 verify 探针域，现有模块卡无精确前缀归属（core-engine 为 CLI 核心域不匹配）——判定：archive 阶段按 rebuild 建议处理（verify 探针域是否独立成卡或并入 core-engine 由 archive 定夺，本次不抢跑） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
