// 2026-11-04-archive-baseline-entry——归档叙事基线条目：机制（FR-01/02）、排序去重（FR-03）、
// 回放参数化（FR-04）、事故查询命中（FR-05）。背景：事故复盘叙事只活在归档 design 做法概述
// 与代码头注释（2026-10-21 宿主冻结事故搜「离线/冻结」零命中实证），蒸馏源面结构性不含该段。

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { distillIntoKnowledge, parseDesignOverview } = await import(pathToFileURL(join(root, 'src', 'decision-distill.js')).href)
const { matchKnowledge } = await import(pathToFileURL(join(root, 'src', 'knowledge-match.js')).href)
const { planBaselineReplay, applyBaselineReplay } = await import(pathToFileURL(join(root, 'src', 'archive-baseline-replay.js')).href)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const OVERVIEW_NARRATIVE = '2026-10-21 腾讯云会话实测 daemon 宿主冻结约 5 分钟——假活回收迟至 stale 388s、日志 6 分钟零输出，事件循环整体停摆却无任何本端观测面，事后只能靠时间戳反推。'

/** 造仓 fixture：.sillyspec/{knowledge, docs/demo/modules/_module-map.yaml, changes/archive/<change>} */
function buildRepo(tag, { overview = OVERVIEW_NARRATIVE, decisionStub = '# 决策记录\n\n## D-001@v1 单写者优先 CLI\n',
  patchFiles = ['sillyhub-daemon/src/event-loop-watch.ts', '.sillyspec/changes/x/design.md'],
  title = 'daemon 同步加固与观测', change = '2026-10-21-daemon-sync-hardening', withManual = false } = {}) {
  const repo = join(tmpdir(), `abe-${tag}`)
  rmSync(repo, { recursive: true, force: true })
  const kr = join(repo, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  mkdirSync(join(repo, '.sillyspec', 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(repo, '.sillyspec', 'docs', 'demo', 'modules', '_module-map.yaml'), [
    'modules:', '  daemon:', '    paths:', '      - sillyhub-daemon/src', '',
  ].join('\n'))
  const changeDir = join(repo, '.sillyspec', 'changes', 'archive', change)
  mkdirSync(changeDir, { recursive: true })
  const designLines = ['# 设计记录 — demo', '', '## 做法概述', '',
    '本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。', '',
    ...(overview ? [overview, ''] : []), '## 接口契约', '', '无', '']
  writeFileSync(join(changeDir, 'design.md'), designLines.join('\n'))
  writeFileSync(join(changeDir, 'decisions.md'), decisionStub + (withManual
    ? '\n## D-002@v1 人工决策示例\n- 类型：process\n- 状态：implemented\n- 模块域：daemon\n- 答案：手工书写的取舍叙事\n' : ''))
  writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify({ files: patchFiles }))
  writeFileSync(join(changeDir, 'flow-state.yaml'), `title: ${title}\nstage: execute\n`)
  return { repo, kr, changeDir, change }
}

// ── FR-01：合格变更产出基线（字段齐全） ──
console.log('\n=== T1: 合格变更产出基线条目 ===')
{
  const { kr, changeDir, change } = buildRepo('t1')
  try {
    const r = distillIntoKnowledge(changeDir, kr, 'abc123def')
    const file = join(kr, 'decisions', 'daemon.md')
    ok(existsSync(file), '基线落 daemon 域文件（交付面×模块匹配）')
    ok(r.written.some(w => w.file === 'decisions/daemon.md'), `written 含基线（实得 ${JSON.stringify(r.written)}）`)
    const text = readFileSync(file, 'utf8')
    ok(/原编号：D-000@v1/.test(text), '原编号 D-000@v1（基线保留号）')
    ok(new RegExp(`变更：${change}`).test(text), '变更行携带变更名（幂等键）')
    ok(text.includes('daemon 同步加固与观测——2026-10-21'), '标题=变更标题＋概述首句')
    ok(/状态：implemented[\s\S]*?类型/.test(text) || /状态：implemented/.test(text), '状态 implemented（dispositionOf 不落选）')
    ok(text.includes('锚点：.sillyspec/changes/archive/2026-10-21-daemon-sync-hardening/design.md'), '锚点指归档 design.md')
    ok(text.includes('文件：sillyhub-daemon/src/event-loop-watch.ts'), '文件行=剥 .sillyspec 后交付面')
    ok(!text.includes('.sillyspec/changes/x/design.md'), '文件行不含 .sillyspec 内部路径')
    ok(/理由：[\s\S]*冻结/.test(text), '理由含冻结叙事（症状词词面命中面）')
    // 空壳 D-001 不入选（无字段），只有基线一条
    ok((text.match(/^## D-/gm) || []).length === 1, '仅基线一段（空壳 D-001 无字段不入选）')
  } finally { rmSync(join(tmpdir(), 'abe-t1'), { recursive: true, force: true }) }
}

// ── FR-01b：四种不合格形态零产出 ──
console.log('\n=== T1b: 不合格形态零产出 ===')
{
  const cases = [
    ['无做法概述段', buildRepo('t1b1', { overview: null })],
    ['概述过短(<50字)', buildRepo('t1b2', { overview: '短概述不足五十字。' })],
    ['交付面仅 .sillyspec 路径', buildRepo('t1b3', { patchFiles: ['.sillyspec/changes/x/design.md'] })],
    ['D-000 被人工占用', buildRepo('t1b4', { decisionStub: '# 决策记录\n\n## D-000@v1 人工占号\n- 类型：process\n- 状态：implemented\n- 答案：占号\n' })],
  ]
  try {
    for (const [label, { kr, changeDir }] of cases) {
      const r = distillIntoKnowledge(changeDir, kr, 'abc')
      if (label === 'D-000 被人工占用') {
        // 人工 D-000 自身照常蒸馏（基线让位不压制人工条目；无模块域落 unmapped 属既有语义）
        const total = (r.written || []).length
        ok(total === 1, `人工 D-000 正常入库恰一段（${label}）：written=${total}`)
        const target = join(kr, 'decisions', `${(r.written[0].file || '').replace('decisions/', '').replace('.md', '')}.md`)
        const segs = (readFileSync(target, 'utf8').match(/^## D-/gm) || []).length
        ok(segs === 1, `基线让位不叠加（${label}）：文件内恰一段（实得 ${segs}）`)
      } else {
        ok(!existsSync(join(kr, 'decisions')), `零产出（${label}）：不建 decisions 目录`)
        ok((r.written || []).length === 0, `零产出（${label}）：written 空`)
      }
    }
  } finally {
    for (const t of ['t1b1', 't1b2', 't1b3', 't1b4']) rmSync(join(tmpdir(), `abe-${t}`), { recursive: true, force: true })
  }
}

// ── FR-02：幂等重蒸 / baselineOnly 不触碰人工存量 ──
console.log('\n=== T2: 幂等与 baselineOnly 隔离 ===')
{
  const { kr, changeDir } = buildRepo('t2', { withManual: true })
  try {
    distillIntoKnowledge(changeDir, kr, 'hash1')
    const file = join(kr, 'decisions', 'daemon.md')
    const first = readFileSync(file, 'utf8')
    const segCount = (first.match(/^## D-/gm) || []).length
    ok(segCount === 2, `基线+人工恰两段（实得 ${segCount}）`)

    const r2 = distillIntoKnowledge(changeDir, kr, 'hash1')
    const second = readFileSync(file, 'utf8')
    ok((second.match(/^## D-/gm) || []).length === 2, '重复蒸馏零重复段')
    ok(r2.written.every(w => w.action !== 'append'), `第二次全为原位更新（实得 ${JSON.stringify(r2.written.map(w => w.action))}）`)

    // baselineOnly 重放：人工段落逐字不变（含「最近确认」）
    const manualSegBefore = second.split(/^## /m).find(s => !/原编号：D-000@/.test(s))
    distillIntoKnowledge(changeDir, kr, 'REPLAY', null, { baselineOnly: true })
    const third = readFileSync(file, 'utf8')
    const manualSegAfter = third.split(/^## /m).find(s => !/原编号：D-000@/.test(s))
    ok(manualSegBefore === manualSegAfter, 'baselineOnly 后人工段落逐字不变')
    const baselineSeg = third.split(/^## /m).find(s => /原编号：D-000@/.test(s))
    ok(baselineSeg.includes('最近确认：REPLAY'), 'baselineOnly 更新基线自身（headHash 透传）')
    ok((third.match(/^## D-/gm) || []).length === 2, 'baselineOnly 不追加新段')
  } finally { rmSync(join(tmpdir(), 'abe-t2'), { recursive: true, force: true }) }
}

// ── FR-03：同文件基线排在人工条目后 ──
console.log('\n=== T3: 排序降位 ===')
{
  const { kr, changeDir } = buildRepo('t3', { withManual: true })
  try {
    distillIntoKnowledge(changeDir, kr, 'h')
    const r = matchKnowledge(kr, 'daemon 冻结观测')
    ok(r.matched === true, '路由命中（daemon 关键词）')
    const hits = r.decisionHits || []
    ok(hits.length >= 2, `decisionHits 含基线+人工（实得 ${hits.length}）`)
    const bi = hits.findIndex(h => /^D-000@/.test(h.originId || ''))
    const mi = hits.findIndex(h => !/^D-000@/.test(h.originId || '') && h.originId)
    ok(bi >= 0 && mi >= 0, `两类条目都在（基线 idx=${bi} 人工 idx=${mi}）`)
    ok(mi < bi, '人工条目序位先于基线（同文件降位）')
  } finally { rmSync(join(tmpdir(), 'abe-t3'), { recursive: true, force: true }) }
}

// ── FR-04：回放词表参数化 + 幂等跳过 ──
console.log('\n=== T4: 回放规划与执行 ===')
{
  const repo = join(tmpdir(), 'abe-t4')
  rmSync(repo, { recursive: true, force: true })
  const kr = join(repo, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  mkdirSync(join(repo, '.sillyspec', 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(repo, '.sillyspec', 'docs', 'demo', 'modules', '_module-map.yaml'), 'modules:\n  daemon:\n    paths:\n      - sillyhub-daemon/src\n')
  const arc = join(repo, '.sillyspec', 'changes', 'archive')
  const mk = (name, overview) => {
    const d = join(arc, name)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'design.md'), `# D\n\n## 做法概述\n\n本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。\n\n${overview}\n\n## 接口契约\n\n无\n`)
    writeFileSync(join(d, 'decisions.md'), '# 决策记录\n')
    writeFileSync(join(d, 'change-patch.json'), JSON.stringify({ files: ['sillyhub-daemon/src/a.ts'] }))
    writeFileSync(join(d, 'flow-state.yaml'), `title: ${name}\n`)
  }
  mk('2026-10-01-en-outage', 'Production outage postmortem: event loop froze for five minutes on the cloud host, recovered only after stale eviction.')
  mk('2026-10-02-cn-freeze', '腾讯云实测宿主冻结五分钟，假活回收迟至 stale 388s，事后只能靠时间戳反推。')
  mk('2026-10-03-routine', '')
  try {
    const p1 = planBaselineReplay(arc, kr, { signals: ['outage'] })
    ok(p1.planned.length === 1 && p1.planned[0].change === '2026-10-01-en-outage', `英文词表命中英文叙事（planned=${p1.planned.map(x => x.change).join(',')}）`)
    ok(p1.skipped.gated === 1, `中文叙事被词表正确排除（gated=${p1.skipped.gated}）`)

    const p2 = planBaselineReplay(arc, kr, {})
    ok(p2.planned.length === 2, `空词表=全量有概述段者（planned=${p2.planned.length}）`)

    const r1 = applyBaselineReplay(arc, kr, { signals: ['outage'] })
    ok(r1.applied === 1, `回放写入 1 条（applied=${r1.applied}）`)
    const daemonFile = readFileSync(join(kr, 'decisions', 'daemon.md'), 'utf8')
    ok(daemonFile.includes('outage postmortem'), '英文叙事基线落库')

    const p3 = planBaselineReplay(arc, kr, { signals: ['outage'] })
    ok(p3.planned.length === 0 && p3.skipped.already === 1, `已含基线幂等跳过（already=${p3.skipped.already}）`)

    // 机制源码无内置词表（规约 00：词表只经参数）
    const src = readFileSync(join(root, 'src', 'archive-baseline-replay.js'), 'utf8')
    ok(!/signals\s*(?::|=)\s*\[[^\]]/.test(src), '机制代码零内置词表常量')
  } finally { rmSync(repo, { recursive: true, force: true }) }
}

// ── FR-05：事故查询经词片回退命中基线（反馈原场景） ──
console.log('\n=== T5: 查询「冻结」命中基线 ===')
{
  const { kr, changeDir } = buildRepo('t5')
  try {
    distillIntoKnowledge(changeDir, kr, 'h')
    // INDEX 路由关键词不含「冻结」→ 路由零命中 → 词片回退：冻结 bigram ×2（标题+理由）
    const idx = join(kr, 'INDEX.md')
    const idxText = readFileSync(idx, 'utf8').replace(/\|[^|]*→/g, '|daemon-sync-hw →')
    writeFileSync(idx, idxText) // 路由行关键词剥净症状词，逼走词片回退
    const r = matchKnowledge(kr, '冻结')
    ok(r.matched === true, `「冻结」经词片回退命中（matched=${r.matched}）`)
    ok((r.entries || []).some(e => String(e.file).replace(/\\/g, '/') === 'decisions/daemon.md'),
      `命中文件=基线所在 daemon.md（entries=${JSON.stringify((r.entries || []).map(e => e.file))}）`)
  } finally { rmSync(join(tmpdir(), 'abe-t5'), { recursive: true, force: true }) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
