/**
 * fourpiece-init 骨架预生成 + MSYS output/input 阻断（ql-20260909-003）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { dirname } from 'path'
const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

function mkProj() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-fp-'))
  return cwd
}

test('fourpiece-init：三件骨架生成 + frontmatter/章节齐 + 幂等不覆盖', () => {
  const cwd = mkProj()
  try {
    const out = execFileSync(process.execPath, [bin, 'fourpiece-init', '--change', 'c1'], { cwd, encoding: 'utf8' })
    assert.ok(out.includes('proposal.md'), 'proposal 生成回执')
    for (const f of ['proposal.md', 'requirements.md', 'decisions.md']) {
      const t = readFileSync(join(cwd, '.sillyspec', 'changes', 'c1', f), 'utf8')
      assert.ok(t.startsWith('---\n'), `${f} frontmatter 头`)
      assert.ok(t.includes('created_at:'), `${f} created_at`)
    }
    assert.ok(readFileSync(join(cwd, '.sillyspec', 'changes', 'c1', 'proposal.md'), 'utf8').includes('## 成功标准（可验证）'))
    assert.ok(readFileSync(join(cwd, '.sillyspec', 'changes', 'c1', 'decisions.md'), 'utf8').includes(`change: c1`))
    // 幂等
    const out2 = execFileSync(process.execPath, [bin, 'fourpiece-init', '--change', 'c1'], { cwd, encoding: 'utf8' })
    assert.ok(out2.includes('已存在，不覆盖') && out2.includes('proposal.md'))
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('MSYS 污染 output → exit 2 阻断（升档回归锁）', () => {
  const cwd = mkProj()
  try {
    execFileSync(process.execPath, [bin, 'run', 'quick', '--input', 't'], { cwd, encoding: 'utf8' })
    let blocked = false
    try {
      execFileSync(process.execPath, [bin, 'run', 'quick', '--done', '--change', 'quick-x', '--output', '/c/Program Files/Git/需求：脏标题'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (e) {
      blocked = true
      assert.equal(e.status, 2, `exit 2（实际 ${e.status}）`)
      assert.ok(String(e.stderr || '') + String(e.stdout || '').includes('已阻断'), `阻断文案在场（stderr 尾：${String(e.stderr||'').slice(-100)}；stdout 尾：${String(e.stdout||'').slice(-100)}）`)
    }
    assert.ok(blocked, 'MSYS 污染值被阻断')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})
