/**
 * span-risk-surface 测试（2026-09-19-span-risk-pattern-migration task-01 / FR-01 / FR-05 / D-003）
 *
 * 覆盖：
 *   1. 编译等价性钉（核心，R-02）：六域 21 token 展开集经 compileSpanRiskPatterns 编译后，
 *      对 35 条代表性路径（正反例，21 token 全覆盖）逐文件断言——新表命中 ⇔ 旧六域正则
 *      任一命中（双向同命中同不命中）、命中条数相等、命中 token 集=绝对期望、同文件同域
 *      至多 1 token 命中（互斥钉：oauth vs oauth2、job vs jobs 等段边界锚定）。旧表六条
 *      正则以测试内常量 LEGACY 逐字快照（源：src/change-risk-profile.js:36-43——本 task
 *      时点表还在 src；task-03 删表后本快照仍可对照，等价性钉不随退役失效）。
 *   2. compile 容错：非字符串/空白/重复 token 跳过与去重（首个保留）；产物 {pattern, re}
 *      形态（边界锚定 /i、特殊字符只做字面量）
 *   3. match：Windows 反斜杠归一、空串过滤、patterns 元素防御（null/非对象/re 非 RegExp
 *      跳过）、global 正则 lastIndex 跨文件/跨调用防御
 *   4. load 容错（tmp 夹具）：无 span_risk 段 → []、段非数组 → []、条目脏值混入 → 只留
 *      合法、坏 YAML → []、map 缺失 → []（不回退内置表）
 *   5. AllProjects：tmp 多项目 token 并集（跨项目去重）+ 单项目坏 map 跳过 + docs 缺失空表
 *   6. export 形状钉：四导出 typeof function
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  compileSpanRiskPatterns,
  matchSpanRiskPatterns,
  loadSpanRiskPatterns,
  loadSpanRiskPatternsAllProjects,
} from '../src/span-risk-surface.js'

// ── 旧表六条正则逐字快照（src/change-risk-profile.js:36-43；task-03 删表后即为独立对照基准）──
const LEGACY = [
  { pattern: 'auth', re: /(?:^|[/_-])(?:oauth2?|auth(?:orization|entication|enticator)?)(?=[/._-]|$)/i },
  { pattern: 'permission', re: /(?:^|[/_-])permissions?(?=[/._-]|$)/i },
  { pattern: 'billing', re: /(?:^|[/_-])billing(?=[/._-]|$)/i },
  { pattern: 'migration', re: /(?:^|[/_-])(?:migrations?|migrate)(?=[/._-]|$)/i },
  { pattern: 'lock', re: /(?:^|[/_-])(?:locks?|mutex(?:es)?)(?=[/._-]|$)/i },
  { pattern: 'scheduling', re: /(?:^|[/_-])(?:schedul(?:er|ing)|cron|jobs?)(?=[/._-]|$)/i },
]

// ── 六域 21 token 展开集（LEGACY 六条正则的全部 alternation 逐项展开）──
const TOKENS = [
  'auth', 'authorization', 'authentication', 'authenticator', 'oauth', 'oauth2',
  'permission', 'permissions',
  'billing',
  'migration', 'migrations', 'migrate',
  'lock', 'locks', 'mutex', 'mutexes',
  'scheduler', 'scheduling', 'cron', 'job', 'jobs',
]

// token → 旧域映射（互斥钉用：同文件同域至多 1 token 命中）
const TOKEN_DOMAIN = new Map([
  ['auth', 'auth'], ['authorization', 'auth'], ['authentication', 'auth'], ['authenticator', 'auth'], ['oauth', 'auth'], ['oauth2', 'auth'],
  ['permission', 'permission'], ['permissions', 'permission'],
  ['billing', 'billing'],
  ['migration', 'migration'], ['migrations', 'migration'], ['migrate', 'migration'],
  ['lock', 'lock'], ['locks', 'lock'], ['mutex', 'lock'], ['mutexes', 'lock'],
  ['scheduler', 'scheduling'], ['scheduling', 'scheduling'], ['cron', 'scheduling'], ['job', 'scheduling'], ['jobs', 'scheduling'],
])

// ── 代表性路径集（35 条，21 token 正例全覆盖 + 边界锚定反例）──
// 每条 [路径, 期望命中 token 集]；期望集独立于两侧实现写死，防新旧连带漂移。
const PATH_CASES = [
  // 正例（21 token 全覆盖；互斥：同段只长形式命中，短形式被后界锚定挡住）
  ['src/auth/x.js', ['auth']],
  ['user-auth.js', ['auth']],                        // 前界含 -
  ['AUTH/login.js', ['auth']],                       // /i 大小写不敏感
  ['src/authorization/grant.js', ['authorization']], // auth+orization 不串
  ['src/authentication/ldap.js', ['authentication']],
  ['src/authenticator/totp.js', ['authenticator']],
  ['src/oauth/index.js', ['oauth']],
  ['src/oauth2/token.js', ['oauth2']],               // oauth 被「2」挡住（互斥钉）
  ['src/permission/show.js', ['permission']],
  ['src/permissions/admin.js', ['permissions']],     // permission 被「s」挡住（互斥钉）
  ['src/billing/invoice.js', ['billing']],
  ['db/migrations/001.sql', ['migrations']],         // migration 被尾 s 挡住
  ['src/migration/alter.sql', ['migration']],
  ['src/migrate.js', ['migrate']],
  ['docs-migrate.js', ['migrate']],
  ['src/lock/a.js', ['lock']],
  ['src/locks/redis.js', ['locks']],
  ['src/mutex-guard.js', ['mutex']],                 // 后界含 -（mutex-guard 命中 mutex）
  ['src/mutexes/x.js', ['mutexes']],
  ['src/scheduler.js', ['scheduler']],
  ['src/scheduling/queue.js', ['scheduling']],
  ['src/cron/tick.js', ['cron']],
  ['src/job/queue.js', ['job']],                     // jobs 不命中（后界 / 挡住）
  ['src/jobs/worker.js', ['jobs']],                  // job 被「s」挡住（互斥钉）
  ['src/auth/migration.js', ['auth', 'migration']],  // 多域命中：条数=2（新表 token 数=旧表域数）
  // 反例（边界锚定防子串假阳 / 非六域 token）
  ['author.js', []],                                 // auth+or 不命中
  ['booking.js', []],
  ['lockfile.js', []],                               // lock+file 不命中
  ['src/locked.js', []],                             // lock+ed 不命中
  ['src/schedule.js', []],                           // schedul ≠ scheduler/scheduling
  ['src/jobby.js', []],                              // job+by 不命中
  ['src/oauth2client/x.js', []],                     // oauth2+client 不命中
  ['src/billings-report.js', []],                    // billing+s 不命中
  ['src/dispatch/a.js', []],                         // dispatch 非六域 token（本仓自举才有）
  ['src/unrelated/x.js', []],
]

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

after(() => {
  for (const d of tmpRoots) {
    try { rmSync(d, { recursive: true, force: true }) } catch { /* best-effort */ }
  }
})

test('export 形状钉：四导出均为 function', () => {
  for (const fn of [compileSpanRiskPatterns, matchSpanRiskPatterns, loadSpanRiskPatterns, loadSpanRiskPatternsAllProjects]) {
    assert.equal(typeof fn, 'function')
  }
})

test('compile 产物形态：{pattern, re} 边界锚定 /i + 特殊字符只做字面量', () => {
  const [p] = compileSpanRiskPatterns(['auth'])
  assert.equal(p.pattern, 'auth')
  assert.equal(p.re.source, '(?:^|[/_-])auth(?=[/._-]|$)')
  assert.equal(p.re.flags, 'i')
  assert.ok(!p.re.global)
  // 特殊字符字面量编译（零新文法：token 不被当正则解释）
  const [dot] = compileSpanRiskPatterns(['a.b'])
  assert.ok(dot.re.test('src/a.b/x.js'))
  assert.ok(!dot.re.test('src/aXb/x.js'))
})

test('compile 容错：非字符串/空白/重复 token 跳过与去重（首个保留）', () => {
  const out = compileSpanRiskPatterns(['auth', 123, null, true, undefined, {}, ['x'], '', '   ', 'billing', 'auth', ' auth ', 'billing '])
  assert.deepEqual(out.map((p) => p.pattern), ['auth', 'billing'])
  assert.ok(out.every((p) => p.re instanceof RegExp))
  // 非数组入参 → []
  assert.deepEqual(compileSpanRiskPatterns(null), [])
  assert.deepEqual(compileSpanRiskPatterns('auth'), [])
})

test('match：反斜杠归一/空串过滤/元素防御/global lastIndex 防御', () => {
  const patterns = compileSpanRiskPatterns(['auth', 'billing'])
  // Windows 反斜杠归一（file=归一后 POSIX 路径）；空串过滤
  const hits = matchSpanRiskPatterns(['src\\auth\\x.js', '', 'src\\billing\\a.js'], patterns)
  assert.deepEqual(hits, [
    { pattern: 'auth', file: 'src/auth/x.js' },
    { pattern: 'billing', file: 'src/billing/a.js' },
  ])
  // patterns 元素防御：null/非对象/re 非 RegExp 逐条跳过，合法条目照常命中
  const defended = matchSpanRiskPatterns(['src/auth/a.js'], [null, 'garbage', 42, { pattern: 'x' }, { pattern: 'y', re: 'not-a-regexp' }, ...patterns])
  assert.deepEqual(defended, [{ pattern: 'auth', file: 'src/auth/a.js' }])
  // global 正则 lastIndex 防御：同批多文件 + 跨多次调用结果一致（无防御时第 2 个文件起失配）
  const g = { pattern: 'auth', re: /(?:^|[/_-])auth(?=[/._-]|$)/gi }
  const batch1 = matchSpanRiskPatterns(['src/auth/1.js', 'src/auth/2.js'], [g])
  const batch2 = matchSpanRiskPatterns(['src/auth/1.js', 'src/auth/2.js'], [g])
  assert.equal(batch1.length, 2)
  assert.equal(batch2.length, 2)
  assert.deepEqual(batch2.map((h) => h.file), ['src/auth/1.js', 'src/auth/2.js'])
  // 非数组入参防御
  assert.deepEqual(matchSpanRiskPatterns(null, patterns), [])
  assert.deepEqual(matchSpanRiskPatterns(['src/auth/x.js'], null), [])
})

test('编译等价性钉：21 token 新表 ⇔ 旧六域正则（双向同命中 + 条数相等 + 同域互斥）', () => {
  const patterns = compileSpanRiskPatterns(TOKENS)
  assert.equal(patterns.length, 21, '21 token 全部编译（无去重误伤）')
  for (const [file, expectedTokens] of PATH_CASES) {
    const newHits = matchSpanRiskPatterns([file], patterns).map((h) => h.pattern)
    const legacyHits = LEGACY.filter((e) => e.re.test(file)).map((e) => e.pattern)
    // 双向：新表命中 ⇔ 旧表任一正则命中（同命中同不命中）
    assert.equal(newHits.length > 0, legacyHits.length > 0, `${file} 命中面双向一致（新 ${JSON.stringify(newHits)} vs 旧 ${JSON.stringify(legacyHits)}）`)
    // 条数相等（互斥前提下：新表 token 命中数 = 旧表域命中数）
    assert.equal(newHits.length, legacyHits.length, `${file} 命中条数一致（新 ${JSON.stringify(newHits)} vs 旧 ${JSON.stringify(legacyHits)}）`)
    // 绝对期望（独立于两侧实现，防新旧连带漂移）
    assert.deepEqual([...newHits].sort(), [...expectedTokens].sort(), `${file} 命中 token 集=期望 ${JSON.stringify(expectedTokens)}`)
    // 互斥钉：同文件同域至多 1 token 命中（oauth vs oauth2、job vs jobs 等段边界锚定）
    const domains = newHits.map((t) => TOKEN_DOMAIN.get(t))
    assert.equal(new Set(domains).size, domains.length, `${file} 同文件同域至多 1 token 命中（新 ${JSON.stringify(newHits)}）`)
  }
})

test('load 容错：无段/段非数组/脏条目/坏 YAML/map 缺失 → 空表或只留合法', () => {
  const rt = makeTmpDir('srs-load-')
  const projDir = join(rt, 'docs', 'demo', 'modules')
  mkdirSync(projDir, { recursive: true })
  const mapPath = join(projDir, '_module-map.yaml')

  // 好形态 map（块式 YAML，token 装载为编译产物）
  writeFileSync(mapPath, ['schema_version: 2', 'modules:', '  a:', '    status: active', 'span_risk:', '  - auth', '  - billing'].join('\n'), 'utf8')
  let out = loadSpanRiskPatterns({ specBase: rt, project: 'demo' })
  assert.deepEqual(out.map((p) => p.pattern), ['auth', 'billing'])
  assert.ok(out[0].re instanceof RegExp && out[0].re.test('src/auth/x.js'))

  // 无 span_risk 段 → []（维度关闭，不回退内置表）
  writeFileSync(mapPath, 'modules:\n  a:\n    status: active\n', 'utf8')
  assert.deepEqual(loadSpanRiskPatterns({ specBase: rt, project: 'demo' }), [])

  // 段非数组（标量 / 映射）→ []
  writeFileSync(mapPath, 'span_risk: auth\n', 'utf8')
  assert.deepEqual(loadSpanRiskPatterns({ specBase: rt, project: 'demo' }), [])
  writeFileSync(mapPath, 'span_risk:\n  a: b\n', 'utf8')
  assert.deepEqual(loadSpanRiskPatterns({ specBase: rt, project: 'demo' }), [])

  // 条目脏值混入 → 只留合法（数字/null/对象/空串/纯空白跳过；空白 token trim 生效）
  writeFileSync(mapPath, 'span_risk:\n  - auth\n  - 123\n  - null\n  - {}\n  - ""\n  - "   "\n  - " billing "\n  - cron\n', 'utf8')
  out = loadSpanRiskPatterns({ specBase: rt, project: 'demo' })
  assert.deepEqual(out.map((p) => p.pattern), ['auth', 'billing', 'cron'])

  // 坏 YAML → []
  writeFileSync(mapPath, '{not yaml', 'utf8')
  assert.deepEqual(loadSpanRiskPatterns({ specBase: rt, project: 'demo' }), [])

  // map 缺失 → []
  assert.deepEqual(loadSpanRiskPatterns({ specBase: rt, project: 'no-such' }), [])
})

test('AllProjects 并集：多项目 token 并集（跨项目去重）+ 单项目坏 map 跳过', () => {
  const rt = makeTmpDir('srs-all-')
  const mk = (project, lines) => {
    const dir = join(rt, 'docs', project, 'modules')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '_module-map.yaml'), lines.join('\n'), 'utf8')
  }
  mk('alpha', ['span_risk:', '  - auth', '  - billing'])
  mk('beta', ['span_risk:', '  - billing', '  - cron']) // billing 跨项目重复 → 去重
  mk('broken', ['{not yaml'])                            // 坏 map → 该项目按空表跳过
  mk('empty', ['modules:', '  a:', '    status: active']) // 无段项目 → 空表
  writeFileSync(join(rt, 'docs', 'plain-file.md'), 'x', 'utf8') // docs 下非目录项跳过
  const all = loadSpanRiskPatternsAllProjects({ specBase: rt })
  assert.deepEqual(all.map((p) => p.pattern).sort(), ['auth', 'billing', 'cron'])
  assert.ok(all.every((p) => p.re instanceof RegExp))
  // docs 目录缺失 → 空表
  const rt2 = makeTmpDir('srs-none-')
  assert.deepEqual(loadSpanRiskPatternsAllProjects({ specBase: rt2 }), [])
})
