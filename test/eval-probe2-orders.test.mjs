/**
 * eval-probe2-orders.test.mjs — 005-orders-export 探针 II 判别力（2026-10-15-eval-probe2-orders-export）
 *
 * 探针成立前提 = 判别力：数据陷阱族（out/ 自建、BOM、CRLF、引号逗号、空行）全部由
 * fixture 承载、指令零提示——照抽象规格直排的 naive 实现必错、参考解必对。
 *   FR-02 参考解（solution/）过 verify
 *   FR-02 无实现被 verify 拒
 *   FR-02 naive 实现（mkdir ok、index 列位、不剥 BOM/CRLF/引号）被 verify 拒——判别力
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TASK_DIR = join(REPO_ROOT, 'eval', 'tasks', '005-orders-export')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch { /* Windows EPERM 可接受 */ }
}

function makeWorkdir(prefix) {
  const wd = mkdtempSync(join(tmpdir(), prefix))
  cpSync(join(TASK_DIR, 'files'), wd, { recursive: true })
  return wd
}

function runVerify(wd) {
  return spawnSync(process.execPath, [join(TASK_DIR, 'verify.mjs')], { cwd: wd, encoding: 'utf8' })
}

test('FR-01 fixture 字节精确：BOM 在场 + CRLF 行尾（BOM/CRLF 是任务设计面，gitattributes 已锁 -text）', () => {
  const raw = readFileSync(join(TASK_DIR, 'files', 'data', 'orders.csv'))
  assert.deepEqual([...raw.slice(0, 3)], [0xEF, 0xBB, 0xBF], 'UTF-8 BOM 三字节在场')
  const text = raw.toString('utf8')
  assert.ok(text.includes('\r\n'), 'CRLF 行尾在场')
  assert.ok(text.includes('"1,234.50"'), '引号内千分位逗号字段在场')
})

test('FR-02 参考解过 verify（dry-run pass 路径）', () => {
  const wd = makeWorkdir('ss-p2-sol-')
  try {
    cpSync(join(TASK_DIR, 'solution'), wd, { recursive: true })
    const r = runVerify(wd)
    assert.equal(r.status, 0, `参考解应通过 verify: ${String(r.stderr).slice(0, 400)}`)
  } finally { rmQuiet(wd) }
})

test('FR-02 无实现被 verify 拒（dry-run fail 路径）', () => {
  const wd = makeWorkdir('ss-p2-empty-')
  try {
    const r = runVerify(wd)
    assert.notEqual(r.status, 0, '无实现时 verify 必须非零退出')
  } finally { rmQuiet(wd) }
})

test('FR-02 naive 实现（只做命名表层）被 verify 拒——探针 II 判别力', () => {
  const wd = makeWorkdir('ss-p2-naive-')
  try {
    mkdirSync(join(wd, 'bin'), { recursive: true })
    writeFileSync(join(wd, 'bin', 'export-orders.mjs'), NAIVE_SRC)
    const r = runVerify(wd)
    assert.notEqual(r.status, 0, 'naive 实现（index 列位、不剥 BOM/CRLF/引号）必须被拒')
  } finally { rmQuiet(wd) }
})

// naive 实现：认真读了指令、按抽象规格直排——建了 out/ 目录、按逗号切分、按列位取值，
// 但从不打开数据文件本体看：BOM 未剥（无碍，它用列位）、\r 未 trim（status='paid\r' 过滤全落空）、
// 引号内逗号使金额列错位（NaN 传染）——五类陷阱命中其三即必拒。这正是探针要抓的形态。
const NAIVE_SRC = `\
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const lines = readFileSync('data/orders.csv', 'utf8').split('\\n').filter((l) => l.trim() !== '');
const agg = {};
for (const line of lines.slice(1)) {
  const [id, region, amount, status] = line.split(',');
  if (status !== 'paid') continue;
  const a = agg[region] ?? { total: 0, count: 0 };
  a.total += Number.parseFloat(amount);
  a.count += 1;
  agg[region] = a;
}
const regions = Object.entries(agg)
  .map(([region, a]) => ({ region, total: a.total, count: a.count }))
  .sort((x, y) => x.region.localeCompare(y.region));
mkdirSync('out', { recursive: true });
writeFileSync('out/summary.json', JSON.stringify({ regions }));
`
