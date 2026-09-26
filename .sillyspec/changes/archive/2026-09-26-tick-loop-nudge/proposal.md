---
author: flow-machine-draft
created_at: 2026-09-26T06:38:22.138Z
---
# 提案书（Proposal）— 2026-09-26-tick-loop-nudge

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:169b403761ed2a88bf50769615c778b3608be4cc2e7f2bb50b44aa3566c4c80e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
任务原话转写：动机：R19 实证 thin 勾选仍「收口前一把全勾」（全程 0 勾→收口 10/10，提示词+简报双重强调无效）；对照 OS 的边干边勾（归档时恰漏最后一条归档任务的自洽行为实证），根因是四个结构差异：①勾选指令在起点简报一次性下发（几小时后失效）vs OS 的 Guardrails 常驻干活循环（每次 instructions 反复进场）；②工作单元行缺验证锚 vs OS 每条任务内嵌『——验证：<命令>』；③机器聚类清单 ownership 弱；④tasks.md 未随交付提交（R19 发现——untracked 直至归档，勾选证据链 git 不可回溯）。
成功标准：
- 勾选提醒进干活循环：flow status 输出尾部带轻量勾选提醒（0<N 总且有完成迹象时一行：请顺手勾已完成单元）；flow start 恢复简报已有勾选进度行（既有）不动
- 工作单元行加验证锚：draftTasks 单元行尾追加『——验证：<该单元覆盖首个 FR 的测试命令或 known 命令>』（无绑定信息时给通用提示「跑相关测试绿即勾」）；requirements 测试绑定槽已有 agent 作答面——起草时绑定未答，锚退化为通用文案（可接受，agent 填绑定后 amend-draft 可见全文）
- 哨兵时点判定升级：勾选全部发生在收口窗口（tasks.md 的 git 首次提交==收口提交）时，哨兵放行但打 console.warn 提醒行为模式（不阻断——token 证据已验）
- 交付提交纪律补丁：flow start 简报的交付纪律行明示『tasks.md 一并显式 pathspec 提交（勾选证据进 git 历史）』
- 测试：提醒渲染/验证锚渲染/哨兵时点警告/简报文案钉；既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:5ac38eb8ef248701e3100874f68241dc7d3b0cc28141e16cd4420623fd974a2c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. 勾选提醒进干活循环：flow status 输出尾部带轻量勾选提醒（0<N 总且有完成迹象时一行：请顺手勾已完成单元）
2. flow start 恢复简报已有勾选进度行（既有）不动
3. 工作单元行加验证锚：draftTasks 单元行尾追加『——验证：<该单元覆盖首个 FR 的测试命令或 known 命令>』（无绑定信息时给通用提示「跑相关测试绿即勾」）
4. requirements 测试绑定槽已有 agent 作答面——起草时绑定未答，锚退化为通用文案（可接受，agent 填绑定后 amend-draft 可见全文）
5. 哨兵时点判定升级：勾选全部发生在收口窗口（tasks.md 的 git 首次提交==收口提交）时，哨兵放行但打 console.warn 提醒行为模式（不阻断——token 证据已验）
6. 交付提交纪律补丁：flow start 简报的交付纪律行明示『tasks.md 一并显式 pathspec 提交（勾选证据进 git 历史）』
7. 测试：提醒渲染/验证锚渲染/哨兵时点警告/简报文案钉
8. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:977ab3d12bca3aa4685e9171e64381e5f118520d48914d20950bbef37c981d32:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
1. 勾选提醒进干活循环：flow status 输出尾部带轻量勾选提醒（0<N 总且有完成迹象时一行：请顺手勾已完成单元）
2. flow start 恢复简报已有勾选进度行（既有）不动
3. 工作单元行加验证锚：draftTasks 单元行尾追加『——验证：<该单元覆盖首个 FR 的测试命令或 known 命令>』（无绑定信息时给通用提示「跑相关测试绿即勾」）
4. requirements 测试绑定槽已有 agent 作答面——起草时绑定未答，锚退化为通用文案（可接受，agent 填绑定后 amend-draft 可见全文）
5. 哨兵时点判定升级：勾选全部发生在收口窗口（tasks.md 的 git 首次提交==收口提交）时，哨兵放行但打 console.warn 提醒行为模式（不阻断——token 证据已验）
6. 交付提交纪律补丁：flow start 简报的交付纪律行明示『tasks.md 一并显式 pathspec 提交（勾选证据进 git 历史）』
7. 测试：提醒渲染/验证锚渲染/哨兵时点警告/简报文案钉
8. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
