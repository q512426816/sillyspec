---
author: qinyi
created_at: 2026-08-10 13:25:00
---

# 模块影响分析（Module Impact）— worktree-apply 抗脏（dirty 拦截时输出逐文件 rescue 指令）

## 变更概述

主仓一有并发 tracked 脏文件，`worktree apply` 全盘失败只能手动 cp（memory 记录复发 3 次）。本变更在保留 step4.5/5a fail-loud 安全边界的前提下，于 dirty 拦截触发时输出逐文件 cp 指令（方案 A），让 agent 不必盲猜。实现路径：纯函数 `generateRescueCommands` + additive `result.rescueCommands` 字段 + step3.5 前移 hashMismatch 计算（Grill P0）+ 统一 dirtyFiles 口径 + index.js 结构化 rescue 打印段。

## 三重交叉验证（真实 > 声明）

| 来源 | 文件列表 |
|---|---|
| 声明范围（design.md §文件变更清单） | src/worktree-apply.js, src/index.js, test/worktree-apply-rescue.test.mjs |
| 任务范围（plan.md tasks） | task-01/02/03→src/worktree-apply.js; task-04→src/index.js; task-05→test/worktree-apply-rescue.test.mjs |
| 真实变更（git diff） | src/worktree-apply.js, src/index.js, test/worktree-apply-rescue.test.mjs |

三者一致，无遗漏、无超范围。

> 注：git diff 同时显示 `.sillyspec/changes/2026-08-10-worktree-apply-dirty-resilient/` 文档目录（本变更的 design/plan/tasks/decisions/requirements/proposal/verify-result）与 `.sillyspec/changes/archive/2026-08-10-review-json-scaffold/`（并发 session 的已归档变更，非本变更）——前者是变更产物，后者是无关并发工作，均不计入模块影响矩阵（非代码模块）。`git log` HEAD（0439792）系并发 session 的 register-stage-review 归档 commit，非本变更。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| worktree | 接口变更 + 逻辑变更 | src/worktree-apply.js, test/worktree-apply-rescue.test.mjs | 新增导出 `generateRescueCommands`（逐文件四分类纯函数：SAFE-CP/EXCLUDE-DIRTY/EXCLUDE-MISMATCH/DELETE）+ `computeRescueDirtyFiles`（统一 dirtyFiles 口径，DRY 复用 filterDeliverableFiles 保留 .sillyspec/docs/）；applyWorktree 返回值新增 additive 字段 `rescueCommands`/`deletedFiles`；step3.5 前移 hashMismatch 计算（Grill P0，baseHash=meta.baseHash，保 step4.5 拦截时 EXCLUDE-MISMATCH 可用）；step2 name-status 扩展判 D 收集 deletedFiles；step4.5/5a 拦截分支接入 rescue（拦截决策零改动，仅 fail-loud 附加 cp 指令）；assessApplyRisk 3 return 透出 rescueCommands；补正 step4.5 注释归因（CRLF 副作用非 git 限制）。新增测试 37 断言（四分类 + P0 时序回归 + 前移等价 + dirtyFiles 口径 + 跨模式 deletedFiles + 零回归） | false |
| cli-entry | 调用关系变更 | src/index.js | `worktree apply`/`worktree assess` 打印器补结构化 rescue 段（additive，gated on rescueCommands 非空）：`🆘 Rescue commands (N safe / M excluded，旁路 git apply，cp 后需手动 sillyspec worktree cleanup ${wtName}):` + 逐行 commands + warnings；errors/reasons 主通道文本保留未被取代 | false |

## 影响类型说明

- **worktree 模块**：接口变更（applyWorktree 返回值新增 2 个 additive 字段 + 新增 2 个 export）+ 逻辑变更（step3.5 前移、step4.5/5a 拦截分支增强）。applyWorktree/assessApplyRisk 签名零变更，对外行为不变（未拦截 rescueCommands===null）。
- **cli-entry 模块**：调用关系变更（index.js 消费 task-03 新增的 result.rescueCommands/assessment.rescueCommands 字段，打印 rescue 段）。纯 additive，rescueCommands===null 时零影响。

## needs_review 判定

- **worktree**：false。本变更影响明确（rescue 逻辑 + additive 字段），fail-loud 不变量经 worktree-apply-uncommitted(5/5)/baseline-clean(3/3)/relax-committed-advance(17/17) 零回归实证。注意：worktree 模块在 `_module-map.yaml` 中既存 `needs_review: true` 是因 src/git-helper.js 待补录（与本变更无关，属 schema_version=2 待办），非本变更引入的复核需求。
- **cli-entry**：false。additive 打印段，仅 rescueCommands 非空触发，3 现有 worktree-apply 测试直调 applyWorktree 不经 index.js CLI 确认无副作用。

## 模块文档同步建议

- `.sillyspec/docs/sillyspec/modules/worktree.md`：applyWorktree 接口表新增 `rescueCommands`/`deletedFiles` 字段说明 + 新增 `generateRescueCommands`/`computeRescueDirtyFiles` 导出行 + step3.5 前移说明；变更索引追加本变更（doc-syncer 角色处理）。
- `.sillyspec/docs/sillyspec/modules/cli-entry.md`：apply/assess 打印器补 rescue 段说明（可选，因 additive）。
- `docs/sillyspec/file-lifecycle.md`：applyWorktree 返回值新增 rescueCommands 字段（additive，不新增运行时文件类型，预计接口表一行）。
- `_module-map.yaml`：无需改 paths（schema_version=1 无 paths 字段）；worktree/cli-entry 模块 status 不变。

## 未匹配文件

无。3 个代码文件全部匹配到已注册模块（worktree / cli-entry）。本变更未触及未注册模块或根级新文件（src/git-helper.js 系既存待补录文件，非本变更引入）。

## 回归与兼容性

- rescueCommands/deletedFiles 均为 additive 字段，现有消费方（machine-interface/formatExecuteSummary）不读即不受影响。
- applyWorktree/assessApplyRisk 签名零变更；hashMismatch 前移语义等价（AC-8 锁死）。
- fail-loud 不变量保留：step4.5/5a 拦截决策/ok=false/return 时机零改动。
- 全可回退：删 generateRescueCommands 调用 + 字段 + step3.5 前移即回到现状。
- npm test 150 文件 ALL PASS（main 工作区，worktree apply 后）+ lint 229 绿。

## 文档同步更新结果（archive step3 doc-syncer 实际写入）

| 目标 | 更新内容 | 状态 |
|---|---|---|
| `modules/worktree.md` | 头部最后更新→2026-08-10 + 最近变更前置本变更；applyWorktree 接口行补 rescueCommands/deletedFiles additive 字段 + step3.5 前移说明；新增 export 行 generateRescueCommands + computeRescueDirtyFiles；变更索引追加本变更 | ✅ 已写入 |
| `modules/cli-entry.md` | 注意事项加 apply/assess dirty 拦截 rescue 打印段说明；变更索引追加本变更 | ✅ 已写入 |
| `_module-map.yaml` | 无需改（worktree needs_review=true 系既存 git-helper.js 待补录，非本变更引入；本变更 needs_review=false） | ⏭️ 跳过 |
| `file-lifecycle.md` | 无需改（本变更不新增运行时文件类型，applyWorktree 非阶段产出文件生命周期） | ⏭️ 跳过 |

人工备注保护：worktree.md / cli-entry.md 均无 `<!-- MANUAL_NOTES_* -->` 标记（schema_version=1 模块卡片），无人工备注需保护。
