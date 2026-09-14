---
author: qinyi
created_at: 2026-09-14 09:55:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-14-quick-exit-tiered-gates

## 复杂度分类

```
plan_level: full
reason: 文件清单 17 项跨 core-engine/runtime/cli-entry/setup 四模块，涉及 validator/审计链行为变更与新信号模块，6 任务含实证校准
estimated_files: 16
cross_module: true
has_schema_change: false
has_state_machine_change: false
needs_parallel_execution: false
needs_human_review: true
```

## Wave 1（并行，无依赖）
- task-01
- task-04

## Wave 2（依赖前序 Wave）
- task-02

## Wave 3（依赖前序 Wave）
- task-03

## Wave 4（依赖前序 Wave）
- task-05

## Wave 5（依赖前序 Wave）
- task-06

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 信号层：quick-gate-profile.js 纯函数+风险路径表+矩阵单测 | W1 | P0 | — | FR-02, D-002@v1, D-004@v2, D-006@v1, D-007@v1, D-009@v1 | computeGateProfile+THRESHOLDS 单点+resolveGateThresholds（local.yaml quick-gate 四键覆写，缺省=校准默认值）；change-risk-profile 只加数据表；config-schema/local.yaml.example 登记 |
| task-04 | 规则面：AGENTS.md 判规模条款改写+init 模板镜像 | W1 | P1 | — | FR-01, D-001@v1 | 选道判据语义化；与代码无耦合可并行 |
| task-02 | 门禁接线：audit 链挂画像+[gate] 落账+--no-docs | W2 | P0 | task-01 | FR-03, D-002@v1, D-003@v1, D-005@v1 | run/shared.js 挂载→complete-handlers auditNotes→quick-audit 打印；全部 advisory |
| task-03 | scope-audit 出口：画像进表格与 --json 双出口 | W3 | P0 | task-01, task-02 | FR-04, D-008@v1 | computeChangeScopeAudit 并入 gateProfile，复用 review 携带不重复计算 |
| task-05 | 阈值校准：sillyhub 真实图谱重放重算交叉表 | W4 | P1 | task-03 | FR-05, D-006@v1 | scope-audit --json 批量重放；产出=回写 THRESHOLDS 常量+校准依据落变更目录（design.md 校准记录段）——**不动模块卡**，core-engine.md 单一写者归 task-06（W4 共写冲突消解，plan-review gap 处置） |
| task-06 | 模块卡同步：core-engine/runtime/cli-entry 三卡 | W5 | P1 | task-01, task-02, task-03, task-05 | FR-02, FR-03, FR-04, FR-05 | 记录新文件登记、接线形态与校准定稿值（模块卡唯一写者，吸收 task-05 的落卡需求；依赖 task-05 定稿值） |

## 关键路径
task-01 → task-02 → task-03 → task-05（信号层→接线→出口→校准，最长依赖链）

## 全局验收标准
1. `npm test` / `npm run lint` 全绿（新增 quick-gate-profile 矩阵单测 + audit L0/L1/L2 三态集成 + scope-audit 双出口回归）
2. 未 scan/无 module-map 项目：degraded 降级档生效，quick --done 行为零变化（advisory 不阻断、exit code 不变）
3. 已 scan 项目：跨 2 模块 4 文件构造用例触发 L1 [gate] 块并落 quicklog auditNotes；auth 路径改动触发 L2 风险命中提示；--no-docs 豁免留痕可查（FR-03 GWT 逐条）
4. `scope-audit --change <quick会话> --json` 含 gateProfile 字段；归档变更重放零回归（既有三态表/归属表/--file 出口不变）
5. AGENTS.md 第 6 条与 templates/agents-instruction.md 均不再以文件数为选道主判据（FR-01）
6. THRESHOLDS 经 sillyhub 真实 module-map 重放校准定稿，依据记录在案（FR-05）
7. verify 侧 detectChangeRisk 判级零变化（change-risk-profile 只增数据表——回归测试证明）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-04 | 全局验收 5 |
| D-002@v1 | task-01, task-02 | 全局验收 1/3 |
| D-003@v1 | task-02 | 全局验收 2（advisory 不阻断） |
| D-004@v2 | task-01 | FR-02 riskHits 仅路径模式（矩阵单测） |
| D-005@v1 | task-02 | FR-03 未声明脏文件走既有归属分流（集成用例） |
| D-006@v1 | task-01, task-05 | THRESHOLDS 单点 + 校准定稿 |
| D-007@v1 | task-01 | 独立纯函数模块（无 IO，单测可证） |
| D-008@v1 | task-03 | 全局验收 4 |
| FR-01 | task-04 | 全局验收 5 |
| FR-02 | task-01 | 矩阵单测全绿 |
| FR-03 | task-02 | 三态集成用例 |
| FR-04 | task-03 | 双出口回归用例 |
| FR-05 | task-05 | 校准记录 |
