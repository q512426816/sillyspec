---
author: qinyi
created_at: 2026-09-11 10:33:00
---

# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| runtime | src/run/gates.js | 调用关系变更（回滚路径加 friction 尾参+record，判定逻辑零改动） | 否（QA 独立审查过） |
| runtime | src/run/verify-quality-scan.js | 逻辑变更（失败判定处插 record，throw 语义不变） | 否 |
| runtime | src/run/complete-handlers.js | 逻辑变更（quick 两失败分支 record + 收尾 consume + prune 清单） | 否 |
| runtime | src/run/complete.js | 逻辑变更（verify 双收尾点 consume） | 否 |
| runtime | src/friction-tally.js（新增） | 新增 | 否（纯旁路 advisory，Grill 已独立审查） |
| setup | src/config-schema.js | 配置变更（注册 friction_hint.enabled 键） | 否 |

> CLI 前缀匹配本批全部漏判进「未匹配文件」（src/run/ 实为 runtime paths 已有条目）——归属已按 _module-map.yaml 人工回填上表；影响类型按 execute 实际 diff 回填。

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `test/friction-tally.test.mjs` —— 测试文件，按仓例不入模块索引，游离正常
- `docs/sillyspec/file-lifecycle.md` —— 文档文件，按仓例不入模块索引，游离正常

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/runtime.md` | 新增 friction-tally 职责段（task-07） | done |
| `_module-map.yaml` | runtime paths 增补 src/friction-tally.js（task-07） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
