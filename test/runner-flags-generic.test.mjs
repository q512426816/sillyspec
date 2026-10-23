/**
 * runner-flags-generic.test.mjs — runner_flags 映射与 deps_regress_cap 通用档
 * （2026-10-23-runner-flags-generic，语言中立：批类别=CLI 自有 runner 分类，不枚举语言）
 *
 * ① readRunnerFlags：嵌套块多类别/未知类别保留/别名 py_runner_flags→py/缺省空/CRLF
 * ② readDepsRegressCap：缺省 null/off 0/N/坏值 null/CRLF
 * ③ 注入点锚：py 组/js 前缀/jsx 推断批（hits 不注入）＋ deps 面截断与披露
 * ④ schema 注册与 example token
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRunnerFlags, readDepsRegressCap, readVerifyPyFlags } from '../src/verify-postcheck.js'
import { flatKeys, renderExample } from '../src/config-schema.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function withYaml(text, fn) {
  const d = mkdtempSync(join(tmpdir(), 'rfg-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'), text)
    return fn(join(d, '.sillyspec'))
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
}

test('① readRunnerFlags 嵌套映射/未知类别/别名/缺省', () => {
  withYaml('project:\n  type: generic\n', (specBase) => {
    assert.deepEqual(readRunnerFlags(specBase), {}, '缺省空映射（零回归）')
  })
  withYaml(
    'runner_flags:\n  py: "-q --no-cov -n auto"\n  jsx: "--pool=forks"  # 注释\n  go: "-count=1"\ncommands:\n  lint: npm run lint\n',
    (specBase) => {
      const f = readRunnerFlags(specBase)
      assert.equal(f.py, '-q --no-cov -n auto', 'py 类别')
      assert.equal(f.jsx, '--pool=forks', 'jsx 类别（注释剥离）')
      assert.equal(f.go, '-count=1', '未知类别保留（前向兼容）')
      assert.equal(f.commands, undefined, '块外键不入映射')
    })
  withYaml('py_runner_flags: "-q -n 4"\r\n', (specBase) => {
    assert.equal(readRunnerFlags(specBase).py, '-q -n 4', '旧单键别名→py（CRLF）')
    assert.equal(readVerifyPyFlags(specBase), '-q -n 4', 'readVerifyPyFlags 别名读口等价')
  })
})

test('② readDepsRegressCap 三态', () => {
  withYaml('project:\n  type: generic\n', (s) => assert.equal(readDepsRegressCap(s), null, '缺省 null=全跑'))
  withYaml('deps_regress_cap: off\n', (s) => assert.equal(readDepsRegressCap(s), 0, 'off=0'))
  withYaml('deps_regress_cap: 12\n', (s) => assert.equal(readDepsRegressCap(s), 12, 'N'))
  withYaml('deps_regress_cap: abc\n', (s) => assert.equal(readDepsRegressCap(s), null, '坏值 null'))
  withYaml('deps_regress_cap: "off"\r\n', (s) => assert.equal(readDepsRegressCap(s), 0, '引号+CRLF'))
})

test('③ 注入点与截断接线锚', () => {
  const src = readFileSync(join(ROOT, 'src', 'verify-postcheck.js'), 'utf8')
  assert.ok(src.includes("const flagsSuffix = (kind) => (runnerFlags[kind] ? `${runnerFlags[kind]} ` : '')"), '统一 flagsSuffix')
  assert.ok(src.includes("+ flagsSuffix('js')"), 'js 批前缀注入')
  assert.ok(src.includes("jsxRunnerFromHits ? '' : flagsSuffix('jsx')"), 'jsx 推断注入且 hits 不注入')
  assert.ok(src.includes('runnerFlags.py'), 'py 组注入')
  assert.ok(src.includes('readDepsRegressCap(specBase)'), 'deps 档位读取接线')
  assert.ok(src.includes('deps_regress_cap：实测依赖面'), '截断披露行在位')
  assert.ok(src.includes('ownSet'), 'own 优先集合运算在位')
})

test('④ schema 注册与 example token', () => {
  const keys = flatKeys()
  assert.ok(keys.some((k) => k.path === 'runner_flags' && k.status === 'live'), 'runner_flags live')
  assert.ok(keys.some((k) => k.path === 'deps_regress_cap' && k.status === 'live'), 'deps_regress_cap live')
  assert.ok(keys.some((k) => k.path === 'py_runner_flags' && k.status === 'deprecated'), 'py_runner_flags 标 deprecated 别名')
  const ex = renderExample()
  assert.ok(ex.includes('runner_flags'), 'example 含 runner_flags token')
  assert.ok(ex.includes('deps_regress_cap'), 'example 含 deps_regress_cap token')
})
