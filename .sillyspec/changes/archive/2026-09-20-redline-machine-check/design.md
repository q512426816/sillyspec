---
author: zcode-redline-framework
created_at: 2026-09-20 00:16:50
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-20-redline-machine-check

## 背景

2026-09-19 双实现对撞实验的核心教训：语义级设计红线（「已结束会话不得假运行」R-03、「用量归属不得后写覆盖」）活在历史 design/knowledge 散文里，没有任何机器可查的形态——主线版两处失分（running 编码踩 R-03、宽松归属被自家测试固化成契约）在三层独立评审 + 352 例测试下全部漏网，靠事后人工逐文件深读才发现。门禁保下限不保上限；上限缺一双机器的眼睛。本变更把这双眼睛补上：红线断言清单 + verify 探针。

## 设计目标

1. 语义红线获得机器可查形态：`.sillyspec/redlines.yaml` 条目（forbid/require 正则 × scope glob × severity × origin 文档锚）。
2. verify 期自动核验：探针 11 逐条评估，forbid 命中出 ❌ 行（file:line）、require 缺失出 ⚠️ 行，进 verify-result 骨架供裁定。
3. 零打扰：缺清单 = 不适用；坏清单/求值异常 fail-open 不炸 verify 主链。
4. 机制与内容分离：sillyspec 只供机制，清单消费者仓自持。

## 非目标

- AST/语义级分析（D-001：v1 人写正则人负责）。
- 散文→断言自动提炼（误报不可控）。
- PASS 封顶硬门（D-003：v1 advisory，攒误报率数据后另案升级）。
- verify-facts schema 变更（爆炸半径控制）。
- quick 门/brainstorm 期接线（后续按需）。
- 种子清单内容（multi-agent-platform 两条，另案 quick 落消费者仓）。

## 拆分判断

单变更承载机制三件（模块/探针/测试）+登记；种子内容跨仓另案。不拆：模块与探针互为存在理由，拆则探针无清单可测。

## 总体方案

**Phase 1 清单与评估器**：新模块 `src/redlines.js`——`parseRedlines(yamlText)`（js-yaml 解析→条目数组；七字段 id/statement/scope[]/forbid[]/require[]/severity/error|warning/origin；**无效条目判据**：缺 id、缺 scope、forbid 与 require 全空、正则编译失败——四者任一命中即跳过该条+warnings 留痕）、`resolveScopeFiles(scopeGlobs, root)`（glob 语义：`**` 跨层 `*` 单段；仅文件，跳过 node_modules/.git/.sillyspec/.runtime）、`evaluateRedlines({entries, root})`（逐条：scope 解析→逐文件逐 forbid 正则（多行模式）命中收集 `{file, line, match}`；require=scope 全集无命中记缺失；求值异常单条跳过+warn）。**severity 驱动渲染标记**：forbid 命中按条目 severity 出 ❌（error）/⚠️（warning）；require 缺失恒 ⚠️。纯函数、零新增外部依赖（js-yaml 已有）。

**Phase 2 探针接线**：verify-probes.js 两处插入——调用区（探针 10 块后）：`runRedlineConsistencyProbe({ specBase, cwd, wtRoot, changeName })` 读 `<specBase>/redlines.yaml`（root=wtRoot||cwd 定位 scope 文件），fail-soft try/catch；渲染区：`PROBE11_HEADING = '#### 探针 11：红线一致性（advisory）'` + renderProbe11Lines——不适用（缺清单）/逐条 ❌ file:line + statement + origin / ⚠️ require 缺失 / ✅ 全过计数。骨架注入与 facts 均不动。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/redlines.js | 清单解析+scope 解析+评估器纯函数（parseRedlines/resolveScopeFiles/evaluateRedlines） |
| 修改 | src/verify-probes.js | 调用区+渲染区插入探针 11（runRedlineConsistencyProbe + renderProbe11Lines，fail-soft） |
| 新增 | NEW:test/redlines.test.mjs | 四态夹具（violation/clean/absent/broken-yaml）+glob 语义+条目校验 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 新模块 redlines 登记（lint 硬门） |
| 新增 | NEW:.sillyspec/docs/sillyspec/modules/redlines.md | 模块卡（定位/契约摘要/关键逻辑） |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | verify-probes 归属模块边车登记 |

数据流：消费者仓 redlines.yaml → parseRedlines → evaluateRedlines(root=worktree) → findings → 探针 11 渲染进 verify-result 骨架 → agent 裁定（advisory）。

## 接口定义

```js
// src/redlines.js
export function parseRedlines(yamlText) // → { entries: RedlineEntry[], warnings: string[] }
// RedlineEntry: { id, statement, scope: string[], forbid?: string[], require?: string[], severity: 'error'|'warning', origin?: string }
export function resolveScopeFiles(scopeGlobs, root) // → string[]（仓根相对 POSIX 路径，已排序去重）
export function evaluateRedlines({ entries, root }) // → { applicable, entryCount, findings: [{id, severity, kind:'forbid'|'require-missing', file?, line?, snippet, statement, origin}], warnings }
```

redlines.yaml 形态（消费者仓示例）：

```yaml
redlines:
  - id: RL-001
    statement: 回放适配器不得用 running 编码未配对 tool_use（已结束会话不得假运行）
    scope: ["frontend/src/lib/agent-log-*.ts"]
    forbid: ["status:\\s*[\"']running[\"']"]
    require: ["结果未记录"]
    severity: error
    origin: docs/sillyspec/.../design.md#R-03
```

## 生命周期契约表

本设计不涉及生命周期契约——纯函数评估器 + verify 期只读扫描，无 session/lease/heartbeat/状态转移语义。

## 数据模型

无 schema 变更（不触 db；verify-facts 零改动，D-003）。

## 兼容策略（brownfield 必填）

- 缺 redlines.yaml → 探针 11「不适用」一行，行为与现状零差异。
- 坏 yaml → 不适用 + 注记（不炸）。
- 既有探针 1-10 渲染序不变（11 追加尾部）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 正则过宽误报骚扰 | P2 | advisory 渲染+statement/origin 溯源供人裁；攒误报数据（D-003 退役判据） |
| R-02 | scope glob 引擎自写的边界 bug（`**`/`*` 语义） | P2 | glob 语义单测钉死；不支持 `?`/字符类（v1 明示） |
| R-03 | 大 scope 全量读文件性能 | P3 | 排除 node_modules/.git/.sillyspec；逐文件上限 2MB 跳过+warn |
| R-04 | 清单无人维护腐化 | P3 | origin 锚进 docs check 校验面（后续另案） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / 接口定义（正则断言） | 已落实 |
| D-002@v1 | FR-02 / 总体方案（清单自持） | 已落实 |
| D-003@v1 | FR-03 / 总体方案 Phase 2（advisory） | 已落实 |
| D-004@v1 | FR-03 / 风险 R-03（fail-open） | 已落实 |

无未解决决策；无剩余风险挂账。

## 自审

- [x] 章节齐全
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN
- [x] 生命周期豁免短语在节内
- [x] UI 原型跳过（纯 CLI 逻辑）
- [x] 无存疑项
