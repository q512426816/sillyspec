---
author: qinyi
created_at: 2026-09-14 19:31:20
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-14-change-ownership-guards

## 背景

apply-conflict-hardening 收官期两次实证（troubleshooting §65）：①归档后并行会话一条龙接管了本变更的 apply+commit+cleanup（09943ff），本会话毫不知情，一度以为成果丢失——CLI 的 apply/cleanup/archive 任何会话可对任何 change 执行，withMainRepoLock 只串行化不鉴权，且「归档完成但交付物未进主仓」悬空态放大了代劳窗口；②apply 校验的 review 声明放行通道（本意放行有据越界）无 allowed_paths 相交校验，11 个并行会话在途文件经该通道真实放行——根因是 review/草稿的 changedFiles 按主仓共享工作区脏窗口归因。前置护栏（merge 写回暂存/guard 相交/manifest 漂移检测）已落地，本变更补齐 change 级所有权与两个归因/放行缺口。

## 设计目标

1. change 所有权+心跳：owner_session 列（D-001/D-005），接管类操作（apply/cleanup/archive）对他人活跃 change 拒绝执行，--takeover 显式接管留痕；
2. 归档收口：worktree 有未 apply 交付面时归档阻断，--skip-apply 显式跳过（D-002），消灭悬空态；
3. 放行收紧：review 声明只放行与 allowed_paths∪design∪linked 声明面相交的文件，外来声明进违规报告（D-003）；
4. 归因切换：worktree 模式下 review/草稿 changedFiles 唯一源=worktree 分支 diff，主仓脏窗口仅 in-place 模式（D-004）。

## 非目标

- 不做文件级所有权登记/拦裸 git（ROADMAP 观察项维持，复潮证据已挂 §65）；
- 不改 sillyhub 平台侧消费（owner_session 随既有 progress 同步 payload 带出，消费端后续另议）；
- 归档不自动串联 apply（脏重叠场景行为复杂，人确认更稳——只拦不代跑）；
- 所有权校验不覆盖只读命令（status/progress show/scope-audit 等随时可查）；
- 不拦截本会话自己的 change（零行为变化）；
- 语义后果声明（Grill）：D-003 收紧后 review 放行通道的 admission 增量归零（正常 face 全在 allow 面内）——通道保留作审计报告位（外来声明显式列出），非继续放行；quick 面所有权互斥恒为空（selfSession==changeName 恒 self）——quick 会话间的互斥由 guard 机制既有覆盖，本变更不重复。

## 拆分判断

不拆分：四护栏共享同一验收语境（§65 两事件）且 progress 表迁移一次做（拆开会产生 v6/v7 两次迁移）。不批量。规模 large：schema 迁移（数据模型变更）+跨 progress/worktree/runtime/cli-entry/core-engine 五模块+fail-closed 语义。

## 总体方案

**Wave 1 数据层**：schema v6 迁移——changes 表加 `owner_session TEXT`（db.js DDL+DB_SCHEMA_VERSION=6+progress/shared.js CURRENT_VERSION+progress._version 四处同步 bump，ALTER TABLE 容错迁移+迁移测试）；config-schema.js 登记 `change-ownership.heartbeat_minutes`（optional，缺省 15）+local.yaml.example 注释段。

**Wave 2 所有权语义**：change-registry.js 首建 owner（run/quick 启动写，已有值不覆盖）。**会话标识三级方案（Grill 阻断1 修正——原「跨进程回读」机制不存在，full-flow change 名全会话共享）**：①显式标识=env `SILLYSPEC_SESSION_ID`（agent 会话启动 export 一次，AGENTS.md/skill 铁律要求）或 `--session <id>` flag，优先级 env<flag；②quick 会话=changeName（既有 sessionId 机制，stage.js:349 guard 按 change 名落盘天然跨进程）；③无标识 fallback=`anon@<host>`（机器级——只拦他机，同机并行会话不设防）+ 首次使用打 warning 教学指引 export。owner 记录格式 `<标识>`；assertChangeOwnership 的 self 判定=精确字符串等值；每次 CLI 写操作既有 last_active 刷新即心跳；接管类操作校验函数 `assertChangeOwnership({changeName, selfSession, opts})`（纯读 changes 行，锁内调用）：owner 非本会话且 now-last_active < 活跃窗 → 抛结构化拒绝（owner/最后活跃/--takeover 指引）；窗口外 → 放行并重写 owner（自动接管）；--takeover → 无条件重写+result.takeover 留痕。接线点（Grill 阻断3 补全——assess 旁路必须堵）：index.js apply/cleanup 分支（:2643 worktree 区域/:2741 apply）、**assess 自动 apply 入口（:2905 区域，SAFE/WARNING 即自动改主仓+链内 cleanup——护栏①最可能的旁路）**、complete-handlers.js archive step3 归档移动前、**quick --done 轻量归档链（:1528 区域 closeQuickLinkedChanges 前对 linked full-flow change 校验）**；quick 会话豁免自身。

**Wave 3 收口与归因**：①归档收口——archive step3 前调 applyWorktree({checkOnly:true})，交付面非空阻断（错误信息含 apply 指引），--skip-apply 显式跳过留痕；②放行收紧——worktree-apply.js reviewAdmittedFiles 路径（**主仓 :1042-1058/跨仓 :766——Grill 阻断2 锚点修正，:917 为跨仓 warnings 拼接行**）加相交过滤（allow 面=design 清单∪各 task target_files/allowed_paths∪linked-change 声明），不相交文件剔除进 violations 报告行（含「review 声明了越权文件」嫌疑标注）；③归因切换（Grill 阻断5 修正——草稿归因现码已 worktree-aware task-review.js:1181-1215，真缺口=meta 缺失态回退主仓窗口 verify-postcheck.js:1171-1182）：**模式判定源=changes.isolation_mode 列（DB，meta 缺失也可判）**，meta 在时交叉校验不一致以 DB 为准；worktree 模式（含 meta 缺失但 DB 判 worktree 的回退态）归因一律取 worktree 分支 diff，in-place 维持主仓窗口。**终态空源定案（复审残留①）**：DB 判 worktree 且分支 ref 已删（cleanup 后态，worktree.js:1162/:1171）→ 归因 fail-closed 空集+「不可归因（worktree 已清理）」注记，绝不回退主仓窗口。**NULL 路由（残留②）**：isolation_mode 为 NULL 的存量变更 → 按 meta 在场与否路由（meta 在随 meta，meta 缺随主仓窗口+注记）——存量态不追求完美，只保安全。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/db.js | DB_SCHEMA_VERSION=6 + DDL 加 owner_session 列 + ALTER TABLE 容错迁移（v5→v6）+ project.schema_version DEFAULT 同步 bump（:255，Grill 次要项） |
| 修改 | src/progress/shared.js | CURRENT_VERSION=6（四处版本同步之一） |
| 修改 | src/progress.js | progress._version=6 + owner 读写 API（getChangeOwner/claimChangeOwner）+ **serializeForSync changes 投影扩 owner_session 列（:462-463/:509-512 现仅 6 列——Grill 阻断6：「随 payload 带出」原不成立）+ import 侧回写容错** |
| 修改 | src/progress/change-registry.js | 首建 owner 写入（INSERT OR IGNORE 处 :153 区域带 owner）；assertChangeOwnership 纯函数（读行+窗口判定+三分支） |
| 修改 | src/config-schema.js | change-ownership.heartbeat_minutes optional 键登记 |
| 修改 | .sillyspec/local.yaml.example | change-ownership 段注释示例 |
| 修改 | AGENTS.md | 新增会话标识铁律一行：agent 会话启动 export SILLYSPEC_SESSION_ID=<唯一标识>（多会话并行的所有权判定依赖）；附 --session <id> flag 回退示例（部分 harness Bash 工具 shell 状态不持久，env 丢失时每命令带 flag——复审残留④） |
| 修改 | src/index.js | apply/cleanup 分支接 assertChangeOwnership（锁内）+ --takeover/--session flag 解析/usage（apply/cleanup/worktree 分支）；--skip-apply 经 run archive --done 走 run 链——解析在 run/command.js knownFlags 白名单（Grill 阻断4：设计原挂 index.js 落空） |
| 修改 | src/run/command.js | --skip-apply/--session 登记 knownFlags 白名单（:828-831/:332/:1486 区域）+ 透传（--takeover 走 index.js 子命令层，--skip-apply/--session 走 run 链——两层各有白名单） |
| 修改 | src/run/complete-handlers.js | archive step3 归档移动前：checkOnly 未 apply 面检查（--skip-apply 留痕）+ 所有权校验接线 |
| 修改 | src/worktree-apply.js | reviewAdmittedFiles 相交过滤（allow 面并集；外来声明进 violations 报告） |
| 修改 | src/task-review.js | 草稿/changedFiles 归因模式分流（worktree 模式取分支 diff） |
| 新增 | NEW:test/change-ownership-guards.test.mjs | 迁移 v5→v6/所有权四态（自有放行/活跃拒绝/窗口外自动接管/--takeover 留痕）/归档拦截+--skip-apply/放行过滤（外来声明剔除）/归因分流——真 git 临时仓 |
| 修改 | .sillyspec/docs/sillyspec/modules/progress.md | 模块卡：owner_session 列+assertChangeOwnership |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.md | 模块卡：放行收紧+归档收口关联 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 模块卡：归档收口/所有权接线 |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md | 模块卡：--takeover/--skip-apply flag |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块卡：task-review 归因分流 |
| 修改 | .sillyspec/docs/sillyspec/modules/setup.md | 模块卡：change-ownership.heartbeat_minutes 配置键（plan-review 阻断3：六卡口径补齐） |
| 修改 | test/platform-sync-schema.test.mjs | 五处硬断言版本 5（:54/:61/:155/:174/:192）随 v6 bump 同步改 6（plan-review 阻断2 连带认领） |
| 修改 | test/worktree-apply-review-allowlist.test.mjs | 用例 1（:96-99 未列文件→放行）语义随 D-003 翻转改断言（外来文件→violations 报告；plan-review 阻断2） |

## 接口定义

```js
// src/progress/change-registry.js
export function assertChangeOwnership({ db, changeName, selfSession, nowMs, heartbeatMs })
// 返回 { allowed, action: 'self'|'takeover-stale'|'takeover-forced', owner, lastActive }
// allowed=false 时调用方抛结构化错误（owner/最后活跃/--takeover 指引）
// quick 会话：selfSession=quick-<hex> 自身命中即 self

// src/progress.js
export function getChangeOwner(changeName) // → string|null
export function claimChangeOwner(changeName, session) // 首建不覆盖；返回实际 owner

// local.yaml（可选）
change-ownership:
  heartbeat_minutes: 15
```

## 生命周期契约表

不涉及生命周期契约（本变更不新增/修改流程事件与状态流转；所有权校验是既有操作的前置门，archive/apply 状态机不变）。

## 数据模型

changes 表 v5→v6：`ALTER TABLE changes ADD COLUMN owner_session TEXT`（存量行 NULL=无主，任何会话可接管——向后兼容）；迁移幂等（列存在则跳过）；四处版本号同步（db.js DDL+DB_SCHEMA_VERSION/progress/shared.js CURRENT_VERSION/progress._version）。无其他表变更。

## 兼容策略（brownfield 必填）

- 存量库（v5）：首次打开自动迁移加列，存量 change owner=NULL 视为无主——任何会话可操作（零行为变化）；
- 未配置 change-ownership.heartbeat_minutes：缺省 15 分钟；
- 本会话自己的 change：校验恒过（零路径变化）；
- 只读命令（status/progress show/scope-audit/docs check）不校验所有权（随时可查）；
- --skip-apply/--takeover 未传时：遇对应条件从「默默执行」变「拒绝+指引」——目的性变化非回归；
- 平台模式：owner 随 progress 同步 payload 带出（消费侧本变更不强制）；specRoot 分裂不产生双真相源（唯一源=进度库）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 会话标识：full-flow 无跨进程天然身份（Grill 阻断1——「回读当 self」可被并行会话冒充） | P0 | 三级方案：显式 SILLYSPEC_SESSION_ID/--session（AGENTS.md 铁律 export）>quick=changeName>anon@host 机器级降级+教学 warning；无显式标识时同机并行不设防是**明示局限**（§65 同机场景的防线=显式标识铁律+归档收口+--takeover 摩擦） |
| R-02 | last_active 心跳粒度（仅 CLI 写操作刷新）误判长任务会话为停活 | P1 | 活跃窗 15 分钟 + 长步骤前后均有 CLI 调用刷新；误判后果=对方接管而非数据损失（--takeover 可夺回）；文档标注语义 |
| R-03 | 放行收紧误伤合法有据越界（facade 转发/名单测试不在清单） | P2 | allow 面含 linked-change 声明与 task 归属交集判定；测试覆盖既有 worktree-apply 名单测试场景 |
| R-04 | 归因切换的终态空源与 NULL 存量路由引入新边界 | P2 | 终态空源=fail-closed 空集+注记（绝不回退主仓窗口）；NULL 存量按 meta 在场路由+注记；两边界均有测试用例锁定（复审残留①②） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1；总体方案 Wave 2；接口定义 assertChangeOwnership | 已覆盖 |
| D-002@v1 | 设计目标 2；总体方案 Wave 3①；文件清单 complete-handlers 行 | 已覆盖 |
| D-003@v1 | 设计目标 3；总体方案 Wave 3②；文件清单 worktree-apply 行 | 已覆盖 |
| D-004@v1 | 设计目标 4；总体方案 Wave 3③；文件清单 task-review 行 | 已覆盖 |
| D-005@v1 | 总体方案 Wave 1/2（载体定案）；数据模型节；兼容策略第 1/2 条 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-001@v1~D-005@v1（决策追踪表逐条覆盖，无未解决项）
- [x] 生命周期关键词核对：含 apply/archive 等词但均非生命周期事件——已写紧邻豁免短语「不涉及生命周期契约」
- [x] UI 原型分级核对：纯 CLI/后端变更，无任何界面文件——跳过原型（Step 5 已声明）
- [x] 字段数据流标注：owner_session（producer=change-registry 首建 → consumers=assertChangeOwnership 调用方/平台同步 payload）与归因源（producer=worktree 分支 diff → consumers=task-review/verify）两链已交代
- [x] 源码锚点核对：db.js:10 DB_SCHEMA_VERSION=5、change-registry.js:153 INSERT、index.js:2643 worktree/:2741 apply、worktree-apply.js reviewAdmittedFiles 主仓 :1042-1058/跨仓 :766（Grill 复审修正——自审原 :917 为拼接行，锚点失真已纠）均为实测
