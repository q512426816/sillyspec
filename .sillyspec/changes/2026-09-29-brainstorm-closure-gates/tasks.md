---
author: flow-machine-draft
created_at: 2026-09-28T16:25:52.580Z
---
# 任务注册表（Tasks）— 2026-09-29-brainstorm-closure-gates

> 机器预填草稿已按实际实现路径覆写——验收锚在 requirements（FR-01~FR-08）；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`。

- [x] task-01: 引擎新增 literal-none 纯 kind（dispatchPure + 头注释），manifest 头注释纯 kind 清单同步（FR-07 前置）
- [x] task-02: BRAINSTORM_RULES 声明 4 条纯 kind 规则：proposal.success-criteria（FR-01）＋{design,proposal,requirements,tasks}.no-placeholder（FR-05）＋design.pending-confirm-residue（FR-06），proposal/requirements/tasks 三条带 scale≠small condition
- [x] task-03: BRAINSTORM_RULES 声明 3 条 custom kind 规则（decision-coverage／doubt-closure／risk-mitigation）＋CUSTOM_KINDS 扩三项，data/failMessage 同源
- [x] task-04: validateBrainstormOutputs 实现三个 custom 判定：D 覆盖缺口（复用 extractCurrentDecisionIds＋裸号词边界）／自审存疑未闭合行（自审存疑[:：] 应用形态＋闭合 token）／风险应对空占位行（R-xx 行末列空/占位判定，接受：显式接受豁免）；「requirements 不强求」陈旧注释按新契约改写
- [x] task-05: 新增 test/brainstorm-closure-gates.test.mjs：34 断言全绿（七类缺口触发/豁免/组合面/反误报锚，mock io 纯单元 + runValidators 真文件双层）
- [x] task-06: 存量测试随契约更新：stage-contract-spec「全齐」fixture 补成功标准＋规则计数 11→20；stage-contract「修 B requirements 放宽」断言改为新契约（点名 D 覆盖缺口）——改测试依据：修 B 只放开机器面与 brainstorm prompt 契约分叉，本变更按 prompt 契约收口（事前==事后同源）
- [x] task-07: 本变更测试面全绿（brainstorm-closure-gates/stage-contract-spec/stage-contract/preflight-slimming/validator-rollback/wait-gates 均 EXIT0）；全量套 667/678 过，5 挂全部与本变更无关——3 个确定性挂（doc-ref-check/quick-retired/residual-runner-parity）在干净 HEAD 工作树复现同挂（存量债实证），2 个（tap-judge/verify-postcheck-known-failures）满载并发假红单跑全过
