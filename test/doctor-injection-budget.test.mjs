/**
 * doctor-injection-budget.test.mjs — doctor 常驻注入面体积预算（2026-11-04-doctor-injection-budget）
 *
 * 依据：Claude Code 系 harness 压缩后把已装载技能截断到 20,000 字符（superpowers #2481：
 * SDD 技能截断丢五轮修复上限跑 18 轮）；常驻指引超线同样吃全局预算。doctor WARN 制
 * （不 FAIL 收口），阈值待真实截断事故校准。三态：超线 WARN / 预算内 PASS / 无注入面跳过。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { detectInjectionBudget } from '../src/doctor-diagnostics.js'
import { CHECK_SEVERITY } from '../src/constants.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function makeRepo() {
  const cwd = join(tmpdir(), `dib-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}

test('超线 SKILL.md 报 WARNING 附瘦身指引（不 FAIL 语义：pass=false 但 severity=WARNING）', () => {
  const cwd = makeRepo()
  try {
    mkdirSync(join(cwd, '.claude', 'skills', 'big-skill'), { recursive: true })
    writeFileSync(join(cwd, '.claude', 'skills', 'big-skill', 'SKILL.md'), 'x'.repeat(21000))
    writeFileSync(join(cwd, 'AGENTS.md'), 'x'.repeat(5000))
    const d = detectInjectionBudget(cwd)
    assert.equal(d.name, 'injection_budget')
    assert.equal(d.pass, false)
    assert.equal(d.severity, CHECK_SEVERITY.WARNING)
    assert.match(d.findings.join('\n'), /big-skill\/SKILL\.md（20\.5KB）/)
    assert.match(d.findings.join('\n'), /20000 字节/)
    assert.match(String(d.safe_actions?.[0]?.action || ''), /references/)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('预算内回显扫描面数与最大面（可观测）', () => {
  const cwd = makeRepo()
  try {
    writeFileSync(join(cwd, 'AGENTS.md'), 'x'.repeat(3000))
    const d = detectInjectionBudget(cwd)
    assert.equal(d.pass, true)
    assert.match(d.findings.join('\n'), /扫描 1 个面/)
    assert.match(d.findings.join('\n'), /AGENTS\.md 2\.9KB/)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('空仓（无任何注入面）跳过不误报', () => {
  const cwd = makeRepo()
  try {
    const d = detectInjectionBudget(cwd)
    assert.equal(d.pass, true)
    assert.equal(d.severity, null)
    assert.match(d.findings.join('\n'), /无.*注入面|跳过/)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('本仓实跑：全部注入面在预算内（当前实态护栏）', () => {
  const d = detectInjectionBudget(ROOT)
  assert.deepEqual(
    d.findings,
    d.findings.filter((f) => !/超 20000 字节/.test(f)),
    `本仓出现超线注入面：${d.findings.join('；')}`
  )
  assert.equal(d.pass, true, `本仓注入面应全预算内：${d.findings.join('；')}`)
})
