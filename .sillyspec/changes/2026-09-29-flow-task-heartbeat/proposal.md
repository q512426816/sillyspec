---
author: flow-machine-draft
created_at: 2026-09-29T06:26:56.176Z
---
# 提案书（Proposal）— 2026-09-29-flow-task-heartbeat

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:98f27760465db7a6e774d563f2424e688fc4ba9c096bd781e4919df1c33d34b2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
任务原话转写：动机：thin 道两次协议调用（start/done）之间无心跳点——tasks.md 期中只有 agent 自看，「完成一个勾一个」沦为纪律话术（2026-09-29-rot-retire-inject-cap 实证一把勾 0→6，watcher 报假勾选嫌疑）。openspec 的每步好好勾选靠三部件：skill 剧本把勾选写进循环体、CLI 每轮重读 tasks.md 由机器给下一个任务指针、archive 阻断漏勾。本变更把部件二移植进来：flow status 成为执行期心跳——输出下一个未勾任务与进度，协议改为「取任务→做一件→勾一格→重跑」循环；并用逐 task 证据背板补 openspec 没有的假勾防线（非镜像任务须逐个有 token 提交或 review.json 变更）。

成功标准：
- thin 道执行期 flow status --change <名> 输出心跳块：下一任务指针行（第一个 - [ ] 的 task-NN+标题）+ 进度 N/M + 「勾一格后重跑本命令；全勾后 flow done 收口」指引；全勾时改指 flow done
- flow start 简报交付纪律段、tasks.md 头部纪律行、AGENTS.md 恢复与查看段三处协议文案同步为心跳循环口径
- flow done 假勾哨兵收紧为逐 task 证据：非镜像（agent 覆写）任务的每个勾选 task 在区间提交标题/正文或 review.json 变更中须有对应 task-NN token，缺哪个点名哪个；镜像任务维持既有豁免（区间提交非空即放行）
- 哨兵拒收文案按逐 task 口径更新且给出补证出口
- 新增心跳渲染与逐 task 哨兵测试，适配既有 fake-check 用例，flow 系与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:fa7ad6d6a92e4c21915aa3935c626d259a8caacc93e4cc2416827748776a5cd2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. thin 道执行期 flow status --change <名> 输出心跳块：下一任务指针行（第一个 - [ ] 的 task-NN+标题）+ 进度 N/M + 「勾一格后重跑本命令
2. 全勾后 flow done 收口」指引
3. 全勾时改指 flow done
4. flow start 简报交付纪律段、tasks.md 头部纪律行、AGENTS.md 恢复与查看段三处协议文案同步为心跳循环口径
5. flow done 假勾哨兵收紧为逐 task 证据：非镜像（agent 覆写）任务的每个勾选 task 在区间提交标题/正文或 review.json 变更中须有对应 task-NN token，缺哪个点名哪个
6. 镜像任务维持既有豁免（区间提交非空即放行）
7. 哨兵拒收文案按逐 task 口径更新且给出补证出口
8. 新增心跳渲染与逐 task 哨兵测试，适配既有 fake-check 用例，flow 系与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:98899fec3c40e94eafb7af79d8fe3fc9a5b0bf83ff9c25c05bc3d88cdca0bb47:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
1. thin 道执行期 flow status --change <名> 输出心跳块：下一任务指针行（第一个 - [ ] 的 task-NN+标题）+ 进度 N/M + 「勾一格后重跑本命令
2. 全勾后 flow done 收口」指引
3. 全勾时改指 flow done
4. flow start 简报交付纪律段、tasks.md 头部纪律行、AGENTS.md 恢复与查看段三处协议文案同步为心跳循环口径
5. flow done 假勾哨兵收紧为逐 task 证据：非镜像（agent 覆写）任务的每个勾选 task 在区间提交标题/正文或 review.json 变更中须有对应 task-NN token，缺哪个点名哪个
6. 镜像任务维持既有豁免（区间提交非空即放行）
7. 哨兵拒收文案按逐 task 口径更新且给出补证出口
8. 新增心跳渲染与逐 task 哨兵测试，适配既有 fake-check 用例，flow 系与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
