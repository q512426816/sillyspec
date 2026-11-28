#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook 入口（2026-11-28-file-write-optimistic-lock）。
 *
 * 职责：Read 完成后记录目标文件的内容 sha256 基线，供 PreToolUse 写前校验比对
 * （写入层乐观锁的另一半在 claude-pre-tool-use.cjs）。
 *
 * Claude Code settings.json 配置片段：
 * {
 *   "hooks": {
 *     "PostToolUse": [
 *       { "matcher": "Read",
 *         "hooks": [{ "type": "command",
 *                     "command": "node /path/to/sillyspec/src/hooks/claude-post-tool-use.cjs" }] }
 *     ]
 *   }
 * }
 *
 * 语义：本 hook **恒 exit 0**（只记录不拦截）。任何异常静默放行并留一行痕——
 * 乐观锁是增强，不能因状态记录故障影响用户工作流。
 */

'use strict'

const fs = require('fs')
const path = require('path')

/** 从 cwd 向上找 spec 根（原则同 pre hook：有 .sillyspec 的最近祖先）。 */
function findSpecRoot(startDir) {
  let dir = path.resolve(startDir || process.cwd())
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, '.sillyspec'))) return path.join(dir, '.sillyspec')
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

async function main() {
  let input = ''
  try {
    input = await readStdin()
  } catch (e) {
    console.error(`[sillyspec-hook] stdin 读取失败（放行）: ${e.message}`)
    process.exit(0)
  }

  let parsed
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    console.error(`[sillyspec-hook] stdin JSON 解析失败（放行）: ${e.message}`)
    process.exit(0)
  }

  const toolName = parsed.tool_name || ''
  if (toolName !== 'Read') process.exit(0)

  const toolInput = parsed.tool_input || {}
  const filePath = toolInput.file_path || toolInput.filePath
  if (!filePath) process.exit(0)

  const specRoot = findSpecRoot(parsed.cwd || process.cwd())
  if (!specRoot) process.exit(0)

  try {
    const mod = await import('../file-guard.js')
    const r = mod.recordRead({ specRoot, sessionId: parsed.session_id, filePath })
    if (!r.recorded && r.reason && r.reason !== 'not-monitored') {
      console.error(`[sillyspec-hook] 读取基线未记录（放行）: ${r.reason} ${filePath}`)
    }
  } catch (e) {
    console.error(`[sillyspec-hook] file-guard 加载失败（放行）: ${e.message}`)
  }
  process.exit(0)
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => chunks.push(chunk))
    process.stdin.on('end', () => resolve(chunks.join('')))
    process.stdin.on('error', reject)
    setTimeout(() => {
      process.stdin.destroy()
      resolve('')
    }, 3000)
  })
}

main().catch((e) => {
  console.error(`[sillyspec-hook] 未捕获异常（放行）: ${e && e.message}`)
  process.exit(0)
})
