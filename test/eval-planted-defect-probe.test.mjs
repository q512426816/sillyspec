/**
 * eval-planted-defect-probe.test.mjs — 004-phase-stats 种植缺陷探针判别力
 * （2026-10-15-eval-planted-defect-probe）
 *
 * 探针成立前提 = 判别力：只实现「指令命名表层」的实现必须被 verify 拒，覆盖
 * 「fixture 隐含面」的实现必须过。本文件把该性质钉进仓库测试套件（eval/ 目录本身
 * 不在 node --test 套件内）：
 *   FR-03 参考解（solution/）过 verify——dry-run pass 路径
 *   FR-03 无实现被 verify 拒——dry-run fail 路径
 *   FR-04 naive 实现（按 phase 邻接配对、忽略 session 交错）被 verify 拒——判别力
 *
 * 判别力机理（fixture v2 交错乱序驱动）：naive 按 phase 名配对（忽略 sessionId）——s6 的
 * 孤儿 END 在 download 无 open 时照常进账 → rounds 2≠1 且 NaN 传播（JSON 序列化为 null），
 * download 深相等必拒；s5 未闭合 START 占位 open.upload 但无 END 消费、不翻车——单一偏差点
 * 足以拒判，且该性质随本测试回归保护。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TASK_DIR = join(REPO_ROOT, 'eval', 'tasks', '004-phase-stats')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch { /* Windows EPERM 可接受 */ }
}

/** 工作副本 = files/ 脚手架（与 eval/lib/workdir.mjs 的 prepareWorkdir 同口径）。 */
function makeWorkdir(prefix) {
  const wd = mkdtempSync(join(tmpdir(), prefix))
  cpSync(join(TASK_DIR, 'files'), wd, { recursive: true })
  return wd
}

function runVerify(wd) {
  return spawnSync(process.execPath, [join(TASK_DIR, 'verify.mjs')], { cwd: wd, encoding: 'utf8' })
}

test('FR-03 参考解过 verify（dry-run pass 路径：solution 复制进工作副本后判定为过）', () => {
  const wd = makeWorkdir('ss-probe-sol-')
  try {
    cpSync(join(TASK_DIR, 'solution'), wd, { recursive: true })
    const r = runVerify(wd)
    assert.equal(r.status, 0, `参考解应通过 verify: ${String(r.stderr).slice(0, 400)}`)
  } finally { rmQuiet(wd) }
})

test('FR-03 无实现被 verify 拒（dry-run fail 路径：仅脚手架的工作副本不得放行）', () => {
  const wd = makeWorkdir('ss-probe-empty-')
  try {
    const r = runVerify(wd)
    assert.notEqual(r.status, 0, '无实现时 verify 必须非零退出')
  } finally { rmQuiet(wd) }
})

test('FR-04 naive 实现（只做命名表层）被 verify 拒——探针判别力', () => {
  const wd = makeWorkdir('ss-probe-naive-')
  try {
    mkdirSync(join(wd, 'bin'), { recursive: true })
    writeFileSync(join(wd, 'bin', 'phase-stats.mjs'), NAIVE_SRC)
    const r = runVerify(wd)
    assert.notEqual(r.status, 0, 'naive 实现（phase 邻接配对、忽略 session 交错/退化事件）必须被拒')
  } finally { rmQuiet(wd) }
})

// naive 实现：一个「认真读了指令但没多想」的实现——按 phase 邻接配对（忽略 sessionId）、
// 空白行会过滤（常见习惯）、未闭合/孤儿事件照常进账（NaN 传播）。这不是稻草人：
// 它逐字满足 instruction 的命名面，只在 fixture 隐含面上翻车——正是探针要抓的形态。
const NAIVE_SRC = `\
import { readFileSync } from 'node:fs';
const lines = readFileSync('data/events.log', 'utf8').split('\\n').filter((l) => l.trim() !== '');
const open = {};
const agg = {};
for (const line of lines) {
  const [ts, kind, sid, phase] = line.trim().split(/\\s+/);
  if (kind === 'START') {
    open[phase] = Date.parse(ts);
  } else {
    const start = open[phase];
    const a = agg[phase] ?? { rounds: 0, totalSeconds: 0 };
    a.rounds += 1;
    a.totalSeconds += Math.round((Date.parse(ts) - start) / 1000);
    agg[phase] = a;
    delete open[phase];
  }
}
const phases = Object.entries(agg)
  .map(([phase, x]) => ({ phase, rounds: x.rounds, totalSeconds: x.totalSeconds }))
  .sort((x, y) => x.phase.localeCompare(y.phase));
console.log(JSON.stringify({ phases }));
`
