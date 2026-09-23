# 设计：watcher 预览进度账本

> change: 2026-09-23-watcher-preview-progress
> 模块归属：runtime（watcher）+ core-engine（db/progress）+ cli-entry（flag 出口）
> 方案：单表 + authority + 读侧保险丝（用户裁定，对话 2026-09-23）

## 1. 架构与数据流

```
watcher 轮询循环（既有）                    CLI 短进程（既有）
  快照差分 → inferEvents                     run <stage> --done
       │                                          │
       ├─→ 事件 jsonl（不变，唯一观测真相）          ├─→ 权威写（authority='cli'，现状语义）
       └─→ 【新】projectPreviewProgress()          │
            阶段级投影 upsert（change_id 键）        │
            authority='watcher'，仅当无 cli 行 ─────┤ CLI --done 命中预览行时
                                                    │ DO UPDATE SET 补 authority='cli'
                                                    │ （归章——见 §3②，非「零改动现状」）
                                                    │
              读侧保险丝：DB 读方法缺省 WHERE authority='cli'
                ├─ 既有消费者（gate/同步/面板/flow）零改动
                └─ 显式出口：readPreviewProgress()
                     ├─ progress show --preview
                     └─ handoff「机器预览态」段
```

## 2. 数据模型与迁移

- `stages` 表：`ALTER TABLE stages ADD COLUMN authority TEXT NOT NULL DEFAULT 'cli'`；`steps` 表同款。
- **真实 schema 对齐（影子审查 fail② 修正）**：stages 主键维度=`UNIQUE(change_id, stage)`（change_id FK→changes.id，src/db.js:281-305）；steps 仅 stage_id（FK 级联 ON DELETE CASCADE）。因此：预览写入前 `SELECT id FROM changes WHERE name=?` 取 change_id（无行=变更未注册→跳过本轮）；索引建 `(change_id, stage, authority)`；**GC 只需 DELETE stages 的 watcher 行，steps 随级联自动清**。
- 迁移：db.js 既有 schema 版本戳机制递增一版，迁移 SQL 幂等（`ALTER ... ADD COLUMN` 撞已存在列捕获忽略）；存量行因 DEFAULT 即刻为 'cli'，无需回填遍历。
- 回滚：新列对旧读无害（多余列被忽略）；如需彻底回退走 `.bak` 既有降级链。

## 3. 写路径（watcher 侧）

- 新增 `src/preview-progress.js`（纯函数 + 短连接写入）：
  - `projectPreviewStages({ changeName, snapshot, prevSnapshot })` → 待写行集合：阶段工件签名出现/推进 → 该 stage 预览行 `status='in-progress'` + `evidence`（JSON：事件序号引用、ts）；`archived` 拍不投影。
  - `writePreviewStages({ specDir, changeName, rows, maxRows=8 })`：open（db-engine openDatabase）→ **先 `PRAGMA busy_timeout=5000`（连接级 PRAGMA，openDatabase 不自动带——影子审查 gap① 修正；WAL 是库级属性短连接自动受益，busy_timeout 不是）** → 查 change_id（无则跳过）→ 逐行 `INSERT INTO stages (change_id, stage, status, ..., authority) VALUES (..., 'watcher') ON CONFLICT(change_id, stage) DO UPDATE SET ... WHERE stages.authority='watcher'`（存在性条件进 SQL，cli 行永不中招）→ close。异常整体吞掉返回 false（FR-07）。
  - **② CLI 权威写入归章（影子审查 fail① 修正，task-01 承载）**：progress.js 既有 stage upsert（约 :924）的 `DO UPDATE SET` 追加 `authority='cli'`，且 INSERT 列清单显式带 authority='cli'（不依赖 DEFAULT——DEFAULT 只作用 INSERT 分支，DO UPDATE 不重置列，这正是「天然顶替」不成立的原因）。
- watcher.js 循环接线：`inferEvents` 与平台推送之间插一次投影调用，best-effort。
- 并发：WAL + busy_timeout=5000 现配；短连接把锁窗压到毫秒级。

## 4. 读路径（保险丝 + 出口）

- `progress.js` 读方法（getChangeStage/steps 读取/serializeForSync 数据源查询）统一追加 `AND (authority='cli' OR authority IS NULL)`——集中在 DB 查询构造处（单点），消费者零改动。
- 新导出 `readPreviewProgress(specDir, changeName)`：返回预览行 + 证据解析。
- `progress show --preview`：渲染层合并（cli 行照旧 + 预览行独立段带「预览」徽标与证据引用）；`handoff`：输出尾部加「机器预览态」段。
- serializeForSync：因读方法已过滤，平台载荷零变化（FR-03 测试钉含此项）。

## 5. GC

`unregisterChange` 清理链追加：`DELETE FROM stages/steps WHERE change_name=? AND authority='watcher'`；失败 warn 不阻断。

## 6. 接口表（对外新增/变更）

本变更接口面：6 端点（全部为本地面：DB 列/模块导出/CLI flag——无 HTTP 端点，集成证据以核心面套件+CLI 冒烟实录承载）

METHOD | path | 变更
POST | /internal/stages-authority | stages/steps 加 authority 列（DEFAULT 'cli'）；CLI 权威 upsert INSERT/DO UPDATE 显式归章（fail①）
POST | /internal/writePreviewStages | src/preview-progress.js 导出：短连接写入预览行（认领语义 D-005@v2，maxRows=8，fail-open）
GET | /internal/projectPreviewStages | 同文件导出：纯函数投影（工件→阶段映射，archived 不投影）
GET | /internal/readPreviewProgress | progress.js 导出：只读预览出口（evidence 解析）
GET | /cli/progress-show-preview | `sillyspec progress show --preview` CLI flag（预览徽标+证据引用）
GET | /cli/handoff-preview-section | `sillyspec handoff` 机器预览态段（有预览带段/无预览零段）

## 7. 风险表

| 风险 | 缓解 |
|---|---|
| 读者遗漏（某处绕过查询层直读 SQL） | 走查钉：grep 审计 `FROM stages/steps` 全部出现点；FR-03 逐字节测试兜底 |
| 写放大/锁竞争拖慢 watcher 轮询 | maxRows=8 + 短连接 + 写耗时非功能项 |
| 迁移失败半态 | 幂等 ALTER + fail-closed（不成功不读写）+ `.bak` 链 |
| 预览被误当权威（未来新读者） | 列名语义化 + FR-08 常驻测试钉 + conventions 条目 |
| 旧版 CLI 打新库 | 加列向后兼容（旧 SELECT 按名列读不受影响） |

## 8. 测试分层

1. 迁移组：加列幂等/存量盖章/旧库兼容。
2. 投影组：纯函数（快照差分→行集）、写纪律（有 cli 行不动/无行写入/archived 不投影/maxRows 截断）。
3. 保险丝组：注入预览行后 gate/serializeForSync/progress show 默认输出逐字节一致；FR-08 门禁隔离钉。
4. 出口组：--preview 人读与 --json；handoff 段在场。
5. GC 组：归档后预览清零、GC 失败 fail-open。

## 9. 测试驱动注意

watcher 循环接线沿用 watcher.test.mjs 真子进程先例（预览行落库可断言）；DB 层用临时目录建库（既有 fixture 风格）。

## 10. 文件变更清单

| 文件 | 动作 | 归属 task |
|---|---|---|
| src/db.js | 修改（schema 版本戳+迁移+索引） | task-01 |
| src/doctor-diagnostics.js | 修改（:1700 直读 join 旁路补 authority 过滤，gap②） | task-01 |
| src/progress/shared.js | 修改（CURRENT_VERSION=7——版本四处一致连带） | task-01 |
| package.json | 修改（新增 test:core 脚本——核心面口径，task-05） | task-05 |
| src/progress.js | 修改（读侧保险丝+权威 upsert 归章+readPreviewProgress） | task-01, task-03 |
| src/progress/change-registry.js | 修改（unregisterChange 链 GC watcher 行） | task-04 |
| NEW:src/preview-progress.js | 新增（投影纯函数+短连接写入） | task-02 |
| src/watcher.js | 修改（循环接线 best-effort 投影） | task-02 |
| src/index.js | 修改（progress show --preview flag 分发） | task-03 |
| src/handoff.js | 修改（机器预览态段） | task-03 |
| NEW:test/preview-migration.test.mjs | 新增 | task-01 |
| test/platform-sync-schema.test.mjs | 修改（版本四处一致断言随 v7 契约更新） | task-01 |
| test/platform-sync-serialization.test.mjs | 修改（schema_version 字面随 v7） | task-01 |
| test/change-ownership-guards.test.mjs | 修改（v5→v7 迁移断言随版本 bump） | task-01 |
| NEW:test/preview-progress.test.mjs | 新增 | task-02 |
| NEW:test/preview-outlet.test.mjs | 新增 | task-03 |
| NEW:test/preview-gc.test.mjs | 新增 | task-04 |
| NEW:test/preview-gate-isolation.test.mjs | 新增 | task-05 |

不变文件（显式声明）：src/db-engine.js（openDatabase 现成复用零改动）、src/sync.js（serializeForSync 经读侧保险丝天然过滤零改动）、gate/machine-interface 全族（红线：零改动，FR-08 钉）。
