/**
 * sillyspec run 命令实现（W6 Step8 后退化为 barrel）。
 *
 * 实际逻辑在 src/run/*.js 叶子模块（shared / prompt / quick-audit / scan-profile /
 * gates / complete-handlers / complete / stage / command）。run.js 仅作 barrel：
 * 外部 import 契约通过 re-export 保留（run.js 是 index.js 懒加载入口，零入边叶子，
 * 外部 import 零感知）。
 *
 * test 直接 import 的契约（7 个）：runCommand / ensureStageSteps /
 * parsePorcelainPath / auditQuickCompletion /
 * applyRootPlaceholders / sanitizeProjectName / validateParsedProjects。
 * （outputStep 由 test/output-step-render + archive-task-completion-injection 直接自
 * ./run/prompt.js import，无需 barrel 转出；completeStep/outputStep 的 `_xxxForTest` 测试别名
 * 2026-08-13 全部移除——completion 行为走 CLI 子进程，纯渲染器 outputStep 直 import 源模块。）
 */
// W6 Step8c: 主命令分发（runCommand）+ auto 模式 + ensureStageSteps 搬至 ./run/command.js
export { runCommand, ensureStageSteps } from './run/command.js'
// barrel re-export: parsePorcelainPath + auditQuickCompletion + isQuickMetadata 被 test 直接 import（契约保留）
export { parsePorcelainPath, auditQuickCompletion, isQuickMetadata } from './run/shared.js'
// barrel re-export: applyRootPlaceholders 被 test/prompt-placeholders.test.mjs 直接 import（契约保留）
export { applyRootPlaceholders } from './run/prompt.js'
// barrel re-export: sanitizeProjectName + validateParsedProjects 被 test 直接 import（随 handleScan 搬走，契约保留）
export { sanitizeProjectName, validateParsedProjects } from './run/complete-handlers.js'
