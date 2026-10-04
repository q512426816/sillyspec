/**
 * flow-draft.test.mjs — 轻量道起草+守卫（v2 纯 markdown 代，2026-10-04-thin-docs-v2）
 *
 * 覆盖验收面：
 *   ① 四件起草形态（v2）：draftAll 落盘 proposal/requirements/design/tasks——纯 markdown
 *      （零 MACHINE-DRAFT 标记、零 AGENT 槽注释）+ledger v2（anchor：criteria+四问文本；
 *      files：首版全文）；任务卡分岔（默认零卡/--with-tasks 生成卡）；
 *   ② 成功标准机械摘录：节内条目/无节回退列表行；编号条目不劫持（v2 FR-03）；
 *   ③④ v1 指纹三态拒收与 AGENT 槽放行（存量在途变更轨道——手工造 v1 ledger 夹具）；
 *   ⑤ amend 留痕（v1 轨）：重锚后 violations 清零+ledger amendments 在案+首版 body 未被覆盖；
 *   ⑥ 轻量跑道会话内 .sillyspec 写入=仅正文作答（真 CLI harness 验产物面+approve 断点门）；
 *   ⑦⑧⑩⑫⑬ 各面见各用例头注。
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
  draftDesignRecord, verifyDesignRecordFilled, redraftMissingArtifacts,
  verifyRequirementBindings, extractRequirementBindings, ensureBindingSlots,
} = await import('../src/flow-draft.js')
const { wrapSection, bodyHash } = await import('../src/machine-draft.js')
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

test('① draftAll v2 形态（纯 markdown 零标记+ledger v2 锚）+任务卡分岔', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  const a = draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, withTasks: false, runtimeRoot })
  assert.deepEqual(a.written, ['proposal.md', 'requirements.md', 'design.md', 'tasks.md'])
  assert.equal(a.schema, 2, 'v2 起草代别回执')
  assert.ok(!existsSync(join(changeDir, 'tasks')), '默认 thin 零任务卡')
  // v2 纯 markdown：四件零指纹标记零 AGENT 槽注释（真标记语法——正文提及词不算）
  for (const f of ['proposal.md', 'requirements.md', 'design.md', 'tasks.md']) {
    const text = readFileSync(join(changeDir, f), 'utf8')
    assert.ok(!/<!--\s*MACHINE-DRAFT:/.test(text), `${f} 零指纹标记`)
    assert.ok(!/<!--\s*AGENT:/.test(text), `${f} 零 AGENT 槽注释`)
  }
  // requirements：FR 标题锚=成功标准原文逐字；绑定行纯文本；无 GWT 骨架预填
  const reqsText = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(reqsText, /### FR-01: 事件恒带 provisional:true/, 'FR 标题锚=标准原文')
  assert.match(reqsText, /^FR-01: （待填/m, '纯文本绑定行在场')
  assert.ok(!reqsText.includes('Then 行为符合本条标准描述'), '无占位 Then 骨架')
  assert.ok(!/^When /m.test(reqsText), '无预填 When 行')
  // tasks：镜像行=标准原文全文本（不截断）；细化行追加指引在场
  const tasks = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
  assert.match(tasks, /- \[ \] task-01: 事件恒带 provisional:true/, '镜像行全文本')
  assert.match(tasks, /追加细化行/, '细化行指引在场')
  // design：四节标题+四问原文（DESIGN_QUESTIONS 单一源逐字）+无作答（作答归 agent）
  const design = readFileSync(join(changeDir, 'design.md'), 'utf8')
  for (const h of ['## 做法概述', '## 接口契约', '## 边界与并发（盲维四问——每问必答，答不了即设计缺口）', '## 风险与死路']) {
    assert.ok(design.includes(h), `节标题在场：${h}`)
  }
  assert.match(design, /乱序\/迟到到达/, '盲维四问之乱序在问题文本')
  assert.match(design, /作用域：跨工作区/, '盲维四问之作用域在问题文本')
  // ledger v2：anchor（criteria+四问）+files 首版全文
  const ledger = JSON.parse(readFileSync(draftLedgerPath(runtimeRoot, 'c1'), 'utf8'))
  assert.equal(ledger.schemaVersion, 2)
  assert.deepEqual(ledger.anchor.criteria, ['事件恒带 provisional:true', '崩溃零影响主流程'])
  assert.ok(ledger.anchor.designQuestions.sections.length === 4, '四问文本入锚')
  for (const file of Object.keys(ledger.files)) {
    assert.ok(typeof ledger.files[file].text === 'string' && ledger.files[file].text.length > 0, `${file} 首版全文在案`)
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

test('⑧ 幂等补起草：缺哪补哪/已存在不碰/ledger 合并/criteria 从 proposal 成功标准节回提', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, runtimeRoot })
  const proposalBefore = readFileSync(join(changeDir, 'proposal.md'), 'utf8')
  const ledgerBefore = JSON.parse(readFileSync(draftLedgerPath(runtimeRoot, 'c1'), 'utf8'))
  // 模拟工具升级前的在途变更：删掉 design.md 与 requirements.md（start 时还不存在这两件）
  rmSync(join(changeDir, 'design.md'))
  rmSync(join(changeDir, 'requirements.md'))
  delete ledgerBefore.files['requirements.md']
  writeFileSync(draftLedgerPath(runtimeRoot, 'c1'), JSON.stringify(ledgerBefore, null, 2) + '\n')

  // input=null（重入不带 --input）→ criteria 从既有 proposal 成功标准节回提，不退化兜底单行
  const r = redraftMissingArtifacts({ changeDir, change: 'c1', input: null, runtimeRoot })
  assert.deepEqual(r.drafted, ['requirements.md', 'design.md'], '只补缺的两件')
  assert.equal(readFileSync(join(changeDir, 'proposal.md'), 'utf8'), proposalBefore, '已存在文件逐字未动')
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(reqs, /### FR-01: 事件恒带/, 'criteria 回提成功（FR 标题锚含标准文本）')
  assert.match(reqs, /### FR-02: 崩溃零影响/, '第二条 criteria 也回提')
  assert.ok(existsSync(join(changeDir, 'design.md')), 'design 骨架补生成')
  const ledgerAfter = JSON.parse(readFileSync(draftLedgerPath(runtimeRoot, 'c1'), 'utf8'))
  assert.ok(ledgerAfter.files['requirements.md'] && ledgerAfter.files['design.md'], '新件入账（v2 {text}）')
  assert.equal(ledgerAfter.schemaVersion, 2, 'v2 ledger 补件沿 v2')

  // 再跑一遍 → 零补件（幂等）
  const r2 = redraftMissingArtifacts({ changeDir, change: 'c1', input: null, runtimeRoot })
  assert.deepEqual(r2.drafted, [], '全在场零补件')
  rmSync(root, { recursive: true, force: true })
})

test('⑧b 双轨：v1 在途 ledger（schemaVersion 缺省）补件走指纹稿，不被 v2 混染', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  // 手造 v1 形态：指纹 proposal（机器段）+ v1 ledger（无 schemaVersion 字段）
  const critBody = ['1. 事件恒带 provisional:true', '2. 崩溃零影响主流程'].join('\n')
  const sections = { 'proposal-criteria': { hash: bodyHash(critBody), body: critBody } }
  const proposalV1 = ['---', 'author: x', '---', '# 提案书', '', '## 成功标准（可验证）', '',
    wrapSection({ key: 'proposal-criteria', body: critBody, amendCmd: 'sillyspec flow amend-draft --change c1', guardNote: '整段改写会被 flow done 拒收' }),
  ].join('\n')
  writeFileSync(join(changeDir, 'proposal.md'), proposalV1)
  writeFileSync(draftLedgerPath(runtimeRoot, 'c1'), JSON.stringify({ change: 'c1', generatedAt: 'x', files: { 'proposal.md': sections }, amendments: [] }, null, 2) + '\n')
  const r = redraftMissingArtifacts({ changeDir, change: 'c1', input: null, runtimeRoot })
  assert.deepEqual(r.drafted.sort(), ['design.md', 'requirements.md', 'tasks.md'], '缺三件全补')
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(reqs, /<!--AGENT:测试绑定FR-01/, 'v1 轨补件=指纹稿（AGENT 绑定槽形态）')
  const ledgerAfter = JSON.parse(readFileSync(draftLedgerPath(runtimeRoot, 'c1'), 'utf8'))
  assert.equal(ledgerAfter.schemaVersion, undefined, 'v1 ledger 代别不被改写')
  assert.ok('requirements.md' in ledgerAfter.files, 'v1 件落入账（requirements v1 本就零指纹段——FR 区 agent 书写面）')
  rmSync(root, { recursive: true, force: true })
})

test('⑩ 测试绑定三件（v2 纯文本行）：起草带行/行位门/绑定行提取（含 v1 槽位门回归）', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  draftAll({ changeDir, change: 'c1', input: INPUT_WITH_CRITERIA, runtimeRoot })
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.equal((reqs.match(/^FR-\d{2}: （待填/gm) || []).length, 2, '两条 criteria→两行待填绑定')
  assert.match(reqs, /## 测试绑定/, '绑定节标题在场')

  // 行位门（v2）：待填 → 2 行被点名；路径+不适用 → 放行
  let v = verifyRequirementBindings({ changeDir })
  assert.equal(v.emptySlots.length, 2, '两绑定行待填被点名')
  writeFileSync(join(changeDir, 'requirements.md'), reqs
    .replace(/^FR-01: （待填.*$/m, 'FR-01: test/flow-draft.test.mjs ⑩ 绑定提取用例')
    .replace(/^FR-02: （待填.*$/m, 'FR-02: 不适用：崩溃零影响为运行时属性，无独立断言面'))
  v = verifyRequirementBindings({ changeDir })
  assert.equal(v.emptySlots.length, 0, '路径+不适用均视作已答')
  // 行整删 → 行缺失点名
  writeFileSync(join(changeDir, 'requirements.md'), reqs.replace(/^FR-01: （待填.*$/m, ''))
  v = verifyRequirementBindings({ changeDir })
  assert.ok(v.emptySlots.some((x) => /FR-01（行缺失）|测试绑定FR-01（行缺失）/.test(x)), '绑定行缺失被点名')

  // 提取（v2 纯文本行）：路径行→行（tests 解析去前导./）；不适用/待填→跳过
  writeFileSync(join(changeDir, 'requirements.md'), reqs
    .replace(/^FR-01: （待填.*$/m, 'FR-01: 覆盖于 ./test/flow-draft.test.mjs 与 test/flow-protocol.test.mjs')
    .replace(/^FR-02: （待填.*$/m, 'FR-02: 不适用：运行时属性'))
  const rows = extractRequirementBindings({ changeDir, change: 'c1' })
  assert.equal(rows.length, 1, '只有 FR-01 产行')
  assert.equal(rows[0].anchor, 'FR-01')
  assert.deepEqual(rows[0].tests, ['test/flow-draft.test.mjs', 'test/flow-protocol.test.mjs'])
  assert.equal(rows[0].state, 'candidate')

  // v1 槽位门回归（存量在途变更）：AGENT 槽形态仍按槽位判定
  writeFileSync(join(changeDir, 'requirements.md'), [
    '# 需求', '',
    '<!--AGENT:FR区 agent 填写 -->', '### FR-01: 甲', 'Given x', 'When y', 'Then z', '',
    '## 测试绑定', '',
    '<!--AGENT:测试绑定FR-01 哪个测试覆盖 -->', '',
    '<!--AGENT:测试绑定FR-02 哪个测试覆盖 -->', 'test/x.test.mjs「用例」', '',
  ].join('\n'))
  const v1g = verifyRequirementBindings({ changeDir })
  assert.equal(v1g.applicable, true)
  assert.equal(v1g.emptySlots.length, 1, 'v1 槽位门：FR-01 槽空被点名（FR-02 已答放行）')
  const rows1 = extractRequirementBindings({ changeDir, change: 'c1' })
  assert.equal(rows1.length, 1, 'v1 提取：仅已答槽产行')
  assert.equal(rows1[0].anchor, 'FR-02')
  rmSync(root, { recursive: true, force: true })
})

test('⑬ 编号条目不劫持（v2 FR-03）：成功标准节条目优先；复合条目不再拆分；draftAll 锚=节条目原文', () => {
  const taskBook = [
    '为平台实现观测事件服务。',
    '1. 新模块 observation：批量写入端点（单批上限 500 条）与查询端点',
    '2. 写入鉴权：仅 shpsync_ token 可写，workspace 从 token 派生',
    '3. 去重键对 tz 规范化后的业务字段逐字节稳定，重复写入收敛',
    '4. 查询窗口上限与 (event_ts,id) 双列稳定排序',
    '5. 前端 30s 轮询与展开只决策一次',
    '成功标准：',
    '- 上述 1-5 全部实现且定向测试全绿',
    '- 每条承诺兑现且可指认',
  ].join('\n')
  // v2（2026-10-04-thin-docs-v2 FR-03）：正文编号条目不再取代成功标准节——编号劫持是实证
  // 静默变形（动机/背景节编号列点被误劫持为 FR）；任务书形态由书写者自查（一条标准一行）。
  const got = extractSuccessCriteria(taskBook)
  assert.equal(got.length, 2, '节条目优先（编号条目不劫持）')
  assert.match(got[0], /上述 1-5/, '节条目原文')
  // 复合条目不再拆分：分号/斜杠形态整条保留（拆分词表误判成对短名词是历史实证坑）
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 写入幂等；重试收敛'), ['写入幂等；重试收敛'], '分号不拆')
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 后端端点可访问/鉴权生效'), ['后端端点可访问/鉴权生效'], '斜杠不拆')
  // draftAll：FR 标题锚=节条目原文逐字；绑定行数=节条目数
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  draftAll({ changeDir, change: 'c13', input: taskBook, runtimeRoot })
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(reqs, /### FR-01: 上述 1-5 全部实现且定向测试全绿/, 'FR 锚=节条目原文')
  assert.equal((reqs.match(/^FR-\d{2}: （待填/gm) || []).length, 2, '节条目数→2 行绑定')
  rmSync(root, { recursive: true, force: true })
})

test('⑫ ensureBindingSlots：按 requirements 实际 FR 编号追加纯文本行/幂等/无文件与既有节 no-op', () => {
  const { root, changeDir } = makeFixtureDir()
  assert.deepEqual(ensureBindingSlots({ changeDir }), { appended: false, slots: 0 }, '无 requirements no-op')
  writeFileSync(join(changeDir, 'requirements.md'), [
    '# 需求', '', '### FR-02: 行为甲', 'Given x', 'When y', 'Then z', '',
    '### FR-05: 行为乙', 'Given x', '', '## 决策覆盖', '散文', '',
  ].join('\n'))
  const r1 = ensureBindingSlots({ changeDir })
  assert.equal(r1.appended, true)
  assert.equal(r1.slots, 2, '按实际编号 FR-02/FR-05')
  const text = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(text, /^FR-02: （待填/m, '纯文本绑定行用实际编号')
  assert.match(text, /^FR-05: （待填/m)
  const r2 = ensureBindingSlots({ changeDir })
  assert.equal(r2.appended, false, '二次调用幂等 no-op（纯文本节在场即停）')
  rmSync(root, { recursive: true, force: true })
})

test('② extractSuccessCriteria：节内条目与无节回退列表行', () => {
  assert.deepEqual(extractSuccessCriteria(INPUT_WITH_CRITERIA), ['事件恒带 provisional:true', '崩溃零影响主流程'])
  assert.deepEqual(extractSuccessCriteria('- 甲条件\n- 乙条件'), ['甲条件', '乙条件'])
  assert.deepEqual(extractSuccessCriteria('普通一句话没有条目'), [])
})

/** 手造 v1 指纹夹具（存量在途变更轨道：指纹段+AGENT 槽的 proposal + v1 ledger）。 */
function makeV1ProposalFixture({ changeDir, runtimeRoot, change = 'c1' }) {
  const motBody = '任务原话转写：修 watcher 泄漏'
  const wrapped = wrapSection({ key: 'proposal-motivation', body: motBody, amendCmd: `sillyspec flow amend-draft --change ${change}`, guardNote: '整段改写会被 flow done 拒收' })
  const text = ['---', 'author: x', '---', '# 提案书', '', '## 动机', '', wrapped, '', '<!--AGENT:槽1 动机例外裁决 -->', ''].join('\n')
  writeFileSync(join(changeDir, 'proposal.md'), text)
  const ledger = { change, generatedAt: 'x', files: { 'proposal.md': { 'proposal-motivation': { hash: bodyHash(motBody), body: motBody } } }, amendments: [] }
  writeFileSync(draftLedgerPath(runtimeRoot, change), JSON.stringify(ledger, null, 2) + '\n')
  return { text }
}

test('③④ v1 指纹三态拒收与 AGENT 槽放行（存量在途变更轨道）', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  makeV1ProposalFixture({ changeDir, runtimeRoot })
  const p = join(changeDir, 'proposal.md')

  // AGENT 槽书写（机器段之外）→ 放行
  let text = readFileSync(p, 'utf8')
  writeFileSync(p, text.replace(/(<!--AGENT:槽1[^\n]*-->)/, '$1\n例外裁决：补充一条动机'))
  assert.equal(verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).violations.length, 0, 'AGENT 槽放行')
  assert.equal(verifyFlowDrafts({ changeDir, change: 'c1', runtimeRoot }).schema, 1, 'v1 轨代别回执')

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

test('⑤ amend 留痕（v1 轨）：重锚后放行+amendments 审计+首版 body 未覆盖', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  makeV1ProposalFixture({ changeDir, runtimeRoot })
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

test('⑥ 轻量跑道 e2e（v2）：spec 断点机器门——未批准拒收 / flow approve 后放行', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fd-e2e-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: node -e 0\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })

  const change = '2026-09-01-fd-e2e'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', INPUT_WITH_CRITERIA]).status, 0)
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', change)

  // agent 干活（代码文件）+治理面正文作答（v2：FR 行为句/design 四节/绑定行——全部写正文）
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  const fill = (f, fn) => writeFileSync(join(changeDir, f), fn(readFileSync(join(changeDir, f), 'utf8')))
  fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：e2e 夹具一行答'))
  fill('requirements.md', (t) => t
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 实现该条标准行为（e2e 夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：e2e 夹具——无独立测试面'))

  // 断点机器门（FR-07）：未批准且未 autopilot → flow done 拒收
  const rGate = cli(['flow', 'done', '--change', change])
  assert.notEqual(rGate.status, 0, '未批准的 v2 变更 flow done 必须拒收')
  assert.match(rGate.stdout + rGate.stderr, /spec 断点未批准/, '拒收理由=断点未批准')

  // 用户批准（FR-06）→ 留痕 → flow done 放行
  const rApprove = cli(['flow', 'approve', '--change', change])
  assert.equal(rApprove.status, 0, `flow approve 应过: ${rApprove.stdout}\n${rApprove.stderr}`)
  assert.match(readFileSync(join(changeDir, 'flow-state.yaml'), 'utf8'), /spec_approved: true/, '批准留痕入 flow-state')

  const r = cli(['flow', 'done', '--change', change])
  assert.equal(r.status, 0, `flow done 应过（正文作答=合法书写+已批准）: ${r.stdout}\n${r.stderr}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥b autopilot 豁免：start 声明 --autopilot 后免断点批准直接放行', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fd-e2e2-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: node -e 0\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })

  const change = '2026-09-04-fd-auto'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', INPUT_WITH_CRITERIA, '--autopilot']).status, 0)
  const changeDir = join(cwd, '.sillyspec', 'changes', change)
  assert.match(readFileSync(join(changeDir, 'flow-state.yaml'), 'utf8'), /autopilot: true/, 'autopilot 声明留痕')
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  const fill = (f, fn) => writeFileSync(join(changeDir, f), fn(readFileSync(join(changeDir, f), 'utf8')))
  fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：e2e 夹具一行答'))
  fill('requirements.md', (t) => t
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 实现该条标准行为（e2e 夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：e2e 夹具——无独立测试面'))
  const r = cli(['flow', 'done', '--change', change])
  assert.equal(r.status, 0, `autopilot 豁免后 flow done 直接放行: ${r.stdout}\n${r.stderr}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥c flow approve 对不存在变更 exit 2（评审 P3 清偿：行为面断言锁定）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fd-ap2e-'))
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  const r = cli(['flow', 'approve', '--change', '2026-09-01-not-exist'])
  assert.equal(r.status, 2, `不存在变更应 exit 2（实际 ${r.status}）`)
  assert.match(r.stderr, /变更不存在/, '指错文案在场（approve 在 flow start 之后运行）')
  rmSync(cwd, { recursive: true, force: true })
})

// ── ⑦ v2 摘录保真（2026-10-04-thin-docs-v2 FR-03：截断/劈句变形退役）──────────────────
// 实证来源：voluntary-task-tick 7 条占位 Then + When 80 字腰斩（AGENTS.md 核心规/核心规→输）
// 归档实证；v2 起草不再机器预填 GWT 场景体——FR 正文与场景块归 agent 撰写。

test('⑦a 长标准不截断（全文入 ### FR-NN: 标题锚与 tasks 镜像行）', () => {
  const long = '顶栏面包屑路由段名全部映射为中文（changes→变更中心 等，MCP/Git/API 等专业术语除外）——段名标签与侧边栏菜单既有命名一致不新造叫法这是一条超过八十个字符的长标准文本'
  assert.ok(long.length > 80, '夹具前提：超 80 字符（旧 When/Then slice(0,80) 腰斩位）')
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  try {
    draftAll({ changeDir, change: 'c1', input: `动机：x\n成功标准：\n- ${long}\n`, withTasks: false, runtimeRoot })
    const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    assert.ok(reqs.includes(`### FR-01: ${long}`), 'FR 标题锚保留全文')
    const tasks = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    assert.ok(tasks.includes(`- [ ] task-01: ${long}`), 'tasks 镜像行保留全文（clipTaskText 截断退役）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑦b GWT 骨架预填退役：requirements 无机器 When/Then 行；分隔符不再劈句', () => {
  const { root, changeDir, runtimeRoot } = makeFixtureDir()
  try {
    draftAll({
      changeDir, change: 'c1', withTasks: false, runtimeRoot,
      input: '动机：x\n成功标准：\n- 段名映射为中文（changes→变更中心 等，术语除外）\n- 点击变更中心→列表刷新\n- 勾选复选框则按钮激活\n',
    })
    const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    assert.ok(!/^When /m.test(reqs) && !/^Then /m.test(reqs) && !/^Given /m.test(reqs), '零机器 GWT 行')
    assert.ok(!reqs.includes('行为符合本条标准描述'), '零占位 Then')
    // 分隔符句式：标准原文整条入标题锚（不劈 When/Then）
    assert.ok(reqs.includes('### FR-02: 点击变更中心→列表刷新'), '→ 句式整条保留')
    assert.ok(reqs.includes('### FR-03: 勾选复选框则按钮激活'), '则 句式整条保留')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑧ splitGwtSeparator 直测：括号深度感知三态（导出消费——22e-b 死导出清偿）', async () => {
  const { splitGwtSeparator } = await import('../src/flow-draft.js')
  // 括号内分隔符不切——返回 null（走 When=全文/Then=占位兜底）
  assert.equal(splitGwtSeparator('段名映射为中文（changes→变更中心 等，术语除外）'), null, '括号内 → 不切')
  assert.equal(splitGwtSeparator('对齐（原则一致）后收口'), null, '括号内 则（嵌词）不切')
  // 括号外分隔符切分——返回 [when, then]
  assert.deepEqual(splitGwtSeparator('点击变更中心→列表刷新'), ['点击变更中心', '列表刷新'], '括号外 → 切')
  assert.deepEqual(splitGwtSeparator('勾选复选框则按钮激活'), ['勾选复选框', '按钮激活'], '括号外 则 切')
  assert.deepEqual(splitGwtSeparator('术语命中使得高亮生效'), ['术语命中', '高亮生效'], '括号外 使得 切')
  assert.deepEqual(splitGwtSeparator('外层→生效（内层→不切）'), ['外层', '生效（内层→不切）'], '首个深度0分隔符生效、括号内保留')
  // 空输入返回 null
  assert.equal(splitGwtSeparator(''), null, '空输入 null')
})
