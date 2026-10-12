---
author: flow-machine-draft
created_at: 2026-10-12T07:30:47.669Z
---
# 需求规格（Requirements）— 2026-10-12-close-trace-freeze-integrity

## 功能需求

### FR-01: 轻量道收口冻结面剔除 .sillyspec/changes/ 全子树（对齐 execute --done 沉淀资产面）

- 必须：flow done 冻结面（change-patch.json 顶级 files[]/totals 与 change.patch 正文）必须只含交付面——非 `.sillyspec/` 文件 + `.sillyspec/docs/` 交付文档；`.sillyspec/changes/**`（含本变更目录的提交面条目与工作树件）禁止进入。scopeAudit.rows 既有口径（filterDeliverableFiles）不变。
- 必须：可归属文件面为空时保留显式提示（「无交付面改动」），不落伪完整件。

#### 场景：thin 归档工件不入 patch

Given 变更目录有 design/requirements/tasks/proposal/review 五工件且无其他交付改动 / When flow done / Then change.patch 不含任何 `.sillyspec/changes/` 路径，输出「可归属文件面为空」类显式提示。

#### 场景：.sillyspec/docs 交付文档保留

Given baseline..HEAD 提交含 `.sillyspec/docs/x.md` 与本变更目录工件 / When flow done / Then files[] 含 `.sillyspec/docs/x.md`、不含本变更目录路径。

### FR-02: 会话专属 worktree 冻结完备性守卫（孤儿提交阻断）

- 必须：flow done 运行于会话专属 worktree（`.sillyspec/.runtime/worktrees/<change>` 路径判定同 gate-snapshot）时，必须扫描本 worktree HEAD reflog 中不在 HEAD 祖先链、且触及交付面文件的提交（patch-id 与 baseline..HEAD 提交重复者视为已覆盖，剔除）；存在未覆盖提交时必须阻断收口（exit≠0、patch 子步标记不落 done），输出处置三选一指引。
- 必须：`--accept-orphan-face` 显式放行并留痕（缺口数随 change-patch.json acceptedOrphanFace 字段落档）。
- 禁止：共享主仓（非会话专属 worktree）路径启用 reflog 扫描（他侧会话 reflog 污染误报）。

#### 场景：孤儿实现提交阻断

Given 会话 worktree 内实现提交在 HEAD 祖先链外（分支 reset/detach 提交形态）且触及 src/a.js / When flow done / Then 收口阻断并列出文件与提交，提示 rebase/cherry-pick 到 HEAD、删除放弃、或 --accept-orphan-face 三选一。

#### 场景：amend/rebase 等价重复不误报

Given 会话 worktree 内发生过 amend/rebase，reflog 残留旧提交但 patch-id 与 baseline..HEAD 某提交相同 / When flow done / Then 不阻断（等价内容已覆盖）。

### FR-03: worktree apply 后归档锚点回写（主仓可解析）

- 必须：提供 `reAnchorChangePatch` 能力：change-patch.json 的 baseline/head（及 scopeAudit.baseAnchor）在主仓不可解析时，按提交主题含变更名的归属约定（`git log --all --grep`）推导主仓侧锚点区间，回写顶级 baseline/head/scopeAudit.baseAnchor、以主仓锚点重生成 change.patch 并重锚 patchSha256；原 worktree 锚保留为 worktreeBaseline/worktreeHead 溯源字段。
- 必须：`sillyspec worktree apply` 成功尾声自动尝试回写（best-effort，失败仅警告）；doctor 归档完整性检查新增锚点悬空检测（报 offender 并指路修复命令）。
- 必须：顶层命令 `sillyspec patch-reanchor --change <名>` 提供人工修复入口；幂等（锚点已可解析时 no-op）。
- 禁止：锚点推导不唯一/不可信（找不到归属提交或区间不一致）时改写——fail-closed 返回失败原因。

#### 场景：平台仓 ws-ref 类悬空锚回写

Given 归档 change-patch.json 记 head=40622e03 在主仓不可解析，主仓存在主题含该变更名的提交链（实现+锚点+归档三笔）/ When patch-reanchor / Then baseline 回写为首笔^、head 回写为末笔，change.patch 按主仓区间重生成，重跑 no-op。

#### 场景：锚点已可解析 no-op

Given change-patch.json head 在主仓可解析 / When patch-reanchor / Then 零改动返回 noop。

### FR-04: 既有测试面全绿，新增直测覆盖上述三组行为

- 必须：本仓全部既有测试零失败；新增三组直测（冻结面口径/孤儿守卫/锚点回写）覆盖上述行为句。
- 禁止：为过门改既有断言语义（口径变更处同步改测试时须在提交信息说明对齐依据）。

#### 场景：主路径

node --test 全量跑绿（收口时 CLI 亲测为准）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/close-trace-freeze-integrity.test.mjs「flow 冻结面剔除 .sillyspec/changes 子树保留 docs 交付」+「工件-only 面输出空面提示不落 patch」
FR-02: test/close-trace-freeze-integrity.test.mjs「孤儿提交触及交付面阻断收口」+「patch-id 等价重复不误报」+「--accept-orphan-face 放行留痕」
FR-03: test/patch-reanchor.test.mjs「悬空锚按归属提交回写并重冻 patch」+「锚点可解析时 no-op」+「无归属提交 fail-closed」
FR-04: test/close-trace-freeze-integrity.test.mjs + test/patch-reanchor.test.mjs 全量 + 既有面（filter-committed-face/close-trace-unified/flow-parity/cross-repo-patch-freeze）同步口径后全绿
