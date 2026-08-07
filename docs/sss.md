● 爸爸~爸爸~[2026-08-07 08:39:52]：

已通读 docs/prompt/ 全部 12 个阶段 + 注入框架（src/run/prompt.js）+ README，并对 6 处关键提示词做了"承诺 vs 源码"对照核验。下面是逐阶段 + 整体流程的驾驭力分析。
     
---
一、总览结论

整体判断：这套提示词体系的驾驭设计水平很高——文档先行、生成/审查分离、契约对账、真相源机制（review.json verdict 替代 checkbox）、反谎报设计、针对 agent
典型失败模式的精准提示，都不是拍脑袋写的，是踩坑沉淀的。主流程链条（brainstorm→plan→execute→verify→archive）的机械校验是"言出必行"的。

但它有 3 类正在削弱驾驭力的问题，按危害排序：

┌───────────────┬─────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
│   危害等级    │                                            问题                                             │                               后果                               │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🔴 误导 agent │ verify 探针 5/6 把 advisory 说成"CLI 独立复核、谎报无效/FAIL blocker"                       │ verify 是质量门，诚实是基石；agent 信了会放松自律，实际 CLI 不拦 │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤    
│ 🔴 误导 agent │ review-tier 示例"≤5" vs 源码实际 ≤3                                                         │ agent 以为 5 文件内都不独立审查，审查覆盖被低估                  │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🔴 执行即错   │ archive Step2 伪 workflow 命令、doctor Step0 悬空 else/fi                                   │ agent 照跑报错，可能瞎编"已检查"                                 │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🟡 形同虚设   │ execute Step4"为每个 Task 建议模型"                                                         │ agent 无法为子代理选模型，指令落空                               │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🟡 与铁律冲突 │ quick Step1"不带 --change fallback…单会话兼容"                                              │ 诱导多会话不传 --change（命中他者会话）                          │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🟢 文本 bug   │ execute Wave 末尾字面 "、Step11 缺反引号、scan Step8 括号未闭合、archive Step1 四反引号粘连 │ 可读性差，不致命                                                 │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 🟢 token 冗余 │ plan Step4 三 task 模板"格式规则"重复 ~40 行/个                                             │ 真实 10-task 场景单步浪费 ~4KB                                   │
└───────────────┴─────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘

  ---
二、整体流程与注入框架：驾驭力强的部分（保留）

这些是做得对、不要动的设计：

1. 完成契约事前注入（step0）：renderStageContract(stageName) 把"事后机械校验条件"在事前给 agent 看——事前预知 == 事后校验，减少"莫名被拦"。
2. token 分层注入：persona/铁律/契约只在 step0 注入，安全关键的"平台写入规则/路径规则"每步注入，护栏 step0 全文 + 后续步一行精简提醒。每处都有注释解释"为什么这么做"（防 context
   压缩后遗忘安全约束）。
3. 反谎报设计：verify 反复声明"CLI 会真实执行 commands.test，谎报无效"；Runtime Evidence 明确"CLI 只校验字面存在、不替你启动 daemon，是否名副其实取决于你是否实跑"——这种诚实是驾驭力的核心。
4. 针对 agent 失败模式的精准提示："不要自问自答""先写 review.json 再勾 checkbox""不要用 mv 重命名变更目录""不要重复跑全量测试（198s×2）"——每条都对应真实踩坑。
5. 真相源机制：archive 用 summarizeTaskCompletion（review.json verdict）替代 plan.md checkbox 计数，并明确告诉 agent "checkbox 依赖自动回填会失真，以本报告为准"。

  ---
三、逐阶段诊断

主流程（核心，详谈）

brainstorm（8 步）——驾驭力好，但 Step3 过载
- ✅  早期规模筛查（Step2）让小变更走 quick、D-xxx@vN 决策版本化、Grill 分级（P0/P1/P2）+"能查代码就不问用户"。
- 🟡 Step3 单步信息过载：A 原型分析 + B 对话探索 + C 拆分/批量（含半批量场景）+ D Grill（6 条追问策略 + 决策记录格式）塞在一个"对话探索"步骤里。对一个本该轻量交互的步骤，密度过高，agent
  容易抓不住"现在该干什么"。
- 🟡 "不要自问自答"铁律在 Step3/4/5 三处出现，措辞几乎相同（"不要自己说X然后当用户Y"），可统一收敛。

plan（5 步）——驾驭力好，但 Step4 token 冗余严重 + 自检清单与源码不对齐
- ✅  plan_level 三档分级、生成(Step2)与审查(Step3)分离避免确认偏差、provides/expects_from 跨 task 契约。
- 🔴 Step4 协调器 prompt 的"TaskCard 格式规则"大段（~40 行）在每个 task 子代理模板里逐字重复。docs/prompt 展示的是 3-task 示例，但源码 buildCoordinatorStep 对每个 task 都拼一段相同规则。真实 10-task
  plan → 主 agent 单步收到 10 段重复规则（~4KB 纯浪费）。格式规则应只写一次，task-specific 部分（编号/名称/路径）单独列。
- 🔴 "保存前格式自检"清单（plan.md:451）列了 13 个字段，源码 postcheck 实际只硬校验 9 个（author/created_at/priority/blocks 不校验）——agent 白检 4 个；反向更糟：design 文件覆盖、TaskCard
  命令存在性、task id 连续性、title_zh 必填是硬阻断项却不在自检清单 → agent 自检通过仍被 postcheck 拦，体验是"莫名失败"。
- 🟡 related_tests 字段说明（"判据=测试是否失败非文件是否共享"）在 Step3 审查清单 + Step4 三个 task 模板里重复 4 次，同一大段。

execute（12 步）——驾驭力好，但有几处坏文本 + 一条空指令
- ✅  上下文分层（热/温/冷）、中断续跑指引、worktree workdir 强制必传、Task Review Gate（源码核验：完全兑现，甚至更严——有 verifyReviewGitEvidence 防伪 + low_risk 豁免通道）、符号影响面扩展检查。
- 🔴 Step4"为每个 Task 建议模型（架构→最强模型/常规→中等…）"形同虚设：execute 是 CLI 流程，agent 调 Agent tool 时并不能真正按 task 为子代理指定模型。这条指令让 agent
  困惑（它该怎么做？写进哪？），应删或改成"在 tasks.md 标注建议模型档位供人类参考"。
- 🟢 源码模板瑕疵漏进 prompt：Wave prompt 末尾字面 "（buildWavePrompt 模板串尾）、Step3 worktree 段末尾字面 "、Step11 知识库审阅 检查 .sillyspec/knowledge/uncategorized.md\``
  反引号开标记缺失。docs/prompt 都标了"逐字保留勿删"——但这是源码 bug，不该让 agent 看到 prompt 里突兀的 "` 或坏 markdown。
- 🟡 Task Review Gate 全文（~30 行）每个 Wave step 重复注入一次（多 Wave 浪费）；不过这是"每 Wave 独立 step"的结构代价，可接受。

verify（7 步）——护栏设计最出色，但探针 5/6 过度承诺
- ✅  全局护栏（禁止破坏性 git/文件操作，verify 只读）是整套提示词里最正确的安全设计；六探针、Runtime Evidence 诚实声明、risk_level frontmatter 覆盖（源码核验：真实落地)。
- 🔴 探针 5（API parity）/ 探针 6（代码删除）在 prompt 里写成"CLI 独立复核、谎报无效 / FAIL blocker"，源码实际是 advisory（只打 warning 不阻断）。这是最危险的漂移：verify 的价值建立在"CLI
  兜底防谎报"的信任上，agent 一旦发现 parity/deletion 撒谎 CLI 不拦，会泛化怀疑整个 verify 的诚实要求。要么把源码升级为硬阻断，要么把 prompt 改成"advisory，是否 FAIL 由你诚实判定"。
- 🟡 "不要手动重复跑 commands.test"在 Step1/6/7 三处出现，可收敛到 Step6 一处。
- 🟡 Step7 关于 risk_level 的说明（判级不认否定语境 / 豁免级 / 留痕 / 自报告 CLI 不核验）四层语义挤在一段，密度极高——但这是必要的（记忆里 verify-risk-level-override 证明 agent
  真被坑过），保留，仅建议拆成子项。

辅助阶段

quick（3 步）——驾驭力好，Step1 sessionId 说明与铁律冲突
- 🟡 Step1"完成每个 step 必须带 --change…不带时 fallback 读 current-quick-run-id，单会话兼容；多会话不可靠"——这等于告诉 agent"不传也行"。与铁律（规则15/记忆
  sillyspec-quick-change-flag）矛盾，应删掉"单会话兼容"的退路描述，只留"必须带 --change"。

scan（11 步）——驾驭力好，但流程重 + 一处 markdown 坏
- ✅  三档 profile、覆盖保护（source_commit/updated_at）、平台路径合规硬检查（prompt.js 自检 exit 2）、红线（不自动建 projects 配置）。
- 🟡 11 步对 agent 偏重，Step5（7 文档子代理并行）+ Step7（模块映射）+ Step8（卡片）信息量巨大。
- 🟢 Step8"生成方法"段 每个子代理的 prompt（**主 agent 启动前必须拼入**： 括号/冒号未闭合直接进代码块，markdown 结构混乱。

archive（5 步）——真相源机制好，但 Step2 有伪命令 + Step1 收尾粘连
- ✅  TASK_COMPLETION_REPORT（review.json verdict 真相源）、三重交叉验证（声明/任务/git diff，以 git diff 为准）、人工备注保护、requiresWait 确认。
- 🔴 Step2 的 workflow 检查命令 node -e "...用 loadWorkflow 加载 archive-impact，用 runPostCheck 检查..." 是伪命令（-e 里是注释不是可执行代码），agent
  照跑必失败，可能瞎编"检查通过"。应替换为真能跑的一行，或直接删掉（让 agent 信任 module-impact.md 已生成）。
- 🟢 Step1 prompt 末尾 `完成度报告（…列表）```` 四反引号与文字粘连，markdown 收尾不规范。

status（3 步）/ explore（1 步）——简洁清晰，无问题
- explore 的铁律（不写实现/不装依赖/不强行推进）很到位。

doctor（5 步）——诊断逻辑全，但 Step0 bash 坏 + 跨平台兼容差
- 🔴 Step0 第 6 段（worktree 检查）末尾悬空 else ... fi：gate-status.json 的 if 开头缺失，只有 else 和 fi，是坏的 bash，agent 照跑报错。
- 🟡 整段依赖外部 sqlite3 CLI（Windows 默认没有）、grep -oP、sed、for f in——虽加了 fallback 说明，但脚本本身 Unix-centric，与规则 13（兼容 Win/Linux/macOS）冲突。建议 doctor 的检查项尽量改调
  sillyspec 自身命令（progress show/doctor --json），少依赖裸 sqlite3/grep -oP。

变体 / 废弃

brainstorm-auto（4 步）——AC-001~010 自动决策 checklist 设计亮眼
- ✅  让简单变更 AUTO_DECIDED 不打扰用户、artifact-first。
- 🟡 Step3 产物要求 5 个文件（gaps.md/assumptions.md 等）但只给一句话格式要求，agent 写出来质量参差。

propose（7 步，已废弃）——建议清死代码
- 入口已移除，但 stage-review.js 仍残留 propose 的 reviewType/proposal.md 逻辑 + STAGE_MAIN_DOC.propose。死代码增加认知负担，建议择机清。

  ---
四、系统性问题（带优先级）

🔴 P0：会误导 agent 产生错误行为（建议优先修）

1. verify 探针 5/6 把 advisory 描述成硬门控（verify-probes.md:47,54,65 + verify.md:295）
2. review-tier 示例"≤5" vs 源码 ≤3（README.md:146 + plan.md:293 + execute.md:354）
3. archive Step2 伪 workflow 命令（archive.md:87，源 src/stages/archive.js）
4. doctor Step0 第 6 段悬空 else/fi（源 src/stages/doctor.js）

🟡 P1：指令落空 / 与铁律冲突 / 自检清单不对齐

5. execute Step4"为每个 Task 建议模型"空指令
6. quick Step1"不带 --change 单会话兼容"与铁律冲突
7. plan"保存前格式自检"13 字段 vs 实际 9（+ 漏列 design 覆盖/命令存在性/id 连续性/title_zh 硬阻断）—— agent 自检通过仍被拦

🟢 P2：prompt 文本/格式 bug + token 冗余

8. execute Wave 末尾字面 " ×2、Step11 缺反引号、scan Step8 括号未闭合、archive Step1 四反引号粘连（均为源码模板瑕疵）
9. plan Step4 格式规则 per-task 重复（token 浪费）
10. propose 死代码残留

  ---
五、如何更好驾驭：改进原则

1. "言出必行"是底线：凡是 prompt 里说"CLI 会校验/阻断/复核"的，源码必须真做；做不到就降级措辞为"advisory，由你诚实判定"。verify 探针 5/6 是反例，execute Task Review Gate / verify
   风险门控是正例。建议建立一条 lint：扫 prompt 里的"硬校验/阻断/谎报无效"措辞，反向核对源码是否真硬阻断。
2. 自检清单 == postcheck 校验项：plan 的"保存前格式自检"应与 validatePlanFeasibility 等同源生成（像 renderStageContract 那样机械提取），避免"自检通过仍被拦"或"白检"。
3. 共享规则只写一次：plan Step4 的 TaskCard 格式规则、related_tests 说明应抽成 {{include: taskcard-rules}}（已有 verify-probes 先例），per-task 只注入编号/名称/路径。
4. 删空指令：execute"建议模型"这类 agent 执行不了的指令，要么改成 agent 能做的（标注档位），要么删——空指令消耗注意力还制造困惑。
5. prompt 文本本身要"干净"：模板字符串末尾别留多余 "、markdown 别留半开反引号——agent 看到 prompt 里突兀的符号会分心。建议给源码 prompt 加一个提取期 lint（扫孤立 "、未闭合 ``` 、悬空 else/fi）。
6. 跨平台：doctor 这类诊断步骤优先调 sillyspec 自身命令，少依赖 sqlite3/grep -oP/sed。

  ---
是否需要同步文档 / 下一步

- 本次是只读分析，未改任何文件，未跑测试（无代码改动）。
- 风险/遗留：上述 P0 四项是当前最可能让 agent 产生错误行为的提示词缺陷，其中 verify 探针过度承诺危害最大。
- 建议下一步（如要我落地修复，这是新 session 提示词）：

▎ 走 sillyspec run quick 修一批 docs/prompt 提示词与源码模板的一致性缺陷。范围：(1) verify 探针 5/6 advisory 措辞降级（改 templates/prompts/verify-probes.md + verify.md）；(2) review-tier 示例
▎ ≤5→≤3（改 README.md/plan.md/execute.md，源 review-tier.js 不动）；(3) archive Step2 伪 workflow 命令替换为可执行命令或删除；(4) doctor Step0 悬空 else/fi 修复 + sqlite3/grep -oP 改 sillyspec
▎ 命令；(5) execute Step4"建议模型"空指令删除/改写；(6) quick Step1 删"单会话兼容"退路；(7) execute/scan/archive prompt 文本符号瑕疵。触及 src/stages/*.js + templates/prompts/，按 CLAUDE.md 规则 19
▎ 改完重跑 node docs/prompt/_extract.mjs 同步 docs/prompt/*.md。P0 先做，P1/P2 分批。

本次工具驾驭小结：用了一个后台 general-purpose subagent 并行做"提示词承诺 vs 源码实现"的 6 条对照核验，效果好——它独立挖出了我光读 prompt 发现不了的 3 个关键漂移（review-tier ≤5、plan-postcheck
字段数、verify 探针 advisory 性质），且都带了文件:行号证据。这正说明"光读 prompt md 不够，必须回源码验证承诺是否兑现"——这本身也是这份分析的方法论结论。