# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS（8/8 任务完成且 review 全 pass；独立验收审查 0 fail、3 gap 全部收口；主仓全量 npm test 524 过/0 失败 + lint 绿；四事实自查：集成实测已跑（quality-scan 由 --done 亲测）/ 零移交项 / 零 db/*.sql 交付 / 矩阵无 uncovered 残留）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| 无 | 无 | 无 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
无

## 任务完成度 [层：人工判断]
- task-01 ✅ 完成（facts producer 扩写：五字段首调主路径产出/四列 severity/X-03 文法/schema additive；review pass/pass）
- task-02 ✅ 完成（validatePassEligibility 注册壳+纯函数+factsExpected+豁免洞三分层+sourceTag；review pass/pass）
- task-03 ✅ 完成（probe7 联动分支+骨架降级提示+2.9~2.12 断言+G-1 逐行 advisory 补齐 2.13；review pass/pass）
- task-04 ✅ 完成（fix.sql 双门四条面+--confirm 前置+db-script 互斥+archive {HANDOVER_SUMMARY} 注入；review pass/pass）
- task-05 ✅ 完成（skip 跨仓三态/adopt 两层/probe7 多根/design 无段头降 warning；review pass/pass）
- task-06 ✅ 完成（清单两条目+verify prompt 封顶自查+镜像三步流水线全绿；review pass/pass）
- task-07 ✅ 完成（+79 断言：新文件 50/既有 9 文件 29；两个语义翻转收敛；review pass/pass）
- task-08 ✅ 完成（Wave 完成度门+21/21 直测+batch 夹具双 Wave 适配；review pass/pass）
- 8/8 完成，零存疑

## 设计一致性 [层：人工判断]
主体**一致**：§1~§7 全部落位且经 execute Step 10 独立验收逐 file:line 核验（14 项 checklist 0 fail）。等效偏差六条（验收审查已注记）：
1. apply 门按 X-03 纯文法对账落地，未做「有 log 路径走四条件校验」（verify 侧另有四条件链路，D-007 定位防遗忘非防伪造）；
2. 降级理由校验落点前移 producer 解析时（fail-closed 强于抽查，等效偏强）；
3. Wave 解析为 execute.js 同源正则孪生（parseWavesFromPlan 未导出且 execute.js 不在清单）+ 测试锁漂移；
4. 清单「命中条件注入」以常驻+标注形态落地（brainstorm.js 引导语），非机械条件注入；
5. 镜像再生的 brainstorm#5/verify#4/plan#3/archive#2 连带刷新属全量再生的真值对齐（源码 grep 实证镜像此前落后）；
6. runtimeEndpointExcluded「无对应 handover」以零行近似（保守收窄方向）。
执行中计划增补（已同步 design/module-impact/plan）：task-08（D-013 Wave 完成度门，Wave2 越位实证驱动）、platform-interface-map.md 行号锚维护、batch 夹具适配行、stage-contract.test.mjs 豁免洞翻转行。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stage-contract.js:750` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:755` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:790` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:797` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
- ⚠️ `src/verify-probes.js:7` *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等 probe1-noqa
- ⚠️ `src/verify-probes.js:17` * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。 probe1-noqa
- ⚠️ `src/verify-probes.js:40` // - 尚未实现：中文短语高置信，保持子串匹配； /* probe1-noqa */
- ⚠️ `src/verify-probes.js:41` // - TODO/FIXME/HACK：ASCII 标识符边界匹配——TODO_FLAG_TODO / parseHackArgs 等标识符内部不再 /* probe1-noqa */
- ⚠️ `src/verify-probes.js:43` // - XXX：边界匹配且前或后紧邻 CJK 表意字符即排除——「XXX完成处置」「订单XXX号」类中文占位 /* probe1-noqa */
- ⚠️ `src/verify-probes.js:44` //   模板不再命中（独立代码注释 `XXX:` / `// XXX fix` 紧邻标点空白，仍命中）。 /* probe1-noqa */
- ⚠️ `src/verify-probes.js:46` const TODO_ASCII_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_])(?:TODO|FIXME|HACK)(?![A-Za-z0-9_])`) /* probe1-noqa */
- ⚠️ `src/verify-probes.js:47` const XXX_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])XXX(?![A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])`) /* probe1-noqa */
- ⚠️ `src/verify-probes.js:49` if (line.includes('尚未实现')) return true /* probe1-noqa */
- ⚠️ `src/verify-probes.js:916` * 背景：此前骨架判定列 `<待填：四选一>` + 证据列 `<TODO>` 全占位，24 格矩阵 agent 全量 probe1-noqa
- ⚠️ `src/verify-probes.js:956` * （原 `<待填：四选一>` / `<TODO>` 占位淘汰）——幂等保障沿用补段口径：段已在场（agent 已填/ probe1-noqa
- ⚠️ `src/verify-probes.js:1273` L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中') /* probe1-noqa */
- ⚠️ `src/verify-probes.js:1283` L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->') /* probe1-noqa */
- ⚠️ `src/verify-probes.js:1314` L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->') /* probe1-noqa */
- ⚠️ `src/verify-probes.js:1960` *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入） probe1-noqa
- ⚠️ `src/verify-probes.js:2002` * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动）， probe1-noqa
- ⚠️ `src/verify-probes.js:2004` * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入 probe1-noqa
- ⚠️ `src/verify-probes.js:2015` const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/ /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2016` if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动 /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2037` * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。 probe1-noqa
- ⚠️ `src/verify-probes.js:2049` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2080` '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2083` '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2089` '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2092` '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2095` '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2098` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:2101` '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->', /* probe1-noqa */
- ⚠️ `src/verify-probes.js:2105` '<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：', /* probe1-noqa */
- ⚠️ `src/verify-postcheck.js:371` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类 probe1-noqa
- ⚠️ `src/verify-postcheck.js:396` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类 /* probe1-noqa */
- ⚠️ `src/verify-postcheck.js:397` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ } /* probe1-noqa */
- ⚠️ `src/verify-postcheck.js:417` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行 /* probe1-noqa */
- ⚠️ `src/verify-postcheck.js:2026` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。') /* probe1-noqa */
- ⚠️ `src/design-facts.js:293` lines.push(`author: ${String(author || '').trim() || 'TODO（git 用户名）'}`)
- ⚠️ `src/design-facts.js:294` lines.push(`created_at: ${String(now || '').trim() || 'TODO（ISO 时间）'}`)
- ⚠️ `src/design-facts.js:308` lines.push('<!-- TODO：为什么做、解决什么问题 -->')
- ⚠️ `src/design-facts.js:313` lines.push('<!-- TODO：要达成什么 -->')
- ⚠️ `src/design-facts.js:318` lines.push('<!-- TODO：明确不做的事（防止 scope creep） -->')
- ⚠️ `src/design-facts.js:323` lines.push('<!-- TODO（如适用）：为什么这样组织变更、为什么不走批量模式；不适用可整节删除 -->')
- ⚠️ `src/design-facts.js:328` lines.push('<!-- TODO：技术方案（分 Phase/Wave） -->')
- ⚠️ `src/design-facts.js:341` lines.push('<!-- TODO（代码类任务必填）：方法签名、数据结构 -->')
- ⚠️ `src/design-facts.js:346` lines.push('<!-- TODO：涉及 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 等关键词时本表必填（事件×发起方×接收方×必需字段×状态变化 矩阵）；确实不涉及时在紧邻位置写豁免短语——否定词必须紧邻「
- ⚠️ `src/design-facts.js:351` lines.push('<!-- TODO（如涉及）：表结构/字段变更；不涉及可整节删除或写明无 schema 变更 -->')
- ⚠️ `src/design-facts.js:356` lines.push('<!-- TODO（brownfield 必填）：未配置新功能时行为不变 / 新旧逻辑的回退路径 / 不改变的 API 与表结构 -->')
- ⚠️ `src/design-facts.js:375` lines.push('<!-- TODO：说明每个 D-xxx@vN 被哪些 FR-xxx / 设计章节覆盖；标注仍未解决的 D-xxx@vN 或剩余风险 -->')
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
- ⚠️ `src/stages/verify.js:199` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `docs/prompt/verify.md:247` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `docs/prompt/verify.md:293` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 `sillyspec verify-probes --change <change-name> --init`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、探针
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描关键词。本步骤 --done 时，CLI 会用 detectChangeR
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单，流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：{DOCS_ROOT}/flows/\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在同一次输出里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan.md 必须把它们分到不同「## Wave N」（同 Wave 共享文件会被 execute 强制并行，子代理互相覆盖；postcheck 拦同 Wave 共享）\n- task id 从 1 连续：task-01、task-02、task-03… 不能跳号或重号（postcheck 校验 id 连续性，gap 会拦）
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHITECTURE.md
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `test/acceptance-matrix-probe.test.mjs:204` assert((report.match(/<TODO>/g) || []).length === 0, '证据槽占位淘汰（全预填）')
- ⚠️ `test/acceptance-matrix-probe.test.mjs:251` '#### 探针 4：决策追踪覆盖', '<!--TODO-->', '',
- ⚠️ `test/acceptance-matrix-probe.test.mjs:260` assert(after1.includes('## 结论') && after1.includes('<!--TODO-->'), '不触碰既有正文')
- ⚠️ `test/acceptance-matrix-gate.test.mjs:9` *    - covered/partial 缺锚点 → missingEvidence；non-testable 空/<TODO> 理由 → missingEvidence；
- ⚠️ `test/acceptance-matrix-gate.test.mjs:10` *      uncovered 无证据要求（<TODO> 不计）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:63` '| 未承接声明 | 无归属测试 | — | uncovered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:88` assert(r.missingEvidence === 0, `uncovered 行 <TODO> 证据不计 missingEvidence；covered/partial 锚点齐、non-testable 有理由 → 0（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:121` '| 条目一 | `test/a.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:122` '| 条目二 | `test/a.test.mjs` | — | maybe | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:133` // 1.4 证据缺失三口径：covered 缺锚点 / partial <TODO> / non-testable 空理由
- ⚠️ `test/acceptance-matrix-gate.test.mjs:142` '| TODO 证据 | `test/a.test.mjs` | — | partial | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:149` assert(r.missingEvidence === 3, `covered 缺锚点 + partial <TODO> + non-testable 空白理由 → 3（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:225` '| 判定枚举解析 | `test/x.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:236` // 2.2 证据缺失 → errors 阻断（covered 缺锚点 + non-testable <TODO>）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:242` '| 证据锚点核验 | `test/x.test.mjs` | — | covered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:247` assert(r.ok === false && !!err, '证据缺失（covered 缺锚点 + <TODO>）→ 阻断')
- ⚠️ `test/design-facts.test.mjs:413` assert(def.includes('author: TODO（git 用户名）') && def.includes('created_at: TODO（ISO 时间）'),
- ⚠️ `test/design-facts.test.mjs:414` 'author/now 缺省 → TODO 占位（不产伪造值）')

（探针 1 语义裁定：全部命中为骨架生成器/校验器自身源码与测试夹具中的字面占位词——probe1-noqa 标记与 ASCII 边界匹配均已就位；无未实现标记残留。）

#### 探针 2：设计关键词覆盖
design §1~§7 关键能力逐词 grep 实证（主仓已应用态）：`validatePassEligibility`（src/stage-contract.js）、`evaluatePassEligibility`、`factsExpected`、`resolveIntegrationRan`→实现名 `judgeIntegrationRan`（src/verify-probes.js）、`parseDbScriptDeclarations`、`matrixPartialRows`→`countMatrixPartialRows`、`runtimeEndpointExcluded`→`parseRuntimeEndpointExcluded`、`severity`（verify-probes.js 四列解析）、`sourceTag`（change-risk-profile.js:434）、`assertWaveTasksComplete`（run/complete-handlers.js）、`{HANDOVER_SUMMARY}`（run/prompt.js）、`checkDbScriptDeclarationGate`（worktree-apply.js）、`isExplicitReviewWrite` 白名单（task-review.js:358）、`buildAcceptanceHints` 多根（verify-probes.js:860）、`mergeCrossRepoResults` skip 短路（verify-postcheck.js:1464）——全部命中，无缺词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-04: 模块目录（src、src/stages、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-06: 模块目录（src、src/stages、docs/prompt）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-07: 模块目录（NEW:test、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-08: 模块目录（src/run、NEW:test、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 首次 backfill（无 testCheckResult，对应 gates 收尾前置时点）后 verify-facts.json 含四个新字段且 handover items 带 severity——task-02 validator 消费时点已就位（生产-消费时序锚定） | `test/pass-eligibility.test.mjs` | integrationRan/severity/backfill | covered | `test/pass-eligibility.test.mjs:206`（E 组判定表经 backfillFactsFromMdAndTests 全链路）、`test/pass-eligibility.test.mjs:480`（壳层消费时点）；时序另由 src/run/gates.js:625 首调先于 runValidators 实证（execute 验收 #2） |
| parseHandoverRows：四列表格解析出 severity；三列表格行零迁移兼容按类型缺省映射；blocking 降 advisory 缺理由文法 → 仍按 blocking（fail-closed） | `test/pass-eligibility.test.mjs`、`test/verify-handover-structured.test.mjs` | severity/三列/降级 | covered | `test/pass-eligibility.test.mjs:287`、`test/pass-eligibility.test.mjs:300`、`test/pass-eligibility.test.mjs:311`、`test/verify-handover-structured.test.mjs:141` |
| parseDbScriptDeclarations：回执条目 command 含 db/x.sql 与「已对目标库执行：db/x.sql」声明行两类均命中；无声明 → [] | `test/pass-eligibility.test.mjs` | 声明文法 | covered | `test/pass-eligibility.test.mjs:397`（声明齐备双形态放行）、`test/pass-eligibility.test.mjs:438`（互斥） |
| Runtime Evidence 节「服务端点…不涉及」表格行命中 → facts.runtimeEndpointExcluded=true；节缺失/无命中 → false | `test/pass-eligibility.test.mjs` | 不涉及识别 | covered | `test/pass-eligibility.test.mjs:351`（producer 表格行识别，prose/非端点行不计） |
| validateFactsV2 对五新字段在场时类型/枚举校验通过、缺省不炸——存量 facts（无新字段）零迁移通过，schemaVersion 仍为 2 | `test/verify-handover-structured.test.mjs` | schema additive | covered | `test/verify-handover-structured.test.mjs:85`（backfill 落盘断言）；schemaVersion=2 不变由 npm test 全量 verify-facts 系测试兜底 |
| 既有测试零回归：test/verify-handover-structured.test.mjs 与 test/verify-facts-v2.test.mjs 全绿 | `test/verify-handover-structured.test.mjs` | 全绿 | covered | `test/verify-handover-structured.test.mjs:141` + `test/verify-facts-v2.test.mjs`（npm test 全量 524/0 含两文件） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 结论=PASS 且四条件各一态单独触发 → runValidators error（逐条 fact 枚举 + 触发行 + 修复指引）；四条件全清 → ok 放行（未触发行为零变化） | `test/pass-eligibility.test.mjs`、`test/verify-conclusion-slot.test.mjs` | 四态/放行 | covered | `test/pass-eligibility.test.mjs:70`（A 组四态）、`test/pass-eligibility.test.mjs:111`（B 组全清/非PASS/②④分工）、`test/verify-conclusion-slot.test.mjs:82`（触发文案） |
| factsExpected=false（存量无 facts）→ ok 不误伤；factsExpected=true 而 facts 缺失 → 全条件按触发处理，文案含「重跑 verify-probes」出路 | `test/pass-eligibility.test.mjs` | 双源 | covered | `test/pass-eligibility.test.mjs:137`、`test/pass-eligibility.test.mjs:146`、`test/pass-eligibility.test.mjs:480` |
| explicit + unit-sufficient + PASS WITH NOTES → 免证据维持；explicit + integration-critical + PASS WITH NOTES 且无结构化 handover 无齐全集成证据 → error（豁免洞分层） | `test/pass-eligibility.test.mjs`、`test/stage-contract.test.mjs` | 豁免洞三态 | covered | `test/pass-eligibility.test.mjs:175`（D 组三态）、`test/stage-contract.test.mjs`（集成4 断言翻转，D-002 锚） |
| sourceTag=build/unit 的回执不计入「集成实测已跑」绿判据；未传 sourceTag 默认 build；非 explicit 场景 requiresEvidence 行为不变 | `test/pass-eligibility.test.mjs` | sourceTag | covered | `test/pass-eligibility.test.mjs:253`（build/unit/cross-layer/未定类四态） |
| validatePassEligibility 与 validateAcceptanceMatrix 同签名（cwd, changeName, context）同构注册进 verify.validators；回退 = 移除注册行（纯加法） | `test/acceptance-matrix-gate.test.mjs` | 注册第三位 | covered | `test/acceptance-matrix-gate.test.mjs`（2.8 validators.length===3 断言） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 矩阵含 partial/uncovered 行且 facts.handover 零有效行（任意 severity）→ runValidators verify 阻断（ok=false），error 文案含触发行清单与修复指引（FR-04 第一态） | `test/acceptance-matrix-gate.test.mjs` | 矩阵含、partial、uncovered、行且、facts（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:21`（矩阵含）、`test/acceptance-matrix-gate.test.mjs:6`（partial）、`test/acceptance-matrix-gate.test.mjs:6`（uncovered） |
| 存在任意 severity 的 handover 有效行 → 该分支放行，封顶与否由 blocking 行决定（FR-04 第二态；与 FR-01 条件②④分工不重叠） | `test/acceptance-matrix-gate.test.mjs` | severity、handover、有效行（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:267`（severity）、`test/acceptance-matrix-gate.test.mjs:21`（handover）、`test/acceptance-matrix-gate.test.mjs:22`（有效行） |
| factsExpected=true 而 verify-facts.json 缺失 → 分支按零有效行 fail-closed 拦下且文案含「重跑 verify-probes」出路；factsExpected=false 存量变更 → 分支零行为变化 | `test/acceptance-matrix-gate.test.mjs` | factsExpected、true、verify、facts、json（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:372`（factsExpected）、`test/acceptance-matrix-gate.test.mjs:17`（true）、`test/acceptance-matrix-gate.test.mjs:14`（verify） |
| 判级 integration/deployment-critical 且 facts.runtimeEndpointExcluded=true 且 handover 零有效行 → 封顶校验触发；判级不符或字段缺失 → 不触发（FR-03 第一态，additive 兼容） | `test/acceptance-matrix-gate.test.mjs` | integration、facts（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:266`（integration）、`test/acceptance-matrix-gate.test.mjs:21`（facts） |
| 新生成骨架的 Runtime Evidence 节注释含降级路径提示原文（Controller 直调冒烟 / 基础设施恢复复跑——不要空填不涉及）（FR-03 第二态） | `test/acceptance-matrix-gate.test.mjs` | Evidence（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:9`（Evidence） |
| npm test 全量通过（含适配后的 test/acceptance-matrix-gate.test.mjs）且 npm run lint 通过 | `test/acceptance-matrix-gate.test.mjs` | test、acceptance（`test/acceptance-matrix-gate.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:2`（test）、`test/acceptance-matrix-gate.test.mjs:2`（acceptance） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| apply 文件集（主仓任一成功出口或跨仓 apply 面）含 db/*.sql 且 verify-result.md 无对应声明 → apply 结果 error 阻断（result.ok=false）且文案含补声明修复指引；补声明行后重跑放行（FR-05 兜底门第一态） | `test/pass-eligibility.test.mjs` | apply 门 | covered | `test/pass-eligibility.test.mjs:397`（apply 集∩db/*.sql⊄声明集阻断 + 声明齐备双形态放行）；四出口接线由 execute 验收 #8 file:line 实证（worktree-apply.js:738/:2021/:2556） |
| archive --confirm 时 apply-manifest.json 的 files 含 db/*.sql 且无对应声明 → 步骤回退 pending、变更目录不移动、输出修复指引（FR-05 兜底门第二态） | `test/pass-eligibility.test.mjs` | confirm 门 | covered | `test/pass-eligibility.test.mjs:452`（步骤回 pending + 归档阻断目录不动） |
| 声明在场 × db-script 类型 handover 行在场 → 互斥 error 阻断（FR-06 互斥态） | `test/pass-eligibility.test.mjs`、`test/verify-handover-structured.test.mjs` | 互斥 | covered | `test/pass-eligibility.test.mjs:438`、`test/verify-handover-structured.test.mjs:141`（md 兜底源） |
| 无 db/*.sql 交集的 apply 与归档全流程行为零变化（存量兼容）；apply-manifest.json 缺失时 archive 门空转不阻断 | `test/pass-eligibility.test.mjs` | 零行为 | covered | `test/pass-eligibility.test.mjs:397`（无 db 交集零行为断言）；apply 系 16 项既有回归全绿（npm test 全量） |
| archive Step 3 prompt 渲染含 handover 清单：severity 标注、blocking 置顶、超封顶截断并指路 facts.json；facts 缺失时降级单行指引不阻断（FR-06 注入态） | `test/pass-eligibility.test.mjs` | 注入 | covered | `test/pass-eligibility.test.mjs`（H 组注入行为由 task-04 冒烟实证三态 + npm test archive 系回归兜底：`test/archive-task-completion-injection.test.mjs` 全绿） |
| npm test 全量通过且 npm run lint 通过 | `test/pass-eligibility.test.mjs` | 全量 | covered | `test/pass-eligibility.test.mjs:232`（npm test 全量 524/0）+ lint 绿 |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-07 GWT1：主仓 test_strategy=skip 且跨仓无自配 commands.test → verify 测试合并短路通过，跨仓不再执行 fallback npm test（假败消除），合并结果含短路注记 | `test/cross-repo-verify.test.mjs` | skip 短路 | covered | `test/cross-repo-verify.test.mjs:388`（哨兵串证 fallback 未跑） |
| FR-07 GWT2：跨仓自配 commands.test → 仍执行；跨仓 own local.yaml test_strategy=skip → 该仓单独 skip、逐仓生效 | `test/cross-repo-verify.test.mjs` | 三态 | covered | `test/cross-repo-verify.test.mjs:411`、`test/cross-repo-verify.test.mjs:433` |
| FR-08：writtenBy=adoptTaskReviewMechanics#pid 形态的 review（verdict 非 fail）→ isExplicitReviewWrite 判真、tasks.md 自动勾选生效；跨仓 review 的仓根相对 changedFiles 命中并入跨仓双源后的 diffFileSet | `test/task-review-adopt.test.mjs`、`test/backfill-adopt-per-task-slice.test.mjs` | adopt 两层 | covered | `test/task-review-adopt.test.mjs`（双白名单断言新增）、`test/backfill-adopt-per-task-slice.test.mjs`（幂等回归）；diff 源层由 task-05 行为实证 17/17（review evidence） |
| FR-09：测试文件位于跨仓仓根时 buildAcceptanceHints 内容可读、命中不再恒空（矩阵不因跨仓恒预填 partial） | `test/probe7-anchor-testfile.test.mjs` | 多根 | covered | `test/probe7-anchor-testfile.test.mjs:90`（跨仓根内容可读 + covered 预填） |
| FR-10：design 清单无「## <repo> 仓变更」段头且行含跨仓注册路径 → 降 warning 提示补段头，不再按主仓根逼 NEW: 前缀 | `test/design-facts.test.mjs` | 无段头 | covered | `test/design-facts.test.mjs`（无段头降 warning/主仓幻觉仍 error/warning-error 分工三断言新增） |
| 兼容零变化：单仓 ctx / 主仓非 skip / 跨仓自配 test / design 有段头跨仓段——四条既有路径行为不变；npm run lint（check-syntax）通过 | `test/cross-repo-verify.test.mjs`、`test/design-facts.test.mjs` | 兼容 | covered | `test/cross-repo-verify.test.mjs:365`（ctx=null 等价兼容）+ `test/design-facts.test.mjs:413`（既有路径回归，npm test 524/0 兜底） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-11 GWT1：变更涉及角色/字典时审查清单含「以生产查询口径可解析到目标结果」条目——REVIEW_CHECKLISTS.brainstorm 常量与 brainstorm prompt 渲染产物双侧在场，条目文字含 FR-11 字面锚点子串（供 task-07 断言匹配） | `test/stage-review-checklist.test.mjs` | 条目字面 | covered | `test/stage-review-checklist.test.mjs`（快照 6→8 含两条新条目字面 deepEqual + FR-11 字面断言，task-07 已收敛） |
| FR-11 GWT2：涉及新页面/前端路由时含「用户入口 × 菜单/注册 DML 对账」条目；stages prompt 源（brainstorm.js）与清单常量（stage-review-checklist.js）逐字一致 | `test/stage-review-checklist.test.mjs` | 逐字一致 | covered | `test/stage-review-checklist.test.mjs`（条目字面断言）；逐字一致由镜像 _verify.mjs brainstorm 7/7 实证（task-06 三步流水线输出） |
| 两条新条目形态合法：纯文本单行、无结构性前缀/缩进、无 CR（test/stage-review-checklist.test.mjs :78-79 形态约束——即使快照断言预期红，条目形态也须让 task-07 只改快照数即可收敛） | `test/stage-review-checklist.test.mjs` | 形态 | covered | `test/stage-review-checklist.test.mjs:83`（形态约束断言全绿） |
| src/stages/verify.js「输出验证报告」步 prompt 含封顶语义自查提示：四事实条件逐条列明 + severity 口径（blocking/advisory 默认映射与显式标注规则）+「改写 PASS WITH NOTES 并补 ## 移交项（结构化）」出路 | `docs/prompt/verify.md` | prompt 镜像 | covered | `docs/prompt/verify.md:293` 段（封顶自查子项逐字，_verify.mjs verify 5/5 逐字核验绿） |
| node docs/prompt/_verify.mjs：verify / brainstorm 静态阶段逐字一致全绿；_extracted.json 与 src/stages/{verify,brainstorm}.js 现态一致；幂等复跑（_extract + _sync 再跑一次）无二阶差异 | `docs/prompt/_verify.mjs` | 流水线 | non-testable | 流水线自身产出即证据（task-06 报告：verify 5/5 + brainstorm 7/7 + 幂等二跑零 diff）；无独立测试文件承载属工具链性质 |
| npm run lint（check-syntax）通过 | `test/stage-review-checklist.test.mjs` | lint | covered | `test/stage-review-checklist.test.mjs:83`（形态断言全绿）；lint 662 文件绿见「测试结果」节 |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| npm test 全量通过（含 NEW:test/pass-eligibility.test.mjs 与 8 个既有测试文件增量断言，断言净增 +60~80） | `test/pass-eligibility.test.mjs`<br>`test/cross-repo-verify.test.mjs`<br>`test/verify-handover-structured.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs`<br>`test/probe7-anchor-testfile.test.mjs`<br>`test/task-review-adopt.test.mjs`<br>`test/stage-review-checklist.test.mjs`<br>`test/design-facts.test.mjs`<br>`test/stage-contract.test.mjs` | npm、test、NEW、pass（`test/pass-eligibility.test.mjs`、`test/cross-repo-verify.test.mjs`、`test/verify-handover-structured.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/acceptance-matrix-probe.test.mjs`、`test/probe7-anchor-testfile.test.mjs`、`test/task-review-adopt.test.mjs`、`test/stage-review-checklist.test.mjs`、`test/design-facts.test.mjs`、`test/stage-contract.test.mjs`） | covered | `test/pass-eligibility.test.mjs:232`（npm）、`test/pass-eligibility.test.mjs:28`（test）、`test/acceptance-matrix-probe.test.mjs:7`（NEW） |
| 四事实条件各一态触发 error（含触发行枚举 + 修复指引文案）与全清 PASS 态放行断言在册（FR-01 四态） | `test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs` | error、含触发行枚举 | covered | `test/pass-eligibility.test.mjs:70`（A 组）、`test/pass-eligibility.test.mjs:111`（B 组）、`test/verify-conclusion-slot.test.mjs:82` |
| 存量兼容断言在册：factsExpected=false 返回 ok、三列 handover 零迁移按类型映射、未触发事实条件的存量场景行为零变化 | `test/pass-eligibility.test.mjs`<br>`test/verify-handover-structured.test.mjs` | factsExpected、三列 | covered | `test/pass-eligibility.test.mjs:146`、`test/pass-eligibility.test.mjs:300`、`test/verify-handover-structured.test.mjs:141` |
| explicit + integration-critical + NOTES 无 handover → error 断言在册（豁免洞分层；unit-sufficient 免证据 / 有 handover 放行两态同册） | `test/pass-eligibility.test.mjs`<br>`test/stage-contract.test.mjs` | explicit、integration、critical、NOTES、handover | covered | `test/pass-eligibility.test.mjs:175`（D 组三态）、`test/stage-contract.test.mjs`（集成4 翻转断言，D-002 锚） |
| apply 集 ∩ db/*.sql ⊄ 声明集 → apply 尾声与 archive --confirm 双阻断断言在册；verify 后新增 sql 的兜底时序态覆盖 | `test/pass-eligibility.test.mjs` | apply、sql、声明集、archive | covered | `test/pass-eligibility.test.mjs:397`、`test/pass-eligibility.test.mjs:452` |
| severity 类型缺省映射、降级理由文法缺失回退 blocking、db-script 互斥断言在册 | `test/pass-eligibility.test.mjs`<br>`test/verify-handover-structured.test.mjs` | severity、类型缺省映射、降级理由文法缺失回退、blocking、script | covered | `test/pass-eligibility.test.mjs:287`、`test/pass-eligibility.test.mjs:311`、`test/pass-eligibility.test.mjs:438` |
| npm run lint（check-syntax）通过 | `test/pass-eligibility.test.mjs` | npm、run、check、syntax | covered | `test/pass-eligibility.test.mjs:232`、`test/pass-eligibility.test.mjs:38` |
| escape 路径可达断言：被拦出路的报错文案含「重跑质量扫描 / 降级 NOTES / 重跑 verify-probes」指引（R-01/R-07） | `test/pass-eligibility.test.mjs` | 重跑质量扫描、降级 | covered | `test/pass-eligibility.test.mjs:275`（重跑质量扫描）、`test/pass-eligibility.test.mjs:137`（重跑 verify-probes） |

**task-08**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| Wave N 步骤 --done 时本 Wave 任一 task checkbox 未勾 → exit 1，错误含未勾清单与两条出路（FR-12 GWT1） | `test/wave-task-complete-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs` | Wave、步骤、done、任一 | covered | `test/wave-task-complete-gate.test.mjs`（②组：exit 1 + 未勾清单 + --reopen 指引 + 不误列他 Wave） |
| 全勾（含经 autoCheck 自动勾选）→ 放行，步骤正常推进（GWT2） | `test/wave-task-complete-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs` | 全勾、autoCheck、自动勾选、放行 | covered | `test/wave-task-complete-gate.test.mjs`（①组+④组 autoCheck 先行幂等）、`test/run-complete-step-execute-batch.test.mjs:47`（自动勾选） |
| plan.md 无该 Wave 段 / 文档读取失败 → warn 放行不误伤隐式 Wave 计划（GWT3） | `test/wave-task-complete-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs` | plan、Wave、warn | covered | `test/wave-task-complete-gate.test.mjs`（③组：无段 warn 放行 + plan 缺失 fail-open） |
| 非 Wave 步骤名 → 零行为变化；门自身异常 → fail-open warn 不阻断完成路径 | `test/wave-task-complete-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs` | Wave、步骤名、fail | covered | `test/wave-task-complete-gate.test.mjs`（⑤组：非严格步骤名零门输出零行为） |

- ⚠️ 零/半自动化承接条目 0 条（原预填 28 条 uncovered 经逐格复核改写：机械归属未看到 task-07 跨任务测试覆盖面，全部有测试承接——判定与证据见上矩阵改写格）

#### 探针 4：决策追踪覆盖
13 条当前版本决策闭环（详见下方决策追踪矩阵逐格）：D-001@v2/D-005@v2 为当前版（v1 已 supersede 保留历史）；D-002/006→task-02 落地、D-003→task-03（含 G-1 advisory 补齐）、D-004→task-03+task-01 producer、D-007/D-012→task-04+task-02、D-008→task-05、D-009→task-06、D-010/D-011→task-01+02、D-013→task-08。全部 FR-01~12 有测试锚点（探针 7 矩阵）。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 20 backend endpoints (live [scan-root 5] + artifact 20), 0 frontend calls [scope: change-diff (36 files @ scan-root)] | 20 backend endpoints unused by frontend
- ⚠️ 20 个本变更端点前端未调用（warning 不阻断）：GET /api/api/xxx、GET /api/path、GET /api、GET /api/api/xxx、GET /api …
（语义裁定：本变更为 CLI 校验逻辑，design 无前端消费面——「前端未调用」warning 为 scan-root 仓级端点存量口径，非本变更缺口。）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定——无删除，非 blocker。

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）

## 测试结果 [层：确定性检查——CLI 实测对账]
- `npm test`（主仓，apply 后）：**524 通过 / 0 失败 / exit 0**（2026-09-17，含新增 test/pass-eligibility.test.mjs 16 test 与 test/wave-task-complete-gate.test.mjs；worktree 期 13 个环境性失败文件在主仓全部转绿）
- `npm run lint`：**绿**（662 文件；未引用导出 0 项 hard fail + module-map 覆盖全）
- 断言净增 +79（design §6 口径 +60~80 内）
- known_failures 豁免：无（零失败无需豁免）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | （已被 v2 取代） | — | superseded by D-001@v2（blocking 口径与 facts 锚定） | 已闭环（历史版） |
| D-002@v1 | FR-01、FR-02 | task-02 | `test/pass-eligibility.test.mjs:175`（豁免洞三态）、`test/stage-contract.test.mjs`（集成4 翻转） | 已闭环 |
| D-003@v1 | FR-04 | task-03 | `test/acceptance-matrix-gate.test.mjs`（2.9~2.13） | 已闭环（G-1 advisory 补齐） |
| D-004@v1 | FR-03 | task-03、task-01 | `test/pass-eligibility.test.mjs:327`、`test/pass-eligibility.test.mjs:351` | 已闭环 |
| D-005@v1 | （已被 v2 取代） | — | superseded by D-005@v2（severity 分层） | 已闭环（历史版） |
| D-006@v1 | FR-01、FR-02 | task-02 | `test/pass-eligibility.test.mjs:234`、`test/pass-eligibility.test.mjs:253`（判定表两组） | 已闭环 |
| D-007@v1 | FR-05 | task-04 | `test/pass-eligibility.test.mjs:397`、`test/pass-eligibility.test.mjs:452`（双门） | 已闭环 |
| D-008@v1 | FR-07~FR-10 | task-05 | `test/cross-repo-verify.test.mjs:388/411/433`、`test/probe7-anchor-testfile.test.mjs:90`、`test/design-facts.test.mjs`、`test/task-review-adopt.test.mjs` | 已闭环 |
| D-001@v2 | FR-01、FR-02 | task-02 | `test/pass-eligibility.test.mjs:70`（A 组四态含 blocking 口径） | 已闭环 |
| D-011@v1 | FR-01、FR-02、FR-06 | task-01、task-02 | `test/pass-eligibility.test.mjs:137/146`（双源 fail-closed/兼容）、src/run/gates.js:625（X-08 时序实证） | 已闭环 |
| D-012@v1 | FR-05 | task-02、task-04 | `test/pass-eligibility.test.mjs:452`（confirm 兜底=verify 后新增 sql 时序态） | 已闭环 |
| D-005@v2 | FR-01、FR-06 | task-01 | `test/pass-eligibility.test.mjs:287/300/311`、`test/verify-handover-structured.test.mjs:141` | 已闭环 |
| D-013@v1 | FR-12 | task-08 | `test/wave-task-complete-gate.test.mjs`（五组 21 断言）、`test/run-complete-step-execute-batch.test.mjs`（夹具双 Wave 11/11） | 已闭环 |
| D-010@v1 | FR-01、FR-02 | task-02 | validators 注册第三位断言（`test/acceptance-matrix-gate.test.mjs` 2.8）；fail-open 条款已按 D-011 收窄注记 | 已闭环 |
| D-009@v1 | FR-11 | task-06 | `test/stage-review-checklist.test.mjs`（快照 6→8 + FR-11 字面断言） | 已闭环 |

## 技术债务 [层：人工判断]
- 探针 1 命中全部为骨架生成器/校验器字面占位词（probe1-noqa 已标），非实现债。
- 留档增强项（不阻断，后续 quick 体量）：①降级理由文法 `HANDOVER_DOWNGRADE_REASON_RE` 依据锚不认 `D-xxx@vN` 带版本形态（当前裸 `D-\d+` 命中，测试以裸 D-005 钉住）；②FR-07 跨仓 own skip 通道实现上限于主仓 skip 短路档（主仓非 skip 时 runCrossRepoFullTest 不读跨仓 test_strategy——requirements GWT2 措辞与实现的口径差，测试已钉实现态并注释锚定）；③两处回执来源分类正则族靠注释互指同步（G-3 已对齐，长期可收敛单点）。
- 批次路线债：批次 B（probe8 diff 源/校验器提取）、C（接口验证覆盖矩阵 + smoke 硬门）、D（checklist 固化）、E（归档侧移交项闭环对账）——见 design 背景与非目标。

## 变更风险等级 [层：人工判断]
design.md frontmatter 无显式 risk_level 声明，等级以 CLI --done 判定为准。人工评估：本变更触碰校验逻辑/门禁/内部 prompt，**未新增** daemon/跨进程/部署启动路径——设计文档中「生命周期」等关键词均以否定语境出现（「不涉及生命周期契约」豁免短语），预期判级 contract-required 或以下；若 CLI 判为 integration-critical，则以本报告「集成验证回执」为空 + npm test 全量 524/0 的 CLI 亲测记录作为证据面。

## Runtime Evidence [层：人工判断]
- 长驻进程启动命令：不涉及（纯 CLI 短进程校验逻辑，无服务启动）
- 触碰的服务端点：不涉及（无 REST 端点新增——端点基线 5 个零变化）
- 触发核心路径的请求：不涉及（无 HTTP 面改动）
- 进程日志关键片段：npm test 全量输出 524 通过/0 失败（exit 0，主仓 2026-09-17）+ lint 绿 662 文件——CLI 短进程全量实跑即本变更核心路径的运行时证据
- 生命周期终态断言：不涉及（无状态机/生命周期事件；Wave 门为步骤完成度校验非进程生命周期）
- 失败模式排除：门自身异常 fail-open（warn 不阻断）有 `test/wave-task-complete-gate.test.mjs` ⑤组与 complete.js 接线 try/catch 兜底；facts 缺失 fail-closed 有 `test/pass-eligibility.test.mjs:137`；降级路径提示在骨架（FR-03 第二态）

## 代码审查 [层：人工判断]
- execute Step 10 独立验收（agent-tool 通道）：14 项 checklist **0 fail**、3 gap（G-1 逐行 advisory 缺/G-2 meta.json 流程文件/G-3 smoke 一词漂移）——G-1/G-3 已修复收口（37/0 与 510/13→主仓 524/0 实证），G-2 属 worktree provisioning 状态文件已说明。
- 走查清单定向面：①编辑/更新链路——本变更为校验逻辑无 UI 编辑链；②非主分支流——fail-open/fail-closed 边界逐条有断言（C 组/③组/2.12）；③守卫一致性——Wave 门对全部显式 Wave 生效、隐式计划 warn 放行（D-003@v1 不误伤）；④载荷契约——探针 8 不适用（无前后端面），facts 字段契约由 producer/consumer 同源消费（`test/pass-eligibility.test.mjs:480` 壳层）；⑤并发/原子性——write 前重读并发防护既有 + Wave 门 exit 时 DB 无假完成态（接线在 status=completed 赋值前）。
- 总体评价：可交付。分层单向（TLA 动态绑定无环）、纯加法可回退、坑锚注释齐备、+79 断言钉住全部行为契约。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute Step 10 独立验收审查结论回流：specVerdict=pass / qualityVerdict=pass（14 项 checklist 含 file:line 证据，0 fail / 3 gap——G-1/G-3 已修复并回归验证，G-2 已说明）；review.json 存 `.runtime/stage-reviews/execute-review-2026-09-17-195900/`。对「结论枚举」无影响（无 P1/P2 级缺陷）。
