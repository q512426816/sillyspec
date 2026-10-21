---
author: flow-machine-draft
created_at: 2026-10-21T03:59:03.756Z
---
# 设计记录（Design Record）— 2026-10-21-knowledge-tier-denoise

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四处代码改动 + 一次数据清偿，全部是「接线既有机制」而非新建机制：

**① 检索核心堵停车场（FR-01）**——单点修在检索核心而非各注入口，三个消费面（execute/quick 注入的同步链 matchKnowledge、flow 注入/知识门/{DECISION_HITS}/search 的异步链 matchKnowledgeHybrid）自动继承：
- `knowledge-match.js matchByRouting`：matched entries 过滤 `decisions/unmapped.md` 与 `fr/unmapped.md` 两文件的路由行（decisionRoutes 随之不含，decisionHits 免疫）；
- `knowledge-match.js fallbackByQueryShingles`：byFile 聚合时跳过 unmapped 决策文件；
- `knowledge-vector.js buildResultFromPlatform`：spec_path→file 映射后丢弃停车场文件候选；
- `stages/knowledge.js` search 回显在过滤致零结果时补一行披露（保人工可见性——文件本身仍在盘上可直查）。

**② 路由行去泛词（FR-02）**——`decision-distill.js:490` 默认 makeLine 删 `|decision|决策`、`fr-index.js:593-598` FR 面 makeLine 删 `|FR|需求|承接`（auto- 伪域分支同口径）；`syncIndexRoutingLines` 增 `opts.stripTokens` 参数：对保留行与新行的关键词表幂等剥离指定泛词（域名与其余关键词保留，行不删）。四个调用方（decision-distill:713 / fr-index:593 / redomain:141 / decision-redomain:138）按各自面传参，存量行随任意一次 distill/归档/迁移自动清偿，另对本仓 INDEX 手动执行一次 sync 即时生效。

**③ 热路径缓存（FR-03）**——新增小工具模块（读/写原子 JSON：{version, fingerprint, savedAt, payload}，writeAtomicSync 落 `.sillyspec/.runtime/cache/`）：
- quicklog 伪条目（`knowledge-quicklog.js parseFlowArchiveEntries`）：指纹=归档根目录名列表 + 归档根 stat.mtimeMs（目录增删/改名必变；归档件是冻结审计面，无就地编辑形态），指纹廉价每次重算，命中即免 765 次 readdir + ≤369 次 proposal.md 读；
- knowledge-graph（`knowledge-graph.js buildKnowledgeGraph`）：输入面粗粒度指纹（_module-map.yaml + 模块卡/changelog/scan 目录 stat + 归档根 + quicklog/test-bindings.json）+ TTL 10min 硬上限 + 缓存版本常量（代码演进 bump 即全量失效）。深编辑在 TTL 窗内可能短暂陈旧——图召回是第三层 advisory 保底（fail-soft），有界陈旧可接受并在代码注释声明。图序列化为 {nodes: [...], edges: [...]}，重建 Map，测试断言与全量构建逐字段等价。

**④ unmapped 存量清偿（FR-04）**——新增 bulk 驱动（挂 `knowledge` 子命令，dry-run/apply 两态）：decisions 条目取「文件：」锚 → moduleOf（修复后的 modulePathMatches）→ 目标域分组 → 逐组调 `redomainDecisionEntries`（anchors 精选）；fr 条目取来源变更 → frCoverageFiles（既有）→ moduleOf → FR 侧迁移原语。冲突（目标域同 id 同变更）跳过不覆盖；无锚/不命中者留 unmapped，报告列明残量与原因，留档变更目录。

选此方案因为：FR 面 2026-09-29 已验证同口径过滤的收益（整池倾倒 11/11 次实证）；redomain 原语与匹配器修复已在库，本变更是接线与执行。明确不做（另立变更）：平台侧保留策略、quicklog 账本退役、hits 遥测 demote。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

本变更触碰面（收口对账声明）：

- `src/knowledge-match.js`：matchByRouting / fallbackByQueryShingles 行为变更——unmapped 停车场文件从 entries/decisionHits 零返回；签名不变。
- `src/knowledge-vector.js`：buildResultFromPlatform 行为变更——停车场 spec_path 候选丢弃；签名不变。
- `src/stages/knowledge.js`：search 回显增披露行（仅过滤致零结果时）；matchKnowledgeHybrid 调用不变。
- `src/decision-distill.js`：syncIndexRoutingLines 增 opts.stripTokens（数组，缺省 [] 行为不变）；默认 makeLine 模板变更（去 `|decision|决策`）。
- `src/fr-index.js`：FR 面 makeLine 模板变更（去 `|FR|需求|承接`）+ 调 syncIndexRoutingLines 传 stripTokens。
- `src/redomain.js` / `src/decision-redomain.js`：sync 调用补传各面 stripTokens；迁移原语本体不动。
- `src/knowledge-quicklog.js`：parseFlowArchiveEntries 增缓存（内部行为，签名与返回结构不变）。
- `src/knowledge-graph.js`：buildKnowledgeGraph 增缓存（内部行为，签名与返回结构不变）。
- 新增 `src/hot-cache.js`（读/写原子缓存小工具）与 unmapped 批量清偿驱动模块（decisions/fr 双面）+ CLI 子命令。
- 数据面：`.sillyspec/knowledge/INDEX.md`（泛词剥离）、`knowledge/decisions/unmapped.md`、`knowledge/fr/unmapped.md`（存量迁移）、清偿报告留档本变更目录。
- 测试面：新增 test/knowledge-tier-denoise.test.mjs、test/knowledge-hotpath-cache.test.mjs、test/redomain-unmapped-bulk.test.mjs；断言旧行为（unmapped 可入检索/路由行含泛词）的既有测试随契约更新，非删除断言。
- CLI 端点：新增 `knowledge` 子命令面（unmapped 批量清偿 dry-run/apply）；既有命令签名零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。distill 写知识文件与 sync 剥离泛词的顺序无关紧要——sync 幂等（重跑零漂移），迟到的一次 sync 即完成清偿。缓存指纹在归档目录新增后下一次调用即失配重建，最坏一次陈旧读取发生在「新增归档的同一毫秒」——quicklog 指纹含目录名全列表，不存在半态命中；graph 有 TTL 硬上限兜底。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   INDEX 与知识文件写盘沿用既有 writeAtomicSync（last-writer-wins，与今日行为一致）；两个进程并发写缓存文件同理原子，输家下次指纹失配重建。缓存读为纯读，损坏（原子写把半截概率压到忽略）→ JSON.parse 失败 → fail-open 全量重建。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。缓存落 `.runtime/cache/`——doctor/hygiene 的按变更 runtime 回收（pruneArchivedChangeRuntime）只动本变更 execute-runs/verify-runs 等目录，不碰 cache/；`.runtime` 整体 gitignored 且被平台 spec 上传排除（UPLOAD_EXCLUDE_TOP_BASE），无生命周期悬挂。会话中断最坏丢一次已构建缓存，重建即得。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。缓存路径由 specBase 派生（每仓各自 `.sillyspec/.runtime/cache/`），键含指纹不含任何跨仓标识，多仓/多 worktree 各自独立文件；worktree 场景各自建各自缓存，代价是多建一次，无正确性风险。批量清偿只动本仓 knowledge 活库，不回写归档件（D-unmapped-152 死路注记：归档是冻结审计面）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**清偿误迁**（633 fr + 443 decisions 条的机器推断目标域出错，把决策挪进错误域文件误导后续检索）。缓解：dry-run 报告先行留档人工可核；推断只用封闭判据（文件锚 glob 命中/来源变更覆盖面），命中不了就留——宁漏勿错；迁移幂等且段字节整体搬运（可用反向 redomain 回迁纠错）；冲突键跳过不覆盖。

次风险：**泛词剥离后单关键词域名过匹配**（change/workspace/admin 等常见词域名，上下文出现该词即命中对应域）——接受：域名即路由本义，且只命中单域不再全池；语义兜底由词片回退层承担。**过滤后至清偿完成前的真空**（FR-01 先生效、unmapped 条目暂不可检索）——同变更内 FR-04 紧随执行，窗口以小时计；文件可直查，search 披露行指路。

试过但放弃的方案：
- **hits 遥测 demote（neverHit 出池）**——放弃：thin 面遥测断流污染 neverHit 判定（flow.js:338-343 注释自认盲区），且否决条目价值恰在低频救命（deathPath 先例），误杀风险高。另立变更。
- **检索核心不动、仅注入口逐面过滤**——放弃：五个注入口（execute/quick 同步链、flow digest、{DECISION_HITS}、知识门）逐一改，未来新增消费面必漏；单点堵核心三路一处生效。
- **对归档件补写域信息回填路由**——放弃：归档是冻结审计面不回写（D-unmapped-152 死路注记）。
- **graph 缓存用全输入逐文件 stat 指纹**——放弃：12k 文件 stat 走一遍的成本逼近部分场景的全量构建收益；改粗粒度指纹 + TTL + 版本键，陈旧有界且 advisory 面可接受。
