---
author: flow-machine-draft
created_at: 2026-10-19T07:36:15.673Z
---
# 决策记录（Decisions）— 2026-10-19-thin-order-canon

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险是测试锚连锁：5+ 个既有测试文件断言旧文案（flow-clarity-probe 以「【你要做的】」为切点、flow-redline-frontload 断言块相对位置、governance-autopilot 断言 /spec 断点未批准/、tdd-scope-guidance 断言命令卡「按层适用」），措辞改动漏同步即红。对策：先改锚测试跑出红清单再改源码（测试先行），且命令卡保留「按层适用」测试相关短语。 - 放弃方案①：断点① 整块前移到【你要做的】之后——放弃理由：flow-redline-frontload 等锚断言横幅块相对顺序，整块移动破坏多个锚且语义收益与「在【你要做的】内联顺序句 + 三断点标题改顺序纪律」相同。 - 放弃方案②：flow done 加 approve vs 首个 src 提交的时序证据门——放弃理由：实证（artifact 还原 + 14 例抽样）批量收口模式下 git 时间戳系统性说谎，检查恒放行且会被 rebase/amend 进一步稀释；CLI 记录面无 src 编辑事件。 - 放弃方案③：harness 层 PreToolUse 埋点记录首个 src 编辑——放弃理由：超出 CLI 记录面的新工程（虽有 claude-pre-tool-use.cjs 先例），成本与归属需独立决策，不捆进文案变更。
