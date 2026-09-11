---
author: qinyi
created_at: 2026-09-11 10:10:58
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者 | 使用 sillyspec 流程的主 agent，摩擦提示的接收者 |
| CLI | sillyspec 进程，摩擦计数的记录者与提示的输出者 |

## 功能需求

### FR-01: 摩擦事件计数
覆盖决策：D-001@v1, D-004@v1
Given 一个活跃变更（真实变更或 quick-<8hex> 会话）
When 发生 gate 失败回滚 / verify test·lint 实测失败 / 审查 verdict=fail 任一事件
Then 对应类型计数 +1 并落 `.runtime` 计数文件（quick 会话落 session 目录），history 追加一条 { at, type, detail } 且截尾 20

（边界）审查打回记 review_rejected 专属类型，不与 gate_rollback 重复计。
（边界）advisory lint 失败（不阻断 throw 的失败）也计入 verify_run_failed。
（边界）计数读写任何异常静默降级，绝不反向阻断流程。

### FR-02: 收尾提示与清零
覆盖决策：D-003@v1, D-006@v1
Given quick --done 或 verify --done 成功收尾（verify 含 completeStep 与 continueStep 两路径）
When 任一类型计数非零
Then 输出恰好一行 advisory（含各类型次数与 postmortem 四子字段指引），随后删除计数文件；全零时零输出

### FR-03: 落点红线
覆盖决策：D-002@v1, D-005@v1
Given 任意记录/消费调用
When 解析计数文件路径
Then 真实变更路径在 `<runtimeRoot>/friction-tally-<changeName>.json`、quick 会话路径在 `<sessionsDir>/<sessionId>/friction-tally.json`，两路径均位于平台同步排除区（spec-sync UPLOAD_EXCLUDE_TOP_BASE 之外不可达）；文件字段值只含计数/类型/时间戳/预定义标签，不含提示词或对话原文

### FR-04: 配置开关
覆盖决策：D-003@v1
Given local.yaml 存在或不存在的仓库
When 读 `friction_hint.enabled`
Then 缺键/读失败 = 默认 true（开）；显式 false 时 record/consume 双直通（.runtime 零写入、零提示）

### FR-05: 归档清理
覆盖决策：D-006@v1
Given 变更归档或删除
When pruneArchivedChangeRuntime 执行
Then `friction-tally-<changeName>.json` 一并清理（与 apply-pathspec/execute-runs/stage-reviews 同批）

## 非功能需求
- 兼容性：未配置新键默认开且纯 advisory；rollbackCompletionAndReturn 新参为可选尾参，调用方不传走默认标签；DB/CLI 命令面零变更
- 可回退：friction_hint.enabled: false 一键全关；删除计数文件即回零
- 可测试：路由/清零/开关/截尾/降级全部可单测（test/friction-tally.test.mjs）
