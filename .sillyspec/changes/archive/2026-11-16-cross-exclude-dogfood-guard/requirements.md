---
author: flow-machine-draft
created_at: 2026-11-15T17:47:10.362Z
---
# 需求规格（Requirements）— 2026-11-16-cross-exclude-dogfood-guard

## 功能需求

### FR-01: 跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCrossWorktrees 不再向其 .git/info/exclude 追加 .sillyspec/ 条目

- 必须（MUST）：ensureRepoLocalExclude 的调用点在追加前判定目标仓 `git ls-files .sillyspec` 是否非空——非空（该仓自身跟踪 .sillyspec 内容，sillyspec 自托管/dogfood 形态）则跳过追加，不写 `.git/info/exclude`。

#### 场景：dogfood 仓豁免

Given 跨仓目标仓自身 git 跟踪 .sillyspec/ 下文件（如 sillyspec 主仓）；When execute 启动建跨仓 worktree 走默认仓内落位；Then 该仓 `.git/info/exclude` 不出现 `.sillyspec/` 条目（已存在者不动——幂等语义仅保证不重复，不做清除）。

### FR-02: 宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exclude（既有测试 cross-worktree-placement 断言不回归）

- 必须（MUST）：目标仓 `.sillyspec` 无 git 跟踪内容（普通宿主仓，.sillyspec 纯为跨仓 worktree 落位目录）时，ensureRepoLocalExclude 照旧幂等追加 `.sillyspec/` 条目。

#### 场景：宿主仓不变

Given 跨仓目标仓不跟踪任何 .sillyspec 路径；When 默认仓内落位建 worktree；Then `.git/info/exclude` 含 `.sillyspec/` 条目且幂等（重跑不重复）——既有测试 cross-worktree-placement「缺省落位=仓内」断言保持绿。

### FR-03: 新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支

- 必须（MUST）：cross-worktree-placement.test.mjs 新增用例：fixture 跨仓仓跟踪 .sillyspec 文件 → exclude 不被写入；既有宿主仓用例不改动即覆盖 FR-02。

#### 场景：测试对账

Given 两分支实现完成；When 跑 test/cross-worktree-placement.test.mjs；Then 新增用例与既有用例全绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/cross-worktree-placement.test.mjs「dogfood 仓豁免——目标仓跟踪 .sillyspec 时不追加 exclude」
FR-02: test/cross-worktree-placement.test.mjs「缺省落位=仓内 .sillyspec/.runtime/worktrees（repo-local，FR-01/02）」（既有用例不回归）
FR-03: test/cross-worktree-placement.test.mjs「dogfood 仓豁免——目标仓跟踪 .sillyspec 时不追加 exclude」（同 FR-01 新用例即覆盖）
