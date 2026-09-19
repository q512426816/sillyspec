---
author: qinyi
created_at: 2026-09-19 06:05:27
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-19-api-matrix-service-coverage

## 背景

verify 阶段接口验证覆盖矩阵门禁（2026-09-17-api-coverage-smoke 引入）的放行硬等式是「covered 分子 == 有效分母」（src/stage-contract.js judgeApiCoverageMatrix，:1224）。对「端点行为由 service 层测试锁定、无端点级用例」的端点该等式偏严：agent 被迫虚标 covered 才能过门（用户实证：dispatch-now 端点，verify facts 门禁六轮迭代才过，每轮都是真实修文档而非凑格式——门禁本身在逼人说谎）。现有逃逸形态语义均不适配：non-testable 是「不可测」（分母扣除），partial/uncovered 走移交联动且触发 PASS 封顶降级（语义是「未完成待移交」，而 service 承接是「已完成、覆盖层不同」）。

## 设计目标

1. 接口矩阵判定列引入第五形态 `covered-service`（service 层承接）：该行计入覆盖分子，满足覆盖等式，不触发移交联动与 PASS 封顶降级。
2. 防滥用硬约束：covered-service 行证据列必须含真实测试锚点（复用本文件 matrixEvidenceHasAnchor 三形态口径），缺锚点 error——延续 D-004@v1(api-coverage-smoke)「防拿发明用例充数/挑好测的测」立意，同时消灭「被迫虚标 covered」这一诚实性漏洞。
3. 可审计性：advisory 单独计数「N 端点由 service 层测试承接（非端点级）」，端点级与间接覆盖在矩阵统计上可区分（这正是与方案 B 的本质差异——B 会让统计失真）。

## 非目标

- 不放宽既有四枚举的任何校验（covered 五形态锚点、partial/uncovered 移交联动、non-testable 理由）。
- 不动 facts schema（零新字段——advisory 由 stage-contract 从 MD 槽直接判）。
- 不动回执门禁/集成证据门/写端点权限 advisory：covered-service 不豁免任何其他门。
- 不做 service 承接占比上限（先 advisory 观察滥用面，D-001 故障面条款）。
- 不涉及 worktree doctor / editable install（该检测已于 2026-08-25 闭环，worktree.js:1746）。

## 拆分判断

单功能变更（一个判定形态的引入及其文案/测试联动），无批量模式特征，不拆分。

## 总体方案

### Wave 1：判定层（src/stage-contract.js）

1. `MATRIX_VERDICT_WHITELIST`（:789）加入 `'covered-service'`——两消费点（探针 7 门 :872、接口矩阵门 :1062）的 unfilled 判定同步认新值（D-002 联动）。
2. 探针 7 侧证据要求联动：`matrixEvidenceMissing`（:830）首行条件 `verdict !== 'covered' && verdict !== 'partial' && verdict !== 'non-testable'` 加入 covered-service——使验收矩阵中 covered-service 行与 covered 同口径（须测试锚点），而非落进「无证据要求」分支。
3. 接口矩阵锚点校验循环（:1181-1191）加分支：covered-service 行走 `matrixEvidenceHasAnchor`（:817，`.test.` / file:line / 反引号三形态——同文件既有口径，禁第二套解析文法）判测试锚点，缺锚点进 anchorViolations（error）；不做 design接口表# 解析级核对（covered-service 的证据就是测试本身，不要求 design 侧锚点）；covered/partial 行为不变。
4. 记账（:1213-1232）：`coveredCount = covered 行 + covered-service 行`；`coveredSet` 并入 covered-service 行的 `METHOD /path` 命中；缺覆盖 error 文案的分子口径改为「covered+covered-service 分子」；新增 advisory——serviceCoveredCount > 0 时 warnings.push「[advisory] N 端点由 service 层测试承接（非端点级）……（不阻断）」。
5. unfilled 错误文案（:1175）「四选一 covered/partial/uncovered/non-testable」→「五选一 covered/covered-service/partial/uncovered/non-testable」；探针 7 门同款 unfilled 文案（:928-929）与 missingEvidence 文案（:936，须列 covered-service——Wave1.2 扩展后该 error 会在 covered-service 行触发）同步五枚举口径（Grill U-01）。
6. 缺覆盖 error 修复指引句（:1230）补 covered-service 出路（「端点行为由 service 层测试锁定的改 covered-service 并填测试锚点」——修复句只指回 covered 与消灭虚标的立意相逆，Grill C-13）。
7. 零改动确认（设计核验，非猜测）：移交联动 partialRows 过滤（:1247/:1248）条件为 partial/uncovered，covered-service 天然不触发；PASS 封顶 evaluatePassEligibility 条件④消费 facts.matrixPartialRows（探针 7 矩阵计数），接口矩阵 covered-service 行不进该计数。

### Wave 2：骨架与指引文案（多面同源）

1. `renderApiCoverageMatrixLines`（src/verify-probes.js:2485-2512）：口径注记「判定枚举（四选一）」→ 五选一，补 covered-service 口径说明（适用：端点行为由 service 层等非端点层测试锁定；证据须测试文件锚点 `.test.` / file:line / 反引号）；预填占位 `<待填：四选一>` → `<待填：五选一>`（:2504/:2507 两处）；`ensureApiCoverageMatrixSection`（:3079+）复用 render 者同步。
2. 探针 7 骨架注记（src/verify-probes.js:1929「判定枚举（四选一）」）与相邻预填说明（:1930「枚举须保持 covered/partial/uncovered/non-testable 纯值」）→ 五选一——Wave1.2 已让验收矩阵行为面接受 covered-service（须测试锚点），文案面不跟即「行为认、文案不认」漂移；:1930 尤其关键：它是唯一主动指令 agent 不得填新枚举的文案，不改则 covered-service 在 probe7 侧骨架指引下不可达（Grill U-01 + 二轮 N-01）。
3. `src/stages/verify.js` 验收/接口矩阵指引文本（:165 附近）：判定枚举口径同步五选一 + covered-service 一句说明。
4. `templates/prompts/verify-probes.md`（:36 附近）：同口径同步。
5. `src/probe7-anchor-check.js` :70 硬编码四枚举数组加 'covered-service'、:72 认定同 covered——否则 covered-service 行被 advisory 预检静默跳过、直撞硬 error，「省一轮往返」立意失效（Grill U-02）。
6. `src/index.js` :1212 --init 输出提示「判定=四选一」→ 五选一（提示性文案，执行期顺手同步，Grill 二轮 N-02）。

### Wave 3：测试（test/api-coverage-matrix.test.mjs + 联动断言同步）

新增五组用例：①covered-service 计分子（等式满足放行，ok=true）；②covered-service 缺测试锚点 → error；③advisory 计数输出（warnings 含承接计数）；④验收矩阵含 covered-service 行不误报 unfilled/missingEvidence（D-002 联动回归；顺手断言 backfill 后 facts.matrixPartialRows===0——封顶不触发的结构性证据，plan Grill R2-8 建议）；⑤向后兼容回归：纯四枚举文档行为不变（既有用例天然覆盖，跑全量）。既有断言同步：api-coverage-matrix.test.mjs :118/:201/:204（「四选一」文案）/ :155（「covered 分子 1」子串——分子口径文案改动即碎，plan Grill R2-1 发现）/ :332-333（`<待填：四选一>` 占位）、acceptance-matrix-probe.test.mjs :213（probe7 图例四枚举——Wave2.2 改注记后同步）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stage-contract.js | 白名单五枚举；matrixEvidenceMissing 联动；锚点校验 covered-service 分支（复用 matrixEvidenceHasAnchor）；记账分子并入 + advisory；unfilled/缺覆盖/修复句文案 + probe7 门 unfilled/missingEvidence 文案（:928/:936，Grill U-01） |
| 修改 | src/verify-probes.js | renderApiCoverageMatrixLines 口径注记五选一 + covered-service 说明；预填占位更新（ensureApiCoverageMatrixSection 复用同步）；probe7 骨架注记 :1929 与预填说明 :1930 五选一（Grill U-01/N-01） |
| 修改 | src/probe7-anchor-check.js | :70 枚举数组加 covered-service、:72 认定同 covered——advisory 预检不跳过新形态（Grill U-02） |
| 修改 | src/index.js | :1212 --init 提示文案五选一（Grill N-02，顺手同步） |
| 修改 | src/stages/verify.js | verify 阶段指引判定口径五选一同步 |
| 修改 | templates/prompts/verify-probes.md | 探针指引模板判定口径同步 |
| 修改 | test/api-coverage-matrix.test.mjs | 五组新用例 + 文案断言同步（:118/:201/:204/:332-333） |
| 修改 | test/acceptance-matrix-probe.test.mjs | :213 probe7 图例断言同步五枚举 |

## 接口定义

- `MATRIX_VERDICT_WHITELIST: Set<string>`：`{'covered', 'covered-service', 'partial', 'uncovered', 'non-testable'}`（唯一权威枚举，两矩阵门消费）。
- `matrixEvidenceMissing(verdict, evidence)`（既有函数，签名不变）：verdict ∈ {covered, covered-service, partial, non-testable} 时要求证据非 TODO 且含 `matrixEvidenceHasAnchor` 锚点（non-testable 仅要求非空理由）。
- `judgeApiCoverageMatrix(args)`（既有导出，签名不变）：行为增量——covered-service 行计分子、测试锚点校验、serviceCovered advisory；返回结构 `{ok, errors, warnings}` 不变。
- 骨架预填占位：`<待填：五选一>`（renderApiCoverageMatrixLines 产出，字面与门禁文法同源）。

## 生命周期契约表

不涉及生命周期契约（本变更是 verify 门禁判定逻辑扩展，无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 语义）。

## 数据模型

无 schema 变更：verify-facts.json 零新字段（advisory 由 stage-contract 从 verify-result.md MD 槽直接判定，不落 facts）。

## 兼容策略（brownfield 必填）

- 存量 verify-result.md 只含四枚举：全部校验行为逐字不变（白名单扩展是纯增量；covered-service 只在新填行出现）。
- 未跑新管线的存量变更：factsExpected=false 入口兼容路径（:1108）零变化。
- 不改变的 API/表结构：judgeApiCoverageMatrix/extractApiCoverageMatrixSlots 等既有导出签名不变；progress.db、verify-facts schema v2 不动。
- 回退路径：如需禁用，从 MATRIX_VERDICT_WHITELIST 移除 'covered-service' 即回到四枚举（存量已填 covered-service 的行会按 unfilled 报错——回退即显式可见，不留静默面）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 滥用面：全部端点标 covered-service 逃端点级验证（系统性逃避 smoke） | P1 | advisory 计数评审可见不阻断（D-001 故障面：先观察再决定上限）；写端点回执/集成证据门独立拦截不豁免 |
| R-02 | 探针 7 门联动误报：验收矩阵 covered-service 行落错分支 | P1 | Wave 3 用例④专项回归；matrixEvidenceMissing 首行条件显式列 covered-service |
| R-03 | 多面文案漂移（API 骨架/probe7 骨架/verify 指引/模板/probe7 门错误文案/anchor-check 六面口径不同步——Grill 首轮 U-01 实证初版即漏了后三面） | P2 | 六面全列文件变更清单逐项落改 + 测试断言骨架占位字面 `<待填：五选一>` 与 probe7 图例 |
| R-04 | covered-service 语义滥用为「写了测试计划」而非真实测试 | P2 | 测试锚点硬约束指向真实测试文件形态（.test./file:line/反引号），与 covered 行五形态锚点同 fail-closed 级 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Wave 1（3/4）+ Wave 2（1）+ FR-01/FR-02 | 已覆盖 |
| D-002@v1 | 总体方案 Wave 1（1/2）+ Wave 3 用例④ + R-02 | 已覆盖 |
| D-003@v1 | 方案 A 落定即本设计全篇（D-001/D-002 为其细化） | 已覆盖 |

无未解决决策；D-003 标注的用户可否决权保留（用户回看 --reopen 重选时 supersedes 处理）。

## 自审

> 判级说明：本设计自审章节引用了生命周期关键词列表（用于豁免短语核对），触发 CLI 关键词误伤判级 integration-critical——实际本变更为 verify 门禁判定纯逻辑扩展（零 daemon/session/启动入口/进程集成面，测试为纯函数单测），故 frontmatter 显式声明 `risk_level: unit-sufficient`（抑制可审计）。

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001/D-002/D-003 均入决策追踪）
- [x] 生命周期关键词核对——本设计正文含「state transition」仅出现于豁免短语语境；已写紧邻豁免短语「不涉及生命周期契约」
- [x] UI 原型分级核对——纯后端 CLI 门禁逻辑无界面变化，跳过原型（分级依据：文案/纯后端逻辑/CLI，无任何界面变化）
- [x] 不确定的问题标注——无「⚠️ 自审存疑」项；两处设计核验（移交联动/封顶零改动）已读代码确认 :1247/:1248 过滤条件与 facts.matrixPartialRows 消费面
