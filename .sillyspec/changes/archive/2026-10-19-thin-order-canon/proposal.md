---
author: flow-machine-draft
created_at: 2026-10-19T06:00:38.189Z
---
# 提案书（Proposal）— 2026-10-19-thin-order-canon

## 动机

任务原话转写：轻量道顺序正典与文案面统一
动机：dogfood 实证（agent artifact 时间戳还原 + 跨仓 14 例抽样）：轻量道 agent 普遍先动码、收口时批量补文档与批准——git 时间戳系统性说谎（批准恰在单提交前 12 秒），批准沦为收口仪式。根因是教导面自相矛盾：flow start 横幅【你要做的】说「直接干活：改代码、写测试」、另一行说「design 四节动码前后顺手作答」、命令卡与 flow skill 全程无 approve 环节、status 相位推断不看 spec_approved、approve/done 输出把批准叙述成收口动作。本变更统一为正典顺序：flow start 后先答 spec 面（requirements FR 行为句+测试绑定、design 四节）→ 方案摘要给用户并 flow approve（或用户显式 --autopilot）→ 才动码（写测试、改代码）→ 边干边勾 → flow done；读代码探究不算动码。四路子代理调查已产出 79 项教导面清单与高杠杆面排序，本变更按清单落地。

成功标准：
- 正典顺序句在 flow start 横幅（【你要做的】与三断点纪律）、adopt 收编横幅、flow done 未批准拦截、flow approve 输出面一致落位；全仓「动码前后顺手作答」「写码前后顺手填」「干活时作答」类许可后补的措辞清零
- assets/command-cards/flow.md 与 .claude/skills/sillyspec-flow/SKILL.md 的生命周期改为「flow start → 补 spec 面 → 批准 → 干活 → flow done」，含 approve 环节
- flow status：未批准且非 autopilot 时相位停在「① spec（→ 待用户批准）」并给提示，--json 增 specApproved 字段
- templates/agents-instruction.md 选道行与规则 3 补轻量道顺序句，本仓 AGENTS.md/CLAUDE.md 同步，package.json 版本号提升使消费仓重跑 init 可取新资产
- 既有测试锚（flow-checkpoints/flow-redline-frontload/flow-clarity-probe/governance-autopilot/tdd-scope-guidance 等）同步更新，全量测试绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 正典顺序句在 flow start 横幅（【你要做的】与三断点纪律）、adopt 收编横幅、flow done 未批准拦截、flow approve 输出面一致落位；全仓「动码前后顺手作答」「写码前后顺手填」「干活时作答」类许可后补的措辞清零
2. assets/command-cards/flow.md 与 .claude/skills/sillyspec-flow/SKILL.md 的生命周期改为「flow start → 补 spec 面 → 批准 → 干活 → flow done」，含 approve 环节
3. flow status：未批准且非 autopilot 时相位停在「① spec（→ 待用户批准）」并给提示，--json 增 specApproved 字段
4. templates/agents-instruction.md 选道行与规则 3 补轻量道顺序句，本仓 AGENTS.md/CLAUDE.md 同步，package.json 版本号提升使消费仓重跑 init 可取新资产
5. 既有测试锚（flow-checkpoints/flow-redline-frontload/flow-clarity-probe/governance-autopilot/tdd-scope-guidance 等）同步更新，全量测试绿

## 成功标准（可验证）

1. 正典顺序句在 flow start 横幅（【你要做的】与三断点纪律）、adopt 收编横幅、flow done 未批准拦截、flow approve 输出面一致落位；全仓「动码前后顺手作答」「写码前后顺手填」「干活时作答」类许可后补的措辞清零
2. assets/command-cards/flow.md 与 .claude/skills/sillyspec-flow/SKILL.md 的生命周期改为「flow start → 补 spec 面 → 批准 → 干活 → flow done」，含 approve 环节
3. flow status：未批准且非 autopilot 时相位停在「① spec（→ 待用户批准）」并给提示，--json 增 specApproved 字段
4. templates/agents-instruction.md 选道行与规则 3 补轻量道顺序句，本仓 AGENTS.md/CLAUDE.md 同步，package.json 版本号提升使消费仓重跑 init 可取新资产
5. 既有测试锚（flow-checkpoints/flow-redline-frontload/flow-clarity-probe/governance-autopilot/tdd-scope-guidance 等）同步更新，全量测试绿
