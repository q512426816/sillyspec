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
import { nowWallClock } from '../src/datetime.js'
const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

function mkProj() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-fp-'))
  // 预置 .sillyspec：过未初始化目录硬拦（2026-10-10-cli-uninit-cwd-gate）——fourpiece-init 是非豁免命令
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
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

test('fourpiece-init：created_at 为本地墙钟（坑 taskcard-created-at-utc 同族回归锁）', () => {
  const cwd = mkProj()
  try {
    const before = nowWallClock()
    execFileSync(process.execPath, [bin, 'fourpiece-init', '--change', 'c-local'], { cwd, encoding: 'utf8' })
    const after = nowWallClock()
    for (const f of ['proposal.md', 'requirements.md', 'decisions.md']) {
      const m = /^created_at: (.+)$/m.exec(readFileSync(join(cwd, '.sillyspec', 'changes', 'c-local', f), 'utf8'))
      assert.ok(m, `${f} created_at 在场`)
      const stamp = m[1].trim()
      // 字典序比较成立：YYYY-MM-DD HH:mm:ss 定宽形状。UTC 写入（toISOString 裸形状）
      // 在非 UTC 时区机上必偏移出窗（实证机 UTC+8 偏 8h），断言失败拦回归。
      assert.ok(stamp >= before && stamp <= after, `${f} created_at=${stamp} 应落本地墙钟窗 [${before}, ${after}]`)
    }
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('MSYS 污染 output → exit 2 阻断（升档回归锁）', () => {
  const cwd = mkProj()
  try {
    // quick 通道已退役（2026-09-25-quick-channel-retire）不再启动会话；MSYS 污染检测在
    // command.js 旗标装载层（会话解析之前），--done 形态无需真实会话即可验证
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
