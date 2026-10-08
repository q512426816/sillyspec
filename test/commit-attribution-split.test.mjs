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
 *   2. 保守保留：本变更名提交 / 无后缀裸提交触碰 / design 清单声明的文件恒 own
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
  splitOwnVsForeignDiffFiles,
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
    `\x00fix: 又一笔他侧 (OTHER)`, 'src\\win-path.js', '',
  ].join('\n').replaceAll('OTHER', `(${OTHER})`)
  const attr = buildCommitAttribution(log)
  assert.deepEqual([...attr.get('src/other.js').owners], [OTHER])
  assert.equal(attr.get('src/other.js').unknown, false)
  assert.equal(isForeignByCommit(attr.get('src/other.js'), ME), true, '纯他侧 → foreign')
  assert.equal(isForeignByCommit(attr.get('src/mine.js'), ME), false, '含本变更名 → own')
  assert.equal(isForeignByCommit(attr.get('src/bare.js'), ME), false, '裸提交触碰 → 保守 own')
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
  // 裸提交（无变更名后缀）
  writeFileSync(join(d, 'src', 'bare.js'), 'bare')
  g('git add src/bare.js && git commit -q -m "chore: misc"')
  const windowFiles = ['src/other.js', 'src-other.js', 'src/mine.js', 'src/declared.js', 'src/bare.js']
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
    assert.equal(ownSet.has('src/bare.js'), true, '裸提交文件保守保留')
    assert.equal(ownSet.has('src/declared.js'), true, '声明面文件保留')

    const frozen = filterCommittedFace([...windowFiles, `${'.sillyspec/changes/' + ME}/design.md`, '.sillyspec/changes/2026-10-05-stranger/x.md'], `.sillyspec/changes/${ME}/`, { cwd: d })
    const fSet = new Set(frozen)
    assert.equal(fSet.has('src/other.js'), false, 'patch 冻结面剔除他侧纯提交文件')
    assert.equal(fSet.has('src-other.js'), false, 'patch 冻结面剔除他侧根级文件')
    assert.equal(fSet.has('src/mine.js'), true)
    assert.equal(fSet.has('src/bare.js'), true, '裸提交文件不进剔除面（fail-closed）')
    assert.equal(fSet.has(`.sillyspec/changes/${ME}/design.md`), true, '本变更治理面保留（现状口径）')
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
