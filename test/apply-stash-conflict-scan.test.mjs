/**
 * apply-stash-conflict-scan（2026-10-21-p0-p1-hardening FR-02）
 *
 * dsh z2 实证事故：worktree apply --stash-dirty 恢复步静默留 git 冲突标记（`<<<<<<< Updated
 * upstream`），apply 输出声称 clean、主仓 tsc 才暴露。锁死契约：
 *   U1 scanConflictMarkers：行首三形态命中（含 CRLF），缩进/行中示例不误报，缺文件跳过
 *   I1 干净恢复：无标记 → 照常 drop + conflictFiles 空（既有行为不变）
 *   I2 恢复成功但 stash 面文件带标记 → 不 drop + conflictFiles 命中（fail-closed）
 *   I3 两级恢复均冲突（工作区重叠改动）→ 失败分支残留标记补报 + 条目保留
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { scanConflictMarkers, restoreMainStash } from '../src/worktree-apply.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
const gitOk = (cwd, args) => { try { git(cwd, args); return true } catch { return false } }

function initRepo(prefix) {
  const d = mk(prefix)
  git(d, ['init', '-q'])
  git(d, ['config', 'user.email', 't@t.local'])
  git(d, ['config', 'user.name', 't'])
  return d
}

test('U1 scanConflictMarkers：行首三形态命中（含 CRLF），缩进/行中示例不误报，缺文件跳过', () => {
  const d = mk('scanmk-')
  writeFileSync(join(d, 'hit-lf.txt'), 'a\n<<<<<<< Updated upstream\nb\n=======\nc\n>>>>>>> Stashed changes\n')
  writeFileSync(join(d, 'hit-crlf.txt'), 'a\r\n<<<<<<< ours\r\nb\r\n=======\r\nc\r\n>>>>>>> theirs\r\n')
  writeFileSync(join(d, 'clean.txt'), 'plain\n======= not-a-marker（行中带尾随内容）\n  <<<<<<< indented（缩进示例）\n')
  const hits = scanConflictMarkers(d, ['hit-lf.txt', 'hit-crlf.txt', 'clean.txt', 'missing.txt'])
  assert.deepEqual(hits, ['hit-lf.txt', 'hit-crlf.txt'], `仅行首三形态命中：${hits}`)
})

test('I1 干净恢复：无标记 → 照常 drop，conflictFiles 空（行为不变）', () => {
  const d = initRepo('rclean-')
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n')
  git(d, ['add', '.']); git(d, ['commit', '-qm', 'init'])
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\nthree\n') // 脏改动入 stash
  git(d, ['stash', 'push', '-m', 'marker1', '--', '.'])
  const sha = git(d, ['rev-parse', '--verify', 'stash@{0}']).trim()
  const r = restoreMainStash(d, { sha, marker: 'marker1' })
  assert.deepEqual(r.conflictFiles, [], '干净恢复 conflictFiles 空')
  assert.equal(gitOk(d, ['rev-parse', '--verify', 'stash@{0}']), false, 'stash 已照常 drop')
  assert.match(readFileSync(join(d, 'a.txt'), 'utf8'), /three/, '改动恢复落地')
})

test('I2 恢复成功但 stash 面文件带标记 → 不 drop + conflictFiles 命中（fail-closed）', () => {
  const d = initRepo('rmark-')
  writeFileSync(join(d, 'a.txt'), 'one\n')
  git(d, ['add', '.']); git(d, ['commit', '-qm', 'init'])
  // 用户脏文件本身含标记（git 退出码 0 的「静默标记」形态：标记来自 stash 内容本身）
  writeFileSync(join(d, 'a.txt'), 'one\n<<<<<<< Updated upstream\nx\n=======\ny\n>>>>>>> Stashed changes\n')
  git(d, ['stash', 'push', '-m', 'marker2', '--', '.'])
  const sha = git(d, ['rev-parse', '--verify', 'stash@{0}']).trim()
  const r = restoreMainStash(d, { sha, marker: 'marker2' })
  assert.deepEqual(r.conflictFiles, ['a.txt'], '恢复成功但扫描命中标记')
  assert.equal(gitOk(d, ['rev-parse', '--verify', 'stash@{0}']), true, 'stash 条目保留未 drop（SHA 兜底）')
})

test('I3 两级恢复均冲突（HEAD 已推进再恢复）→ 失败分支残留标记补报 + 条目保留', () => {
  const d = initRepo('rconf-')
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\nthree\n')
  git(d, ['add', '.']); git(d, ['commit', '-qm', 'init'])
  writeFileSync(join(d, 'a.txt'), 'one-DIRTY\ntwo\nthree\n')
  git(d, ['stash', 'push', '-m', 'marker3', '--', '.'])
  // 真实形态（dsh z2 同构）：stash 后主仓 HEAD 在同区域推进（模拟 apply 落地已提交）——
  // stash apply 三方合并 base≠HEAD → 冲突留 `<<<<<<< Updated upstream` 标记 + exit 非零
  writeFileSync(join(d, 'a.txt'), 'one-COMMITTED\ntwo\nthree\n')
  git(d, ['add', '.']); git(d, ['commit', '-qm', 'advance'])
  const sha = git(d, ['rev-parse', '--verify', 'stash@{0}']).trim()
  const r = restoreMainStash(d, { sha, marker: 'marker3' })
  assert.ok(r.conflictFiles.includes('a.txt'), `失败分支残留标记补报：${JSON.stringify(r.conflictFiles)}`)
  assert.ok(readFileSync(join(d, 'a.txt'), 'utf8').includes('<<<<<<<'), '标记确实在工作区')
  assert.equal(gitOk(d, ['rev-parse', '--verify', 'stash@{0}']), true, '失败路径条目保留')
})
