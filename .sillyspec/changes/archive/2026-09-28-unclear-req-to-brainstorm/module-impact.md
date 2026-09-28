---
author: t
created_at: 2026-09-28 18:06:30
---

# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| cli-entry | `src/flow.js` | 逻辑变更（W2 实况：新建路径前门自检段渲染＋hindsight 提示注入＋start/adopt/resume 首版快照锚点＋done 收口指标接线；adopt/resume 渲染面零变化、清晰度门逐字不动） | 是（flow.js 属协议入口，评审已重点核对 adopt/resume 不回归） |
| runtime | `src/run/complete.js` | 逻辑变更（W2 实况：brainstorm 方案步 --done 挂 knowledge-gate 检索命中回显——warn 不阻断、fail-open；复用 matchKnowledge 零新匹配逻辑） | 否 |
| setup | `src/config-schema.js` | 配置变更（W2 实况：commands 域新增 knowledge-gate 布尔开关条目，schema 数据面增量） | 否 |
| stages | `src/stages/brainstorm.js` | 逻辑变更（W1 实况：Step4/Step5 指引模板插入机制词检索固定动作——纯渲染文案，无逻辑/签名改动） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/route-hindsight.js` 新增（W1 实况）：flow 轻量道新模块——封闭面指标/阈值/快照/落库/读取五导出；建议 modules rebuild 时归入 cli-entry 或独立 hindsight 模块（本变更不动 _module-map.yaml）
- `test/route-hindsight.test.mjs` 新增（W1 实况）：上者的单测（8 用例），与源文件同归属
- `templates/agents-instruction.md` 纯文案改写（W2 实况）：选道表前提式＋负面信号举例标注＋速查行检索改写；传播靠版本 bump 的 init 感知刷新，非运行时读取
- `package.json` 配置变更（W2 实况）：version 3.30.0→3.31.0（唯一改动键；scripts/依赖零变化）
- `test/flow-clarity-probe.test.mjs` 新增（W2 实况）：task-03 单测（6 用例含端到端 FR-02 回路），与 src/flow.js 同域
- `test/design-knowledge-check.test.mjs` 新增（W2 实况）：task-04 单测（5 用例＋task-02 指引文案在场断言），与 src/run/complete.js 同域

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | 不更新卡正文（cli-entry/stages 两卡已超 16KB 预算——CLI 本轮提示应 split-changelog 迁出历史段；本变更条目待迁出后随 sidecar 归档，勿再堆卡正文） | skipped |
| `modules/runtime.md` | 不更新（complete.js 改动为增量 gate 挂点，无接口/契约变化；卡正文语义未变） | skipped |
| `modules/setup.md` | 不更新（config-schema 仅新增一条 commands 键登记，schema 自描述；setup 卡契约摘要未变） | skipped |
| `modules/stages.md` | 不更新卡正文（同 cli-entry 超预算理由；Step4/5 指引文案变化属渲染细节非契约） | skipped |
| `_module-map.yaml` | 有未匹配文件（route-hindsight 及三个新测试），判定：本变更不改模块索引（src/route-hindsight.js 归属建议留给下次 modules rebuild——单文件新增不构成重建理由） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
