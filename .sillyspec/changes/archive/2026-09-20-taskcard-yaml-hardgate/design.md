---
author: qinyi
created_at: 2026-09-20 21:54:04
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-20-taskcard-yaml-hardgate

## 背景

2026-09-20 multi-agent-platform 仓 `2026-09-20-scope-audit-cross-repo-platform` 变更实证：三张 task 卡（task-01/02/03）frontmatter 的 `provides`/`expects_from` 值是含未引号方括号与全角括号的 flow 序列（如 `rpc_scope_audit_v2_fields: [rows[].cross_repo, repos[]（key/anchor{...}）]`），jsYaml 解析抛 `missed comma between flow collection entries`。三个消费点各自静默吞错：

1. **契约硬门禁空过（P0）**：src/stages/plan-postcheck.js:332 `parseTaskContracts` 的 catch 返回 `{provides:[], expectsFrom:{}}`（注释自称「不阻断」）→ `[plan.cross-task-contract]` 硬校验无 consumer 可对账，空真过门。实测 task-02 卡解析为空，当时 plan gate pass 是假阴性。
2. **探针 7 误导文案**：src/verify-probes.js:1734 `parseTaskAcceptance` 的 catch 返回 `[]` → :1943 渲染「卡无 acceptance——防御，plan-postcheck 已拦」。卡片明明有 acceptance，是 YAML 坏；且 plan 侧 acceptance 存在性检查（hasAcceptanceCriteria，src/stages/plan-postcheck.js:301）是宽收正则，根本拦不住这种坏法——防御文案失实。
3. **两套解析口径无单一源**：同一 frontmatter，plan 侧存在性宽收正则说 OK、verify 侧 jsYaml 严格说没有。

## 设计目标

- **FR-01 单一解析源**：frontmatter 提取 + jsYaml 解析收敛为一个共享模块，plan 与 verify 两侧消费同一实现。
- **FR-02 plan 门禁硬校验**：task 卡 frontmatter 非法 YAML 即 ERROR（报错带 文件:行:列 + js-yaml 原始 message），`[plan.cross-task-contract]` 解析失败零空过。
- **FR-03 探针 7 如实文案**：坏 YAML 卡渲染「frontmatter 非法 YAML」行，与「真无 acceptance」防御行区分。
- **FR-04 零回归**：合法卡（含无 frontmatter 卡、无契约字段卡）行为不变；既有契约对账正例/反例全部保持。

## 非目标

- 不修 multi-agent-platform 仓的坏卡数据本身（填写侧债务，另修——修工具不修数据，坏卡转为测试夹具）。
- 不改 src/taskcard.js 生成器序列化：`provides`/`expects_from` 是 agent 手填字段（生成器默认不生成，见 src/taskcard.js:57 注释），坏值系手写；`yamlScalar` 转义先例不扩面。
- 不改 plan 侧 acceptance 存在性宽收正则（hasAcceptanceCriteria）——其职责是「字段在场」，YAML 合法性归新硬校验，两者不合并（防同一信号双维度重复报，见 knowledge conventions「双维度报同一漂移信号时后加维度须豁免」）。
- 不动 execute 阶段 task-review 的卡片读取（无实证缺陷）。

## 拆分判断

单变更不拆：三症状同一根因（无单一解析源 + 静默吞错），拆开会造成中间态口径分裂。B/C/D/E 四个独立工具缺陷（--init 刷新通道 / unused 口径 / gate 落盘 / 豁免提示路径）走 quick，不并入本变更。

## 总体方案

**Wave 1（plan 侧 + 共享源）**
1. 新增 `src/taskcard-frontmatter.js`（除 js-yaml 零依赖，防环——plan-postcheck 与 worktree-apply 有既有依赖边，共享逻辑放新模块两侧 import，见 knowledge patterns）：
   - `splitFrontmatter(content)` → `{ has, yamlText, yamlStartLine }`；frontmatter 界定正则与现两侧一致（`^---\r?\n([\s\S]*?)\r?\n---`，CRLF 容错）；`yamlStartLine` 恒为 2（首行 `---`，YAML 自次行起）。
   - `parseTaskFrontmatter(content)` → `{ ok, hasFrontmatter, fm, error }`：无 frontmatter → `{ok:true, hasFrontmatter:false, fm:null, error:null}`；jsYaml 抛错 → `{ok:false, hasFrontmatter:true, fm:null, error:{message, line, column}}`，`line = mark.line + yamlStartLine`（js-yaml mark 是 YAML 文本内 0 基行 → 文件 1 基行），`column = mark.column + 1`；合法 → `{ok:true, hasFrontmatter:true, fm, error:null}`。
2. `parseTaskContracts`（src/stages/plan-postcheck.js:327）内部改用 `parseTaskFrontmatter`；`!ok` → 返回 `{provides:[], expectsFrom:{}, yamlError: error}`（additive 键，显式降级注记，不再冒充「无契约字段」）；无 frontmatter 语义不变。
3. `validatePlanFeasibility`（src/stages/plan-postcheck.js:1247）增加**步骤 0b**（紧随 :1298 重复键检测，D-004@v1 同类先例——重复键与非法 YAML 同为 jsYaml 抛错类）：逐卡 `parseTaskFrontmatter`，`!ok` → `errors.push`（文案：`<taskId|file>: frontmatter 非法 YAML（<file>:行:列 <js-yaml message>）——契约/验收/标量字段全链路不可读，修复卡片 frontmatter（值含方括号/全角括号时加引号或改块式列表）`）。**双报豁免**（独立审查 gap①，双维度同信号须豁免惯例）：message 含 `duplicated mapping key` 且该卡 dupKeys 非空时 0b 跳过（:1298 已用更精确的键名+行号文案上报，不重复）；嵌套重复键（detectDuplicateTopKeys 顶格正则够不到）仍由 0b 兜底上报。`validateCrossTaskContracts` **不**加预检（D-001@v2：runPlanPostcheck 聚合器 1b 可行性先于 1c 契约同 pass 运行，入口拦截即全链路覆盖；契约门禁再报 YAML 错违反「双维度同信号须豁免」惯例）——坏卡进两遍对账循环时 parseTaskContracts 返回空，不产生假阳性契约错误，阻断由 0b 独占承担。已知边界（独立审查 gap② 复审修正：plan-postcheck.js:16 的 readFileSync 包装器已统一 CRLF→LF 归一，CRLF 卡同样能到达 0b 并享行:列 精度——原「:1278 拦 CRLF 卡」判断经实证证伪，删除）：:1382 best-effort 注释（「feasibility 未对 fm 做 YAML 解析」）在 0b 落地后同步改写。

**Wave 2（verify 侧 + 测试）**
4. `parseTaskAcceptance`（src/verify-probes.js:1722）内部改用 `parseTaskFrontmatter`，返回契约扩为 `{status, acceptance, error}`：`status ∈ 'no-frontmatter' | 'invalid-yaml' | 'ok'`；`acceptance` 恒为数组（no-frontmatter 时 `[]`，调用方按 status 跳过）；`error` 仅 invalid-yaml 非 null。
5. 探针 7 构建（src/verify-probes.js:2141 调用点）按 status 分流：no-frontmatter → 跳过该卡（原 null 语义）；invalid-yaml → task 条目挂 `fmError`；渲染（renderProbe7Lines，src/verify-probes.js:1942 分支）优先判 `fmError` → 输出 `- ⚠️ frontmatter 非法 YAML（task-NN.md:行:列 <message>）——acceptance 不可读，本行非「无 acceptance」防御；plan 门禁 frontmatter 硬校验应已拦截，若已过 plan 门仍见此行即门禁失效信号`；ok 且空 → 保留原「卡无 acceptance——防御，plan-postcheck 已拦」行（此时为真）。
6. 测试：夹具 `test/fixtures/taskcard-bad-yaml/task-0{1,2,3}.md`（multi-agent-platform 三张原卡整卡拷贝，真实坏行在 20/22/26 行（独立审查实测修正，报告原值 19/21/25 系 YAML 文本内行号））+ 新用例文件 + 既有两文件契约迁移（见文件变更清单）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/taskcard-frontmatter.js | 单一 frontmatter 解析源；producer=plan-postcheck/verify-probes import，无文件产物下游 |
| 修改 | src/stages/plan-postcheck.js | parseTaskContracts 归一共享源 + yamlError 键（:327）；validatePlanFeasibility 步骤 0b 硬校验（:1298 后） |
| 修改 | src/verify-probes.js | parseTaskAcceptance 归一共享源 + status 契约（:1722）；探针 7 构建（:2141）与渲染（:1942）区分坏 YAML |
| 新增 | NEW:test/fixtures/taskcard-bad-yaml/task-01.md | 夹具：multi-agent-platform 原卡拷贝（坏行 :20） |
| 新增 | NEW:test/fixtures/taskcard-bad-yaml/task-02.md | 夹具：原卡拷贝（坏行 :22） |
| 新增 | NEW:test/fixtures/taskcard-bad-yaml/task-03.md | 夹具：原卡拷贝（坏行 :26） |
| 新增 | NEW:test/taskcard-frontmatter-hardgate.test.mjs | 直测：parseTaskFrontmatter 行:列断言 / validatePlanFeasibility 步骤 0b 坏卡阻断 / parseTaskContracts yamlError / 契约校验对坏卡零假阳性 / 探针 7 坏卡文案（renderProbe7Lines 经构建层） |
| 修改 | test/acceptance-matrix-probe.test.mjs | parseTaskAcceptance 契约迁移断言（:155-159 五条改 status 形态） |
| 修改 | test/cross-task-contracts.test.mjs | 既有用例零回归护栏 + 坏 YAML 阻断邻接用例 |

## 接口定义

```js
// src/taskcard-frontmatter.js
export function splitFrontmatter(content) // → { has: boolean, yamlText: string|null, yamlStartLine: number }
export function parseTaskFrontmatter(content)
// → { ok: boolean, hasFrontmatter: boolean, fm: object|null, error: { message: string, line: number, column: number }|null }
//    error.line = js-yaml mark.line + 2（文件 1 基行）；error.column = mark.column + 1

// src/stages/plan-postcheck.js（契约 additive 扩展）
export function parseTaskContracts(content)
// → { provides: Array<{contract, fields}>, expectsFrom: Record<string, Array<{contract, needs}>, yamlError: {message, line, column}|null }

// src/verify-probes.js（契约变更：array|null → 对象三态）
export function parseTaskAcceptance(content)
// → { status: 'no-frontmatter'|'invalid-yaml'|'ok', acceptance: string[], error: {message, line, column}|null }
```

## 生命周期契约表

本节豁免：不涉及生命周期契约——无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 字段或流转。

## 数据模型

无 schema 变更：sillyspec.db 不动；变更仅限 src 内函数契约与测试。

## 兼容策略（brownfield 必填）

- `parseTaskContracts` 返回新增 `yamlError` 键（additive），既有消费方解构 provides/expectsFrom 零感知。
- `parseTaskAcceptance` 返回契约变更（array|null → 对象）：仓内唯一调用方（src/verify-probes.js:2141）与直测（test/acceptance-matrix-probe.test.mjs）同步迁移；该函数不经 machine-interface（gate/derive envelope）对外，无外部消费者。
- 无 frontmatter 卡 / 合法卡 / 无契约字段卡行为逐字节不变。
- **预期行为变更（本变更目的）**：坏 frontmatter 卡从「plan 门静默空过」变「ERROR 阻断」——存量活跃变更若持坏卡，下次 plan gate 即暴露（fail-closed）；探针 7 对坏卡的输出从假防御行变如实坏 YAML 行。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | js-yaml mark 行号换算错位（YAML 文本内 0 基 → 文件行 +2）误导定位 | P2 | 三张实卡断言 error.line === 20/22/26 锁死换算 |
| R-02 | parseTaskAcceptance 契约变更有漏改调用方 | P2 | grep 全仓调用点收口（仅 :2141 一处）+ 邻接测试全跑 |
| R-03 | 硬拦误伤存量合法卡（解析器未换、仅从吞错变显式，理论不新增抛错面） | P3 | 好卡夹具零回归断言 + cross-task-contracts 既有用例全保留 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案（Wave 1/2 主体）/ 文件变更清单 / 接口定义 / 兼容策略 | 已确认（brainstorm Step 4 用户拍板） |
| D-001@v2 | 总体方案第 3 点（硬校验落点 feasibility 0b）/ 兼容策略 | 已确认（Step 7 Design Grill，supersedes v1 落点条目） |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1）
- [x] 生命周期豁免短语紧邻「生命周期契约」
- [x] UI 原型分级核对：不涉前端文件，跳过
- [x] 无「⚠️ 自审存疑」项
