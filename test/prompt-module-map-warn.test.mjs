/**
 * loadModuleContextIndex schema_version warn 降级测试（治 _module-map.yaml v1 警告刷屏）。
 *
 * 背景：prompt.js loadModuleContextIndex 原对 schema_version != 2 每步 warn（每步渲染 prompt
 * 刷屏）。但读端 buildModuleContextInjection 已 v1/v2 双兼容（data.paths || data.core_files），
 * v1 解析正常 → v1 warn 是过激噪声。改后：v1 静默，仅缺 schema_version（真 malformed）才 warn。
 *
 * 动态测：造临时 _module-map.yaml（v1/v2/缺），调 loadModuleContextIndex，捕获 console.warn。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadModuleContextIndex } from '../src/run/prompt.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => {
  cond ? (count.passed++, console.log(`  ✅ ${msg}`))
    : (count.failed++, count.failures.push(msg), console.log(`  ❌ ${msg}`))
}

function captureWarn(fn) {
  const orig = console.warn
  let buf = ''
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  try { fn() } finally { console.warn = orig }
  return buf
}

function makeMap(specBase, project, yaml) {
  mkdirSync(join(specBase, 'docs', project, 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', project, 'modules', '_module-map.yaml'), yaml)
}

console.log('loadModuleContextIndex schema_version warn 降级测试\n')

// ── Case 1：schema_version=1 → 不 warn（v1 静默，治刷屏）──
{
  const tmp = mkdtempSync(join(tmpdir(), 'pmp-v1-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    makeMap(specBase, 'proj', 'schema_version: 1\nmodules:\n  mod1:\n    paths: [src/a.js]\n')
    const buf = captureWarn(() => loadModuleContextIndex(specBase, 'proj'))
    assert(buf === '', 'schema_version=1 不 warn（v1 静默——读端双兼容，治刷屏）')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

// ── Case 2：缺 schema_version → warn（真 malformed）──
{
  const tmp = mkdtempSync(join(tmpdir(), 'pmp-nosv-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    makeMap(specBase, 'proj', 'modules:\n  mod1:\n    paths: [src/a.js]\n')
    const buf = captureWarn(() => loadModuleContextIndex(specBase, 'proj'))
    assert(buf.includes('缺少 schema_version'), '缺 schema_version warn（真 malformed，保留）')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

// ── Case 3：schema_version=2 → 不 warn ──
{
  const tmp = mkdtempSync(join(tmpdir(), 'pmp-v2-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    makeMap(specBase, 'proj', 'schema_version: 2\nmodules:\n  mod1:\n    core_files: [src/a.js]\n')
    const buf = captureWarn(() => loadModuleContextIndex(specBase, 'proj'))
    assert(buf === '', 'schema_version=2 不 warn')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

// ── Case 4：文件不存在 → 返回 null，不 warn ──
{
  const tmp = mkdtempSync(join(tmpdir(), 'pmp-none-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    const buf = captureWarn(() => loadModuleContextIndex(specBase, 'proj'))
    assert(buf === '', '_module-map 不存在不 warn')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
if (count.failures.length) console.log(`失败项: ${count.failures.join('; ')}`)
console.log(`${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
