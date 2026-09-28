/**
 * flow-clarity-probe.test.mjs — 前门盘问渲染＋hindsight 提示注入＋收口指标接线
 * （2026-09-28-unclear-req-to-brainstorm task-03 / FR-01 FR-02 / D-001 D-005）
 *
 * 覆盖验收面：
 *   ① 新建路径输出含「选道自检」固定段（盘问重述措辞＋brainstorm 指路，纯提示不阻断）；
 *   ② adopt（头脑风暴收编）/resume（重入恢复）路径输出不含自检段（D-002 精神：无重复仪式）；
 *   ③ 清晰度门 exit 2 文案逐字保留（src/flow.js 既有六行不动）；
 *   ④ hindsight 闭环：有标记 → start 点名提示（自检段上方）；无标记 → 输出与现状一致
 *      （确定性头区逐字节等值——纯增量渲染段）；start/adopt 落首版快照；flow done 后
 *      超阈指标 → per-repo 标记落库，下次 start 可见（端到端 FR-02 回路）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markHindsight } from '../src/route-hindsight.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const SPEC = '.sillyspec'

/** 造临时 git 仓 + local.yaml（thin 模式）+ 基线提交（同 flow-protocol 造法，test 命令置空转）。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'fcp-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, SPEC), { recursive: true })
  writeFileSync(join(cwd, SPEC, 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

const INPUT_OK = '加一个文件\n成功标准：\n- work.txt 生成且 flow done 全绿'

/** 槽位作答（同 flow-protocol fillDesignSlots）。 */
function fillSlots(cwd, change) {
  const base = join(cwd, SPEC, 'changes', change)
  const dp = join(base, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：前门测试夹具——一行作答即合规'))
  const rp = join(base, 'requirements.md')
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 前门测试夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 全部子步通过')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：前门测试夹具——无独立测试面'))
}

/** 输出确定性头区：起点 →「【你要做的】」之前（前门/提示注入段均在此区，无时间戳类噪声）。 */
function headRegion(stdout) {
  const i = stdout.indexOf('【你要做的】')
  return i === -1 ? stdout : stdout.slice(0, i)
}

test('① 新建路径输出含选道自检段＋落首版快照；无 hindsight 文件时零 hindsight 行（新装零影响）', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-fcp-front-door'
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK])
  assert.equal(s.status, 0, `start 失败: ${s.stderr}`)
  assert.match(s.stdout, /选道自检——对本需求，你还有没有必须问用户才能动手的问题？/, '盘问重述措辞在场')
  assert.match(s.stdout, /run brainstorm --change/, '头脑风暴指路在场')
  assert.ok(!/route-hindsight/.test(s.stdout), '无 hindsight 文件 → 零 hindsight 行（输出与现状一致）')
  assert.ok(existsSync(join(cwd, SPEC, '.runtime', `route-hindsight-baseline-${change}.json`)), 'start 落首版快照')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 有 hindsight 标记 → 自检段上方点名提示；无标记 → 头区逐字节一致（纯增量渲染段）', () => {
  const { cwd } = makeRepo()
  // 第一变更：无标记环境
  const c1 = '2026-09-01-fcp-clean'
  const s1 = cli(cwd, ['flow', 'start', '--change', c1, '--input', INPUT_OK])
  assert.equal(s1.status, 0)
  const cleanHead = headRegion(s1.stdout).replaceAll(c1, '<CHANGE>')
  assert.ok(!cleanHead.includes('route-hindsight'))
  // 落一个标记（模拟上个轻量变更被标记）
  markHindsight({ cwd, specBase: join(cwd, SPEC), change: '2026-09-01-fcp-old', metrics: { designRewriteRatio: 0.8, tasksRewriteRatio: 0.2, blindDims: 0, testFailures: 0 } })
  const c2 = '2026-09-01-fcp-marked'
  const s2 = cli(cwd, ['flow', 'start', '--change', c2, '--input', INPUT_OK])
  assert.equal(s2.status, 0)
  assert.match(s2.stdout, /route-hindsight：上个轻量变更「2026-09-01-fcp-old」疑似该走头脑风暴预段未走/, '点名提示含上个变更名')
  const markedHead = headRegion(s2.stdout).replaceAll(c2, '<CHANGE>')
  // 提示是纯增量：剥掉 hint 行（含其后注入的空行）后与无标记头区逐字节一致
  const stripped = markedHead.replace(/🕰️ route-hindsight：[^\n]*\n\n/, '')
  assert.equal(stripped, cleanHead, 'hindsight 注入=纯增量渲染段，其余输出零变化')
  const hintIdx = markedHead.indexOf('🕰️ route-hindsight')
  const probeIdx = markedHead.indexOf('🔎 选道自检')
  assert.ok(hintIdx !== -1 && probeIdx !== -1 && hintIdx < probeIdx, '提示在自检段上方')
  rmSync(cwd, { recursive: true, force: true })
})

test('② adopt 路径：头脑风暴产物收编输出不含自检段；收编时点落首版快照', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-fcp-adopt'
  const cd = join(cwd, SPEC, 'changes', change)
  mkdirSync(cd, { recursive: true })
  writeFileSync(join(cd, 'proposal.md'), '---\nauthor: t\ncreated_at: 2026-09-01 00:00:00\n---\n# 提案\n成功标准：\n- 夹具\n')
  writeFileSync(join(cd, 'design.md'), '# 设计（头脑风暴产物）\n方案：夹具\n')
  const s = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(s.status, 0, `adopt 失败: ${s.stderr}`)
  assert.match(s.stdout, /收编/, '收编路径在场')
  assert.ok(!/选道自检/.test(s.stdout), 'adopt 输出不含自检段（无重复仪式）')
  assert.ok(!/route-hindsight：上个/.test(s.stdout), 'adopt 不注入历史提示')
  assert.ok(existsSync(join(cwd, SPEC, '.runtime', `route-hindsight-baseline-${change}.json`)), 'adopt 落首版快照')
  rmSync(cwd, { recursive: true, force: true })
})

test('② resume 路径：重入恢复简报不含自检段', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-fcp-resume'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK])
  assert.equal(s1.status, 0)
  assert.match(s1.stdout, /选道自检/, '首进含自检段')
  const s2 = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK])
  assert.equal(s2.status, 0)
  assert.match(s2.stdout, /恢复简报/, '重入走恢复简报')
  assert.ok(!/选道自检/.test(s2.stdout), 'resume 输出不含自检段')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ 清晰度门 exit 2 文案逐字保留（--input 缺失两选一）', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-fcp-gate'
  const s = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(s.status, 2, 'exit 2 保留')
  const expected = [
    `❓ 需求不够清晰（--input 缺失）——轻量跑道假定输入已含决策，两选一：`,
    `   ① 头脑风暴预段（需求不明时推荐）：sillyspec run brainstorm --change ${change}`,
    `      人机交互探索需求、出 design/决策/原型；完成后回来 sillyspec flow start --change ${change}，产物自动收编续跑轻量变更`,
    `   ② 确认输入已含决策：sillyspec flow start --change ${change} --input "<完整需求>"，input 过门格式：`,
    `      先写动机/背景；随后独立一行只写「成功标准：」；再每行一条「- <可验证标准>」`,
  ]
  for (const line of expected) assert.ok(s.stderr.includes(line), `清晰度门文案逐字保留: ${line}`)
  assert.ok(!/选道自检/.test(s.stderr), '清晰度门拒绝面不渲染自检段（未建变更）')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 端到端 FR-02 回路：done 收口超阈指标落库 → 下次 start 点名提示（best-effort 接线不阻断收口）', () => {
  const { cwd } = makeRepo()
  const c1 = '2026-09-01-fcp-loop'
  const s1 = cli(cwd, ['flow', 'start', '--change', c1, '--input', INPUT_OK, '--no-review'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  // 干活：非代码文件（测试门 skip 保持轻量）＋design 机器稿整体重写（>50% 改写比）
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  const cd = join(cwd, SPEC, 'changes', c1)
  const designV1 = readFileSync(join(cd, 'design.md'), 'utf8')
  const base = readFileSync(join(cwd, SPEC, '.runtime', `route-hindsight-baseline-${c1}.json`), 'utf8')
  assert.ok(JSON.parse(base).design.includes(designV1.split('\n')[0] || ''), '快照锚定起草时点（start 时点内容）')
  // 终稿：全部正文行换血（frontmatter/标记行保留——指纹门走 amend-draft 留痕通道），槽位作答合规
  const v1Lines = designV1.split('\n')
  const finalLines = []
  let fmClosed = false
  for (let i = 0; i < v1Lines.length; i++) {
    const l = v1Lines[i]
    if (!fmClosed) {
      finalLines.push(l)
      if (l === '---' && i > 0) fmClosed = true
      continue
    }
    if (/^<!--/.test(l)) {
      finalLines.push(l)
      if (/^<!--AGENT:槽\d/.test(l)) finalLines.push('不适用：回路夹具——一行作答即合规')
      continue
    }
    if (l.trim() === '') { finalLines.push(l); continue }
    finalLines.push(`【换血 ${i}】用户推翻重述：另一条路径、另一组文件、另一套验证面——事后闭环指标触发形态。`)
  }
  writeFileSync(join(cd, 'design.md'), finalLines.join('\n'))
  // 整写机器段的唯一合法通道：amend-draft 留痕重锚（route_hint 厚档 warn 属预期 advisory）
  const sa = cli(cwd, ['flow', 'amend-draft', '--change', c1])
  assert.equal(sa.status, 0, `amend-draft 失败: ${sa.stdout}\n${sa.stderr}`)
  const rp = join(cd, 'requirements.md')
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 回路夹具行为\nGiven 轻量变更收口\nWhen 指标超阈\nThen 标记落库')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：回路夹具——无独立测试面'))
  const s2 = cli(cwd, ['flow', 'done', '--change', c1])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  const markPath = join(cwd, SPEC, '.runtime', 'route-hindsight.json')
  assert.ok(existsSync(markPath), '超阈 → 标记落库')
  const mark = JSON.parse(readFileSync(markPath, 'utf8'))
  assert.equal(mark.change, c1)
  assert.ok(mark.metrics.designRewriteRatio > 0.5, `design 改写比超阈: ${mark.metrics.designRewriteRatio}`)
  assert.ok((mark.reasons || []).some((r) => r.includes('design')), `reasons 含 design 路: ${JSON.stringify(mark.reasons)}`)
  assert.match(s2.stderr, /route-hindsight 标记/, 'done 输出含标记 warn（console.warn → stderr）')
  // 下次 start（新变更）点名提示
  const s3 = cli(cwd, ['flow', 'start', '--change', '2026-09-01-fcp-loop-next', '--input', INPUT_OK])
  assert.equal(s3.status, 0)
  assert.match(s3.stdout, new RegExp(`route-hindsight：上个轻量变更「${c1}」疑似`), '下次 start 点名上个变更')
  rmSync(cwd, { recursive: true, force: true })
})
