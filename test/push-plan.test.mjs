/**
 * push 计划层纯函数回归（2026-10-23-push-squash task-02）
 *
 * 覆盖：参数解析、变更归属识别、by-change 连续段分组、one 模式守卫、消息合成
 * （变更名 + task-NN 证据保留）、计划渲染。零 git 依赖，便于快速定位逻辑回归。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const {
  parsePushArgs, detectChangeOwner, classifyCommits, buildSquashMessage, renderPushPlan, signatureWarnFromFlags,
} = await import(pathToFileURL(join(ROOT, '..', 'src', 'push.js')).href)

const APP = '2026-10-23-app'
const OTHER = '2026-10-23-other'

function commit({ sha, subject, body = '', tree = 't' + sha, parents = ['p'] }) {
  const message = body ? `${subject}\n\n${body}` : subject
  return { sha, tree, parents, author: { name: 't', email: 't@t', date: '2026-10-23T00:00:00Z' }, message, subject, body }
}

test('parsePushArgs：默认 by-change；one 必须带 --change；未知/互斥 fail-closed', () => {
  assert.deepEqual(parsePushArgs([]).options.mode, 'by-change')
  assert.equal(parsePushArgs(['--mode', 'one']).ok, false)
  assert.equal(parsePushArgs(['--mode', 'one', '--change', APP]).ok, true)
  assert.equal(parsePushArgs(['--mode', 'bad']).ok, false)
  assert.equal(parsePushArgs(['--unknown']).ok, false)
  assert.equal(parsePushArgs(['file.txt']).ok, false)
  assert.equal(parsePushArgs(['--undo', '--mode', 'one', '--change', APP]).ok, false)
  assert.equal(parsePushArgs(['--undo', '--remote', 'origin']).ok, true)
  assert.equal(parsePushArgs(['--mode', 'none', '--no-push']).ok, false)
  assert.equal(parsePushArgs(['--dry-run', '--json']).options.dryRun, true, '--json 由全局层剥离，这里不应报未知')
})

test('detectChangeOwner：括号/归档/plumbing 形态与歧义', () => {
  assert.equal(detectChangeOwner(`feat: a (${APP})`, [APP, OTHER]), APP)
  assert.equal(detectChangeOwner(`chore(archive): ${APP} 归档留档`, [APP, OTHER]), APP)
  assert.equal(detectChangeOwner(`sillyspec: baseline checkpoint for ${APP}`, [APP, OTHER]), APP)
  assert.equal(detectChangeOwner(`sillyspec: auto-commit worktree WIP (3 files)`, [APP, OTHER]), null)
  assert.equal(detectChangeOwner(`feat: mix (${APP}) (${OTHER})`, [APP, OTHER]), null)
  assert.equal(detectChangeOwner(`feat: manual change`, [APP, OTHER]), null)
})

test('classifyCommits by-change：连续同变更段压扁，plumbing 贴段，非连续不跨段', () => {
  const commits = [
    commit({ sha: 'a1', subject: `feat: a1 (${APP})`, body: 'task-01' }),
    commit({ sha: 'a2', subject: 'sillyspec: align baseline files to main (pre-merge, 1 files)' }),
    commit({ sha: 'a3', subject: `feat: a3 (${APP})`, body: 'task-02/03' }),
    commit({ sha: 'b1', subject: `feat: b1 (${OTHER})` }),
    commit({ sha: 'a4', subject: `feat: a4 (${APP})` }),
  ]
  const r = classifyCommits({ commits, mode: 'by-change', knownChanges: [APP, OTHER] })
  assert.equal(r.ok, true)
  assert.equal(r.groups.length, 3, 'A1+A2+A3 / B1 / A4')
  assert.deepEqual(r.groups.map((g) => g.owner), [APP, OTHER, APP])
  assert.deepEqual(r.groups.map((g) => g.commits.length), [3, 1, 1])
  assert.equal(r.groups[0].action, 'squash')
  assert.equal(r.groups[1].action, 'keep')
  assert.match(r.groups[0].subject, new RegExp(`\\(${APP}\\)`))
  assert.match(r.groups[0].message, /task-01/)
  assert.match(r.groups[0].message, /task-02\/03/)
  assert.equal(r.needsRewrite, true)
})

test('classifyCommits：无归属连续提交不合并，单提交不重写', () => {
  const r1 = classifyCommits({ commits: [commit({ sha: 'x1', subject: 'manual 1' }), commit({ sha: 'x2', subject: 'manual 2' })], mode: 'by-change', knownChanges: [] })
  assert.equal(r1.groups.length, 2)
  assert.equal(r1.needsRewrite, false)

  const r2 = classifyCommits({ commits: [commit({ sha: 'a1', subject: `feat: only (${APP})` })], mode: 'by-change', knownChanges: [APP] })
  assert.equal(r2.groups.length, 1)
  assert.equal(r2.groups[0].action, 'keep')
  assert.equal(r2.needsRewrite, false)
})

test('classifyCommits one：仅允许单变更；外部变更拒绝', () => {
  const ok = classifyCommits({
    commits: [commit({ sha: 'a1', subject: `feat: a1 (${APP})` }), commit({ sha: 'a2', subject: `feat: a2 (${APP})` })],
    mode: 'one', changeName: APP, knownChanges: [APP, OTHER],
  })
  assert.equal(ok.ok, true)
  assert.equal(ok.groups.length, 1)
  assert.equal(ok.groups[0].commits.length, 2)
  assert.match(ok.groups[0].subject, new RegExp(`\\(${APP}\\)`))

  const bad = classifyCommits({
    commits: [commit({ sha: 'a1', subject: `feat: a1 (${APP})` }), commit({ sha: 'b1', subject: `feat: b1 (${OTHER})` })],
    mode: 'one', changeName: APP, knownChanges: [APP, OTHER],
  })
  assert.equal(bad.ok, false)
  assert.match(bad.error, /其他变更提交/)
})

test('buildSquashMessage：body 里独有的 task token 也保留', () => {
  const msg = buildSquashMessage({
    commits: [
      commit({ sha: 'a1', subject: `feat: a1 (${APP})`, body: '普通说明' }),
      commit({ sha: 'a2', subject: `feat: a2 (${APP})`, body: '证据：task-07 已通过' }),
    ],
    owner: APP,
  })
  assert.match(msg, /^feat: a1 \(2026-10-23-app\)/m)
  assert.match(msg, /task-07/)
  assert.match(msg, /Squashed 2 commits/)
})

test('签名标记解析纯函数', () => {
  const sha = (c) => c.repeat(40)
  assert.equal(signatureWarnFromFlags([{ sha: sha('a'), flag: 'N' }, { sha: sha('b'), flag: 'N' }]), null, '全无签名 → null（零误报）')
  const w = signatureWarnFromFlags([{ sha: sha('a'), flag: 'N' }, { sha: sha('b'), flag: 'G' }, { sha: sha('c'), flag: 'E' }])
  assert.match(w, /2 个带签名提交/)
  assert.match(w, /无签名提交/)
  assert.match(w, /人工处理/)
  const w2 = signatureWarnFromFlags([])
  assert.equal(w2, null)
})

test('renderPushPlan：分组/抬升/预览行可读', () => {
  const plan = {
    mode: 'by-change', ctx: { branch: 'main', head: 'a'.repeat(40) }, target: { remote: 'origin', remoteBranch: 'main' },
    base: 'b'.repeat(40), effectiveBase: 'c'.repeat(40), baseRaised: true,
    commits: [1, 2, 3], needsRewrite: true,
    groups: [{ owner: APP, commits: [{ sha: 'a1'.repeat(20) }, { sha: 'a2'.repeat(20) }], action: 'squash', subject: `feat: a (${APP})` }],
    warnings: ['w1'],
  }
  const lines = renderPushPlan({ plan, dryRun: true }).join('\n')
  assert.match(lines, /mode=by-change/)
  assert.match(lines, /effectiveBase|抬升|已从/)
  assert.match(lines, /压扁 2 笔/)
  assert.match(lines, /仅预览/)
})
