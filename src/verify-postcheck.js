/**
 * Verify Postcheck — CLI 客观测试执行与自报告对账
 *
 * verify 阶段历史上完全依赖 agent 自报告（跑没跑测试、结果如何全写在
 * verify-result.md 里），可被文案绕过。此模块让 CLI 在 verify 完成时
 * 亲自执行 local.yaml 配置的测试命令，与 verify-result.md 的结论对账：
 * 自报告 PASS 但实测失败 → 阻断 verify 完成。
 *
 * 未配置 commands.test（或标记 unavailable）时降级为 warning 不阻断，
 * 兼容无测试项目。
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 测试命令最长执行时间；超时视为失败（防止 CLI 被挂起的测试卡死）
const TEST_TIMEOUT_MS = Number(process.env.SILLYSPEC_TEST_TIMEOUT_MS) || 10 * 60 * 1000
const OUTPUT_TAIL_CHARS = 4000

/**
 * 从 local.yaml 文本提取 commands.test。
 * 轻量正则（与 worktree-deps/scan-postcheck 同风格，不引 yaml 依赖）：
 * 支持带引号与不带引号两种写法；'unavailable' 视为未配置。
 */
export function extractTestCommand(yamlText) {
  if (!yamlText) return null
  const doubleQuoted = yamlText.match(/^\s*test:\s*"([^"]+)"\s*(?:#.*)?$/m)
  const singleQuoted = yamlText.match(/^\s*test:\s*'([^']+)'\s*(?:#.*)?$/m)
  const quoted = doubleQuoted || singleQuoted
  if (quoted && quoted[1]) {
    return quoted[1].toLowerCase() === 'unavailable' ? null : quoted[1].trim()
  }
  const bare = yamlText.match(/^\s*test:\s*([^\n#"']+?)\s*(?:#.*)?$/m)
  if (bare && bare[1]) {
    const cmd = bare[1].trim()
    return cmd.toLowerCase() === 'unavailable' ? null : cmd
  }
  return null
}

/**
 * 执行 verify 实测：读取 local.yaml 的 commands.test 并由 CLI 执行。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 项目根目录（测试执行目录）
 * @param {string} opts.specBase - .sillyspec（或平台 specRoot）目录
 * @param {string|null} [opts.changeName]
 * @returns {{
 *   status: 'passed'|'failed'|'skipped',
 *   command: string|null,
 *   exitCode: number|null,
 *   durationMs: number|null,
 *   outputTail: string|null,
 *   reason: string|null,
 *   resultPath: string|null,
 * }}
 */
export function runVerifyTestCheck({ cwd, specBase, changeName = null }) {
  const localYamlPath = join(specBase, 'local.yaml')
  const yamlText = existsSync(localYamlPath) ? readFileSync(localYamlPath, 'utf8') : null
  const command = extractTestCommand(yamlText)

  if (!command) {
    return {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: yamlText
        ? 'local.yaml 未配置 commands.test（或标记 unavailable）'
        : `local.yaml 不存在（${localYamlPath}）`,
      resultPath: null,
    }
  }

  const startedAt = Date.now()
  let exitCode = 0
  let output = ''
  let reason = null
  try {
    output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout: TEST_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    // execSync 抛错 = 非零退出 / 超时 / spawn 失败
    exitCode = typeof e.status === 'number' ? e.status : 1
    output = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message
    reason = e.signal === 'SIGTERM' && Date.now() - startedAt >= TEST_TIMEOUT_MS
      ? `测试命令超时（>${TEST_TIMEOUT_MS / 1000}s）`
      : `测试命令退出码 ${exitCode}`
  }
  const durationMs = Date.now() - startedAt
  const outputTail = output.length > OUTPUT_TAIL_CHARS ? '…' + output.slice(-OUTPUT_TAIL_CHARS) : output

  const result = {
    status: exitCode === 0 ? 'passed' : 'failed',
    command,
    exitCode,
    durationMs,
    outputTail,
    reason,
    resultPath: null,
  }

  // 结果落盘：.runtime/verify-runs/<ts>/test-result.json（供追溯与 SillyHub 消费）
  try {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')
    const runDir = join(specBase, '.runtime', 'verify-runs', ts)
    mkdirSync(runDir, { recursive: true })
    const resultPath = join(runDir, 'test-result.json')
    writeFileSync(resultPath, JSON.stringify({
      change: changeName,
      command,
      exit_code: exitCode,
      status: result.status,
      duration_ms: durationMs,
      output_tail: outputTail,
      reason,
      ran_at: new Date().toISOString(),
    }, null, 2) + '\n')
    result.resultPath = resultPath
  } catch (e) {
    console.warn(`⚠️  verify 实测结果落盘失败: ${e.message}`)
  }

  return result
}

/** 打印实测结果（人类/agent 可读） */
export function printVerifyTestCheck(result) {
  if (result.status === 'skipped') {
    console.warn(`\n⚠️  Verify 实测跳过：${result.reason}`)
    console.warn('   建议在 local.yaml 的 commands.test 配置真实测试命令，让 CLI 可客观对账。')
    return
  }
  if (result.status === 'passed') {
    console.log(`\n✅ Verify 实测通过：\`${result.command}\` 退出码 0（${(result.durationMs / 1000).toFixed(1)}s）`)
  } else {
    console.error(`\n❌ Verify 实测失败：\`${result.command}\` — ${result.reason}`)
    if (result.outputTail) {
      const tail = result.outputTail.split('\n').slice(-20).join('\n')
      console.error('   输出（末尾）：')
      for (const line of tail.split('\n')) console.error(`   | ${line}`)
    }
  }
  if (result.resultPath) {
    console.log(`📄 实测结果已写入: ${result.resultPath}`)
  }
}
