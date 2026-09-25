---
author: flow-machine-draft
created_at: 2026-09-25T09:28:51.308Z
---
# 提案书（Proposal）— 2026-09-25-thin-done-gate-calibration

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7814b5edf815d83e41fee20153cbc351be634d43c7dec777344d58f5872f4098:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
任务原话转写：动机：multi-agent-platform 仓 thin 收口四轮拒收实录（坑1与坑2，见该仓 docs 下 sillyspec 留档 thin-flow-done-gate-frictions.md）：flow start 横幅教 agent 正常勾选 task-NN，但勾选改变 tasks-rows 机器段哈希被指纹门拒收，只能借 amend-draft 重锚并付出 editRatio=1 的误报；哨兵拒收文案说提交带 task-NN 即证据，判据却只读提交标题行，token 写进提交正文重试照样被拦——生成侧指引与验收侧判据口径漂移。

变更范围：src/machine-draft.js、src/flow.js、src/run/quick-audit.js、src/sentinel-assertions.js、test/machine-draft.test.mjs、test/sentinel-wiring.test.mjs

成功标准：
- 勾选态归一：段内容哈希计算前把 task-NN 勾选行的勾选态归一回未勾选，tasks.md 正常勾选后 flow done 工件校验不再指纹失配拒收，机器段真实改写仍拒收
- 哨兵证据口径：收口哨兵取整条提交消息而非仅标题行，task-NN 出现在提交正文也算完成证据，拒收文案写明标题或正文
- 补两例回归：勾选后指纹仍匹配、提交正文含 task-NN 过哨兵，相关套件全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b25feeac5d82a2f0be185598af2ec8ced91f9300a85c7d4ed78044ae5e559517:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. 勾选态归一：段内容哈希计算前把 task-NN 勾选行的勾选态归一回未勾选，tasks.md 正常勾选后 flow done 工件校验不再指纹失配拒收，机器段真实改写仍拒收
2. 哨兵证据口径：收口哨兵取整条提交消息而非仅标题行，task-NN 出现在提交正文也算完成证据，拒收文案写明标题或正文
3. 补两例回归：勾选后指纹仍匹配、提交正文含 task-NN 过哨兵，相关套件全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:766ca026e22188dea3cc5e8b6af11de44666f8baeae0a1771d507df5eab43aff:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
1. 勾选态归一：段内容哈希计算前把 task-NN 勾选行的勾选态归一回未勾选，tasks.md 正常勾选后 flow done 工件校验不再指纹失配拒收，机器段真实改写仍拒收
2. 哨兵证据口径：收口哨兵取整条提交消息而非仅标题行，task-NN 出现在提交正文也算完成证据，拒收文案写明标题或正文
3. 补两例回归：勾选后指纹仍匹配、提交正文含 task-NN 过哨兵，相关套件全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
