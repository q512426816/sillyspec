/**
 * semantic-guard 测试（change: 2026-09-11-cross-change-decision-guard，task-03，FR-03/FR-04）。
 *
 * 四组场景（TaskCard acceptance）：
 *   1. 交付归因 collectRecentForeignDelivery：变更名 / ql-ID 两类标记解析、本变更标记跳过
 *      （含「最新=本变更、更旧=他者 → 取最新非本变更」）、无标记不归因、git 不可用降级空、
 *      --since 窗口（days=0）、files 封顶 20
 *   2. 断言重写 detectAssertionRewrites：删除断言行命中、git add 暂存后仍命中（HEAD 口径，
 *      Grill X-001）、纯新增 hunk 不算、删除行无 token 不算、非测试文件不查、样例封顶 5/文件
 *   3. 渲染 renderSemanticGuardBlock：仅决策段 / rejected「已否决，勿复潮」/ 仅交付段 / 双零空串
 *   4. 开关 readSemanticGuardEnabled：嵌套与 flat 的显式 false → false；缺文件 / 缺键 /
 *      读取异常 → true（fail-open）
 *
 * 夹具先例：test/scope-audit.test.mjs:42+93（mkdtemp + git init -b main + 身份配置 + commit）、
 * test/decision-file-field.test.mjs mkDecisionLib（INDEX.md Decisions 段路由行 + 域文件）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import {
  collectRecentForeignDelivery,
  detectAssertionRewrites,
  renderSemanticGuardBlock,
  readSemanticGuardEnabled,
} from '../src/semantic-guard.js'

/** git 调用：数组参数不经 shell（Windows 路径安全），stdio pipe 吞输出 */
function sh(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function cleanup(d) {
  try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄延迟，重试后仍失败留给 OS Temp 回收 */ }
}

/** 临时 git 仓：main 分支 + 身份配置 + gitignore .sillyspec/（夹具内 spec 产物不进 git log） */
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  sh(d, ['init', '-q', '-b', 'main'])
  sh(d, ['config', 'user.email', 't@t.com'])
  sh(d, ['config', 'user.name', 't'])
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

/** 写文件并提交（自动建父目录） */
function commitFile(d, rel, content, subject) {
  const p = join(d, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
  sh(d, ['add', '--', rel])
  sh(d, ['commit', '-q', '-m', subject])
}

/** 同 commitFile，但钉死提交日期（--since 窗口用例需要确定性的旧提交；git 0.days 解析反直觉不可用） */
function commitFileAt(d, rel, content, subject, isoDate) {
  const p = join(d, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
  sh(d, ['add', '--', rel])
  execFileSync('git', ['-C', d, 'commit', '-q', '-m', subject], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
  })
}

/** knowledge 决策库夹具：INDEX.md Decisions 段路由行 → decisions/eng.md（knowledge-match 解析契约） */
function writeKnowledge(specBase, engMd) {
  mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), [
    '# Knowledge Index',
    '',
    '## Decisions',
    '- 语义护栏|决策 → [决策库](decisions/eng.md)',
    '',
  ].join('\n'))
  writeFileSync(join(specBase, 'knowledge', 'decisions', 'eng.md'), engMd)
}

const CUR = '2026-09-11-cross-change-decision-guard'

// ───────────────────────── 组 1：交付归因（FR-03） ─────────────────────────

test('归因：变更名标记 → 文件记他者变更名', () => {
  const d = makeRepo('sg-attr-name-')
  try {
    commitFile(d, 'src/a.js', 'a1\n', 'task-01 变更 2026-09-04-other-change：修 A')
    const r = collectRecentForeignDelivery({ cwd: d, files: ['src/a.js'], currentChange: CUR })
    assert.deepEqual(r, { 'src/a.js': '2026-09-04-other-change' })
  } finally { cleanup(d) }
})

test('归因：ql-ID 标记 → 文件记 ql-ID（quick 会话归因键）', () => {
  const d = makeRepo('sg-attr-ql-')
  try {
    commitFile(d, 'src/b.js', 'b1\n', 'quick ql-20260910-002-ab3f：修 B')
    const r = collectRecentForeignDelivery({ cwd: d, files: ['src/b.js'], currentChange: CUR })
    assert.deepEqual(r, { 'src/b.js': 'ql-20260910-002-ab3f' })
  } finally { cleanup(d) }
})

test('归因：最新提交是本变更、更旧是他者 → 取最新非本变更标记（旧者）', () => {
  const d = makeRepo('sg-attr-skip-')
  try {
    commitFile(d, 'src/c.js', 'c1\n', '变更 2026-09-01-old-change：初版')
    commitFile(d, 'src/c.js', 'c2\n', `变更 ${CUR}：本次改`)
    const r = collectRecentForeignDelivery({ cwd: d, files: ['src/c.js'], currentChange: CUR })
    assert.deepEqual(r, { 'src/c.js': '2026-09-01-old-change' })
  } finally { cleanup(d) }
})

test('归因：仅本变更标记 → 不记', () => {
  const d = makeRepo('sg-attr-only-cur-')
  try {
    commitFile(d, 'src/c.js', 'c1\n', `变更 ${CUR}：本次改`)
    const r = collectRecentForeignDelivery({ cwd: d, files: ['src/c.js'], currentChange: CUR })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('归因：无标记提交 → 不记', () => {
  const d = makeRepo('sg-attr-nomark-')
  try {
    commitFile(d, 'src/d.js', 'd1\n', 'chore: init')
    const r = collectRecentForeignDelivery({ cwd: d, files: ['src/d.js'], currentChange: CUR })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('归因：git 不可用（非仓目录）→ 空结果不抛', () => {
  const d = mkdtempSync(join(tmpdir(), 'sg-attr-nogit-'))
  try {
    writeFileSync(join(d, 'a.js'), 'x\n') // 无 git init
    const r = collectRecentForeignDelivery({ cwd: d, files: ['a.js'], currentChange: CUR })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('归因：--since 窗口真实过滤（钉死 30 天前的他者提交）', () => {
  const d = makeRepo('sg-attr-window-')
  try {
    const oldIso = new Date(Date.now() - 30 * 86400000).toISOString()
    commitFileAt(d, 'src/e.js', 'e1\n', '变更 2026-09-04-other-change：修 E', oldIso)
    // 默认 7 天窗：30 天前提交在窗外 → 不记
    assert.deepEqual(
      collectRecentForeignDelivery({ cwd: d, files: ['src/e.js'], currentChange: CUR }),
      {},
      '默认 7 天窗内无提交 → 不记',
    )
    // 放大到 90 天窗：命中（窗口参数真实下到 git --since）
    assert.deepEqual(
      collectRecentForeignDelivery({ cwd: d, files: ['src/e.js'], currentChange: CUR, days: 90 }),
      { 'src/e.js': '2026-09-04-other-change' },
      '90 天窗内 → 归因命中',
    )
  } finally { cleanup(d) }
})

test('归因：files 封顶 20，第 21+ 文件不查', () => {
  const d = makeRepo('sg-attr-cap-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    for (let i = 1; i <= 25; i++) {
      writeFileSync(join(d, 'src', `f${String(i).padStart(2, '0')}.js`), `v${i}\n`)
    }
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', '变更 2026-09-04-bulk-change：批量'])
    const files = Array.from({ length: 25 }, (_, i) => `src/f${String(i + 1).padStart(2, '0')}.js`)
    const r = collectRecentForeignDelivery({ cwd: d, files, currentChange: CUR })
    assert.equal(Object.keys(r).length, 20, '恰前 20 文件归因')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 2：断言重写（FR-04） ─────────────────────────

test('断言：删除断言行（- 侧含 token）→ 命中并给样例行', () => {
  const d = makeRepo('sg-assert-hit-')
  try {
    commitFile(d, 'test/foo.test.js', "test('t', () => { expect(1).toBe(1) })\n", 'init test')
    writeFileSync(join(d, 'test', 'foo.test.js'), "test('t', () => { expect(1).toBe(2) })\n")
    const r = detectAssertionRewrites({ cwd: d, files: ['test/foo.test.js'] })
    assert.deepEqual(r, { 'test/foo.test.js': ["test('t', () => { expect(1).toBe(1) })"] })
  } finally { cleanup(d) }
})

test('断言：git add 暂存后仍命中（HEAD 口径非 index，Grill X-001）', () => {
  const d = makeRepo('sg-assert-staged-')
  try {
    commitFile(d, 'test/foo.test.js', 'test("t", () => expect(x).toEqual(1))\n', 'init test')
    writeFileSync(join(d, 'test', 'foo.test.js'), 'test("t", () => expect(x).toEqual(2))\n')
    sh(d, ['add', '--', 'test/foo.test.js']) // quick step3 先暂存时序
    const r = detectAssertionRewrites({ cwd: d, files: ['test/foo.test.js'] })
    assert.ok(Array.isArray(r['test/foo.test.js']) && r['test/foo.test.js'].length > 0, '暂存后 diff HEAD 仍见删除侧断言')
  } finally { cleanup(d) }
})

test('断言：纯新增断言 hunk（无 - 行）→ 不算', () => {
  const d = makeRepo('sg-assert-addonly-')
  try {
    commitFile(d, 'test/foo.test.js', 'const a = 1\n', 'init test')
    writeFileSync(join(d, 'test', 'foo.test.js'), "const a = 1\ntest('x', () => expect(a).toBe(1))\n")
    const r = detectAssertionRewrites({ cwd: d, files: ['test/foo.test.js'] })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('断言：hunk 有删除行但删除侧无 token → 不算', () => {
  const d = makeRepo('sg-assert-notoken-')
  try {
    commitFile(d, 'test/foo.test.js', 'const x = 1\n', 'init test')
    writeFileSync(join(d, 'test', 'foo.test.js'), 'const x = 2\n')
    const r = detectAssertionRewrites({ cwd: d, files: ['test/foo.test.js'] })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('断言：非测试文件 → 不查（删除侧含 token 也空）', () => {
  const d = makeRepo('sg-assert-nontest-')
  try {
    commitFile(d, 'src/plain.js', 'expect(1).toBe(1)\n', 'init')
    writeFileSync(join(d, 'src', 'plain.js'), 'expect(1).toBe(2)\n')
    const r = detectAssertionRewrites({ cwd: d, files: ['src/plain.js'] })
    assert.deepEqual(r, {})
  } finally { cleanup(d) }
})

test('断言：*_test.* 命名 + assert token + 样例行封顶 5/文件', () => {
  const d = makeRepo('sg-assert-cap5-')
  try {
    const before = Array.from({ length: 8 }, (_, i) => `assert.equal(v${i}, ${i})\n`).join('')
    const after = Array.from({ length: 8 }, (_, i) => `assert.equal(v${i}, ${i}+1)\n`).join('')
    commitFile(d, 'test/unit/login_test.mjs', before, 'init test')
    writeFileSync(join(d, 'test', 'unit', 'login_test.mjs'), after)
    const r = detectAssertionRewrites({ cwd: d, files: ['test/unit/login_test.mjs'] })
    assert.equal(r['test/unit/login_test.mjs'].length, 5, '样例行封顶 5/文件')
    assert.ok(r['test/unit/login_test.mjs'][0].includes('assert.equal(v0, 0)'), '样例为删除侧原行')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 3：渲染组合 ─────────────────────────

test('渲染：仅决策命中 → 决策段含 id/title/status/reason/库文件指针，无交付段', () => {
  const d = makeRepo('sg-render-dec-')
  try {
    const specBase = join(d, '.sillyspec')
    writeKnowledge(specBase, [
      '# 决策知识 — eng',
      '',
      '## D-101@v1 测试决策标题甲',
      '状态：implemented',
      '文件：src/foo.js',
      '理由：理由内容甲乙丙',
      '',
    ].join('\n'))
    const out = renderSemanticGuardBlock({ specBase, cwd: d, candidateFiles: ['src/foo.js'], currentChange: CUR })
    assert.ok(typeof out === 'string' && out.length > 0, '非空串')
    for (const piece of ['D-101@v1', '测试决策标题甲', 'implemented', '理由内容甲乙丙', 'knowledge/decisions/eng.md']) {
      assert.ok(out.includes(piece), `决策段含 ${piece}`)
    }
    // 断言查段头子串（引导行无条件含「他者交付」措辞，不能作判据）
    assert.ok(!out.includes('他者交付归因'), '无交付段')
  } finally { cleanup(d) }
})

test('渲染：rejected 决策 → 标注「已否决，勿复潮」，reason 取否决理由', () => {
  const d = makeRepo('sg-render-rej-')
  try {
    const specBase = join(d, '.sillyspec')
    writeKnowledge(specBase, [
      '# 决策知识 — eng',
      '',
      '## D-102@v1 被否掉的方案',
      '状态：rejected',
      '文件：src/foo.js',
      '理由：曾考虑引入',
      '否决理由：否决理由内容xyz',
      '复潮条件：启动耗时优化到位后',
      '',
    ].join('\n'))
    const out = renderSemanticGuardBlock({ specBase, cwd: d, candidateFiles: ['src/foo.js'], currentChange: CUR })
    assert.ok(out.includes('已否决，勿复潮'), 'rejected 标注')
    assert.ok(out.includes('否决理由内容xyz'), 'reason = 否决理由')
  } finally { cleanup(d) }
})

test('渲染：仅交付命中 → 交付段含 文件→变更名，无决策段', () => {
  const d = makeRepo('sg-render-del-')
  try {
    commitFile(d, 'src/a.js', 'a1\n', '变更 2026-09-04-other-change：修 A')
    const out = renderSemanticGuardBlock({ specBase: join(d, '.sillyspec'), cwd: d, candidateFiles: ['src/a.js'], currentChange: CUR })
    assert.ok(out.includes('src/a.js ← 2026-09-04-other-change'), '交付段含 文件→变更名')
    assert.ok(!out.includes('决策库命中'), '无决策段')
  } finally { cleanup(d) }
})

test('渲染：决策与交付双零命中 → 空串（不留空段）', () => {
  const d = makeRepo('sg-render-zero-')
  try {
    const out = renderSemanticGuardBlock({ specBase: join(d, '.sillyspec'), cwd: d, candidateFiles: ['src/nope.js'], currentChange: CUR })
    assert.equal(out, '')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 4：开关（D-001@v1 fail-open） ─────────────────────────

test('开关：嵌套 semantic_guard.enabled=false → false', () => {
  const d = mkdtempSync(join(tmpdir(), 'sg-sw-nest-'))
  try {
    writeFileSync(join(d, 'local.yaml'), 'commands:\n  test: npm test\nsemantic_guard:\n  enabled: false\n')
    assert.equal(readSemanticGuardEnabled(d), false)
  } finally { cleanup(d) }
})

test('开关：flat semantic_guard.enabled: "false"（引号形态）→ false', () => {
  const d = mkdtempSync(join(tmpdir(), 'sg-sw-flat-'))
  try {
    writeFileSync(join(d, 'local.yaml'), '# flat 形态\nsemantic_guard.enabled: "false"\n')
    assert.equal(readSemanticGuardEnabled(d), false)
  } finally { cleanup(d) }
})

test('开关：CRLF 行尾不破解析（Windows 坑）→ false', () => {
  const d = mkdtempSync(join(tmpdir(), 'sg-sw-crlf-'))
  try {
    writeFileSync(join(d, 'local.yaml'), 'semantic_guard:\r\n  enabled: false\r\n')
    assert.equal(readSemanticGuardEnabled(d), false)
  } finally { cleanup(d) }
})

test('开关：local.yaml 缺失 / 段缺 enabled 键（不误读他段）/ 显式 true → true', () => {
  const none = mkdtempSync(join(tmpdir(), 'sg-sw-none-'))
  const has = mkdtempSync(join(tmpdir(), 'sg-sw-has-'))
  try {
    assert.equal(readSemanticGuardEnabled(none), true, '文件缺失默认 true')
    // semantic_guard: 段下无 enabled 键；紧随其后的 friction_hint.enabled=false 不得误读
    writeFileSync(join(has, 'local.yaml'), 'semantic_guard:\nfriction_hint:\n  enabled: false\n')
    assert.equal(readSemanticGuardEnabled(has), true, '段缺键不误读他段 → true')
    writeFileSync(join(has, 'local.yaml'), 'semantic_guard:\n  enabled: true\n')
    assert.equal(readSemanticGuardEnabled(has), true, '显式 true → true')
  } finally { cleanup(none); cleanup(has) }
})

test('开关：读取异常（local.yaml 是目录）→ true（fail-open）', () => {
  const d = mkdtempSync(join(tmpdir(), 'sg-sw-err-'))
  try {
    mkdirSync(join(d, 'local.yaml'), { recursive: true }) // readFileSync 抛 EISDIR
    assert.equal(readSemanticGuardEnabled(d), true)
  } finally { cleanup(d) }
})
