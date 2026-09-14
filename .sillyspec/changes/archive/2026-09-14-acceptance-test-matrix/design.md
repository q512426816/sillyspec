---
author: qinyi
created_at: 2026-09-14 20:55:00
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-14-acceptance-test-matrix

## 背景
verify 现行探针 3（测试覆盖）只回答「task 周边有没有测试文件」（allowed_paths→模块目录递归，存在性级粗粒度）；「每条 TaskCard acceptance 是否有测试承接」既无机器核对也无文档约定——acceptance 可以在零测试触达下凭 agent 自述通过 verify（问题三空缺，2026-09-14 会话实证）。

## 设计目标
1. acceptance×测试对应关系从隐式变显式矩阵，CLI 机械预填归属与提示。
2. 判定槽 fail-closed：未填/证据缺失阻断 verify --done。
3. 映射约定文档化进 testcase-design.md（单一真源，4 处 prompt 注入面）。

## 非目标
- 不做覆盖率百分比、不做测试→acceptance 反向追溯。
- 不改 quick 流程（无 TaskCard，天然不适用）。
- 关键词命中不参与门禁判定（防误报阻断）。
- 存量已归档变更零迁移（章节随 --init 生成，老变更不回填）。

## 拆分判断
单变更三 task（探针/门禁与骨架/文档），共享 verify-probes 域，不拆。

## 总体方案
**A. 探针 7（verify-probes.js runVerifyProbes 新段；编号 3.5 已被「断言有效性抽查」占用，顺延取 7 兼容锚定正则 /#### 探针 (d+)/）**：acceptance 解析在 verify-probes 内自行 jsYaml 解析 frontmatter（string/array 双形态，口径同 src/stages/plan-postcheck.js:1322-1326——parseTaskContracts 只返回 provides/expects_from 不含 acceptance，Grill P1-1）；**测试归属（结构事实）**= allowed_paths 中匹配测试模式（test/ 前缀或 *.test.* / *_test.* / spec 惯例）的路径 ∪ execute-runs 当前 runId 下该 task review.json changedFiles 中 test/ 前缀路径（runId 解析内联读 marker `current-execute-run-id-<change>` + 目录扫描兜底——**禁静态 import task-review**：task-review→verify-postcheck→verify-probes 三步环，Grill P1-2，先例 verify-probes.js:438 分层注释）；**关键词提示**= acceptance 行提取 [A-Za-z_][A-Za-z0-9_]{2,} 标识符与 ≥2 字 CJK 片段，在归属测试文件内容 grep，记录命中词与命中文件（上限 5 词防膨胀）。

**B. 骨架章节（verify-probes.js 骨架渲染 + --init）**：「#### 探针 7：验收×测试覆盖矩阵」插在探针 3 段后：每 task 一表 `| acceptance 条目 | 归属测试文件 | 关键词命中（提示） | 判定 | 证据 |`，判定列预填 `<待填：四选一>`、证据列 `<TODO>`；无 TaskCard（quick 会话误入）整段渲染「不适用」。四枚举：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。

**C. 门禁（stage-contract.js 新提取器 + runValidators 链）**：export extractAcceptanceMatrixSlots(verifyMd) → { rows, unfilled, missingEvidence, present }——行级解析判定列（四枚举白名单）与证据列（covered/partial 行须非 TODO 且含测试锚点形态：`.test.` 文件名或 file:line 或测试名引用）；接入走 runValidators errors 阻断链（gates.js:603-618 同型 validator push，**不进 593/686 fail-soft 回填块**——那里 catch 只 warn 会吞阻断，Grill P1-3）。

**D. 文档**：templates/prompts/testcase-design.md 追加第 7 条：「**覆盖对账**：每条 TaskCard acceptance 至少对应一个测试用例，或显式标注 non-testable（文档/部署类）；对应关系由 verify 探针 7 矩阵机械核对——写测试时先看卡的 acceptance 列表逐条对齐」；templates/prompts/verify-probes.md 探针清单补探针 7 行；src/stages/verify.js step5「任务蓝图验收」prompt 补矩阵消费说明（判定+证据填写指引）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | runVerifyProbes 探针 7 段 + 骨架渲染章节 + ensureAcceptanceMatrixSection 幂等补段 |
| 修改 | src/stage-contract.js | export extractAcceptanceMatrixSlots（行级判定/证据提取） |
| 修改 | src/stage-contract.js | extractAcceptanceMatrixSlots + contracts.verify.validators 注册（注册点 :884，覆盖 gates/machine-interface 等全部 runValidators 调用方；gates.js 预计零改动） |
| 修改 | templates/prompts/testcase-design.md | 第 7 条覆盖对账约定 |
| 修改 | templates/prompts/verify-probes.md | 探针清单补探针 7 |
| 修改 | src/stages/verify.js | step5 prompt 矩阵消费说明 |
| 修改 | src/index.js | --init 流程接线 ensureAcceptanceMatrixSection（先例 backfillMissingEvidenceSlots 调用点 :1112 一带；plan-review 修正 1） |
| 新增 | NEW:test/acceptance-matrix-probe.test.mjs | 探针 7：归属判定（allowed_paths∪review 双源）/关键词提示/无 TaskCard 不适用/骨架渲染 |
| 新增 | NEW:test/acceptance-matrix-gate.test.mjs | 门禁：未填槽阻断/证据缺失阻断/non-testable 豁免证据/全填放行 |

## 接口定义

```js
// src/verify-probes.js（runVerifyProbes 返回值新增字段）
probe7: { applicable: boolean, tasks: [{ task, acceptance: string[], testFiles: string[], hints: Record<number, {terms: string[], files: string[]}> }] }  // applicable 顶层（无 TaskCard=false）

// src/stage-contract.js
export function extractAcceptanceMatrixSlots(verifyMd)
// → { rows: [{task, acceptance, verdict, evidence}], unfilled: number, missingEvidence: number, present: boolean }
// missingEvidence 口径：covered/partial 行证据须非 TODO 且含测试锚点形态；non-testable 行证据列须非 TODO 且非空（理由一句话）——三者皆计入
```

## 生命周期契约
本变更不涉及生命周期契约（lifecycle contract）——纯探针只读 + 门禁校验，无 session/lease/daemon/状态转移新增。

## 数据模型
无 schema 变更。定案：**verify-facts.json 机器段不含 probe7**（buildVerifyFacts 白名单显式枚举 1/3/5/6，不扩展以避免牵动 facts fixtures——plan-review 修正 2）；矩阵只存在于 verify-result.md 章节面。

## 兼容策略（brownfield 必填）

- 探针 3 与探针 7 口径显式注记：3=模块目录递归找测试文件名（存在性面），7=allowed_paths/changedFiles 结构归属（承接面），两者并排输出时骨架注明口径差异，冲突以 7 为准（Grill gap）。
- 无 tasks/ 目录（quick 会话/旧变更）：probe.applicable=false（顶层键，Grill P2），骨架渲染「不适用」，门禁不校验——零行为变化。
- **有 tasks/ 但 md 无矩阵段**：严格档 ERROR 阻断（对照结论槽「删槽回退已关闭」同口径，Grill P1-5）；配套 `ensureAcceptanceMatrixSection`——--init 时段缺失则幂等追加骨架段（学 backfillMissingEvidenceSlots 不触碰既有正文），本变更自身自举（verify-result.md 先于特性存在）走该通道补段。
- acceptance 为空的卡：行渲染「（卡无 acceptance——plan-postcheck 已拦缺失，此处防御）」不产生待填槽。
- 归属测试文件为空：提示列写「无归属测试——判定大概率 uncovered」，判定槽仍须填（不许空）。
- 关键词提取空（纯中文短句无标识符）：提示列「—」，不影响判定。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 判定橡皮图章（agent 批量 covered 不看代码） | P2 | 证据必填抬高造假成本；archive 抽审可查矩阵 vs 实际测试 |
| R-02 | non-testable 滥用逃生门 | P2 | non-testable 行证据列写理由（人话一句）；doctor/抽审可见占比 |
| R-03 | 关键词提示误导（命中≠覆盖） | P3 | 提示列头部固定标注「命中≠判定」；不参与门禁 |
| R-04 | 矩阵膨胀（大变更 acceptance 多） | P3 | 行=acceptance 条目数（通常 3-5/task）；提示词上限 5 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01（探针 7 结构归属+提示）/ FR-02（槽位 fail-closed+证据）/ FR-03（testcase-design 文档化）；总体方案 A-D | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 入决策追踪表）
- [x] 生命周期关键词核对：不涉及，豁免短语紧邻「生命周期契约（lifecycle contract）」
- [x] UI 原型分级核对：纯 CLI/探针/模板变更无界面，跳过（step 5 已声明）
- [x] Grill 5 项 P1 已修订：acceptance 自解析（P1-1）/review 读取内联 marker 禁 task-review import（P1-2）/门禁走 runValidators 链（P1-3）/编号 3.5→7 避撞名（P1-4）/严格档缺段 ERROR+幂等补段自举（P1-5）；P2 三项（hints 对象化/applicable 顶层/口径注记）一并落
