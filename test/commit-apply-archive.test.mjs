/**
 * commit --apply（P1-6，noai-ir-roadmap §4）：只限归档语境的执行提交。
 * 锁定：
 *   - 非 archive 语境（active + current_stage=plan 等）→ 拒绝（agent 上下文「需人确认」是
 *     伪约束，通用自动 git 在多会话仓是重灾区——收窄到归档这一处）；
 *   - 归档语境（status=archived / current_stage=archive）→ 显式 pathspec add + pathspec
 *     限定 commit：并行会话预暂存的其他文件不被扫入（共享 index 安全核心）；
 *   - 无语义来源（QUICKLOG 无新条目）→ 拒绝并指引手写。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { resolveArchiveCommitScope, applyArchiveCommit } from '../src/commit-suggest.js'

function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'cmtapply-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t.local', { cwd })
  execSync('git config user.name t', { cwd })
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  execSync('git add -A && git commit -qm init', { cwd })
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  return { cwd, specBase }
}

function seedChangeRow(specBase, name, status, currentStage) {
  const db = new DatabaseSync(join(specBase, '.runtime', 'sillyspec.db'))
  db.exec('CREATE TABLE IF NOT EXISTS changes (id INTEGER PRIMARY KEY, name TEXT UNIQUE, status TEXT, current_stage TEXT, created_at TEXT, last_active TEXT)')
  db.prepare('INSERT INTO changes (name, status, current_stage, created_at, last_active) VALUES (?, ?, ?, ?, ?)').run(name, status, currentStage, '2026-09-11', '2026-09-11')
  db.close()
}

test('语境判定：archived / current_stage=archive 放行；active+plan 拒绝；DB 缺失拒绝', () => {
  const { cwd, specBase } = makeFixture()
  try {
    seedChangeRow(specBase, 'c-archived', 'archived', '')
    seedChangeRow(specBase, 'c-inarchive', 'active', 'archive')
    seedChangeRow(specBase, 'c-plan', 'active', 'plan')
    assert.equal(resolveArchiveCommitScope({ cwd, changeName: 'c-archived' }).inArchiveScope, true, 'status=archived 放行')
    assert.equal(resolveArchiveCommitScope({ cwd, changeName: 'c-inarchive' }).inArchiveScope, true, 'current_stage=archive 放行')
    assert.equal(resolveArchiveCommitScope({ cwd, changeName: 'c-plan' }).inArchiveScope, false, 'active+plan 拒绝')
    const miss = resolveArchiveCommitScope({ cwd, specDir: join(cwd, 'nope'), changeName: 'x' })
    assert.equal(miss.inArchiveScope, false, 'DB 缺失不可判定 → 拒绝')
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})

test('apply：非归档语境拒绝；归档语境 pathspec 提交不扫并行会话暂存', () => {
  const { cwd, specBase } = makeFixture()
  try {
    seedChangeRow(specBase, 'c-plan', 'active', 'plan')
    const r0 = applyArchiveCommit({ cwd, changeName: 'c-plan' })
    assert.equal(r0.ok, false)
    assert.ok(r0.reason.includes('不在归档语境'), '拒绝理由指向语境限制')

    // 归档语境：造归档产物 + QUICKLOG 语义来源 + 并行会话预暂存的「他者文件」
    seedChangeRow(specBase, 'c-arch', 'archived', '')
    const archDir = join(specBase, 'changes', 'archive', '2026-09-11-x')
    mkdirSync(archDir, { recursive: true })
    writeFileSync(join(archDir, 'plan.md'), '# P\n')
    mkdirSync(join(specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-t.md'), '# QUICKLOG\n\n## ql-20260911-001-abcd | 2026-09-11 10:00:00 | 归档语义标题\n状态：已完成\n文件：\n需求：归档语义标题\n根因：无\n方案：归档产物提交\n结果：通过\n')
    // 他者文件：预暂存（模拟并行会话已 git add）
    writeFileSync(join(cwd, 'OTHERS_FILE.md'), '并行会话的内容\n')
    execSync('git add -- OTHERS_FILE.md', { cwd })

    const r = applyArchiveCommit({ cwd, changeName: 'c-arch' })
    assert.equal(r.ok, true, `归档语境执行（${r.reason || ''}）`)
    // pathspec 限定：他者预暂存文件不进本次提交
    const headFiles = execSync('git show --name-only --format= HEAD', { cwd, encoding: 'utf8' }).split('\n').filter(Boolean)
    assert.ok(!headFiles.includes('OTHERS_FILE.md'), '并行会话预暂存文件未被扫入（pathspec 限定 commit）')
    assert.ok(headFiles.some(f => f.replace(/\\/g, '/').includes('changes/archive/2026-09-11-x')), '归档产物已提交')
    assert.ok(r.subject.length > 0, 'message 来自语义来源')
    // 他者文件仍在暂存区（未被消费）
    const staged = execSync('git diff --cached --name-only', { cwd, encoding: 'utf8' }).split('\n').filter(Boolean)
    assert.ok(staged.includes('OTHERS_FILE.md'), '他者暂存原样保留')
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})
