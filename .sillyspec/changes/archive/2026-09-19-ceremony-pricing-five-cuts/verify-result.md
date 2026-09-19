# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS`——四 task 七提交全落地（worktree 分支 sillyspec/2026-09-19-ceremony-pricing-five-cuts），965 测试过 + lint 绿 + grep 清零 + QA 两轮 pass/pass；3 个失败测试名均环境性（worktree 隔离守卫/主仓也红的字节比对），逐条注明于测试结果节

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 全量套件 3 个环境性失败名（docs-check-fix 字节比对×2、sillyhub probe401、mcp-server 进程内主循环）——worktree 内跑套件触发 CLI 隔离守卫 + 字节比对对仓库未提交态敏感（主仓对照复跑实证：mcp/sillyhub 绿、docs-check 同红即环境非本变更） | apply 回主仓后主仓复跑 npm test 预期全绿；docs-check 字节比对独立于本变更（基线锚 84d498a 早于本变更） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（四 task review 均为 pass——主代理评审锚 worktree 分支提交全 hash；execute 首轮 auto 草稿的 cannot_verify 已被真实评审取代）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（本变更文件面命中 S2 门禁判定声明（无 evidence:true）——纯函数判级/定价逻辑零运行时集成面；risk_level 显式 unit-sufficient 压仪式档）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
4/4 完成（tasks.md 勾选 × worktree 提交锚）：task-01 bbe30ab（声明面机制，35/35）；task-02 df03d22（resolveChangeRisk 新增面+D-009 钉，中间态全绿）；task-03 0610255+3708d6f（八消费点+三刀+删除收口+specBase 错层修复，六组测试）；task-04 f0b540c..5895e85（教学段+认领+pass-eligibility 翻新）。存疑：无

## 设计一致性 [层：人工判断]
一致（QA 独立子代理两轮对照：首轮 fail 抓两真阻断——specBase 推导错层（dirname×2 声明面恒空）+ stage-review 五断言；修复后复核实证改判 pass/pass 18pass/1gap/0fail）。实现优于设计的两处：(1) readDesignOwnFiles 委托 change-list 单一真相源（消灭重复解析器，D-004 更干净的实现形态）；(2) resolveChangeRisk 增 level 五级词兼容字段（八消费面零改动切换）。偏差已回写 design 接口定义（loadBlastDeclarations 三表返回/AllProjects 导出/level 字段）

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:83` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:88` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:91` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:96` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:102` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:105` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:126` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:128` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:131` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:156` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:157` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:164` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/stage-contract.js:786` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:791` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:826` * 行级证据口径：covered/covered-service/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO
- ⚠️ `src/stage-contract.js:834` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
- ⚠️ `src/stages/verify.js:201` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `src/stage-contract-spec.js:423` spec: 'task 卡片完整 TaskCard schema(可行性,只认 frontmatter 字段,均 error):YAML frontmatter 必备;frontmatter 需 id、title;allowed_paths 非空;frontmatter 需 goal、implementation、ac
- ℹ️ 3 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
能力关键词 × 实现锚（worktree 分支）：resolveBlastSurfaces/loadBlastDeclarations→src/blast-surface.js（27/27）；声明追赶重定价→src/ceremony-tier.js applyDeclarationCatchUp（三分支矩阵）+ src/run/gates.js 接线（preflight Part C）；高报 warn→reconcileDualRun（ceremony-tier.test warn 断言）；span 双形态→readDesignOwnFiles 委托 parseFileChangeListDetailed；--force 回插→modules.js（rebuild-preserve 8/8）；explicit 不豁免 evidence→resolveChangeRisk + stage-contract.test D-009 端到端钉 + pass-eligibility 态 D；自举声明表→_module-map.yaml blast 段 30 前缀（D-010 QA 逐项实证）

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（NEW:src、src、.sillyspec/docs/sillyspec/modules、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-03: 模块目录（src、src/run、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ⚠️ task-04: 模块目录（src/stages、.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 声明面解析（plan 全局验收 1）：前缀命中取最高档、未命中 S1、local 只升不压低、map 段缺失空表、evidence 位传递——test/blast-surface.test.mjs 全绿 | `test/blast-surface.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs` | 声明面解析（`test/blast-surface.test.mjs`） | covered | `test/blast-surface.test.mjs:43`（声明面解析） |
| rebuild 保留（plan 全局验收 2）：--force rebuild 写盘后 blast 段原样在场（字节级）；非 force 依旧不写盘——test/modules-rebuild-preserve.test.mjs 双面断言全绿 | `test/blast-surface.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs` | rebuild、保留、force（`test/modules-rebuild-preserve.test.mjs`、`test/blast-surface.test.mjs`） | covered | `test/modules-rebuild-preserve.test.mjs:2`（rebuild）、`test/modules-rebuild-preserve.test.mjs:2`（保留）、`test/blast-surface.test.mjs:174`（force） |
| 本仓 _module-map.yaml 自举 blast 段按 D-010 口径落盘：S3+evidence 只挂真会话/租约/worktree/dispatch 域、门禁判定文件 ≤S2、core-engine 不整模块标价、其余路径零声明 | `test/blast-surface.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs` | _module、map、yaml、自举（`test/blast-surface.test.mjs`、`test/modules-rebuild-preserve.test.mjs`） | covered | `test/blast-surface.test.mjs:96`（_module）、`test/blast-surface.test.mjs:10`（map）、`test/blast-surface.test.mjs:96`（yaml） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| resolveChangeRisk 按 design 接口定义工作：前缀命中取最高档、未命中 S1、evidenceRequired 由 evidence 位直出、requiredVerification 两组取值正确（plan 全局验收 1 子项 / D-009） | `test/stage-contract.test.mjs`<br>`test/quick-gate-profile.test.mjs` | design（`test/stage-contract.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `test/stage-contract.test.mjs:165`（design） |
| 「显式声明压 tier 但不豁免 evidence」用例在场且绿（test/stage-contract.test.mjs 路径判级新用例组） | `test/stage-contract.test.mjs`<br>`test/quick-gate-profile.test.mjs` | tier、evidence（`test/quick-gate-profile.test.mjs`、`test/stage-contract.test.mjs`） | covered | `test/quick-gate-profile.test.mjs:2`（tier）、`test/stage-contract.test.mjs:205`（evidence） |
| 中间态全绿铁律：本 task 完成时点 src/ 全部模块可加载（detectChangeRisk 及词表机器原样在场，删除归 task-03）、本 task 范围测试（stage-contract/quick-gate-profile）与 quick-gate-profile.test 全绿 | `test/stage-contract.test.mjs`<br>`test/quick-gate-profile.test.mjs` | task、src（`test/stage-contract.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `test/stage-contract.test.mjs:169`（task）、`test/stage-contract.test.mjs:4`（src） |
| 保留面零损伤：QUICK_RISK_PATH_PATTERNS / extractExplicitRiskLevel / VERIFICATION_NEEDS / checkIntegrationEvidence / isEndToEndTaskText / detectChangeRisk（本 task 未删）行为不变，既有相关用例仍绿 | `test/stage-contract.test.mjs`<br>`test/quick-gate-profile.test.mjs` | QUICK_RISK_PATH_PATTERNS、extractExplicitRiskLevel（`test/quick-gate-profile.test.mjs`、`test/stage-contract.test.mjs`） | covered | `test/quick-gate-profile.test.mjs:22`（QUICK_RISK_PATH_PATTERNS）、`test/stage-contract.test.mjs:5`（extractExplicitRiskLevel） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 八消费点（src/stage-contract.js:385/:658/:1382/:1662、src/run/gates.js:632、src/review-tier.js:118、src/run/verify-quality-scan.js:531、src/verify-postcheck.js:3082）全部走 resolveChangeRisk/resolveBlastSurfaces 新… | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | src、stage、contract、run（`src/stage-contract-spec.js`、`test/ceremony-tier.test.mjs`、`test/concurrent-preflight-hooks.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-contract.test.mjs`、`test/stage-review.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `src/stage-contract-spec.js:421`（src）、`src/stage-contract-spec.js:2`（stage）、`src/stage-contract-spec.js:2`（contract） |
| grep -rn "detectChangeRisk(" src/ test/ 输出为空（R-06 清零收口）。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | detectChangeRisk、src、test（`src/stage-contract-spec.js`、`test/verify-conclusion-slot.test.mjs`、`test/stage-contract.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/ceremony-tier.test.mjs`、`test/concurrent-preflight-hooks.test.mjs`、`test/stage-review.test.mjs`） | covered | `src/stage-contract-spec.js:55`（detectChangeRisk）、`src/stage-contract-spec.js:421`（src）、`src/stage-contract-spec.js:226`（test） |
| 无摩擦迁移档位文件在下一道完成门自动重定价（可降）；有摩擦迁移不低于地板（超阈同锁 escalate 即时 +1）；transitions 非空取 max(重算档, transitions 最高 to 档)。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | 可降、escalate（`test/ceremony-tier.test.mjs`） | covered | `test/ceremony-tier.test.mjs:289`（可降）、`test/ceremony-tier.test.mjs:9`（escalate） |
| 重定价记 reasons「声明追赶重定价」不记 transitions；事件文案区分初始定价与追赶（追赶不追加「初始档/首见」行）。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | reasons、transitions（`test/ceremony-tier.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/ceremony-tier.test.mjs:7`（reasons）、`test/ceremony-tier.test.mjs:403`（transitions） |
| reconcileDualRun 声明 S3/事实 S2 → { mismatch: false, severity: 'warn' } 返回结构零新增字段；声明 S1/事实 S2 → error 逐字不变。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | reconcileDualRun、声明、事实、mismatch、false（`test/ceremony-tier.test.mjs`、`src/stage-contract-spec.js`、`test/concurrent-preflight-hooks.test.mjs`、`test/stage-contract.test.mjs`、`test/stage-review.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `test/ceremony-tier.test.mjs:10`（reconcileDualRun）、`src/stage-contract-spec.js:36`（声明）、`test/ceremony-tier.test.mjs:10`（事实） |
| readDesignOwnFiles 认「## 文件变更清单」（含括注）——清单行计入 span（≥8 → S2）；任何 ^##\s 标题关闭段；「## 6.」旧行为逐字不变。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | readDesignOwnFiles、文件变更清单、span（`test/concurrent-preflight-hooks.test.mjs`、`src/stage-contract-spec.js`、`test/stage-contract.test.mjs`、`test/stage-review.test.mjs`、`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `test/concurrent-preflight-hooks.test.mjs:175`（readDesignOwnFiles）、`src/stage-contract-spec.js:126`（文件变更清单）、`test/ceremony-tier.test.mjs:6`（span） |
| 事实面零内容扫描——src/verify-postcheck.js 无 readCeremonyFactContent/CEREMONY_FACT_CONTENT_* 残留，reconcileDualRun 只吃 actual.files × 声明面。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | src、verify、postcheck（`src/stage-contract-spec.js`、`test/ceremony-tier.test.mjs`、`test/concurrent-preflight-hooks.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-contract.test.mjs`、`test/stage-review.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `src/stage-contract-spec.js:421`（src）、`src/stage-contract-spec.js:36`（verify）、`src/stage-contract-spec.js:4`（postcheck） |
| node --test test/ceremony-tier.test.mjs test/concurrent-preflight-hooks.test.mjs 全绿。 | `src/stage-contract-spec.js`<br>`test/ceremony-tier.test.mjs`<br>`test/concurrent-preflight-hooks.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-contract.test.mjs`<br>`test/stage-review.test.mjs`<br>`test/quick-gate-profile.test.mjs` | node、test、ceremony、tier、mjs（`src/stage-contract-spec.js`、`test/ceremony-tier.test.mjs`、`test/concurrent-preflight-hooks.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-contract.test.mjs`、`test/stage-review.test.mjs`、`test/quick-gate-profile.test.mjs`） | covered | `src/stage-contract-spec.js:241`（node）、`src/stage-contract-spec.js:226`（test）、`test/ceremony-tier.test.mjs:2`（ceremony） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| src/stages/verify.js:194-196 教学段零旧口径——无「detectChangeRisk 扫描」「否定抑制」「豁免级不再被强制拦」字样；新语义含「项目声明危险面」「risk_level 压仪式档、不豁免 evidence 要求，出路=改 map 声明」。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| .sillyspec/docs/sillyspec/modules/core-engine.md 认领条目在场（判级/定价行为契约变更四点：声明面输入源/追赶重定价三分支/高报 warn/span 双形态）。 | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| 自指走位：本变更声明追赶后档位 S2；verify 双跑事实面（actual.files × 声明面）= 声明档 S2 零 mismatch、零 violation。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| npm test 全量通过；npm run lint 通过。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| grep -rn "detectChangeRisk(" src/ test/ 输出为空。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

- ⚠️ 零/半自动化承接条目 4 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (23 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 19 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（5 个在检文件无未确认预填）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
npm test（worktree 分支，2026-09-19）：965 项通过；3 个失败名全部环境性：(1) docs-check-fix 字节比对两例——对仓库未提交态敏感，主仓对照复跑同红（基线锚 84d498a 早于本变更）；(2) sillyhub probe401 + mcp-server 进程内主循环——worktree 内跑套件触发 CLI 隔离守卫（src/index.js:338），主仓对照复跑绿。npm run lint：686 文件全绿。定向组：blast-surface 27/27、rebuild-preserve 8/8、ceremony-tier 104/104、stage-contract 全过、stage-review 80/80、preflight 38/38、pass-eligibility 18/18、quality-scan/conclusion-slot 全过

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| superseded（D-001@v2 重定范围） | 已退役 |
| D-002@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| superseded（D-008@v1 词表退役） | 已退役 |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-03、task-04| applyDeclarationCatchUp 三分支 + gates 锁内接线（ceremony-tier.test 4b + preflight Part C） | 已闭环 |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-03、task-04| readDesignOwnFiles 委托 change-list（preflight C5 + FILE_LIST_SECTION_RE 双形态） | 已闭环 |
| D-005@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-03、task-04| reconcileDualRun warn（ceremony-tier.test above 例翻新 + blastWarn） | 已闭环 |
| D-006@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| superseded（D-008@v1——事实面零内容扫描更彻底） | 已退役 |
| D-007@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| superseded（D-007@v2） | 已退役 |
| D-001@v2 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-03、task-04| 四件事编队全落地（QA 对照两轮 + 本报告设计一致性节） | 已闭环 |
| D-007@v2 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| 在途 api-matrix 未动档位（.runtime/ceremony-tier-* 未触碰，零动作） | 已闭环 |
| D-008@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| 声明面机制（task-01 35/35 + grep detectChangeRisk( 清零） | 已闭环 |
| D-009@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-03| resolveChangeRisk explicit 只压 tier（stage-contract.test 钉 + pass-eligibility 态 D 18/18） | 已闭环 |
| D-010@v1 | FR-01、FR-05 | task-01、task-04| 自举表 30 前缀（QA 实证 api-matrix 类面=S2、会话域=S3+evidence、datetime=零声明） | 已闭环 |
| D-011@v1 | FR-05 | task-04| QUICK_RISK_PATH_PATTERNS 原样保留（design 非目标登记 + quick-gate auth 命中断言） | 已闭环 |
| D-008@v2 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指）| modules --force 顶层段回插（modules-rebuild-preserve 8/8 含通用段断言） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中 9 处全为骨架机制自身的字面量（TODO 占位生成/检测代码与 JSDoc）——生成器实现字符串非债务；新增文件零 TODO/FIXME。债登记：无

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design frontmatter risk_level，压仪式档）：纯函数判级/定价/门接线逻辑 + 测试，零运行时集成面。声明面口径：本变更 19 文件面 × 自举声明 → 门禁判定文件命中 8 个 S2 前缀（blast=S2）、span 19≥8（S2）→ 终态 S2；无 evidence:true 命中。留痕：risk_level 由 design frontmatter 显式声明 = unit-sufficient（压仪式档；evidence 要求不受豁免——本变更本就无 evidence 命中）

## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：
     ① 编辑/更新链路（回显、字段映射、残留态）——非新增主链路，实证盲区；
     ② 非主分支流（相关方/旁路支线等未走查路径）；
     ③ 守卫一致性：同资源端点的操作人/权限校验模式对比（实证 doSubmit 无操作人校验而 delete/withdraw 有——越权）；
     ④ 载荷字段契约（探针 8 ⚠️ 配对逐条核实）；
     ⑤ 分页/并发/事务原子性（无测试基建端的纯逻辑面）-->

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->
