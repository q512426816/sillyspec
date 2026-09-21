【R5 对照实验·受试会话 R5-L：session-replay 大任务·sillyspec 全流程（R4-L 同款重放，仅换 3.30.0）】

你是独立执行会话。请在指定工作树里，用 sillyspec（npm 全局 3.30.0）按完整流程完成下述变更，走完到归档。

## 工作树与身份（第 0 步必做，进 transcript 作证）

```
cd C:\Users\qinyi\IdeaProjects\multi-agent-platform\.sillyspec\.runtime\worktrees\2026-09-21-r5-session-replay
export SILLYSPEC_SESSION_ID=r5-large
export SILLYSPEC_STEP_GUIDE=1
sillyspec --version    # 必须输出 3.30.0，不符立即停止并报告
```

变更名：`2026-09-21-r5-session-replay`（brainstorm 建卡时用此名）。
流程：完整 `brainstorm → plan → execute → verify → archive`（实验钉死全流程，勿降级 quick）。
本会话在 zcode 里的标题请含 `R5-L` 前缀（实验归账定位用）。

## 防作弊铁律（违反即实验作废，比任务本身更重要）

1. **禁止从 git 对象库捞未来提交**：本任务此前已被实现过，对象库里存在答案提交（main / replay-redo 等分支上）。不得 `git log --all`、不得看 main/replay-redo/任何其他分支、不得 cherry-pick / checkout / diff 其他分支的提交。只在本工作树分支（sillyspec/2026-09-21-r5-session-replay，基于 53c67e02a）上工作。
2. **禁止读平台主仓工作区**（`C:\Users\qinyi\IdeaProjects\multi-agent-platform` 本体）与任何兄弟目录——**尤其 `.sillyspec/.runtime/worktrees/` 下其他一切目录（含 2026-09-20-r4-* 五个工作树，其中有同任务上一轮的答案）**。
3. **禁止改 sillyspec 工具本身**（~\IdeaProjects\sillyspec 源码仓、npm 全局安装、node_modules 里的 sillyspec）。
4. 只在本工作树分支提交，**不 push**。
5. 工具流程正常注入的知识/文档可用（本基线时点它们不含本任务答案）。

## 任务简报（verbatim，与 R4-L 逐字同源）

# 提案书（Proposal）— tool_report 会话回放

## 动机

SillySpec CLI 自动上报创建的会话（origin=tool_report 且未继续过对话）打开后看到的是**日志元数据卡列表**，不是用户预期的会话内容。用户明确要求：「应该直接按 会话样式展示，只是数据来源不一样而已」「token 信息也要能获取到」「不光 zcode 其他 agent 也要核对能正确获取与正确显示」。

## 关键问题

1. **形态错位**：对话内容藏在每条日志卡的「查看内容」320px 嵌套小窗里，主对话被埋在元数据与子代理日志中间（实证会话 137ddfff：1 主日志 + 5 条子代理日志），没有「会话」的样子。
2. **内容错位**：自主运行日志的 user 角色消息多为系统注入（task-notification），现渲染当用户气泡处理，直接「内容不对」；轮次边界（zcode turnId）与 token 用量（response.usage 五项）都在日志里但解析层全部丢弃。
3. **harness 覆盖断层**：claude-code 格式规整且含 usage 但无解析器（只能看原文）；cursor-agent transcript 干净可解析但整条上报链路缺失；cursor IDE 二进制格式点开是 409 死胡同。

## 变更范围

- 前端：回放主体组件 AgentReplayBody（适配器 → TurnTimeline 真组件复用）、系统事件中性行、工作会话折叠条、不可用三态、token 徽标与累计显示。
- daemon：NormalizedLogMessage 扩展（usage/turnId/model/durationMs/sender）+ zcode 补字段 + 新增 claude-code、cursor-agent 两个解析器 + RPC totalUsage。
- backend：messages 端点 schema 可选新字段透传 + gen:types（零表结构改动）。
- docs：cursor-agent 上报链路跨仓跟进记录。

## 不在范围内（显式清单）

- 不做解析产物落库（L3 持久化，单独决策）
- 不做 cursor-agent 作为 provider 接入（运行时 token 捕获，另行立项）
- 不做 cursor IDE store.db 对话化（blob 库 + 无 token）
- 不动已激活 tool_report 会话路径与 chat 会话
- 不改 sillyspec 仓（cursor-agent 扫描上报仅记录跨仓跟进）

## 成功标准（可验证）

- 打开纯 tool_report 会话：主体即会话时间线（对话/全部视图可用），主日志为正文、子代理在「工作会话」折叠条，系统事件显示为中性行非用户气泡。
- zcode/claude-code 回放可见每轮 token（输入/输出/上下文）与会话累计；数据源无 token（cursor-agent）时显示「未知」。
- 老 daemon / 机器离线 / 格式不支持 / 文件缺失时回退到显式中文提示，不弹错框。
- 全量既有测试不受影响（activated 路径、查看内容语义、上报/归属链路零改动）。

## 终态自查（完成后在报告里给出）

- `sillyspec progress show --change 2026-09-21-r5-session-replay` 输出
- 各阶段大致起止时间（brainstorm/plan/execute 各任务/verify/archive）
