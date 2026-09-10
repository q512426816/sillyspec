---
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖——基座）
- task-01
- task-02

## Wave 2（依赖 Wave 1——四个消费点薄注入）
- task-03
- task-04
- task-05
- task-06

## Wave 3（依赖 Wave 1-2——全量测试收口）
- task-07

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 纯函数 computeChangeScopeAudit 双模式 + collectNumstatByPath 行数三档 + renderScopeAuditTable | W1 | P0 | — | FR-01, FR-02, FR-04, D-002@v1, D-003@v1 | 新模块 src/scope-audit.js；计划侧解析 import change-list.js（禁自研）；行数 tracked=numstat/untracked=wc-l/binary=BIN；全降级路径带 degradedReason |
| task-02 | resolveReconcileActualFiles 补 export + 返回 baseAnchor | W1 | P0 | — | FR-01, D-002@v1 | verify-postcheck.js 纯增量：形态 A=meta 锚 commit（baselineCommit>actualBaseHash>baseHash），形态 B=merge-base hash\|null；null 时 numstat 降级不出行数（Grill P2-①） |
| task-03 | scope-audit 命令路由 | W2 | P0 | task-01, task-02 | FR-02, D-003@v1 | index.js case 'scope-audit'；--change 必填（用法错 exit 2）/运行错 fail-soft exit 1/--json；对齐 verify-probes :897 先例 |
| task-04 | execute --done 全表+快照（双路径）与 verify --done 一行漂移 | W2 | P0 | task-01, task-02 | FR-03, D-005@v1, D-006@v1 | complete.js：completeStep/continueStep 两路径收敛点同调 helper；快照 .runtime/scope-audit-<change>.json；漂移过滤组合在 scope-audit 侧做（filterDeliverableFiles 后追加排 .sillyspec/docs/**，勿改本体——Grill P2-②） |
| task-05 | archive --confirm {SCOPE_AUDIT_TABLE} 占位与注入 | W2 | P1 | task-01, task-02 | FR-03, D-003@v1 | stages/archive.js 占位 + run/prompt.js fail-soft 注入（对齐 :995 ARCHIVE_IMPACT_AUDIT 先例） |
| task-06 | quick --done 文件行/审计行升级行数 | W2 | P1 | task-01 | FR-04, D-004@v1, D-006@v1 | complete-handlers.js :1196-1255 消费区 import collectNumstatByPath；auditQuickCompletion 判定零改动；quick 提交后降级提示读 QUICKLOG |
| task-07 | 全量夹具测试 + 回归 | W3 | P0 | task-01..06 | 全 FR | test/scope-audit.test.mjs：三态/归属/行数三档/降级（含 baseAnchor=null）/并行退栈不进表；npm test 全绿 |

## 关键路径
task-01 → task-04 → task-07（纯函数 → 双路径注入 → 测试收口）

## 全局验收标准
1. `npm test` 全绿（含新增 test/scope-audit.test.mjs 与既有回归）
2. scope-audit 对活跃 full-flow 变更输出三态全表，行数与手跑 `git diff --numstat` 一致（binary=BIN、untracked=wc-l）
3. scope-audit 对 quick 会话输出归属表；已提交 quick 降级提示（不出空表）
4. execute --done 打全表+落快照（continueStep wait 解除路径同样落）；verify --done 一行漂移；archive --confirm prompt 含全表
5. 三处注入与 quick 行数全部 fail-soft：computeChangeScopeAudit 异常不阻断阶段完成
6. 未调用 scope-audit、未走到注入点时一切既有行为不变（含 printQuickAuditReview 签名与 auditQuickCompletion 门禁）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-02（计划侧无行数列，三态 only） |
| D-002@v1 | task-01, task-02 | AC-02（numstat/wc-l 真值 + baseAnchor 锚定） |
| D-003@v1 | task-01, task-03, task-04, task-05 | AC-02/04（命令与注入同源纯函数） |
| D-004@v1 | task-01, task-06 | AC-03（归属表 + QUICKLOG 降级） |
| D-005@v1 | task-04, task-05 | AC-04（三展示点分工） |
| D-006@v1 | task-04, task-06 | AC-05（advisory 零新门禁） |
