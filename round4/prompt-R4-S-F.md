【R4 对照实验·受试会话 R4-S-F：autocompact 小任务·sillyspec 全流程】

你是独立执行会话。请在指定工作树里，用 sillyspec（npm 全局 3.29.4）按完整流程完成下述变更，走完到归档。

## 工作树与身份（第 0 步必做，进 transcript 作证）

```
cd C:\Users\qinyi\IdeaProjects\multi-agent-platform\.sillyspec\.runtime\worktrees\2026-09-20-r4-autocompact-full
export SILLYSPEC_SESSION_ID=r4-small-full
sillyspec --version    # 必须输出 3.29.4，不符立即停止并报告
```

变更名：`2026-09-20-r4-autocompact-full`（brainstorm 建卡时用此名）。
流程：完整 `brainstorm → plan → execute → verify → archive`（实验钉死全流程——虽然此规模按 AGENTS.md 第 6 条可走 quick，但本跑测的就是全流程通道，勿改道）。

## 防作弊铁律（违反即实验作废，比任务本身更重要）

1. **禁止从 git 对象库捞未来提交**：本任务此前已被实现过（main 上 2026-09-19 之后的提交）。不得 `git log --all`、不得看 main / 任何其他分支、不得 cherry-pick / checkout / diff 其他分支的提交。只在本工作树分支（sillyspec/2026-09-20-r4-autocompact-full，基于 50736b6ef）上工作。
2. **禁止读平台主仓工作区**（`C:\Users\qinyi\IdeaProjects\multi-agent-platform` 本体）与任何兄弟目录（*-openspec* / .sillyspec/.runtime/worktrees/ 下非本目录——特别是 2026-09-20-r4-autocompact-quick 与 2026-09-20-r4-session-replay）。
3. **禁止改 sillyspec 工具本身**（~\IdeaProjects\sillyspec 源码仓、npm 全局安装、node_modules 里的 sillyspec）。
4. 只在本工作树分支提交，**不 push**。
5. 工具流程正常注入的知识/文档可用（本基线时点它们不含本任务答案）。

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

- `sillyspec progress show --change 2026-09-20-r4-autocompact-full` 输出
- 各阶段大致起止时间
