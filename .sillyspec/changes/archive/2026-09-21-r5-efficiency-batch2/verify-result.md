# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——四模块实现与 design 逐字一致、四新测试件 34/34+相邻面 50/50+doc-ref 93/93+lint 729 全绿，缺省路径零回归有黄金快照逐字节实证；notes=①worktree 内 13 个 cwd 守卫环境族测试失败（主仓同族绿基线，env-blocked 移交）②verify 门快照③态分叉假红一次（并行会话主仓在途异动 × M2 未 apply 的旧快照语义——修复场景活实证，SNAPSHOT_OFF 主仓对照已判环境问题，apply 后主仓复跑终局对账，env-blocked 移交）③R5 对撞重跑指标验收为外部执行（manual-acceptance 移交）④D-005@v1 为执行期 scope 裁决（四项连带面已收口，非风险决策）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | worktree 内 13 个测试文件失败（config-schema/init-no-skills/init-platform-keep-local-yaml/init-tool-multi/mcp-server/platform-init-pointer/platform-managed-declaration/platform-recovery/platform-recovery-chain/run-help-shortcircuit/run-exit-codes/sillyhub-mcp-platform-fixes/spec-dir）——全为 worktree cwd 守卫环境族（探测「当前在隔离 worktree 内」拒绝跑，主仓同族绿，Wave 1 起基线即如此） | apply 后主仓跑 `npm test`（预期同族全绿；worktree 定向跑经 gate 快照口径不触这族） |
| env-blocked | **verify 门快照③态分叉假红（M2 修复场景活实证）**：本会话期间并行会话在主仓改了 `src/stages/execute.js`（+1 行反例测试核对 prompt）与 `docs/sillyspec/platform-interface-map.md`（14 行锚点，quick 修复在途）——verify 门跑主仓进程用**未 apply 的旧版** gate-snapshot，③态按旧语义取主仓 → 快照装入并行版 execute.js，本变更 2 条新测试对旧代码断言假红（module[cli-core,run-gates]+deps 2 行）。M2 修复（分叉取 worktree）恰能根治此场景但自身未 apply——鸡生蛋。已按 CLI 排查路径②处置：SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF=1 回退主仓口径复跑对照（旧世界自洽绿）+本变更真实测试证据以 worktree 定向全量 560/573 为准 | apply 后（并行主仓异动与本变更 3-way 合并落地）主仓重跑 `npm test`——M2 已随 apply 生效，此后快照口径即修复语义 |
| manual-acceptance | R5 对撞重跑指标（design 验收协议：写码前 ≤35′ / 门禁轮次 ≤2 / token ≤1.7× / 三类卡点零复现）——外部执行面，非本 verify 可判定 | 第 3 批立项前跑 R5 重跑对撞组，指标对照 design「验收协议」节 |
| other | M1 v1 默认关闭（SILLYSPEC_STEP_GUIDE=1 显式开）——D-001 退役判据锚定「跨进程短输出与 stdout 确定性测试族相容后翻默认」，属既定分批路径非缺陷 | 后续批迁移测试面后翻默认并删 env 门 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
无（五卡 review 均 pass/pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
无（本变更触 CLI 渲染层/快照装配层/派发 prompt 层，无 integration-critical/deployment-critical 运行时组件；等价集成面=派发 prompt 渲染端到端，由 `test/execution-mode-render.test.mjs` 与黄金快照 diff 实证承接）。

## 任务完成度 [层：人工判断]
- task-01: 完成 ✅——computeStepGuideFingerprint+step-guides 落盘+复入 ≤10 行+动态段不缓存+--json 全量（src/run/prompt.js，+159 行）；`test/step-guide-fingerprint.test.mjs` 6 断言绿
- task-02: 完成 ✅——仅③态分支翻转（git diff 逐字核对：src/run/gate-snapshot.js +8/-4，①②态字节不动）；三态钉 `test/gate-snapshot-lineage.test.mjs` + 端到端 `test/verify-gate-snapshot.test.mjs`（D-005①翻后期望）双绿
- task-03: 完成 ✅——recommendWaveGroups 纯函数+派发段注入+advisory 附分组+SillyHub 互斥+零推荐零注入；`test/plan-grouping-recommend.test.mjs` 17 断言绿
- task-04: 完成 ✅——plan 模板键+判据话术+main 直写渲染分支+缺省 dispatch 黄金快照 6 形态逐字节零回归；`test/execution-mode-render.test.mjs` 8 断言绿
- task-05: 完成 ✅——镜像三件+runtime/stages 双卡+D-005 四项连带面（期望翻转/双锚重锚）；_verify 39/51 与主仓基线失配组成逐条一致
完成率 5/5 = 100%。

## 设计一致性 [层：人工判断]
实现与 design.md **一致**（四模块逐节对照见「任务完成度」与探针 7 矩阵）。三处 design 未锁死处的实现期细化（均已落 decisions/review notes，非偏差）：
1. M1 两裁决（task-01 review 在案）：复入状态升变更级（防模板级误短路 knowledge-inject 一致性测试）；v1 默认关显式 env 开（stdout 确定性测试族相容性，D-001 退役判据锚定）。
2. M3 护栏预算细化：design 三条件之外内建「批数 ≥ min(3,N)」预算（与 batch1 判定②同口径不变式——推荐不得自触护栏缺口，A1 实证 n=6 输出 3 批贴线而非 2 批），测试断言不变式。
3. M4 跨仓+main 组合保留 per-task workdir 表（不扩面；判据=清晰输入×正交，跨仓 ctx 场景罕见）——代码注释与 task-04 review 在案。
另：D-005@v1 执行期 scope 裁决（四项计划漏覆盖连带面归 task-05 收口）为流程面扩展非设计偏差，四项全部落统一提交 58295633。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/execute.js:335` - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 g
- ⚠️ `src/stages/execute.js:493` - 是否有未处理的 TODO/FIXME
- ⚠️ `src/stages/plan.js:379` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:418` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:538` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `src/stages/plan-postcheck.js:1510` * 无 diff 可取）生成骨架，影响类型列留 <!--TODO--> 由 execute/verify 按实际 diff 回填。
- ⚠️ `docs/prompt/plan.md:367` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `docs/prompt/plan.md:477` decision_ids: [D-XXX@vN]
- ⚠️ `docs/prompt/plan.md:530` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/execute.md:488` - 是否有未处理的 TODO/FIXME
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描。本步骤 --done 时，CLI 按项目声明危险面（`_module-m
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单，流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：{SPEC_ROOT}/flows/\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步的 plan.md 做审查。生成与审查分离——不在生成与自上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md
- ℹ️ 4 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

**探针 1 语义裁定（QA）**：15 处命中逐一核验均为**prompt 模板散文引用 TODO/FIXME/占位符字面量**（指导 agent 处理 TODO 占位的协议文案本身，如 execute.js:335 是 symbol-impact 骨架指引、plan.js:538 是占位符硬拦说明、_extracted.json 是各阶段 prompt 原文镜像）——已知误报面（散文引用字面量命中），非未实现标记；本变更新增代码零 TODO/FIXME。

#### 探针 2：设计关键词覆盖
能力关键词 × 源码逐个 grep（worktree=统一提交 58295633 态）：
- `computeStepGuideFingerprint` → src/run/prompt.js ✅（M1）
- `step-guides`（落盘目录） → src/run/prompt.js ✅（M1）
- `双写分叉`/③态取 worktree → src/run/gate-snapshot.js（:425-429 注释+src = wtPath）✅（M2）
- `recommendWaveGroups` → src/stages/plan-postcheck.js + src/stages/execute.js（无二源）✅（M3）
- `execution_mode` → src/stages/plan.js + src/stages/execute.js ✅（M4）
- `主代理直写` → src/stages/execute.js + src/stages/plan.js ✅（M4）
- `偏离须在 Wave 完成摘要`（偏离披露） → src/stages/execute.js ✅（M3）
- `SillyHub 派发互斥` → src/stages/execute.js ✅（M3/M4）
- `checkBatchAdvisory` → src/stages/plan-postcheck.js（本体）+ src/stages/execute.js（消费）✅
- `SILLYSPEC_STEP_GUIDE`（v1 env 门） → src/run/prompt.js ✅
零 ⚠️ 未实现关键词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/run、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-02: 模块目录（src/run、test）找到 10 个测试文件（同上族）
- ✅ task-03: 模块目录（src/stages、test）找到 10 个测试文件（同上族）
- ✅ task-04: 模块目录（src/stages、test）找到 10 个测试文件（同上族）
- ✅ task-05: 模块目录（docs/prompt、docs/sillyspec、test、.sillyspec/docs/sillyspec/modules）找到 10 个测试文件（同上族）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断——**QA 标注**：本变更为 CLI 纯函数+prompt 渲染层，无路由/layout/跨进程装配面；等价集成面（buildWavePrompt 端到端渲染）由 execution-mode-render/plan-grouping-recommend 两件的 fixture→渲染→断言链覆盖（见代码审查节断言抽查）。

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面；探针 7 = 结构归属承接面；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable。关键词命中只是提示，命中≠判定。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 同指纹复入静态部分输出 ≤10 行 | `test/step-guide-fingerprint.test.mjs` | — | covered | `test/step-guide-fingerprint.test.mjs:47`（复入短输出用例）+ :65（`短输出块 ≤10 行` 断言真实计数） |
| 指纹变更全量重印 | `test/step-guide-fingerprint.test.mjs` | — | covered | `test/step-guide-fingerprint.test.mjs:69`（模板变更→复入全量重印用例）+ :74（重印内容断言） |
| 动态段两次渲染均在 | `test/step-guide-fingerprint.test.mjs` | — | covered | `test/step-guide-fingerprint.test.mjs:60`（动态段（本次时间）照常渲染断言——两次渲染时间戳不同证不缓存） |
| --json 全量输出不变 | `test/step-guide-fingerprint.test.mjs` | json（`test/step-guide-fingerprint.test.mjs`） | covered | `test/step-guide-fingerprint.test.mjs:6`（json） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三态钉全绿 | `test/gate-snapshot-lineage.test.mjs` | — | covered | `test/gate-snapshot-lineage.test.mjs:45`（①保护态）、:53（②正常态）、:59（③分叉态翻转点）三用例独立断言，本 verify 复跑绿 |
| 既有 gate-snapshot 相关测试零回归 | `test/gate-snapshot-lineage.test.mjs` | 既有、gate、snapshot | covered | `test/gate-snapshot-lineage.test.mjs:8-9`（①②态零回归声明）+ `test/gate-snapshot-ancestor-trim.test.mjs`（期望随 D-002@v2 翻转后 3/3 绿）+ 全量 560/573（gate-snapshot 族零新失败） |
| batch1 场景复刻用例断言快照内 src 为 worktree 版 | `test/gate-snapshot-lineage.test.mjs` | batch1、src、worktree | covered | `test/gate-snapshot-lineage.test.mjs:59`（③分叉态=batch1 假红场景复刻：主仓异动+worktree 交付→断言取 worktree 版）+ `test/verify-gate-snapshot.test.mjs:146`（端到端快照层复刻，D-005①翻后绿） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 分组纯函数单测过：正交/契约链/帽值边界 | `test/plan-grouping-recommend.test.mjs` | 正交、契约链、帽值边界 | covered | `test/plan-grouping-recommend.test.mjs:95`（A5 文件相交）、:104（A6 契约链双向）、:56（A1 帽值+护栏贴线）+ assertInvariants 结构不变式复跑（:69-90） |
| buildWavePrompt 含推荐分组行（有可并批）/逐字节一致（无可并批） | `test/plan-grouping-recommend.test.mjs` | buildWavePrompt、有可并批、逐字节一致、无可并批 | covered | `test/plan-grouping-recommend.test.mjs:216`（B1 注入断言）、:228（B2 零注入+插入位相邻字节形态钉） |
| advisory 文案含分组 | `test/plan-grouping-recommend.test.mjs` | advisory | covered | `test/plan-grouping-recommend.test.mjs:28`（advisory）——C1 判定①message 含分组清单断言 |
| SillyHub 模式零注入 | `test/plan-grouping-recommend.test.mjs` | SillyHub | covered | `test/plan-grouping-recommend.test.mjs:10`（SillyHub）——B3 互斥断言（sillyhub 零注入/local-fallback 照注对照） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 缺省（无键/非法回退）dispatch 渲染与现行为逐字节一致（零回归钉） | `test/execution-mode-render.test.mjs` | 缺省、无键、dispatch | covered | `test/execution-mode-render.test.mjs:82`（T1 三态逐字节互等+MAIN 回退）+ 黄金快照 6 形态改动前后 diff 逐字节一致（review notes 在案） |
| main 渲染含直写指引段且不含派发段/工作目录段/并发帽段/分组段 | `test/execution-mode-render.test.mjs` | main、工作目录段、并发帽段、分组段 | covered | `test/execution-mode-render.test.mjs:110`（T2 六项禁词逐项断言+直写四段在位） |
| 两模式下锚点写入与 review write 指引一致存在 | `test/execution-mode-render.test.mjs` | review、write、指引一致存在 | covered | `test/execution-mode-render.test.mjs:10`（review）——T3 双模式 wt-commit/Task Review Gate/review.json 三锚一致断言 |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 镜像与源逐字一致（_verify.mjs 不低于主仓基线） | `test/verify-gate-snapshot.test.mjs` | — | covered | 机械归属文件不承接本条（已改判）；真实承接=`docs/prompt/_verify.mjs` 确定性脚本实测 39/51，失配清单与主仓基线逐条一致（12 处全为动态阶段示例值既有失配，零新增）——执行记录见 task-05 review |
| 模块卡行为行锚点有效 | `test/verify-gate-snapshot.test.mjs` | — | covered | 真实承接=`test/doc-ref-check.test.mjs`（93/93 全过，覆盖 modules/*.md 全部行号锚——本批新增行为行零 file:line 锚故零新增失效面）+ `sillyspec docs check` 621 引用口径本批唯一失效（prompt.js:910 存量）已由 D-005④ 重锚 |
| docs-check 无新增漂移告警 | `test/verify-gate-snapshot.test.mjs` | — | covered | 真实承接=`sillyspec docs check` 主仓实测：1/621 失效为存量（prompt-control-debt 锚，主仓两涉案文件零改动自证非本批引入；worktree 侧已重锚 1399 随统一提交走 apply）；3 处变更名悬空为既有 advisory（known_failures 豁免面），零新增漂移 |

- ⚠️ 零/半自动化承接条目 7 条——**QA 走查结论**：7 条 partial 已全部改判 covered 并附真实锚点/实测证据（见上矩阵改写）；对应的人工走查（镜像逐字比对口径、模块卡内容准确性、docs-check 判定）已在「代码审查」节显式走查登记，无 P1 藏身。

#### 探针 4：决策追踪覆盖
D-001@v1→FR-01（task-01 卡 decision_ids）→实现 src/run/prompt.js→测试 step-guide-fingerprint 6 断言→退役判据锚定 env 门路径 ✅闭环
D-002@v2→FR-02（task-02 卡）→gate-snapshot.js ③态→lineage 三态钉+端到端复刻 ✅闭环
D-003@v1→FR-03（task-03 卡）→recommendWaveGroups+注入+advisory→grouping 17 断言 ✅闭环
D-004@v1→FR-04（task-04 卡）→plan 模板键+execute main 分支→render 8 断言+黄金快照 ✅闭环
D-005@v1→（执行期 scope 裁策，无 FR 映射属预期）→task-05 卡 implementation D-005 扩边条目→四项全部落统一提交 58295633（期望翻转+双锚重锚+双卡）→decisions.md 在案 ✅闭环（scope 类决策不走 FR 映射，矩阵 ⚠️ 未映射为机械半边预期形态）
无 unresolved/blocking 决策，无 superseded 被下游引用。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (17 files @ worktree)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 4 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）
- QA 裁定：本变更为 Node CLI 无新增 HTTP 端点（4 个 live 为 sillyspec 既有 CLI 命令面存量噪音）；无 contract gap。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- QA 裁定：统一提交 16 文件全为 M/A 形态（+1034/-84，删除行全为被替换的旧文案/旧分支逻辑），无静默删除。

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 12 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——QA 复核：本变更为 CLI 内部渲染/快照/派发层，确无对外接口面，成立。

## 测试结果 [层：确定性检查——CLI 实测对账]
- 定向（worktree，统一提交 58295633 态）：四新测试件 34/34 绿（step-guide-fingerprint 6 + gate-snapshot-lineage 3 组 + plan-grouping-recommend 17 + execution-mode-render 8）；相邻面 50/50（plan-batch-advisory/dispatch-contract/execute-dispatch-integration/execute-materials + 本批两件）
- 全量（worktree）：560/573 通过、13 失败=worktree cwd 守卫环境族（见移交项 env-blocked，主仓同族绿基线）
- lint：`npm run lint` 729 文件过（check-syntax + test/ 内容规则 + 未引用导出 0 + module-map 覆盖全）
- doc-ref：`node test/doc-ref-check.test.mjs` 93/93 全过
- 镜像：`node docs/prompt/_verify.mjs` 39/51（与主仓基线失配组成逐条一致——12 处动态阶段示例值既有失配）
- M4 零回归专项：黄金快照 6 形态（无键/dispatch/非法值 × 有无 worktree × sillyhub/local-fallback）改动前后 diff，tmpdir 名归一后 6/6 逐字节一致
- **verify --done 隔离快照口径**：首跑 2 行假红——快照③态分叉（并行会话主仓同文件在途异动 × 未 apply 的旧版快照语义取主仓）装入并行版 execute.js，本变更新测试对旧码断言失败；详见移交项第二条（M2 修复场景活实证）。已按 CLI 排查路径②以 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF=1 回退主仓口径复跑（主仓 HEAD 旧世界自洽绿=环境问题坐实）；本变更真实测试证据以 worktree 定向全量 560/573 + 四新测试件为准，apply 后主仓复跑为终局对账（移交条件在案）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-05 | src/run/prompt.js computeStepGuideFingerprint+step-guides 落盘+复入短输出；`test/step-guide-fingerprint.test.mjs` 6 断言；runtime.md 行为行 | 闭环（v1 env 门为既定分批路径，退役判据在案） |
| D-002@v2 | FR-01、FR-02、FR-03、FR-04 | task-02、task-05 | src/run/gate-snapshot.js :425-429 仅③态翻转；`test/gate-snapshot-lineage.test.mjs` 三态钉+`test/verify-gate-snapshot.test.mjs` 端到端（D-005①）；runtime.md 行为行 | 闭环（正确性修复，无退役判据） |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-05 | recommendWaveGroups 双文件消费无二源；`test/plan-grouping-recommend.test.mjs` 17 断言含护栏不变式；stages.md 行为行 | 闭环（重跑对撞验收益归移交项 manual-acceptance） |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04 | task-04、task-05 | plan.js 模板键+execute.js main 分支；`test/execution-mode-render.test.mjs` 8 断言+黄金快照 6 形态逐字节；stages.md 行为行 | 闭环（判据自动化留第 3 批，decision 原文在案） |
| D-005@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | decisions.md D-005 条目+task-05 卡 D-005 扩边条目+统一提交 58295633 含四项（verify-gate-snapshot 翻转/platform-interface-map:1300/prompt-control-debt:1399/runtime+stages 双卡） | 闭环（scope 类执行期裁策无 FR 映射为预期形态；机械半边 ⚠️ 经人工复核确认四项全部落盘） |

## 技术债务 [层：人工判断]
- 探针 1 的 15 处命中全为 prompt 模板散文引用字面量（见探针 1 语义裁定），非真实 TODO/FIXME 债。
- 本变更新增代码零 TODO/FIXME/HACK 标记。
- 既有债零交集：CONCERNS.md 🔴🟡 区（代码质量/依赖/平台集成）与本变更五接触面无交集。

## 变更风险等级 [层：人工判断]
unit-sufficient。design.md frontmatter 显式声明 risk_level = medium；实际触碰面=CLI 渲染层（prompt.js）/快照装配层（gate-snapshot.js）/派发 prompt 层（execute/plan/plan-postcheck）纯函数与文案，无 daemon/session/schema/部署面（detectChangeRisk 关键词无未声明命中——显式声明在先）。四新测试件+黄金快照+全量回归承接充分；无被否定语境抑制的关键词。

## Runtime Evidence [层：人工判断]
不涉及（无运行时组件启动/端点/部署面）。等价运行时证据=CLI 实测链：本 verify 全部命令输出（测试/lint/doc-ref/_verify/docs check）+统一提交 58295633（16 文件 +1034/-84）+worktree 分支 bfa81dc9→58295633 线性历史。

## 代码审查 [层：人工判断]
**总体评价**：四模块实现与 design 逐字对应，边界纪律好（M2 仅 8 行翻转、M4 缺省路径黄金快照逐字节实证、M3 无二源）；测试断言质量高（真实输出断言、结构不变式、逐字节比对三档都有）。未发现 P1/P2。以下为走查记录。

**零覆盖路径显式走查（探针 7 ⚠️ 条目=定向面）**：
1. 镜像逐字比对口径：_verify 的 12 处既有失配逐条核对=全为动态阶段示例值（时代路径/省略 Wave），无实质漂移混入；本批 fence 内未加条件注入示例（防破坏逐字匹配）——注记段在 fence 外，口径正确。
2. 模块卡内容准确性：runtime/stages 两卡新增行为行逐句对照源码（函数名/行为/门控语义/测试锚全对得上）；core-engine 无需（_module-map 映照核实 recommendWaveGroups 落 stages 域）。
3. docs-check 判定：主仓 1/621 失效经双向自证（两涉案文件主仓零改动+关键词实落 1370/1395）为存量，非本批引入；worktree 已修。
**编辑/更新链路（非新增主链路）**：M1 复入路径=「编辑/二次进入」等价面——复入短输出+指纹变更全量重印双向测试钉（fingerprint.test:47/:69），且有变更级状态键防模板级误短路（实现期裁决①在案）。
**非主分支流**：implicit Wave×main（T7）、sillyhub×main（dispatchSection 双条件抑制）、local-fallback×M3 分组（B3 对照注入）、无 worktree×dispatch（黄金 nokey-nowt）四条旁路全有断言钉。
**守卫一致性**：allowed_paths 门禁/写入守卫/worktree 隔离/review gate 与模式无关——M4 恰以「两模式锚点+review 指引一致存在」为验收（T3）反向锁定；无越权面（D-005 扩边走主代理裁决+卡面更新，留痕完整）。
**并发/缓存**：memoMap 跨 Wave 缓存按「一次 buildExecuteSteps 期间卡内容不变」前提（既有契约，注释在案）；M3 facts 逐卡 memo 复用该前提，无新增竞态面。gate-snapshot 双写判定为纯读比对无锁需求。
**断言有效性抽查（探针 3 补充，抽 3 件）**：fingerprint.test:65 断言真实行数计数（非空断言）；grouping A1-A9 结构不变式（组≤3/批数≥floor/partition 完整）+贪心确定性双跑 deep equal（测行为非实现）；execution-mode T1 三态逐字节互等（强于子串包含）。均达标。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无（用户指令主代理直干不派子代理——与 execute 同款既定偏好；stage review 自审留痕在 .runtime/stage-reviews/execute-review-2026-09-21-200725/review.json，reviewerNotes 首行如实标注降级事由）。
