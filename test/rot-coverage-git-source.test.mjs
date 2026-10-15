/**
 * rot 覆盖面 git 源（2026-10-15-rot-coverage-git-source）
 *
 * 背景：fr-rot-suspect 的 unknown 面长期卡死 6 个归档变更（thin 归档无 design 交付表、
 * 无 change-patch.json 文件清单→覆盖面不可判定→每次 flow done 反复进 unknownSources）。
 * frCoverageFiles 增源3：git log --grep 变更名取 name-only 文件集。锁定四态：
 *   ① git 可恢复：主题含变更名的提交文件集进入覆盖面
 *   ② .sillyspec/ 自身工件面剔除
 *   ③ 无匹配变更名 → 覆盖面为空（源缺不编造）
 *   ④ 非 git 目录 fail-soft（源缺不抛）
 *   ⑤ partitionActiveByCoverage 消费：原 unknown 来源恢复后转强命中/skip，不再进 unknownSources
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { frCoverageFiles, partitionActiveByCoverage } from '../src/fr-index.js'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

/** 造临时 git 仓：一次主题含变更名的提交（src/a.js + .sillyspec/knowledge/x.md）+ 一次无关提交。 */
function seedGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'rot-git-'))
  const archiveRoot = join(root, 'archive') // 仓内任一目录可作 cwd
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
  mkdirSync(archiveRoot, { recursive: true })
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 't@t')
  git(root, 'config', 'user.name', 't')
  writeFileSync(join(root, 'src', 'a.js'), 'export {}\n')
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'x.md'), '# x\n')
  git(root, 'add', 'src/a.js', '.sillyspec/knowledge/x.md')
  git(root, 'commit', '-q', '-m', 'feat(demo): 2026-09-22-thin-fr-distill-sync 交付——src/a.js')
  writeFileSync(join(root, 'src', 'b.js'), 'export {}\n')
  git(root, 'add', 'src/b.js')
  git(root, 'commit', '-q', '-m', 'chore: 无关提交')
  return { root, archiveRoot }
}

test('①②③ 覆盖面 git 源：恢复文件、剔 .sillyspec、无匹配为空', () => {
  const { root, archiveRoot } = seedGitRepo()
  try {
    const cov = frCoverageFiles({ archiveRoot, changeName: '2026-09-22-thin-fr-distill-sync' })
    assert.ok(cov.includes('src/a.js'), `① git 恢复交付文件（实际 ${JSON.stringify(cov)}）`)
    assert.ok(!cov.some((p) => p.startsWith('.sillyspec/')), '② .sillyspec/ 自身工件面剔除')
    const covNone = frCoverageFiles({ archiveRoot, changeName: '2026-01-01-never-existed' })
    assert.equal(covNone.length, 0, '③ 无匹配变更名覆盖面为空（不编造）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④ 非 git 目录 fail-soft：源缺不抛、返回空', () => {
  const root = mkdtempSync(join(tmpdir(), 'rot-nogit-'))
  try {
    const cov = frCoverageFiles({ archiveRoot: root, changeName: 'anything' })
    assert.equal(cov.length, 0, '④ 非 git 仓 fail-soft 空覆盖面')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑤ partition 消费：原 unknown 来源恢复后转 skip/强命中，unknownSources 收敛', () => {
  const { root, archiveRoot } = seedGitRepo()
  try {
    // FR 来源=该变更，域文件覆盖面（design/patch 缺席）→ 此前 unknown；git 源恢复 src/a.js 后：
    // 触碰 src/a.js 子路径 → 强命中；触碰无关路径 → skip（不再 unknown）
    const frs = [{ domain: 'demo', id: 'FR-demo-001', title: 'x', change: '2026-09-22-thin-fr-distill-sync', bindings: [] }]
    const hit = partitionActiveByCoverage({ archiveRoot, frs, changed: ['src/a.js'] })
    assert.equal(hit.hits.length, 1, '⑤ 触碰恢复覆盖面 → 强命中')
    assert.equal(hit.unknownSources.length, 0, '⑤ unknownSources 收敛（不再卡归档来源）')
    const sk = partitionActiveByCoverage({ archiveRoot, frs, changed: ['other/c.js'] })
    assert.equal(sk.hits.length, 0, '⑤ 无交集 → skip')
    assert.equal(sk.skip, 1, '⑤ skip 计 1')
    assert.equal(sk.unknownSources.length, 0, '⑤ 无交集也不是 unknown')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
