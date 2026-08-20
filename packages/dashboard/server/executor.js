import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

// sillyspec CLI 入口（包根/bin/sillyspec.js）：dashboard server 随 sillyspec npm 包分发
// （src/index.js 的 dashboard 分支 import 本目录），该相对位置在源码仓与 npm 包内一致
// （packages/dashboard/server/ → 包根/bin/）。
const SILLYSPEC_ENTRY = fileURLToPath(new URL('../../../bin/sillyspec.js', import.meta.url))

/**
 * Execute a SillySpec CLI command in the given project directory
 * @param {string} projectPath - Path to the project directory
 * @param {string} command - Command to execute (e.g., 'progress status')
 * @param {function} onOutput - Callback for stdout/stderr output
 * @param {function} onComplete - Callback when command completes
 * @returns {function} Kill function to terminate the process
 */
export function executeCommand(projectPath, command, onOutput, onComplete) {
  const args = String(command || '').trim().split(/\s+/).filter(Boolean)
  // process.execPath 直接指定解释器跑包内入口：spawn('npx') 在 Windows 无法解析
  // npx.cmd（体检 BUG-11，CLI 执行功能全灭）；数组参数无 shell，同时杜绝未来为兼容
  // .cmd 加 shell:true 而引入命令注入（体检 SEC-08）
  const proc = spawn(process.execPath, [SILLYSPEC_ENTRY, ...args], {
    cwd: projectPath,
    env: { ...process.env }
  })

  proc.stdout.on('data', (data) => {
    const output = data.toString()
    if (onOutput) {
      onOutput({ type: 'stdout', data: output })
    }
  })

  proc.stderr.on('data', (data) => {
    const output = data.toString()
    if (onOutput) {
      onOutput({ type: 'stderr', data: output })
    }
  })

  proc.on('close', (code) => {
    if (onComplete) {
      onComplete({ code, signal: null })
    }
  })

  proc.on('error', (err) => {
    if (onOutput) {
      onOutput({ type: 'error', data: err.message })
    }
    if (onComplete) {
      onComplete({ code: -1, signal: err.signal })
    }
  })

  // Return kill function
  return () => {
    proc.kill('SIGTERM')
  }
}

/**
 * Execute a next step command (for dashboard automation)
 * @param {string} projectPath - Path to the project directory
 * @param {function} onOutput - Callback for stdout/stderr output
 * @param {function} onComplete - Callback when command completes
 * @returns {function} Kill function to terminate the process
 */
export function executeNextStep(projectPath, onOutput, onComplete) {
  return executeCommand(projectPath, 'next', onOutput, onComplete)
}

/**
 * Execute a progress status command
 * @param {string} projectPath - Path to the project directory
 * @param {function} onOutput - Callback for stdout/stderr output
 * @param {function} onComplete - Callback when command completes
 * @returns {function} Kill function to terminate the process
 */
export function executeProgressStatus(projectPath, onOutput, onComplete) {
  return executeCommand(projectPath, 'progress status --json', onOutput, onComplete)
}

/**
 * Execute a reset command for a specific stage
 * @param {string} projectPath - Path to the project directory
 * @param {string} stage - Stage to reset
 * @param {function} onOutput - Callback for stdout/stderr output
 * @param {function} onComplete - Callback when command completes
 * @returns {function} Kill function to terminate the process
 */
export function executeReset(projectPath, stage, onOutput, onComplete) {
  return executeCommand(projectPath, `progress reset --stage ${stage}`, onOutput, onComplete)
}

