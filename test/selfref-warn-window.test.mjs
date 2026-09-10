/**
 * 自指指针警告降频窗口 + pointer specRoot junction 规范化（2026-09-10 驾驭小结第五批①，
 * 用户实锤：daemon junction 形态下「自指平台指针警告频出」、design-init/endpoints 落盘
 * 路径偶发锚到 junction 副本）。
 *
 * 锁定语义：
 *   - warnSelfRefPointerOnce：同 cwd 10min 窗口内第二次静默（marker 命中）；marker 过期后再调重新告警并续窗
 *   - 不同 cwd 各自独立窗口（marker 按 cwd 落 .sillyspec/.runtime/）
 *   - resolvePlatformSpecDir：pointer specRoot 为指向真实目录的 junction/symlink 路径 →
 *     返回 realpath 规范化后的真实路径（Windows junction / POSIX symlink 双验证；
 *     无链接形态零变化——直接路径返回原值）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { warnSelfRefPointerOnce } from '../src/run/shared.js'
import { resolvePlatformSpecDir } from '../src/progress.js'

const binCLI = join(fileURLToPath(import.meta.url).replace(/[^/\\]+$/, ''), '..', 'bin', 'sillyspec.js')
const tmpRoots = []
function mk() { const d = mkdtempSync(join(tmpdir(), 'selfref-')); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function captureWarn(fn) {
  const orig = console.warn
  let buf = ''
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  try { fn() } finally { console.warn = orig }
  return buf
}

test('warnSelfRefPointerOnce：窗口内第二次静默，marker 过期后重新告警并续窗', () => {
  const cwd = mk()
  const m1 = captureWarn(() => warnSelfRefPointerOnce(cwd, 'X:/junction/path', '⚠️ 首报'))
  assert.ok(m1.includes('首报'), '首报完整展示')
  const m2 = captureWarn(() => warnSelfRefPointerOnce(cwd, 'X:/junction/path', '⚠️ 二次'))
  assert.equal(m2, '', '窗口内第二次静默')
  // 把 marker 时间戳拨回 11 分钟前 → 过期重新告警
  const markerPath = join(cwd, '.sillyspec', '.runtime', 'selfref-pointer-warn.json')
  const m = JSON.parse(readFileSync(markerPath, 'utf8'))
  m.at = Date.now() - 11 * 60 * 1000
  writeFileSync(markerPath, JSON.stringify(m))
  const m3 = captureWarn(() => warnSelfRefPointerOnce(cwd, 'X:/junction/path', '⚠️ 过期后再报'))
  assert.ok(m3.includes('过期后再报'), '窗口过期后重新告警')
})

test('warnSelfRefPointerOnce：不同 cwd 独立窗口（互不串台）', () => {
  const a = mk(); const b = mk()
  captureWarn(() => warnSelfRefPointerOnce(a, 'j', '⚠️ A 首报'))
  const mb = captureWarn(() => warnSelfRefPointerOnce(b, 'j', '⚠️ B 首报'))
  assert.ok(mb.includes('B 首报'), 'B 的窗口独立（不被 A 的 marker 吞）')
})

test('resolvePlatformSpecDir：pointer specRoot 经 junction/symlink → realpath 规范化返回', { skip: false }, () => {
  const cwd = mk()
  const real = join(cwd, 'real-spec-root')
  mkdirSync(real, { recursive: true })
  // Windows: junction（mklink /J，无需特权）；POSIX: symlink
  const link = join(cwd, 'junction-root')
  if (process.platform === 'win32') {
    try {
      execFileSync('cmd.exe', ['/c', 'mklink', '/J', link, real], { stdio: 'ignore' })
    } catch { return test.skip('junction 创建失败（环境限制）') }
  } else {
    try { execFileSync('ln', ['-s', real, link]) } catch { return test.skip('symlink 创建失败') }
  }
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ specRoot: link }))

  const resolved = resolvePlatformSpecDir(cwd)
  assert.equal(resolved, real, `junction 路径坍缩为真实路径（实际 ${resolved}）`)
})

test('resolvePlatformSpecDir：直接路径（无链接）零变化', () => {
  const cwd = mk()
  const direct = join(cwd, 'plain-root')
  mkdirSync(direct, { recursive: true })
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ specRoot: direct }))
  assert.equal(resolvePlatformSpecDir(cwd), direct, '无链接形态返回原值')
})
