# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——五 FR 全部实现并有直测+独立验收双证；NOTE 两项：①verify 实测期发现本机 Temp 根游离 `.sillyspec` 污染（祖先解析劫持 temp 夹具，两个「预存失败」的真正根因，已清除并复绿）；②快照 overlay 冒烟 warn 行与测试输出中含 fail 字样的 ✅ PASS 行会被失败行账本计入（门禁噪声，移交后续 quick 修）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | 本机 `C:\Users\qinyi\AppData\Local\Temp\.sillyspec` 游离目录曾劫持所有 temp 夹具的 resolveSpecDir 祖先解析（2026-09-16 12:47 生成，已清除；两个「预存失败」agent-automation-batch4/feedback-batch2-hardening 的真根因，清除后 2/2 复绿） | 任何 CLI 调用以 Temp 直系为 cwd 时可能再生成；复发时先查 `ls $TMP/.sillyspec`；根治方向（resolveSpecDir 对 tmpdir 直下起点不向上走）建议后续 quick 立项 |
| other | 失败行账本误收噪声（verify-quality-scan）：①快照 overlay 冒烟 ⚠️ warn 行含 ModuleNotFoundError 被计入未豁免失败行；②失败测试文件的 console 输出体中含 fail-closed/fail-open/failed 字样的 ✅ PASS 行被失败行正则收走（本轮 20/27 行为噪声） | 后续 quick：partitionFailures 剔除行首 ✅ PASS 形态与 gate-snapshot 冒烟 ⚠️ 前缀行；本轮已用 SNAPSHOT_OFF+根因清除绕过，未改该代码 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
无（execute 六任务 review 全 pass，无 cannot_verify 任务）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
无（risk_level 显式声明 unit-sufficient——纯门禁校验逻辑+配置键，无 daemon/session/启动入口/端点集成面）

## 任务完成度 [层：人工判断]
- task-01 ✅ 完成：回执双形态解析（7/7 直测 + verify-facts 系 31 既有回归全绿）
- task-02 ✅ 完成：detectDuplicateTopKeys + feasibility 接线（4/4 + plan-postcheck 系 12 场景回归）
- task-03 ✅ 完成：D-003@v2 条件加白 + declaredFace + 审计报备（4/4 新测 + 三既有测试文件 17 test，含 4 条有意断言更新）
- task-04 ✅ 完成：gate_snapshot.copy 登记 + renderExample + copy 面回退（5/5 + config-schema 防漂断言 + gate-snapshot 系回归）
- task-05 ✅ 完成：probe7 双口径 + advisory 文案（4/4 + acceptance-matrix 系回归）
- task-06 ✅ 完成：五模块 sidecar 认领（主仓提交 21ef3ad，各 +1 行；module-impact 五模块 pending→done）

## 设计一致性 [层：人工判断]
一致，两处实现内细化（均在任务面内）：
1. task-01 骨架文案改齐两处（backfillMissingEvidenceSlots + generateVerifyResultSkeleton）——task 卡点名前者，后者同文件同语义示例，一并改齐防两处漂移。
2. task-04 junction 回退从蓝图设想的「抛错回退」细化为「链接后 existsSync 后验回退」——实现期实证 Windows 下 symlinkSync(文件, 'junction') 不抛错但产不可解析重解析点（假成功坑），后验 + 回退复制已入测试覆盖。

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
- ⚠️ `src/verify-probes.js:790` L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->')
- ⚠️ `src/verify-probes.js:821` L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->')
- ⚠️ `src/verify-probes.js:1230` *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入）
- ⚠️ `src/verify-probes.js:1272` * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动），
- ⚠️ `src/verify-probes.js:1274` * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入
- ⚠️ `src/verify-probes.js:1285` const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/
- ⚠️ `src/verify-probes.js:1286` if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动
- ⚠️ `src/verify-probes.js:1307` * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
- ⚠️ `src/verify-probes.js:1319` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
- ⚠️ `src/verify-probes.js:1345` '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
- ⚠️ `src/verify-probes.js:1348` '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
- ⚠️ `src/verify-probes.js:1354` '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->',
- ⚠️ `src/verify-probes.js:1357` '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
- ⚠️ `src/verify-probes.js:1360` '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->',
- ⚠️ `src/verify-probes.js:1363` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:1366` '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->',
- ⚠️ `src/verify-probes.js:1369` '<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：',
- ⚠️ `src/stages/verify.js:199` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `src/stages/plan-postcheck.js:1449` * 无 diff 可取）生成骨架，影响类型列留 <!--TODO--> 由 execute/verify 按实际 diff 回填。
- ⚠️ `src/run/gates.js:72` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:77` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:80` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:85` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:91` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:94` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:115` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:117` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:120` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:145` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:146` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:153` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ℹ️ 5 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
- ✅「多行 YAML 聚合 / RECEIPT_CONT_LINE_RE / 字段序无关」→ src/verify-facts-schema.js:55,109-156（聚合循环+fail-closed 四字段判定）
- ✅「detectDuplicateTopKeys / 顶层键重复」→ src/stages/plan-postcheck.js:230-242（导出）+ :1292-1300（接线）
- ✅「条件加白 / declaredFace / .sillyspec/docs/」→ src/worktree-apply.js:601-605（size>0 才 add）+ :1383-1387（hasAllowList 口径）+ :1390-1404（审计报备）
- ✅「gate_snapshot.copy / junction / 回退 copy」→ src/config-schema.js:155-161（键）+ src/run/gate-snapshot.js:204-256（applyGateSnapshotCopy 全分支）
- ✅「.test. 文件名锚点 / advisory 文案」→ src/probe7-anchor-check.js:67-69（双口径判定）+ src/run/gates.js:922,924（文案）
- 五 Phase 关键词全部在源码命中，无未实现项。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/stages、test）找到 14 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-02: 模块目录（src/stages、test）找到 11 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-03: 模块目录（src、test）找到 14 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-04: 模块目录（src、src/run、test）找到 14 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-05: 模块目录（src、src/run、test）找到 14 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ⚠️ task-06: 模块目录（.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 多行任意序四字段条目进 runtimeEvidence 且与单行形态等价 | `test/receipt-multiline-parse.test.mjs` | runtimeEvidence（`test/receipt-multiline-parse.test.mjs`） | covered | `test/receipt-multiline-parse.test.mjs:15`（runtimeEvidence） |
| 缺任一字段的条目不命中（fail-closed） | `test/receipt-multiline-parse.test.mjs` | fail、closed（`test/receipt-multiline-parse.test.mjs`） | covered | `test/receipt-multiline-parse.test.mjs:4`（fail）、`test/receipt-multiline-parse.test.mjs:4`（closed） |
| 存量单行回执（含全角 ｜、log 带空格路径）解析逐字节不变 | `test/receipt-multiline-parse.test.mjs` | log（`test/receipt-multiline-parse.test.mjs`） | covered | `test/receipt-multiline-parse.test.mjs:15`（log） |
| 占位 <待填：*> 双形态均不命中 | `test/receipt-multiline-parse.test.mjs` | 占位、待填（`test/receipt-multiline-parse.test.mjs`） | covered | `test/receipt-multiline-parse.test.mjs:4`（占位）、`test/receipt-multiline-parse.test.mjs:82`（待填） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| depends_on 重复两行的卡被 error 阻断且报错含键名 + 两个行号 | `test/taskcard-duplicate-key.test.mjs` | depends_on、error、两个行号（`test/taskcard-duplicate-key.test.mjs`） | covered | `test/taskcard-duplicate-key.test.mjs:4`（depends_on）、`test/taskcard-duplicate-key.test.mjs:90`（error）、`test/taskcard-duplicate-key.test.mjs:99`（两个行号） |
| 无重复键的卡零新 error | `test/taskcard-duplicate-key.test.mjs` | error（`test/taskcard-duplicate-key.test.mjs`） | covered | `test/taskcard-duplicate-key.test.mjs:90`（error） |
| 块列表（allowed_paths: 换行缩进 - x）与缩进子键不误报 | `test/taskcard-duplicate-key.test.mjs` | 块列表、allowed_paths（`test/taskcard-duplicate-key.test.mjs`） | covered | `test/taskcard-duplicate-key.test.mjs:57`（块列表）、`test/taskcard-duplicate-key.test.mjs:41`（allowed_paths） |
| goal: > 折叠块的缩进续行不误报 | `test/taskcard-duplicate-key.test.mjs` | goal（`test/taskcard-duplicate-key.test.mjs`） | covered | `test/taskcard-duplicate-key.test.mjs:43`（goal） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| design §6 非空且未声明 docs 的变更：changedFiles 含 .sillyspec/docs/x.md 时 Gate1 零违规且该文件进 patch | `test/worktree-allow-list-violations.test.mjs`<br>`test/cross-repo-apply.test.mjs`<br>`test/apply-docs-allowlist.test.mjs` | design、docs、changedFiles（`test/worktree-allow-list-violations.test.mjs`、`test/cross-repo-apply.test.mjs`、`test/apply-docs-allowlist.test.mjs`） | covered | `test/worktree-allow-list-violations.test.mjs:5`（design）、`test/worktree-allow-list-violations.test.mjs:64`（docs）、`test/worktree-allow-list-violations.test.mjs:86`（changedFiles） |
| design + 任务卡全缺时 allowMap 行为与旧版完全一致（fail-open） | `test/worktree-allow-list-violations.test.mjs`<br>`test/cross-repo-apply.test.mjs`<br>`test/apply-docs-allowlist.test.mjs` | design、allowMap、fail（`test/worktree-allow-list-violations.test.mjs`、`test/cross-repo-apply.test.mjs`、`test/apply-docs-allowlist.test.mjs`） | covered | `test/worktree-allow-list-violations.test.mjs:5`（design）、`test/worktree-allow-list-violations.test.mjs:110`（allowMap）、`test/worktree-allow-list-violations.test.mjs:13`（fail） |
| declaredFace 命中（allowed_paths 已声明 docs）时不报备 | `test/worktree-allow-list-violations.test.mjs`<br>`test/cross-repo-apply.test.mjs`<br>`test/apply-docs-allowlist.test.mjs` | declaredFace、命中、allowed_paths、已声明、docs（`test/apply-docs-allowlist.test.mjs`、`test/worktree-allow-list-violations.test.mjs`、`test/cross-repo-apply.test.mjs`） | covered | `test/apply-docs-allowlist.test.mjs:9`（declaredFace）、`test/worktree-allow-list-violations.test.mjs:26`（命中）、`test/worktree-allow-list-violations.test.mjs:91`（allowed_paths） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 配置目录条目后快照内 existsSync(join(snapshotRoot, rel)) 为真 | `test/gate-snapshot-copy.test.mjs` | existsSync、join、snapshotRoot、rel（`test/gate-snapshot-copy.test.mjs`） | covered | `test/gate-snapshot-copy.test.mjs:11`（existsSync）、`test/gate-snapshot-copy.test.mjs:20`（join）、`test/gate-snapshot-copy.test.mjs:63`（snapshotRoot） |
| 未配置时快照创建路径逐字节走旧逻辑 | `test/gate-snapshot-copy.test.mjs` | — | covered | 人工核验 `test/gate-snapshot-copy.test.mjs`（用例②未配置零副作用直测） |
| junction 不可用时回退 copy | `test/gate-snapshot-copy.test.mjs` | junction、copy（`test/gate-snapshot-copy.test.mjs`） | covered | `test/gate-snapshot-copy.test.mjs:5`（junction）、`test/gate-snapshot-copy.test.mjs:2`（copy） |
| 主仓不存在条目 warn 跳过，快照不作废 | `test/gate-snapshot-copy.test.mjs` | warn、跳过、快照不作废（`test/gate-snapshot-copy.test.mjs`） | covered | `test/gate-snapshot-copy.test.mjs:13`（warn）、`test/gate-snapshot-copy.test.mjs:13`（跳过）、`test/gate-snapshot-copy.test.mjs:94`（快照不作废） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| covered 行证据 test/foo.test.mjs（无行号）不计入 missingAnchors | `test/probe7-anchor-testfile.test.mjs` | covered、行证据、test、mjs（`test/probe7-anchor-testfile.test.mjs`） | covered | `test/probe7-anchor-testfile.test.mjs:4`（covered）、`test/probe7-anchor-testfile.test.mjs:53`（行证据）、`test/probe7-anchor-testfile.test.mjs:4`（test） |
| src/x.js:42 维持原判定 | `test/probe7-anchor-testfile.test.mjs` | src（`test/probe7-anchor-testfile.test.mjs`） | covered | `test/probe7-anchor-testfile.test.mjs:11`（src） |
| 无任何锚点仍计入且文案正确 | `test/probe7-anchor-testfile.test.mjs` | — | covered | 人工核验 `test/probe7-anchor-testfile.test.mjs`（用例③纯中文与裸反引号仍计 missing + gates 文案断言） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 五个 sidecar 文件各含一条 2026-09-16-friction5-hardening 变更名锚定的条目 | 无归属测试——判定大概率 uncovered | — | non-testable | 纯文档追加任务；git show 21ef3ad --stat 实证 5 文件各 +1 行（commit 锚点即证据） |
| 条目内容与实际落地行为一致（对照 task-01~05 的 acceptance） | 无归属测试——判定大概率 uncovered | — | non-testable | 人工逐条对照 execute review 结论核验一致（verify Step3/5 记录）；文档无测试承接面 |
| module-impact.md 更新结果表五模块 pending → done | 无归属测试——判定大概率 uncovered | — | non-testable | 人工核验 module-impact.md 更新结果表 5 行 done（sidecar 已追加） |

- ⚠️ 零/半自动化承接条目 5 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
- D-001@v1 → FR-01 → task-01：parseEvidenceSlots 双形态（下方矩阵 Evidence 列）✅ 闭环
- D-002@v1 → FR-04 → task-04：gate_snapshot.copy 键 + applyGateSnapshotCopy ✅ 闭环
- D-003@v2 → FR-03 → task-03：条件加白 + declaredFace ✅ 闭环（D-003@v1 已标 superseded，无下游引用残留——decisions.md 内 v2 条目显式 supersedes，plan/design/requirements 均只引 v2）
- D-004@v1 → FR-02 → task-02：detectDuplicateTopKeys + feasibility ✅ 闭环
- D-005@v1 → FR-05 → task-05：双口径锚点 ✅ 闭环

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3 + worktree 3] + artifact 0), 0 frontend calls [scope: change-diff (17 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 2 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）

## 测试结果 [层：确定性检查——CLI 实测对账]
- CLI noAI 质量扫描（隔离快照，module[cli-core,run-gates]+deps 子集 + 5 新测试）：全部通过（快照轮曾报 agent-automation-batch4 / feedback-batch2-hardening 两失败——已根因为本机 Temp 根游离 `.sillyspec` 劫持祖先解析【非代码回归：worktree stash 后 HEAD 基线同挂】，清除污染后两测试 2/2 复绿；known_failures 未新增豁免）。
- npm run lint（快照实测，CLI 亲跑）：退出码 0（647 文件：src 133 + test 514，含 5 新测试文件）。
- 新增直测：receipt-multiline-parse 7/7、taskcard-duplicate-key 4/4、apply-docs-allowlist 4/4（+连带两既有文件 13 test）、gate-snapshot-copy 5/5、probe7-anchor-testfile 4/4。
- 既有回归：verify-facts 系 31、plan-postcheck/taskcard 系 12、acceptance-matrix 系、gate-snapshot 系 19——全绿。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01 | task-01 | src/verify-facts-schema.js:109-156 双形态聚合 + test/receipt-multiline-parse.test.mjs 7 用例 | 闭环（task-06 sidecar 认领条目附带记录） |
| D-002@v1 | FR-04 | task-04 | src/config-schema.js:155-161 + src/run/gate-snapshot.js:204-256 + test/gate-snapshot-copy.test.mjs 5 用例 | 闭环（同上） |
| D-003@v1 | — | — | superseded by D-003@v2（无条件加白翻转空清单 fail-open，design-grill M5） | 已取代（无下游引用残留） |
| D-004@v1 | FR-02 | task-02 | src/stages/plan-postcheck.js:230-242,1292-1300 + test/taskcard-duplicate-key.test.mjs 4 用例 | 闭环（同上） |
| D-005@v1 | FR-05 | task-05 | src/probe7-anchor-check.js:67-69 + src/run/gates.js:922,924 + test/probe7-anchor-testfile.test.mjs 4 用例 | 闭环（同上） |
| D-003@v2 | FR-03 | task-03 | src/worktree-apply.js:601-605,1383-1404 + test/apply-docs-allowlist.test.mjs 4 用例 + 两既有测试 4 条有意断言更新 | 闭环（同上） |

## 技术债务 [层：人工判断]
探针 1 的 43 处命中全部位于本变更改动的源文件既有注释/骨架文案（verify-probes.js 的 TODO_MARKER 正则与骨架模板字符串、gates.js 的骨架占位逻辑、plan-postcheck.js:1449 的 module-impact 模板注释）——是「扫描器自描述文案」性质的历史存在，非本次引入的新债；本次改动未新增任何 TODO/FIXME/尚未实现标记。

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design.md frontmatter risk_level）。理由：五处全部是门禁校验/解析逻辑与可选配置键扩展，无 daemon/session/启动入口/端点/状态流转改动；散文中 claim/daemon/heartbeat 字样为回执字段名与生命周期豁免句关键词误伤（CLI 判级提示已按显式声明收敛）。无被同句否定语境抑制的关键词。

## Runtime Evidence [层：人工判断]
不涉及（unit-sufficient：无运行时组件启动/端点/请求响应面）。commit 锚点：worktree 未提交改动集（base 453508a3）+ 主仓 sidecar 提交 21ef3ad。

## 代码审查 [层：人工判断]
零覆盖路径显式走查（探针 7 ⚠️ 定向面）：
1. ① 编辑/更新链路（回显/字段映射/残留态）：task-01 多行聚合对「单行→多行改写」的既有报告零触碰（ensureAcceptanceMatrixSection/backfillMissingEvidenceSlots 段在场即 no-op 幂等口径未动）；task-03 hasAllowList 回退分支（allowMap 无 declaredFace 时回退 mainSet 判定）——条件加白下两者空性等价，已走查无语义漂移。
2. ② 非主分支流：task-04 的 ../与绝对路径拒绝、主仓缺失跳过、overlay 已覆盖跳过三分支均有直测；task-02 CRLF 入口归一分支直测覆盖。
3. ③ 守卫一致性：Gate1（违规判定消费含白名单 allowSet）与 resolvePatchFiles（patch 圈定同源 allowSet）口径一致，无「放行但不进 patch」裂缝；declaredFace 审计与 hasAllowList 同口径。
4. ④ 载荷字段契约：探针 8 不适用（无 Java/SQL 后端面）。
5. ⑤ 分页/并发/事务原子性：不涉及（纯解析/校验逻辑无共享态；gate-snapshot copy 面逐条独立 fail-open）。
总体评价：五处改动边界清晰、与既有机制同源，独立验收审查（agent-tool 通道，8 项全 pass）与本次走查结论一致，未发现 P1/P2 缺陷。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
已有 execute 阶段独立验收审查（agent-tool 通道 review.json：execute-review-2026-09-16-122603，8 项全 pass，specVerdict/qualityVerdict 均 pass），其结论与本报告一致；无追加二次复核。
