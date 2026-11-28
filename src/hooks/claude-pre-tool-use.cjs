#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook 入口
 *
 * 从 stdin 读取 JSON，调用 worktree-guard 判断是否拦截。
 *
 * Claude Code hooks.json 配置：
 * {
 *   "hooks": {
 *     "PreToolUse": [
 *       {
 *         "matcher": "Edit|Write|MultiEdit|Bash",
 *         "hooks": [
 *           {
 *             "type": "command",
 *             "command": "node /path/to/sillyspec/src/hooks/claude-pre-tool-use.cjs"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */

'use strict'

const path = require('path')
const fs = require('fs')

// 动态 import ESM 模块
async function main() {
  // Claude Code hook 通过 stdin 传入 JSON
  let input = ''
  try {
    input = await readStdin()
  } catch (e) {
    // 无法读取 stdin → 放行（安全优先于阻断），但留痕——本 hook 是阶段门禁唯一执行点，
    // 静默解除全部防护会让故障无从诊断
    console.error(`[sillyspec-hook] stdin 读取失败（放行）: ${e.message}`)
    process.exit(0)
  }

  let parsed
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    console.error(`[sillyspec-hook] stdin JSON 解析失败（放行）: ${e.message}；input 长度 ${input.length}`)
    process.exit(0)
  }

  // 解析 Claude Code hook 输入格式
  // 格式：{ tool_name: string, tool_input: { ... } }
  const toolName = parsed.tool_name || parsed.tool || ''
  const toolInput = parsed.tool_input || {}

  // 转换为 shouldBlock 的输入格式
  const toolMap = {
    'Write': 'Write',
    'Edit': 'Edit',
    'MultiEdit': 'MultiEdit',
    'Bash': 'Bash',
  }

  const mappedTool = toolMap[toolName]
  if (!mappedTool) {
    // 不在拦截范围内的工具 → 放行
    process.exit(0)
  }

  // 构造 opts
  const opts = { tool: mappedTool }
  if (mappedTool === 'Bash') {
    opts.command = toolInput.command || ''
  } else {
    // Write/Edit/MultiEdit
    const fp = toolInput.file_path || toolInput.filePath
    if (fp) opts.filePath = fp
    // MultiEdit 可能有多个文件
    if (mappedTool === 'MultiEdit') {
      const fps = toolInput.edits
        ? toolInput.edits.map(e => e.file_path || e.filePath).filter(Boolean)
        : []
      if (fps.length > 0) opts.filePaths = fps
    }
  }

  // 加载 worktree-guard（ESM）
  let shouldBlock
  try {
    const mod = await import('./worktree-guard.js')
    shouldBlock = mod.shouldBlock
  } catch (e) {
    // 模块加载失败 → 放行（不因为 hook 出错阻断工作流）
    // eslint-disable-next-line no-console
    console.error(`[sillyspec-hook] 模块加载失败: ${e.message}`)
    process.exit(0)
  }

  const result = shouldBlock(opts)

  if (result.blocked) {
    // 输出错误信息（Claude Code 会显示给 agent）
    // eslint-disable-next-line no-console
    console.error(`[sillyspec] ❌ ${result.reason || 'blocked by worktree guard'}`)
    process.exit(2) // exit code 2 = 阻止工具执行
  }

  // ── 写入层乐观锁（2026-11-28-file-write-optimistic-lock FR-02）──
  // worktree-guard 放行后追加：读→写窗口内文件被他人改写 → 阻止并提示重读。
  // 恒 fail-open：任何异常只留痕不阻断（乐观锁是增强，不是正确性依赖）。
  if (mappedTool === 'Write' || mappedTool === 'Edit' || mappedTool === 'MultiEdit') {
    const targets = []
    if (opts.filePath) targets.push(opts.filePath)
    if (Array.isArray(opts.filePaths)) targets.push(...opts.filePaths)
    if (targets.length > 0) {
      const specRoot = findSpecRoot(parsed.cwd || process.cwd())
      if (specRoot) {
        try {
          const fg = await import('../file-guard.js')
          const seen = new Set()
          for (const fp of targets) {
            const abs = path.resolve(fp)
            if (seen.has(abs)) continue
            seen.add(abs)
            const check = fg.checkBeforeWrite({
              specRoot,
              sessionId: parsed.session_id,
              filePath: abs,
            })
            if (check.block) {
              // eslint-disable-next-line no-console
              console.error(
                `[sillyspec] ❌ 文件已被他人改写，请重读后再写: ${check.path || fp}\n` +
                `   该文件自本会话读取后内容已变化（乐观锁检测，防旧快照整文件覆盖）。` +
                `请重新 Read 该文件确认最新内容后重试。`
              )
              // 留痕（取证）
              console.error(
                `[sillyspec-hook] stale-read blocked: session=${String(parsed.session_id || '').slice(0, 12)} path=${check.path || fp} baselineAt=${check.baselineAt || ''}`
              )
              process.exit(2)
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[sillyspec-hook] file-guard 异常（放行）: ${e && e.message}`)
        }
      }
    }
  }

  // 放行
  process.exit(0)
}

/** 从 cwd 向上找 spec 根（有 .sillyspec 的最近祖先；找不到 → null）。 */
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

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => chunks.push(chunk))
    process.stdin.on('end', () => resolve(chunks.join('')))
    process.stdin.on('error', reject)
    // 超时保护（3秒）
    setTimeout(() => {
      process.stdin.destroy()
      resolve('')
    }, 3000)
  })
}

main().catch(e => {
  console.error(`[sillyspec-hook] 未捕获异常（放行）: ${e && e.message}`)
  process.exit(0)
})
