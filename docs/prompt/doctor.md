---
extracted_from: src/stages/doctor.js（definition.steps[].prompt）+ src/run/prompt.js（注入框架）
updated_at: 2026-09-09
---

# doctor 阶段提示词镜像

> 由 `node docs/prompt/_extract.mjs` 提取；正文手动同步（结构以 _extracted.json 为准）。
> 2026-09-09-doctor-noai：阶段折叠 6 步 → 3 步（step1 noAI CLI 全量诊断 / step2 修复决策与执行 / step3 汇总）。

## Step 1/3：CLI 全量诊断

本步由 CLI 自动执行：runDoctorDiagnostics 八维既有 + worktree_health/build_env/mcp_endpoints 三新探测器 + 模块文档健康 + 决策版本漂移的 CLI 可算部分；输出 renderDoctorSummary 逐维报告并落盘 doctor-diagnosis.json。agent 无操作。

## Step 2/3：修复决策与执行

读取 step1 诊断报告（上方 CLI 输出 + .sillyspec/.runtime/doctor-diagnosis.json），逐维给修复决策。

### 操作
1. 对每个 ⚠️/❌ 维度：按其 safe_actions / findings 内提示决定「修复 / 豁免（写明理由）/ 搁置（写明风险）」
2. 可立即执行的修复当场做：
   - 进度库类：sillyspec doctor --cleanup-remnant/--gc-unstamped-runs/--align-execute-progress（默认 dry-run，--confirm 落盘）
   - worktree 残留：sillyspec worktree cleanup <变更名>（先 git branch -d 或 doctor --cleanup-ghosts）
   - 文档类：模块卡/生命周期文档按 findings 指引同步
   - 指针类：按 pointer_health findings 的恢复三选一（重建 scan / platform disconnect / 显式 --spec-dir）
3. 决策待复核项（knowledge/decisions/）与模块文档健康的语义部分：列出待办，非本步强制执行

### 输出
逐维决策表（维度 | 状态 | 决策 | 动作）+ 已执行修复清单

## Step 3/3：汇总报告

1. 诊断总览（几维过/警告/失败/跳过）
2. 已执行修复 + 效果
3. 剩余风险与后续建议（含豁免项理由）
