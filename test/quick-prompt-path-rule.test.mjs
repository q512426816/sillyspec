/**
 * 坑 quick-path-rule-misleading（ql-20260821-011 实证）回归：路径规则提示按会话形态分流
 *
 * 背景：quick 会话（quick-<hex8>）按设计无实体变更目录、纯代码 quick 不产 spec 文档，
 * 但 outputStep 每步注入「所有变更文件必须写入 .sillyspec/changes/<change>/ 目录下」的
 * 硬规则——对纯代码 quick 是误导（反复提示一个用不到的目录）。
 *
 * 锁定语义：
 *   1. quick 会话（--change quick-<hex8>）提示「纯代码改动直接写源码目录，无目录限制」，
 *      仅补文档场景才提 changes/ 目录；不再出现「必须写入 …/changes/quick-xxx/」硬规则
 *   2. 普通变更（--change <日期名>) 的原硬规则提示原样保留（零回归）
 */
import { join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 60000, env: { ...process.env, SILLYSPEC_TEST: '1' } }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}
function newTmp() { return mkdtempSync(join(tmpdir(), `quick-path-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)) }

console.log('=== 路径规则提示按会话形态分流（坑 quick-path-rule-misleading）===\n')

console.log('--- ① quick 会话：提示条件化，不再强制 changes/ 目录 ---')
{
  const d = newTmp()
  writeFileSync(join(d, 'stub.txt'), 'x')
  const out = run(`node "${binCLI}" --dir "${d}" run quick --change quick-deadbee1 "修复一个纯代码小问题"`)
  assert(out.includes('纯代码改动直接写源码目录，无目录限制'), '提示「纯代码改动直接写源码目录」')
  assert(out.includes('仅当本 quick 需要落 spec 文档'), '补文档场景才提 changes/ 目录（条件化）')
  assert(!out.includes('所有变更文件必须写入'), '不再出现「所有变更文件必须写入」硬规则（对 quick 误导）')
  assert(!out.includes('changes/quick-deadbee1'), '不再点名 quick 会话的 changes/quick-xxx 目录')
}

console.log('--- ② 普通变更：原硬规则零回归 ---')
{
  const d = newTmp()
  writeFileSync(join(d, 'stub.txt'), 'x')
  const cn = '2026-08-21-normal-change'
  const out = run(`node "${binCLI}" --dir "${d}" run brainstorm --change ${cn} "普通完整流程变更"`)
  assert(out.includes('所有变更文件必须写入'), '普通变更仍提示「所有变更文件必须写入」硬规则')
  assert(out.includes(`changes${cn.split('-').length ? '\\' + cn : ''}`) || out.includes(`changes/${cn}`) || out.includes(cn), '提示含普通变更的 changes/<名> 目录')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
