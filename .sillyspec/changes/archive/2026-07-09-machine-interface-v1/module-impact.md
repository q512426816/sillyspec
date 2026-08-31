---
author: qinyi
created_at: 2026-07-09T14:15:00+08:00
---

# 模块影响分析（Module Impact）— 机器接口 v1（gate/derive 子命令）

## 概述

本变更为 SillyHub driver 模式提供机器接口层：把 SillySpec 门控与事实核验从人类可读输出流抽象成可程序化消费的 JSON envelope + 退出码契约。新增 `gate`/`derive` 子命令 + 平台 approve/reject 真实实现 + workflow-runs runtimeRoot 透传。

真实改动文件（git diff `feat/machine-interface-v1` d14432c vs main）：**8 个**（3 新增 + 5 修改）。

## 三重交叉验证

| 来源 | 文件集 | 一致性 |
|---|---|---|
| 声明范围（design §5 文件变更清单） | 9 文件（含 src/run.js） | design 列了 run.js，但 task-06 透传已存 baseline（实际 git diff 不含 run.js） |
| 任务范围（plan.md + tasks/task-NN.md allowed_paths） | machine-interface.js / index.js / sync.js / interface-contract.md / test / file-lifecycle* / run.js | 与声明一致（run.js 在 task-06 allowed_paths 但代码已存 baseline） |
| 真实变更（git diff） | 8 文件：src/machine-interface.js(新)、src/index.js、src/sync.js、docs/sillyspec/interface-contract.md(新)、docs/sillyspec/file-lifecycle.md、file-lifecycle/known-implementation-gaps.md、file-lifecycle/platform-workflows-sync.md、test/machine-interface.test.mjs(新) | **以此为准** |

**偏差**：design §5 列了 src/run.js（task-06），但透传代码已存在于 baseline commit 80b7825，本变更 git diff 不含 run.js（task-06 为验证型 low_risk）。已在 verify-result.md 记录。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|---|---|---|---|---|
| cli-entry | 接口变更 + 调用关系变更 | src/index.js | switch(command) 新增 case 'gate'/'derive' 顶层路由；新增 withJsonOutput helper（--json 模式劫持 console.log→stderr）；process.exit→process.exitCode（修 Windows UV_HANDLE_CLOSING assertion 覆盖退出码）；usage 增 gate/derive 说明 | false |
| machine-interface（**新增模块**） | 新增 | src/machine-interface.js | 新模块：gate（聚合门控 runGate）/ derive（单项事实核验 runDerive）/ buildEnvelope / 退出码 0/1/2 常量；复用 stage-contract/task-review/verify-postcheck 既有策略引擎（只聚合不新增校验）；只读语义 D-002；execute-evidence 单次调用去重 D-008；异常兜底合法 JSON | true（新模块，建议加入 _module-map.yaml + 生成模块卡片，见下文建议） |
| sync（platform 对接） | 逻辑变更 | src/sync.js | approve/reject stub 替换为真实实现（_submitApproval：HTTP POST + approvals 表 + fail-visible exit1 + TBD-hub-api 单点封装）；修复 parseSimpleYaml 行78 缩进判断 pre-existing bug（用原始 line 而非 trimmed，platform 段恒空致所有平台命令失效） | true（sync 模块未在 _module-map，建议补充映射） |
| runtime（间接影响） | 调用关系变更 | —（未直接改 src/run.js） | task-06 saveWorkflowRun 透传 runtimeRoot/scanRunId 已存 baseline；machine-interface 复用 run.js:3223-3249 的 validateTaskReviews 参数组装范式 | false |

## 未匹配文件

以下文件未匹配到 _module-map.yaml 既有模块（文档/测试非模块代码；或新模块待映射）：

| 文件 | 类型 | 说明 |
|---|---|---|
| docs/sillyspec/interface-contract.md | 新增文档 | v1 契约冻结（SillySpec↔SillyHub 对账基准），非模块代码 |
| docs/sillyspec/file-lifecycle.md | 文档修改 | 新增「机器接口（gate/derive）」小节 + 修正 workflow-runs runtimeRoot 过时表述 |
| docs/sillyspec/file-lifecycle/known-implementation-gaps.md | 文档修改 | 移除已补齐的 platform approve/reject + workflow-runs runtimeRoot 两缺口 |
| docs/sillyspec/file-lifecycle/platform-workflows-sync.md | 文档修改 | approve/reject 真实 HTTP 流转 + workflow-runs 平台模式落盘路径 |
| test/machine-interface.test.mjs | 新增测试 | 8节96断言覆盖验收 1-7（非模块代码） |

## 建议（供 doc-syncer 第 3 步参考）

1. **machine-interface 新模块**：建议加入 `_module-map.yaml`（status: active, doc: modules/machine-interface.md, needs_review: false）并生成模块卡片 `modules/machine-interface.md`（entrypoints: src/machine-interface.js；main_symbols: runGate / runDerive / buildEnvelope / FACETS / EXIT_OK/BLOCKED/UNKNOWN / SCHEMA_VERSION；职责：SillyHub driver 模式的机器接口层，只读聚合既有策略引擎）。
2. **sync 模块**：当前 _module-map 未含 sync；本变更实质性更新了 sync.js（approve/reject + parseSimpleYaml 修复）。建议补充 sync 模块映射（platform 对接：connect/sync/approve/reject）或归入既有 platform 相关模块。

## 风险与回退

- **纯增量**（NFR-02）：gate/derive 是新子命令，不触碰 run/progress 存量行为与输出格式；非平台模式 saveWorkflowRun 落盘路径与现状一致。
- **回退路径**：删除 machine-interface.js + index.js 的 gate/derive 路由分支即可完全回退，无数据迁移。
- **parseSimpleYaml 修复**影响所有读 platform 配置的命令（sync/syncDocuments/checkApproval/approve/reject）——修复前全部失效（platform.url undefined），修复后可用；全量 npm test 确认不破坏存量。
