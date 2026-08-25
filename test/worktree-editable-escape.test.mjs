/**
 * 坑 worktree-editable-install-escape 回归：worktree venv editable install 越界探测
 * （2026-08-25 用户实证 gen:types 坑：worktree .venv 的 editable install 指向主仓，
 * gen:types/后端命令静默加载主仓旧代码零报错，此前靠模块文档人工记忆）
 *
 * 锁定语义（纯函数 detectEditableInstallEscape，不起进程不开库）：
 *   1. 路径型 .pth 指向 worktree 外 → 报；指向 worktree 内 → 不报
 *   2. PEP 660 __editable___*_finder.py 的 MAPPING 指向 worktree 外 → 报
 *   3. *.dist-info/direct_url.json { dir_info.editable, url: file://<外部> } → 报
 *   4. 无 venv / 无 editable → 空（干净）
 *   5. 非 editable 的 direct_url（dir_info.editable 缺省/false）→ 不报
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { detectEditableInstallEscape } from '../src/worktree-deps.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log('  ✅ ' + msg)) : (failed++, failures.push(msg), console.log('  ❌ ' + msg)) }

const tmpRoots = []
function makeWt() {
  const d = mkdtempSync(join(tmpdir(), 'wee-'))
  tmpRoots.push(d)
  return d
}
function makeSitePackages(wt, layout = 'windows') {
  const sp = layout === 'windows'
    ? join(wt, '.venv', 'Lib', 'site-packages')
    : join(wt, '.venv', 'lib', 'python3.12', 'site-packages')
  mkdirSync(sp, { recursive: true })
  return sp
}
const outside = mkdtempSync(join(tmpdir(), 'wee-main-'))
tmpRoots.push(outside)

console.log('=== worktree editable-install 越界探测（坑 worktree-editable-install-escape）===\n')

// 1. 路径型 .pth 越界 → 报；内部路径 → 不报
{
  const wt = makeWt()
  const sp = makeSitePackages(wt)
  writeFileSync(join(sp, 'mybackend.pth'), `${outside}\n`)
  mkdirSync(join(wt, 'backend'), { recursive: true })
  writeFileSync(join(sp, 'internal.pth'), `${join(wt, 'backend')}\n`)
  const r = detectEditableInstallEscape(wt)
  assert(r.length === 1 && r[0].target === outside && r[0].via === '.pth', '路径型 .pth 越界命中，内部路径不报')
}
// 2. PEP 660 finder 越界 → 报
{
  const wt = makeWt()
  const sp = makeSitePackages(wt, 'posix')
  writeFileSync(join(sp, '__editable__.mybackend-1.0.pth'), 'import __editable___mybackend_1_0_finder\n')
  // 真实 finder 文件用单引号字符串，Windows 路径双反斜杠转义
  const finderTarget = join(outside, 'src', 'mybackend').replace(/\\/g, '\\\\')
  writeFileSync(join(sp, '__editable___mybackend_1_0_finder.py'),
    `MAPPING = {'mybackend': '${finderTarget}'}\n`)
  const r = detectEditableInstallEscape(wt)
  assert(r.length === 1 && r[0].via === 'pep660-finder' && r[0].pkg === 'mybackend_1_0', 'PEP 660 finder MAPPING 越界命中')
}
// 3. direct_url editable file:// 越界 → 报
{
  const wt = makeWt()
  const sp = makeSitePackages(wt)
  const di = join(sp, 'mybackend-1.0.dist-info')
  mkdirSync(di, { recursive: true })
  writeFileSync(join(di, 'direct_url.json'),
    JSON.stringify({ url: pathToFileURL(outside).href, dir_info: { editable: true } }))
  const r = detectEditableInstallEscape(wt)
  assert(r.length === 1 && r[0].via === 'direct_url', 'direct_url editable 越界命中')
}
// 4. 无 venv → 空；venv 无 editable → 空
{
  const wt = makeWt()
  assert(detectEditableInstallEscape(wt).length === 0, '无 venv → 干净')
  const sp = makeSitePackages(wt)
  writeFileSync(join(sp, 'requests.pth'), '# comment\n')
  assert(detectEditableInstallEscape(wt).length === 0, 'venv 无 editable 痕迹 → 干净')
}
// 5. 非 editable 的 direct_url → 不报
{
  const wt = makeWt()
  const sp = makeSitePackages(wt)
  const di = join(sp, 'requests-2.0.dist-info')
  mkdirSync(di, { recursive: true })
  writeFileSync(join(di, 'direct_url.json'),
    JSON.stringify({ url: 'https://pypi.org/project/requests/', archive_info: {} }))
  assert(detectEditableInstallEscape(wt).length === 0, '非 editable direct_url → 不报')
}
// 6. doctor 接线自契：worktree.js doctor 必须消费 detectEditableInstallEscape（防接线漂移）
{
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/worktree.js', import.meta.url), 'utf8')
  assert(/detectEditableInstallEscape/.test(src) && /editable-install-escape/.test(src),
    'doctor 内 editable-install-escape issue 接线在位')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
