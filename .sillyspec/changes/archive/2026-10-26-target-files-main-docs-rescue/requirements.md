---
author: flow-machine-draft
created_at: 2026-10-28T00:26:52.805Z
---
# 需求规格（Requirements）— 2026-10-26-target-files-main-docs-rescue

## 功能需求

### FR-01: worktree 形态声明主仓治理文档经主仓实际改动面救赎命中，missing 清零且 undeclared 不扩（新测试①②绿）

- 必须：target_files 对账（reconcileTargetFiles）在 actual.form === 'worktree' 且声面含 `.sillyspec/` 前缀治理路径时，以主仓治理面（主仓 `git status --porcelain -uall -- .sillyspec/`（未提交）∪ `git diff --name-only <baseAnchor>..HEAD -- .sillyspec/`（已提交））对「声明而 missing」的路径做救赎——命中则计入 matched，missing 清零。
- 必须：救赎只对已声明的治理路径生效，禁止把主仓治理面上未声明的文件扩进 matched/undeclared 面（不扩 undeclared 面，与近窗救赎同语义）。
- 必须：救赎命中时 notes 披露一行「主仓治理文档救赎：N 个……」。

#### 场景：主路径（未提交臂）

- Given 真 linked worktree 上有本变更 src 交付提交，主仓侧有一张未提交的新建模块卡，target_files 声明该卡路径
- When reconcileTargetFiles 对账
- Then 该路径经主仓 status 臂救赎命中，missing 清零，notes 带救赎披露，undeclared 面不变。

#### 场景：已提交臂

- Given 主仓治理文档已在 baseline..HEAD 间提交（worktree 与主仓均不可见为未提交态）
- When reconcileTargetFiles 对账
- Then 该路径经 baseline..HEAD diff 臂救赎命中。

### FR-02: 主仓无改动时不虚造 matched（missing 如实在场，新测试③绿）

- 必须：主仓治理面无该声明路径的真实改动时，救赎不生效——该路径保持 missing 判定，禁止虚造 matched（救赎只对真实改动面生效）。
- 必须：主仓治理面读取失败（git 异常）时 fail-open 走既有 missing 判定，不新造阻断。

#### 场景：主路径

- Given worktree 形态、声明了主仓 .sillyspec/ 路径，但主仓侧无该文件任何改动
- When reconcileTargetFiles 对账
- Then 该路径如实 missing（假红方向保留——救赎不掩盖真缺产物）。

### FR-03: 受影响面 verify-postcheck 关联套件 25/25 绿 + lint 1087 文件绿

- 必须：新回归测试文件 test/target-files-main-docs-rescue.test.mjs 四用例（救赎命中/已提交臂/无改动不虚造/test:core 清单驻留）全绿，且文件登记进 package.json test:core（防移出日常拦截面）。
- 必须：受影响面（verify-postcheck 关联 agent-gate-hardening/audit-fixes-batch/backlog-batch-b/c/back-repo-verify/deps-cwd-prefix 等）25/25 绿；lint 全仓通过（未引用导出 0 项）。

#### 场景：主路径

- When 跑新测试文件与受影响面套件及 npm run lint
- Then 全绿（测试 29 例、lint 1087 文件、未引用导出 0）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/target-files-main-docs-rescue.test.mjs「① 主仓未提交模块卡编辑 → 救赎命中：missing 清零 + notes 披露 + undeclared 不扩」
FR-01: test/target-files-main-docs-rescue.test.mjs「② 主仓已提交治理文档（baseline..HEAD）→ diff 臂同样救赎」
FR-02: test/target-files-main-docs-rescue.test.mjs「③ 主仓侧无该改动 → 不虚造 matched（missing 如实在场）」
FR-03: test/target-files-main-docs-rescue.test.mjs「④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）」
