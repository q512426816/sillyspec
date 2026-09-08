---
author: qinyi
created_at: 2026-09-08T23:30:00+08:00
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

- `src/verify-probes.js` core-engine（map 命中，首版生成时点索引快照滞后误列——已核 map 在场）
- `NEW:src/verify-facts-schema.js` core-engine（task-06 已补进 map paths）
- `src/verify-postcheck.js` core-engine
- `src/change-risk-profile.js` core-engine
- `src/stage-contract.js` core-engine
- `src/run/gates.js` runtime
- `src/index.js` cli-entry
- `src/progress.js` progress
- `src/stages/verify.js` stages
- `NEW:test/verify-facts-v2.test.mjs` core-engine（测试随源）
- `test/verify-probes-facts.test.mjs` core-engine（测试随源）
- `NEW:test/verify-evidence-triple.test.mjs` core-engine（测试随源）
- `NEW:test/verify-receipt-rerun.test.mjs` core-engine（测试随源）
- `docs/prompt/verify.md` stages（提示词镜像）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已增 verify-facts-schema.js 归 core-engine paths（task-06） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
