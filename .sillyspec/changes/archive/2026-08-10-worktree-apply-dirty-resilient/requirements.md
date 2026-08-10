---
author: qinyi
created_at: 2026-08-10 11:29:04
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| Agent（主控） | 跑 `sillyspec worktree apply/assess`，读 rescue 指令决定是否手动 cp |
| 审查者 | Design Grill 独立子代理 + verify 阶段核对 fail-loud 不变量 |

## 功能需求

### FR-01: dirty 拦截触发 rescue 指令生成

覆盖决策：D-001@v1, D-002@v1

**Given** 主工作区有未提交 dirty（step4.5 `hasUncommittedDirty` 或 step5a `dirty∩changedFiles` 触发拦截）
**When** `applyWorktree(changeName)` 在 step4.5/5a 拦截分支执行
**Then** 调用 `generateRescueCommands` 算出 rescue 指令，写入 `result.rescueCommands`（非 null）并拼进 `result.errors`；拦截决策不变（仍 `if(!checkOnly) return result`，ok=false）

**Given** 未触发 dirty 拦截（主仓干净或 dirty 不交集且不触发 step4.5）
**When** `applyWorktree` 正常返回
**Then** `result.rescueCommands === null`（零回归，error message 不变）

### FR-02: 逐文件安全分类（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）

覆盖决策：D-003@v1, D-004@v1（统一口径）

**Given** changedFile ∈ deletedFiles（worktree 删除，git diff name-status D）
**When** generateRescueCommands 分类
**Then** 输出 `rm "<projectRoot>/<f>"`（DELETE 类）

**Given** changedFile ∈ dirtyFiles（main 工作区未提交，统一口径 tracked-modified∪untracked，排 .sillyspec/ 基础设施 + meta.json）
**When** 分类
**Then** 跳过 cp + warnings 标注"cp 会覆盖未提交工作"（EXCLUDE-DIRTY 类）

**Given** changedFile ∈ hashMismatchFiles（主干已提交推进，step3.5 前移算）
**When** 分类
**Then** 跳过 cp + warnings 引导"先 commit dirty 再正常 apply 走 --3way 合并"（EXCLUDE-MISMATCH 类）

**Given** changedFile 不属上述三类（main 该文件干净）
**When** 分类
**Then** 输出 `cp "<worktreePath>/<f>" "<projectRoot>/<f>"`，路径正斜杠规范化（SAFE-CP 类）

**边界（dirtyFiles 口径对齐 filterDeliverableFiles，Grill 残留 gap 闭环）**
**Given** main 有未提交 dirty `.sillyspec/docs/X`（filterDeliverableFiles 保留的模块文档）+ worktree changedFiles 含同 X + 另一非排除 dirty 共触发 step4.5
**When** 分类
**Then** X 进 dirtyFiles（rescue dirtyFiles 过滤对齐 filterDeliverableFiles，保留 `.sillyspec/docs/`）→ EXCLUDE-DIRTY，不 cp 覆盖未提交模块文档

### FR-03: hashMismatch 前移保证 EXCLUDE-MISMATCH 生效（P0）

覆盖决策：D-004@v1，风险 R-03/R-07

**Given** main 对 fileA 有已提交推进（HEAD:fileA ≠ baseHash:fileA）+ fileB 有未提交 dirty 共触发 step4.5 拦截
**When** step4.5 拦截分支调 generateRescueCommands
**Then** result.hashMismatchFiles 已含 fileA（由 step3.5 前移到 step4.5 之前算好）→ rescue 把 fileA 判 EXCLUDE-MISMATCH，**不输出 cp fileA**（防回退他人已提交推进 = 数据丢失）

**Given** checkOnly 与 real apply 两条路径
**When** step3.5 前移后算 hashMismatchFiles
**Then** 结果与 v1 step5b 原位计算等价（无 git mutation 区间，回归测试锁死）

### FR-04: assess（checkOnly）预览 rescue

覆盖决策：D-002@v1

**Given** agent 先跑 `sillyspec worktree assess <change>` 探路
**When** assessApplyRisk 调 applyWorktree(checkOnly) 且 step4.5/5a 拦截（checkOnly 不短路）
**Then** assessment 透出 checkResult.rescueCommands；index.js assess 打印器输出 rescue 指令（经 reasons 文本 + 结构化段）

### FR-05: rescue 人类可见性（errors 文本主通道 + index.js 结构化打印）

覆盖决策：D-004@v1（撤回 --json 论断）

**Given** rescue 指令已生成
**When** index.js `worktree apply`（:732-737）/ `assess`（:787-790）打印
**Then** rescue 块经 result.errors（apply）/ reasons（assess）文本打印（现有打印器已输出）；额外结构化 `Rescue commands (N safe / M excluded):` 段（新增打印器逻辑，rescueCommands 非空时触发）

### FR-06: step4.5 注释归因补正

**Given** step4.5 注释 :243-245 称"git --3way 对 dirty 树不稳哪怕不重叠是 git 本质限制"
**When** 实证（autocrlf off 时 --3way 不重叠 dirty 树 Applied cleanly）
**Then** 注释补正为"Windows/autocrlf CRLF 副作用，非 git 本质限制；但仓库 CRLF 混用 + 规则 13 Windows 兼容使 fail-loud 仍有据，不放宽"

## 非功能需求

- **兼容性**：Windows/Linux/macOS（规则 13）—— rescue cp 路径正斜杠规范化供 Git Bash；deletedFiles name-status 解析跨模式（native-worktree/in-place）口径一致（execute 实测，requiredEvidence）
- **可回退**：rescue 逻辑 additive + step3.5 前移可逆（还原 step5b），删调用 + 字段 + 前移即完全回退到现状
- **可测试**：generateRescueCommands 纯函数单测四分类；前移等价回归测试；dirtyFiles 对齐 filterDeliverableFiles 测试；applyWorktree 拦截时 rescueCommands 字段非空测试；跨模式 deletedFiles 实测
- **fail-loud 不变量**：step4.5/5a 拦截决策/ok/return 时机零改动（R-01）
- **零回归**：未触发拦截时 rescueCommands=null，apply 行为 100% 不变

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-06 | 方向 A（cp 指令）旁路 git apply，对 CRLF/--3way 怪癖免疫；fail-loud 不放宽 |
| D-002@v1 | FR-01, FR-04 | 实现 2（helper + result.rescueCommands 字段）；assess 也能看 rescue；纯函数可测（注：--json rationale 被 D-004 撤回） |
| D-003@v1 | FR-02 | rescue cp 子集安全边界（排除 dirty∩changed + hashMismatchFiles，deleted 给 rm） |
| D-004@v1 | FR-02, FR-03, FR-05 | Grill 三项修正：hashMismatch 前移（FR-03）+ dirtyFiles 统一口径（FR-02）+ 撤回 --json 走 errors 文本 + index.js 打印（FR-05） |
