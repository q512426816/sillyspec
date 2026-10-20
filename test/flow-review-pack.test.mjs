/**
 * flow-review-pack.test.mjs — 轻量评审任务书预消化材料包（2026-10-19-thin-review-material-pack）
 *
 * 覆盖验收面（FR-01~FR-04）：
 *   ① 解析基座：FR 标题/测试绑定行解析、冻结 patch 文件级摘要（±行数/hunk 数/rename/二进制容错）；
 *   ② 组装三态：两源齐备/部分可得/全缺 null + 体积帽截断注记 + 确定性（同输入同输出）；
 *   ③ 注入/零注入：packLines 注入形态与位置、缺省/空数组时渲染与现状逐字一致。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseFrBindingRows, parseFrozenPatchSummary, assembleReviewPack, PACK_MAX_CHARS,
} from '../src/flow-review-pack.js'
import { renderReviewerTaskbook } from '../src/flow-review.js'

function makePackDir(requirementsText) {
  const root = mkdtempSync(join(tmpdir(), 'frpack-'))
  const changeDir = join(root, 'changes', 'c-x')
  mkdirSync(changeDir, { recursive: true })
  if (requirementsText !== null) writeFileSync(join(changeDir, 'requirements.md'), requirementsText)
  return { root, changeDir }
}

const REQ_TEXT = [
  '# 需求规格（Requirements）— c-x',
  '',
  '## 功能需求',
  '',
  '### FR-01: 任务书注入',
  '',
  '- 行为句必须注入。',
  '',
  '#### 场景：主路径',
  '',
  '### FR-02: 体积帽',
  '',
  '- 行为句必须截断。',
  '',
  '## 测试绑定（每条 FR 至少一行）',
  '',
  'FR-01: test/flow-review-pack.test.mjs「注入形态」',
  'FR-02: test/flow-review-pack.test.mjs「帽截断」',
  '',
].join('\n')

const PATCH_TEXT = [
  'diff --git a/src/one.js b/src/one.js',
  'index 111..222 100644',
  '--- a/src/one.js',
  '+++ b/src/one.js',
  '@@ -1,4 +1,5 @@',
  ' ctx',
  '-old1',
  '-old2',
  '+new1',
  '+new2',
  '+new3',
  ' ctx',
  '@@ -10,3 +11,3 @@',
  ' ctx',
  '-old3',
  '+new4',
  ' ctx',
  'diff --git a/renamed/old.md b/renamed/new.md',
  'similarity index 90%',
  'rename from renamed/old.md',
  'rename to renamed/new.md',
  '--- a/renamed/old.md',
  '+++ b/renamed/new.md',
  '@@ -2,2 +2,2 @@',
  ' ctx',
  '-x',
  '+y',
  'diff --git a/bin/logo.png b/bin/logo.png',
  'index 333..444 100644',
  'Binary files a/bin/logo.png and b/bin/logo.png differ',
  '',
].join('\n')

test('① 解析基座：FR 标题/绑定行解析（requirements.md 机械解析）', () => {
  const rows = parseFrBindingRows(REQ_TEXT)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].fr, 'FR-01')
  assert.equal(rows[0].title, '任务书注入')
  assert.equal(rows[0].binding, 'test/flow-review-pack.test.mjs「注入形态」')
  assert.equal(rows[1].fr, 'FR-02')
  assert.equal(rows[1].title, '体积帽')
  assert.equal(rows[1].binding, 'test/flow-review-pack.test.mjs「帽截断」')
  // 空文本 → 空数组
  assert.deepEqual(parseFrBindingRows(''), [])
  assert.deepEqual(parseFrBindingRows(null), [])
  // 无绑定节 → FR 行在场、绑定空串
  const noBind = parseFrBindingRows('# r\n\n### FR-01: t\n')
  assert.equal(noBind.length, 1)
  assert.equal(noBind[0].binding, '')
})

test('① 解析基座：冻结 patch 文件级摘要（±行数/hunk 数/rename/二进制容错）', () => {
  const files = parseFrozenPatchSummary(PATCH_TEXT)
  assert.equal(files.length, 3)
  assert.deepEqual(files[0], { path: 'src/one.js', plus: 4, minus: 3, hunks: 2 })
  assert.equal(files[1].path, 'renamed/new.md')
  assert.deepEqual([files[1].plus, files[1].minus, files[1].hunks], [1, 1, 1])
  assert.deepEqual(files[2], { path: 'bin/logo.png', plus: 0, minus: 0, hunks: 0 })
  // 空文本 → 空数组
  assert.deepEqual(parseFrozenPatchSummary(''), [])
  assert.deepEqual(parseFrozenPatchSummary(null), [])
  // 垃圾前缀容错：无 diff --git 头的杂行不产文件、不抛错
  assert.deepEqual(parseFrozenPatchSummary('random text\n+plus line\n'), [])
})

test('② 组装三态：两源齐备/部分可得/全缺 null', () => {
  const { root, changeDir } = makePackDir(REQ_TEXT)
  try {
    const full = assembleReviewPack({ changeDir, patchText: PATCH_TEXT })
    assert.ok(full && Array.isArray(full.lines) && full.lines.length > 0)
    assert.ok(full.lines[0].includes('【预消化材料包'))
    assert.ok(full.lines.some((l) => l.includes('FR-01: 任务书注入') && l.includes('「注入形态」')))
    assert.ok(full.lines.some((l) => l.includes('src/one.js（+4/-3，2 hunk）')))
    assert.ok(full.lines[full.lines.length - 1].includes('基准面'))
    assert.ok(full.lines[full.lines.length - 1].includes('cannot_verify'))

    // 部分可得：仅 requirements（patchText null——跨仓 JSON 冻结面形态，不读活 git 兜底）
    const frOnly = assembleReviewPack({ changeDir, patchText: null })
    assert.ok(frOnly.lines.some((l) => l.includes('FR-01:')))
    assert.ok(!frOnly.lines.some((l) => l.includes('文件级摘要')))

    // 部分可得：仅 patch（requirements 缺件）
    const r2 = makePackDir(null)
    try {
      const patchOnly = assembleReviewPack({ changeDir: r2.changeDir, patchText: PATCH_TEXT })
      assert.ok(patchOnly.lines.some((l) => l.includes('文件级摘要')))
      assert.ok(!patchOnly.lines.some((l) => l.includes('FR-01:')))
    } finally { rmSync(r2.root, { recursive: true, force: true }) }

    // 全缺 → null（零注入由调用方处理）
    const r3 = makePackDir(null)
    try {
      assert.equal(assembleReviewPack({ changeDir: r3.changeDir, patchText: null }), null)
      assert.equal(assembleReviewPack({ changeDir: r3.changeDir, patchText: '' }), null)
    } finally { rmSync(r3.root, { recursive: true, force: true }) }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('② 体积帽：超限行级截断并注记，总长不超帽，确定性同输入同输出', () => {
  const many = []
  for (let i = 0; i < 400; i++) {
    many.push(`diff --git a/src/deep/dir${i}/file-with-long-name-${i}.js b/src/deep/dir${i}/file-with-long-name-${i}.js`)
    many.push('@@ -1,2 +1,2 @@')
    many.push('-a')
    many.push('+b')
  }
  const bigPatch = many.join('\n')
  const { root, changeDir } = makePackDir(REQ_TEXT)
  try {
    const p = assembleReviewPack({ changeDir, patchText: bigPatch })
    assert.ok(p.lines.join('\n').length <= PACK_MAX_CHARS)
    assert.equal(p.truncated, true)
    assert.ok(p.lines.some((l) => l.includes('截断')))
    // 基准面语义行恒为末行（截断不吞语义行）
    assert.ok(p.lines[p.lines.length - 1].includes('cannot_verify'))
    // 确定性：同输入同输出（FR-02 纯机械主张的测试锚）
    const q = assembleReviewPack({ changeDir, patchText: bigPatch })
    assert.deepEqual(p, q)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('③ 注入/零注入：packLines 注入形态与位置、缺省/空数组与现状逐字一致', () => {
  // 零注入三形态逐字一致（缺省/显式 null/空数组）——零回归锚
  const args = { change: 'c-x', changeDir: '/x/c-x' }
  const plain = renderReviewerTaskbook(args)
  assert.equal(plain, renderReviewerTaskbook({ ...args, packLines: null }))
  assert.equal(plain, renderReviewerTaskbook({ ...args, packLines: [] }))
  assert.ok(!plain.includes('预消化材料包'))

  const { root, changeDir } = makePackDir(REQ_TEXT)
  try {
    const pack = assembleReviewPack({ changeDir, patchText: PATCH_TEXT })
    const base = renderReviewerTaskbook({ change: 'c-x', changeDir })
    const withPack = renderReviewerTaskbook({ change: 'c-x', changeDir, packLines: pack.lines })
    // 位置：材料段之后、检查单之前（锚材料段头而非 patch 行——冻结形态三分支文案
    // 由 2026-10-19-thin-empty-face-cross-repo-freeze 按在场件切换，钉死单分支会误伤）
    const idxMaterial = withPack.indexOf('【材料（按需 Read')
    const idxPack = withPack.indexOf('【预消化材料包')
    const idxCheck = withPack.indexOf('【检查单')
    assert.ok(idxMaterial > -1 && idxPack > idxMaterial && idxCheck > idxPack)
    // FR 表与摘要行逐字在场 + 基准面语义行随段在场
    assert.ok(withPack.includes('FR-01: 任务书注入'))
    assert.ok(withPack.includes('src/one.js（+4/-3，2 hunk）'))
    assert.ok(withPack.includes('cannot_verify'))
    // 手术式插入证明：摘除注入块后与零注入产物逐字一致（NL 常量防 shell 转义吃反斜杠）
    const NL = String.fromCharCode(10)
    assert.equal(withPack.replace(NL + NL + pack.lines.join(NL), ''), base)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④ 派发纪律：任务书头部行在场 + flow.js 横幅句原样复制（FR-01）', () => {
  const book = renderReviewerTaskbook({ change: 'c-x', changeDir: '/x/c-x' })
  assert.match(book, /派发纪律：本任务书原样复制给干净上下文子代理——检查单\/材料包生产权在 CLI，勿自行改写、增删或缩编/)
  const lines = book.split(String.fromCharCode(10))
  const idxSep = lines.findIndex((l) => l.startsWith('══════'))
  const idxRule = lines.findIndex((l) => l.includes('派发纪律'))
  const idxRole = lines.findIndex((l) => l.startsWith('【角色】'))
  assert.ok(idxSep > -1 && idxRule === idxSep + 1 && idxRole > idxRule, '纪律行位于分隔线后、角色前')
  // 横幅句（静态源断言——flow done 打印通道）
  const flowSrc = readFileSync(new URL('../src/flow.js', import.meta.url), 'utf8')
  assert.ok(flowSrc.includes('任务书原样复制给子代理'), '横幅含原样复制指令')
  assert.ok(!flowSrc.includes('起一个干净上下文的子代理执行后重跑本命令'), '旧横幅句已替换')
})

test('⑤ 归属切分：三分类注入形态 + 声明外抽查标注 + 他侧归因 owner（FR-02）', () => {
  const { root, changeDir } = makePackDir(REQ_TEXT)
  try {
    const attribution = {
      declaredIn: ['src/a.js', 'test/a.test.mjs'],
      declaredOut: ['backend/app/core/config.py', 'backend/app/modules/translate/README.md'],
      foreign: [{ file: 'src/foreign.js', owners: ['2026-10-19-other-change'] }],
    }
    const pack = assembleReviewPack({ changeDir, patchText: PATCH_TEXT, attribution })
    const text = pack.lines.join(String.fromCharCode(10))
    assert.ok(text.includes('冻结面归属切分'), '归属切分子段在场')
    assert.ok(text.includes('声明内（design 变更清单 ∩ 冻结面，2 文件）：src/a.js、test/a.test.mjs'), '声明内行')
    assert.ok(text.includes('声明外（冻结面−声明清单，2 文件——共享仓并行混入/生成物候选，抽查即可勿逐文件 git 考古）：backend/app/core/config.py、backend/app/modules/translate/README.md'), '声明外行含抽查标注')
    assert.ok(text.includes('他侧归因（提交/声明归属其他变更，1 文件）：src/foreign.js←2026-10-19-other-change'), '他侧归因带 owner')
    // 声明面完整：零计数不静默隐藏子段
    const empty = assembleReviewPack({ changeDir, patchText: PATCH_TEXT, attribution: { declaredIn: [], declaredOut: [], foreign: [] } })
    const et = empty.lines.join(String.fromCharCode(10))
    assert.ok(et.includes('声明内（design 变更清单 ∩ 冻结面，0 文件）：（无）'), '零计数照常渲染')
    assert.ok(et.includes('声明外（冻结面−声明清单，0 文件'), '声明外零计数照常渲染')
    assert.ok(et.includes('他侧归因（提交/声明归属其他变更，0 文件）：（无）'), '他侧归因零计数照常渲染')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
