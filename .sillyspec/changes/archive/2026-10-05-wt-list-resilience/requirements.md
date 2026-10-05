---
author: flow-machine-draft
created_at: 2026-10-05T11:24:54.199Z
---
# 需求规格（Requirements）— 2026-10-05-wt-list-resilience

## 功能需求

### FR-01: 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出

- WorktreeManager.list() 必须对注册表内缺 changeName/branch 字段的 meta 做读侧归一化：changeName 兜底取注册表目录名（create 恒以变更名建目录，目录名即权威事实）、branch 兜底 '-'，使 `sillyspec worktree list` 在注册表含此类 meta 时不崩溃且正常列出。

#### 场景：主路径

- Given: worktree 注册表（.sillyspec/.runtime/worktrees/）含缺 changeName/branch 字段的 meta（实证形态：2026-09-27 e2e 残留的 mode:"native" 件）
- When: 运行 sillyspec worktree list
- Then: 命令正常退出（exit 0），缺字段项以目录名/'-' 列出，无 TypeError

### FR-02: 完整 meta 场景 list 输出不变（changeName/branch 取原值）

- 归一化必须只在字段缺失时兜底：meta 自带合法 changeName/branch 时 list() 返回原值，既有完整 meta 场景输出逐字不变。

#### 场景：主路径

- Given: 注册表含字段完整的 meta
- When: 调 WorktreeManager.list()
- Then: 该项 changeName/branch 与 meta 原值逐字一致

### FR-03: 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态

- 必须有单测锁定两形态：缺字段 meta 的兜底值断言（changeName=目录名、branch='-'）与解析失败 meta 的跳过断言（不进列表、不抛错）。

#### 场景：主路径

- Given: 临时注册表含完整/缺字段/解析失败三类 meta
- When: WorktreeManager.list() 扫描
- Then: 返回 2 项（解析失败项跳过），缺字段项兜底值正确、完整项取原值

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/worktree-list-resilience.test.mjs「缺字段 meta 兜底列出不崩溃（changeName=目录名、branch=-）」
FR-02: test/worktree-list-resilience.test.mjs「完整 meta 原值透传不变」
FR-03: test/worktree-list-resilience.test.mjs「解析失败 meta 跳过不进列表」
