---
author: qinyi
created_at: 2026-09-23T00:28:30
generated_by: sillyspec-plan-postcheck
---

# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| cli-entry | `src/flow.js` | 配置变更（readFlowConfig 缺省 thin→legacy 两处+三处文案；签名/返回结构零变化，D-010@v2） | no |
| runtime | `src/run/shared.js` | 新增（readStageBurst export + STAGE_BURST_STAGES 常量，D-001/D-007/D-012） | no |
| runtime | `src/run/stage.js` | 逻辑变更（burst 渲染分支+两助手抽取：executeNoAiCliAction/finalizeStageAllStepsDone 原样搬运，D-002/D-008） | no |
| runtime | `src/run/complete.js` | 新增（completeStepBurst export——循环包装；completeStep 本体零 diff，D-003@v2） | no |
| runtime | `src/run/command.js` | 调用关系变更（:1727/:2073 两处 --done 分发按 burst 门改调 completeStepBurst；auto 路径跳过预合成） | no |
| setup | `src/config-schema.js` | 配置变更（flow.mode desc 文案同步 legacy 缺省，零行为） | no |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `test/flow-protocol.test.mjs` 测试文件：module-map 仅覆盖 src/（test/check-syntax.mjs:122-136 覆盖检查只对 srcFiles），test 文件本就不入模块索引——非游离、非过期
- `test/flow-route.test.mjs` 同上
- `test/flow-draft.test.mjs` 同上
- `test/stage-burst.test.mjs` 同上（NEW，本变更新建）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | burst 注记行补（flow 缺省翻 legacy，协议面零改动） | done |
| `modules/runtime.md` | burst 注记行补（burst 门+renderStageBurst+两助手+completeStepBurst+两处接线+readStageBurst/白名单常量） | done |
| `modules/setup.md` | burst 注记行补（flow.mode desc 缺省语义更新，无新键） | done |
| `_module-map.yaml` | 无未匹配 src 文件、无路径增删——零改动（未匹配项全为 test 文件，不入索引） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
