
基于 file-lifecycle.md（流转权威）+ stage-contract-spec.js（产物契约单一真相源）+ 各阶段 prompt，并对 6 个跨阶段衔接点做了源码兑现核验。结论如下。

  ---
一、总体流转图（✅闭合 /  ⚠️弱 / 🔴断）

scan ──产出──► docs/<p>/scan/{7份}.md ─────────────┐
├─► _module-map.yaml ──────────────────────┤ ⚠️tags/aliases/entrypoints/main_symbols
└─► knowledge/{conventions,...}.md ─ INDEX─┤   解析了但 CLI 自动注入从不读；零 schema 校验
▼
brainstorm ─► design.md ─┬─►〔文件变更清单〕─► plan allowed_paths ─► execute 实现 ─► verify 对照
├─► decisions.md (D-xxx@vN) ─────────┐  ▲                    │             ▲
├─► proposal/requirements/tasks ─────┤  │ design-file-      │             │ design 是
│   🔴 scale=small 只产 design.md，   │  │ coverage 硬对账(error)          │ truth source
│   但 validator 四件套全 error → 断  │  │ ✅  最强链                       │ ✅
└─► prototype-*.html ─────────────────┘  │
├──► plan ─► plan.md (plan_level) ─► tasks/task-NN.md
│            │  ✅  provides/expects_from 硬对账
│            │  ✅  task-id 连续/design 覆盖/命令存在性
│            ▼
│    execute ─► review.json (verdict) ──────────┐
│            ├─ verify-required-evidence.json ──┤🔴只写不读
│            │   (items[].evidence)             │  +字段名错配
│            ├─ contract-artifacts/endpoints.json─►verify 探针5 ⚠️advisory
│            └─ 代码 (worktree) ── apply ──► main
│                                                │
└──► verify ─► verify-result.md ◄────────────────┘
├ test 实测 ✅CLI真跑(谎报无效)
├ 探针5/6 ⚠️advisory(上轮发现"谎报无效"过度承诺)
└ risk_level 覆盖 ✅

quick ─► QUICKLOG + linkedChange tasks.md (ql- 条目) ──► archive 🔘装饰性(parseTaskIdsFromPlan 只认 task-NN)

archive ─► review.json verdict ─► TASK_COMPLETION_REPORT ✅真相源
└─► module-impact.md + 更新 _module-map.yaml ─► changes/archive/<日期>-<desc>/

总体判断：核心主干（design→plan→execute→verify 的文件清单/契约对账 + review.json 真相源）设计扎实、流转闭合，且由 stage-contract-spec.js 保证"事前契约 == 事后校验"。但有 2 条链是断的、3 条是弱的。

  ---
二、流转正确的链路（保留，不要动）

1. design 文件清单 → allowed_paths → 实现 → 对照（最强链）：plan-postcheck.validateDesignFileCoverage 硬对账 design.md 清单中每个源码文件都被某 task 的 allowed_paths 覆盖（error
   阻断）——从源头杜绝"execute 子代理被 allowed_paths 锁死而无权改 → 漏改"。
2. execute review.json verdict → archive 完成度：summarizeTaskCompletion 以 review.json 双 verdict 非 fail 算完成度，替代易失真的 checkbox 计数；archive prompt 明确告诉 agent"以本报告为准"。
3. decisions.md P0/P1 阻塞：shared.decision-blocker 跨 brainstorm/plan/verify 三阶段 error 阻塞，未决决策带不进下游。
4. verify 测试对账：CLI 真实执行 local.yaml 的 commands.test，自报 PASS 但实测失败即阻断 + 回滚（谎报无效）。
5. quick CLI 全接管：ql-ID 分配/状态翻转/task 勾选全由 quicklog.js 接管，prompt 与实现一致；quick 的 ql- task 条目对 archive 完全透明（不误判完成度）。

  ---
三、🔴 流转矛盾 / 未闭合（P0，必修）

矛盾 1：brainstorm scale=small 与四件套 validator 冲突

- prompt 说（brainstorm.js:463）：scale=small 只产 design.md，proposal/requirements/tasks 不生成，然后 --done。
- validator 做（stage-contract-spec.js:63-96 + stage-contract.js:253）：四件套全 error，无 scale 豁免，complete.js:438 无条件跑 validator。
- 后果：agent 严格按 Step8 small 指引只写 design.md 后 --done → 3 个 error → rollbackCompletionAndReturn → brainstorm 卡 in-progress。
- 测试盲区：test/run-complete-step-brainstorm.test.mjs:74-79 的 small 用例仍写全四件套，所以从未暴露。
- 唯一出口：Step2 早期筛查就转 quick（actualCompleted(2) < actualTotal(8) 跳过 validator）——但留下永久 in-progress 的 brainstorm stage 状态残留，且 Step8 的 small 分支按字面执行必撞墙。
- 根因：readDesignScale（complete.js:62）只用于"下一步提示分叉"，没回流到 validator。

矛盾 2：verify-required-evidence.json 只写不读 + 字段名错配 + SKILL 谎报

- 写侧完整（gates.js:358 + task-review.js:577）：execute 有 cannot_verify task 时落盘 changes/<change>/verify-required-evidence.json，schema = { generatedAt, schemaVersion:1, items: [{task, verdict,
  evidence}] }。
- 读侧为零：verify-postcheck.js / stage-contract.js:validateVerifyOutputs / gates.js verify 分支没有任何读取点（全仓 grep 只有 3 处 src 引用：2 写 + 1 prompt 文本）。
- 字段名错配：prompt（verify.js:78 + verify.md:105）让 agent 读 requiredEvidence 键，实际顶层是 items、每项是 evidence——agent 照做必落空。
- SKILL 谎报：.claude/skills/sillyspec-verify/SKILL.md:47 写"missing evidence → 阻断"，没有任何 gate 阻断。
- 后果：cannot_verify task 的 requiredEvidence 是"只写不读"死链。execute 辛苦落盘，verify agent 不在 verify-result.md 体现也不会被发现。整条 evidence 流转未闭合，且 SKILL 撒了谎。

  ---
四、⚠️ 弱流转 / 部分正确（P1）

3. decisions.md 的 D-xxx@vN 追踪：只有"存在性"，无"映射完整性"
   - 硬的只有 P0/P1 阻塞（error）；ID 引用（plan.md/verify-result.md 是否含 D-xxx 基号）是 warning，且只查"字面出现过"。
   - prompt 让 agent 画的"覆盖矩阵 / 决策追踪矩阵（D→FR→task→evidence）"CLI 完全不校验结构。agent 在 plan.md 塞一行 D-001 就过 warnMissingIds。矩阵对不对没人查。
4. _module-map.yaml：两套字段口径 + 零 schema 校验
   - parseModuleMapSimple（prompt.js:108）解析了 tags/aliases/entrypoints/main_symbols，但 buildModuleContextInjection（prompt.js:55）CLI 自动注入只用 id/role/paths——那几个"匹配用"字段是 prompt 鼓励
   agent 手 cat yaml 读，与 CLI 程序化注入是两套。
   - 零 schema 校验：contract-spec 对 _module-map.yaml 无任何规则，validateScanOutputs 只判 modules 目录非空。agent 把 entrypoints 写错字段名、漏 main_symbols，CLI 不发现。
   - schema_version: 2 但解析器不校验版本（v1/v2 混用无告警）；modules.js 与 prompt.js 两份同名 parseModuleMapSimple 字段集已分叉。
5. scan 死文档：INTEGRATIONS.md、flows/*.md 无任何下游消费者（file-lifecycle.md:144 自己承认）。scan 产但无人读，纯 token/子代理成本浪费。

  ---
五、内容与格式适宜性

✅  适宜的部分

- review.json / TaskCard schema：字段定义清晰，postcheck 硬校验，schemaVersion 版本化。
- verify-result.md 模板：章节齐全（结论/任务完成度/设计一致性/探针/决策矩阵/测试/技术债/风险等级/Runtime Evidence/代码审查），且结论 FAIL 门控 + 风险等级 frontmatter 覆盖都有硬背书。
- frontmatter 规范：author/created_at/source_commit/updated_at/generator 一致要求。

⚠️ 格式的脆弱点（设计选择，非 bug）

6. 章节校验是字面匹配，同义词即 fail：design 的"风险登记/自审/文件变更清单"、proposal 的"非目标"、requirements 的 FR-\d+ 都是 literal-any/regex 字面判定——agent 写"自我审查"≠"自审"、"FR
   01"≠"FR-01"就落空。好在：(a) 这些全 warning 不阻断；(b) contract-spec 的 spec 字段逐条把"不识别"情况披露给 agent 事前看。属于"精确但脆弱 + 诚实披露"。
7. 两套 task 格式并存：plan 的 - [ ] task-XX: vs quick 的 - [ ] ql-...，parseTaskIdsFromPlan 只认 task-NN。quick 的 task 条目对 archive 是装饰性的（不参与完成度）。这不是 bug（设计上 quick task
   不该进 archive 完成度），但格式不统一增加认知负担。

🔴 格式上的真问题

8. verify-required-evidence.json 字段名不自洽：写 items[].evidence，prompt 喊 requiredEvidence（见矛盾 2）。
9. frontmatter author/created_at 无 postcheck 复核（上轮发现）：靠全局铁律口头要求，postcheck 不查，agent 漏写不阻断。

  ---
六、改进建议（按性价比）

┌────────┬─────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────┐
│ 优先级 │         项          │                                                                   做法                                                                    │         收益         │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🔴 P0  │ 矛盾1 brainstorm    │ 二选一：① validator 按 scale: small 豁免 proposal/requirements/tasks（contract-spec 加 condition）；② 删 Step8 small 分支，small 统一走   │ 消除"照 prompt       │
│        │ small               │ Step2 早期出口 + 清理状态残留                                                                                                             │ 做必撞墙"            │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🔴 P0  │ 矛盾2 evidence 链   │ 二选一：① verify 加 reader 消费 items[].evidence 逐条核验（闭合链）；② 若暂不做，删 prompt 的读取指令 + 修 SKILL 谎报 +                   │ 消除死链 + 文档撒谎  │
│        │                     │ 字段名对齐，明确"由 agent 在 verify-result.md 自报告"                                                                                     │                      │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🟡 P1  │ decisions 矩阵      │ 若要硬：加 custom kind 校验 D→FR→task 映射；若不硬：prompt 明示"矩阵仅人眼追溯，CLI 只查 ID 存在性"，别让 agent 以为矩阵会被校验          │ 诚实降级             │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🟡 P1  │ _module-map schema  │ 加 schema_version 校验 + 合并两份 parseModuleMapSimple；CLI 自动注入补上 tags/aliases 匹配（或 prompt 不再鼓励 agent 用这些字段）         │ 消除两套口径         │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🟡 P1  │ scan 死文档         │ INTEGRATIONS/flows 要么接消费（verify/execute 读），要么明确标"仅供 knowledge 提取 + 人类查阅"并降为 optional                             │ 省 token             │
├────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ 🟢 P2  │ 字面脆弱性          │ 维持现状（warning + 披露已够）；可选：把高频同义词补进 literal 备选（"自我审查"/"Out of Scope"）                                          │ 降踩坑率             │
└────────┴─────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────┘

一个架构级建议：stage-contract-spec.js 这套"事前契约 == 事后校验"机制非常好，但它只覆盖了文件存在性 + 章节字面 + 少数 custom kind。矛盾 1/2 的根因都是"prompt 描述的流转/分叉没有对应的 contract
规则背书"。建议把 scale 分叉、evidence 闭环 也建模成 contract 规则（或显式声明为 prompt-only advisory），让"prompt 说的每一条流转"都有"contract 兜底 or 明确标注 advisory"的二选一归宿——这正是 verify
探针 5/6 上轮翻车的同一类病。

  ---
是否需要同步文档 / 下一步

- 本轮只读分析，未改文件、未跑测试。
- 风险/遗留：矛盾 1（brainstorm small 撞墙）和矛盾 2（evidence 死链 + SKILL 撒谎）是当前文件流转里最可能让 agent 产出错误结果或卡死的两个真问题；加上轮的 verify 探针 advisory、review-tier
  ≤5、plan-postcheck 字段清单，目前累计 P0 级 6 项。
- 建议下一步（如要我落地，新 session 提示词）：

▎ 走 sillyspec run quick 分批修文件流转与契约一致性 P0。批次 A（流转矛盾）：① brainstorm small——给 validateBrainstormOutputs 加 scale 豁免（contract-spec BRAINSTORM_RULES 的
▎ proposal/requirements/tasks 改 condition 或 validator 读 frontmatter scale），补 test 覆盖"只产 design.md"；② verify-required-evidence——加 verify reader 消费 items[].evidence（或删 prompt 读取指令
▎ + 修 verify.js:78/verify.md:105 字段名为 items[].evidence + 修 SKILL.md:47 谎报）。批次 B（上轮 P0）：verify 探针 5/6 advisory 措辞、review-tier ≤5→≤3、archive Step2 伪命令、doctor Step0 悬空
▎ else/fi。触及 src/stage-contract*.js/src/verify-postcheck.js/src/stages/*.js/templates/prompts/，按规则 19 改完重跑 node docs/prompt/_extract.mjs 同步 docs/prompt/*.md + 同步
▎ file-lifecycle.md（矛盾1/2 涉及生命周期）。建议矛盾1/2 各自独立 --change，不混合。

本轮工具驾驭小结：又用了一个后台 subagent 做 6 个衔接点的源码兑现核验，效果同样好——它挖出了我光读 contract-spec/lifecycle 发现不了的 2 个真矛盾（brainstorm small 撞墙有测试盲区佐证、evidence
只写不读有全仓 grep 佐证），且都带文件:行。两轮分析共同印证一个方法论结论：判断"文件流转是否正确"不能只看 prompt 怎么说，必须回 validator 源码确认 prompt
描述的每条流转有没有对应校验/读写点——stage-contract-spec.js 是好的起点（它声明了有背书的规则），但 prompt 里还有大量"描述了流转却不在 contract 里"的软陈述（scale 分叉、evidence
闭环、决策矩阵），这些正是漂移的高发区。