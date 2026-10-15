---
author: flow-machine-draft
created_at: 2026-10-15T09:21:13.488Z
---
# 决策记录（Decisions）— 2026-10-15-brainstorm-interaction-refine

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- **最大风险：prompt 指令的遵循度不可机械验证**。本变更落的是"要求 agent 怎么做"，不是"CLI 拦不拦"。若 agent 不照做，测试仍会绿（测的是 prompt 产物面）。缓解：①措辞与既有铁律同风格（短、可判定、放决策点附近），避免被长文稀释；②七条要求里五条与已有机械面挂钩（决策落盘 API、review.json 的 reviewerNotes 会被 gate 读、Stage Review Gate 的阶段清单）——不照做会在后续门禁或评审中暴露。 - **次风险：与既有"一次只问一个"规则的表观冲突**。FR-03 允许 P1/P2 攒一轮问完，必须在 prompt 里显式写清分层（P0 逐轮、P1/P2 收尾一轮），否则 agent 会按错误的一侧执行。这是实现阶段要逐字核对的第一处。 - **第三风险：体积膨胀**。brainstorm 已经是仓内最长的阶段定义，加文本会推高每轮 token（该文件 567 行附近有"每轮全量回放是 token 膨胀主源"的历史教训）。缓解：四处新增合计控制在 60 行以内，且**不复制**四件套模板（仍由 CLI 落盘）。 - **既有测试回归面**：`test/brainstorm-exit-thin-default.test.mjs`、`test/brainstorm-plan-contract.test.mjs`、`test/prompt-placeholders.test.mjs` 可能对 brainstorm prompt 做字面断言。实现前先读这三支测试，确认新增文本不撞既有断言；若撞的是"整段等值"型断言则属测试面过紧、需按项目规范评估（不修改测试语义的前提下调整）。 - **放弃的方案**： - *用 review.json 新字段承载 builder 问题清单*：需要改 `validateStageReviewSchema` 与 gate 消费面，成本与风险均高于收益；reviewerNotes 是自由文本且已被 gate 读取，够用。 - *新增阶段级"逃逸口对照表"文件或独立步骤*：违反"不新增步骤"的变更边界，且对照表只服务一处步骤，阶段级文件会变成无人维护的死文档。 - *把分块回放做成 CLI 强制的输出模板（机械校验每轮必须含回放块）*：需要给步骤加输出结构校验，属状态机改动；且回放的"块"边界是语义判断，机械校验只会逼出占位式回放（合规但不解决问题）。 - **收口时已存在的无关失败（须如实声明，不属本变更回归）**：`test/doc-ref-check.test.mjs` 5 处失效锚（`docs/sillyspec/platform-interface-map.md:L137/139/140/142/200` 引用 `index.js:4563/4484/4436/4222/4320`）在本次改动前即存在——HEAD 版本 `src/index.js` 中 `triggerPull` 实际出现在 2932/2933/3166 等行，与文档锚定的行号窗口早已漂移；本变更未触及 `src/index.js`、`docs/sillyspec/platform-interface-map.md` 或任何锚目标。实测证据：单独运行该测试 5 处失效项均不含 `brainstorm`/`interaction-refine` 字样。 - **收口处置（清偿而非豁免）**：该失败被收口实测门计入本变更批面（89 文件并集含它）导致整单 FAIL，并触发自动升厚（tier=thick）。已按测试自带修复指引（"行号漂移 → 更新文档行号到当前源码"）同步 5 处锚 + 2 处同批次级锚（`shared.js:1120→1118`、`probe.js:133→137`），doc-ref-check 93/93 通过；根因如实记入本条并随修复同批提交，避免留成无人认领的红灯。
