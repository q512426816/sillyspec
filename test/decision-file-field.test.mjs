/**
 * decision-distill 文件字段契约（change: 2026-09-11-cross-change-decision-guard，FR-01，D-001@v1）：
 * decisions.md 条目支持「文件：」/「files:」标签 → entry.files（parseListValue 刌分 + 逐项
 * 反斜杠归一 POSIX 分隔符）；归档渲染在「锚点：」行后增条件「文件：」行——仅非空渲染，
 * 存量条目零迁移、幂等重归档不添空行。
 *
 * 锁定验收（task-01 五条）：
 *   1. 含「文件：src/a.js, src/b.js」的条目渲染输出含精确行「文件：src/a.js, src/b.js」（锚点行后）
 *   2. 不含文件字段的既有条目渲染输出与改动前字节级一致（存量零迁移）
 *   3. 「files: src\foo.js」反斜杠形态解析为 src/foo.js
 *   4. 「a.js，b.js、c.js」全角分隔符切分为 3 项
 *   5. 同一条目二次归档（幂等路径）不新增空「文件：」行
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'
import { matchDecisionsByFiles } from '../src/knowledge-match.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 固定变更名建 change 目录（basename 即变更名 → 「变更：」行内容确定，字节级断言可用） */
function mkChange(name, decisionsMd) {
  const root = mk('dff-')
  const changeDir = join(root, name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), decisionsMd)
  return changeDir
}

test('验收1：有文件字段条目渲染精确「文件：src/a.js, src/b.js」行，位于锚点行后；重跑仍恰一行', () => {
  const md = [
    '# 决策追踪',
    '',
    '## D-001@v1 引入文件锚定',
    '- type: architecture',
    '- status: accepted',
    '- answer: 以文件字段锚定代码位置',
    '- 文件：src/a.js, src/b.js',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('feat-file-field', md)

  const r = parseDecisions(changeDir)
  const e = r.entries.find(x => x.number === 'D-001')
  assert.ok(e, '条目可解析')
  assert.deepEqual(e.files, ['src/a.js', 'src/b.js'], '解析侧 entry.files 为字符串数组')

  const k = mk('dff-k1-')
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  const lines = content.split('\n')
  const anchorIdx = lines.indexOf('锚点：未记录')
  const filesIdx = lines.indexOf('文件：src/a.js, src/b.js')
  assert.ok(anchorIdx > -1, '锚点行存在')
  assert.ok(filesIdx > -1, `渲染含精确行「文件：src/a.js, src/b.js」（实际 ${JSON.stringify(content)}）`)
  assert.equal(filesIdx, anchorIdx + 1, '文件行紧跟锚点行后')

  // 幂等重跑：同号同变更 update 原地重写，仍恰一行文件行
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content2 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.equal((content2.match(/文件：src\/a\.js, src\/b\.js/g) || []).length, 1, '重跑仍恰一行文件行')
})

test('验收2：无文件字段条目渲染输出与改动前字节级一致（存量零迁移）', () => {
  const md = [
    '## D-002@v1 存量条目',
    '- type: architecture',
    '- status: accepted',
    '- answer: 无文件字段',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('legacy-no-files', md)
  const k = mk('dff-k2-')
  distillIntoKnowledge(changeDir, k, 'cafe1234')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  const expected = [
    '# 决策知识 — unmapped',
    '',
    '> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。',
    '',
    '## D-002@v1 存量条目',
    '状态：implemented',
    '变更：legacy-no-files',
    '锚点：未记录',
    '最近确认：cafe1234',
    '理由：无文件字段',
    '',
  ].join('\n')
  assert.equal(content, expected, '无文件字段条目渲染字节级一致（不出现空「文件：」行）')
})

test('验收3+4：files 反斜杠归一 POSIX；全角分隔符切分', () => {
  const md = [
    '## D-003@v1 反斜杠归一',
    '- type: definition',
    '- status: confirmed',
    '- files: src\\foo.js',
    '',
    '## D-004@v1 全角切分',
    '- type: process',
    '- status: accepted',
    '- 文件：a.js，b.js、c.js',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('sep-normalize', md)

  const r = parseDecisions(changeDir)
  const d3 = r.entries.find(x => x.number === 'D-003')
  const d4 = r.entries.find(x => x.number === 'D-004')
  assert.deepEqual(d3.files, ['src/foo.js'], 'files: src\\foo.js → src/foo.js（反斜杠归一）')
  assert.deepEqual(d4.files, ['a.js', 'b.js', 'c.js'], 'a.js，b.js、c.js → 3 项（全角分隔符切分）')

  const k = mk('dff-k3-')
  distillIntoKnowledge(changeDir, k, 'beef5678')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.ok(content.includes('\n文件：src/foo.js\n'), '反斜杠条目渲染归一后的精确行')
})

test('验收5：同条目二次归档不新增空「文件：」行，内容字节稳定', () => {
  const md = [
    '## D-005@v1 幂等重归档',
    '- type: architecture',
    '- status: accepted',
    '- answer: 二次归档稳定',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('idem-files', md)
  const k = mk('dff-k5-')
  distillIntoKnowledge(changeDir, k, 'abc0001')
  const c1 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.ok(!/^文件：/m.test(c1), '一次归档无「文件：」行')
  distillIntoKnowledge(changeDir, k, 'abc0001')
  const c2 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.equal(c2, c1, '二次归档字节级一致')
  assert.ok(!/^文件：/m.test(c2), '二次归档仍不新增空「文件：」行')
})

// ── task-02（FR-02，change: 2026-09-11-cross-change-decision-guard）───────────
// matchDecisionsByFiles 文件键反查 = quick 语义护栏（task-03/05/06）的文件键引擎：
// 条目命中源 = 「文件：」字段精确值 ∪「锚点：」路径形态 token 提取（D-905 实形态
// 「锚点：src/quicklog.js:493」→ src/quicklog.js）；锚点行经单独标签读入，绝不进
// DECISION_FIELD_RE 的 reason 回填链（Grill X-002：else-if 链会把锚点值误吞进 reason）。

/** 建临时知识库：INDEX.md（## Decisions 段路由行）+ decisions/change-management.md */
function mkDecisionLib(domainMd) {
  const k = mk('dff-task02-')
  mkdirSync(join(k, 'decisions'), { recursive: true })
  writeFileSync(join(k, 'decisions', 'change-management.md'), domainMd)
  writeFileSync(join(k, 'INDEX.md'), [
    '# Knowledge Index',
    '',
    '## Conventions',
    '',
    '## Decisions',
    '- change-management|决策 → [change-management](decisions/change-management.md)',
    '',
  ].join('\n'))
  return k
}

test('task-02 验收1：「文件：src/a.js」条目被精确反查命中，输出恰 {id,title,status,reason,file} 五字段', () => {
  const k = mkDecisionLib([
    '# 决策知识 — change-management',
    '',
    '## D-001@v1 引入文件锚定',
    '状态：implemented',
    '变更：feat-file-field',
    '锚点：未记录',
    '文件：src/a.js, src/b.js',
    '最近确认：deadbeef',
    '理由：以文件字段锚定代码位置',
    '',
  ].join('\n') + '\n')

  const r = matchDecisionsByFiles(k, ['src/a.js'])
  assert.ok(Array.isArray(r['src/a.js']), '「文件：src/a.js」条目被命中')
  assert.equal(r['src/a.js'].length, 1)
  const hit = r['src/a.js'][0]
  assert.deepEqual(Object.keys(hit).sort(), ['file', 'id', 'reason', 'status', 'title'],
    '输出条目恰五字段（file 沿 parseDecisionFile 既有字段名）')
  assert.equal(hit.id, 'D-001@v1')
  assert.equal(hit.title, '引入文件锚定')
  assert.equal(hit.status, 'implemented')
  assert.equal(hit.reason, '以文件字段锚定代码位置')
  assert.equal(hit.file, 'decisions/change-management.md', 'file = 域文件 INDEX 相对路径')
  assert.deepEqual(Object.keys(r), ['src/a.js'], '结果键 ⊆ 查询集：未查询的 src/b.js 不生成键')
})

test('task-02 验收2+3：D-905 锚点形态提取命中；锚点值不污染 reason；rejected 状态透传', () => {
  const k = mkDecisionLib([
    '# 决策知识 — change-management',
    '',
    '## D-905@v1 quicklog 标签切段先严格边界扫描再宽松兜底',
    '状态：implemented',
    '锚点：src/quicklog.js:493',
    '最近确认：71a7fe6',
    '理由：quicklog 单行四字段切段必须两层——严格扫描失败才退回宽松顺序扫描',
    '',
    '## D-906@v1 拒绝重量级依赖',
    '状态：rejected',
    '锚点：src/quicklog.js:500',
    '理由：曾考虑引入',
    '否决理由：包体过大拖慢启动',
    '复潮条件：启动耗时优化到位后',
    '',
    '## D-907@v1 无命中源条目',
    '状态：implemented',
    '锚点：未记录',
    '理由：无锚点路径形态',
    '',
  ].join('\n') + '\n')

  const r = matchDecisionsByFiles(k, ['src/quicklog.js'])
  const ids = (r['src/quicklog.js'] || []).map(h => h.id)
  assert.deepEqual(ids, ['D-905@v1', 'D-906@v1'],
    '「锚点：src/quicklog.js:493」经 token 提取（剥 :line 后缀）命中两条；「未记录」锚点条目不进结果')
  const d905 = r['src/quicklog.js'][0]
  assert.equal(d905.reason, 'quicklog 单行四字段切段必须两层——严格扫描失败才退回宽松顺序扫描',
    'reason 取「理由」行，不被锚点值污染（Grill X-002 反例）')
  const d906 = r['src/quicklog.js'][1]
  assert.equal(d906.status, 'rejected', 'rejected 条目同样进反查结果（状态透传）')
  assert.equal(d906.reason, '包体过大拖慢启动', 'rejected reason = 否决理由，不被锚点/理由行污染')
})

test('task-02 验收4：条目值与查询值双侧反斜杠归一命中（结果键为 POSIX 形态）', () => {
  const k = mkDecisionLib([
    '# 决策知识 — change-management',
    '',
    '## D-010@v1 Windows 路径形态',
    '状态：implemented',
    '锚点：src\\win\\anchor.js:12',
    '文件：src\\win\\file.js，plain.js',
    '理由：反斜杠形态双侧归一',
    '',
  ].join('\n') + '\n')

  // 条目侧反斜杠 + 查询侧反斜杠 → POSIX 键命中；全角分隔符切出的 plain.js 同样成键
  const r = matchDecisionsByFiles(k, ['src\\win\\file.js', 'plain.js'])
  assert.ok(Array.isArray(r['src/win/file.js']), '反斜杠条目值 + 反斜杠查询值 → POSIX 键命中')
  assert.equal(r['src/win/file.js'][0].id, 'D-010@v1')
  assert.ok(Array.isArray(r['plain.js']), '全角分隔符切分出的 plain.js 亦成键')
  assert.deepEqual(Object.keys(r), ['src/win/file.js', 'plain.js'])

  // 反斜杠锚点提取归一后同样命中
  const r2 = matchDecisionsByFiles(k, ['src\\win\\anchor.js'])
  assert.ok(Array.isArray(r2['src/win/anchor.js']), '反斜杠锚点提取归一后命中')
  assert.equal(r2['src/win/anchor.js'][0].id, 'D-010@v1')
})

test('task-02 验收5：无 decisions 库 / INDEX 无 Decisions 路由 / 路由失效 / 空查询 → {}', () => {
  const empty = mk('dff-task02-none-') // 空目录（无 INDEX.md）
  assert.deepEqual(matchDecisionsByFiles(empty, ['src/a.js']), {}, '无 INDEX.md → {}')

  const noRoute = mk('dff-task02-noroute-')
  writeFileSync(join(noRoute, 'INDEX.md'), [
    '# Knowledge Index', '', '## Conventions', '- ESM|module → [ESM](conventions.md#esm)', '',
  ].join('\n'))
  assert.deepEqual(matchDecisionsByFiles(noRoute, ['src/a.js']), {}, 'INDEX 无 Decisions 段 → {}')

  const broken = mk('dff-task02-broken-')
  writeFileSync(join(broken, 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions', '- 决策 → [x](decisions/gone.md)', '',
  ].join('\n'))
  assert.deepEqual(matchDecisionsByFiles(broken, ['src/a.js']), {}, '路由行指向已删域文件 → {}')

  const lib = mkDecisionLib([
    '# 决策知识 — change-management', '',
    '## D-020@v1 有库但空查询',
    '状态：implemented',
    '文件：src/a.js',
    '理由：空查询不命中',
    '',
  ].join('\n') + '\n')
  assert.deepEqual(matchDecisionsByFiles(lib, []), {}, '空查询列表 → {}')
})
