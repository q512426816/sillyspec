/**
 * diagnostic-codes.js — machine-interface 族诊断码表单一源
 *
 * 为什么需要：信封 errors/warnings 是自由文本中文句子，程序化消费方（SillyHub/未来 MCP
 * 消费者）无法按错误类型稳定分支——提示语改一个字就是一次静默破坏性变更。本表给
 * gate/derive/progress show 三面的自产错误配稳定 snake_case 身份码（2026-09-17
 * OpenSpec 源码对比三轮评审②号项，change 2026-09-17-mi-diagnostic-codes）。
 *
 * 纪律（D-002@v1 硬边界）：
 *   - 恰 10 码：信封级 4（exit 2 面）+ check 级 6（gate/derive 失败面）。
 *   - 只码 machine-interface 族自产错误——stage-contract 校验器散文、doctor/validate/
 *     scope-audit 面首期不碰（码标识失败面，不标识每条消息）。
 *   - 扩码走变更流程追加；本表是码身份唯一源——契约文档诊断码目录（interface-contract.md）
 *     与运行时发射不得出现表外码，test/diagnostic-codes-parity.test.mjs 双向钉死
 *     （OpenSpec 的 agent-contract 无 parity 测试，此为反超点）。
 *
 * 零依赖叶子模块（不 import 仓内任何其他 src 模块，防环）。
 */

/**
 * 码 → { surface: 消费命令面, exit: 该失败面的退出码语义, trigger: 触发条件 }。
 * surface 取值 ∈ gate / derive / progress show（CLI 子命令视角）。
 */
export const DIAGNOSTIC_CODES = Object.freeze({
  // ── 信封级（无法核验，exit 2）──
  db_missing: {
    surface: ['gate', 'derive', 'progress show'],
    exit: 2,
    trigger: '进度库不存在（只读契约：不为其建库，fail-closed）',
  },
  change_not_found: {
    surface: ['gate', 'derive'],
    exit: 2,
    trigger: '变更名在进度库无记录',
  },
  unknown_facet: {
    surface: ['derive'],
    exit: 2,
    trigger: 'facet ∉ FACETS 白名单（用法错）',
  },
  internal_error: {
    surface: ['gate', 'derive', 'progress show'],
    exit: 2,
    trigger: '内部异常兜底（stdout 仍为合法 JSON）',
  },
  // ── check 级（事实性阻断，exit 1）──
  artifacts_invalid: {
    surface: ['gate', 'derive'],
    exit: 1,
    trigger: 'runValidators 失败（gate artifacts check 与 derive artifacts facet 同源）',
  },
  design_file_ref_invalid: {
    surface: ['gate'],
    exit: 1,
    trigger: 'design 文件清单行级核验失败（直承 design-facts.js 既有稳定码）',
  },
  transition_blocked: {
    surface: ['gate'],
    exit: 1,
    trigger: 'checkTransition 不允许（含 failed_post_check 门控）',
  },
  execute_evidence_unchanged: {
    surface: ['gate', 'derive'],
    exit: 1,
    trigger: 'base..head 无代码变更（checkbox ≠ implementation）',
  },
  task_reviews_invalid: {
    surface: ['gate', 'derive'],
    exit: 1,
    trigger: 'validateTaskReviews 失败（review.json 缺失/schema/verdict=fail）',
  },
  verify_test_failed: {
    surface: ['gate', 'derive'],
    exit: 1,
    trigger: 'commands.test 实测失败',
  },
});

/** gate check id → 失败码（六 check 全覆盖；表外 id 返回 undefined，调用方不挂键）。 */
const CHECK_ID_TO_CODE = Object.freeze({
  artifacts: 'artifacts_invalid',
  'design-file-list': 'design_file_ref_invalid',
  transition: 'transition_blocked',
  'execute-evidence': 'execute_evidence_unchanged',
  'task-reviews': 'task_reviews_invalid',
  'verify-test': 'verify_test_failed',
});

/**
 * @param {string} checkId - gate check id（artifacts/design-file-list/transition/execute-evidence/task-reviews/verify-test）
 * @returns {string|undefined} 对应失败码；表外 id 返回 undefined（信封不挂 code 键）
 */
export function checkCode(checkId) {
  return CHECK_ID_TO_CODE[checkId];
}
