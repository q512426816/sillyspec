---
author: qinyi
created_at: 2026-08-15 14:48:00
updated_at: 2026-08-15 15:20:00 +08:00
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
| D-1 | verify.js:137 明示"文档不一致不阻断"——制度根源 | ✅ 已修（2026-08-15 ql-20260815-011-66ac）：① verify --done 加 module-impact 死信探针（**blocking**，gates.js 复用 extractPendingDocSyncRows，pending 行阻断 verify 完成并回滚——死信号从 archive 提前到 verify）；② verify.js 探针段第 6 条措辞从"不符合时标记 ⚠️（不阻断）"改为"当场同步模块文档 + CLI 硬校验无死信"（prompt 镜像已重跑 _extract.mjs）。模块文档**内容**与代码的语义一致性仍属软判定（推 sillyhub/人类），本条只闭合确定性的死信/时序漏洞 | 中（已完成） |
| D-2 | plan 覆盖对账跳过 `.sillyspec/` 文档路径（plan-postcheck.js:695 不传 keepSillyspecDocs，与 apply 阶段口径不一致） | ✅ 已修（2026-08-15 ql-20260815-006-a51d）：`parseDesignCoverageByRepo` 两处 `parseFileChangeList` 补传 `keepSillyspecDocs: true`，`.sillyspec/docs/` 模块文档须被 task `allowed_paths` 认领；`.sillyspec/` 非 docs 子路径仍排除（与 apply 口径一致）；新增 4 测试（test/design-coverage.test.mjs），删 1 个固化旧豁免契约的测试 | 小（quick 已完成） |
| D-2b | 后置 task（T-13~T-17 类"文档同步"任务）无 task 卡即不受审计 | ✅ 已修（2026-08-15 ql-20260815-007-9ced）：`validateBlueprintConsistency` 加 plan.md 声明任务 ↔ tasks/ 卡片双向对账（rule `plan.task-plan-reconciliation`，缺卡/孤儿卡均阻断）；plan-postcheck-cross-repo 场景 8-11 四测试 + rollback 测试 fixture 迁移（不连续→重复 id 触发 Contract） | 中（已完成） |
| D-3 | 仓库根 `docs/` 在 worktree 排除清单（worktree.js:171、worktree-apply.js:480） | ⊘ 2026-08-15 逐行复核后**评估保留，不改码**：排除清单只影响 coarse dirty 判定（防多 agent 下别人改文档误阻断 apply，高频踩坑的合理权衡）；worktree 里改 `docs/` 实际会进 changedFiles（`filterDeliverableFiles` 不排 docs/，worktree-apply.js:405），apply 能带回主仓；重叠场景由 step5a「未提交∩changedFiles 精确点名」兜底（该口径保留 docs/）。初版"文档改动对流程完全不可见"表述过重，据此修正 | 不修（合理权衡） |
| D-4 | archive sync-module-docs 无结果校验（git add 无条件、空集静默通过） | ✅ 部分已修（2026-08-15 ql-20260815-010-7466，窄口径）：归档后 `extractDoneDocTargets` 提取「更新结果」done 行声明的目标文档路径，全路径声明但文件不存在 → warning（假申报嫌疑）。**剩余推语义审查**：「声明 done 但内容实际没改」的 diff 对账是语义判定（apply 期间文档可能已提交，git diff 为空≠没同步），且相对写法 modules/<id>.md 的 project 归属需读 module-map——按定位推 sillyhub/人类，本仓不做 | 窄口径已完成；语义对账不做（定位边界） |
| D-5 | module-impact pending 死信箱（5+ change 带未清 pending 归档且 verify PASS） | ✅ 已修（2026-08-15 ql-20260815-009-b2de）：`archiveChangeDirectory` 移动前加死信校验（`extractPendingDocSyncRows`，只查「更新结果」段表格末列精确 pending/待办/未同步/todo，非零即 exit(1) 阻断归档）。**实况修正**：全量 archive 扫描死信形态仅一种（更新结果表 pending 行）；债单初版说的"change-center-rework 11 处 false"实为矩阵 needs_review 合法字段值非欠账信号。10 单测（test/archive-pending-deadletter.test.mjs） | 中（已完成） |
| D-6 | doc-ref-check 能力未产品化（唯一硬一致性校验只覆盖 dogfood 仓一份文档） | ✅ 已修（2026-08-15 变更 2026-08-15-docs-check-productize，完整流程）：`sillyspec docs check` 命令落地（src/docs-check.js 两层校验 + glob walker 零依赖 + exit 0-1-2 + local.yaml docs-check 段）；dogfood 测试迁移调 runDocsCheck（检测力不降级）；**首次全量扫 docs/ 实证 51 处历史欠账**（architecture-4a.md 等行号漂移），登记待渐进修复——白名单暂维持 platform-interface-map.md 一份 | 中大（已完成） |
| D-7 | scan 文档无刷新生命周期，与手工模块卡双轨 | archive 阶段提示刷新 scan 增量（prompt 级）或合并双轨（需设计） | 大（需设计） |
| D-8 | quick 通道零文档要求（72% 流量、14% 同步率） | ✅ 已修（2026-08-15 ql-20260815-012-f521，用户裁决：打标记显性化）：`auditQuickCompletion` 加 advisory 检测——changedFiles 含源码但无任何文档文件（.md/.yaml/.yml 或 docs/、.sillyspec/docs/ 路径）→ `docSyncHint` + reasons 记「本次未同步模块文档」+ printQuickAuditReview 打一行欠账标记 warn。零阻断零摩擦，欠账可事后审计 QUICKLOG reasons 追溯 | 小（已完成，用户裁决方案） |

## 四、行动裁决（2026-08-15）

- 本文档登记全部缺口，D-1~D-8 待用户裁决优先级。
- exec-g 债条目（prompt-control-debt.md:149）描述已过时（现行 filterDeliverableFiles 已保留 `.sillyspec/docs/`），应销账——本仓 quick 可顺手修。
- docs/sillyspec/ 自身抽查：known-implementation-gaps.md 停 07-16 滞后一个月；interface-contract.md 不在 doc-ref-check 白名单。

## 五、二次实证核验（2026-08-15 15:05，独立会话复核）

初版分析出自双代理并行会话；本节为另一独立会话对关键论据的逐条复核结果，全部属实：

**源码侧（本仓，逐行核对）：**

| 论据 | 核验结果 |
|---|---|
| verify.js 探针 prompt「不符合时标记 ⚠️（不阻断，模块文档可能未及时更新）」 | ✅ 原文在盘（verify.js 设计一致性检查第 6 条） |
| plan-postcheck.js `parseDesignCoverageByRepo` 补传 `keepSillyspecDocs: true`（D-2 修复） | ✅ 已在盘，注释明确标注与 apply 阶段口径一致 |
| worktree.js / worktree-apply.js 排除清单含 `:(exclude)docs/`（D-3） | ✅ 两处排除清单逐字一致，`docs/` 均被排除 |
| `.sillyspec/` 整目录也在排除清单 | ⚠️ 注意：`computeBaselineHash` 排除 `.sillyspec/` 整目录，但 apply 阶段 `resolveApplyAllowSet` 传 `keepSillyspecDocs: true` 保留 `.sillyspec/docs/`——排除口径（hash/dirty 判定）与放行口径（apply 集合）是两套，D-3 分析成立但需注意这个双层结构 |

**sillyhub 侧（multi-agent-platform 仓，重新统计）：**

| 论据 | 初版数字 | 复核数字 | 结论 |
|---|---|---|---|
| quick 条目总数 | 480 | **482**（`## ql-` 标题计数，QUICKLOG-qinyi.md 55 + 其余分日文件） | ✅ 量级成立 |
| 归档 change 无 verify-result.md | 44 | **44** | ✅ 精确一致 |
| daemon src commit vs 模块文档 commit（06-24 起） | 129 : 4 | **135 : 3** | ✅ 比例更悬殊，量级成立 |
| lib-changes.md 仍列已删函数 | createChange/executeChange | ✅ 第 15/18 行原文在盘：`createChange(workspaceId, input)`、`executeChange(workspaceId, changeKey, provider?)`；但第 55 行 08-08 条目已注明 `executeChange` "既有方法不变"——即文档头部 CRUD 清单与尾部变更记录自相矛盾，漂移形态是"新旧记录叠加"而非单纯遗漏 | ✅ 成立，根因归类应属 B+C 混合 |
| frontend/src 源文件数 | 305 | 457（含 .ts/.tsx/.js/.vue 全量） | ⚠️ 初版 305 可能只计某子集；无文档登记比例只会更差，结论方向不变 |

**复核新增观察：**

1. `_module-map.yaml` 之外，`.sillyspec/.runtime/worktrees/perf-remediation/` 里还残留一份**过期副本**的 lib-changes.md——worktree 未清理的文档副本本身就是第三份真相源，加剧漂移。
2. 最新的 2026-08-15-error-message-l10n（246+ 处后端文案改动）已归档且 verify PASS——若其模块文档同步又是"声明完成实际漏同步"，则是 D-4/D-5 的最新活样本，建议裁决时优先核这一单。

**复核结论：初版分析的全部结构性论断成立，无需推翻；量化数字已按复核值修正。**
