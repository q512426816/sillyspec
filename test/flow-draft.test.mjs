/**
 * flow-draft.test.mjs — 全件机器起草+守卫（R7 切片三 task-05 / D-004 D-005 / FR-07 FR-08）
 *
 * 覆盖验收面：
 *   ① 四件起草形态：draftAll 落盘 proposal/requirements/tasks（MACHINE-DRAFT 标记+AGENT 槽）
 *      +draft-ledger（hash+首版原文 body 永存）；任务卡分岔（默认零卡/--with-tasks 生成卡）；
 *   ② 成功标准机械摘录：节内条目/无节回退列表行；
 *   ③ 三态拒收：机器段被改写（哈希失配）/标记被删（整份重写形态）→ verifyFlowDrafts violations；
 *   ④ AGENT 槽放行：槽内书写不触发拒收；
 *   ⑤ amend 留痕：重锚后 violations 清零+ledger amendments 在案+首版 body 未被覆盖；
 *   ⑥ 薄跑道会话内 .sillyspec 写入=仅例外裁决（真 CLI harness 验产物面）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const {
  draftAll, amendFlowDraft, verifyFlowDrafts, extractSuccessCriteria, draftLedgerPath, draftDecisions,
  draftDesignRecord, verifyDesignRecordFilled,
} = await import('../src/flow-draft.js')
// decisions 起草器：零真实决策=不落文件（转写任务通常为零）；有输入才有产物——锚定存在性+空态语义
if (draftDecisions({ change: 'x', decisions: [] }) !== null) throw new Error('draftDecisions 空态应返回 null（不落文件）')

const INPUT_WITH_CRITERIA = '动机：修 watcher 泄漏\n成功标准：\n- 事件恒带 provisional:true\n- 崩溃零影响主流程\n'

function makeFixtureDir() {
  const root = mkdtempSync(join(tmpdir(), 'fd-'))
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  const runtimeRoot = join(root, '.sillyspec', '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  return { root, changeDir, runtimeRoot }
}

test('① draftAll 五件形态（标记+AGENT 槽+ledger 首版原文）+任务卡分岔', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  const a = draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, withTasks: false, runtimeRoot })
  assert.deepEqual(a.written, ['proposal.md', 'requirements.md', 'design.md', 'tasks.md'])
  assert.ok(!existsSync(join(changeDir, 'tasks')), '默认 thin 零任务卡')
  for (const f of ['proposal.md', 'requirements.md', 'design.md', 'tasks.md']) {
    const text = readFileSync(join(changeDir, f), 'utf8')
    assert.match(text, /MACHINE-DRAFT:[\w.-]+:[0-9a-f]{64}:begin/, `${f} 含指纹标记`)
  }
  assert.match(readFileSync(join(changeDir, 'proposal.md'), 'utf8'), /<!--AGENT:槽/)
  // design.md 四节机器段（含盲维四问）+ 四个 AGENT 槽（2026-09-24 v3 设计记录全档化）
  const design = readFileSync(join(changeDir, 'design.md'), 'utf8')
  for (const key of ['design-approach', 'design-contract', 'design-boundaries', 'design-risks']) {
    assert.match(design, new RegExp(`MACHINE-DRAFT:${key}:`), `design.md 机器段 ${key} 在场`)
  }
  assert.match(design, /乱序\/迟到到达/, '盲维四问之乱序在问题模板')
  assert.match(design, /作用域：跨工作区/, '盲维四问之作用域在问题模板')
  assert.equal((design.match(/<!--AGENT:槽/g) || []).length, 4, '四个作答槽')
  const ledger = JSON.parse(readFileSync(draftLedgerPath(runtimeRoot, 'c1'), 'utf8'))
  for (const file of Object.keys(ledger.files)) {
    for (const sec of Object.values(ledger.files[file])) {
      assert.ok(sec.hash && typeof sec.body === 'string' && sec.body.length > 0, `${file} 段 hash+首版 body 在案`)
    }
  }
  // 分岔：withTasks 生成任务卡
  const { changeDir: cd2, runtimeRoot: rt2 } = makeFixtureDir()
  draftAll({ changeDir: cd2, change: 'c2', input: INPUT_WITH_CRITERIA, withTasks: true, runtimeRoot: rt2 })
  const cards = readdirSync(join(cd2, 'tasks')).filter((f) => f.endsWith('.md'))
  assert.equal(cards.length, 2, '两条成功标准→两张卡')
  rmSync(root, { recursive: true, force: true })
  rmSync(dirname(cd2), { recursive: true, force: true })
})

test('⑦ 设计记录槽位门：空槽拒收清单/作答与不适用放行/无 design.md 免适用', () => {
  const { root, changeDir } = makeFixtureDir()
  assert.equal(verifyDesignRecordFilled({ changeDir }).applicable, false, '无 design.md=not-applicable（存量变更面）')
  const path = join(changeDir, 'design.md')
  const skeleton = draftDesignRecord({ change: 'c1' }).text
  writeFileSync(path, skeleton)
  const r0 = verifyDesignRecordFilled({ changeDir })
  assert.equal(r0.applicable, true)
  assert.equal(r0.emptySlots.length, 4, '骨架四槽全空 → 全列')

  // 每个槽标记行下写一行（含「不适用：理由」形态）→ 放行
  writeFileSync(path, skeleton.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：测试夹具一行答'))
  const r1 = verifyDesignRecordFilled({ changeDir })
  assert.equal(r1.emptySlots.length, 0, '不适用+理由=已答')

  // 只填一半 → 空槽精确点名剩下两个
  writeFileSync(path, skeleton.replace(/(<!--AGENT:槽[12][^\n]*-->)/g, '$1\n做法：xxx'))
  const r2 = verifyDesignRecordFilled({ changeDir })
  assert.equal(r2.emptySlots.length, 2, '槽3/槽4 仍空被点名')

  // 防绕过：零 AGENT 槽（骨架整删/手写替代）→ 拒收（非 ledger 在案面的唯一守卫）
  writeFileSync(path, '# 手写设计\n没有槽\n')
  const r3 = verifyDesignRecordFilled({ changeDir })
  assert.equal(r3.emptySlots.length, 1, '零槽=骨架缺失被点名')
  assert.match(r3.emptySlots[0], /骨架缺失/)
  rmSync(root, { recursive: true, force: true })
})

test('② extractSuccessCriteria：节内条目与无节回退列表行', () => {
  assert.deepEqual(extractSuccessCriteria(INPUT_WITH_CRITERIA), ['事件恒带 provisional:true', '崩溃零影响主流程'])
  assert.deepEqual(extractSuccessCriteria('- 甲条件\n- 乙条件'), ['甲条件', '乙条件'])
  assert.deepEqual(extractSuccessCriteria('普通一句话没有条目'), [])
})

test('③④ 三态拒收与 AGENT 槽放行', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, runtimeRoot })
  const p = join(changeDir, 'proposal.md')

  // AGENT 槽书写（机器段之外）→ 放行
  let text = readFileSync(p, 'utf8')
  writeFileSync(p, text.replace(/(<!--AGENT:槽1[^\n]*-->)/, '$1\n例外裁决：补充一条动机'))
  assert.equal(verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).violations.length, 0, 'AGENT 槽放行')

  // 机器段被改写（哈希失配）→ 拒收
  text = readFileSync(p, 'utf8')
  writeFileSync(p, text.replace('任务原话转写', '被 agent 改写'))
  const v1 = verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).violations
  assert.ok(v1.some((x) => /内容与指纹失配/.test(x)), '改写拒收')

  // 标记被整删（heredoc 整份重写形态）→ 拒收
  writeFileSync(p, '# 整份重写\n无标记\n')
  const v2 = verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).violations
  assert.ok(v2.some((x) => /标记缺失/.test(x)), '标记删除拒收')
  rmSync(root, { recursive: true, force: true })
})

test('⑤ amend 留痕：重锚后放行+amendments 审计+首版 body 未覆盖', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, runtimeRoot })
  const ledgerPath = draftLedgerPath(runtimeRoot, 'c1')
  const before = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  const firstBody = before.files['proposal.md']['proposal-motivation'].body

  // agent 经 amend 通道合法改写机器段（直接改写+重锚一体）
  const p = join(changeDir, 'proposal.md')
  writeFileSync(p, readFileSync(p, 'utf8').replace('任务原话转写', '任务原话转写（amend 补充）'))
  const r = amendFlowDraft({ changeDir, change: 'c1', runtimeRoot })
  assert.ok(r.reanchored.some((x) => x.startsWith('proposal.md')), 'amend 重锚了 proposal')

  const after = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  assert.equal(after.amendments.length, 1, 'amendment 审计在案')
  assert.equal(after.files['proposal.md']['proposal-motivation'].body, firstBody, '首版 body 永存未被 amend 覆盖')
  assert.equal(verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).violations.length, 0, '重锚后放行')
  rmSync(root, { recursive: true, force: true })
})

test('⑥ 薄跑道会话内 .sillyspec 写入=仅例外裁决（真 CLI harness 验产物面）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fd-e2e-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: node -e 0\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })

  const change = 'fd-e2e'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', INPUT_WITH_CRITERIA]).status, 0)
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', change)

  // 机器稿+flow-state 由 CLI 写；agent 干活（代码文件）+唯一 .sillyspec 书写=AGENT 槽填充
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  const p = join(changeDir, 'proposal.md')
  writeFileSync(p, readFileSync(p, 'utf8').replace(/(<!--AGENT:槽1[^\n]*-->)/, '$1\n例外：无'))
  // 设计记录四槽例行作答（2026-09-24 契约：空槽 flow done 拒收）
  const dp = join(changeDir, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：e2e 夹具一行答'))
  const snapshotBefore = readdirSync(changeDir).sort()
  assert.deepEqual(snapshotBefore, ['design.md', 'flow-state.yaml', 'proposal.md', 'requirements.md', 'tasks.md'], '产物面=五件+状态（零手写额外文件）')

  const r = cli(['flow', 'done', '--change', change])
  assert.equal(r.status, 0, `flow done 应过（AGENT 槽=合法书写）: ${r.stdout}\n${r.stderr}`)
  rmSync(cwd, { recursive: true, force: true })
})
