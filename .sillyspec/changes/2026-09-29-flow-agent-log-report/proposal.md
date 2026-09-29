---
author: flow-machine-draft
created_at: 2026-09-29T07:37:47.368Z
---
# 提案书（Proposal）— 2026-09-29-flow-agent-log-report

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:d49ac35a5b79e1757ae3cc6239cf73ec89cfb4627657f27c89d9b01c94fbf347:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
任务原话转写：轻量变更（flow 族）入口接入 agent 会话日志上报：runCommand 入口（run/command.js:913-936）已有 recordAgentLogInvocation——探测 agent 环境登记 agent-session-log.json 并 POST /api/agent-logs 推平台；flow 族走 index.js case 'flow' → cmdFlow 独立入口，从未接入，轻量变更本地会话路径从不上报平台。补齐：cmdFlow 子命令解析出 change 名后对齐 run 语义调用，context.changeKey=flow change 名（flow 无 quick 会话概念），best-effort try/catch 不阻断协议面。

成功标准：
- flow start/done/amend-draft 执行后，runtimeRoot 下 agent-session-log.json 的本会话 own 条目携带 change_key=<change 名>
- 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥语义复用，不另造轮子）
- 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
- run 族既有行为不变（既有 run agent-log 测试全绿）
- 新增测试覆盖 flow 入口的登记调用面；全量测试绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:31c0bcd9fbabc59b429119bd6f1bdc19eb6e5cf332e3ac1d6412a9ef9b2595f0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. flow start/done/amend-draft 执行后，runtimeRoot 下 agent-session-log.json 的本会话 own 条目携带 change_key=<change 名>
2. 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥语义复用，不另造轮子）
3. 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
4. run 族既有行为不变（既有 run agent-log 测试全绿）
5. 新增测试覆盖 flow 入口的登记调用面
6. 全量测试绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:dffc39b4386946d2e115e3bc9b8abb0adad8034e9d061dacf026a603ec4dd954:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
1. flow start/done/amend-draft 执行后，runtimeRoot 下 agent-session-log.json 的本会话 own 条目携带 change_key=<change 名>
2. 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥语义复用，不另造轮子）
3. 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
4. run 族既有行为不变（既有 run agent-log 测试全绿）
5. 新增测试覆盖 flow 入口的登记调用面
6. 全量测试绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
