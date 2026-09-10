/**
 * 平台模式产物路径回显注记（2026-09-10 驾驭小结②）。
 *
 * 背景：verify-probes --init 在平台模式（.sillyspec-platform.json pointer 存在）下 spec 根
 * 解析为 hub 镜像目录，回显的物理路径（已生成骨架/已存在不覆盖/verify-facts 刷新）都在镜像
 * 根下，而产物经 daemon spec-sync 落主仓 .sillyspec/changes/<change>/——用户在主仓核对，
 * 回显却是镜像路径，显示混乱（用户实锤）。
 *
 * 锁定语义：
 *   - formatPlatformPathNote：null（非平台模式）→ 空串（本地模式回显零变化）；
 *     平台模式 → 注记含镜像根 + 主仓相对同步位置（.sillyspec/changes/<change>/<file>）
 *   - writeVerifyFacts opts.platformNote：追加到回显行尾（3 参旧调用零变化）、不进落盘内容
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { formatPlatformPathNote, writeVerifyFacts } from '../src/verify-probes.js'

test('formatPlatformPathNote：非平台模式 → 空串（本地回显零变化）', () => {
  assert.equal(formatPlatformPathNote(null, 'my-change', 'verify-result.md'), '')
  assert.equal(formatPlatformPathNote(undefined, 'my-change', 'verify-result.md'), '')
})

test('formatPlatformPathNote：平台模式 → 注记含镜像根 + 主仓同步位置', () => {
  const note = formatPlatformPathNote('C:/hub/data/spec-root', '2026-09-10-x', 'verify-result.md')
  assert.ok(note.includes('C:/hub/data/spec-root'), '注记含 hub 镜像根（物理写盘位置）')
  assert.ok(note.includes('.sillyspec/changes/2026-09-10-x/verify-result.md'), '注记含主仓同步位置（按产物文件名拼）')
  const note2 = formatPlatformPathNote('C:/hub/data/spec-root', '2026-09-10-x', 'verify-facts.json')
  assert.ok(note2.includes('.sillyspec/changes/2026-09-10-x/verify-facts.json'), 'facts 文件名同样拼入')
})

test('writeVerifyFacts opts.platformNote：默认无注记，传则不进落盘内容（纯回显层）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vp-note-'))
  try {
    const probes = { probe1: { matches: [] }, probe3: { tasks: [] }, probe5: {}, probe6: { deletions: [] } }
    // 旧调用形态（3 参）不抛——向后兼容
    writeVerifyFacts(dir, probes, 'c1')
    // platformNote 不影响落盘内容（纯回显层）
    writeVerifyFacts(dir, probes, 'c1', { platformNote: '（平台模式注记）' })
    const facts = JSON.parse(readFileSync(join(dir, 'verify-facts.json'), 'utf8'))
    assert.equal(facts.change, 'c1')
    assert.equal(facts.schemaVersion, 2)
    assert.ok(!JSON.stringify(facts).includes('平台模式注记'), 'platformNote 不进落盘内容（纯回显）')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

// ── 平台模式产物双写镜像（坑 platform-init-artifact-daemon-dir-only，2026-09-10 驾驭小结第三批②）──
test('mirrorPlatformArtifactToMainRepo：平台态双写主仓；daemon/本地/无 changeDir 跳过', async () => {
  const { mirrorPlatformArtifactToMainRepo } = await import('../src/run/shared.js')
  // 场景①：agent 本地平台态（platformBase 异于本地 spec 根，本地 changeDir 在）→ 双写
  const cwd = mkdtempSync(join(tmpdir(), 'mirror-main-'))
  const platformBase = mkdtempSync(join(tmpdir(), 'mirror-platform-'))
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'my-change'), { recursive: true })
  const mirrored = mirrorPlatformArtifactToMainRepo({
    cwd, changeName: 'my-change', file: 'verify-result.md', content: '# 报告\n', platformBase,
  })
  assert.equal(mirrored, join(cwd, '.sillyspec', 'changes', 'my-change', 'verify-result.md'), '返回镜像路径')
  assert.equal(readFileSync(mirrored, 'utf8'), '# 报告\n', '内容落主仓 changeDir')

  // 场景②：显式 --spec-dir（daemon 上下文）→ 不镜像
  const m2 = mirrorPlatformArtifactToMainRepo({
    cwd, changeName: 'my-change', file: 'x.md', content: 'x', platformBase, specDirExplicit: true,
  })
  assert.equal(m2, null, 'daemon 上下文（显式 spec-dir）跳过')
  assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', 'my-change', 'x.md')), '未写镜像文件')

  // 场景③：非平台模式 → 不镜像
  assert.equal(mirrorPlatformArtifactToMainRepo({ cwd, changeName: 'my-change', file: 'y.md', content: 'y', platformBase: null }), null)

  // 场景④：本地主仓无该 changeDir → 不凭空建目录
  assert.equal(mirrorPlatformArtifactToMainRepo({ cwd, changeName: 'nope', file: 'z.md', content: 'z', platformBase }), null)

  // 场景⑤：本地模式（platformBase 恰为本地根，路径同）→ 跳过（避免自写自）
  assert.equal(mirrorPlatformArtifactToMainRepo({ cwd, changeName: 'my-change', file: 'w.md', content: 'w', platformBase: join(cwd, '.sillyspec') }), null)

  for (const d of [cwd, platformBase]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
})
