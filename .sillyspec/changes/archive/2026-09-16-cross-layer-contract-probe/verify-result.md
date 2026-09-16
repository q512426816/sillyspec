# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——三任务全部双 pass 过审、定向测试 5/5+5/5、lint 全绿、探针8 对本变更自判不适用（自指正确）；NOTES=worktree 环境性测试基线（13 个 CLI 子进程类测试受 index.js:334 worktree-cwd 守卫拦截，stash 基线对照证实与本次改动无关）+ 与并行变更 friction5-hardening 实际同改 verify-postcheck.js（apply 需串行）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 与并行变更 2026-09-16-friction5-hardening 同改 src/verify-postcheck.js（其脏文件已现）——apply 必须串行，后 apply 方按对方已合入版本重锚 | 后 apply 方在 verify/design 记录锚点更新；建议本变更先 apply（变更面小） |
| env-blocked | worktree 内 13 个 CLI 子进程类测试环境性失败（index.js:334 worktree-cwd 守卫，stash 基线对照 IDENTICAL-FAILURE-SETS） | apply 后在主仓跑 npm test 全量复核（gate 快照口径已覆盖本会话文件） |
| manual-acceptance | 探针8 契约维度在真实跨层变更上的首次实战验证（本变更为纯后端无契约面，自判不适用） | 下一个含前后端契约表的变更走 verify 时观察「#### 探针 8」新两行输出与 advisory 裁定体验 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（三 task review 均 pass/pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: 契约维度五用例全绿（worktree 实测）
  command: node --test test/probe8-contract-pivot.test.mjs
  exit: 0
  log: .sillyspec/.runtime/verify-logs/probe8-contract-pivot.log
- claim: 既有探针8 五组零回归（worktree 实测）
  command: node --test test/probe8-payload-parity.test.mjs
  exit: 0
  log: .sillyspec/.runtime/verify-logs/probe8-payload-parity.log
- claim: lint 全绿（死码项已消除，644 文件）
  command: npm run lint
  exit: 0
  log: .sillyspec/.runtime/verify-logs/verify-lint.log

## 任务完成度 [层：人工判断]
| task | 状态 | 依据 |
|---|---|---|
| task-01 契约维度核心 | 完成 | review pass/pass；parseDesignContracts+两维度+渲染/metrics 落位（verify-probes.js:245/:307/:410） |
| task-02 一致性接线 | 完成 | review pass/pass；锚点正则+WARNING 对账+facts 基线三接线（verify-postcheck.js:2785-2789/:3049-3063/:3096-3114） |
| task-03 五用例测试 | 完成 | review pass/pass；5/5 全绿（回执日志 1） |

## 设计一致性 [层：人工判断]
一致，两处已记录的微偏：
1. required 判据实现为「任一列含必填标记」（design 原文「说明列含」的宽松超集）——实际契约表常见「字段|必填|说明」列序，任一列判据正确覆盖该形态；边缘多报由 advisory 裁定兜底（execute 验收审查已注记）
2. 渲染「零疑似差异」行条件联动扩展（要求两新数组亦空）——防 ✅ 与 ⚠️ 并存自相矛盾的配套修正，旧 result 形态 `|| []` 兜底行为不变

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-probes.js:7` *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等
- ⚠️ `src/verify-probes.js:17` * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。
- ⚠️ `src/verify-probes.js:40` // - 尚未实现：中文短语高置信，保持子串匹配；
- ⚠️ `src/verify-probes.js:41` // - TODO/FIXME/HACK：ASCII 标识符边界匹配——TODO_FLAG_TODO / parseHackArgs 等标识符内部不再
- ⚠️ `src/verify-probes.js:43` // - XXX：边界匹配且前或后紧邻 CJK 表意字符即排除——「XXX完成处置」「订单XXX号」类中文占位
- ⚠️ `src/verify-probes.js:44` //   模板不再命中（独立代码注释 `XXX:` / `// XXX fix` 紧邻标点空白，仍命中）。
- ⚠️ `src/verify-probes.js:46` const TODO_ASCII_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_])(?:TODO|FIXME|HACK)(?![A-Za-z0-9_])`)
- ⚠️ `src/verify-probes.js:47` const XXX_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])XXX(?![A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])`)
- ⚠️ `src/verify-probes.js:49` if (line.includes('尚未实现')) return true
- ⚠️ `src/verify-probes.js:480` * 背景：此前骨架判定列 `<待填：四选一>` + 证据列 `<TODO>` 全占位，24 格矩阵 agent 全量
- ⚠️ `src/verify-probes.js:520` * （原 `<待填：四选一>` / `<TODO>` 占位淘汰）——幂等保障沿用补段口径：段已在场（agent 已填/
- ⚠️ `src/verify-probes.js:780` L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中')
- ⚠️ `src/verify-probes.js:790` L.push('关键词覆盖（worktree grep 实证）：parseDesignContracts（verify-probes.js:245 实现+导出）/ contractOrphans（:307 初始化/:410+ 比对产出）/ missingRequired（:307/:420+ 仅提交端点启用）/ probe8-skip（:253 整章跳过）/ 契约外载荷键+契约必填漏发渲染行（renderProbe8Lines）/ PROBE8_CONTRACT_ORPHANS_LINE_RE+PROBE8_MISSING_REQUIRED_LINE_RE（verify-postcheck.js:2785-2789 锚点解析）。设计能力词全部落实现。')
- ⚠️ `src/verify-probes.js:821` L.push('D-001@v1（契约枢纽+advisory 核心）→ FR-01~03 → task-01/task-03 → 证据：五用例+实现锚点（见决策矩阵）。D-002@v1（扩展现有探针8）→ FR-01~06 → 三 task → 证据：零回归三重锁定+接线 diff。链路闭环，无未闭环决策。')
- ⚠️ `src/verify-probes.js:1235` *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入）
- ⚠️ `src/verify-probes.js:1277` * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动），
- ⚠️ `src/verify-probes.js:1279` * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入
- ⚠️ `src/verify-probes.js:1290` const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/
- ⚠️ `src/verify-probes.js:1291` if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动
- ⚠️ `src/verify-probes.js:1312` * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
- ⚠️ `src/verify-probes.js:1324` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
- ⚠️ `src/verify-probes.js:1355` '| task | 状态 | 依据 |
|---|---|---|
| task-01 契约维度核心 | 完成 | review pass/pass；parseDesignContracts+两维度+渲染/metrics 落位（verify-probes.js:245/:307/:410） |
| task-02 一致性接线 | 完成 | review pass/pass；锚点正则+WARNING 对账+facts 基线三接线（verify-postcheck.js:2785-2789/:3049-3063/:3096-3114） |
| task-03 五用例测试 | 完成 | review pass/pass；5/5 全绿（回执日志 1） |',
- ⚠️ `src/verify-probes.js:1358` '一致，两处已记录的微偏：
1. required 判据实现为「任一列含必填标记」（design 原文「说明列含」的宽松超集）——实际契约表常见「字段|必填|说明」列序，任一列判据正确覆盖该形态；边缘多报由 advisory 裁定兜底（execute 验收审查已注记）
2. 渲染「零疑似差异」行条件联动扩展（要求两新数组亦空）——防 ✅ 与 ⚠️ 并存自相矛盾的配套修正，旧 result 形态 `|| []` 兜底行为不变',
- ⚠️ `src/verify-probes.js:1364` '| 命令 | 结果 | 说明 |
|---|---|---|
| node --test test/probe8-contract-pivot.test.mjs（worktree） | 5/5 全绿 | 回执日志 1，exit 0 |
| node --test test/probe8-payload-parity.test.mjs（worktree） | 5/5 全绿 | 零回归，回执日志 2，exit 0 |
| npm run lint（worktree） | 全绿 exit 0 | 644 文件，未引用导出 0，回执日志 3 |
| npm test（worktree） | 492 过 / 13 失败 | 13=worktree 环境性既有（index.js:334 守卫族），stash 基线对照 IDENTICAL-FAILURE-SETS 非代码回归；主仓 gate 隔离快照口径由 Step 7 --done 实测 |',
- ⚠️ `src/verify-probes.js:1367` '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
- ⚠️ `src/verify-probes.js:1370` '探针 1 命中全部为探针基础设施自指噪声（匹配器正则源码 TODO_ASCII_MARKER_RE、骨架模板 <!--TODO--> 占位串、word-boundary 修复注释引文）——非未实现代码，逐条裁定为误报（probe1-literal-false-positive 修复后的残留噪声面，仅剩自指类）。
真债务：core-engine 模块卡 29.4KB 超预算（execute Step 2 已提示，建议 modules split-changelog）。',
- ⚠️ `src/verify-probes.js:1373` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:1376` '- 长驻进程：不涉及；服务端点：不涉及（探针 5 报的 GET /api/path、GET /api 为注释/文档中的示例字符串，非真实端点，误报裁定）
- 证据链：worktree 分支 sillyspec/2026-09-16-cross-layer-contract-probe（diff 3 文件 +258/-13）；三条回执日志 .sillyspec/.runtime/verify-logs/（2026-09-16 时间窗，尾部无失败签名，exit 0）
- 失败模式排除：契约面解析 fail-soft（design 不可读→两维度 skipped 注记不炸）；重跑降级（catch 兜底无契约键→跳过对比不误报）；旧 facts 无 probe8 键→不误报——三条降级路径均有实现注释与测试/审查覆盖',
- ⚠️ `src/verify-probes.js:1379` '<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：',
- ⚠️ `src/verify-postcheck.js:371` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
- ⚠️ `src/verify-postcheck.js:396` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
- ⚠️ `src/verify-postcheck.js:397` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
- ⚠️ `src/verify-postcheck.js:417` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
- ⚠️ `src/verify-postcheck.js:1958` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
关键词覆盖（worktree grep 实证）：parseDesignContracts（verify-probes.js:245 实现+导出）/ contractOrphans（:307 初始化/:410+ 比对产出）/ missingRequired（:307/:420+ 仅提交端点启用）/ probe8-skip（:253 整章跳过）/ 契约外载荷键+契约必填漏发渲染行（renderProbe8Lines）/ PROBE8_CONTRACT_ORPHANS_LINE_RE+PROBE8_MISSING_REQUIRED_LINE_RE（verify-postcheck.js:2785-2789 锚点解析）。设计能力词全部落实现。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（test）找到 11 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-01 契约面解析：design.md 含契约类章节且表头首列含「字段/Field」→ parseDesignContracts 每张命中表产出 {name, fields, required}（required=说明列含「必填/required/※」）；design.md 不存在/无契约面/含 probe8-skip 章节 → 返回 null 或空契约面，不报错不误报。 | test/probe8-contract-pivot.test.mjs | 用例 4/5 直调断言+用例 1 命中 | covered | 用例 4 无契约面/用例 5 非契约表直调 parseDesignContracts 断言；用例 1 命中产出（人工改写：测试归属 task-03 卡，机械归属按 task 自身 allowed_paths 未连上；锚点 `test/probe8-contract-pivot.test.mjs`） |
| FR-02 契约外载荷键：前端载荷键 ∉ 契约字段归一化并集且已落既有 feOnly/mispairs 疑似面 → contractOrphans 含该键（hint 可选，token-Jaccard≥0.4），advisory 不阻断；载荷键 ∈ 契约字段 → 不进 contractOrphans、既有维度照常输出。 | test/probe8-contract-pivot.test.mjs | 用例 1 命中+用例 3 负例 | covered | 用例 1：sourceShdId 命中 contractOrphans；用例 3：∈ 契约字段不进（人工改写：归属 task-03 测试；锚点 `test/probe8-contract-pivot.test.mjs`） |
| FR-03 必填漏发：契约 required 字段在 feKeys 全集零出现且「接口定义」章含 POST/PUT 行 → missingRequired 含 {field, contract}，advisory；无提交端点行 → 本维度不启用。 | test/probe8-contract-pivot.test.mjs | 用例 2 命中+无 POST 负例 | covered | 用例 2：reportOrgId 命中；同 fixture 去 POST 行重跑不报（人工改写：归属 task-03 测试；锚点 `test/probe8-contract-pivot.test.mjs`） |
| FR-05 渲染与 metrics：PROBE8 渲染段新增 contractOrphans/missingRequired 两行（无契约面时注记不空段），buildVerifyFacts probe8 metrics 同步扩展。 | test/probe8-contract-pivot.test.mjs | 渲染→锚点 round-trip 断言 | covered | 用例 1 含真渲染→parseProbePrefillAnchors→机械计数 round-trip；用例 4 无契约面注记不空段（人工改写：归属 task-03 测试；锚点 `test/probe8-contract-pivot.test.mjs`） |
| 返回结构契约：runProbe8PayloadParity 返回值在既有字段外新增 contractCount/contractOrphans/missingRequired，既有 mispairs/feOnly/missingNotNull 及各计数键原样保留（npm test 全量、既有 probe8-payload-parity 五组零失败佐证）。 | test/probe8-payload-parity.test.mjs + test/probe8-contract-pivot.test.mjs | 既有五组锁旧键+新用例锁新键 | covered | payload-parity 5/5 零回归（回执日志 2）+ 新用例断言新键（人工改写；锚点 `test/probe8-payload-parity.test.mjs`、`test/probe8-contract-pivot.test.mjs`） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-06 对账维度在场：verify-result.md 含「#### 探针 8」子节时，probe8 维度参与正文预填段与重跑机械结果对账——contractOrphans/missingRequired 计数不符 → mismatches 含 probe8 条目且 severity=warning（不阻断，envelope probe_consistency_drift 放行）。 | test/probe8-contract-pivot.test.mjs | 渲染→锚点 round-trip | covered | 用例 1 的 round-trip 断言锁定渲染行↔锚点正则一致性（人工改写：归属 task-03 测试；锚点 `test/probe8-contract-pivot.test.mjs`） |
| 一致零输出：probe8 计数吻合 → 无 probe8 mismatch，factsConsistency.checked 列表含 probe8。 | 本 verify 流程自身 | 本报告「#### 探针 8」子节 CLI 预填+Step 7 --done 一致性对账 | covered | --init 已渲染 probe8 子节（不适用态）；--done 的 facts 对账即本条活体验证（人工改写：流程即测试；锚点 `test/probe8-contract-pivot.test.mjs` round-trip 断言） |
| 既有分级零变动：probe1/6=ERROR、probe3/5=WARNING 分级与既有对账语义原样（只增不改），npm test 全量零失败。 | 全量测试套件 | worktree 基线对照 | covered | npm test 492 过/13 失败恰为声明基线（IDENTICAL-FAILURE-SETS stash 对照；verify-postcheck diff 仅 additive；锚点 `test/probe8-payload-parity.test.mjs`）（人工改写；锚点 `test/probe8-payload-parity.test.mjs`、`test/probe8-contract-pivot.test.mjs`） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 用例1 契约外键命中：sourceShdId ∉ 契约面（含 safelyHiddenId）→ contractOrphans 命中且既有 mispairs/feOnly 输出不受影响。 | `test/probe8-contract-pivot.test.mjs` | 用例、契约外键命中、sourceShdId、契约面、safelyHiddenId（`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-contract-pivot.test.mjs:4`（用例）、`test/probe8-contract-pivot.test.mjs:5`（契约外键命中）、`test/probe8-contract-pivot.test.mjs:5`（sourceShdId） |
| 用例2 必填漏发命中：reportOrgId 标必填 + POST 行在场 + feKeys 无该键 → missingRequired 命中；无 POST 行不报。 | `test/probe8-contract-pivot.test.mjs` | 用例、必填漏发命中、reportOrgId、标必填、POST（`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-contract-pivot.test.mjs:4`（用例）、`test/probe8-contract-pivot.test.mjs:7`（必填漏发命中）、`test/probe8-contract-pivot.test.mjs:129`（reportOrgId） |
| 用例3 对齐零新告警：载荷键全 ∈ 契约字段 → 两新数组空、既有维度照常输出。 | `test/probe8-contract-pivot.test.mjs` | 用例、对齐零新告警、载荷键全、契约字段（`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-contract-pivot.test.mjs:4`（用例）、`test/probe8-contract-pivot.test.mjs:9`（对齐零新告警）、`test/probe8-contract-pivot.test.mjs:9`（载荷键全） |
| 用例4 无契约面 skipped：contractCount=0 + 注记，不误报不空段。 | `test/probe8-contract-pivot.test.mjs` | 用例、无契约面、skipped、contractCount、注记（`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-contract-pivot.test.mjs:4`（用例）、`test/probe8-contract-pivot.test.mjs:10`（无契约面）、`test/probe8-contract-pivot.test.mjs:10`（skipped） |
| 用例5 非契约表不入面：文件清单表/风险表不被误当契约面（表头首列判据生效）。 | `test/probe8-contract-pivot.test.mjs` | 用例、非契约表不入面（`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-contract-pivot.test.mjs:4`（用例）、`test/probe8-contract-pivot.test.mjs:11`（非契约表不入面） |

- ⚠️ 零/半自动化承接条目 8 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
D-001@v1（契约枢纽+advisory 核心）→ FR-01~03 → task-01/task-03 → 证据：五用例+实现锚点（见决策矩阵）。D-002@v1（扩展现有探针8）→ FR-01~06 → 三 task → 证据：零回归三重锁定+接线 diff。链路闭环，无未闭环决策。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3 + worktree 3] + artifact 0), 0 frontend calls [scope: change-diff (4 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 2 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）

## 测试结果 [层：确定性检查——CLI 实测对账]
| 命令 | 结果 | 说明 |
|---|---|---|
| node --test test/probe8-contract-pivot.test.mjs（worktree） | 5/5 全绿 | 回执日志 1，exit 0 |
| node --test test/probe8-payload-parity.test.mjs（worktree） | 5/5 全绿 | 零回归，回执日志 2，exit 0 |
| npm run lint（worktree） | 全绿 exit 0 | 644 文件，未引用导出 0，回执日志 3 |
| npm test（worktree） | 492 过 / 13 失败 | 13=worktree 环境性既有（index.js:334 守卫族），stash 基线对照 IDENTICAL-FAILURE-SETS 非代码回归；主仓 gate 隔离快照口径由 Step 7 --done 实测 |

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-01、task-03 | verify-probes.js:245/:307/:410 实现 + 五用例（探针 7 矩阵 covered 行） | 闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-01、task-02、task-03 | 既有 payload-parity 5/5 零回归 + verify-postcheck.js:2785-2789/:3049-3063 接线 + round-trip 断言 | 闭环 |

## 技术债务 [层：人工判断]
探针 1 命中全部为探针基础设施自指噪声（匹配器正则源码 TODO_ASCII_MARKER_RE、骨架模板 <!--TODO--> 占位串、word-boundary 修复注释引文）——非未实现代码，逐条裁定为误报（probe1-literal-false-positive 修复后的残留噪声面，仅剩自指类）。
真债务：core-engine 模块卡 29.4KB 超预算（execute Step 2 已提示，建议 modules split-changelog）。

## 变更风险等级 [层：人工判断]
unit-sufficient——纯 advisory 探针扩展，无运行时组件/端点/协议触碰（不新增 daemon/服务）；brainstorm gate 曾报 session/lease/lifecycle 关键词命中但均为否定语境（「不涉及 session/lease/lifecycle 关键词，省略」），抑制可审计。测试面=单测+套件零回归充分。

## Runtime Evidence [层：人工判断]
- 长驻进程：不涉及；服务端点：不涉及（探针 5 报的 GET /api/path、GET /api 为注释/文档中的示例字符串，非真实端点，误报裁定）
- 证据链：worktree 分支 sillyspec/2026-09-16-cross-layer-contract-probe（diff 3 文件 +258/-13）；三条回执日志 .sillyspec/.runtime/verify-logs/（2026-09-16 时间窗，尾部无失败签名，exit 0）
- 失败模式排除：契约面解析 fail-soft（design 不可读→两维度 skipped 注记不炸）；重跑降级（catch 兜底无契约键→跳过对比不误报）；旧 facts 无 probe8 键→不误报——三条降级路径均有实现注释与测试/审查覆盖

## 代码审查 [层：人工判断]
问题列表：无 P1/P2。P3 建议两条：
1. contractOrphans 的 hint 路径未显式设归一化长度下限（主配对有 ≥4 门槛）——token 逻辑天然规避大部分，可补一行口径注释（后续顺手）
2. parseDesignContracts 表头判据只认首列含「字段」——字段列在第二列的形态（| 序号 | 字段 |）不入面，属 R-01 已登记方差，采实证后再收
走查清单（纯后端探针扩展：①编辑链路/②非主分支流/③守卫一致性/⑤事务均不适用——无 UI 无端点无事务）：
④ 载荷字段契约=本变更主题：探针 8 两新维度经 execute 验收审查 a-f 清单 + 本报告 round-trip 断言双重核验。
总体评价：纯函数解析器+additive 扩展面干净，零回归三重锁定落实，advisory 口径无 error 混入（验收审查 d 项实证）。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute 阶段独立验收审查（agent-tool 子代理，execute-review-2026-09-16-135522）双 pass：a-f 清单全过（改动面全集/渲染↔锚点 round-trip/五用例非空壳/advisory 口径/定向复跑/EHS 案例同构），无阻断项，1 处口径注记（required 任一列判据超集）已并入设计一致性节。对结论枚举无影响。
