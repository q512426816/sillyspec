/**
 * 提交事实归属切分（2026-10-05-diff-commit-attribution）
 *
 * 背景（双 P1 同根实证）：多会话共享仓 baseline..HEAD 混入他侧交付——
 *   ① patch 冻结件夹带（他会话 knowledge-stats hunk 冻进本变更审计件，评审 P2）；
 *   ② FR 域路由污染（他侧 src/knowledge-stats.js 匹配 core-engine paths → 本变更 FR 落错域）。
 * 根因：归属切分器只认 active changes/ 声明面（archive/ 下不算）——他会话窗口内交付并归档后
 * 声明不可见。修复：按提交 message 携带的变更名后缀（提交事实）切分，不按声明（不触否决
 * 决策 sentinel-evidence-freeze⑤ 的「声明抢已提交文件」禁区）。
 *
 * 锁定语义：
 *   1. 混窗集成：全部提交均属他侧变更名的文件 → 出 own 面（split）与 patch 冻结面（filter）
 *   2. 保守保留（2026-11-08-bare-commit-attribution-narrow 细分口径）：本变更名提交 /
 *      带 task-NN token 的无名提交（交付协议证据）/ design 清单声明的文件恒 own；
 *      纯裸提交（无名无 token——release 生成器/Merge/归档 chore 形态）touch → 判 foreign
 *      （坑②污染源剔除；误剔由收口「提交面夹带嫌疑 advisory」点名兜底）
 *   3. 降级现状：非 git 仓 / 无 flow-state baseline / git 失败 → 行为与旧版一致
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseChangeNamesFromSubject, buildCommitAttribution, isForeignByCommit,
  splitOwnVsForeignDiffFiles, touchedChangeDirs, changesDirPrefixFor,
  listAmbiguousTokenCommits, formatAmbiguousTokenCommits,
  COMMIT_LOG_ARGS, parseCommitLog, isOwnByFacts, collectOwnAuthors, isOwnCommitForChange,
} from '../src/foreign-declared.js'
import { filterCommittedFace } from '../src/flow-parity.js'

const ME = '2026-10-05-my-change'
const OTHER = '2026-10-05-other-change'

test('① 解析纯函数：标题变更名提取与归属聚合', () => {
  assert.deepEqual(parseChangeNamesFromSubject('fix(x): 修复 (2026-10-05-a-name) (2026-10-05-b)'), ['2026-10-05-a-name', '2026-10-05-b'])
  assert.deepEqual(parseChangeNamesFromSubject('chore: misc'), [])
  // 归档提交标题：chore(archive): 2026-10-05-x 归档留档——首部名无括号包裹不提取
  assert.deepEqual(parseChangeNamesFromSubject('chore(archive): 2026-10-05-x 归档留档'), [])
  // 括号形态双收（2026-10-08-thin-done-dirty-gate-and-paren-attribution，坑
  // thin-done-src-commit-order-and-attribution-paren）：全角/混合闭合/thin 前缀/名字后附注
  assert.deepEqual(parseChangeNamesFromSubject('fix: 评审处置（2026-10-08-foo）'), ['2026-10-08-foo'])
  assert.deepEqual(parseChangeNamesFromSubject('fix: 评审处置（thin 2026-10-08-foo；quick）'), ['2026-10-08-foo'])
  assert.deepEqual(parseChangeNamesFromSubject('fix: 混合开（2026-10-08-bar) 与闭(2026-10-08-baz）'), ['2026-10-08-bar', '2026-10-08-baz'])
  assert.deepEqual(parseChangeNamesFromSubject('fix: 附注 (thin 2026-10-08-qux; task-01)'), ['2026-10-08-qux'])
  assert.deepEqual(parseChangeNamesFromSubject('fix: 日期不在括号内 2026-10-08-无匹配'), [])
  // 变更名本体模式不放宽：日期前缀缺失/非法字符不提取
  assert.deepEqual(parseChangeNamesFromSubject('fix: （thin foo-bar）'), [])
  assert.deepEqual(parseChangeNamesFromSubject('fix: （2026-1-8-short）'), [])

  const log = [
    '\x00fix: 他侧交付 (OTHER)', 'src/other.js', '',
    `\x00feat: 我的交付 (${ME})`, 'src/mine.js', '',
    '\x00chore: misc', 'src/bare.js', '',
    '\x00chore: 手滑快修 (task-01)', 'src/tokened.js', '',
    `\x00fix: 又一笔他侧 (OTHER)`, 'src\\win-path.js', '',
  ].join('\n').replaceAll('OTHER', `(${OTHER})`)
  const attr = buildCommitAttribution(log)
  assert.deepEqual([...attr.get('src/other.js').owners], [OTHER])
  assert.equal(attr.get('src/other.js').unknown, false)
  assert.equal(isForeignByCommit(attr.get('src/other.js'), ME), true, '纯他侧 → foreign')
  assert.equal(isForeignByCommit(attr.get('src/mine.js'), ME), false, '含本变更名 → own')
  // 2026-11-08-bare-commit-attribution-narrow：纯裸（无名无 token）判 foreign；token 裸保守 own
  assert.equal(attr.get('src/bare.js').unknown, true)
  assert.equal(attr.get('src/bare.js').tokened, false, '纯裸无 token 证据')
  assert.equal(isForeignByCommit(attr.get('src/bare.js'), ME), true, '纯裸提交触碰 → foreign（坑②污染源剔除）')
  assert.equal(attr.get('src/tokened.js').tokened, true, 'task token 证据在场')
  assert.equal(isForeignByCommit(attr.get('src/tokened.js'), ME), false, 'token 裸提交触碰 → 保守 own（交付协议证据）')
  assert.equal(isForeignByCommit(attr.get('src/win-path.js'), ME), true, '反斜杠路径归一后命中')
  assert.equal(isForeignByCommit(undefined, ME), false, '无记录 → own')
})

/** 构造真实 git 仓 + 混窗提交序列：base → 他侧交付 → 我的交付 → 裸提交 → 我的清单声明件。 */
function mkMixedWindowRepo() {
  const d = mkdtempSync(join(tmpdir(), 'catr-'))
  const g = (cmd) => execSync(cmd, { cwd: d, encoding: 'utf8', windowsHide: true })
  g('git init -q')
  g('git config user.email t@t && git config user.name t')
  writeFileSync(join(d, 'seed.txt'), 'seed')
  g('git add seed.txt && git commit -q -m "chore: seed"')
  const base = g('git rev-parse HEAD').trim()
  // 我的 flow-state（baseline 自取面）+ design 清单（声明面）
  const changesDir = join(d, '.sillyspec', 'changes', ME)
  mkdirSync(changesDir, { recursive: true })
  writeFileSync(join(changesDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${base}\n`)
  writeFileSync(join(changesDir, 'design.md'), `# d\n\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/declared.js | 声明件 |\n`)
  g('git add .sillyspec && git commit -q -m "chore(wip)"')
  // 他侧交付（他侧变更目录不存在——已归档，声明面不可见；纯靠提交归属识别）
  writeFileSync(join(d, 'src-other.js'), 'other')
  mkdirSync(join(d, 'src'))
  writeFileSync(join(d, 'src', 'other.js'), 'other')
  g('git add src-other.js src/other.js && git commit -q -m "feat(other): 他侧交付 (OTHER)"'.replaceAll('OTHER', OTHER))
  // 我的交付
  writeFileSync(join(d, 'src', 'mine.js'), 'mine')
  writeFileSync(join(d, 'src', 'declared.js'), 'declared')
  g('git add src/mine.js src/declared.js && git commit -q -m "feat(me): 我的交付 (ME)"'.replaceAll('ME', `(${ME})`))
  // 裸提交双形态（2026-11-08-bare-commit-attribution-narrow）：纯裸（无名无 token——release/Merge/chore 形态）+ token 裸（交付协议证据）
  writeFileSync(join(d, 'src', 'bare.js'), 'bare')
  g('git add src/bare.js && git commit -q -m "chore: misc"')
  writeFileSync(join(d, 'src', 'tokened.js'), 'tokened')
  g('git add src/tokened.js && git commit -q -m "feat(x): 交付 (task-01/02)"')
  const windowFiles = ['src/other.js', 'src-other.js', 'src/mine.js', 'src/declared.js', 'src/bare.js', 'src/tokened.js']
  return { d, base, windowFiles }
}

test('② 混窗集成：他侧提交文件出 own 面与 patch 冻结面', () => {
  const { d, windowFiles } = mkMixedWindowRepo()
  try {
    const r = splitOwnVsForeignDiffFiles(d, ME, windowFiles, {})
    const ownSet = new Set(r.own)
    assert.equal(ownSet.has('src/other.js'), false, '他侧深层文件被提交归属剔除')
    assert.equal(ownSet.has('src-other.js'), false, '他侧根级文件被提交归属剔除')
    assert.ok(r.foreign.some((x) => x.file === 'src/other.js' && x.owners.includes(OTHER)), `foreign 列表点名 owners: ${JSON.stringify(r.foreign)}`)
    assert.equal(ownSet.has('src/mine.js'), true, '我的提交文件保留')
    assert.equal(ownSet.has('src/bare.js'), false, '纯裸提交文件剔除（坑②污染源——release/Merge/chore 形态）')
    assert.equal(ownSet.has('src/tokened.js'), true, 'token 裸提交文件保守保留（交付协议证据）')
    assert.equal(ownSet.has('src/declared.js'), true, '声明面文件保留')

    const frozen = filterCommittedFace([...windowFiles, `${'.sillyspec/changes/' + ME}/design.md`, '.sillyspec/changes/2026-10-05-stranger/x.md'], `.sillyspec/changes/${ME}/`, { cwd: d })
    const fSet = new Set(frozen)
    assert.equal(fSet.has('src/other.js'), false, 'patch 冻结面剔除他侧纯提交文件')
    assert.equal(fSet.has('src-other.js'), false, 'patch 冻结面剔除他侧根级文件')
    assert.equal(fSet.has('src/mine.js'), true)
    assert.equal(fSet.has('src/bare.js'), false, '纯裸提交文件剔除出冻结面（fail-closed 退役——坑② 10-28 实证形态）')
    assert.equal(fSet.has('src/tokened.js'), true, 'token 裸提交文件保留（不误剔交付）')
    // FR-01 口径同步（2026-10-12-close-trace-freeze-integrity）：.sillyspec/changes/** 全滤除
    // （含本变更目录——对齐 execute --done 沉淀资产面，工件随归档目录本体留档）
    assert.equal(fSet.has(`.sillyspec/changes/${ME}/design.md`), false, '本变更治理面不入冻结面（FR-01）')
    assert.equal(fSet.has('.sillyspec/changes/2026-10-05-stranger/x.md'), false, '他侧治理面滤除（现状口径）')
  } finally {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
})

test('③ 降级现状：非 git 仓 / 无 flow-state → 行为与旧版一致', () => {
  const d = mkdtempSync(join(tmpdir(), 'catr-plain-'))
  try {
    // 非 git 目录 + 空 specBase（无声明面、无 flow-state）→ own=输入全量
    const r = splitOwnVsForeignDiffFiles(d, ME, ['src/a.js', 'src/b.js'], {})
    assert.deepEqual(r.own, ['src/a.js', 'src/b.js'])
    assert.deepEqual(r.foreign, [])
    // filterCommittedFace：ownPrefix 反解出变更名但 flow-state 不可得 → 现状过滤原样
    const list = ['src/a.js', '.sillyspec/QUICKLOG.md', '.sillyspec/docs/x.md']
    const frozen = filterCommittedFace(list, `.sillyspec/changes/${ME}/`, { cwd: d })
    assert.deepEqual(frozen, ['src/a.js', '.sillyspec/docs/x.md'])
    // 非标准 ownPrefix（无变更名可反解）→ 纯现状
    assert.deepEqual(filterCommittedFace(list, 'x/'), ['src/a.js', '.sillyspec/docs/x.md'])
  } finally {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
})

// ── 2026-11-24-token-commit-change-dir-attribution：无名 task 提交按触及的变更目录归属 ──
// 坑实证（multi-agent-platform 2026-11-24）：共享仓并行会话都按 task-NN 约定提交，旧口径对
// 「无名有 token」恒判 own——他侧任务提交的文件冻进本变更补丁（7 文件膨胀到 34 文件）。
// 他侧任务提交随 tick 指引同时提交其变更目录下的 tasks.md/侧车，「触及哪个变更目录」是
// 提交事实。不触及任何变更目录的无名 task 提交仍分不清，维持保守 own（① 与 ② 的形态不变）。
const THIRD = '2026-10-05-third-change'
const P = '.sillyspec/changes/'

test('④ token 裸提交按触及的变更目录归属（纯函数）', () => {
  const log = [
    // 他变更的任务提交：随 tick 指引一并提交其变更目录下的 tasks.md 与侧车
    '\x00fix: 他侧任务交付 (task-02)', `${P}${OTHER}/tasks.md`, `${P}${OTHER}/task-ticks.jsonl`, 'src/theirs.js', '',
    // 触及本变更目录的无名 task 提交
    '\x00feat: 我的任务交付 (task-01)', `${P}${ME}/tasks.md`, 'src/mine-tok.js', '',
    // 同时触及两个变更目录
    '\x00fix: 双目录提交 (task-03)', `${P}${ME}/tasks.md`, `${P}${OTHER}/tasks.md`, 'src/both.js', '',
    // 触及他变更的归档目录
    '\x00docs: 归档补记 (task-04)', `${P}archive/${OTHER}/tasks.md`, 'src/arch.js', '',
    // 不触及任何变更目录（分不清，保守）
    '\x00fix: 返工 (task-05)', 'src/ambiguous.js', '',
    // 混合：先被「他变更目录」提交触碰，后被「无目录」提交触碰
    '\x00fix: 他侧 (task-06)', `${P}${OTHER}/tasks.md`, 'src/mixed.js', '',
    '\x00fix: 无目录 (task-07)', 'src/mixed.js', '',
    // 反斜杠路径形态
    '\x00fix: win (task-08)', `${P.replaceAll('/', '\\')}${OTHER}\\tasks.md`, 'src\\win-theirs.js', '',
  ].join('\n')
  const attr = buildCommitAttribution(log, { changesDirPrefix: P })
  // 对本变更 ME：只被「他变更目录的 task 提交」触碰的文件 → foreign
  assert.equal(isForeignByCommit(attr.get('src/theirs.js'), ME), true, '他变更目录的 task 提交文件 → 对本变更 foreign')
  assert.equal(isForeignByCommit(attr.get('src/arch.js'), ME), true, '触及他变更归档目录 → foreign')
  assert.equal(isForeignByCommit(attr.get('src/win-theirs.js'), ME), true, '反斜杠路径同样识别')
  // 对其所属变更 OTHER：own
  assert.equal(isForeignByCommit(attr.get('src/theirs.js'), OTHER), false, '对其所属变更 own')
  assert.equal(isForeignByCommit(attr.get('src/arch.js'), OTHER), false, '归档目录形态对其所属变更 own')
  // 触及本变更目录 → 对本变更 own；对无关变更 foreign
  assert.equal(isForeignByCommit(attr.get('src/mine-tok.js'), ME), false, '触及本变更目录 → own')
  assert.equal(isForeignByCommit(attr.get('src/mine-tok.js'), THIRD), true, '对无关变更 foreign')
  // 双目录：对双方都 own（保守）
  assert.equal(isForeignByCommit(attr.get('src/both.js'), ME), false, '双目录提交对本变更 own')
  assert.equal(isForeignByCommit(attr.get('src/both.js'), OTHER), false, '双目录提交对他变更 own')
  // 无目录：分不清 → 对任何变更都 own
  assert.equal(isForeignByCommit(attr.get('src/ambiguous.js'), ME), false, '不触及变更目录 → 保守 own')
  assert.equal(isForeignByCommit(attr.get('src/ambiguous.js'), THIRD), false, '不触及变更目录 → 对无关变更同样保守 own')
  // 混合触碰：含「分不清」的触碰 → 保守 own
  assert.equal(isForeignByCommit(attr.get('src/mixed.js'), ME), false, '混合触碰（含无目录提交）→ 保守 own')
  // 禁用目录归属（空串）→ 退回保守
  const attrOff = buildCommitAttribution(log, { changesDirPrefix: '' })
  assert.equal(isForeignByCommit(attrOff.get('src/theirs.js'), ME), false, '目录归属禁用 → 保守 own')
  // 自定义变更根
  const attrCustom = buildCommitAttribution([
    '\x00fix: 他侧 (task-01)', `docs/spec/changes/${OTHER}/tasks.md`, 'src/custom-theirs.js', '',
  ].join('\n'), { changesDirPrefix: 'docs/spec/changes/' })
  assert.equal(isForeignByCommit(attrCustom.get('src/custom-theirs.js'), ME), true, '自定义变更根同样生效')
  // 缺省变更根
  const attrDefault = buildCommitAttribution(log)
  assert.equal(isForeignByCommit(attrDefault.get('src/theirs.js'), ME), true, '未传 opts 走缺省 .sillyspec/changes/')
  // 旧形态 entry（无新字段）行为不变
  assert.equal(isForeignByCommit({ owners: new Set(), unknown: true, tokened: true }, ME), false, '旧 entry 形态（无 tokenDirs）→ own 不变')
  // touchedChangeDirs：变更目录口径
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`, 'src/x.js'])], [OTHER])
  assert.deepEqual([...touchedChangeDirs([`${P}archive/${OTHER}/tasks.md`])], [OTHER], '归档目录计入该变更名')
  assert.deepEqual([...touchedChangeDirs([`${P}stray.md`, `${P}${OTHER}`])], [], '变更根下散文件与同名文件不算触及目录')
  assert.deepEqual([...touchedChangeDirs([`${P}archive/x.md`])], [], '归档根下散文件不算')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`.replaceAll('/', '\\')])], [OTHER], '反斜杠归一')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`], 'docs/spec/changes')], [], '前缀无尾斜杠时按目录边界匹配')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`], '')], [], '空串禁用')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`], null)], [], 'null 禁用')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`], undefined)], [OTHER], 'undefined 走缺省前缀')
  assert.deepEqual([...touchedChangeDirs([`${P}${OTHER}/tasks.md`], '.sillyspec/changes/')], [OTHER])
})

/** 并行会话仓（2026-11-24-token-commit-change-dir-attribution）：本变更具名交付 + 他会话的无名
 *  task 交付（随 tick 指引同提交其变更目录下的 tasks.md 与侧车）+ 不触及变更目录的无名 task 提交。 */
function mkParallelSessionRepo() {
  const d = mkdtempSync(join(tmpdir(), 'catr-par-'))
  const g = (cmd) => execSync(cmd, { cwd: d, encoding: 'utf8', windowsHide: true })
  g('git init -q')
  g('git config user.email t@t && git config user.name t')
  writeFileSync(join(d, 'seed.txt'), 'seed')
  g('git add seed.txt && git commit -q -m "chore: seed"')
  const base = g('git rev-parse HEAD').trim()
  const myDir = join(d, '.sillyspec', 'changes', ME)
  mkdirSync(myDir, { recursive: true })
  writeFileSync(join(myDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${base}\n`)
  g('git add .sillyspec && git commit -q -m "chore(wip)"')
  // 我的具名交付
  mkdirSync(join(d, 'src'))
  writeFileSync(join(d, 'src', 'mine.js'), 'mine')
  g('git add src/mine.js && git commit -q -m "feat(me): 我的交付 (ME)"'.replaceAll('ME', `(${ME})`))
  // 他会话的任务交付：无变更名、带 task token，随 tick 指引同提交其变更目录下的 tasks.md 与侧车
  const theirDir = join(d, '.sillyspec', 'changes', OTHER)
  mkdirSync(theirDir, { recursive: true })
  writeFileSync(join(theirDir, 'tasks.md'), '# t\n')
  writeFileSync(join(theirDir, 'task-ticks.jsonl'), '{"task":"task-02"}\n')
  writeFileSync(join(d, 'src', 'theirs.js'), 'theirs')
  g('git add .sillyspec/changes src/theirs.js && git commit -q -m "feat(x): 他侧任务交付 (task-02)"')
  // 不触及变更目录的无名 task 提交（分不清，保守 own）
  writeFileSync(join(d, 'src', 'ambiguous.js'), 'ambiguous')
  g('git add src/ambiguous.js && git commit -q -m "fix: 返工 (task-09)"')
  const windowFiles = ['src/mine.js', 'src/theirs.js', 'src/ambiguous.js']
  return { d, base, windowFiles }
}

test('⑥ 并行会话集成：他变更的 token 裸交付出本变更 own 面与冻结面', () => {
  const { d, base, windowFiles } = mkParallelSessionRepo()
  try {
    const r = splitOwnVsForeignDiffFiles(d, ME, windowFiles, {})
    const ownSet = new Set(r.own)
    assert.equal(ownSet.has('src/theirs.js'), false, '他变更目录的 task 提交文件出本变更 own 面')
    assert.ok(r.foreign.some((x) => x.file === 'src/theirs.js'), `foreign 列表点名（实际 ${JSON.stringify(r.foreign)}）`)
    assert.equal(ownSet.has('src/mine.js'), true, '具名交付保留')
    assert.equal(ownSet.has('src/ambiguous.js'), true, '无目录无名 task 提交保守保留')
    const frozen = filterCommittedFace(windowFiles, `.sillyspec/changes/${ME}/`, { cwd: d })
    assert.deepEqual(frozen, ['src/mine.js', 'src/ambiguous.js'], '本变更冻结面：剔除他变更的 task 提交文件')
    // 换作该他会话的变更收口：其任务提交文件在其冻结面，我的具名交付被剔除
    const frozenOther = filterCommittedFace(windowFiles, `.sillyspec/changes/${OTHER}/`, { cwd: d, baselineCommit: base })
    assert.deepEqual(frozenOther, ['src/theirs.js', 'src/ambiguous.js'], '他会话变更的冻结面：含其任务提交文件')
  } finally {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
})

test('⑤ changesDirPrefixFor：仓内 spec 目录得相对前缀；仓外得空串', () => {
  const d = mkdtempSync(join(tmpdir(), 'catr-prefix-'))
  try {
    assert.equal(changesDirPrefixFor(d, join(d, '.sillyspec')), '.sillyspec/changes/', '缺省 spec 目录')
    assert.equal(changesDirPrefixFor(d, join(d, 'docs', 'spec')), 'docs/spec/changes/', '自定义 spec 目录（不写死 .sillyspec）')
    assert.equal(changesDirPrefixFor(d, '.sillyspec'), '.sillyspec/changes/', '相对 specBase 按仓根解析')
    assert.equal(changesDirPrefixFor(d, join(d, 'a', '..', '.sillyspec')), '.sillyspec/changes/', '先上溯再回来的等价路径')
    assert.equal(changesDirPrefixFor(join(d, 'sub'), join(d, '.sillyspec')), '', 'spec 目录在给定仓根之外 → 空串（禁用目录归属）')
    assert.equal(changesDirPrefixFor(d, join(d, '..', 'elsewhere-spec')), '', '仓外路径 → 空串')
    assert.equal(changesDirPrefixFor(d, ''), '', 'specBase 缺失 → 空串')
    assert.equal(changesDirPrefixFor('', join(d, '.sillyspec')), '', '仓根缺失 → 空串')
    if (process.platform === 'win32') {
      assert.equal(changesDirPrefixFor('c:\\repo', 'C:\\repo\\.sillyspec'), '.sillyspec/changes/', '盘符大小写不敏感')
      assert.equal(changesDirPrefixFor('C:\\repo', 'D:\\spec'), '', '跨盘符（path.relative 返回绝对路径）→ 空串')
    }
  } finally {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
})

// ── FR-06：「分不清」形态点名（advisory） ──
// 无名、带 task token、不触及任何变更目录的提交分不清是谁的，维持保守 own（FR-03）。落地验证
// 该形态真实存在（multi-agent-platform 最近 300 笔提交中 29 笔），误判时须能直接看出是哪笔所致。
test('⑦ listAmbiguousTokenCommits：分不清形态清单（无名有 token 且不触及变更目录）', () => {
  const d = mkdtempSync(join(tmpdir(), 'catr-amb-'))
  const g = (cmd) => execSync(cmd, { cwd: d, encoding: 'utf8', windowsHide: true })
  try {
    g('git init -q')
    g('git config user.email t@t && git config user.name t')
    writeFileSync(join(d, 'seed.txt'), 'seed')
    g('git add seed.txt && git commit -q -m "chore: seed"')
    const base = g('git rev-parse HEAD').trim()
    mkdirSync(join(d, 'src'), { recursive: true })
    // 具名提交
    writeFileSync(join(d, 'src', 'named.js'), 'n')
    g('git add src/named.js && git commit -q -m "feat: 我的交付 (ME)"'.replaceAll('ME', `(${ME})`))
    // 触及他变更目录的 task 提交（分得清）
    mkdirSync(join(d, '.sillyspec', 'changes', OTHER), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'changes', OTHER, 'tasks.md'), '# o\n')
    writeFileSync(join(d, 'src', 'theirs.js'), 't')
    g('git add .sillyspec/changes src/theirs.js && git commit -q -m "fix: 他侧任务交付 (task-02)"')
    // 分不清：无名有 token、不触及变更目录
    writeFileSync(join(d, 'src', 'amb1.js'), 'a')
    g('git add src/amb1.js && git commit -q -m "fix: 无目录提交甲 (task-07)"')
    const ambSha = g('git rev-parse HEAD').trim()
    // 纯裸提交
    writeFileSync(join(d, 'src', 'bare.js'), 'b')
    g('git add src/bare.js && git commit -q -m "chore(release): v1"')
    const r = listAmbiguousTokenCommits({ cwd: d, sinceRef: base })
    assert.ok(Array.isArray(r), '返回数组')
    assert.deepEqual(r.map((c) => c.subject), ['fix: 无目录提交甲 (task-07)'], `只列分不清形态（实际 ${JSON.stringify(r)}）`)
    assert.equal(r[0].sha, ambSha, '带完整 sha')
    assert.deepEqual(r[0].files, ['src/amb1.js'], '带文件面（正斜杠）')
    assert.match(formatAmbiguousTokenCommits(r), new RegExp(`^${ambSha.slice(0, 9)} fix: 无目录提交甲 \\(task-07\\)$`), '格式化=短 sha + 标题')
    assert.equal(formatAmbiguousTokenCommits([]), '', '空清单格式化为空串')
    // 窗口收窄：从分不清提交之后起算 → 空
    assert.deepEqual(listAmbiguousTokenCommits({ cwd: d, sinceRef: ambSha }), [], '窗口内无此类提交 → 空数组')
    // 目录归属禁用（空串）→ 触及他变更目录的 task 提交也分不清（git log 新→旧）
    assert.deepEqual(listAmbiguousTokenCommits({ cwd: d, sinceRef: base, changesDirPrefix: '' }).map((c) => c.subject), ['fix: 无目录提交甲 (task-07)', 'fix: 他侧任务交付 (task-02)'])
    // 入参缺失 / 非法引用 → null（调用方静默跳过）
    assert.equal(listAmbiguousTokenCommits({ cwd: d }), null, 'sinceRef 缺失 → null')
    assert.equal(listAmbiguousTokenCommits({ cwd: d, sinceRef: 'deadbeef' }), null, '非法引用 → null')
  } finally {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
})

// ── FR-07：作者身份补判（文件级与纯函数面） ──
// 平台仓实证（2026-11-24-voice-meeting-leak-retry-fix）：窗口内 17 笔无名 task 提交不写变更名、
// 不触及变更目录，冻结补丁 45 文件中仅 12 个属于该变更；这 17 笔的作者都不是该变更自身提交的作者。
const AUTHOR_A = 'Alice <alice@x>'
const AUTHOR_B = 'Bob <bob@x>'
/** 含作者格式的 git log 文本（COMMIT_LOG_ARGS：NUL + sha␟作者名␟邮箱␟标题 + 文件行）。 */
function commitLog(rows) {
  return rows.map(([sha, author, subject, files]) => {
    const m = /^(.*) <(.*)>$/.exec(author)
    return [`\x00${[sha, m[1], m[2], subject].join('\x1f')}`, ...files, ''].join('\n')
  }).join('\n')
}

test('⑧ 作者身份补判（文件级）：他作者的分不清提交文件判 foreign；同作者与无自身提交保守', () => {
  // 解析：新格式带 sha 与作者；旧格式（仅标题） tolerated
  const parsed = parseCommitLog(commitLog([['a1', AUTHOR_A, `feat: 我的交付 (${ME})`, ['src\\win.js', 'src/mine.js']]]))
  assert.deepEqual(parsed, [{ sha: 'a1', author: AUTHOR_A, subject: `feat: 我的交付 (${ME})`, body: '', files: ['src/win.js', 'src/mine.js'] }], '含作者格式解析（文件面正斜杠归一、旧格式 body 空串）')
  assert.deepEqual(parseCommitLog('\x00fix: 旧格式\nsrc/a.js\n'), [{ sha: '', author: '', subject: 'fix: 旧格式', body: '', files: ['src/a.js'] }], '旧格式（仅标题）解析：sha 与作者为空、body 空串')
  assert.ok(COMMIT_LOG_ARGS.includes('--name-only') && COMMIT_LOG_ARGS.some((a) => a.includes('%an') && a.includes('%ae')), 'git log 参数含作者名与邮箱')

  const rows = [
    ['a1', AUTHOR_A, `feat: 我的交付 (${ME})`, ['src/mine.js']],
    ['b1', AUTHOR_B, 'fix: 他侧无目录 (task-02)', ['src/theirs-amb.js']],
    ['a2', AUTHOR_A, 'fix: 我的返工 (task-05)', ['src/own-amb.js']],
    ['b2', AUTHOR_B, 'fix: 混合乙 (task-06)', ['src/mixed.js']],
    ['a3', AUTHOR_A, 'fix: 混合甲 (task-07)', ['src/mixed.js']],
    ['c1', 'Carol <carol@x>', `docs(${ME}): 我的另一身份 (task-08)`, [`${P}${ME}/tasks.md`, 'src/carol.js']],
  ]
  const commits = parseCommitLog(commitLog(rows))
  // 三值事实层
  assert.equal(isOwnByFacts({ subject: `fix: x (${ME})`, files: ['src/a.js'] }, ME, P), true, '具名本变更 → own')
  assert.equal(isOwnByFacts({ subject: `fix: x (${OTHER})`, files: ['src/a.js'] }, ME, P), false, '具名他变更 → 非 own')
  assert.equal(isOwnByFacts({ subject: 'chore: bare', files: ['src/a.js'] }, ME, P), false, '纯裸 → 非 own')
  assert.equal(isOwnByFacts({ subject: 'fix: x (task-01)', files: [`${P}${ME}/tasks.md`] }, ME, P), true, 'task 提交触及本变更目录 → own')
  assert.equal(isOwnByFacts({ subject: 'fix: x (task-01)', files: [`${P}${OTHER}/tasks.md`] }, ME, P), false, 'task 提交只触及他变更目录 → 非 own')
  assert.equal(isOwnByFacts({ subject: 'fix: x (task-01)', files: ['src/a.js'] }, ME, P), null, '无名 task 提交不触及变更目录 → 分不清')
  // 作者集：具名提交与触及本变更目录的 task 提交的作者（含本变更的另一身份）
  assert.deepEqual([...collectOwnAuthors(commits, ME, P)].sort(), [AUTHOR_A, 'Carol <carol@x>'].sort(), '本变更作者集')
  assert.equal(collectOwnAuthors(commits, THIRD, P).size, 0, '无自身提交 → 空集')
  // 提交级补判
  const amb = { subject: 'fix: 他侧无目录 (task-09)', files: ['src/theirs.js'] }
  const ownA = collectOwnAuthors(commits, ME, P)
  assert.equal(isOwnCommitForChange({ ...amb, author: AUTHOR_B }, ME, P, ownA), false, '他作者的分不清提交 → 非 own')
  assert.equal(isOwnCommitForChange({ ...amb, author: AUTHOR_A }, ME, P, ownA), true, '同作者的分不清提交 → own')
  assert.equal(isOwnCommitForChange({ ...amb, author: 'Carol <carol@x>' }, ME, P, ownA), true, '本变更另一身份的分不清提交 → own')
  assert.equal(isOwnCommitForChange({ ...amb, author: AUTHOR_B }, ME, P, new Set()), true, '作者集为空 → 保守 own')
  assert.equal(isOwnCommitForChange({ ...amb, author: AUTHOR_B }, ME, P), true, '未提供作者集 → 保守 own（FR-03 行为）')
  assert.equal(isOwnCommitForChange({ ...amb, author: '' }, ME, P, ownA), true, '作者未知 → 保守 own')
  // 文件级同口径
  const attr = buildCommitAttribution(commitLog(rows), { changesDirPrefix: P, changeName: ME })
  assert.equal(isForeignByCommit(attr.get('src/theirs-amb.js'), ME), true, '他作者的分不清提交文件 → 对本变更 foreign')
  assert.equal(isForeignByCommit(attr.get('src/own-amb.js'), ME), false, '同作者的分不清提交文件 → own')
  assert.equal(isForeignByCommit(attr.get('src/mixed.js'), ME), false, '混合触碰（含同作者分不清）→ 保守 own')
  assert.equal(isForeignByCommit(attr.get('src/mine.js'), ME), false, '具名交付 → own')
  assert.equal(isForeignByCommit(attr.get('src/carol.js'), ME), false, '本变更另一身份的目录提交 → own')
  // 未提供 changeName（旧调用）→ 分不清维持保守 own
  assert.equal(isForeignByCommit(buildCommitAttribution(commitLog(rows), { changesDirPrefix: P }).get('src/theirs-amb.js'), ME), false, '未提供 changeName → 保守 own')
  // 无自身提交的变更：作者集为空 → 保守 own
  assert.equal(isForeignByCommit(buildCommitAttribution(commitLog(rows), { changesDirPrefix: P, changeName: THIRD }).get('src/theirs-amb.js'), THIRD), false, '本变更无自身提交 → 保守 own')
  // 旧格式日志（无作者）+ changeName → 作者未知 → 保守 own
  const oldLog = [`\x00feat: 我的交付 (${ME})`, 'src/mine.js', '', '\x00fix: 返工 (task-05)', 'src/old-amb.js', ''].join('\n')
  assert.equal(isForeignByCommit(buildCommitAttribution(oldLog, { changesDirPrefix: P, changeName: ME }).get('src/old-amb.js'), ME), false, '旧格式日志无作者 → 保守 own')
})

// ── 正文 footer 归属（2026-11-25-freeze-face-body-attribution-and-review-base-fallback）──
// 缺陷复现：提交标题不含变更名、变更名/task token 只在正文 footer 时，旧 COMMIT_LOG_ARGS 只取
// %s → buildCommitAttribution 判 pure-bare foreign → filterCommittedFace 把已提交交付文件剔出
// 冻结面（平台仓 2026-11-25-autocommit-stale-index-isolation 的 3 个文件实证）。

test('正文 footer 的变更名/task token 参与归属（parseCommitLog 返回 body）', () => {
  const name = '2026-11-25-body-footnote-change'
  const log = [
    `\x00${'b'.repeat(40)}\x1fT\x1ft@t\x1ffix: 标题里没有名字\x1f(${name} task-01)\x1e`,
    'sillyhub-daemon/src/x.ts',
    '',
  ].join('\n')
  const parsed = parseCommitLog(log)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].subject, 'fix: 标题里没有名字')
  assert.equal(parsed[0].body.includes(`(${name} task-01)`), true)
  const attr = buildCommitAttribution(log, { changeName: name, changesDirPrefix: '.sillyspec/changes/' })
  assert.equal(isForeignByCommit(attr.get('sillyhub-daemon/src/x.ts'), name), false, '正文变更名 → own')
  assert.equal(isOwnByFacts({ subject: parsed[0].subject, body: parsed[0].body, files: [] }, name), true)
  // 旧格式日志（无正文）向后兼容：标题无名仍判 pure-bare
  const old = [`\x00fix: 标题里没有名字`, 'sillyhub-daemon/src/y.ts', ''].join('\n')
  const oldAttr = buildCommitAttribution(old, { changeName: name, changesDirPrefix: '.sillyspec/changes/' })
  assert.equal(isForeignByCommit(oldAttr.get('sillyhub-daemon/src/y.ts'), name), true, '旧格式无正文 → 维持 foreign')
})

test('正文 footer 归属贯通 filterCommittedFace（真实 git 仓；旧实现丢文件）', () => {
  const name = '2026-11-25-body-footnote-change'
  const d = mkdtempSync(join(tmpdir(), 'catr-body-'))
  try {
    const g = (cmd) => execSync(cmd, { cwd: d, encoding: 'utf8', windowsHide: true })
    g('git init -q')
    g('git config user.email t@t && git config user.name t')
    writeFileSync(join(d, 'seed.txt'), 'seed')
    g('git add seed.txt && git commit -q -m "chore: seed"')
    const base = g('git rev-parse HEAD').trim()
    mkdirSync(join(d, '.sillyspec', 'changes', name), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'changes', name, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${base}\n`)
    mkdirSync(join(d, 'sillyhub-daemon', 'src'), { recursive: true })
    writeFileSync(join(d, 'sillyhub-daemon', 'src', 'x.ts'), 'export const x = 1\n')
    g('git add sillyhub-daemon/src/x.ts')
    // 标题无名、正文 footer 带变更名 + task token（仓内提交惯例形态）
    g(`git commit -q -m "fix: no change name" -m "(${name} task-01)"`)
    const kept = filterCommittedFace(['sillyhub-daemon/src/x.ts'], `.sillyspec/changes/${name}/`, {
      cwd: d,
      specBase: join(d, '.sillyspec'),
      baselineCommit: base,
    })
    assert.deepEqual(kept, ['sillyhub-daemon/src/x.ts'], '正文 footer 归属 → 冻结面保留')
  } finally {
    rmSync(d, { recursive: true, force: true })
  }
})
