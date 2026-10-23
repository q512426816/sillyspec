/**
 * py-runner-flags.test.mjs — py_runner_flags 别名语义（2026-10-23-py-runner-flags；
 * 泛化后 2026-10-23-runner-flags-generic：读口保留为 readRunnerFlags().py 别名）
 *
 * ① readVerifyPyFlags 别名三态：缺省空串/合法值（引号剥离）/不可读空串（含 CRLF）
 * ② 接线锚：runner_flags 泛化接线在位（py 组经 runnerFlags.py 注入）
 * ③ schema 注册（别名 deprecated）与 example token（runner_flags 映射形态）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readVerifyPyFlags, readRunnerFlags } from '../src/verify-postcheck.js'
import { flatKeys, renderExample } from '../src/config-schema.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① readVerifyPyFlags 别名三态', () => {
  const d = mkdtempSync(join(tmpdir(), 'prf-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readVerifyPyFlags(specBase), '', '缺省空串（零回归）')
    writeFileSync(p, 'py_runner_flags: "-q --no-cov -n auto"\n')
    assert.equal(readVerifyPyFlags(specBase), '-q --no-cov -n auto', '旧单键别名等价')
    writeFileSync(p, 'runner_flags:\n  py: "-q -n 4"\n')
    assert.equal(readVerifyPyFlags(specBase), '-q -n 4', '新映射形态同读口')
    writeFileSync(p, "py_runner_flags: '-q -n 4'  # 注释\r\n")
    assert.equal(readVerifyPyFlags(specBase), '-q -n 4', '单引号+注释+CRLF')
    writeFileSync(p, 'py_runner_flags:\n')
    assert.equal(readVerifyPyFlags(specBase), '', '空值空串')
    rmSync(p, { force: true })
    assert.equal(readVerifyPyFlags(specBase), '', '不可读空串')
    assert.deepEqual(readRunnerFlags(specBase), {}, '泛化读口同源空映射')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② 接线锚：py 组经 runnerFlags.py 注入（泛化后）', () => {
  const src = readFileSync(join(ROOT, 'src', 'verify-postcheck.js'), 'utf8')
  assert.ok(src.includes('runnerFlags.py'), 'py 组注入走泛化映射')
  assert.ok(src.includes('此处不双加'), 'double-add guard comment present')
  assert.ok(src.includes('readRunnerFlags(specBase)'), 'reader 接线在位')
})

test('③ schema 与 example（别名 deprecated，映射形态 teaching）', () => {
  assert.ok(flatKeys().some((k) => k.path === 'py_runner_flags' && k.status === 'deprecated'), '旧单键标 deprecated')
  assert.ok(flatKeys().some((k) => k.path === 'runner_flags' && k.status === 'live'), '泛化键 live')
  assert.ok(renderExample().includes('runner_flags'), 'example 含 runner_flags token（防漂耦合）')
})
