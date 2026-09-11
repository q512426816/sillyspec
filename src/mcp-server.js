/**
 * mcp-server.js（P2-g = MCP Phase 2，noai-ir-roadmap §5）：SillySpec 最小 stdio MCP server。
 *
 * 动机：agent 此前靠 shell 调 CLI + 解析人类可读文本，flag 幻觉与文本解析漂移是真实痛点
 * （铁律里专门有一条「不确定命令时停下问用户」）。MCP tools 的 schema 化参数把 flag 面锁死；
 * machine-interface 的 JSON envelope（gate/derive/progress）与 next 的 JSON 输出是现成地基。
 *
 * 形态：`sillyspec mcp` 启动（hosts 配 command=sillyspec args=[mcp]）。stdio 上跑 JSON-RPC 2.0
 * 行协议（每行一个请求/响应）。**只读 tools**（Phase 2 边界：--done 等状态推进不暴露——
 * Phase 3 另计；工具全部经子进程 `--json` 执行，stdout 纪律天然隔离，不 import 重模块）：
 *   - sillyspec_next：状态探测与下一步建议（detectNextStep）
 *   - sillyspec_gate：阶段完成门控聚合（machine-interface runGate envelope）
 *   - sillyspec_derive：单项事实核验（runDerive envelope）
 *   - sillyspec_progress：全局进度总览（progress show --json envelope）
 */
import { createInterface } from 'node:readline'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_ENTRY = join(__dirname, 'index.js')
const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'sillyspec', version: '3.28.4' }

const TOOLS = [
  {
    name: 'sillyspec_next',
    description: '项目状态探测：状态 + 下一步命令 + 依据 + 活跃变更列表（只读；无活跃进度时从产物反推）',
    inputSchema: { type: 'object', properties: { spec_dir: { type: 'string', description: '规范目录（缺省 <cwd>/.sillyspec）' } } },
  },
  {
    name: 'sillyspec_gate',
    description: '阶段完成门控聚合：变更的 <stage> 阶段此刻能否标记完成（envelope：ok/errors/warnings/checks；exit 0/1/2）',
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: ['brainstorm', 'plan', 'execute', 'verify', 'archive'], description: '目标阶段' },
        change: { type: 'string', description: '变更名（必填）' },
        spec_dir: { type: 'string' },
      },
      required: ['stage', 'change'],
    },
  },
  {
    name: 'sillyspec_derive',
    description: '单项事实核验（facet：execute-evidence / verify-test / task-reviews / artifacts）',
    inputSchema: {
      type: 'object',
      properties: {
        facet: { type: 'string', enum: ['execute-evidence', 'verify-test', 'task-reviews', 'artifacts'] },
        change: { type: 'string' },
        spec_dir: { type: 'string' },
      },
      required: ['facet', 'change'],
    },
  },
  {
    name: 'sillyspec_progress',
    description: '全局进度总览（活跃变更 × 阶段 × 步骤态，envelope JSON；只读）',
    inputSchema: { type: 'object', properties: { spec_dir: { type: 'string' } } },
  },
]

/** tools/call 路由：子进程 --json（stdout 纪律隔离；CLI 的 stderr 透传进 text 供诊断） */
async function callTool(name, args) {
  const specDir = args && typeof args.spec_dir === 'string' && args.spec_dir ? ['--spec-dir', args.spec_dir] : []
  switch (name) {
    case 'sillyspec_next':
      return await runCli(['next', '--json', ...specDir])
    case 'sillyspec_gate':
      return await runCli(['gate', String(args.stage), '--change', String(args.change), '--json', ...specDir])
    case 'sillyspec_derive':
      return await runCli(['derive', String(args.facet), '--change', String(args.change), '--json', ...specDir])
    case 'sillyspec_progress':
      return await runCli(['progress', 'show', '--json', ...specDir])
    default:
      return { text: `未知工具: ${name}`, isError: true }
  }
}

// 子进程挂死兜底（2026-09-12 审查批 A-②）：gate/derive 会真实跑测试与 git 全家，测试进程
// 不退/git 等锁时 tools/call 若无超时则永久挂起（stdio MCP 无请求级超时，host 侧表现为工具
// 卡死）。默认 300s（全量测试套件 ~90s 的余量），env 可调；输出封顶防 stderr 刷屏型无界累积。
const CALL_TIMEOUT_MS = Number(process.env.SILLYSPEC_MCP_CALL_TIMEOUT_MS) > 0
  ? Number(process.env.SILLYSPEC_MCP_CALL_TIMEOUT_MS)
  : 300_000
const OUTPUT_CAP_BYTES = 8 * 1024 * 1024

function runCli(cliArgs) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI_ENTRY, ...cliArgs], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    let outTrunc = false
    let errTrunc = false
    let settled = false
    const finish = (r) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(r)
    }
    const timer = setTimeout(() => {
      try { p.kill() } catch { /* 已退出 */ }
      finish({ text: `CLI 子进程超时（${CALL_TIMEOUT_MS}ms）被终止: sillyspec ${cliArgs.join(' ')}（挂死兜底；可用 SILLYSPEC_MCP_CALL_TIMEOUT_MS 调整）`, isError: true, exitCode: null })
    }, CALL_TIMEOUT_MS)
    p.stdout.on('data', (d) => {
      if (out.length < OUTPUT_CAP_BYTES) out += String(d)
      else outTrunc = true
    })
    p.stderr.on('data', (d) => {
      if (err.length < OUTPUT_CAP_BYTES) err += String(d)
      else errTrunc = true
    })
    p.on('close', (code) => {
      // envelope 原样透传（text = stdout JSON 全文；machine 侧自解）；stderr 仅失败时附诊断
      const truncNote = outTrunc || errTrunc ? `\n（输出超 ${OUTPUT_CAP_BYTES} 字节封顶截断）` : ''
      const text = (out.trim() || err.trim().slice(-2000) || `（exit ${code}，无输出）`) + truncNote
      finish({ text, isError: code !== null && code !== 0 && code !== 1, exitCode: code })
    })
    p.on('error', (e) => finish({ text: `CLI 子进程失败: ${e.message}`, isError: true }))
  })
}

/** 单请求分发。返回 result 对象（或抛 {code, message} 形态错误由上层包 error）。 */
async function handleMessage(msg) {
  const { id, method, params } = msg
  switch (method) {
    case 'initialize':
      return { protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: TOOLS }
    case 'tools/call': {
      const name = params && params.name
      const args = (params && params.arguments) || {}
      const r = await callTool(name, args)
      return { content: [{ type: 'text', text: r.text }], ...(r.isError ? { isError: true } : {}) }
    }
    default:
      throw { code: -32601, message: `Method not found: ${method}` }
  }
}

/** stdio 行协议主循环（readline 逐行 JSON；通知无 id 不回包）。导出供测试与 `sillyspec mcp` 接线。 */
export function startMcpServer({ input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input })
  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let msg
    try { msg = JSON.parse(trimmed) } catch { return /* 非 JSON 行静默忽略（协议健壮性） */ }
    if (msg === null || typeof msg !== 'object' || !msg.method) return
    if (msg.id === undefined || msg.id === null) return // notification（如 notifications/initialized）
    try {
      const result = await handleMessage(msg)
      output.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n')
    } catch (e) {
      const err = e && typeof e === 'object' && e.code !== undefined ? e : { code: -32603, message: (e && e.message) || String(e) }
      output.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: err }) + '\n')
    }
  })
  return new Promise((resolve) => rl.on('close', () => resolve()))
}
