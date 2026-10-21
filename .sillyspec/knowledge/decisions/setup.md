---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — setup

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-setup-002@v1 local.yaml 读写侧 CRLF 归一且幂等跳过分支落盘治愈
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
原编号：D-902@v1
锚点：src/local-register.js:35
最近确认：71a7fe6
理由：parseRepoRegistry 等解析入口必须先归一 CRLF（正则 `(.*)$` 的 `.` 不匹配 `\r`，CRLF 文件条目全失配返回空 Map → execute fail-closed 报「未注册」）；registerRepoInLocalYaml 的幂等跳过分支在磁盘原文含 `\r` 时也要落盘一次治愈——否则 CLI 报 ✅ 而磁盘永不治愈，register-repo 死循环。

## D-core-engine-001@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
原编号：D-005@v2
锚点：src/verify-postcheck.js
最近确认：test123
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
来源：2026-08-23-adopt-harness-practices
supersedes：D-005@v1

## D-runtime-002@v1 提示克制语义：全零静默、每收尾最多一行、提示后清零、可关默认开
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-003@v1
锚点：未记录
最近确认：2a46c07
理由：照抄 teamai 的克制约束并适配：① 任何类型计数全零 → 收尾零输出（顺利会话零打扰）；② 每次收尾最多输出一行；③ 提示输出后计数清零（「每会话最多提示一次」的等价实现——同一段摩擦只提示一次）；④ 措辞保持「若其中有值得沉淀的坑」条件式（防 agent 为消除提示而制造记录）；⑤ local.yaml 新键 friction_hint.enabled，默认 true，可一键关。

## D-core-engine-005@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-setup-003@v1 选道判据从文件数改为"有无落盘设计决策"
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-001@v1
锚点：未记录
最近确认：e84bc89
理由：现行「≤3 文件且范围明确走 quick」中文件数是唯一可核验项、成了事实主判据；实证（sillyhub quicklog 交叉表）显示它量错维度——跨 2-3 模块×≤3 文件的改动文档同步率仅 24%，而单模块×4-6 文件反而 74%。改为语义判据：入口只回答"本次改动有没有需要落盘的设计决策"，有则走完整流程；AGENTS.md 判规模条款与 init 模板同步改写。

## D-core-engine-010@v1 门禁阈值支持 local.yaml quick-gate 段覆写，缺省=校准默认值
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-009@v1
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14（execute Step2 期追加）：THRESHOLDS 四键（l1_span/l1_files/l2_span/l2_files_degraded）经 local.yaml quick-gate 段覆写，未配置时用代码内默认值（即 task-05 校准定稿值）。与 D-007 否决的「配置化 gate 引擎」边界不同——不引入规则表达式/检查项配置面，仅四个数值键；默认值仍集中 quick-gate-profile.js 单点，config-schema.js 按「local.yaml 键单一数据源」惯例登记四 optional 键。

## D-setup-001@v1 生成物供给走 local.yaml `worktree.supplyFiles`，不做 gitignore 自动探测
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-003@v1
锚点：src/config-schema.js
最近确认：42cef77
理由：local.yaml 新增 `worktree.supplyFiles`（string[]，精确路径 + glob `*`/`**`，默认空=零行为变化）。worktree create step 5.8（deps 供给）后新增供给步：glob 展开→主仓存在则复制（mkdir -p 父目录），缺失 console.warn；meta.supplyFiles 记录实供清单。gitignore 物天然不进 assess/apply 面（`ls-files --others --exclude-standard` 遵循 .gitignore）。自动探测 gitignore 生成物不做——无法判定哪些是构建必需，误供给噪声大。
故障面：glob 误配展开风暴 → 展开上限帽截断 + 单文件失败不阻断 create；供给物过期（主仓重新生成前）→ 构建期自然报错，与主仓缺生成物同症状
退役判据：项目自带构建输入 manifest 可机读时（自动探测复潮条件同）

## D-core-engine-017@v1 完成门「声明追赶重定价」——无摩擦可降、摩擦地板不退（「只升不降」契约修订）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-003@v1
锚点：未记录
最近确认：7438d34
理由：escalateCeremonyTierAtGate 在档位文件在场时先用当前 design/plan 重跑 computeInitialCeremonyTierDoc，再跑摩擦升档。**transitions 为空且 ledger 摩擦未超阈：开跑价整档换成重算结果，可升可降**，reasons 留「声明追赶重定价」；**已有摩擦迁移：地板不退**，重算只更新 blast/span 分量，最终档=max(重算档, 摩擦地板)。懒 agent 靠删关键词把真 S3 写成 S0 仍由收口双跑按实际 diff 硬拦（verify-postcheck 事实面 detectChangeRisk 无声明通道）。
故障面：重定价抖动（design 反复改声明 → 档位反复横跳）——每次迁移留 transitions 审计痕，评审可见；摩擦地板保证已付仪式价不白付。
退役判据：若声明通道前移到定价时刻强制存在（如 brainstorm 门要求 frontmatter 先行），追赶重定价需求自然消失。

## D-core-engine-016@v2 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-001@v2
锚点：未记录
最近确认：7438d34
理由：范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
故障面：范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
退役判据：若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

## D-core-engine-022@v1 方案 A——map 顶层 span_risk 段（token 扁平列表）+ 空缺省 + 双消费面同刀 + 硬退役
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
原编号：D-003@v1
锚点：未记录
最近确认：c796534
理由：选 A（用户简报显式委托方案期定夺——原话「形态 brainstorm 定」「缺省行为、本仓自举表、两消费面切换、向后兼容（无声明项目）都在方案期落决策」；本条 agent 按委托选定，可 --reopen 否决）。理由：①与 blast 管道同构（D-008 先例：map 主声明进 git 可评审、modules rebuild --force 未知顶层段通用回插已覆盖 span_risk、装载容错立场「坏段跳过不拦截」现成）；②B 被等价问题显式否决过——local.yaml gitignore 每机一份当共享价目表（D-008 evidence 原文「local.yaml 当共享价目表」被否）；③C 与 blast「未配置禁止回退」（D-008）正面冲突且让全宇宙表活在缺省路径，违反知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」口径真相源条目。覆盖决策：符合 D-001（价目表公式零改动）、不违 D-002（不触碰 blast 段）。
故障面：①无声明项目静默失去六域网（auth/billing 路径不再触发 span S2 / quick L2）——以 known-issues/文档登记 + 本仓自举表示范对冲，blast 迁移同款取舍；②token 写错（拼错/过宽）静默失配——token 为纯字面量可评审，装载数量进 reasons 审计。
退役判据：若 span 轴改结构化输入或 pattern 声明并入 blast 段 schema 升版，本段形态随之退役。

## D-unmapped-169@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-gate-docs-cleanup
原编号：D-001@v1
锚点：未记录
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62
理由：最大风险：注记与未来实现漂移（门档位语义再变时注记过时）——低（注记带变更名可溯源）。放弃方案：无（纯对齐性清理）。

## D-unmapped-247@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-teach-non-src
原编号：D-001@v1
锚点：未记录
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25
理由：风险：已 init 存量项目的 AGENTS.md/命令卡仍是旧形态（同版本不更新机制）——接受，存量项目下次大版本 init 会覆盖；新装项目从本变更起拿到可照抄形态。另一风险：CLAUDE.md 各项目形态各异（本仓是 dogfood 特有完整版），改动不可迁移——本变更只对本仓与包内源负责。试过但放弃：倒推行表格单元格内嵌多行实例（markdown 表格不支持换行，<br> 形态在 markdown 源码里不可照抄）——改用「格式同上」引用式表述。

## D-unmapped-352@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-prestage-consent-gate
原编号：D-001@v1
锚点：未记录
最近确认：fd7047230ffd838b14315d8be221575da00673af
理由：最大风险：误拦摩擦——tasks 改写率阈值 0.6 偏敏感（agent 按真实实现路径改写机器种子是 tasks 契约鼓励的行为），可能频繁触发门，agent 为省事机械带 `--no-prestage` 让门退化为提示。缓解：声明有留痕（prestage_ack 可审计「确认过」vs「没被问过」），且这是自校准回路的第一环——后续可按误拦率调阈值。放弃的方案：① `--input` 自报来源字段（用户原话/agent 拟定）——100% 变更加摩擦、自报可绕（过度自信的 agent 恒报「用户原话」）、与 D-003/D-005「机器只产封闭面形态信号、语义判定归 agent/用户」的既有裁定冲突；② 把前门自检升级为硬门——盘问对象是本次需求（语义面），机器无判据，违背同一条裁定。同意门只消费上次的过程形态信号（封闭面：diff 比例/记录计数），不判本次需求，边界成立。

## D-unmapped-439@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-scoped-verify-policy
原编号：D-001@v1
锚点：未记录
最近确认：fe6d83216f78ad37779a86a2cf576ed3cda5a672
理由：- 风险1：--failed 全绿自清后用户以为无失败——自清即「失败面已清零」的正确语义，汇总区打印复跑指引与清零提示；可接受。 - 风险2：清单陈旧（测试改名/删除）——filterToFailedFace 对缺失项显式 warn，不静默；可接受。 - 死路：考虑过把失败清单嵌 verify-runs 的 test-result.json 复用——放弃：该文件是收口账本产物（每 runId 一份，不覆盖），复用需读最新 runId 引入耦合；独立清单文件一目了然，写入点就在汇总区。
