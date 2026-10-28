---
author: flow-machine-draft
created_at: 2026-10-28T05:46:49.189Z
---
# 需求规格（Requirements）— 2026-10-28-cp-review-debt

## 功能需求

### FR-01: 嵌套产物目录（packages/x/node_modules、深层 dist 等）不进快照且不计体积护栏（两侧同口径，测试断言）

- 硬排除的 reset 收窄与体积护栏的 JS 过滤**必须**同口径（任意深度目录段）：`git reset` pathspec **必须**用 `:(glob)**/<dir>` 形态覆盖嵌套目录，体积护栏 `isHardExcluded` 维持任意深度段判定；嵌套产物目录（如 `packages/x/node_modules/y.js`）**禁止**进快照树且**禁止**计入护栏累计。

#### 场景：monorepo 嵌套产物

- Given：临时仓无 .gitignore（fixture 默认），存在 `packages/x/node_modules/big.js`（超小护栏阈值的体量）与 `apps/web/dist/a.js`
- When：createCheckpoint（maxUntrackedMB 极小）
- Then：kind=created（护栏不计嵌套产物）、快照树不含这两个嵌套路径

### FR-02: change-delete 在 ref 删除失败（update-ref 被锁占位）时仍完成删除主流程，警告留痕（测试断言）

- ref 删除失败（update-ref -d 被锁文件占位模拟）时 change-delete --confirm **必须**照常完成删除主流程（DB 翻 deleted、目录移除、ok:true），并**必须**在 warnings 留痕（含可手删 ref 的指引）；**禁止**因 ref 清理失败阻断或回滚删除。

#### 场景：锁占位失败臂

- Given：变更已有存档链，`.git/refs/sillyspec/checkpoints/<change>.lock` 占位使 update-ref -d 失败
- When：deleteChange confirm:true
- Then：ok:true、dir_removed、warnings 含「影子存档 ref 删除失败」

### FR-03: 存档链内校验不再受列表截断影响（独立无上限扫描；显示面截 200 保留并注明全量走 git 直查）

- restoreCheckpoint 的链内 SHA 校验**必须**走独立无上限扫描（subject 前缀过滤全链），**禁止**复用带 `-n 200` 截断的显示列表；listCheckpoints 显示面**可以**保留 200 条帽，CLI 列链输出**必须**注明超帽全量可走 git 直查。

#### 场景：截断解耦

- Given：任一存档链（含仅数档的常规链）
- When：restoreCheckpoint 校验
- Then：链内任意 SHA（含显示帽之外的档）校验通过；链外 SHA（如主历史普通提交）仍拒绝

### FR-04: 既有 shadow-checkpoint 测试面零回归，零新依赖

- 既有 test/shadow-checkpoint.test.mjs 全部用例**必须**保持通过；实现**禁止**新增 npm 依赖。

#### 场景：回归

- Given：本变更交付后
- When：跑 shadow-checkpoint 全套 + change-delete 回归
- Then：全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/shadow-checkpoint.test.mjs「嵌套产物目录任意深度排除（快照树不含且护栏不计）」
FR-02: test/shadow-checkpoint.test.mjs「ref 删除锁占位失败不阻断 change-delete 且警告留痕」
FR-03: test/shadow-checkpoint.test.mjs「链内校验解耦显示截断（独立扫描，链外仍拒）」
FR-04: test/shadow-checkpoint.test.mjs「全套回归（48+ 新增用例全绿）」+ test/change-delete.test.mjs 既有 8 用例零回归
