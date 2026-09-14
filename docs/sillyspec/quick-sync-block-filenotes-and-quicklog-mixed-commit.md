---
author: qinyi
created_at: 2026-09-14T09:42:27+08:00
---

# quick 记录完整性：ql-ID 分配竞态（双占用）

> 本档是 quick 会话记录面（QUICKLOG / guard.json / 进度库 quicklog_id）完整性问题的知识档。
> 首条：ql-ID 分配竞态根治（ql-20260914-003-4d6c）。后续 quick 记录面修复（如 filenotes
> 阻塞、QUICKLOG 混合提交等）在此追加条目。

## 坑 ql-id-double-occupancy（实证 2026-09-13 ql-20260913-007-1351 双占用）

### 现象

quick 启动预留的 ql-ID 已写入 guard.json 后，并行会话仍分到同一 ID——两会话的
QUICKLOG 条目 / 结果块 / 范围快照（`quicklog/patches/<qlId>.json+.patch`）落在同一
ql-ID 上，记录混写不可分账。

### 机制

分配端（`src/quicklog.js` `allocateQuicklogEntry`）在 per-user 文件锁内
`scanExisting` 扫盘取 `maxSeq+1`，**唯一性依赖 QUICKLOG 条目在盘**。预留 ID 落
guard.json 之后、条目在盘可见之前之外，还有一个持续窗口：

**条目丢失窗口**——QUICKLOG 条目是未提交的本地写，并行会话的 git 操作（checkout /
stash / worktree 分裂合并的文件级覆写等）可把它回滚掉，而 guard.json（.runtime，多为
gitignore 面）与进度库 `changes.quicklog_id` 独立存活。窗口内：

1. 下一个会话分配时盘上 maxSeq 回退 → **同序号复用**（007 再现）；
2. 后缀 XXXX 仅对「盘上当日条目」避让，丢了条目 = 后缀也看不见 → 4-hex 随机再撞上
   即**整 ID 双占用**（1351 再现，2026-06-04 `ql-20260604-001-7a4c` 同款先例）；
3. `--done` 兜底路径（guard 缺失 → 进度库 quicklog_id → `appendQuicklogEntryWithId`
   原号补建）会用**库里的旧 ID** 再落一条——若该 ID 已被他者会话占走，补建加剧混写。

### 护栏（三层，2026-09-14 修复）

| 层 | 位置 | 行为 |
| --- | --- | --- |
| 分配查重 | `allocateQuicklogEntry`（quicklog.js） | maxSeq 取三者最大：盘上严格扫描 / 盘上容错扫描（畸形头双空格、后缀紧贴 `\|`）/ **他者活跃会话 guard 预留**（`collectGuardReservedQuicklogIds`，7 天僵尸不钉号）。候选全 ID 对盘上 usedIds + guard 预留末检，撞则重摇后缀，200 次不中抛错。`sessionsDir` 由 run 层经 `resolveQuickSessionsDir` 传入（平台模式 runtimeRoot 分裂也对齐） |
| 完成校验 | `handleQuickStageCompletion`（complete-handlers.js） | 落最终 ID 前两级：①盘上同 ID 条目 ≥2 → `countQuicklogEntries` 命中即 **fail-closed 硬拦**（记录已损坏，不猜归属，手工去重后重跑）；②他者活跃会话 guard 仍预留同 ID → **换新号完成**（原 ID 让位他者，双方记录不混写），警示输出新旧 ID |
| 记录对齐 | 同上 | 最终 ID ≠ guard.quicklogId（换号/兜底分配路径）时**回写 guard.json**；条目缺失（会话期间丢失）原「硬拦请检查」降为**原 ID 补建自愈**（与 guard 缺失分支同 cure，坑 platform-takeover-phantom-progress-db 分裂形态） |

### 证据

- 实证：2026-09-13 `ql-20260913-007-1351` 双占用（用户报）；历史同款 2026-06-04
  `ql-20260604-001-7a4c`（quicklog.js 文件头注释）。
- 回归：`test/quicklog-ql-id-race.test.mjs` 25 断言——单元（guard 让位/僵尸不钉/畸形头
  容错/计数/采集）+ e2e（双条目硬拦、他者占用换号、条目丢失自愈）。
- `test/quick-cli-managed-e2e.test.mjs` 验收 4 契约随改：删条目 → 原硬拦改自愈补建。

### 残余风险

- 跨 specBase（worktree 各自的 .sillyspec 拷贝）分配互相不可见，本护栏只覆盖同库内；
  合并带回产生的跨库同 ID 双条目由完成校验①兜底（硬拦可见，不再静默混写）。
- guard 预留让位对「同库同 user」由锁+条目天然保证，跨 user 分配仍非互斥——靠 guard
  预留扫描收窄窗口，极端并发（两 user 同时起步且都已越过扫描点）理论可撞序号，完成
  校验②兜底。

## 坑 quick-single-change-auto-link（实证 2026-09-14 误挂他者空骨架变更）

### 现象

quick 启动未显式带 `--linked-changes` 时，进度库里**恰好一个**活跃变更会被无条件自动
关联——ql 任务行写进该变更 tasks.md、QUICKLOG 落关联变更行。多 agent 仓库里「唯一活跃
变更」常是**他者会话遗留**（本次实证：01:28 创建的空骨架，与本任务毫无关系）。

### 机制

`resolveQuickLinkedChanges`（src/run/quick-audit.js）来自 2026-07-02 的 43cf739（修
「quick 静默落 default 变更」），单用户流假设下「1 个活跃变更 = 大概率是它的」——
`if (activeChanges.length === 1) return [activeChanges[0]]`，不看信号、不看 TTY，非交互
环境也一样（≥2 个变更时非交互反而坚持不关联，规则自相矛盾）。连带三个危害：

1. tasks.md 污染（无关任务行成为他者变更唯一任务行）；
2. **误归档**：--done 的 closeQuickLinkedChanges 僵尸清理通道（阶段闸允许 + 60 分钟
   活动窗外 + tasks 全勾即轻量归档）——被挂上的骨架变更三项全中，他者变更被归档掉；
3. 单候选分支还绕过 quick-recommend 的 quick-<hex8> 会话过滤（新 quick 互挂另一活跃
   quick，recommend 注释里记过冒烟实证）。

### 护栏（2026-09-14 修复）

- **信号门控**：单候选也跑 quick-recommend 双信号打分（脏文件×design.md 清单 /
  任务描述×proposal.md 2-gram），`score>0` 才自动关联 + 大声提示（可 `--linked-changes
  none` 重启反悔）；无信号不关联 + 提示。quick-<hex8> 会话行被 recommend 过滤 → 不关联。
- **autoLinked 溯源**：resolver 返回 `{changes, autoLinked}`；command → runStage →
  guard 落 `linkedChangesAuto`；--done 复用 guard 时同步恢复。
- **归档止血**：closeQuickLinkedChanges 对 `linkedChangesAuto` 命中的变更直接 skip
  （「自动关联（信号命中机器猜测，非显式协作声明），不触发自动归档」）——归档是破坏性
  动作，机器猜的关联声明不够格。显式 `--linked-changes` 关联的僵尸清理契约
  （D-002@v1/v2）不变。

### 证据

- 实证：2026-09-14 ql-20260914-002-4670（误挂 2026-09-14-quick-exit-tiered-gates，
  发现于 --cancel 清理前核对）。
- 回归：test/quick-single-change-auto-link.test.mjs 8 用例（resolver 门控 4 + 归档闸
  止血/对照 2 + e2e 自动关联不归档/显式归档照常 2）；既有 quick-close-linked-changes
  契约测试不动。
- 修复前行为可复现：单活跃变更 + 无信号任务描述 → 旧代码直接关联（测试 §1「无信号」
  用例即旧反例）。

### 残余风险

- 修复前启动的存量 guard 无 linkedChangesAuto 字段，按显式关联处理（无法追溯溯源，
  一次性过渡噪音）。
- 信号门控有误报面：任务描述与 proposal 撞 2-gram 仍会自动关联——但归档闸已止住
  破坏性后果，关联本身可 `--linked-changes none` 重启撤销。
