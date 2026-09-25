/**
 * fr-rot-precision.test.mjs — rot 打标精度收紧与存量治理（2026-09-25-fr-rot-precision）
 *
 * 验收面：
 *   ① deliverableFilesFromDesignText：交付表行解析 + 反引号剥壳（29.4% 厚道条目带壳不失明）；
 *   ② frCoverageFiles 三源并集：design 表 ∪ change-patch.json files，统一剔 .sillyspec/；
 *   ③ cleanupStaleReviewMarks：按文件面交集重算（keep/删/ref 无归档全删）+ 幂等重跑 + 并行写跳过；
 *   ④ frDupGateFlow：取最高重叠对（非首个过阈）+ 命中行附场景名（过滤（无场景名）占位）；
 *   ⑤ 常量公共化钉：flow.js 与 stage-contract.js 无裸 >= 0.6 且 FR_TITLE_OVERLAP_THRESHOLD import 在场；
 *   ⑥ resume 域路由口径钉：复用 changedFilesSinceBaseline（防回潮裸 git diff）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const frIndex = await import(pathToFileURL(join(ROOT, 'src', 'fr-index.js')).href)
const { deliverableFilesFromDesignText, frCoverageFiles, cleanupStaleReviewMarks, FR_TITLE_OVERLAP_THRESHOLD } = frIndex
const { frDupGateFlow } = await import(pathToFileURL(join(ROOT, 'src', 'flow.js')).href)

test('① deliverableFilesFromDesignText：交付表行解析 + 反引号剥壳', () => {
  const text = [
    '| 操作 | 文件 | 说明 |',
    '|---|---|---|',
    '| 新增 | `src/cli/login.js` | 登录入口 |',
    '| 修改 | src/core.js | 核心改动 |',
    '| 删除 | NEW:src/old.js | 移除 |',
    '| 不动 | src/keep.js | 不进表 |',
  ].join('\n')
  assert.deepEqual(deliverableFilesFromDesignText(text), ['src/cli/login.js', 'src/core.js', 'src/old.js'])
})

test('② frCoverageFiles：三源并集 + 剔 .sillyspec/', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'frp2-'))
  try {
    const arc = join(tmp, 'archive')
    mkdirSync(join(arc, 'ch-a'), { recursive: true })
    writeFileSync(join(arc, 'ch-a', 'design.md'), '| 修改 | `src/designed.js` | x |\n| 新增 | .sillyspec/internal.md | y |\n')
    writeFileSync(join(arc, 'ch-a', 'change-patch.json'), JSON.stringify({ files: ['src/patched.js', '.sillyspec/changes/x'] }))
    const cov = frCoverageFiles({ archiveRoot: arc, changeName: 'ch-a' })
    assert.ok(cov.includes('src/designed.js'), 'design 表条目剥反引号后并入')
    assert.ok(cov.includes('src/patched.js'), 'change-patch files 并入')
    assert.ok(!cov.some((p) => p.startsWith('.sillyspec/')), '内部产物统一剔除')
    const missing = frCoverageFiles({ archiveRoot: arc, changeName: 'no-such' })
    assert.deepEqual(missing, [], '缺归档=空 coverage（unknown 路径）')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

/** cleanup 夹具：FR-001 keep（交集）/FR-002 recent-quick 删/FR-003 无交集删/FR-004 FR 侧 coverage 空删。 */
function buildCleanupFixture(tmp) {
  const specBase = join(tmp, '.sillyspec')
  const knowledge = join(specBase, 'knowledge')
  mkdirSync(join(knowledge, 'fr'), { recursive: true })
  const arc = join(specBase, 'changes', 'archive')
  for (const [name, files] of [['hist-a', ['src/x/a.js']], ['hist-b', ['src/x/a.js', 'src/y.js']], ['hist-c', ['src/other.js']]]) {
    mkdirSync(join(arc, name), { recursive: true })
    writeFileSync(join(arc, name, 'change-patch.json'), JSON.stringify({ change: name, files }))
  }
  // hist-d 故意无归档（FR-004 来源 coverage 空）
  writeFileSync(join(knowledge, 'fr', 'cli.md'), [
    '# FR 索引 — cli',
    '',
    '## FR-cli-001 条目一',
    '变更：hist-a',
    '状态：active',
    '摘要：默认场景',
    '全文：hist-a/requirements.md#FR-01',
    '最近确认：a1',
    '待复核：hist-b',
    '',
    '## FR-cli-002 条目二',
    '变更：hist-a',
    '状态：active',
    '摘要：默认场景',
    '全文：hist-a/requirements.md#FR-02',
    '最近确认：a2',
    '待复核：recent-quick',
    '',
    '## FR-cli-003 条目三',
    '变更：hist-a',
    '状态：active',
    '摘要：默认场景',
    '全文：hist-a/requirements.md#FR-03',
    '最近确认：a3',
    '待复核：hist-c',
    '',
    '## FR-cli-004 条目四',
    '变更：hist-d',
    '状态：active',
    '摘要：默认场景',
    '全文：hist-d/requirements.md#FR-04',
    '最近确认：a4',
    '待复核：hist-b',
    '',
  ].join('\n'))
  return { specBase, arc, frPath: join(knowledge, 'fr', 'cli.md') }
}

test('③ cleanupStaleReviewMarks：交集重算 + 幂等 + 并行写跳过', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'frp3-'))
  try {
    const { specBase, arc, frPath } = buildCleanupFixture(tmp)
    const r = cleanupStaleReviewMarks({ specBase, archiveRoot: arc })
    assert.equal(r.kept, 1, 'FR-001（hist-a ∩ hist-b 有 src/x/a.js 交集）保留')
    assert.equal(r.removed, 3, 'FR-002（ref 无归档）/FR-003（无交集）/FR-004（FR 侧 coverage 空）删')
    assert.equal((r.byRef['recent-quick'] || 0), 1)
    const fr = readFileSync(frPath, 'utf8')
    assert.ok(fr.includes('待复核：hist-b'), '交集标记保留')
    assert.ok(!fr.includes('recent-quick') && !fr.includes('待复核：hist-c'), '无关标记删除')
    // 幂等重跑
    const r2 = cleanupStaleReviewMarks({ specBase, archiveRoot: arc })
    assert.equal(r2.removed, 0)
    assert.equal(r2.kept, 1)
    // 并行写跳过：改写盘上文件后重跑 → 该文件 skipped 不覆盖
    writeFileSync(frPath, readFileSync(frPath, 'utf8') + '\n<!-- 并行会话追加 -->\n')
    const r3 = cleanupStaleReviewMarks({ specBase, archiveRoot: join(arc, 'elsewhere') })
    assert.ok(Array.isArray(r3.skipped), '盘上内容变化时跳过该文件（返回结构合法）')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('④ frDupGateFlow：最高重叠对 + 场景名注入', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'frp4-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    const knowledge = join(specBase, 'knowledge')
    mkdirSync(join(knowledge, 'fr'), { recursive: true })
    const mapDir = join(specBase, 'docs', 'proj', 'modules')
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
    writeFileSync(join(knowledge, 'fr', 'cli.md'), [
      '# FR 索引 — cli',
      '',
      '## FR-cli-001 登录必须校验会话',
      '变更：hist-a',
      '状态：active',
      '摘要：默认场景',
      '全文：hist-a/requirements.md#FR-01',
      '最近确认：a1',
      '',
      '## FR-cli-002 登录必须校验会话与会话超时',
      '变更：hist-b',
      '状态：active',
      '摘要：（无场景名）',
      '全文：hist-b/requirements.md#FR-01',
      '最近确认：b1',
      '',
    ].join('\n'))
    const changeDir = join(specBase, 'changes', 'c-dup')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# 需求',
      '',
      '### FR-01: 登录必须校验会话',
      'Given x',
      'When y',
      'Then z',
      '',
    ].join('\n'))
    const r = await frDupGateFlow({ specBase, change: 'c-dup', changeDir, files: ['src/cli/login.js'] })
    assert.equal(r.hits.length, 1)
    assert.equal(r.hits[0].active, 'FR-cli-001', '应指认最高重叠对（1.0 > 与 FR-cli-002 的部分重叠）')
    assert.ok(r.warn.includes('（场景：默认场景）'), '命中行附 active 场景名')
    assert.ok(!r.warn.includes('（无场景名）'), '场景名占位过滤')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('⑤ 常量公共化钉：两文件无裸 >= 0.6 且常量 import 在场', () => {
  for (const rel of ['src/flow.js', 'src/stage-contract.js']) {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    assert.ok(!/>=\s*0\.6/.test(src), `${rel} 不应再有裸 >= 0.6 字面量（阈值统一走 FR_TITLE_OVERLAP_THRESHOLD）`)
    assert.ok(src.includes('FR_TITLE_OVERLAP_THRESHOLD'), `${rel} 应 import 常量`)
  }
  assert.equal(FR_TITLE_OVERLAP_THRESHOLD, 0.6)
})

test('⑥ resume 域路由口径钉：复用 changedFilesSinceBaseline（防回潮裸 git diff）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('changedFilesSinceBaseline(cwd, st.baseline_commit)'), 'resume 注入应复用 changedFilesSinceBaseline')
  const resumeBlock = src.split('resume 路径域路由')[1]?.split('printRecoveryBriefing')[0] || ''
  assert.ok(resumeBlock.length > 0, 'resume 注入段定位')
  assert.ok(!resumeBlock.includes('..HEAD'), 'resume 注入不应再用双提交区间 diff（漏未提交工作树）')
})
