/**
 * lint 归属鉴定降档（共享 helper）——2026-10-15-lint-triage-path-unify。
 *
 * 背景（消费仓坑档案 docs/sillyspec/verify-lint-triage-path-divergence.md，2026-10-15
 * -dsh-engine-acp verify 实证）：降档判定原先只实现在 gates.js 的 verify --done 拦截面；
 * verify step6「noAI 质量扫描」（verify-quality-scan.js）只做 shouldBlockVerifyLint 二值
 * 判定直接 throw——同一失败两路径行为分叉（step6 throw / --done 降档）。本模块把判定与
 * 提示文案收敛为单一来源，两路径同接线。
 *
 * 语义（R4-S-F 实证口径，与 gates.js 原内联实现等价）：
 * - pre-existing（失败提及文件 × 本变更文件集零交集）→ 打印降档 warning，返回 true（放行）；
 * - owned（有交集）/ unattributable（输出无可识别路径）/ 鉴定链异常 → 返回 false
 *   （维持硬拦，保守——无法排除本变更责任时宁可拦不可漏）。
 *
 * @param {{lintCheck?: {failureFiles?: string[]}, cwd: string, changeName: string, specBase: string, importer?: () => Promise<any>}} input
 *   importer 可注入（测试用）；缺省动态加载 ../verify-postcheck.js（triageLintOwnership +
 *   resolveVerifyChangedFiles——运行时 import 避免模块加载环）。
 * @returns {Promise<boolean>} true=降档放行（advisory），false=维持硬拦。
 */
export async function lintOwnershipDowngrade({ lintCheck, cwd, changeName, specBase, importer }) {
  const load = importer || (async () => import('../verify-postcheck.js'))
  let lintOwnership = null
  try {
    const { triageLintOwnership, resolveVerifyChangedFiles } = await load()
    const lintScopeFiles = (resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase }) || [])
      .map((f) => String(f).replace(/\\/g, '/')).filter((f) => !f.startsWith('.sillyspec/'))
    lintOwnership = triageLintOwnership({ failureFiles: (lintCheck && lintCheck.failureFiles) || [], changeFiles: lintScopeFiles })
  } catch { /* 鉴定链异常维持硬拦（保守） */ }
  if (lintOwnership && lintOwnership.verdict === 'pre-existing') {
    const failureFiles = (lintCheck && lintCheck.failureFiles) || []
    console.warn('\n⚠️ Verify lint 实测失败，但归属鉴定为 HEAD 存量债（失败提及文件与本变更文件集零交集）——降档 advisory 不阻断 verify 推进：')
    console.warn(`   存量债文件：${failureFiles.join('、') || '（见上方输出）'}`)
    console.warn('   处置建议：单独清偿（顺手清债解锁全仓 lint 门），或本变更确认无关时设 SILLYSPEC_VERIFY_LINT_GATE=advisory（审计留痕）。债随基线存在，与本变更交付无关。')
    return true
  }
  return false
}
