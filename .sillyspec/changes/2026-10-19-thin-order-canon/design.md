---
author: flow-machine-draft
created_at: 2026-10-19T06:00:38.189Z
---
# 设计记录（Design Record）— 2026-10-19-thin-order-canon

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

把轻量道的执行顺序统一成一句正典并落到 agent 实际跟从的每个教导面：正典为「flow start → 先答 spec 面（requirements FR 行为句+测试绑定、design 四节）→ 断点① 方案摘要给用户并 flow approve（或用户显式 --autopilot）→ 才动码（写测试、改代码）→ 边干边勾 → flow done；读代码探究不算动码」。落点分三类：①CLI 输出面（flow start 横幅【你要做的】与三断点纪律、adopt 收编横幅、flow done 未批准拦截、flow approve 输出、恢复简报、flow status 相位）——重写为顺序句并清零「顺手/前后作答」措辞；②资产与指引面（assets/command-cards/flow.md、.claude/skills/sillyspec-flow/SKILL.md、templates/agents-instruction.md、本仓 AGENTS.md/CLAUDE.md）——生命周期统一含批准环节；③小逻辑（flow status 相位推断读 spec_approved、--json 增 specApproved 字段）。

选文案优先而非机器证据门，依据是四路子代理调查的实证：agent 跟从现场指令（【你要做的】是横幅内唯一行动句），而 git 时间戳在批量收口模式下系统性说谎（批准恰在单提交前 12 秒、12/12"合规"假象），commit 级时序门恒放行；CLI 记录面又采集不到「首个 src 编辑」事件。故本变更只教对顺序 + 把 status 的相位显示改对（它当前不看批准，会诱导"先执行后卡点"）；机器硬门（approve 校验、tick 提醒）留给下一变更。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CLI 子命令签名零变化；flow start / flow status / flow done / flow approve 的 stdout 文案变化（新顺序句、批准状态行、status 相位文案）。
- flow status --json 增量新增 specApproved（boolean）与 specApprovedChannel（string|null）两键，不移除既有键——对平台侧 reparse/展示为向后兼容的加字段。
- 资产文件内容变化：assets/command-cards/flow.md、.claude/skills/sillyspec-flow/SKILL.md、templates/agents-instruction.md；消费仓经重跑 init（版本提升后）覆盖更新。
- package.json version 3.33.1 → 3.34.0；本仓 AGENTS.md/CLAUDE.md 手动同步对应行（init 完整态不自动刷新）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。本变更不引入时序判定——文案只声明顺序义务，不做顺序校验；用户先说「做」后跑 approve、agent 先读代码再答 spec 面均不破坏任何门（done 侧既有空槽/未批准拦截逻辑不变）。adopt 收编变更 design 四节豁免（以 brainstorm design 为准）在正典句中以括注保留，不会因收编路径误教。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

文案文件是仓级共享只读资产，运行时无写面；flow-state.yaml 仍由 CLI 原子写（writeFlowState），本变更不改写路径。多会话并行时他变更读到的横幅/SKILL/命令卡为同一静态版本，无串台。编辑遵守仓规（Edit 前重读最新态）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。本变更是静态文案 + status 只读推断，无状态迁移；中断恢复走既有恢复简报（本变更为其补批准状态行，属显示增强）；批准留痕（spec_approved_at）与 autopilot 豁免语义不变。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。变更面全部在本仓；消费仓资产更新依赖其重跑 init 且版本高于其已装版本（AGENTS.md 头注释「同版本不更新」），版本号提升即解锁传播。dogfood 仓现存旧版命令卡（v3.32.0）与新资产 sha 不符，重跑 init 时注入器按 sha 差异自动覆盖。不触碰 .runtime 机本位数据。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是测试锚连锁：5+ 个既有测试文件断言旧文案（flow-clarity-probe 以「【你要做的】」为切点、flow-redline-frontload 断言块相对位置、governance-autopilot 断言 /spec 断点未批准/、tdd-scope-guidance 断言命令卡「按层适用」），措辞改动漏同步即红。对策：先改锚测试跑出红清单再改源码（测试先行），且命令卡保留「按层适用」测试相关短语。

- 放弃方案①：断点① 整块前移到【你要做的】之后——放弃理由：flow-redline-frontload 等锚断言横幅块相对顺序，整块移动破坏多个锚且语义收益与「在【你要做的】内联顺序句 + 三断点标题改顺序纪律」相同。
- 放弃方案②：flow done 加 approve vs 首个 src 提交的时序证据门——放弃理由：实证（artifact 还原 + 14 例抽样）批量收口模式下 git 时间戳系统性说谎，检查恒放行且会被 rebase/amend 进一步稀释；CLI 记录面无 src 编辑事件。
- 放弃方案③：harness 层 PreToolUse 埋点记录首个 src 编辑——放弃理由：超出 CLI 记录面的新工程（虽有 claude-pre-tool-use.cjs 先例），成本与归属需独立决策，不捆进文案变更。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | 横幅五面文案 + 恢复简报批准状态行 + status 相位推断与 --json 字段 |
| 修改 | assets/command-cards/flow.md | 生命周期改为 spec→批准→干活→flow done |
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | description 与②节拆分，补 approve 环节 |
| 修改 | templates/agents-instruction.md | 选道行 + 规则 3 轻量道顺序句 |
| 修改 | AGENTS.md / CLAUDE.md | 本仓两指令文件同步（init 完整态不自动刷新） |
| 修改 | package.json | version 3.33.1 → 3.34.0 |
| 新增 | test/flow-order-canon.test.mjs | FR-01~04 断言（五面正典句/生命周期/status 相位/同步与版本） |
| 修改 | test/flow-checkpoints.test.mjs 等锚文件 | 同步新文案断言 |
