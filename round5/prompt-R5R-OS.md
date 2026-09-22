【R5R 重放·受试会话 R5R-OS1：autocompact 小任务·OpenSpec】

你是独立执行会话。请在当前工作区（已为你准备好的工作树）里，用 OpenSpec（CLI 1.13.1）走你的标准流程完成下述变更，走完到 archive。

## 工作树与身份（第 0 步必做，进 transcript 作证）

```
pwd             # 应为 C:\Users\qinyi\IdeaProjects\multi-agent-platform\.sillyspec\.runtime\worktrees\2026-09-21-r5r-openspec-small
openspec --version    # 必须输出 1.13.1，不符立即停止并报告
```

工作树里若无 openspec/ 目录，先 `openspec init` 再开始。流程走完整：proposal（delta 规格）→ apply（实现+测试）→ archive（合入活规格库）。

## 防作弊铁律（违反即实验作废，比任务本身更重要）

1. **禁止从 git 对象库捞未来提交**：本任务此前已被实现过（main 上 2026-09-19 之后的提交、openspec/autocompact-config 分支上也有）。不得 `git log --all`、不得看 main / 任何其他分支、不得 cherry-pick / checkout / diff 其他分支的提交。只在本工作树分支（openspec/r5r-autocompact，基于 50736b6ef）上工作。
2. **禁止离开本工作树读任何兄弟目录**——特别是 .sillyspec/.runtime/worktrees/ 下的 2026-09-21-r5r-autocompact-full/-quick（sillyspec 侧受试会话正在进行，读了即双向污染）、2026-09-20-r4-autocompact-full/-quick、2026-09-20-r4-openspec-small/-large、2026-09-20-r4-session-replay（含历史答案），以及 C:\Users\qinyi\IdeaProjects 下的 multi-agent-platform 主仓、multi-agent-platform-openspec、multi-agent-platform-openspec-autocompact。
3. **禁止改 OpenSpec 与 sillyspec 工具本身**（npm 全局安装、~\IdeaProjects\sillyspec 源码仓）。
4. 只在本工作树分支提交，**不 push**。
5. 工作树里的 `.sillyspec/` 目录是另一工具的存量数据，与本任务无关，不要读不要动。

## 任务简报（verbatim）

# 提案书（Proposal）— claude 引擎 autocompact 配置（provider 级）

## 动机

claude 引擎长会话在 ~160K tokens 触发引擎自动压缩（默认 believed limit 200K × ~80% 设计点），生产会话（6e213eb3，113 轮）频繁被压。平台无干预手段，用户希望按 provider 配置压缩行为（更晚压缩/关闭/预计算）。

## 关键问题

1. 平台管道已有 `settings_config → lease 透传 → claude-settings 白名单 → settings.json` 机制（attribution 等键先例），但白名单不含任何 autocompact 键——配置写了也不生效。
2. 前端 provider 表单无 autocompact 入口，用户只能手改数据库 JSON。
3. window 配置超过模型实际窗口会撞硬限报错而非压缩——需要风险提示承载（用户自担的配置面）。

## 变更范围

- daemon：claude-settings.ts 白名单加三键（值守护：window 正整数/两开关布尔）。
- 前端：llm-provider-form claude 分支「引擎自动压缩」区（三键 + 风险提示）。
- 文档：daemon.md 增量段。

## 不在范围内（显式清单）

- profile 级配置（D-001 否决）
- pi/codex 引擎压缩配置
- 阈值比例可配（SDK 无可写项）

## 成功标准（可验证）

- settings_config 配 `{"autoCompactWindow": 230000}` 的 claude provider 会话，daemon spawn 后 `$CLAUDE_CONFIG_DIR/settings.json` 含该键（单测断言）
- 三键值守护：window=0/负数/非整数、开关非布尔 → 不写入（单测）
- 前端表单 claude 分支渲染三键控件并正确提交进 settings_config；非 claude 不渲染（组件测试）
- 既有 attribution/env 白名单行为零回归（既有用例全绿）

## 终态自查（完成后在报告里给出）

- openspec archive 后的规格库状态（list）
- 各阶段大致起止时间（proposal / apply / archive）
