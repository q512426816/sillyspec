# R4 代码质量与项目资产对比（2026-09-21）

## 一、小任务（autocompact）：一个决定性的质量分野

两侧 daemon 白名单实现**工艺等价**（同构值守护：window 正整数 + 开关布尔、坏键不拖累同批、非法静默跳过；注释都引了各自的设计决策号）。分歧在**域事实**：

| | sillyspec（R4-S-Q） | OpenSpec（R4-O-S） |
|---|---|---|
| 第三键名 | `precomputeCompactionEnabled` | `autoCompactPreCompute` |
| 依据 | 5 次联网核验官方文档（settings reference + /config） | 凭先验，零核验 |
| 交叉验证 | 与第 3 轮主仓独立实现（c1ce37e9e，同样经文档核验）一致 | 与两轮独立核验**都不一致** |

**OpenSpec 侧是错键：第三个开关（预计算）在生产是 no-op。** 其 27/27 测试全绿（断言的是自己写的错键）、干净归档——单测验证的是实现自洽，不能发现域事实错误；无任何门禁对外部真值复核。sillyspec 多花的 2.5 分钟联网核验，就是这道防线。

前端行为差异（都合理）：sillyspec 坏值静默不进提交体；OpenSpec 即时校验 + alert 拦提交。

## 二、大任务（session-replay）：范围对齐、测试体量 2.4×

- 范围：两侧都交付解析器矩阵（claude-code / cursor-agent / zcode model-io / zcode-sqlite）+ AgentReplayBody 回放主体，提案成功标准覆盖对齐。
- 测试：sillyspec 2,909 行 vs OpenSpec 1,193 行（回放主体 806 vs 380 行测试）。
- 行数差（18,126 vs 3,999）主要来自生成物（api-types/gen）与文档，**不作为质量依据**。

## 三、项目资产盘点（大任务终态实录）

**sillyspec**（归档提交触达）：
- 变更归档 15 件（四件套 + plan/tasks + decisions + module/symbol-impact + verify-facts/result + scope-audit + 原型）
- **决策提炼 4 条**入 `knowledge/decisions/unmapped.md`（+36 行）
- **FR 索引 7 条**入 `knowledge/fr/host-fs-handler.md`（+73 行）+ INDEX
- **ROADMAP 里程碑** + 模块文档增量（daemon.md / platform_sync.md）

**OpenSpec**：
- 归档变更夹 + **活规格库 3 个 capability**（agent-log-messages-schema / parsers / session-replay，215 行 WHEN/SHALL 契约）

两种资产形态不同但都是真可检索资产：sillyspec 是「决策 + FR + 路线图」（按域索引的特性真相），OpenSpec 是「活规格」（按能力组织的行为契约，后续变更以 delta 修改）。

**资产的正确性风险不对称**：OpenSpec 小任务的活规格把**错键写进了 5 条 requirement**——错误被典藏为权威事实，后续变更信任并传播它。sillyspec 的 FR 来自文档核验后的 requirements。

## 四、结论

1. 工艺层面（代码风格/守护逻辑/测试写法）两侧**无可观差距**——LLM 同源，写代码不是分歧点。
2. 分歧点在**认识论**：域事实要不要对外部真值核验。本轮唯一一个硬缺陷（错键 no-op）恰好出在无核验侧，且被其全绿测试和干净归档完美掩盖。
3. sillyspec 的结构价值在这轮得到具体化：联网核验习惯（agent 行为，部分归功流程提示词的「实证」文化）+ 门禁对外部口径的复核对这类缺陷是防线；OpenSpec 的「赋能不门禁」在域事实类错误上无防线。
4. 局限：错键是 n=1 的硬案例；「sillyspec 的流程必然导致核验」不成立（R4-O-S 侧的核验缺失是 agent 行为方差，第 3 轮 OpenSpec 跑也可能核验）。可防御的表述是：**门禁+实证文化提供的是概率性防线，OpenSpec 连概率都不提供**。

## 五、补遗（2026-09-21）：R4-L 审查链实际拦下的东西（非随机实例）

- **Design Grill 首轮 REJECT（阻断项 B1）**：初版设计把 cursor-agent-store 读取器注册进 registry——审查员独立核了源码事实（registry 契约为 content 字符串，registry.ts:53-56；zcode SQLite 恰是绕过 registry 的 handler 专用分支先例），判定设计自相矛盾，强制改为专用分发分支 + `~/.cursor/chats/` 目录门（design.md:49-50 落地）。**这是代码写出来之前拦下的集成级缺陷**——不拦的话 cursor-agent 解析链路接错调度面，集成期才爆，返工一轮。
- G1（三态枚举补 409，对照 router.py 真实行为）、G2（命名口径统一）两条非阻断同轮闭合。
- **QA 终审独立复跑全部测试**（daemon 165/165 + backend 247 + frontend 46/46，6 个请求内完成）并做了四跳字段契约核对（daemon→RPC→backend→api-types→前端逐层比对）。
- 对照组：OpenSpec 全流程无任何独立审查环节，B1 类设计-源码矛盾无人核。

## 六、质量差距的诚实总结（回应「是不是就一个小概率事件」）

四条防线、每条都有本周实证，全部属于「没有该机制就必然带病落盘」类别：

| 防线 | 机制 | 本周实例 | OpenSpec 对应物 |
|---|---|---|---|
| 域事实核验 | 实证文化+流程提示词 | 错键（R4-O-S 生产 no-op） | **无**（n=1 但防线是结构性的：流程里没有任何核验步骤） |
| 设计-源码一致性 | 独立 Design Grill | B1（R4-L，改设计于写码前） | 无 |
| 声明-现实对账 | 测试门禁 | 主仓 2 个月 12 次真拦（gate-value-audit） | 无（pre-commit 只查格式） |
| 资产正典正确性 | 文档同步义务+FR 实证来源 | 规格库典藏错键（对照侧） vs sillyspec FR 经核验 | 无 |

同时如实记录防线的漏检面：sillyspec 自己的缺陷 A/B（export 缺失/管道断）25 个单测+S2 审查都没拦住，是靠 R4 实测暴露的——**仪式是概率盾，本样本内拦 3 漏 2**。
