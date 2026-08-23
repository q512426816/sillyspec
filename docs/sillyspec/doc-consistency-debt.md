---
author: qinyi
created_at: 2026-08-15 14:48:00
updated_at: 2026-08-18 02:10:00 +08:00
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
| plan | hybrid（有硬门但**把文档路径排除在外**） | TaskCard allowed_paths / design §6 覆盖对账是 enforced（plan-postcheck.js:807-1211, 910-1211），但 `parseDesignCoverageByRepo`（plan-postcheck.js:721）调 `parseFileChangeList` **不传 keepSillyspecDocs**，change-list.js:276/238 默认跳过所有 `.sillyspec/` 路径——design 里声明的模块文档更新**不参与覆盖对账**，没有 task 被强制认领。对比 apply 阶段 resolveApplyAllowSet（worktree-apply.js:216-219）反而传了 keepSillyspecDocs: true——plan 放、apply 收，口径不一致 |
| execute | 无覆盖 + 倒退 | 仓库根 `docs/` 在 worktree baseline/dirty 排除清单里（worktree.js:1324、worktree-apply.js:405），文档目录被定性为"非代码交付物 churn"，多 agent 场景下文档改动对流程不可见；module-impact 更新 prompt 自认"可选不阻断"（execute.js:920-926） |
| verify | **明示不阻断** | verify.js:137 原文"不符合时标记 ⚠️（不阻断，模块文档可能未及时更新）"——工具自己把文档滞后合法化为常态；测试对账 enforced、文档一致性 advisory（verify-postcheck.js:995-1177 四探针全 advisory） |
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
| D-2 | plan 覆盖对账跳过 `.sillyspec/` 文档路径（plan-postcheck.js:721 不传 keepSillyspecDocs，与 apply 阶段口径不一致） | ✅ 已修（2026-08-15 ql-20260815-006-a51d）：`parseDesignCoverageByRepo` 两处 `parseFileChangeList` 补传 `keepSillyspecDocs: true`，`.sillyspec/docs/` 模块文档须被 task `allowed_paths` 认领；`.sillyspec/` 非 docs 子路径仍排除（与 apply 口径一致）；新增 4 测试（test/design-coverage.test.mjs），删 1 个固化旧豁免契约的测试 | 小（quick 已完成） |
| D-2b | 后置 task（T-13~T-17 类"文档同步"任务）无 task 卡即不受审计 | ✅ 已修（2026-08-15 ql-20260815-007-9ced）：`validateBlueprintConsistency` 加 plan.md 声明任务 ↔ tasks/ 卡片双向对账（rule `plan.task-plan-reconciliation`，缺卡/孤儿卡均阻断）；plan-postcheck-cross-repo 场景 8-11 四测试 + rollback 测试 fixture 迁移（不连续→重复 id 触发 Contract） | 中（已完成） |
| D-3 | 仓库根 `docs/` 在 worktree 排除清单（worktree.js:1517、worktree-apply.js:40） | ⊘ 2026-08-15 逐行复核后**评估保留，不改码**：排除清单只影响 coarse dirty 判定（防多 agent 下别人改文档误阻断 apply，高频踩坑的合理权衡）；worktree 里改 `docs/` 实际会进 changedFiles（`filterDeliverableFiles` 不排 docs/，worktree-apply.js:40），apply 能带回主仓；重叠场景由 step5a「未提交∩changedFiles 精确点名」兜底（该口径保留 docs/）。初版"文档改动对流程完全不可见"表述过重，据此修正 | 不修（合理权衡） |
| D-4 | archive sync-module-docs 无结果校验（git add 无条件、空集静默通过） | ✅ 部分已修（2026-08-15 ql-20260815-010-7466，窄口径）：归档后 `extractDoneDocTargets` 提取「更新结果」done 行声明的目标文档路径，全路径声明但文件不存在 → warning（假申报嫌疑）。**剩余推语义审查**：「声明 done 但内容实际没改」的 diff 对账是语义判定（apply 期间文档可能已提交，git diff 为空≠没同步），且相对写法 modules/<id>.md 的 project 归属需读 module-map——按定位推 sillyhub/人类，本仓不做 | 窄口径已完成；语义对账不做（定位边界） |
| D-5 | module-impact pending 死信箱（5+ change 带未清 pending 归档且 verify PASS） | ✅ 已修（2026-08-15 ql-20260815-009-b2de）：`archiveChangeDirectory` 移动前加死信校验（`extractPendingDocSyncRows`，只查「更新结果」段表格末列精确 pending/待办/未同步/todo，非零即 exit(1) 阻断归档）。**实况修正**：全量 archive 扫描死信形态仅一种（更新结果表 pending 行）；债单初版说的"change-center-rework 11 处 false"实为矩阵 needs_review 合法字段值非欠账信号。10 单测（test/archive-pending-deadletter.test.mjs） | 中（已完成） |
| D-6 | doc-ref-check 能力未产品化（唯一硬一致性校验只覆盖 dogfood 仓一份文档） | ✅ 已修（2026-08-15 变更 2026-08-15-docs-check-productize，完整流程）：`sillyspec docs check` 命令落地（src/docs-check.js 两层校验 + glob walker 零依赖 + exit 0-1-2 + local.yaml docs-check 段）；dogfood 测试迁移调 runDocsCheck（检测力不降级）；**首次全量扫 docs/ 实证 51 处历史欠账**（architecture-4a.md 等行号漂移），登记待渐进修复——白名单暂维持 platform-interface-map.md 一份。**D-6 后续两落地（2026-08-15 ql-20260815-015-d4af / ql-20260815-016-dc33）**：① 无 local.yaml 裸跑必崩修复（readDocsCheckConfig 回退 {paths:null} 穿透解构默认值）；② 活文档欠账清零——71 处真欠账逐条校准 + 历史评审快照 39 处冻结进 local.yaml skip（快照是历史记录，改行号反而失真），全仓绿（273 引用/155 关键词断言）；③ quick --done 接入 docs check advisory（docsCheckHint 模式，只归因本次 changedFiles 的 .md 不扫存量）——欠账从"只涨不跌"变"落地即报"。**待办**：`--fix` 建议行号（失效报告附候选行号供确认，不自动改） | 中大（已完成+两后续） |
| D-7 | scan 文档无刷新生命周期，与手工模块卡双轨 | ✅ 部分已修（2026-08-15 ql-20260815-013，方案 A）：`src/scan-staleness.js` CLI 算 source_commit vs HEAD 漂移事实（≥50 commit / ≥14 天 → stale），brainstorm step2 经 `{SCAN_STALENESS}` 注入一行事实（"不盲信 + 刷新指引"），绿地/unknown/异常全降级不阻断——本仓实测抓到 scan 停 850b485 落后 371 commit / 52 天。设计稿 docs/sillyspec/design-d7-scan-lifecycle.md。**剩余**（第六节重设计方向）：scan 增量刷新 CLI 化（算漂移文件清单注入）+ 双轨合并，长期项 | 部分（漂移信号已落地） |
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

## 六、修法升级：从"提示词劝说"到"CLI 算事实注入"（2026-08-15 用户裁决输入）

> 用户反馈：不要为一点点文档维护走一堆提示词要求，浪费 token。实测现状：五阶段 prompt 内文档相关文字合计约 2400 字符 ≈ 1500 token——**token 浪费不是主要成本，零效果才是**。据此确立修法设计原则，并重新分级 D-1~D-8。

### 设计原则：CLI 算事实、一屏数据替代一段指令

劝说型 prompt 的通病是"讲道理 + 列步骤 + 重复出现在每个阶段"，agent 读三遍也不会做。优雅替代是**把"该更新什么文档"变成 CLI 在 --done / run 时算出来的一条事实**，注入给 agent 的是结论不是要求：

```
[docs-debt] 本 Wave 触及模块 X/Y/Z（git diff × _module-map.yaml 对照，CLI 计算）：
  - lib-changes.md：落 2026-06-24，期间源码 135 commit 未同步  ← 事实
  - api-session.md：本次新增 export，卡内无该符号登记            ← 事实
```

agent 拿到两行事实自己就会去改，不需要"请务必保持模块文档与代码一致，步骤 1…2…3…"那种段落。**原则：凡是 CLI 能用 git diff + module-map 算出来的，一律算出来注入；算不出来的（语义对错）推 sillyhub/人类。**

### 按新原则重分级 D-1~D-8

| # | 原修法 | 升级后 | prompt 增量 |
|---|---|---|---|
| D-8 | 审计打标记 | **纯 CLI**：--done 审计 diff×module-map，往 quicklog 骨架写一行 `[docs-debt]` 标记。不新增任何 prompt | **零** |
| D-4 | archive 对账 | **纯 CLI**：归档前 git diff 对账 module-impact 声明的文档更新，缺则阻断。sync-module-docs step 的劝说 prompt 可**删**（机制替代后文字负增长） | **负** |
| D-5 | pending 死信箱 | **纯 CLI**：module-impact 内 pending 项非零即阻断归档 | **零** |
| D-6 | docs check 命令 | 本来就是机制化方向，file:line 校验全 CLI 算 | **零** |
| D-1 | advisory→blocking 可配置 | 机制化（探针对账声明 vs diff），不改 prompt | **零** |
| D-3 | 排除清单放开 | 纯代码改动 | **零** |
| D-2b | ~~prompt+校验~~ | **降级/重设计**：校验保留（文档同步任务必须有 TaskCard——这是硬校验），但"要求写 TaskCard"的 prompt 劝说删除，改为 plan --done 时 CLI 发现 design §6 声明了文档更新但无 task 认领即阻断（D-2 修复后这条链已通，**无需新增 prompt**） | **零** |
| D-7 | ~~archive 提示刷新 scan（prompt 级）~~ | **重设计**：不靠提示。scan 增量刷新本身可 CLI 化（对比上次 scan 快照与当前文件树，算出漂移文件清单注入）；"合并双轨"仍是需设计的长期项 | **零** |

### 净效果

- **全量修完后 prompt 文字负增长**：可删 execute "module-impact 更新（可选不阻断）"段、verify 第 6 条劝说、archive sync-module-docs 步骤说明——约回收 800+ 字符，新增注入块全部是 CLI 生成的运行时事实（按需出现，无文档债时零输出）。
- 判断一个修法是否优雅的试金石：**改动落点是 `src/stages/*.js` 的 prompt 字符串，还是 `src/` 的计算逻辑**。前者是往劝说的坑里继续堆，后者才是工具该干的事（SillySpec 定位=确定性校验，语义判定推 sillyhub）。

## 七、收手线与 gate 落地（2026-08-15 晚裁决）

用户质疑「这套是不是太复杂了、实际意义大吗」后确立收手线——目标从「文档永远新鲜」（做不到）退为「漂移可发现 + 清偿便宜 + 过期不被当真 + 欠账不增」，四件事今日全部达成，**此后本线冻结，不再自发加机制**：

- **冻结待验证**：O-1（quick hint 归属精度升级——没人消费的警告不值得打磨精度）、O-2（建议行号内联进 docs-debt）、消费端卡级 staleness 注入。全部等 sillyhub 升级后两周实测：execute agent 看到 [docs-debt] 会不会真的同步卡片？不会则 docs-debt 注入本身砍掉，回退到「硬门 + docs check + gate」三件套。
- **警讯记录**：当需要给「报债的机制」再造「整合信号的机制」（docs-signals 三源一屏设计稿）时，就是机制造多了的证据。D-8 提示本会话触发四次全被忽略，实证「无人消费」。机制自带出错面（docs-debt-inject 归档次日即被复核出裸名归属失配），机制越多数错越难。
- **例外落地（用户裁决「直接做完整的」）**：`sillyspec docs gate` ratchet——唯一被实测证明「立即回本」的机制（docs check 清 110→0 半时）。子命令 + 本仓 `.husky/pre-push` 接线；基线 `.sillyspec/docs-check-baseline`，`--init-baseline` 显式立基线（fail-closed，不悄悄合法化存量），清偿后重跑即下调锁住成果；**behind 计数明确不参与 gate**（源码活跃≠卡错，代理信号的误报会让所有人学会忽略报警）。测试 test/docs-gate.test.mjs 10 用例；接入姿势 interface-contract.md §1.3b（文档引导挂 hook，不往用户仓自动注入）。
  - **⚠ 接线缺陷记录（2026-08-16 发现，同日修复）**：cff7479 落地时**漏了 index.js 的 `docs gate` CLI 分支**——`.husky/pre-push` 调 `docs gate` 命中的是 usage 分支且 exit 0，第三道关自上线起形同虚设（fail-open 假象：usage 输出被当 gate 通过）。1e370d7 补接线（`--init-baseline`/`--json`，specBase 平台模式优先）。教训：**hook 接线必须验证「拦得住」而非「跑得过」**——上线时只验了 hook 语法没验拦截路径；同类风险点：未来任何「hook 调 CLI 子命令」的接线，上线时手动制造一次失效确认 exit 1。

## 八、后续补登（2026-08-16）

- **scan/modules 产物纳入 docs-check 范围（本仓落地，ql-20260816-004-9afb / 1e370d7）**：`.sillyspec/docs/`（scan 7 文档 + modules 卡片）此前游离缺省范围（`docs/**`）外——dry-run 实测 24 处失效（W6 barrel 重构后 `run.js:NNNN` 全超界为主因），全部清偿后本仓 local.yaml `docs-check.paths` 纳入 `.sillyspec/docs/**/*.md`，基线维持 0。
  - **✅ 已裁决并落地（2026-08-16，用户裁决「不管新旧，旧的有问题就修」）**：改 CLI 缺省 paths 为 `docs/**/*.md` + `.sillyspec/docs/**/*.md`（`src/docs-check.js` DEFAULT_DOC_PATHS）——存量项目升级后会冒失效数，**按裁决语义这就是该修的文档错，不追责、修掉即对**；gate 是 fail-closed ratchet（只拦增量），存量失效不拦推送但 `docs check` 会如实报告。schema/example 同步（config-schema.js），本仓 local.yaml 的 paths 段删除只留 skip（配 paths 即覆盖缺省，留一条反而收窄回 docs/——实证 321→277 后纠正）。回归测试：缺省范围必扫 `.sillyspec/docs` 且显式 paths 可收窄。
- **docs check token 断言已知局限（观察，不修）**：同一行多引用共享行首 token 断言（文档行首的裸词会被当作该行全部引用的关键词期望，如 CONVENTIONS.md「项目清单声明」行内两个 import 示例引用被要求窗口含 package 清单 token）——keywordAssert 本就是 best-effort 第二层，主校验（存在性+行号界）不受影响，改写文档文字可绕过。不登记 D 条目。
- **scan-staleness 判定语义修正（2026-08-16，ql-20260816-009-fb44）**：D-7 方案 A 落地的 `≥50 commit / ≥14 天 → stale` 把 behind 计数当「文档失效/失真」判据，与第七节「behind 计数明确不参与 gate」原则矛盾——本仓实测平台快照内容与当前结构一致仍被判「可能失真」（404 commit / 53 天），实证误报。修正：status `stale` → `needs-refresh`（语义=该核对/重扫，不是文档判错）；message 明示「落后数≠文档错误，文档引用失效由 docs check 判定」并保留刷新指引；fresh/unknown 文案同步。判定信号分工收敛：**docs-check 失效数 = 文档是否失效（直接信号），behind 计数 = 该不该刷新（提示信号）**。

## 九、交叉审查后续（2026-08-18，ql-20260818-002-1734 / ql-20260818-003-b8c6）

用户质疑「文档实际会腐烂、没有维护入口」后三代理交叉审查（sillyhub 实证 / 消费面盘点 / 反方批判），净结论与落地动作：

- **D-8 落盘假承诺已修（ql-20260818-002-1734）**：docSyncHint/docsCheckHint 原纯 console 打印即丢，「欠账可事后审计 QUICKLOG reasons 追溯」是不实承诺——08-31 裁决将有分子无分母。修法：`completeQuicklogEntry` 加 `auditNotes`，条目尾幂等落「审计：」行；平台 payload 不污染（审计行只进 raw_block）。**两周实测期起算修正：应从 2026-08-17 10:56（sillyhub 全局装 3.26.9）起算，到期 2026-08-31**；有效样本现状：SCAN_STALENESS 1 次真实注入 0 消费、DOCS_DEBT 0 次真实显示（Wave prompt 批量预渲染早于实现，无债可显——结构性盲区，裁决时区分「没机会出现」vs「出现被忽略」）、docSyncHint 本机 0 触发。
- **docs gate 部署 sillyhub 主场（72% 欠账流量仓）**：75 处存量失效全数定性为跨仓引用（`docs/sillyspec/` 整目录 + `sillyspec-tool-side-requirements.md` 进 local.yaml skip；platform_sync.md 人工备注 2 处改写标注跨仓时点），真欠账清零，基线 0 起步，`.git/hooks/pre-push` 接线并实测「拦得住」（坏引用 exit 1）。
- **本仓第三道关 fail-open 已修（同 ql-002）**：`.husky/pre-push` 文件在但 `core.hooksPath` 未设——git 从未调用，lint+test+docs gate 三道关自上线形同虚设（F-1 同型：接线断开未验证拦得住）。`git config core.hooksPath .husky` 接线 + dry-run push 验证触发。
- **消费面盘点结论（供 08-31 后收缩裁决，现在不动）**：scan 7 文档正文零代码级消费（只有 frontmatter source_commit + 存在性）；代码级强消费 = `_module-map.yaml`（prompt 自动注入/docs-debt/quick 审计）+ knowledge INDEX.md（语义解析注入 execute）+ 模块卡（docs-check/verify gate/worktree 交付物三路夹持）。收缩候选（零消费实证）：INTEGRATIONS.md、flows/、glossary.md（standard 档已弃生成）；quick 档核心 4 份清单与真实读者面错配（STRUCTURE 仅 brainstorm 读，TESTING/CONCERNS 仅 verify 读却被 quick 档裁掉）。产品面变更等 A 数据，本仓 dogfood 可先行。
