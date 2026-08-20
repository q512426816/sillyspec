---
author: qinyi
created_at: 2026-07-10T16:00:00+08:00
scale: large
---

# 设计文档（Design）— quick 会话状态隔离

## 1. 背景

quick 阶段在 `run.js:1386` 硬编码 `changeName = 'default'`（当年为避免 quick 进度在各 change 间漂移）。导致所有 quick 会话共享 DB 的 `progress.default.quick` **单行**。多个并行 quick 会话（multi-agent-platform 同日 3+ 会话是常态）互相覆盖：

- 会话 B 启动 reset 把 A 的 steps 冲掉
- `--done` 时 post-check 读 `progress.quickGuard`（DB 单行快照），找到他者会话的 baseline/ql 绑定
- 状态在 step2/step3 横跳，无法收敛到 3/3

详见 `docs/sillyspec/quick-concurrent-session-state-race.md`（multi-agent-platform 仓库）。

底层原因：sql.js 是进程内内存库，每次 CLI 调用是独立进程各自加载/写盘，**跨进程零互斥**，last-write-wins。`current-quick-run-id` 已生成（run.js:1597）但**无任何读取者**（注释自承"逻辑隔离"，实际未生效）。

## 2. 设计目标

- quick 会话 DB 状态**按会话隔离**：各自独立的 steps / baseline / ql 绑定，互不覆盖
- **不引入 worktree**：保持 quick"轻量、主工作区直写"的定位（worktree + apply-back 太重，且 quick 的 baseline 语义=主工作区脏文件，与 worktree 的 clean checkout 冲突）
- **不动 db schema**：`changes` 表的 `name` 列已是天然分区键（UNIQUE），多行 `quick-<uuid>` 即可分行

## 3. 非目标

- **工作区文件冲突**：A/B 改**同一文件**仍会物理撞（quick 不开 worktree）。接受——实际场景各 quick 改不同模块/文件；同文件冲突是用户职责，文档声明。
- **QUICKLOG 序号竞态**：append + check-then-act 序号生成竞态，留后续单独修复。
- **自动 session 识别**：sillyspec CLI 是短进程，无 session 持久。多会话 `--done` 靠 `--change` 显式传递（默认 fallback 单会话兼容），不做自动识别。

## 4. 总体方案

> 覆盖决策：D-001@v1（sessionId 作 changeName 分行，否决 worktree/检测告警）、D-003@v1（sessionId 用 UUID8hex，摒弃时间戳）。

quick 每会话用 `sessionId` 作 `changeName`（不再固定 `default`），DB 分行 `progress.quick-<uuid8>`。

### 4.1 sessionId 生成

- `crypto.randomUUID()`（Node 19+ 原生，零依赖）取前 8 hex → `quick-<uuid8>`（如 `quick-a3f2b7c1`）
- 摒弃现有 `quick-YYYYMMDD-HHMMSS`（秒级时间戳，同秒并发会撞——本身是竞态）
- run quick 启动时生成

### 4.2 changeName 解耦

`run.js:1386` 去掉 `if (stageName === 'quick') changeName = 'default'` 硬编码：
- 用户传 `--change <name>` → 尊重（兼容显式指定）
- 未传 → 自动 `quick-<uuid8>`

### 4.3 DB 分行

每会话 `progress.quick-<uuid8>`：`changes` 表 `name` 列 UNIQUE，多行 `quick-*` 互不冲突。各自 stages/steps/quickGuard 独立，`--done` 各推各的。

### 4.4 --done 跨进程传递（关键）

sillyspec CLI 短进程，run 与 done 是独立进程。sessionId 跨进程传递：
- **run quick**：生成 sessionId，写 `current-quick-run-id`（单文件，最新 session 的 fallback）+ **输出 sessionId 给 agent**（prompt 里显式打印，让 agent 知道本会话 id）
- **--done --change quick-<uuid8>**：精确指定（多会话必用）
- **--done（不带 --change）**：fallback 读 `current-quick-run-id`（单会话兼容；多会话时可能拿到他者，文档声明建议带 `--change`）

### 4.5 quick-guard.json 按 session 存（D-002@v1：hook 合并所有活跃 session guard）

从单文件 `.runtime/quick-guard.json` 改为按 session 目录：`.runtime/quick-sessions/<sessionId>/guard.json`。

- `worktree-guard` hook 读 guard：hook 在 **agent 写文件时触发（独立进程，非 quick CLI）**，无法可靠知道"当前 agent 属于哪个 quick session"（`current-quick-run-id` 单文件多会话覆盖，读到的可能是他者 session）。**解决：hook 读所有活跃 `quick-sessions/*/guard.json`，合并 baseline/allowedFiles 并集**——多会话时保护范围过宽（保护所有 session 的 baseline），但不误拦任何 session 的合法写，安全侧倾斜。简单且不依赖 session 识别。
- 隔离：A/B 各自 guard.json 不覆盖（各自 session 目录）。

### 4.6 清理

`--done` 收尾删 `.runtime/quick-sessions/<sessionId>/`（替代当前 unlink 单文件 quick-guard.json，run.js:2924）。

## 5. 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | src/run.js | :1386 去掉 quick 固定 default；quick 启动生成 sessionId（UUID8hex）写 current-quick-run-id + 输出；--done 优先 --change、fallback current-quick-run-id 恢复 sessionId；quick-guard.json 改写 quick-sessions/<sid>/guard.json；:2924 收尾删 session 目录 |
| 修改 | src/stages/quick.js | step1/3 prompt 适配：告知 agent 本会话 sessionId + --done 需带 --change |
| 修改 | src/hooks/worktree-guard.js | :598-619 / :683-701 读 guard 改路径 quick-sessions/<sid>/guard.json（sid 从 current-quick-run-id 或进程上下文） |
| 新增 | test/quick-session-isolation.test.mjs | 多会话隔离回归（两 quick 会话独立 steps + guard 不互覆盖 + --done 各推各的） |

## 6. 接口/数据结构

- **sessionId**：`quick-<uuid8hex>`（字符串，如 `quick-a3f2b7c1`）
- **DB**：`changes` 表多行 `name='quick-<uuid8>'`（name UNIQUE 兼容，无需 schema 改）
- **guard.json**（quick-sessions/<sid>/guard.json）：
  ```json
  {
    "sessionId": "quick-a3f2b7c1",
    "name_zh": "快速任务守卫",
    "baselineCommit": "<sha>",
    "baselineFiles": [...],
    "allowedFiles": [...],
    "allowNew": false,
    "forceBaseline": false,
    "linkedChanges": [...],
    "startedAt": "<ISO8601>"
  }
  ```

## 7. 生命周期契约表（quick 会话）

涉及 `session` 关键词，quick 会话生命周期：

| 事件 | 触发 | 文件系统 | DB（progress） | 状态 |
|---|---|---|---|---|
| run quick 启动 | `sillyspec run quick` | 创建 `quick-sessions/<sid>/`；写 `current-quick-run-id`=<sid> | 写 `progress.quick-<sid>`（steps=pending, quickGuard） | 会话开始 |
| step 推进 | `--done` 各 step | 更新 guard.json | 更新 `progress.quick-<sid>.stages.quick.steps` | 进行中 |
| 会话收尾 | `--done` 末 step | 删 `quick-sessions/<sid>/` | `progress.quick-<sid>` stages.quick.status=completed | 会话结束 |
| 异常残留 | 进程崩溃/放弃 | `quick-sessions/<sid>/` 残留 | `progress.quick-<sid>` 残留 | 僵尸（下次启动检测到 current-quick-run-id 或残留目录，提示但默认放行覆盖） |

## 8. 风险与回退

- **向后兼容**：旧 quick-guard.json（无 sessionId，单文件）→ 检测到旧格式视为 default session 一次性迁移（或忽略，新会话建自己的）。
- **worktree-guard hook 适配（Grill 发现的矛盾）**：hook 读 guard 路径变化（`quick-sessions/<sid>/`）+ hook 是独立进程、无法可靠知当前 session（`current-quick-run-id` 多会话覆盖）。对策：hook 合并所有活跃 session 的 guard 并集（§4.5），不依赖单 session 识别。测试覆盖多会话 hook 行为（两 session baseline 不同时，hook 都放行各自的 allowedFiles）。
- **回退**：恢复 `run.js:1386` 固定 default + guard 回单文件 + 删 quick-sessions/。纯增量可回退。

## 9. 自审

- [x] 需求覆盖：状态覆盖 / 找错 ql / steps 横跳——DB 分行全解
- [x] 非目标清晰：工作区冲突 / QUICKLOG 序号 / 自动 session 识别——明确不做 + 理由
- [x] YAGNI：不引入 worktree / db schema / pid 锁（成本远超收益）
- [x] 真实性：run.js:1386 / current-quick-run-id / quick-guard.json / worktree-guard hook 均为真实代码点（调研确认）
- [x] 边界：A/B 同文件冲突已声明（quick 不 worktree）
- [x] 兼容/回退：§8
