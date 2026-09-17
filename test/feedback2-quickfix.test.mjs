/**
 * feedback2-quickfix 直测（2026-09-17 用户驾驭小结⑥负面三修，ql-20260917-005）：
 *   ① NEW: 前缀规则前移——brainstorm Step6 prompt 与 design-init 骨架在写作期即提示
 *      （坑 design-file-ref-late-feedback 二阶：末步才拦浪费一轮返工）。
 *   ② 同步干扰收口——syncDocuments 无变化推送去重（指纹 marker 跳过重复 POST）+
 *      register-stage-review --refresh-hash docHash 已一致时幂等跳过（不重写不 bump mtime，
 *      防 agent Read→Edit 窗口被 CLI 就地重写打断）。
 *   ③ progress show 多变更折叠——无信号变更单行压缩 + 超 8 个折叠计数行（--all 展开），
 *      有信号变更（冲突/滞留/目录缺失）保持详情渲染。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDesignSkeleton } from '../src/design-facts.js'
import { SyncManager } from '../src/sync.js'
import { registerStageReview } from '../src/stage-review.js'
import { ProgressManager } from '../src/progress.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tmpDirs = []
const tmp = (prefix) => { const d = mkdtempSync(join(tmpdir(), `fb2-${prefix}-`)); tmpDirs.push(d); return d }
process.on('exit', () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

// ── ① NEW: 前缀规则前移 ──

test('①a generateDesignSkeleton 清单段含 NEW: 前缀铁律提示（写作期即见）', () => {
  const md = generateDesignSkeleton({ changeName: '2026-09-17-x', decisionsText: '', author: 't', now: new Date() })
  assert.ok(md.includes('| 新增 | NEW:src/xxx/NewFile.java |'), '示例行的「新增」操作应带 NEW: 路径前缀')
  assert.ok(md.includes('路径存在性核验铁律'), '清单段应含铁律注释行')
  assert.ok(md.includes('design_file_ref_invalid'), '铁律注释应点名门禁错误码（锚定末步核验行为）')
})

test('①b brainstorm Step6 prompt 含 NEW: 前缀规则（prompt 源文本）', () => {
  const src = readFileSync(join(root, 'src', 'stages', 'brainstorm.js'), 'utf8')
  assert.ok(src.includes('路径存在性核验（NEW: 前缀铁律'), 'Step6 文件变更清单要求段应含 NEW: 前缀铁律')
  assert.ok(src.includes('NEW:src/xxx/NewFile.java'), '清单示例行「新增」应带 NEW: 前缀')
})

// ── ②a syncDocuments 无变化推送去重 ──

test('②a syncDocuments 内容未变跳过重复 POST，变化后重推，manual 旁路', async (t) => {
  const d = tmp('syncdoc')
  const cn = '2026-09-17-x'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), '# p v1\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# t v1\n')

  const savedEnv = { u: process.env.SILLYHUB_PLATFORM_URL, k: process.env.SILLYHUB_PLATFORM_TOKEN }
  const savedFetch = globalThis.fetch
  t.after(() => {
    process.env.SILLYHUB_PLATFORM_URL = savedEnv.u
    process.env.SILLYHUB_PLATFORM_TOKEN = savedEnv.k
    globalThis.fetch = savedFetch
  })
  process.env.SILLYHUB_PLATFORM_URL = 'http://hub.test'
  process.env.SILLYHUB_PLATFORM_TOKEN = 'tok'

  let posts = 0
  globalThis.fetch = async () => {
    posts++
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({}) }
  }

  const sm = new SyncManager(d)
  const r1 = await sm.syncDocuments(cn)
  assert.equal(r1.synced, 2, '首次推送 synced=2')
  assert.equal(posts, 1, '首次推送 POST 一次')
  assert.ok(existsSync(join(d, '.sillyspec', '.runtime', `sync-docs-lastpush-${cn}.json`)), '成功后落指纹 marker')

  const r2 = await sm.syncDocuments(cn)
  assert.equal(r2.synced, 0, '内容未变 → 跳过（synced=0）')
  assert.equal(r2.deduped, true, '去重命中标记 deduped=true')
  assert.equal(posts, 1, '未变化不重复 POST')

  writeFileSync(join(changeDir, 'proposal.md'), '# p v2\n')
  const r3 = await sm.syncDocuments(cn)
  assert.equal(r3.synced, 2, '内容变化 → 重新推送')
  assert.equal(posts, 2, '变化后 POST 第二次')

  const r4 = await sm.syncDocuments(cn, { manual: true })
  assert.equal(r4.synced, 2, 'manual=true 显式意图旁路去重')
  assert.equal(posts, 3, 'manual 路径照常 POST')
})

// ── ②b register-stage-review --refresh-hash 幂等跳过 ──

test('②b refresh-hash：docHash 已一致 → noop-unchanged 不重写文件', async () => {
  const d = tmp('rsrnoop')
  const cn = '2026-09-17-x'
  const specBase = join(d, '.sillyspec')
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# Design v1\n\n## 背景\n原版\n')

  // 首跑生成骨架——register-stage-review 骨架的 docHash 本就自动按主文档算好（非占位），
  // 因此紧接着的 refresh 应直接命中幂等跳过（这正是 2026-09-17 反馈②的修复面：
  // 旧实现此处会整文件重写 + 追加审计行，bump mtime 打断 agent 的 Read→Edit 窗口）
  const reg = await registerStageReview({ cwd: d, specBase, changeName: cn, stage: 'brainstorm' })
  assert.equal(reg.mode, 'skeleton', '首跑生成骨架')

  const before = readFileSync(reg.reviewPath, 'utf8')
  const beforeMtime = statSync(reg.reviewPath).mtimeMs
  const ref1 = await registerStageReview({ cwd: d, specBase, changeName: cn, stage: 'brainstorm', refreshHash: true })
  assert.equal(ref1.mode, 'noop-unchanged', 'hash 已一致（骨架自动算好）→ noop-unchanged')
  assert.equal(readFileSync(ref1.reviewPath, 'utf8'), before, '文件内容逐字节不变')
  assert.equal(statSync(ref1.reviewPath).mtimeMs, beforeMtime, 'mtime 不 bump（agent Read→Edit 窗口不被打断）')

  // 主文档改版 → 不再 noop，真刷新
  writeFileSync(join(changeDir, 'design.md'), '# Design v2\n\n## 背景\n改版\n')
  const ref2 = await registerStageReview({ cwd: d, specBase, changeName: cn, stage: 'brainstorm', refreshHash: true })
  assert.equal(ref2.mode, 'refreshed', '主文档改版 → 真刷新')
  assert.notEqual(readFileSync(ref2.reviewPath, 'utf8'), before, '刷新写盘生效')

  // 再改回 v1 内容（hash 回到与上次刷新不同即真刷新）后重复 refresh 两次：第二次 noop
  writeFileSync(join(changeDir, 'design.md'), '# Design v3\n\n## 背景\n再改\n')
  const ref3 = await registerStageReview({ cwd: d, specBase, changeName: cn, stage: 'brainstorm', refreshHash: true })
  assert.equal(ref3.mode, 'refreshed', 'v3 → 真刷新')
  const after3 = readFileSync(ref3.reviewPath, 'utf8')
  const mtime3 = statSync(ref3.reviewPath).mtimeMs
  const ref4 = await registerStageReview({ cwd: d, specBase, changeName: cn, stage: 'brainstorm', refreshHash: true })
  assert.equal(ref4.mode, 'noop-unchanged', '紧跟的重复 refresh → 幂等跳过')
  assert.equal(statSync(ref4.reviewPath).mtimeMs, mtime3, '重复 refresh 不 bump mtime')
  assert.equal(readFileSync(ref4.reviewPath, 'utf8'), after3, '重复 refresh 不改内容')
})

// ── ③ progress show 多变更折叠 ──

async function makeProgressRepo(prefix, names) {
  const d = tmp(prefix)
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  for (const n of names) await pm.initChange(d, n)
  return { d, pm }
}

test('③ progress show：无信号变更单行 + 超帽折叠 + --all 展开 + 信号变更保持详情', async () => {
  const names = Array.from({ length: 11 }, (_, i) => `2026-09-17-clean-${String(i).padStart(2, '0')}`)
  const { d, pm } = await makeProgressRepo('pshow', [...names, '2026-09-17-stalled-old'])
  // 滞留信号：brainstorm 停留 10 天
  const db = pm._ensureDB(d).getDb()
  db.prepare('UPDATE changes SET last_active = ? WHERE name = ?').run(new Date(Date.now() - 10 * 86400_000).toISOString(), '2026-09-17-stalled-old')

  const capture = (fn) => {
    const chunks = []
    const orig = { log: console.log, warn: console.warn }
    console.log = (...a) => chunks.push(a.join(' ')), console.warn = () => {}
    try { return fn(() => chunks.join('\n')) } finally { console.log = orig.log, console.warn = orig.warn }
  }

  let out = ''
  capture((get) => { pm.show(d, null); out = get() })
  assert.ok(out.includes('⏳'), '滞留变更保持详情渲染（信号不被折叠吞掉）')
  assert.ok(out.includes('change-delete --change 2026-09-17-stalled-old'), '滞留建议行在场')
  assert.ok(out.includes('已折叠'), '无信号超帽折叠计数行在场')
  const oneLiners = out.split('\n').filter(l => /^  📂 2026-09-17-clean-/.test(l))
  assert.equal(oneLiners.length, 8, `无信号变更默认只列前 8 个单行（实际 ${oneLiners.length}）`)
  assert.ok(oneLiners.every(l => l.includes('· 最近活跃')), '无信号变更为单行压缩形态（名+阶段+活跃）')
  assert.ok(!out.includes('2026-09-17-clean-00\n     当前阶段'), '无信号变更不再展开多行详情块（详情块只属于信号变更）')
  assert.match(out, /另有 3 个无信号活跃变更已折叠/, '折叠计数 = 11 - 8 = 3')

  out = ''
  capture((get) => { pm.show(d, null, { all: true }); out = get() })
  const allLines = out.split('\n').filter(l => /^  📂 2026-09-17-clean-/.test(l))
  assert.equal(allLines.length, 11, '--all 展开全量单行（实际 ' + allLines.length + '）')
  assert.ok(!out.includes('已折叠'), '--all 时无折叠计数行')

  out = ''
  capture((get) => { pm.show(d, '2026-09-17-stalled-old'); out = get() })
  assert.ok(out.includes('2026-09-17-stalled-old'), '--change 单变更详情恒可用')
})
