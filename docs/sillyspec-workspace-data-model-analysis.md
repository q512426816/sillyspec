# SillySpec 工作区结构与数据流分析报告

> 分析日期：2026-08-24
> 分析范围：.sillyspec/ 目录结构、sillyspec.db 数据库、.sillyspec-platform.json 配置、worktree 沙箱机制、changes/ 变更记录

---

## 1. 顶层目录结构

```
<project-root>/
├── .sillyspec/                        # 规范目录（SPEC_DIR_NAME = '.sillyspec'）
│   ├── .runtime/                      # 运行时数据（权威状态源）
│   │   ├── sillyspec.db               # SQLite 数据库（node:sqlite DatabaseSync）
│   │   ├── sillyspec.db-wal           # WAL 日志（WAL 模式侧车）
│   │   ├── sillyspec.db-shm           # WAL 共享内存
│   │   ├── sillyspec.db.schema-version # schema 版本戳（= 5）
│   │   ├── sillyspec.db.bak           # 损坏恢复备份（回退链第三级）
│   │   ├── audit.log                  # --force 审计日志
│   │   ├── worktrees/                 # git worktree 存储目录
│   │   │   └── <change-name>/         # 每个变更一个 worktree
│   │   │       ├── meta.json          # worktree 元数据
│   │   │       ├── node_modules/      # junction → 主仓 node_modules
│   │   │       └── ...                # 代码副本
│   │   ├── artifacts/                 # 产物目录
│   │   ├── history/                   # 阶段完成历史 JSON
│   │   ├── logs/                      # 日志目录
│   │   └── templates/                 # 模板目录
│   └── changes/                       # 变更记录（文件系统层）
│       └── <change-name>/             # 每个变更一个目录
│           ├── proposal.md            # brainstorm 产物
│           ├── design.md              # plan 产物
│           ├── tasks.md               # plan 任务清单
│           ├── plan.md                # 实现计划
│           └── ...                    # 各阶段产物文件
├── .sillyspec-platform.json           # 平台指针文件（可选，进平台模式后生成）
└── ...                                # 项目源码
```

---

## 2. SQLite 数据库 Schema（sillyspec.db）

数据库位于 `.sillyspec/.runtime/sillyspec.db`，使用 `node:sqlite`（`DatabaseSync`）原生引擎。

### 2.1 PRAGMA 配置

| PRAGMA | 值 | 说明 |
|---|---|---|
| `journal_mode` | WAL | 写前日志模式，支持并发读 |
| `busy_timeout` | 5000ms | 写锁等待超时 |
| `foreign_keys` | ON | 外键级联删除 |
| `synchronous` | NORMAL | WAL 下兼顾安全与性能 |

### 2.2 表结构（6 表 + 4 索引）

#### project（全局单行，id=1）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | INTEGER PK | 1 | 固定主键 |
| `name` | TEXT NOT NULL | — | 项目名（= `basename(cwd)`） |
| `schema_version` | INTEGER | 5 | 与 `DB_SCHEMA_VERSION` 对齐 |
| `created_at` | TEXT NOT NULL | — | ISO 时间戳 |
| `updated_at` | TEXT NOT NULL | — | ISO 时间戳 |

#### changes（变更注册表）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | INTEGER PK AUTO | — | 自增主键 |
| `name` | TEXT UNIQUE NOT NULL | — | 变更标识符（quick=quick-\<hex\>，标准=语义名） |
| `current_stage` | TEXT | 'scan' | 当前活跃阶段指针 |
| `status` | TEXT | 'active' | 'active' 或 'archived' |
| `no_worktree` | INTEGER | 0 | 布尔标志（in-place 模式） |
| `created_at` | TEXT NOT NULL | — | — |
| `last_active` | TEXT NOT NULL | — | 最后活跃时间戳 |
| `isolation_status` | TEXT | — | 平台隔离状态（migration 添加） |
| `isolation_mode` | TEXT | — | 隔离模式 |
| `isolation_reason` | TEXT | — | 隔离原因 |
| `last_synced_platform_ts` | TEXT | — | 平台同步基准时间戳（乐观锁） |
| `last_local_modified_ts` | TEXT | — | 本地脏度标记（NULL=无脏度） |
| `platform_change_id` | INTEGER | — | 平台同步 ID |
| `platform_workspace_id` | INTEGER | — | 平台同步 workspace |
| `platform_last_sync` | TEXT | — | 最后同步展示时间 |
| `platform_sync_enabled` | INTEGER | 0 | 同步启用标志 |
| `title` | TEXT | — | 人类可读中文标题（quick 用） |
| `quicklog_id` | TEXT | — | 关联 QUICKLOG ql-ID |

#### stages（阶段状态）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | INTEGER PK AUTO | — | — |
| `change_id` | INTEGER NOT NULL | — | FK → changes(id) ON DELETE CASCADE |
| `stage` | TEXT NOT NULL | — | 阶段名（scan/brainstorm/plan/execute/verify/archive/quick/explore） |
| `status` | TEXT | 'pending' | pending/in-progress/completed/failed/blocked/waiting/revising/stale |
| `started_at` | TEXT | — | — |
| `completed_at` | TEXT | — | — |
| `revision` | INTEGER | 0 | 修订版本号（migration 添加） |
| `reopened_from_step` | TEXT | — | 重开起点（"index: name" 格式） |
| `reopened_at` | TEXT | — | 重开时间 |
| `stale_reason` | TEXT | — | 失效原因 |

**UNIQUE 约束：** `(change_id, stage)`

#### steps（步骤记录）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | INTEGER PK AUTO | — | — |
| `stage_id` | INTEGER NOT NULL | — | FK → stages(id) ON DELETE CASCADE |
| `name` | TEXT NOT NULL | — | 步骤名 |
| `status` | TEXT | 'pending' | pending/in-progress/completed/failed/blocked/waiting/stale |
| `output` | TEXT | — | 步骤输出内容 |
| `completed_at` | TEXT | — | — |
| `ordering` | INTEGER NOT NULL | 0 | 显示/执行顺序 |
| `wait_reason` | TEXT | — | 等待原因 |
| `wait_options` | TEXT | — | JSON 数组（等待选项） |
| `wait_answer` | TEXT | — | 用户回答 |
| `waited_at` | TEXT | — | 等待时间戳 |
| `wait_answers` | TEXT | — | JSON 数组（可重复等待） |
| `wait_round` | INTEGER | — | 当前等待轮次 |
| `max_wait_rounds` | INTEGER | — | 最大等待轮次 |

**无 UNIQUE 约束** — 通过 `DELETE WHERE stage_id = ? AND name = ?` + 重新 INSERT 实现幂等更新。

#### batch_progress（批量进度）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `change_id` | INTEGER NOT NULL | — | FK → changes(id) ON DELETE CASCADE |
| `total` | INTEGER | 0 | 总数 |
| `completed` | INTEGER | 0 | 已完成 |
| `failed` | INTEGER | 0 | 失败 |
| `skipped` | INTEGER | 0 | 跳过 |

**UNIQUE 约束：** `(change_id)`

#### approvals（审批状态）

| 列 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `change_id` | INTEGER NOT NULL | — | FK → changes(id) ON DELETE CASCADE |
| `status` | TEXT | 'not_required' | not_required/approved/rejected |
| `requested_at` | TEXT | — | — |
| `approved_by` | TEXT | — | — |
| `approved_at` | TEXT | — | — |
| `rejection_reason` | TEXT | — | — |

**UNIQUE 约束：** `(change_id)`

### 2.3 索引

- `idx_changes_current_stage ON changes(current_stage)`
- `idx_changes_status ON changes(status)`
- `idx_stages_change ON stages(change_id)`
- `idx_steps_stage ON steps(stage_id)`

---

## 3. 状态管理模型

### 3.1 核心类层次

```
ProgressManager (src/progress.js)           # Facade 门面，持有 4 个子模块
├── ChangeRegistry (src/progress/change-registry.js)  # changes 表 CRUD
├── StepStore (src/progress/step-store.js)            # stages/steps/batch_progress CRUD
├── StageMachine (src/progress/stage-machine.js)      # 状态转换/显示/下游级联
└── ConsistencyDoctor (src/progress/consistency-doctor.js) # 一致性检查/修复/审计

DB (src/db.js)                              # SQLite 引擎封装（open/init/transaction）
WorktreeManager (src/worktree.js)           # git worktree 生命周期
```

### 3.2 阶段常量

```
VALID_STAGES    = ['scan','brainstorm','plan','execute','verify','archive','quick','explore']
STAGE_ORDER     = ['scan','brainstorm','plan','execute','verify','archive']        # 展示顺序
MAIN_FLOW_ORDER = ['brainstorm','plan','execute','verify','archive']               # 上下游级联（不含 scan）
```

### 3.3 状态转换规则

**Stage 状态流转：**
```
pending → in-progress → completed
                    ↘ → failed
completed → revising（reopenStage 重开修订）
上游修订 → 下游 cascade: completed → stale
```

**Step 状态流转：**
```
pending → in-progress → completed/skipped
         → waiting（等用户输入/决策）
         → failed
         → stale（reopen 时 fromStep 之后标记）
```

### 3.4 关键操作流程

#### initChange
- INSERT `changes` 行（current_stage='scan', status='active'）
- INSERT 8 个 stages 行（全部 pending），通过 `INSERT OR IGNORE`

#### setStage
- UPDATE `changes.current_stage` + `last_active`
- INSERT OR IGNORE stages 行 → UPDATE `stages.status='in-progress'`

#### addStep
- 同事务查重 + INSERT steps 行（ordering = MAX+1）
- UPDATE `changes.last_active`

#### updateStep
- UPDATE steps (status/output)
- **自动完成检测**：当某 stage 所有 steps 都 completed 时 → 过产物校验门 → 自动标记 stage completed

#### completeStage
- 5 层处理：resolve → validate → force → transaction → history
- staleness 拒绝门 + 产物校验门
- 写 history JSON 文件到 `.runtime/history/`

#### reopenStage
- `completed` → `revising`，increment revision
- fromStep 之后：pending/stale
- 下游 stage cascade：completed → stale

### 3.5 本地脏度追踪（D-013）

每次写操作调用 `_touchLocalModified()`，设置 `changes.last_local_modified_ts`。用于：
- 平台同步乐观锁冲突检测
- `import()`（平台 pull）是例外：设为 `pushed_at` 而非 now()

---

## 4. 平台指针机制（.sillyspec-platform.json）

### 4.1 文件结构

```json
{
  "specRoot": "/path/to/shared/spec-dir"
}
```

### 4.2 解析优先级（`resolvePlatformSpecDir()`）

```
1. 显式 --spec-dir > 
2. pointer.specRoot（必须可达）> 
3. resolveSpecDir(cwd)（本地模式）
```

### 4.3 Fail-Closed 语义

- **pointer 存在但失效** → 抛 `PointerUnreachableError`（不静默回退到本地）
- **指针缺失 + 接管声明存在** → 抛 `PlatformManagedError`（防状态分裂）
- **无 pointer** → 纯本地项目，正常解析

### 4.4 防御机制

- pointer.specRoot 指向系统 temp 目录 → 非阻断警告
- 指针损坏（JSON parse 失败）→ fail-closed 抛错
- 指针缺 specRoot 字段 → fail-closed 抛错
- specRoot 路径不存在 → fail-closed 抛错

---

## 5. Worktree 沙箱机制

### 5.1 存储结构

```
.sillyspec/.runtime/worktrees/<change-name>/
├── meta.json          # worktree 元数据（原子写）
├── node_modules/      # junction → 主仓 node_modules（非拷贝）
└── ...                # 代码副本
```

**分支命名：** `sillyspec/<change-name>`

### 5.2 WorktreeManager 核心操作

| 操作 | 说明 |
|---|---|
| `create(changeName)` | 创建隔离代码环境（git worktree add） |
| `getMeta(changeName)` | 读取 meta.json |
| `getWorktreePath(changeName)` | 获取 worktree 绝对路径 |
| `cleanup(changeName)` | 清理 worktree（含 junction 解链） |
| `applyWorktree(changeName)` | 将 worktree 代码 apply 回主仓库 |

### 5.3 创建流程

```
0. detectIsolation() — 检测 submodule/worktree 环境
1. 检查 .gitignore 忽略 worktree 存储目录
2. 检查分支/目录是否已存在（含幽灵检测）
3. 解析 base commit（默认 HEAD）
4. 创建 worktree 根目录
5. git worktree add → 失败时降级 in-place-fallback
5.5 base 同步检测（fetch origin + ahead/behind 计算）
5.6 dirty baseline overlay（未提交变更同步到 worktree）
5.7 baseline checkpoint
5.8 依赖供给（node_modules junction）
6. 写入完整 meta.json
```

### 5.4 In-Place Fallback（沙箱降级）

当 `git worktree add` 失败（沙箱权限限制/磁盘空间等）时：
- 降级为 `in-place-fallback` 模式
- 复用当前目录作为 worktree 路径
- meta.json 记录 `mode: 'in-place-fallback'`
- 不创建新分支，在当前分支上直接修改
- `no_worktree = 1` 标记在 changes 表

### 5.5 node_modules 处理

- **Junction（Windows）/ Symlink（Unix）** → 指向主仓 node_modules
- **清理时必须先解链** — 防 `rm -rf` 穿透 junction 删主仓
- `unlinkNodeModulesLinks()` 处理根 + 子模块 junction
- `safeRemoveWorktreeDir()` 统一解链后删除

### 5.6 meta.json 结构

```json
{
  "changeName": "xxx",
  "branch": "sillyspec/xxx",
  "baseBranch": "main",
  "baseHash": "abc123...",
  "worktreePath": "/path/to/worktree",
  "mode": "worktree" | "in-place-fallback" | "native-overlay",
  "createdAt": "ISO",
  "depsModules": [{ "path": "..." }],
  "baselineHash": "...",
  "provisioning": false
}
```

---

## 6. 数据流概览

### 6.1 CLI 入口 → 状态读写

```
Agent → sillyspec CLI (bin/sillyspec.js)
  → src/index.js（命令路由）
    → src/run.js（run 命令调度）
      → src/stages/<stage>.js（阶段定义 + prompt 构建）
      → src/run/prompt.js（persona + 铁律 + 占位符替换）
      → src/run/complete-handlers.js（步骤完成后回调）
    → src/progress.js（ProgressManager facade）
      → src/progress/change-registry.js
      → src/progress/step-store.js
      → src/progress/stage-machine.js
      → src/progress/consistency-doctor.js
    → src/db.js（DB 引擎）
      → src/db-engine.js（node:sqlite DatabaseSync 封装）
    → src/worktree.js（WorktreeManager）
```

### 6.2 平台同步数据流

```
本地 ←→ SillyHub 平台

serializeForSync()     ← 本地 DB → JSON（6 表投影）
import()               ← 平台 JSON → 本地 DB（原子重建 4 表）
sync.js push/pull      ← HTTP 传输层（含乐观锁 base_ts 检测）
```

### 6.3 文件系统 ↔ DB 双写关系

| 操作 | DB 写入 | 文件系统写入 |
|---|---|---|
| initChange | changes + stages 行 | 创建 changes/\<name\>/ 目录 |
| addStep | steps 行 | — |
| updateStep | steps 行 | — |
| completeStage | stages 行 | history/\<change\>-\<stage\>-\<ts\>.json |
| reopenStage | stages + steps 行 | — |
| unregisterChange (archive) | changes.status='archived' | worktree cleanup |
| create worktree | — | .runtime/worktrees/\<name\>/ + meta.json |

**权威状态源 = DB**。文件系统是辅助存储（目录结构 + 历史 JSON + worktree）。

---

## 7. 发现与结论

### 7.1 架构发现

1. **ProgressManager 是 4 子模块 Facade**：ChangeRegistry / StepStore / StageMachine / ConsistencyDoctor 各管一摊，通过构造注入共享 pm 引用。
2. **DB 是权威状态源**：所有进度数据以 SQLite 为唯一真相，文件系统变化是辅助（目录、历史 JSON、worktree）。
3. **worktree sandbox 是 git worktree 封装**：非独立沙箱机制，核心靠 `git worktree add` 实现代码隔离；沙箱降级 = `in-place-fallback`。
4. **平台同步用乐观锁**：`last_synced_platform_ts` vs `last_local_modified_ts` 两列实现冲突检测。
5. **Schema 演进无迁移文件**：用 `_migrateAddColumn()` 逐列 ALTER TABLE，列存在静默跳过。

### 7.2 关键设计决策

1. **fail-closed 优先**：平台指针失效 → 拒绝回退（防状态分裂）
2. **自动完成有产物校验门**：updateStep 检测全完成时不过 validator 不标 completed
3. **reopen 级联下游 stale**：上游修订 → 下游全部标记失效需重建
4. **幽灵 worktree 清理有安全检查**：无 meta + 有未提交改动 → 拒绝自动清理

### 7.3 风险点

1. **node_modules junction 穿透风险**：Windows 清理 worktree 时必须先解链，否则 `rm -rf` 可穿透删主仓 node_modules
2. **DB SQLITE_BUSY 并发**：WAL 单写者模型，并发写需 busy_timeout + 应用层重试退避
3. **in-place-fallback 无分支隔离**：沙箱降级后，execute 改动直接写在当前分支，若失败回滚代价高
4. **Schema 演进靠 ALTER TABLE try/catch**：无正式迁移框架，多列加表时静默跳过异常可能掩盖问题

---

## 8. 产出文件路径

- 本报告：`docs/sillyspec-workspace-data-model-analysis.md`

---

## 9. 风险总结

| 风险 | 级别 | 说明 |
|---|---|---|
| junction 穿透删主仓 | 🔴 高 | 解链操作是硬阻断，失败直接抛错 |
| SQLITE_BUSY 并发 | 🟡 中 | 3 次退避（50/100/200ms）+ 5s busy_timeout |
| in-place fallback 无隔离 | 🟡 中 | 降级模式下代码变更无分支保护 |
| Schema 无正式迁移 | 🟢 低 | 目前版本 5，列数有限，try/catch 可靠 |
