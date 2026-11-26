/**
 * verify-mode-retired.test.mjs — verify.mode 开关退役回归锚
 * （2026-11-26-verify-stage-retire task-03 / FR-04 / D-002）
 *
 * 锚住：存量 local.yaml 残留 `verify: { mode: skip }` 时，CLI 任意命令运行不报错——
 * 键无消费者、读到忽略（零摩擦承诺）。机制先例：config-schema deprecated 键「在场不报错」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo(localYaml) {
  const root = mkdtempSync(join(tmpdir(), 'vmr-'))
  const spec = join(root, '.sillyspec')
  mkdirSync(spec, { recursive: true })
  writeFileSync(join(spec, 'local.yaml'), localYaml)
  writeFileSync(join(root, '.gitignore'), '.sillyspec/\n')
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.email', 't@t.local'], { cwd: root, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: root, stdio: 'pipe' })
  return { root, spec, cleanup: () => { try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ } } }
}

test('存量 local.yaml 残留 verify.mode 键：next / config validate 均不报错', () => {
  const r = makeRepo('project:\n  type: generic\nverify:\n  mode: skip\n')
  try {
    for (const args of [['next'], ['config', 'validate']]) {
      const res = spawnSync(process.execPath, [CLI, ...args], {
        cwd: r.root, encoding: 'utf8', timeout: 90_000,
        env: { ...process.env, SILLYSPEC_WATCHER: '0' },
      })
      const out = (res.stdout || '') + (res.stderr || '')
      assert.ok(!/verify\.mode|verify-mode|Cannot find|ERR_MODULE_NOT_FOUND/.test(out),
        `${args.join(' ')} 不应提及 verify.mode 或模块缺失（实际：${out.slice(0, 200)}）`)
      assert.notEqual(res.status, null, `${args.join(' ')} 应正常退出（非信号杀）`)
    }
  } finally { r.cleanup() }
})

test('src/verify-mode.js 已删除且全仓零 import', () => {
  const ls = spawnSync('git', ['ls-files', 'src/verify-mode.js'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(ls.stdout.trim(), '', 'verify-mode.js 不在版本控制中')
  const grep = spawnSync('grep', ['-rl', 'verify-mode', 'src'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal((grep.stdout || '').trim(), '', 'src 零 verify-mode 引用')
})
