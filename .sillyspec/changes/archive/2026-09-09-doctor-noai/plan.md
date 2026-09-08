---
author: qinyi
created_at: 2026-09-09T05:45:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 三 detector + renderDoctorSummary | W1 | P0 | — | FR-02, D-002@v1 | doctor-diagnostics.js：worktree 薄适配（WorktreeManager.doctor 形状转换+分支对账）/build_env（engines 前缀+包管理器）/mcp_endpoints（项目级配置在场）；skipped 带内降级；renderDoctorSummary（全新契约：逐维图标+label+findings 首行+safe_actions）+ NEW:test/doctor-noai-fold.test.mjs detector 用例 |
| task-02 | 常量迁移 + _cliAction + 步骤重排 + 顶层改道 | W2 | P0 | task-01 | FR-01, D-001@v1 | constants.js 移出 READONLY；stage.js 注册 doctorRunDiagnostics（复用 renderDoctorSummary+writeDoctorDiagnosis）；complete.js 注册；doctor.js 6→3 步（noAI 综合诊断含模块文档健康 modules.js:324 + 决策版本漂移 CLI 可算部分/agent 修复决策/agent 汇总）；index.js 非 json doctor 直跑诊断渲染（--json/--status 不动） |
| task-03 | 测试收口 + 文档 | W3 | P1 | task-02 | FR-03, D-003@v1 | steps 结构断言（noAI 步/bash 步退场）+ renderDoctorSummary 关键行锁 + 顶层只读断言（无 initChange/lastActive）；docs/prompt/doctor.md 镜像；stages/core-engine 卡 sidecar；file-lifecycle |

## 关键路径
task-01 → task-02 → task-03（同文件面串行）

## 全局验收标准
1. run doctor step1 noAI 自动执行（输出含 renderDoctorSummary 格式行）；bash 教学步消失
2. 顶层 sillyspec doctor：--json/--status 经 index 拦截保持行为；非 json 形态诊断渲染零副作用（无 initChange/无 lastActive）
3. doctor --json 含三新维度；探测异常 skipped 注记
4. 新测试全过 + doctor 族回归绿；--confirm 写操作语义零变化

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02 | AC-1（折叠/复用） |
| D-002@v1 | task-01 | AC-3（三 detector skipped 带内） |
| D-003@v1 | task-03 | AC-4（写操作零变化） |
