---
author: flow-machine-draft
created_at: 2026-10-21T04:01:24.321Z
---
# 需求规格（Requirements）— 2026-10-21-brainstorm-proto-worktree

## 功能需求

### FR-01: 头脑风暴阶段：已注册 worktree（.sillyspec/.runtime/worktrees/<变更名>/ meta.json 登记的 worktreePath）内的源码 Write/Edit 不再被阶段门拦截；主树源码写入维持拦截，且 brainstorm 拦截提示含「变更 key 已出 → worktree create → 进树写原型、文档照常主树」指引

- 必须放行：路径落在已注册 worktree（.sillyspec/.runtime/worktrees/<变更名>/meta.json 的 worktreePath 范围内）的源码 Write/Edit，在任何阶段（brainstorm/plan/verify/(none)）均不得被 worktree-guard 阶段门拦截；主树与非登记路径（含 worktrees 存储区内无 meta 的目录）的拦截必须维持现状；brainstorm 阶段主树拦截提示必须含「变更 key 已出 → sillyspec worktree create <变更名> → 进树写原型、文档照常主树」指引。

#### 场景：brainstorm 期已注册 worktree 内源码写入放行

Given sillyspec.db 有 active change（current_stage='brainstorm'），且 .sillyspec/.runtime/worktrees/<变更名>/meta.json 登记 worktreePath
When shouldBlock({tool:'Write', filePath:<worktreePath>/src/x.js})
Then blocked=false

#### 场景：brainstorm 期主树源码写入拦截且提示含原型协议指引

Given 同上场景
When shouldBlock({tool:'Write', filePath:<主树根>/src/x.js})
Then blocked=true 且 reason 含 worktree create 指引文案

#### 场景：未登记的 worktrees 存储区子路径维持拦截

Given .sillyspec/.runtime/worktrees/<他名>/ 目录存在但无 meta.json
When shouldBlock({tool:'Write', filePath:<该目录>/src/x.js})
Then blocked=true

### FR-02: 已在 worktree 内（含 native-worktree 复用形态）时不重复创建——复用既有（现状核验+测试固化）

- 禁止重建：在 git linked worktree 内调用 worktree create 时，meta 已存在必须幂等返回既有登记（branch/worktreePath/baseHash/mode），禁止重新 overlay baseline 或重建；meta 缺失必须仅恢复 meta 引用，禁止触碰文件系统。

#### 场景：linked worktree 内 create 幂等复用

Given cwd 位于 git linked worktree 且该变更名的 meta.json 已登记（native-worktree 形态）
When 再次 wm.create(<变更名>)
Then 返回值与既有 meta 一致（branch/worktreePath/baseHash/mode），不发生 overlay/重建

### FR-03: 变更 key 产生后建的 worktree，后续 run execute 幂等复用不重建（现状核验+测试固化）

- 必须复用：run execute 遇该变更已登记 worktree 时必须复用既有（不重建、不重新 overlay）；该语义提取为 WorktreeManager.ensure（meta 命中→返回既有并标 existing=true；未命中→create 并标 existing=false），stage.js execute 分支改走该入口且日志行为与现状等价。

#### 场景：ensure 幂等

Given worktree meta 已登记
When 连续两次 wm.ensure(<变更名>)
Then 两次均返回既有登记（existing=true、baseHash 不变），不触发 create 重建路径

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/worktree-guard.test.mjs「brainstorm 期已注册 worktree 内源码写入放行 + 主树拦截提示含原型协议指引 + 未登记存储区仍拦」
FR-02: test/worktree-native-overlay.test.mjs「linked worktree 内 create：meta 已存在幂等复用」
FR-03: test/worktree-ensure-idempotent.test.mjs「ensure：meta 已存在幂等返回既有不重建」
