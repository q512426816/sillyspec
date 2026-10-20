---
author: flow-machine-draft
created_at: 2026-10-20T01:54:00.806Z
---
# 需求规格（Requirements）— 2026-10-20-cli-worktree-cwd-anchor

## 功能需求

### FR-01: CLI 入口对 worktree cwd（cwd 或 --dir 命中 worktree 段）：不再 exit 2，改为⚠️警告（变更名/原 cwd/锚定主仓根/逃生门整行）+ 自动把执行目录重锚定到主仓根——命令按主仓口径执行（进度库/变更状态单源）

CLI 入口（src/index.js:401-417 守卫段）在守卫命中时必须（MUST）不再 exit 2：必须（MUST）向 stderr 输出⚠️警告（含变更名、原 cwd、锚定主仓根、逃生门整行 `--allow-worktree-cwd --spec-dir <worktree spec>`），并把执行目录重锚定为 `wtInfo.mainRepoRoot`（后续未初始化门/命令分发按主仓口径进行）；显式 `--spec-dir` 指进**同一 worktree**（未带逃生 flag）时必须（MUST）一并锚定为主仓 `.sillyspec` 并附额外警告行（评审 P2 清偿——否则「已锚定主仓根」半真、写入仍可落副本）；禁止（MUST NOT）在 worktree 副本 .sillyspec 内产生任何进度/状态写入（锚定即单源）。

#### 场景：主路径（status 在 worktree 内）

Given cwd 位于 `.sillyspec/.runtime/worktrees/<change>` 内，主仓根已初始化
When 跑 `sillyspec status`
Then stderr 含锚定警告（变更名+主仓根路径），命令以主仓根为执行目录完成（exit 非 2，输出主仓口径）

#### 场景：--dir 显式指进 worktree

Given `--dir <worktree 内路径>`
When 守卫命中
Then 同款警告+锚定主仓根（显式 --dir 进 worktree 同属误入面；刻意独立实例跑走逃生门）

### FR-02: --allow-worktree-cwd 显式放行语义不变（跳过守卫零警告零锚定）；wt-commit 豁免不变；--dir 显式主仓根不经守卫（本来就命中不了 worktree 段）

`--allow-worktree-cwd` 必须（MUST）完全跳过守卫（零警告零锚定，行为与改动前一致）；`wt-commit` 豁免必须（MUST）不变；`--dir` 指向主仓根时守卫天然不命中（必须保持）。

#### 场景：逃生门零打扰

Given cwd 在 worktree 内且带 `--allow-worktree-cwd`
Then 无锚定警告、无重锚定（命令按 worktree 本地口径跑）

### FR-03: 主仓根 .sillyspec 存在性由后续未初始化门自然判定（锚定后主仓未 init 的极端态走既有出口，不在守卫内重复判）

守卫必须（MUST NOT）自行判定主仓根 .sillyspec 存在性——锚定后主仓未初始化的极端态必须（MUST）交给既有未初始化门（resolveUninitCwdGate）与查询类命令豁免口径自然处理（守卫只做锚定与警告，单一职责）。

#### 场景：主仓未 init 的极端态

Given worktree 存在但主仓根无 .sillyspec
When 跑 `status`（查询类豁免）
Then 锚定警告照常输出，status 按主仓未初始化口径输出（不因守卫新增失败面）

### FR-04: detectCwdInsideWorktree 单元行为不变；既有 worktree-cwd-guard e2e 断言改钉（exit 2 → 锚定警告 + 主仓口径执行）；守卫相关回归全绿

`detectCwdInsideWorktree`（src/run/shared.js:362）单元行为必须（MUST）逐字节不变；test/worktree-cwd-guard.test.mjs 的 e2e 断言必须（MUST）改钉为锚定语义（exit 2 → 非 2 + 警告文案 + 主仓口径），改钉必须（MUST）覆盖：worktree 根/子目录、逃生门、--dir 主仓、wt-commit 豁免五形态；守卫相关回归（引用 detectCwdInsideWorktree/allow-worktree-cwd 的既有套件）必须（MUST）全绿。

#### 场景：改钉五形态

Given worktree-cwd-guard e2e 套件
When 改钉后复跑
Then 单元 2 例 + e2e 5 例全绿（断言语义=锚定而非硬拦）

### FR-05: 本仓 AGENTS/CLAUDE 若述及硬拦行为则同步（查无则记不适用）

本仓 AGENTS.md / CLAUDE.md 若述及 worktree cwd 硬拦行为（exit 2/--allow-worktree-cwd 指引文案）必须（MUST）随锚定语义同步；grep 查无引用时记录（MUST）「不适用：查无述及」于本 FR（2026-10-20 grep '--allow-worktree-cwd' 于 AGENTS.md/CLAUDE.md/.claude/CLAUDE.md 零命中）。

#### 场景：查无即不适用

Given grep 零命中
Then 文档面零改动，本 FR 以不适用记录收口

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/worktree-cwd-guard.test.mjs「cwd 在 worktree 内跑 status → 锚定警告+主仓口径（第一次静默事故的回归改钉）」
FR-02: test/worktree-cwd-guard.test.mjs「逃生门 --allow-worktree-cwd → 零警告零锚定」+「wt-commit 命令豁免」+「--dir 显式主仓不命中」
FR-03: test/worktree-cwd-guard.test.mjs「主仓未 init 极端态（路径结构不可达注记——同态回归钉）」
FR-04: test/worktree-cwd-guard.test.mjs「detectCwdInsideWorktree（判定单元）」+ 守卫引用面回归（lint-ownership-failfast / gate-derive-spec-drift / probe5-worktree-parity 等既有套件复跑）
FR-05: 不适用：文档面查无述及（grep '--allow-worktree-cwd' 于 AGENTS.md/CLAUDE.md/.claude/CLAUDE.md 零命中）——零文档改动，FR 正文已记录查证事实
