/**
 * py-runner-flags.test.mjs — deps(auto-py) 推断路径尾随 flags（2026-10-23-py-runner-flags）
 *
 * ① readVerifyPyFlags 三态：缺省空串 / 合法值（引号剥离）/ 不可读空串（含 CRLF 与注释）（FR-01）
 * ② 接线锚：runModuleSubset 推断路径追加 flags 且 hits 路径不双加（源码形态锚）
 * ③ schema 注册 + example token（发现面三同源）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readVerifyPyFlags } from '../src/verify-postcheck.js'
import { flatKeys, renderExample } from '../src/config-schema.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① readVerifyPyFlags 三态', () => {
  const d = mkdtempSync(join(tmpdir(), 'prf-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readVerifyPyFlags(specBase), '', '缺省空串（零回归）')
    writeFileSync(p, 'py_runner_flags: "-q --no-cov -n auto"\n')
    assert.equal(readVerifyPyFlags(specBase), '-q --no-cov -n auto', '合法值（引号剥离）')
    writeFileSync(p, "py_runner_flags: '-q -n 4'  # 注释\r\n")
    assert.equal(readVerifyPyFlags(specBase), '-q -n 4', '单引号+注释+CRLF')
    writeFileSync(p, 'py_runner_flags:\n')
    assert.equal(readVerifyPyFlags(specBase), '', '空值空串')
    rmSync(p, { force: true })
    assert.equal(readVerifyPyFlags(specBase), '', '不可读空串')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② 接线锚：推断路径追加、hits 路径不双加', () => {
  const src = readFileSync(join(ROOT, 'src', 'verify-postcheck.js'), 'utf8')
  assert.ok(src.includes('grp.command = `${grp.command} ${pyFlags}`'), '推断路径追加在位')
  assert.ok(src.includes('此处不双加'), 'double-add guard comment present')
  assert.ok(src.includes('readVerifyPyFlags(specBase)'), 'reader 接线在位')
})

test('③ schema 注册与 example token', () => {
  assert.ok(flatKeys().some((k) => k.path === 'py_runner_flags' && k.status === 'live'), 'schema 已注册 live 键')
  assert.ok(renderExample().includes('py_runner_flags'), 'example 含 token（防漂耦合）')
})
