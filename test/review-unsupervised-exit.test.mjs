/**
 * review-unsupervised-exit.test.mjs — 评审豁免凭据（2026-09-26-review-unsupervised-exit）
 *
 * 覆盖验收面（R18-full 实证：无嵌套派发环境自审表演+形式拦截 5 次）：
 *   ① readReviewUnsupervisedWaiver 三态：含 unsupervised 字样放行 / 不含拒认 / 缺文件 null；
 *   ② 消费点接线钉（2026-09-26-task-review-retire 起 Task Review 层退役，消费点收窄为两处）：
 *      doctor-align / stage-review tier 分支均先查豁免（gates.js 源码文本钉——豁免先于校验、
 *      warn+遥测在場）；原 review-json 硬门与 execute-task-review 两钉随门退役删除；
 *   ③ 生成侧三处指引钉：brainstorm Grill / plan / execute QA 均含豁免句与文件名。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { readReviewUnsupervisedWaiver } = await import(pathToFileURL(join(ROOT, 'src/run/gates.js')).href)

test('① 豁免凭据三态：字样放行 / 无字样拒认 / 缺文件 null', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'rue-'))
  try {
    const cd = join(tmp, 'changes', 'c-x')
    mkdirSync(cd, { recursive: true })
    assert.equal(readReviewUnsupervisedWaiver(cd), null, '缺文件=null')
    writeFileSync(join(cd, 'review-unsupervised.md'), '# 降级留痕\n环境无嵌套派发能力（unsupervised），2026-09-26。\n')
    const hit = readReviewUnsupervisedWaiver(cd)
    assert.ok(hit && /unsupervised/i.test(hit), '含字样放行（返回声明文本）')
    writeFileSync(join(cd, 'review-unsupervised.md'), '# 普通说明\n没有关键字。\n')
    assert.equal(readReviewUnsupervisedWaiver(cd), null, '不含字样拒认（防误放）')
    assert.equal(readReviewUnsupervisedWaiver(null), null, '无目录 null')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 消费点接线钉（gates.js 源码；Task Review 层退役后收窄为两处）', () => {
  const src = readFileSync(join(ROOT, 'src/run/gates.js'), 'utf8')
  const sites = [
    ['doctor-align 门', /enforceAlignExecuteReviewGate[\s\S]{0,900}readReviewUnsupervisedWaiver/],
    ['stage-review tier 分支', /tier\.tier === 'self'[\s\S]{0,400}readReviewUnsupervisedWaiver/],
  ]
  for (const [name, re] of sites) assert.ok(re.test(src), `${name} 应先查豁免凭据`)
  // 退役钉（2026-09-26-task-review-retire）：原另两消费点（review-json 硬门 / execute-task-review）
  // 的门本体已删——enforceReviewJsonGate 不复存在，Execute Task Review Gate 只剩墓碑注释。
  assert.ok(!src.includes('export async function enforceReviewJsonGate'), 'enforceReviewJsonGate 导出已退役')
  assert.ok(!/── Execute Task Review Gate：所有 task 必须有 review.json/.test(src), 'Execute Task Review Gate 活块已删（仅存墓碑注释）')
  assert.ok(src.includes('review-unsupervised-escape'), '豁免遥测事件名在场')
})

test('③ 生成侧三处指引钉', () => {
  for (const f of ['src/stages/brainstorm.js', 'src/stages/plan.js', 'src/stages/execute.js']) {
    const t = readFileSync(join(ROOT, f), 'utf8')
    assert.ok(t.includes('review-unsupervised.md'), `${f} 豁免句含声明文件名`)
    assert.ok(t.includes('不做自审表演'), `${f} 豁免语义明确（不自审）`)
  }
})
