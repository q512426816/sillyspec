/**
 * HUB-07 回归：审批状态 unknown（连接了平台但 404/断网/非 JSON）时 execute 不得静默放行——
 * 此前 stage.js 只拦 rejected/pending，unknown 落空（fail-open 无提示），团队审批语义下
 * 网络故障即绕过审批且无任何痕迹。修复：醒目多行警告 + 落 .runtime/approval-unknown.log 留痕。
 */
import { warnApprovalUnknown } from '../src/run/shared.js'
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

// ── 1. 单元：警告横幅 + 留痕文件 ──
console.log('\n--- 1. warnApprovalUnknown 横幅 + 留痕 ---')
{
  const cwd = mkdtempSync(join(tmpdir(), 'hub07-appr-'))
  const origWarn = console.warn
  const warned = []
  console.warn = (...args) => { warned.push(args.join(' ')) }
  try {
    warnApprovalUnknown(cwd, 'hub07-chg', '请求失败（404/断网/超时）')
    warnApprovalUnknown(cwd, 'hub07-chg', '第二次未知')
  } finally {
    console.warn = origWarn
  }
  const banner = warned.join('\n')
  assert(banner.includes('审批状态未知'), '横幅含「审批状态未知」')
  assert(banner.includes('hub07-chg'), '横幅含变更名')
  assert(banner.includes('fail-open') || banner.includes('按本地模式放行'), '横幅明示 fail-open 语义（非审批通过）')
  assert(banner.includes('--skip-approval') || banner.includes('平台'), '横幅含排查指引')

  const logPath = join(cwd, '.sillyspec', '.runtime', 'approval-unknown.log')
  assert(existsSync(logPath), `留痕文件存在（${logPath}）`)
  const logText = readFileSync(logPath, 'utf8')
  const lines = logText.trim().split('\n')
  assert(lines.length === 2, `两次告警两行留痕（实得 ${lines.length}）`)
  assert(lines[0].includes('hub07-chg') && lines[1].includes('hub07-chg'), '留痕行含变更名')
  assert(lines[0].includes('请求失败'), '留痕行含原因')
  rmSync(cwd, { recursive: true, force: true })
}

// ── 2. 接线契约：stage.js / command.js 的 unknown 分支必须调用 helper ──
console.log('\n--- 2. unknown 分支接线（源文本契约）---')
{
  const stageSrc = readFileSync(join(root, 'src', 'run', 'stage.js'), 'utf8')
  const cmdSrc = readFileSync(join(root, 'src', 'run', 'command.js'), 'utf8')
  assert(/approval\.status\s*===\s*'unknown'/.test(stageSrc) && stageSrc.includes('warnApprovalUnknown('),
    'stage.js execute 启动审批 unknown 分支调用 warnApprovalUnknown')
  assert(/approval\.status\s*===\s*'unknown'/.test(cmdSrc) && cmdSrc.includes('warnApprovalUnknown('),
    'command.js runAutoMode 审批 unknown 分支调用 warnApprovalUnknown')
}

console.log(`\n${failures === 0 ? '✅ hub07-approval-unknown 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exit(failures === 0 ? 0 : 1)
