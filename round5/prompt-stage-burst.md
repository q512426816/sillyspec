【旧流程阶段折叠（burst 模式）——sillyspec 主仓，走旧全流程（brainstorm→plan→execute→verify→archive）】

你是本仓开发会话。任务：给旧流程（run 族）做"阶段折叠"——五阶段形状保留，步进往返折叠成每阶段 2 次调用（一次渲染+一次 done）。变更已建好在 brainstorm 阶段：`2026-09-22-stage-burst-fold`，用 `sillyspec run brainstorm --change 2026-09-22-stage-burst-fold` 续跑（本提示词即任务书，四件套按它写）。

## 背景一句话
实测（round5/r5l-forensic-verdict.md + round5/audit/）：旧流程每变更 42-106 次 CLI 调用，其中步进往返是大头；产品决策：保留五阶段形状与全部门禁语义，只折叠交互形状。用户明确不用薄流程（flow 族保留为实验通道，缺省翻回 legacy）。

## 设计规格（核心，照此实现）

### 1. burst 渲染（src/run/stage.js 渲染分支）
- 配置读取：新函数 `readStageBurst(specBase)`（建议放 src/run/shared.js）：local.yaml `stage:\n  burst: true` 开启；env `SILLYSPEC_STAGE_BURST=0` 强制关、`=1` 强制开；**缺省 OFF**（本轮不翻默认，防测试面爆炸；本仓 local.yaml 手动开启自举）。
- runStage 渲染路径（stage.js ~585-657 一带）：burst 开启且阶段未完成时：
  a. 遍历剩余 pending/in-progress/blocked 步：**noAI 步就地自动完成**（复用 stage.js 现有 _cliAction 分支逻辑，照抄 noAI 处理块），然后继续；
  b. AI 步逐个调 `outputStep(stageName, i, defSteps, cwd, changeName, progress.project, platformOpts, null, collectStageWaitHistory(progress, stageName))`（prompt.js:805 已导出，签名照旧）——一次调用打印全部剩余步说明书；
  c. 尾部加 burst 提示：`📦 burst 模式：本阶段全部说明书已一次下发。干完全部步骤后用一次 --done 收口（CLI 内部逐步推进+逐步校验，失败即停在失败步）。`

### 2. burst done（完成侧循环）
- 落点：src/run/command.js 的 --done 分发处（~1727 与 ~2073 两处调 completeStep）；burst 开启时改走新包装 `completeStepBurst`。
- `completeStepBurst`（建议 export 自 src/run/complete.js）：循环调既有 `completeStep(pm, progress, stageName, cwd, outputText, null, { ...options, printNext: false })`：
  - 每轮开始重新算 pending 步索引（completeStep 内部 findIndex）；无 pending → 阶段已完成，退出循环；
  - outputText 传 null 让 completeStep 的 P0-2 事实合成（synthesizeStepOutput，complete.js:224 已有）接管——burst 下 per-step 摘要由 CLI 合成，agent 只给一次整体 --output；
  - **completeStep 遇门禁失败/WAIT 标记/waiting 步会 process.exit——这就是 burst 的天然断点**：失败信息已打印，agent 修复后重跑 --done 从断点续（幂等，已完成步自动跳过）；
  - 防御：循环上限 50 轮（步数不可能超），超限报错防死循环。
- **不要改 completeStep 本体**（它的全部守卫——WAIT 硬校验/waiting 前置/意图断言/门控——在循环里逐歩生效，这正是"步语义零改动"的实现方式）。

### 3. flow.mode 缺省翻回 legacy（src/flow.js）
- readFlowConfig 缺省 'thin' → 'legacy'（flow.js:66 与 76 两处 + 注释同步）。
- 连带修 test/flow-protocol.test.mjs：fixture 的 local.yaml 需加 `flow:\n  mode: thin`（现在缺省就是 thin 所以没写；翻默认后 ①②③⑥ 会挂）——逐个 fixture 补配置行，断言本体不动。

### 4. 明确不做（范围外）
- verify/archive 不动（--init --draft 与就绪度已把这两阶段压到 1-2 次调用）。
- 薄流程（flow 族）除缺省翻转外零改动。
- watcher 接 run 族 + 哨兵规则引擎 = 下一批独立变更，别顺手做。
- burst 默认翻转（全量测试面迁移）= 验收后另立。

## 验收（成功标准）
1. burst 开启：brainstorm/plan/execute 三阶段各恰好 2 次 CLI 调用走通（渲染 1 + done 1；done 内部逐步推进打印每步完成行）；
2. **等价性**：同 fixture 双跑（burst on/off），各步 postcheck 与 completeStageGates 的判定结果一致（gate 输出可逐条对比）；burst 中途门禁失败 → 停在失败步、progress 状态与逐步模式失败态一致；
3. burst 关闭（缺省）：既有全部测试零回归；
4. env 逃生阀 SILLYSPEC_STAGE_BURST=0 生效；
5. flow 族测试修后全绿；全量 npm test + lint 过（新文件录 module-map）。

## 流程纪律
- Bash env 不跨调用持久：sillyspec 命令前缀 `SILLYSPEC_SESSION_ID=zcode-stage-burst sillyspec ...`
- 本仓 local.yaml 加 `stage:\n  burst: true` 自举（提交时**不含 local.yaml**——它 gitignored）
- 多会话共享仓：提交显式 pathspec；新文件录 module-map（lint 会拦）
- 四件套/design 按本提示词写；范围外的东西（包括"顺手优化"）一律不碰

## 关键锚点（省你考古）
- 渲染分支：src/run/stage.js:585-657（noAI 自动完成块 + outputStep 调用）
- completeStep：src/run/complete.js:134（守卫链 142-263；P0-2 合成 224-227）
- --done 分发：src/run/command.js:1727、2073
- outputStep：src/run/prompt.js:805
- flow 配置缺省：src/flow.js:62-78
- 依据文档：round5/r5l-forensic-verdict.md（法证账）、round5/flip-3.31.0-proposal.md §十（门分层与 R6 取消）

## 汇报
每阶段 --done 后给：提交哈希 + 验收项打勾；archive 后给一行总结（预期：brainstorm 8 步/plan 5 步/execute 14 步 → 每阶段 2 次调用；非 burst 路径零回归）。
