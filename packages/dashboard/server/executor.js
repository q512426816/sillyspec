import { spawn } from 'child_process'

/**
 * Execute a SillySpec CLI command in the given project directory
 * @param {string} projectPath - Path to the project directory
 * @param {string} command - Command to execute (e.g., 'progress status')
 * @param {function} onOutput - Callback for stdout/stderr output
 * @param {function} onComplete - Callback when command completes
 * @returns {function} Kill function to terminate the process
 */
export function executeCommand(projectPath, command, onOutput, onComplete) {
  const args = command.split(' ')
  const proc = spawn('npx', ['sillyspec', ...args], {
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

export { executeCommand, executeNextStep, executeProgressStatus, executeReset }
