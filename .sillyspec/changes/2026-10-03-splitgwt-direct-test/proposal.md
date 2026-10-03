---
author: flow-machine-draft
created_at: 2026-10-03T05:37:23.769Z
---
# 提案书（Proposal）— 2026-10-03-splitgwt-direct-test

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:e434e6c5febd818bf8b520994c1c25ba0a01ec56bf221acd305906c7938d0ef6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-splitgwt-direct-test 留痕重锚 -->
任务原话转写：pre-push lint 门拦截修复：flow-draft.js 的 splitGwtSeparator 导出在 src+test 零引用（死导出，22e-b 裁决）。批次1（2026-10-03-fr-inject-relevance-rank）实现时选择经 draftAll 间接测括号切分行为，导出本体无直测——代码注释「导出供 test 直测」未兑现。补三个直测用例：括号内箭头不切（返回 null）、括号外箭头/则/使得切分（返回两段）、空输入返回 null。
成功标准：
- test/flow-draft.test.mjs 新增 splitGwtSeparator 直测（import 消费导出），三态断言全绿
- pre-push lint 门「未引用导出」清单归零，push 通过
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:e253ed762ed41c337a04ed956113fa1d21afa732886d0d87eff9428802e324ae:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-splitgwt-direct-test 留痕重锚 -->
按成功标准机械推导，共 2 条验收面：
1. test/flow-draft.test.mjs 新增 splitGwtSeparator 直测（import 消费导出），三态断言全绿
2. pre-push lint 门「未引用导出」清单归零，push 通过
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:e062df48e513562ce81477549c1abe5d7795c958bc37aca0f836f3cf2f212ac0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-splitgwt-direct-test 留痕重锚 -->
1. test/flow-draft.test.mjs 新增 splitGwtSeparator 直测（import 消费导出），三态断言全绿
2. pre-push lint 门「未引用导出」清单归零，push 通过
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
