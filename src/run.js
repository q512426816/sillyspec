/**
 * sillyspec run 命令实现（W6 Step8 后退化为 barrel）。
 *
 * 实际逻辑在 src/run/*.js 叶子模块（shared / prompt / quick-audit / scan-profile /
 * gates / complete-handlers / complete / stage / command）。run.js 仅作 barrel：
 * 外部 import 契约通过 re-export 保留（run.js 是 index.js 懒加载入口，零入边叶子，
 * 外部 import 零感知）。
 *
 * test 直接 import 的契约（9 个）：runCommand / ensureStageSteps /
 * _completeStepForTest / _outputStepForTest / parsePorcelainPath / auditQuickCompletion /
 * applyRootPlaceholders / sanitizeProjectName / validateParsedProjects。
 */
// W6 Step8c: 主命令分发（runCommand）+ auto 模式 + ensureStageSteps 搬至 ./run/command.js
export { runCommand, ensureStageSteps } from './run/command.js'
// barrel re-export: parsePorcelainPath + auditQuickCompletion 被 test 直接 import（契约保留）
export { parsePorcelainPath, auditQuickCompletion } from './run/shared.js'
// barrel re-export: applyRootPlaceholders 被 test/prompt-placeholders.test.mjs 直接 import（契约保留）
export { applyRootPlaceholders } from './run/prompt.js'
// barrel re-export: sanitizeProjectName + validateParsedProjects 被 test 直接 import（随 handleScan 搬走，契约保留）
export { sanitizeProjectName, validateParsedProjects } from './run/complete-handlers.js'
// 测试专用导出：completeStep 是 step 完成处理核心、outputStep 是 prompt 渲染器，characterization 测试直接驱动
export { completeStep as _completeStepForTest } from './run/complete.js'
export { outputStep as _outputStepForTest } from './run/prompt.js'
