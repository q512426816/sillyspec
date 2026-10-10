---
author: t
created_at: 2026-10-10T19:10:00.000Z
---
# 需求规格（Requirements）— 2026-10-10-cross-repo-patch-freeze

> FR 覆盖 decisions D-001@v1（FR-01~02）/ D-002@v1（FR-03~04）/ D-003@v1（FR-05~06）。

## 功能需求

### FR-01: 跨仓 diff 正文收口冻结（repos[].patch）
覆盖决策：D-001@v1
- 必须：收口时点（execute --done 与 flow done 两通道）对 design 清单跨仓声明涉及的每个已注册仓，将其实际改动 diff 正文冻结进 change-patch.json `scopeAudit.repos[].patch`，并同件落 `patchSha256`（sha256(patch 正文按 \n 归一后 utf8)）。
- 必须：patch 采集窗口与该仓行数采集窗口同根同窗（A 档 reviews-range / B' 档 worktree-baseline 用锚 hash 为 baseRef；B 档 HEAD~1 窗口用字面 `HEAD~1`、C 档未提交窗口用字面 `HEAD`，工作树口径含 untracked 自拼 hunk）。
- 禁止：diff 采集失败或窗口为空时落伪 patch——必须 `patch: null` + `patchSha256: null`（与行数 null 降级档同哲学）。

#### 场景：跨仓已提交改动冻结
- Given design 声明 repo:urgent 的 src/a.java 且 urgent 仓 base..HEAD 有该文件提交
- When 收口（任一通道）collectPatch
- Then scopeAudit.repos[] urgent 条目 patch 含 `diff --git a/src/a.java` hunk，patchSha256 与正文一致

#### 场景：跨仓未提交改动冻结（C 档）
- Given urgent 仓仅工作树未提交改动（无可用 reviews/worktree 锚）
- When 收口 collectPatch
- Then patch 以 `HEAD` 为基点含未提交 hunk；repos[].anchor.source='head-uncommitted-window'

### FR-02: patch 采集 fail-soft 不阻断
覆盖决策：D-001@v1
- 必须：单仓 git diff 失败只落该仓 `patch: null`，禁止阻断收口流程或翻转 patchStatus 顶级键。
- 必须：跨仓 patch 采集任何异常不得影响主仓 change.patch/change-patch.json 顶级面落盘。

#### 场景：跨仓 diff 失败
- Given urgent 仓 core.bare 误写 true 使 git diff 报错
- When 收口
- Then urgent 条目 patch=null、patchSha256=null、degradedReason 留痕；主仓两件照常落盘

### FR-03: 轻量道跨仓行真实三态
覆盖决策：D-002@v1
- 必须：flow done 收口对 design 清单带 repo 的声明条目，按 local.yaml repos 注册表在该仓取 actual（collectRepoActual 共享内核），产出真实三态行（planned/unplanned/untouched + 实 +/- 行数 + crossRepo 标记），禁止恒补 `untouched ⊘`。
- 必须：降级仓（未注册/路径不可达/git 双源失败）退 ⊘ untouched 形态且 repos[] 条目带 degradedReason（诚实「未对账」留痕，与 heavy 通道降级语义同款）。
- 必须：对账调用任何异常 fail-soft 退现行为（⊘ untouched 补行），禁止阻断 flow done。

#### 场景：跨仓实改不再谎报
- Given 轻量变更 design 声明 repo:frontend 的 src/b.vue 且 frontend 仓该文件有提交
- When flow done
- Then scopeAudit.rows 含 { path: 'src/b.vue', verdict: 'planned', additions>0, crossRepo: 'frontend' }，repos[] 有 frontend 锚点与 patch

#### 场景：降级仓诚实留痕
- Given design 声明 repo:ghost（未注册）
- When flow done
- Then 该声明行 verdict='untouched'、crossRepo='ghost'；repos[] ghost 条目 degraded=true + degradedReason 含「未在 local.yaml repos 注册」

### FR-04: heavy/thin 同源单一实现
覆盖决策：D-002@v1
- 必须：跨仓对账+patch 冻结集成逻辑收敛单导出函数（scope-audit.js `reconcileCrossRepoPlan`），computeFullFlowAudit 与 flow.js 同源消费，禁止两份口径实现。

#### 场景：同源消费
- Given 同一仓面与声明面
- When 分别经 execute --done 与 flow done 收口
- Then 两通道 repos[] 条目结构一致（key/repoPath/anchor/totals/degraded/degradedReason/patch/patchSha256）

### FR-05: 顶级面与单套纪律零回归
覆盖决策：D-003@v1
- 必须：change-patch.json 顶级 `files[]/totals/note/moduleScope/patchSha256/patchStatus` 口径不变（files[]/totals 仍为主仓实改投影，projectTraceFaceRows 不动）；`change.patch` 仍为主仓单件。
- 必须：收口留痕仍只写 change.patch + change-patch.json 两件，不新增文件族。

#### 场景：单仓变更零行为
- Given 无跨仓声明的变更（本仓 dogfood 即是）
- When 收口
- Then scopeAudit 无 repos 键（thin）/ 行为与现状逐字节等价，console 无跨仓摘要行

### FR-06: 读方与平台消费面兼容
覆盖决策：D-003@v1
- 必须：scopeAudit.repos[] 纯增量键（thin 从无到有、heavy 增 patch/patchSha256 两键），fr-index/knowledge-graph/flow 漂移检测/verify 漂移对比等既有读方零改动零回归。

#### 场景：旧读方面对增量键
- Given 存量归档 + 新收口件混存
- When verify 漂移对比与 fr 索引构建
- Then 行为与现状一致（增量键被忽略或透传，无 TypeError 面）

## 非功能需求
- 兼容性：无跨仓声明的变更（绝大多数）收口行为零变化；单套两件纪律、sha256 锚链、读侧兼容链全部不动。
- 可回退：跨仓对账/patch 采集全链 fail-soft，异常即退现行为（⊘ untouched + 主仓面照常）。
- 可测试：新测试文件独立可跑（node:test + 真实 git fixture，对齐 cross-repo-reconcile-baseline-anchor.test.mjs 范式）；Windows/Linux/macOS 路径与换行兼容（patch 正文 sha256 按 \n 归一）。
- 体积风险已防：binary 文件 hunk 折叠为 marker 行、patch 按声明/实际文件面过滤（buildFrozenPatch 既有能力），JSON 内嵌体积有界。

## 测试绑定（每条 FR 至少一行）

FR-01: test/cross-repo-patch-freeze.test.mjs「跨仓已提交/未提交改动 patch 冻结 + sha256 锚」
FR-02: test/cross-repo-patch-freeze.test.mjs「diff 失败 fail-soft patch=null 主仓面照常」
FR-03: test/cross-repo-patch-freeze.test.mjs「实改真实三态 + 降级仓诚实留痕 + 异常退 ⊘」
FR-04: test/cross-repo-patch-freeze.test.mjs「reconcileCrossRepoPlan 结构契约（两通道同源断言同函数）」
FR-05: test/close-trace-unified.test.mjs 既有断言全绿（顶级面/单套纪律回归钉）+ test/cross-repo-patch-freeze.test.mjs「无跨仓声明零行为」
FR-06: 既有测试面（close-trace-unified / cross-repo-* / worktree-isolation）全绿为证
