---
author: flow-machine-draft
created_at: 2026-10-10T01:32:29.576Z
---
# 设计记录（Design Record）— 2026-10-10-init-full-injection

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户决策（2026-10-10）：init 注入 agent 指引时不分状态一律写完整模板（templates/agents-instruction.md 全文），INJECTION_CONTENT 小段方案删除——原追加态只给 6 行小段（读 scan 文档/grep 验方法/progress show），agent 拿不到选道表与核心规则，注入形同虚设，且小段内容陈旧。实现上把 injectAgentsInstructions 的三态四分支状态机泛化为 injectFullInstructions(filePath)（按文件路径注入，AGENTS.md / GEMINI.md / INSTRUCTIONS.md 共用）：追加态受管块内容从 INJECTION_CONTENT 换为完整模板全文（用户原文字节保留在 START/END 块外）；injectInstructions（gemini/opencode）从小段追加改为调同一注入器，幂等标记从 `## SillySpec` 文本升级为 `<!-- SillySpec v` 版本标记（完整模板不含旧标题，用标题判幂等会重复追加）。旧 `## SillySpec` 小段（v≤3.32.3 安装产物）文本仅保留在迁移函数内作精确匹配（标题截除回退不变）。版本 bump 3.32.3→3.32.4：已装仓重跑 init 经版本差触发受管段升级为完整内容。

文件变更清单（本变更自声明交付面）：

- 实现：src/init.js（injectFullInstructions 全量注入器 + stripLegacySmallBlock 旧段迁移，删除 INJECTION_CONTENT 常量与小段方案）
- 版本：package.json（3.32.3→3.32.4，升级链版本差触发传播）
- 测试：test/init-agents-injection.test.mjs（追加态/升级态全量断言改写 + 新增 Case 12-14 gemini/opencode 全量注入用例）
- 文档：docs/sillyspec/file-lifecycle.md（AGENTS.md 追加态与 GEMINI.md/INSTRUCTIONS.md 注入行为描述同步）
- 流程工件：.sillyspec/changes/2026-10-10-init-full-injection/ 全部

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `INJECTION_CONTENT` 常量：删除（旧文本以 `LEGACY_SMALL_BLOCK` 名义内联于迁移函数，不再作任何注入源）。
- `injectAgentsInstructions(projectDir)`：签名不变；行为变化=追加态受管块为完整模板全文。
- `injectInstructions(tool, projectDir)`：签名不变；行为变化=GEMINI.md / INSTRUCTIONS.md 同样注入完整模板 + 版本标记幂等（原为无版本标记小段追加）。改为 export 供测试直测。
- 新增内部函数 `injectFullInstructions(filePath)`（不导出）与 `readInstructionTemplate()`（模板读取，缺失时 stderr 报错返回 null，不写半截文件）。
- `injectClaudePointer`（CLAUDE.md @AGENTS.md 指针）：无变化。
- CLI 命令面：无新增/删减命令。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。init 重入由标记状态机保证幂等：无标记→追加（含旧段先截除）、同版本→跳过不写、异版本→START/END 正则整块替换；升级后再次重跑命中同版本跳过，不叠加。状态判定只依赖文件当前内容，与到达顺序无关。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   与现状同风险面——writeFileSync 非原子，两个 init 并发写同一指引文件理论上可交错；本变更不改变单写点结构，不新增并发路径（不引入锁，与原方案一致）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。strip 旧段与追加新块间的崩溃窗口现状已存在（下次 init 无标记→追加补齐）；模板读取失败 fail-fast（stderr + return）；writeFileSync 单次调用，文件要么旧态要么新态，无中间格式。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。注入按传入 projectDir 定位文件，模板从包内 templates/ 读取；GEMINI.md/INSTRUCTIONS.md 与 AGENTS.md 各自独立文件互不影响。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：追加态受管块从 6 行变为全文（~45 行），升级整块替换时用户在块内编辑的改动会丢——标记已注明「勿手动编辑此段」，与原方案 R-04 同性质，只是受管面变大；块外用户内容仍字节保留。放弃方案：①继续小段追加（用户否决——agent 拿不到流程规则，注入形同虚设）；②gemini/opencode 改 @AGENTS.md 指针（两家对 @ 导入语法支持未验证，2026-08-02 变更已留注，不在本变更扩面）。
