/**
 * prestage-consent-gate.test.mjs — 预段选道同意门（route-hindsight 标记升级为声明即过的门）
 * （2026-10-14-prestage-consent-gate FR-01~03 / FR-05）
 *
 * 覆盖验收面：
 *   ① 拦：标记在场 + 全新 start 无声明 → exit 2 两选一（--no-prestage / run brainstorm），
 *      文案含标记来源变更名与原因；被拦时标记不消费（文件仍在）；
 *   ② 放：--no-prestage 声明 → status 0、flow-state 落 prestage_ack 留痕、标记文件消费删除；
 *   ③ adopt 消费：头脑风暴产物（proposal.md 在场、无 flow-state）收编路径自动清标记，
 *      无声明 flag 也放行（走了预段=选道正确，反馈闭环用掉）；
 *   ④ 平台 writer 豁免：预建空变更目录（proceedFreshEmptyDir 形态）+ 标记 → 不拦，正常起跑；
 *   ⑤ resume 豁免：在途变更重入 + 标记 → 恢复简报（status 0），不被新门拦；
 *   ⑥ 无标记零影响：全新 start 输出不含同意门文案（新装/无信号仓零变化）；
 *   ⑦ 单元面：readHindsightMark 结构化读取 / clearHindsightMark 幂等消费。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markHindsight, readHindsightMark, clearHindsightMark } from '../src/route-hindsight.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const SPEC = '.sillyspec'

/** 造临时 git 仓 + local.yaml（thin 模式）+ 基线提交（同 flow-clarity-probe 造法）。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'pcg-'))
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
const MARK_PATH = (cwd) => join(cwd, SPEC, '.runtime', 'route-hindsight.json')

/** 种一条「该走预段未走」标记（tasks 改写率超阈形态）。 */
function plantMark(cwd, change = '2026-09-01-prior-misroute') {
  markHindsight({ cwd, specBase: join(cwd, SPEC), change, metrics: { tasksRewriteRatio: 0.9 } })
  assert.ok(existsSync(MARK_PATH(cwd)), '夹具：标记应已落盘')
}

test('① 拦：标记在场 + 全新 start 无声明 → exit 2 两选一，标记不消费', () => {
  const { cwd } = makeRepo()
  plantMark(cwd)
  const s = cli(cwd, ['flow', 'start', '--change', '2026-10-01-pcg-blocked', '--input', INPUT_OK])
  assert.equal(s.status, 2, `应 exit 2，实得 ${s.status}: ${s.stdout}\n${s.stderr}`)
  const out = s.stdout + s.stderr
  assert.ok(out.includes('预段选道同意门'), '文案应含门名')
  assert.ok(out.includes('2026-09-01-prior-misroute'), '文案应含标记来源变更名')
  assert.ok(out.includes('tasks 机器预填稿改写率'), '文案应含超阈原因')
  assert.ok(out.includes('--no-prestage'), '两选一应含声明通道')
  assert.ok(out.includes('run brainstorm'), '两选一应含预段指路')
  assert.ok(existsSync(MARK_PATH(cwd)), '被拦时标记不应被消费')
  assert.ok(!existsSync(join(cwd, SPEC, 'changes', '2026-10-01-pcg-blocked')), '被拦时不应建变更目录')
  rmSync(cwd, { recursive: true, force: true })
})

test('② 放：--no-prestage 声明 → status 0 + prestage_ack 留痕 + 标记消费', () => {
  const { cwd } = makeRepo()
  plantMark(cwd)
  const s = cli(cwd, ['flow', 'start', '--change', '2026-10-01-pcg-acked', '--input', INPUT_OK, '--no-prestage'])
  assert.equal(s.status, 0, `start 失败: ${s.stderr}`)
  assert.ok(s.stdout.includes('--no-prestage 声明放行'), '应渲染声明放行留痕行')
  const fsText = readFileSync(join(cwd, SPEC, 'changes', '2026-10-01-pcg-acked', 'flow-state.yaml'), 'utf8')
  assert.ok(/prestage_ack:\s*true/.test(fsText), 'flow-state 应落 prestage_ack 留痕')
  assert.ok(!existsSync(MARK_PATH(cwd)), '标记应被消费删除')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ adopt 消费：头脑风暴产物收编自动清标记（无声明 flag 也放行）', () => {
  const { cwd } = makeRepo()
  plantMark(cwd)
  const change = '2026-10-01-pcg-adopt'
  const changeDir = join(cwd, SPEC, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), '---\nauthor: t\ncreated_at: 2026-10-01T00:00:00Z\n---\n# 提案\n头脑风暴产物\n\n成功标准：\n- x\n')
  const s = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(s.status, 0, `adopt 失败: ${s.stderr}`)
  assert.ok(s.stdout.includes('头脑风暴产物已收编'), '应走 adopt 收编路径')
  assert.ok(!existsSync(MARK_PATH(cwd)), '收编即消费标记')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 平台 writer 豁免：预建空变更目录 + 标记 → 不拦，正常起跑', () => {
  const { cwd } = makeRepo()
  plantMark(cwd)
  const change = '2026-10-01-pcg-platform'
  mkdirSync(join(cwd, SPEC, 'changes', change), { recursive: true }) // 平台 writer 形态：预建空目录
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK])
  assert.equal(s.status, 0, `平台形态不应被新门拦: ${s.stderr}`)
  assert.ok(s.stdout.includes('【你要做的】'), '应正常输出起跑横幅')
  assert.ok(existsSync(MARK_PATH(cwd)), '豁免路径不消费标记（留给人工会话消化）')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ resume 豁免：在途变更重入 + 标记 → 恢复简报不拦', () => {
  const { cwd } = makeRepo()
  const change = '2026-10-01-pcg-resume'
  const s0 = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK])
  assert.equal(s0.status, 0, `首次 start 失败: ${s0.stderr}`)
  plantMark(cwd) // 起跑后才出现标记（模拟并行会话收口落标）
  const s = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(s.status, 0, `resume 不应被新门拦: ${s.stderr}`)
  assert.ok(s.stdout.includes('恢复简报') || s.stdout.includes('恢复'), '应输出恢复简报')
  assert.ok(!s.stdout.includes('exit'), '不应是门拦截输出')
  assert.ok(existsSync(MARK_PATH(cwd)), 'resume 路径不动标记')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥ 无标记零影响：全新 start 输出不含同意门文案', () => {
  const { cwd } = makeRepo()
  const s = cli(cwd, ['flow', 'start', '--change', '2026-10-01-pcg-clean', '--input', INPUT_OK])
  assert.equal(s.status, 0, `start 失败: ${s.stderr}`)
  assert.ok(!s.stdout.includes('预段选道同意门'), '无标记不应出现门文案')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑦ 单元面：readHindsightMark 结构化读取 / clearHindsightMark 幂等消费', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pcg-unit-'))
  const specBase = join(cwd, SPEC)
  assert.equal(readHindsightMark({ specBase }), null, '无文件 → null')
  assert.equal(clearHindsightMark({ specBase }), false, '无文件清除 → false 零副作用')
  markHindsight({ cwd, specBase, change: '2026-09-01-x', metrics: { tasksRewriteRatio: 0.9 } })
  const m = readHindsightMark({ specBase })
  assert.ok(m && m.change === '2026-09-01-x', '结构化读回应含 change')
  assert.ok(Array.isArray(m.reasons) && m.reasons.length > 0, '结构化读回应含 reasons')
  assert.equal(clearHindsightMark({ specBase }), true, '有标记清除 → true')
  assert.equal(readHindsightMark({ specBase }), null, '清除后读回 null')
  assert.equal(clearHindsightMark({ specBase }), false, '重复清除 → false 幂等')
  rmSync(cwd, { recursive: true, force: true })
})
