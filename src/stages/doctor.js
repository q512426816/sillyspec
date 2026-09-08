// SillySpec Doctor — 项目自检阶段
// 检查项通过 prompt 中的 bash 命令执行，此文件仅定义步骤结构


/**
 * SillySpec Doctor — 项目自检阶段（2026-09-09-doctor-noai 折叠：6 步 → 3 步）
 *
 * step1 = noAI _cliAction doctorRunDiagnostics（runDoctorDiagnostics 全量诊断：八维既有
 * + worktree_health/build_env/mcp_endpoints 三新 + renderDoctorSummary 渲染 +
 * doctor-diagnosis.json 落盘）；step2 = agent 修复决策与执行（消费报告，safe_actions/
 * next_step 逐维决策，--confirm 写操作独立 flag 调用）；step3 = agent 汇总。
 * 顶层 sillyspec doctor 命令（index.js case）不经本定义——只读直跑诊断渲染。
 */
export const definition = {
  name: 'doctor',
  title: '项目自检',
  description: 'CLI 全量诊断 + agent 修复决策与执行',
  auxiliary: true,
  steps: [
    {
      name: 'CLI 全量诊断',
      noAI: true,
      _cliAction: 'doctorRunDiagnostics',
      prompt: `（本步由 CLI 自动执行：runDoctorDiagnostics 八维既有 + worktree_health/build_env/mcp_endpoints 三新探测器 + 模块文档健康 + 决策版本漂移的 CLI 可算部分；输出 renderDoctorSummary 逐维报告并落盘 doctor-diagnosis.json）`,
      outputHint: '诊断报告（CLI 生成）',
      optional: false
    },
    {
      name: '修复决策与执行',
      prompt: `读取 step1 诊断报告（上方 CLI 输出 + .sillyspec/.runtime/doctor-diagnosis.json），逐维给修复决策。

### 操作
1. 对每个 ⚠️/❌ 维度：按其 safe_actions / findings 内提示决定「修复 / 豁免（写明理由）/ 搁置（写明风险）」
2. 可立即执行的修复当场做：
   - 进度库类：sillyspec doctor --cleanup-remnant/--gc-unstamped-runs/--align-execute-progress（默认 dry-run，--confirm 落盘）
   - worktree 残留：sillyspec worktree cleanup <变更名>（先 git branch -d 或 doctor --cleanup-ghosts）
   - 文档类：模块卡/生命周期文档按 findings 指引同步
   - 指针类：按 pointer_health findings 的恢复三选一（重建 scan / platform disconnect / 显式 --spec-dir）
3. 决策待复核项（knowledge/decisions/）与模块文档健康的语义部分：列出待办，非本步强制执行

### 输出
逐维决策表（维度 | 状态 | 决策 | 动作）+ 已执行修复清单`,
      outputHint: '修复决策表',
      optional: false
    },
    {
      name: '汇总报告',
      prompt: `汇总本次自检。

### 输出
1. 诊断总览（几维过/警告/失败/跳过）
2. 已执行修复 + 效果
3. 剩余风险与后续建议（含豁免项理由）`,
      outputHint: '自检汇总',
      optional: false
    }
  ]
}
