---
author: qinyi
created_at: 2026-09-10 10:36:45
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者（用户） | 在变更收尾时确认改动范围（计划 vs 实际、行数）的人类决策者 |
| Agent | 执行 sillyspec 流程的主代理，消费注入的对账表与 --json 机器面 |
| CLI | sillyspec 命令行本体，机械代算对账数据 |

## 功能需求

### FR-01: full-flow 变更范围三态对账
覆盖决策：D-001@v1, D-002@v1
Given 一个 full-flow 变更（changes/<name> 存在，design.md 含文件变更清单）且实际存在 git 改动（worktree 形态 A 或 post-apply 形态 B）
When 调用 computeChangeScopeAudit 或 `sillyspec scope-audit --change <name>`
Then 输出文件级三态表：✓ 计划内 / ⚠️ 计划外 / ⚠️ 计划未动；tracked 文件行数来自 `git diff --numstat <baseAnchor>`，untracked 新文件行数来自 wc -l（全 + 行），binary 显 BIN；计划侧无任何行数或估算值

Given design.md 无可解析文件清单（旧变更/解析失败）
Then 降级为实际侧 only 视图 + degradedReason 说明，不误判三态

Given resolveReconcileActualFiles 形态 B merge-base 不可得（baseAnchor=null）
Then 降级 degradedReason 不出行数（文件清单仍出），不出伪行数（Grill 残余 P2-①）

### FR-02: scope-audit 独立命令随时查看
覆盖决策：D-003@v1
Given 上述任一变更（full-flow 名或 quick-<hex> 会话 id）
When 运行 `sillyspec scope-audit --change <name>`（或加 --json）
Then 输出人类可读对账表（或 JSON 结构化结果）；不依赖任何阶段 --done 时点，执行中途可随时调用

Given changeName 不存在或 guard.json 缺失的 quick id
Then 提示明确错误并 exit（用法错 exit 2 / 运行错 exit 1，fail-soft 输出错误摘要）

### FR-03: 三处阶段点薄注入
覆盖决策：D-003@v1, D-005@v1, D-006@v1
Given execute 阶段 --done 完成
Then 控制台打印全表 + ⚠️ 出口指引（补 design.md 声明或 --output 注明原因），并落 `.sillyspec/.runtime/scope-audit-<change>.json` 快照；注入点覆盖 completeStep 与 continueStep 两路径（wait 解除路径不漏）

Given verify 阶段 --done 完成
Then 输出一行 `变更范围：N 文件 +X/-Y（vs execute 时点：一致|漂移 M 文件）`；漂移过滤面 = filterDeliverableFiles 组合排除 .sillyspec/docs/**（verify 合法文档同步不计漂移；组合过滤在 scope-audit 侧做，不改 filterDeliverableFiles 本体——Grill 残余 P2-②）

Given archive 确认归档步生成 prompt
Then prompt 含 {SCOPE_AUDIT_TABLE} 注入的全表（fail-soft：注入失败降级单行指引）

Given 任一注入点 computeChangeScopeAudit 异常或降级
Then 输出单行提示，不阻断阶段完成（advisory，零新增门禁）

### FR-04: quick 会话范围归属表
覆盖决策：D-004@v1, D-006@v1
Given 一个活跃 quick 会话（guard.json 存在，工作区有未提交改动）
When scope-audit --change quick-<hex> 或 quick --done 收尾
Then 输出归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面单列）；行数对未提交工作区采集（tracked → git diff HEAD --numstat；untracked → wc -l）；baseAnchor 记 quick-window:<sessionId>

Given quick 已提交（status 空、QUICKLOG 有条目）
Then 明确提示降级读 QUICKLOG 条目文件行（记录态），不出空表冒充实时

Given quick --done 既有审计门禁
Then 门禁判定行为零变化（只加行数展示列）

## 非功能需求
- 兼容性：未调用 scope-audit 时一切行为不变；printQuickAuditReview 签名不变；resolveReconcileActualFiles 增量字段对既有调用方零影响；auditQuickCompletion 判定语义零改动
- 可回退：三处注入与 quick 行数均为纯展示层，revert 单 commit 即回退
- 可测试：三态/归属/行数三档/降级路径/并行会话退栈均有夹具测试（test/scope-audit.test.mjs）
- Windows/Linux/macOS 兼容：路径归一复用既有 normalize 口径，numstat 解析不依赖 GNU awk

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 计划侧仅文件级三态，无行数/估算 |
| D-002@v1 | FR-01, FR-04 | 行数三档全真值，基点锚定 |
| D-003@v1 | FR-02, FR-03 | 纯函数+命令+注入同源 |
| D-004@v1 | FR-04 | quick 归属表复用既有窗口归属 |
| D-005@v1 | FR-03 | 三展示点分工 |
| D-006@v1 | FR-03, FR-04 | 全 advisory 零新门禁 |
