---
author: qinyi
created_at: 2026-09-09T05:30:00+08:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI | noAI 步跑全量诊断并渲染；顶层命令只读直跑 |
| agent | 读报告→修复决策→执行修复→汇总 |

## 功能需求

### FR-01: 阶段折叠（doctor 移出 READONLY + _cliAction）
覆盖决策：D-001@v1
Given `sillyspec run doctor`
When step1
Then noAI `doctorRunDiagnostics` 自动执行（runDoctorDiagnostics 含三新维度 + 模块文档健康 + 决策版本漂移的 CLI 可算部分）→ renderDoctorSummary 渲染 + doctor-diagnosis.json 落盘 → 自动 advance；bash 教学步不存在

Given 顶层 `sillyspec doctor`（非 --json）
Then 直跑诊断 + 渲染，不 initChange/不刷 lastActive（只读承诺）；--json/--status 分支行为不变

### FR-02: 三类探测器
覆盖决策：D-002@v1
Given worktree 残留（.runtime/worktrees 目录无对应 git worktree 或 sillyspec/* 分支无活跃变更）
Then worktree_health 维度 findings 列明（复用 WorktreeManager.doctor + 分支对账补充；safe_actions 指向既有 cleanup）

Given node 版本低于 package.json engines.node（^/>=/= 前缀）
Then build_env 维度 warning；复杂区间标 unknown 不判红

Given 无任何 MCP 配置文件
Then mcp_endpoints 维度 skipped 注记（不判红）

### FR-03: 步骤重排与文档
覆盖决策：D-003@v1
Given 本变更落地
Then doctor 阶段 3 步（noAI 诊断/agent 修复决策/agent 汇总）；docs/prompt 镜像 _verify exit 0；模块卡+sidecar+file-lifecycle 同步；--confirm 写操作语义零变化

## 非功能需求
- 兼容性：在途 doctor 变更靠 ensureStageSteps 按名重播种自愈（command.js:158-199）；探测异常带内 skipped
- 可回退：constants 一行回退即回只读短路
- 可测试：三 detector fixture 各 1+ 用例；steps 结构断言；renderDoctorSummary 关键行锁

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 折叠/复用（不另造探测） |
| D-002@v1 | FR-02 | 三 detector 只读 fail-soft（skipped 带内） |
| D-003@v1 | FR-03 | 写操作不动 |
