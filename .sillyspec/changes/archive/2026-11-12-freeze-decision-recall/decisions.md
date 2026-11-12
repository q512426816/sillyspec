---
author: t
created_at: 2026-11-12 16:56:25
---

# 决策记录

## D-001@v1 用复潮条件而非新增类型区分「必须召回的能力冻结/否决」与「不需召回的范围取舍」
- 状态：confirmed
- 类型：architecture
- 模块域：core-engine
- 问题：用哪个判据区分「该召回的能力冻结/否决」与「不该召回的范围取舍」？
- 答案：采用「是否写了复潮条件」：type=scope 且写了复潮条件 → 必须入库；未写复潮条件的 scope 决策 = 纯范围取舍，保持排除。依据：本仓 3 条 scope 决策恰好被该判据分开——friction-signal-hint（纯范围，无复潮条件）、D-001@v1（能力冻结，有复潮条件）、decision-caliber-unify（实为否决，有否决理由+复潮条件）。语义上复潮条件是决策者主动写下的「未来重启条件」，丢弃它等于丢弃召回信号。

## D-002@v1 新增 freeze 类型作为能力冻结的显式通道
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：用哪个判据区分「该召回的能力冻结/否决」与「不该召回的范围取舍」？
- 否决理由：类型需在决策记录时人工标注，而写决策的 agent 未必知道这是能力冻结；且存量 D-001@v1 已标 scope 不会自动变，第三条实为否决而非冻结需另处理——新类型治不了存量。
- 复潮条件：复潮条件判据在实跑中误召回率过高（如 agent 无脑给所有 scope 补复潮条件导致噪音回流），且该噪音无法靠 score 过滤收敛时，再考虑引入显式类型分流。

## D-003@v1 新增 freeze 类型与复潮条件判据并行
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：用哪个判据区分「该召回的能力冻结/否决」与「不该召回的范围取舍」？
- 否决理由：功能最全但改动面最大：类型白名单（decision-values）、写入校验（decisions-io）、提示清单（prompt 模板与 docs/prompt 提取链）、蒸馏、注入共四处以上，且两条判据并存会让「哪条优先」成为新的歧义源。
- 复潮条件：出现「复潮条件表述模糊但类型明确为冻结」的实例，且该实例因复潮条件缺失而被漏召回时，可把 freeze 类型作为复潮条件的补充通道重启评估。

## D-004@v1 复潮条件作为独立入选通道：不论 type，写了复潮条件且 status 未失效即入库
- 状态：confirmed
- 类型：architecture
- 模块域：core-engine
- 问题：选哪个实现方案？（判据已定为复潮条件）
- 答案：在 dispositionOf 增加第二判据：entry.revisitWhen && (status 为空或 ∈{confirmed,accepted,implemented}) → 有否决理由走 rejected 通道、否则走 implemented 通道。渲染侧为 implemented 条目补「复潮条件：」行（解析侧 knowledge-match.js:175 已支持该字段）。注入面两处（flow.js:357、run/prompt.js:1437）过滤条件加 || h.revisitWhen。

## D-005@v1 scope 专属例外：只在 dispositionOf 为 scope 开特例分支
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：选哪个实现方案？（判据已定为复潮条件）
- 否决理由：补丁式改动——把复潮条件当作 scope 的附属特例，而非独立的召回信号；其他类型（如 boundary/definition）带复潮条件时仍被静默丢弃，根因会换壳重演。
- 复潮条件：实测确认带复潮条件的决策 100% 都发生在 scope 类型上（其他类型从不写复潮条件）时，scope 特例即可等价于通道路由，可简化实现。

## D-006@v1 绕开蒸馏：flow start 直扫 archive/*/decisions.md 提取复潮条件条目
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：选哪个实现方案？（判据已定为复潮条件）
- 否决理由：每次 flow start O(N) 扫全部归档；绕过既有幂等蒸馏管线形成第二真相源；knowledge search 与图谱仍查不到这些决策，检索面割裂。
- 复潮条件：蒸馏管线本身被证实不可靠（如入库条目长期与归档漂移且无法收敛）时，直扫归档可作为降级通道重启评估。

## D-007@v1 新增 knowledge distill-backfill 子命令：对 archive/* 幂等重跑蒸馏并回填存量
- 状态：confirmed
- 类型：architecture
- 模块域：core-engine
- 问题：存量 3 条 scope 决策怎么回填？
- 答案：新增 sillyspec knowledge distill-backfill [--dry-run]：遍历 changes/archive/*/ 逐个调 distillIntoKnowledge（幂等键为 号+变更，重跑零漂移），dry-run 先行输出将写入条目清单。改规则只对今后归档生效，不回填则本次事情的 D-001@v1 仍缺席。该机制留存供今后 distill 规则再变时复用。

## D-008@v1 只修规则不回头填：未来新决策正常入库，存量 3 条继续缺席
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：存量 3 条 scope 决策怎么回填？
- 否决理由：修了管道但漏水的桶还是空的——本次事件的 D-001@v1「冻结 L3」仍不可召回，下次同样的错误建议会再次发生，变更的核心价值不成立。
- 复潮条件：若确认存量回填的成本高于收益（如归档变更规模达数千、单次全量重跑不可接受），可改为只修规则并逐条按需手工摘录。

## D-009@v1 一次性 node 脚本回填，不新增 CLI 子命令
- 状态：rejected
- 类型：architecture
- 模块域：core-engine
- 问题：存量 3 条 scope 决策怎么回填？
- 否决理由：不可复用、不可审计——distill 规则今后再变时还得再写一次；一次性脚本不进入产品路径，回填动作无留痕。
- 复潮条件：若 distill 规则此后长期不再变更（仅此一次调整），一次性脚本的复用价值归零，可简化为脚本。
