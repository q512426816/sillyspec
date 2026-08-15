---
author: qinyi
created_at: 2026-08-15 14:48:00
updated_at: 2026-08-15T14:48:00+08:00
---

# 文档一致性债：为什么"文档为本"在 sillyhub 落地失效（双代理实证）

> 来源：2026-08-15 用户质疑「工具宣称以文档为本管理代码，但 sillyhub 完全基于本工具开发，文档仍大量欠缺/过期/错误」。
> 方法：双代理并行实证——代理 A 逐阶段核 sillyspec 源码中"文档更新保障"的实际强度；代理 B 在 multi-agent-platform 仓量化文档欠账并归类根因。

## 核心结论

**SillySpec 的 enforcement 预算几乎全部花在 design↔代码 一致性上（测试对账、删除探针、覆盖对账、docHash），而 模块文档/scan 文档↔代码 这条线在 plan / execute / verify / archive 四个环节层层降级为劝说（persuasion-only）。工具对"文档存在"负责，不对"文档正确"负责。**

sillyhub 的文档烂不是执行失误，是机制性的。

## 一、源码侧：各阶段文档更新保障强度分级

| 阶段 | 强度 | 关键证据 |
|---|---|---|
| brainstorm | persuasion-only | 完成校验只查四件套文件存在（stage-contract.js + gates.js:195-219）；docHash 只防伪造 review，不校验 design↔代码 |
| plan | hybrid（有硬门但**把文档路径排除在外**） | TaskCard allowed_paths / design §6 覆盖对账是 enforced（plan-postcheck.js:345-453, 769-838），但 `parseDesignCoverageByRepo`（plan-postcheck.js:695）调 `parseFileChangeList` **不传 keepSillyspecDocs**，change-list.js:222/238 默认跳过所有 `.sillyspec/` 路径——design 里声明的模块文档更新**不参与覆盖对账**，没有 task 被强制认领。对比 apply 阶段 resolveApplyAllowSet（worktree-apply.js:216-219）反而传了 keepSillyspecDocs: true——plan 放、apply 收，口径不一致 |
| execute | 无覆盖 + 倒退 | 仓库根 `docs/` 在 worktree baseline/dirty 排除清单里（worktree.js:171、worktree-apply.js:480），文档目录被定性为"非代码交付物 churn"，多 agent 场景下文档改动对流程不可见；module-impact 更新 prompt 自认"可选不阻断"（execute.js:920-926） |
| verify | **明示不阻断** | verify.js:137 原文"不符合时标记 ⚠️（不阻断，模块文档可能未及时更新）"——工具自己把文档滞后合法化为常态；测试对账 enforced、文档一致性 advisory（verify-postcheck.js:975-1186 四探针全 advisory） |
| archive | 名义同步主场，实为 persuasion-only + 用户确认 | sync-module-docs step 写入由 agent 做、CLI 不校验写入结果；归档后无条件 `git add .sillyspec/docs/`（complete-handlers.js:237-244），add 空集也静默通过；module-impact.exists 仅 warning（stage-contract-spec.js:416-420） |
| scan | 一次性生成，无刷新生命周期 | scan-postcheck 只查存在；全流程无环节刷新 scan 文档；唯一护栏 worktree-guard.js:179-217 防的是反向风险（scan 重跑覆盖手工编辑） |

全 src/ 范围真正的"文档↔代码硬一致性校验"只有 `test/doc-ref-check.test.mjs` 一处，且白名单只覆盖 `docs/sillyspec/platform-interface-map.md` 一份——是 dogfood 仓私有测试，**用户项目拿不到这个能力**。

## 二、sillyhub 侧：文档欠账量化与根因

### 量化

- 变更通道比例：quick : 完整流程 ≈ **480 : 183 ≈ 2.6 : 1**（quick 占 72% 流量）
- quick 通道文档同步率：480 条中仅 69 条（**14.4%**）触及模块文档
- 前端 `_module-map.yaml` 登记 120 文件 vs 实际 305 个源文件 → **72% 前端源文件无文档登记**；56 张模块卡中 44 张停在 2026-06-24/25，期间 frontend/src 经历 434 commit
- daemon：129 commit 触碰 src，模块文档仅 4 个 commit；28 张卡中 22 张停 06-24
- 后端 32 模块全覆盖但 13 张卡落后于源码（最严重 06-24 vs 08-15）
- 183 个归档 change 中 44 个无 verify-result.md
- 至少 5 个归档 change 带 module-impact pending 未清项（08-13/08-14/08-15 各 change），verify 全 PASS

### 问题分类实例

- **A 纯缺失**：sessions 页 + change-sessions-card（08-14 新产物零登记）、`lib/ppm/` 整目录 22 文件无文档
- **B 过期**：lib-api.md 写"约 230 行"实际 191；scan_docs.md 仍描述 `list_` 全量返回（实际已 load_only 排除 content）
- **C 错误**：lib-changes.md 仍列 `createChange`/`executeChange`，代码已删这两个函数；l10n change 触碰 21 模块只同步 15 张卡（task-10 要求全量）

### 三条根因

1. **quick 通道是欠账主通道**（量级最大）：设计上不强制文档同步，86% 的 quick 改动不动文档。daemon 129 src commit vs 4 doc commit 就是 quick 流量冲刷的直接结果。
2. **完整流程的文档 task 是软门禁**：声明完成 ≠ 落地。l10n task-10 声明全量同步实际漏 7 模块；perf-remediation 把文档同步显式推给 archive、archive 又没做（归档 commit 触碰模块文档数为 0，verify 照样 PASS WITH NOTES）；conversation-driven T-13~T-17 无 task 卡 → 无 allowed_paths → 天然不被 execute 审计覆盖。
3. **流程机制盲区**：前后端/daemon 文档维护不对称；scan 增量更新只跑过 3 次赶不上代码速度；module-map 文件级登记后端空转（glob 级永远"不缺"）；worktree apply 排除文档目录导致 execute worktree 里写的模块文档不回主干。

## 三、改进方向登记（按"确定的事留 SillySpec"原则筛选）

以下只登记确定性问题与可选改进，软判定（"文档写得对不对"语义审查）仍推 sillyhub/人类：

| # | 缺口 | 可选修法方向 | 规模 |
|---|---|---|---|
| D-1 | verify.js:137 明示"文档不一致不阻断"——制度根源 | 改为 advisory→blocking 可配置，或至少 verify 探针对账 module-impact 声明 vs 实际 diff | 中 |
| D-2 | plan 覆盖对账跳过 `.sillyspec/` 文档路径（plan-postcheck.js:695 不传 keepSillyspecDocs，与 apply 阶段口径不一致） | ✅ 已修（2026-08-15 ql-20260815-006-a51d）：`parseDesignCoverageByRepo` 两处 `parseFileChangeList` 补传 `keepSillyspecDocs: true`，`.sillyspec/docs/` 模块文档须被 task `allowed_paths` 认领；`.sillyspec/` 非 docs 子路径仍排除（与 apply 口径一致）；新增 4 测试（test/design-coverage.test.mjs），删 1 个固化旧豁免契约的测试 | 小（quick 已完成） |
| D-2b | 后置 task（T-13~T-17 类"文档同步"任务）无 task 卡即不受审计 | plan 阶段要求文档同步任务必须有 TaskCard | 中（prompt+校验） |
| D-3 | 仓库根 `docs/` 在 worktree 排除清单（worktree.js:171、worktree-apply.js:480），文档改动对流程不可见 | 从排除清单放开或改为可配置 | 小但需评估多 agent 噪声 |
| D-4 | archive sync-module-docs 无结果校验（git add 无条件、空集静默通过） | 归档前对账 module-impact 声明的文档更新 vs 实际 diff，缺则 warning/阻断 | 中 |
| D-5 | module-impact pending 死信箱（5+ change 带未清 pending 归档且 verify PASS） | verify/archive 对账 module-impact 内 pending/false 项，非零即阻断或强制清零 | 中 |
| D-6 | doc-ref-check 能力未产品化（唯一硬一致性校验只覆盖 dogfood 仓一份文档） | 产品化为 `sillyspec docs check` 类命令：校验文档内 file:line 引用有效性，进各阶段探针 | 中大（新功能） |
| D-7 | scan 文档无刷新生命周期，与手工模块卡双轨 | archive 阶段提示刷新 scan 增量（prompt 级）或合并双轨（需设计） | 大（需设计） |
| D-8 | quick 通道零文档要求（72% 流量、14% 同步率） | 定位取舍题：quick 本来就是"低摩擦通道"，强制文档会毁掉它的价值；可做的是 quick --done 审计对触及模块文档的行为**打标记**（如"本次未同步模块文档"），把欠账显性化而非阻断 | 需用户裁决 |

## 四、行动裁决（2026-08-15）

- 本文档登记全部缺口，D-1~D-8 待用户裁决优先级。
- exec-g 债条目（prompt-control-debt.md:149）描述已过时（现行 filterDeliverableFiles 已保留 `.sillyspec/docs/`），应销账——本仓 quick 可顺手修。
- docs/sillyspec/ 自身抽查：known-implementation-gaps.md 停 07-16 滞后一个月；interface-contract.md 不在 doc-ref-check 白名单。
