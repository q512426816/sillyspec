/**
 * flow-redline-frontload.test.mjs — 收口拒收红线前置回归
 * （2026-10-11-flow-start-redline-frontload / 实证使用反馈复盘）
 *
 * 痛点：钉死规则/空槽拒收/task-NN token 形态都是文档先行校验，原横幅只在中段一句带过、
 * 恢复简报不带、哨兵拒收文案不写 token 合法形态——第一次容易踩（改写问题原文/区间写法
 * task-01..task-05 零证据被拒）。回归钉三处文案面 + 门语义不放宽：
 *   ① 新建横幅：🚫 收口拒收红线块先于书写面细则，首条含「钉死」「拒收」，横幅保留「勿改写」；
 *   ② 重入恢复简报：红线重申行在场（钉死 + task-NN token 形态）；
 *   ③ 哨兵假完成拒收文案：源码含 token 合法形态说明（逐个/连写，区间写法不认），
 *      且 '..' 区间写法零展开、判 fake——收口判据语义不放宽（只前置告知，不动门）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expandTaskShorthand, detectFakeCheckCompletion } from '../src/sentinel-assertions.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const SPEC = '.sillyspec'

/** 造临时 git 仓 + local.yaml（thin 模式）+ 基线提交（同 flow-protocol 造法，test 命令置空转）。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'frf-'))
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

const CHANGE = '2026-10-11-redline-frontload-fixture'
const INPUT_OK = '红线前置夹具\n成功标准：\n- work.txt 生成且 flow done 全绿'

test('① 新建横幅：红线块先于书写面细则且首条钉死勿改写', () => {
  const { cwd } = makeRepo()
  const s = cli(cwd, ['flow', 'start', '--change', CHANGE, '--input', INPUT_OK])
  assert.equal(s.status, 0, `flow start 失败: ${s.stdout}\n${s.stderr}`)
  const out = s.stdout
  const redlineIdx = out.indexOf('🚫 收口拒收红线')
  assert.ok(redlineIdx !== -1, `红线块在场，实际输出头部：${out.slice(0, 300)}`)
  const writeIdx = out.indexOf('书写面（纯 markdown 起草）')
  assert.ok(writeIdx !== -1, '书写面细则段在场')
  assert.ok(redlineIdx < writeIdx, '红线块必须前置（先于书写面细则）——实证痛点：埋中段第一次容易漏')
  const redlineBlock = out.slice(redlineIdx, writeIdx)
  assert.match(redlineBlock, /钉死/, '红线首条申明逐字钉死')
  assert.match(redlineBlock, /拒收/, '红线首条申明改写即拒收')
  assert.match(redlineBlock, /勿改写/, '横幅保留「勿改写」字样（batch-tick-gate 源码断言兼容面）')
  assert.match(redlineBlock, /四问文本|四问/, '红线首条点名 design 四问文本')
  assert.match(out, /区间写法不认/, '横幅勾选证据行写明 task-NN token 形态（区间写法不认）')
})

test('② 重入恢复简报：红线重申行在场', () => {
  const { cwd } = makeRepo()
  const s1 = cli(cwd, ['flow', 'start', '--change', CHANGE, '--input', INPUT_OK])
  assert.equal(s1.status, 0, `首进失败: ${s1.stdout}\n${s1.stderr}`)
  const s2 = cli(cwd, ['flow', 'start', '--change', CHANGE])
  assert.equal(s2.status, 0, `重入失败: ${s2.stdout}\n${s2.stderr}`)
  const out2 = s2.stdout
  assert.match(out2, /恢复简报/, '重入走恢复简报路径')
  const briefIdx = out2.indexOf('红线重申')
  assert.ok(briefIdx !== -1, `简报含红线重申行，实际：${out2.slice(0, 400)}`)
  const briefLine = out2.slice(briefIdx, out2.indexOf('\n', briefIdx))
  assert.match(briefLine, /钉死/, '红线重申含钉死规则')
  assert.match(briefLine, /task-NN/, '红线重申含 task-NN token 形态')
})

test('③ 哨兵假完成拒收文案：写明 token 合法形态且门语义不放宽', () => {
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.match(flowSrc, /区间写法不认/, '哨兵拒收文案写明区间写法不认')
  assert.match(flowSrc, /逐个列出或\s*\/、，连写/, '哨兵拒收文案写明逐个/连写合法形态')
  assert.match(flowSrc, /baseline\.\.HEAD 提交标题与正文均无 token/, '「区间提交」歧义消除（baseline..HEAD 提交）')
  // 门语义不放宽：'..' 区间写法零展开——端点 token（01/05）本就字面在场，防的是中间任务
  // （02/03/04）被区间展开成完成证据
  const [rangedMsg] = expandTaskShorthand(['fix: task-01..task-05 完成'])
  assert.ok(!/\btask-02\b/.test(rangedMsg) && !/\btask-03\b/.test(rangedMsg) && !/\btask-04\b/.test(rangedMsg), `区间写法不得展开中间任务：${rangedMsg}`)
  const [slashMsg] = expandTaskShorthand(['fix: task-01/02/03 完成'])
  assert.match(slashMsg, /task-02/, '连写展开语义保持（对照）')
  const verdict = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: ['- [x] task-01: a', '- [x] task-02: b', '- [x] task-03: c'].join('\n'),
    commits: ['fix: task-01..task-05 完成'],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(verdict.status, 'fake', '区间写法提交仍判假完成（收口门不放宽）')
  assert.deepEqual(verdict.missing, ['task-02', 'task-03'], 'missing 照旧逐个列出')
})

test('④ 三处文案回归同文件钉住（源码锚点防漂移）', () => {
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.match(flowSrc, /🚫 收口拒收红线/, '横幅红线块源码锚点')
  assert.match(flowSrc, /红线重申/, '恢复简报红线重申源码锚点')
  assert.match(flowSrc, /补证据（提交标题或正文带 task-NN/, '哨兵补证据文案源码锚点')
})
