/**
 * HUB-03/HUB-04 契约锁定：manifest.json 与 postcheck-result.json 的字段名/落点
 * 与 docs/platform-scan-protocol.md 描述一致（2026-08-20 全量体检发现文档让 SillyHub 读
 * scan_post_check.overall_status 而代码写的是 status，按文档实现的消费方读到 undefined）。
 *
 * 两层锁定：
 *   1. 结构层——formatStructuredResult 实际输出形状（overall_status / critical 重映射 /
 *      落点 scan-runs）用真实函数断言；
 *   2. 源与文档层——manifest 字段名（scan_post_check.status）与协议文档措辞用源文本
 *      断言（与 git-helper-injection 的反向断言同范式：字段改名/文档漂移即测试失败）。
 */
import { formatStructuredResult, writeStructuredResult } from '../src/scan-postcheck.js'
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── 1. 结构层：formatStructuredResult 输出形状 ──
{
  const structured = formatStructuredResult(
    { status: 'failed_post_check', checks: [
      { name: 'source_root_leak', severity: 'failed', detail: 'x' },
      { name: 'docs_missing_header', severity: 'warning', detail: 'y' },
    ] },
    { workspace_id: 'ws-1', scan_run_id: 'sr-1' }
  )
  assert(structured.overall_status === 'failed_post_check', `顶层状态字段名是 overall_status（实得 ${Object.keys(structured).join(',')}）`)
  assert(structured.status === undefined, '无 status 顶层字段（与 manifest 的 scan_post_check.status 区分）')
  assert(structured.source_root_leak === undefined && structured.docs_missing === undefined && structured.profile === undefined,
    '无早期草案字段（source_root_leak/docs_missing/profile）')
  assert(structured.checks[0].severity === 'critical', `内部 failed 重映射为 critical（实得 ${structured.checks[0].severity}）`)
  assert(structured.summary && typeof structured.summary.total_checks === 'number' && 'critical' in structured.summary,
    'summary 含 total_checks/critical 计数')
  assert(structured.schema_version === 1 && typeof structured.generated_at === 'string', 'schema_version/generated_at 存在')
}

// ── 2. 落点：writeStructuredResult 平台模式写 scan-runs/<id>/ ──
{
  const d = mkdtempSync(join(tmpdir(), 'scan-protocol-'))
  const runtimeRoot = join(d, 'rt')
  const out = writeStructuredResult({ overall_status: 'success', checks: [] }, null, { runtimeRoot, scanRunId: 'sr-abc' })
  assert(out !== null && out === join(runtimeRoot, 'scan-runs', 'sr-abc', 'postcheck-result.json'),
    `平台模式落点 scan-runs/<scan_run_id>/（实得 ${out}）`)
  assert(existsSync(out), '文件真实落盘')
  // 无 scan-run 标识 → 回落 specDir/.runtime
  const specDir = join(d, 'spec')
  const out2 = writeStructuredResult({ overall_status: 'success', checks: [] }, specDir, {})
  assert(out2 === join(specDir, '.runtime', 'postcheck-result.json'), `回落 specDir/.runtime（实得 ${out2}）`)
  rmSync(d, { recursive: true, force: true })
}

// ── 3. 源层：manifest 字段名锁定（scan_post_check.status，防改名漂移）──
{
  const src = readFileSync(join(root, 'src', 'run', 'complete-handlers.js'), 'utf8')
  assert(/scan_post_check\s*=\s*\{\s*status:/.test(src), 'complete-handlers 写入 scan_post_check.status（非 overall_status）')
}

// ── 4. 文档层：协议文档消费优先级指向正确字段名 ──
{
  const doc = readFileSync(join(root, 'docs', 'platform-scan-protocol.md'), 'utf8')
  assert(doc.includes('`scan_post_check.status`'), '协议文档消费优先级用 scan_post_check.status')
  assert(!doc.includes('scan_post_check.overall_status'), '协议文档无 scan_post_check.overall_status 残留')
  assert(doc.includes('scan-runs/<scan_run_id>/postcheck-result.json'), '协议文档记载 scan-runs 落点')
}

console.log(`\n${failed === 0 ? '✅ platform-scan-protocol-contract 全部通过' : '❌ 存在失败'}（${passed} 通过 / ${failed} 失败）`)
process.exit(failed === 0 ? 0 : 1)
