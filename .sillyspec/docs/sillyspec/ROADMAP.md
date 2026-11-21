# ROADMAP（路线登记——工具工作区）

> **位置裁决**（D-002，2026-11-22 用户裁决）：路线/规划类资产归工具工作区 `.sillyspec/docs/`（与 scan 文档同域），不放项目 docs/——工具工作区是长期项目资产区；闭环三环=拒绝概念走 knowledge 决策通道（机器检索注入）、批次状态随归档回写、立项指引可按行引用。
> **状态回写纪律**：每批变更归档后回写本表「状态」列（一行 Edit）；拒绝概念/否决记录一律走变更内 `decisions add`（收口蒸馏进 knowledge），不写死文档。
> 来源：2026-11-21 mattpocock/skills 四视角调研（生态分发/架构复用/方法论盲维/提示词微设计）。

## mattpocock/skills 吸收路线

总判断：纪律拓扑两家同构（需求拷问→spec→任务图→TDD→审查→交接），差距在我们 prompt 数据源面的文本工程质量——吸收其文本工程纪律，不动机器护栏内核。**全量照搬流程形态已否决**：见 knowledge 决策 D-001（变更 2026-11-22-roadmap-loop-closure，八条不抄理由在决策正文）。

### 批次表

| 批次 | 内容 | 建议变更名（以实际立项为准） | 立项形态 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 批 0 | 方案+调研清单落盘 ROADMAP（本章节前身） | 2026-11-21-mattpocock-absorb-roadmap | 轻量变更 | 无 | ✅ 已归档（交付 cc71c394／归档 0fd5fbac） |
| 批 1 | 一行级吸收包：seam 约定/三层审查优先级/「是」=推荐/DEBUG 前缀+变异自证/回退门+爆炸半径/out-of-scope 沉淀位 | 2026-11-21-prompt-microdesign-pack | 轻量变更 | 无 | ✅ 已归档（交付 23af3e55／归档 436ef561）；out-of-scope 沉淀位后被 D-002 撤销归 knowledge 通道 |
| 批 2 | 诊断环 skill：red-capable 复现命令硬前置五阶段 gated（.claude/skills/sillyspec-diagnose/） | 2026-11-22-diagnose-skill | 轻量变更 | 无 | ✅ 已归档（交付 fc09622b／归档 2eebe7de） |
| 批 3a | 纪律原语盘点（不动码）→ docs/sillyspec/prompt-primitives-survey.md（25 候选/高优 8 条） | 2026-11-22-prompt-primitive-survey | 轻量变更 | 批 1 合入后 | ✅ 已归档（交付 dddf86ff／归档 bf252852） |
| 批 3b | include 参数化：resolvePromptIncludes 增 {{include:name\|focus=x}}；按 survey 施工顺序抽高优 2+5 直抽、后 4/9 参数化——每批跑金档再生+include 计数测试 | 建议名 2026-11 月内定 | 轻量或小完整流程 | 3a（已就绪） | ⬜ 待立项 |
| 批 3c | 指令层/证据层分离：实证引用外移 knowledge，prompt 正文留纯指令（execute.js 1668 行根治） | 待 3b 试点后定名 | 完整流程 | 3b 试点验证 | ⬜ 待立项 |
| 批 4 | knowledge 词汇通道：常读词汇旁路（glossary 类无条件注入）+ ADR 三条件门 | 待定名 | 轻量变更 | 建议 3b 后 | ⬜ 待立项 |
| 批 5① | 上架 Claude 插件市场：.claude-plugin/marketplace.json+plugin.json+版本同步 check | 待用户拍板后定名 | 轻量变更 | 用户决策 | ⬜ 待拍板 |
| 批 5② | init/config 三段式交互（先探测后问/每问带推荐/已定跳过） | 待用户拍板后定名 | 轻量变更 | 用户决策 | ⬜ 待拍板 |

### 搁置区（不立项，攒证据后重评）

| 条目 | 观察方式 | 重评触发条件 |
|---|---|---|
| wayfinder 跨会话决策票图 | 下一个多阶段大工程先手工按「决策图+票」方式管理 | 手工用出频率证明价值，再考虑做成 skill |
| retro 环境轴（会话后审视 steering 文件质量） | 下次 CLAUDE/AGENTS 再膨胀时手工做一次审视 | 一次手工审视验证价值后再固化 |
| SKILL.md frontmatter 最小校验 | 随批 1 顺带评估是否并入（CI 或 flow done 顺带） | 批 1 已归档——未并入，独立小变更候选 |

### 明确不抄清单

见 knowledge 决策 **D-001**（变更 2026-11-22-roadmap-loop-closure）：frontier 整轮齐发、spec 禁写文件路径、双轴并行子代理评审、triage 状态机、Skill-tool 互调机制、GLOSSARY 取代 knowledge、配置落盘 docs/agents、不发 npm/PR 关门/newsletter 漏斗——八条各附与内核冲突点，重复提案检索命中即引用关掉。
