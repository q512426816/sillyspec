/**
 * quick-gate-profile 矩阵单测（2026-09-14-quick-exit-tiered-gates task-01 / FR-02）。
 *
 * 纯函数零夹具覆盖 computeGateProfile / THRESHOLDS / resolveGateThresholds：
 *   1. THRESHOLDS 单点常量（2/4/4/8）与判级只引用常量；
 *   2. resolveGateThresholds：无配置=默认、逐键覆写、非法键回退默认并 warn、段非对象 warn；
 *   3. 计数口径：code/test/doc 三分（isDoc 沿用 docSyncHint、测试判定四信号）、反斜杠归一；
 *   4. 判级矩阵：span×files×risk×degraded 组合 + 阈值边界（≥2/≥4/≥4/≥8 的两侧）；
 *   5. checks 四项：perFileNotes 覆盖率、testDelta 三态、docClaim 四路、runtimeEvidence；
 *   6. opts 注入面：thresholds / riskTable / fileNotes / noDocs；
 *   7. 风险表段边界锚定（author/booking/lockfile 假阳不命中）+ 文档文件不参与风险命中；
 *   8. resolveChangeRisk 声明面判级回归（词表退役，2026-09-19-ceremony-pricing-five-cuts task-02）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  computeGateProfile,
  THRESHOLDS,
  resolveGateThresholds,
} from '../src/quick-gate-profile.js'
import { QUICK_RISK_PATH_PATTERNS, resolveChangeRisk } from '../src/change-risk-profile.js'

/** 四模块 fixture（parseModuleMapSimple 扁平形态：字面量 + 目录前缀两种 paths 写法） */
const IDX = {
  'core-engine': { paths: ['src/db.js', 'src/progress.js'] },
  runtime: { paths: ['src/run/'] },
  'cli-entry': { paths: ['src/index.js'] },
  stages: { paths: ['src/stages/'] },
}

const DEFAULTS = { l1_span: 2, l1_files: 4, l2_span: 4, l2_files_degraded: 8 }

/** 捕获 console.warn 调用（resolveGateThresholds 键非法回退的 warn 断言用），finally 必还原。 */
function withWarnSpy(fn) {
  const original = console.warn
  const calls = []
  console.warn = (...args) => calls.push(args.join(' '))
  try {
    return { result: fn(), calls }
  } finally {
    console.warn = original
  }
}

// ── 1. THRESHOLDS 单点常量 ──

test('THRESHOLDS 四阈值单点定义（L1_SPAN=2 / L1_FILES=4 / L2_SPAN=4 / L2_FILES_DEGRADED=8）', () => {
  assert.deepEqual(THRESHOLDS, { L1_SPAN: 2, L1_FILES: 4, L2_SPAN: 4, L2_FILES_DEGRADED: 8 })
})

// ── 2. resolveGateThresholds ──

test('resolveGateThresholds：未配置 quick-gate 段 → 输出与 THRESHOLDS 完全一致', () => {
  for (const config of [undefined, null, {}, { commands: { test: 'npm test' } }, { 'quick-gate': {} }]) {
    const { result, calls } = withWarnSpy(() => resolveGateThresholds(config))
    assert.deepEqual(result, DEFAULTS, `无覆写配置 ${JSON.stringify(config)} → 全默认`)
    assert.equal(calls.length, 0, '无键可校验，不 warn')
  }
  assert.equal(DEFAULTS.l1_span, THRESHOLDS.L1_SPAN)
  assert.equal(DEFAULTS.l1_files, THRESHOLDS.L1_FILES)
  assert.equal(DEFAULTS.l2_span, THRESHOLDS.L2_SPAN)
  assert.equal(DEFAULTS.l2_files_degraded, THRESHOLDS.L2_FILES_DEGRADED)
})

test('resolveGateThresholds：四键逐一生效 + 整段覆写', () => {
  for (const key of Object.keys(DEFAULTS)) {
    const merged = resolveGateThresholds({ 'quick-gate': { [key]: 99 } })
    assert.equal(merged[key], 99, `覆写键 ${key} 生效`)
    for (const other of Object.keys(DEFAULTS)) {
      if (other !== key) assert.equal(merged[other], DEFAULTS[other], `未覆写键 ${other} 保持默认`)
    }
  }
  assert.deepEqual(
    resolveGateThresholds({ 'quick-gate': { l1_span: 3, l1_files: 5, l2_span: 6, l2_files_degraded: 10 } }),
    { l1_span: 3, l1_files: 5, l2_span: 6, l2_files_degraded: 10 },
  )
})

test('resolveGateThresholds：键非法（字符串/0/负数/浮点/NaN）回退默认并 warn', () => {
  for (const bad of ['2', 0, -1, 2.5, NaN]) {
    const { result, calls } = withWarnSpy(() => resolveGateThresholds({ 'quick-gate': { l1_span: bad } }))
    assert.deepEqual(result, DEFAULTS, `非法值 ${String(bad)} → l1_span 回退默认`)
    assert.equal(calls.length, 1, `非法值 ${String(bad)} warn 一次`)
    assert.ok(calls[0].includes('quick-gate.l1_span'), `warn 指名键：${calls[0]}`)
    assert.ok(calls[0].includes('2'), `warn 提示默认值：${calls[0]}`)
  }
})

test('resolveGateThresholds：段非对象（字符串/数组）warn 并全默认；未知键忽略不 warn', () => {
  for (const bad of ['oops', [1, 2]]) {
    const { result, calls } = withWarnSpy(() => resolveGateThresholds({ 'quick-gate': bad }))
    assert.deepEqual(result, DEFAULTS, `段=${JSON.stringify(bad)} → 全默认`)
    assert.equal(calls.length, 1, 'warn 一次')
    assert.ok(calls[0].includes('键值对象'), 'warn 说明期望形态')
  }
  const { result, calls } = withWarnSpy(() => resolveGateThresholds({ 'quick-gate': { l9_span: 9 } }))
  assert.deepEqual(result, DEFAULTS, '未知键不进合并面')
  assert.equal(calls.length, 0, '未知键静默忽略（前向兼容），不 warn')
})

// ── 3. 计数口径 ──

test('计数口径：code/test/doc 三分（isDoc 沿用 docSyncHint、测试判定四信号）', () => {
  const p = computeGateProfile([
    'src/run/a.js',        // code
    'src/run/b.js',        // code
    'test/x.test.mjs',     // test：.test. 命名
    '__tests__/y.js',      // test：__tests__/ 目录段
    'tests/test_z.py',     // test：/tests/ 目录段 + test_ 前缀
    'pkg/test_helper.js',  // test：basename test_ 前缀（python 风格）
    'src/run/c_spec.js',   // test：_spec. 命名（对齐既有 TEST_BASENAME_RE 先例）
    'README.md',           // doc：.md
    'docs/guide.md',       // doc：docs/ 前缀（亦是 .md）
    '.sillyspec/docs/sillyspec/modules/core-engine.md',              // doc：.sillyspec/docs/ 前缀
    '.sillyspec/docs/sillyspec/modules/core-engine.changelog.md',    // doc：changelog sidecar（.md）
    'pkg/schema.yaml',     // doc：.yaml
    'cfg.yml',             // doc：.yml
  ], IDX)
  assert.equal(p.fileCount, 13)
  assert.equal(p.codeFileCount, 2)
  assert.equal(p.testFileCount, 5)
  // 模块归属只看非文档文件：a/b/c_spec 命中 runtime，其余 test 文件不落在任何 paths 前缀
  assert.equal(p.moduleSpan, 1)
  assert.deepEqual(p.modules, [{ id: 'runtime', files: ['src/run/a.js', 'src/run/b.js', 'src/run/c_spec.js'] }])
  assert.ok(p.unmappedFiles.includes('test/x.test.mjs'))
  assert.ok(!p.unmappedFiles.some((f) => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml')), '文档文件不进 unmapped')
})

test('计数口径：Windows 反斜杠路径归一后参与归属（fileNotes 同步归一）', () => {
  const p = computeGateProfile(['src\\run\\a.js'], IDX, { fileNotes: [{ path: 'src\\run\\a.js', note: 'x' }] })
  assert.equal(p.moduleSpan, 1)
  assert.equal(p.unmappedFiles.length, 0)
  assert.equal(p.checks.perFileNotes, true, 'fileNotes 反斜杠形态与 changedFiles 归一后对得上')
})

test('空输入：changedFiles 非数组/空 → fileCount 0、L0、不抛错', () => {
  for (const empty of [undefined, null, []]) {
    const p = computeGateProfile(empty, IDX)
    assert.equal(p.fileCount, 0)
    assert.equal(p.level, 'L0')
    assert.equal(p.checks.perFileNotes, true, '空集空真（L0 不消费）')
    assert.equal(p.checks.testDelta, 'na')
  }
})

// ── 4. 判级矩阵（span × files × risk × degraded，含阈值边界两侧） ──

test('正常态 L0：单模块单文件', () => {
  const p = computeGateProfile(['src/db.js'], IDX)
  assert.equal(p.level, 'L0')
  assert.equal(p.degraded, false)
  assert.equal(p.moduleSpan, 1)
  assert.deepEqual(p.riskHits, [])
})

test('正常态 L1 边界：span=2 恰达 L1_SPAN（files=2 未达 L1_FILES）', () => {
  const p = computeGateProfile(['src/db.js', 'src/run/shared.js'], IDX)
  assert.equal(p.moduleSpan, 2)
  assert.equal(p.fileCount, 2)
  assert.equal(p.level, 'L1')
})

test('正常态 files 边界：单模块 3 文件 L0 / 4 文件恰达 L1_FILES', () => {
  const three = computeGateProfile(['src/run/a.js', 'src/run/b.js', 'src/run/c.js'], IDX)
  assert.equal(three.moduleSpan, 1)
  assert.equal(three.fileCount, 3)
  assert.equal(three.level, 'L0', 'span=1<2 且 files=3<4')
  const four = computeGateProfile(['src/run/a.js', 'src/run/b.js', 'src/run/c.js', 'src/run/d.js'], IDX)
  assert.equal(four.fileCount, 4)
  assert.equal(four.level, 'L1', 'files=4 恰达 L1_FILES')
})

test('正常态 span 边界：span=3 → L1；span=4 恰达 L2_SPAN → L2', () => {
  const three = computeGateProfile(['src/db.js', 'src/run/shared.js', 'src/index.js'], IDX)
  assert.equal(three.moduleSpan, 3)
  assert.equal(three.level, 'L1', 'span=3 未达 L2_SPAN')
  const four = computeGateProfile(['src/db.js', 'src/run/shared.js', 'src/index.js', 'src/stages/plan.js'], IDX)
  assert.equal(four.moduleSpan, 4)
  assert.equal(four.level, 'L2')
})

test('正常态风险命中：单模块 2 文件 + auth 路径 → 直接 L2（risk 优先于 span/files）', () => {
  const p = computeGateProfile(['src/run/a.js', 'src/auth/login.js'], IDX)
  assert.equal(p.moduleSpan, 1)
  assert.equal(p.fileCount, 2)
  assert.equal(p.level, 'L2')
  assert.deepEqual(p.riskHits, [{ pattern: 'auth', file: 'src/auth/login.js' }])
  assert.equal(p.checks.runtimeEvidence, 'required')
})

test('降级态：moduleIndex null/undefined/{}/{modules:{}} → degraded、moduleSpan=null、span 退出判级', () => {
  const files4 = ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js']
  for (const empty of [null, undefined, {}, { modules: {} }]) {
    const p = computeGateProfile(files4, empty)
    assert.equal(p.degraded, true, `moduleIndex=${JSON.stringify(empty)} 降级`)
    assert.equal(p.moduleSpan, null)
    assert.deepEqual(p.modules, [])
    assert.deepEqual(p.unmappedFiles, [])
    assert.equal(p.level, 'L1', '降级档 files=4 恰达 L1_FILES')
  }
})

test('降级态边界：7 文件 L1 / 8 文件恰达 L2_FILES_DEGRADED', () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => `src/f${i}.js`)
  assert.equal(computeGateProfile(mk(7), null).level, 'L1')
  assert.equal(computeGateProfile(mk(8), null).level, 'L2')
})

test('降级态风险命中照常升 L2（风险判定不依赖 module-map）', () => {
  const p = computeGateProfile(['src/billing/invoice.js'], null)
  assert.equal(p.degraded, true)
  assert.equal(p.level, 'L2')
  assert.deepEqual(p.riskHits, [{ pattern: 'billing', file: 'src/billing/invoice.js' }])
})

// ── 5. checks 四项 ──

test('testDelta 三态：code≤1 → na；code≥2 且 test=0 → missing；有测试 → ok', () => {
  assert.equal(computeGateProfile(['src/db.js'], IDX).checks.testDelta, 'na')
  assert.equal(computeGateProfile(['src/db.js', 'src/progress.js'], IDX).checks.testDelta, 'missing')
  const ok = computeGateProfile(['src/db.js', 'src/progress.js', 'test/db.test.mjs'], IDX)
  assert.equal(ok.checks.testDelta, 'ok')
  // 文档文件不计入 codeFileCount：2 文档 + 1 code 仍 na
  const docOnly = computeGateProfile(['README.md', 'docs/x.md', 'src/db.js'], IDX)
  assert.equal(docOnly.codeFileCount, 1)
  assert.equal(docOnly.checks.testDelta, 'na')
})

test('perFileNotes：全集非空注记 true / 部分 false / 空括注不算 / 未提供 false', () => {
  const files = ['src/db.js', 'src/run/a.js']
  assert.equal(computeGateProfile(files, IDX, { fileNotes: [] }).checks.perFileNotes, false)
  assert.equal(
    computeGateProfile(files, IDX, { fileNotes: [{ path: 'src/db.js', note: 'x' }] }).checks.perFileNotes,
    false,
  )
  assert.equal(
    computeGateProfile(files, IDX, {
      fileNotes: [{ path: 'src/db.js', note: 'x' }, { path: 'src/run/a.js', note: 'y' }],
    }).checks.perFileNotes,
    true,
  )
  // `path::` 空括注不算注记（防形式化绕过：逐文件落了条目但零信息）
  assert.equal(
    computeGateProfile(files, IDX, {
      fileNotes: [{ path: 'src/db.js', note: 'x' }, { path: 'src/run/a.js', note: '' }],
    }).checks.perFileNotes,
    false,
  )
  // 注记含未变更文件不碍事（只看 changedFiles 全集覆盖）
  assert.equal(
    computeGateProfile(files, IDX, {
      fileNotes: [{ path: 'src/db.js', note: 'x' }, { path: 'src/run/a.js', note: 'y' }, { path: 'src/zz.js', note: 'z' }],
    }).checks.perFileNotes,
    true,
  )
})

test('docClaim：claimed / missing / exempt-no-docs / 无可认领空真 claimed', () => {
  const idx = { 'core-engine': { paths: ['src/db.js'], doc: 'modules/core-engine.md' } }
  const claimed = computeGateProfile(['src/db.js', '.sillyspec/docs/sillyspec/modules/core-engine.md'], idx)
  assert.equal(claimed.checks.docClaim, 'claimed', '触及模块的卡片文件在 changedFiles')
  const missing = computeGateProfile(['src/db.js'], idx)
  assert.equal(missing.checks.docClaim, 'missing', '改了模块内文件但卡片未动')
  const exempt = computeGateProfile(['src/db.js'], idx, { noDocs: true })
  assert.equal(exempt.checks.docClaim, 'exempt-no-docs', '--no-docs 显式豁免优先')
  // 模块无 doc 字段（无卡可认领）→ 空真 claimed；degraded（modules=[]）同理
  assert.equal(computeGateProfile(['src/db.js'], IDX).checks.docClaim, 'claimed', '无 doc 条目无可认领')
  assert.equal(computeGateProfile(['src/db.js'], null).checks.docClaim, 'claimed', 'degraded 无触及模块')
})

test('runtimeEvidence：风险命中 required / 无命中 na', () => {
  assert.equal(computeGateProfile(['src/db.js'], IDX).checks.runtimeEvidence, 'na')
  assert.equal(computeGateProfile(['src/run/cron.js'], IDX).checks.runtimeEvidence, 'required')
})

// ── 6. opts 注入面 ──

test('opts.thresholds 覆写判级（resolveGateThresholds 产物形态：snake 四键）', () => {
  const two = ['src/run/a.js', 'src/run/b.js']
  assert.equal(computeGateProfile(two, IDX).level, 'L0', '默认阈值下 2 文件单模块 L0')
  assert.equal(computeGateProfile(two, IDX, { thresholds: { l1_files: 2 } }).level, 'L1', 'l1_files 调到 2 → L1')
  assert.equal(computeGateProfile(two, IDX, { thresholds: { l1_span: 1 } }).level, 'L1', 'l1_span 调到 1 → L1')
  const twoModules = ['src/db.js', 'src/run/a.js'] // span=2、files=2：默认恰 L1
  assert.equal(computeGateProfile(twoModules, IDX).level, 'L1')
  assert.equal(computeGateProfile(twoModules, IDX, { thresholds: { l2_span: 2 } }).level, 'L2', 'l2_span 调到 2 → L2')
  assert.equal(computeGateProfile(two, null, { thresholds: { l2_files_degraded: 2 } }).level, 'L2', '降级档阈值覆写生效')
  assert.equal(resolveGateThresholds({ 'quick-gate': { l1_files: 2 } }).l1_files, 2, 'resolveGateThresholds 产物可直接作 opts.thresholds')
  const chained = computeGateProfile(two, IDX, { thresholds: resolveGateThresholds({ 'quick-gate': { l1_files: 2 } }) })
  assert.equal(chained.level, 'L1')
})

test('opts.riskTable 自定义表替换默认表', () => {
  const custom = [{ pattern: 'widget', re: /widget/ }]
  const hit = computeGateProfile(['src/run/widget.js'], IDX, { riskTable: custom })
  assert.deepEqual(hit.riskHits, [{ pattern: 'widget', file: 'src/run/widget.js' }])
  assert.equal(hit.level, 'L2')
  const notHit = computeGateProfile(['src/run/auth.js'], IDX, { riskTable: custom })
  assert.deepEqual(notHit.riskHits, [], '默认 auth 表被自定义表替换，不再命中')
  assert.equal(notHit.level, 'L0')
})

// ── 7. 风险表段边界锚定（R-03 假阳防线）──

test('六域路径模式正命中（目录段/文件名/连字符复合段）', () => {
  const cases = [
    ['src/auth/login.js', 'auth'],
    ['src/oauth2/token.js', 'auth'],
    ['src/user_auth.js', 'auth'],
    ['src/authenticator.ts', 'auth'],
    ['src/permissions.ts', 'permission'],
    ['src/role-permission.js', 'permission'],
    ['src/billing/invoice.ts', 'billing'],
    ['billing-service/main.py', 'billing'],
    ['db/migrations/001_init.sql', 'migration'],
    ['src/migrate.ts', 'migration'],
    ['src/locks.js', 'lock'],
    ['src/mutex.ts', 'lock'],
    ['src/db-lock.js', 'lock'],
    ['src/scheduler.js', 'scheduling'],
    ['src/cron-job.js', 'scheduling'],
    ['src/jobs/worker.js', 'scheduling'],
  ]
  for (const [file, domain] of cases) {
    const p = computeGateProfile([file], null)
    assert.deepEqual(p.riskHits, [{ pattern: domain, file }], `${file} → ${domain}`)
    assert.equal(p.level, 'L2')
  }
})

test('子串假阳不命中：author/booking/lockfile/jobtitle/调度无关词', () => {
  for (const file of ['src/author.js', 'src/booking.js', 'src/lockfile.js', 'src/jobtitle.ts', 'src/enjoy.js']) {
    const p = computeGateProfile([file], IDX)
    assert.deepEqual(p.riskHits, [], `${file} 不命中任何风险模式`)
    assert.equal(p.level, 'L0')
  }
})

test('文档文件不参与风险命中（常见 MIGRATION.md/changelog 不误报）', () => {
  for (const file of ['MIGRATION.md', 'docs/auth-guide.md', '.sillyspec/docs/sillyspec/modules/billing.md']) {
    const p = computeGateProfile([file], IDX)
    assert.deepEqual(p.riskHits, [], `${file} 是文档文件，不构成运行时风险面`)
    assert.equal(p.codeFileCount, 0)
    assert.equal(p.level, 'L0', '纯文档改动不因路径含风险词升 L2')
  }
})

test('QUICK_RISK_PATH_PATTERNS 表形状：六域齐全、条目只含 pattern+re', () => {
  assert.ok(Array.isArray(QUICK_RISK_PATH_PATTERNS))
  const domains = QUICK_RISK_PATH_PATTERNS.map((e) => e.pattern)
  for (const d of ['auth', 'permission', 'billing', 'migration', 'lock', 'scheduling']) {
    assert.ok(domains.includes(d), `踩坑域 ${d} 在表内`)
  }
  for (const e of QUICK_RISK_PATH_PATTERNS) {
    assert.equal(typeof e.pattern, 'string')
    assert.ok(e.re instanceof RegExp)
  }
  // riskHits 元素只含 pattern 与 file 字段（v1 无 diff 关键词维度）
  const p = computeGateProfile(['src/auth/x.js'], null)
  assert.deepEqual(Object.keys(p.riskHits[0]).sort(), ['file', 'pattern'])
})

// ── 8. resolveChangeRisk 声明面判级回归（2026-09-19-ceremony-pricing-five-cuts task-02：词表判级退役）──

test('resolveChangeRisk 声明面判级：词表词在正文出现不再触发判级（两表互不掺和）', () => {
  const decls = [{ prefixes: ['src/worktree.js'], tier: 'S3', evidence: true }]
  // 词表时代的误伤面（2026-09-19 api-matrix S3 撞词事故形态）在声明面口径下全部消失
  const proseHit = resolveChangeRisk({ files: ['src/datetime.js'], blastDeclarations: decls, explicitRiskLevel: null })
  // files 未命中声明面 → S1，正文措辞与文件名相似度均不参与（resolveChangeRisk 无正文输入面）
  assert.equal(proseHit.tier, 'S1')
  assert.equal(proseHit.evidenceRequired, false)
  // 命中声明面 → S3+evidence（判级输入面=路径，漏报=静默降 risk 主价）
  const hit = resolveChangeRisk({ files: ['src/worktree.js', 'src/datetime.js'], blastDeclarations: decls })
  assert.equal(hit.tier, 'S3')
  assert.equal(hit.evidenceRequired, true)
  // 两表互不掺和：auth 路径只进 quick 风险表（QUICK_RISK_PATH_PATTERNS），不触发 blast 判级
  const authOnly = resolveChangeRisk({ files: ['src/auth/login.js'], blastDeclarations: decls })
  assert.equal(authOnly.tier, 'S1')
  // QUICK_RISK_PATH_PATTERNS 表自身零变化（D-011：本变更不迁不动）——auth 命中仍可计算
  const authRe = QUICK_RISK_PATH_PATTERNS.find(e => e.pattern === 'auth')
  assert.ok(authRe && authRe.re.test('src/auth/login.js'))
})
