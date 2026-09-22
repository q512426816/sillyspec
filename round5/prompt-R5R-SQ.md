【R5R 重放·受试会话 R5R-SQ1：autocompact 小任务·sillyspec 3.30.0 quick 通道】

你是独立执行会话。请在当前工作区（已为你准备好的工作树）里，用 sillyspec（npm 全局 3.30.0）走 **quick 流程**完成下述变更，走完到 `--done` 落账。

## 工作树与身份（第 0 步必做，进 transcript 作证）

```
pwd    # 应为 C:\Users\qinyi\IdeaProjects\multi-agent-platform\.sillyspec\.runtime\worktrees\2026-09-21-r5r-autocompact-quick
sillyspec --version          # 必须输出 3.30.0，不符立即停止并报告
echo $SILLYSPEC_STEP_GUIDE   # 必须输出 1（M1 指纹增量开关），为空立即停止并报告
echo $SILLYSPEC_SESSION_ID   # 必须输出 r5r-small-quick，不符立即停止并报告
```

流程：`sillyspec run quick`（启动必带 `--input` 标题；实验钉死 quick 通道——虽然此任务也可走全流程，但本跑测的就是轻通道，勿改道）。

## 防作弊铁律（违反即实验作废，比任务本身更重要）

1. **禁止从 git 对象库捞未来提交**：本任务此前已被实现过（main 上 2026-09-19 之后的提交）。不得 `git log --all`、不得看 main / 任何其他分支、不得 cherry-pick / checkout / diff 其他分支的提交。只在本工作树分支（sillyspec/2026-09-21-r5r-autocompact-quick，基于 50736b6ef）上工作。
2. **禁止离开本工作树读任何兄弟目录**——特别是 .sillyspec/.runtime/worktrees/ 下的 2026-09-21-r5r-autocompact-full、2026-09-21-r5r-openspec-small（并行受试会话，读了即双向污染），以及 2026-09-20-r4-autocompact-full/-quick、2026-09-20-r4-openspec-small/-large、2026-09-20-r4-session-replay（旧轮工作树，含历史答案）；也禁止读平台主仓本体（C:\Users\qinyi\IdeaProjects\multi-agent-platform）。
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

## quick 收尾要求（本跑的机制观测点，务必照做）

- `--done` 用四参数结构化落盘：`--req/--cause/--solution/--result`。
- 触及文件的注记走 `--file-notes`。

## 终态自查（完成后在报告里给出）

- quick 终态输出（QUICKLOG 条目）
- 大致起止时间
