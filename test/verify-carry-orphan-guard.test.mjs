// FR-03（2026-10-16-fix-downstream-tool-defects）：verify 携载孤儿残行 + 门禁误归属双缺陷回归。
//
// 坑（2026-10-16 下游实证）：--force 携载把旧模板占位行（| :--- | 对齐分隔行 / | — | 全
// 占位行）当「已填行」搬进新渲染中部（mergeProbeSection 过滤器只认纯 ASCII --- 与字面
// <待填/<TODO）；门禁 extractAcceptanceMatrixSlots 按最近前置 **task-NN** 锚行归属每条
// 五列行——残行落在最后锚之后被栽给尾任务（文档同步类）误报「N 行判定未填」。
// 修法：携载过滤器补两类排除形态；门禁引入表头武装 + 携载注释解除武装，无武装五列行进
// 独立 strayRows 孤行桶，validateAcceptanceMatrix 产独立孤行报错要求裁决。
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applySkeletonPreservingHuman } from '../src/verify-probes.js'
import { runValidators, extractAcceptanceMatrixSlots } from '../src/stage-contract.js'
import { IR_STRICT_SINCE } from '../src/constants.js'

const tmpRoots = []
after(() => { for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* best effort */ } } })

const PROBE7_HEAD = [
  '#### 探针 7：验收×测试覆盖矩阵',
  '',
  '**task-01**',
  '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
  '|---|---|---|---|---|',
].join('\n')

const FILLED_ROW_JIA = '| 甲项（旧验收） | `test/a.test.mjs` | 命中 | covered | `test/a.test.mjs` |'
const FILLED_ROW_YI = '| 乙项（已从 design 撤下） | `test/b.test.mjs` | 命中 | covered | `test/b.test.mjs` |'
const ALIGNED_SEPARATOR = '| :--- | :--- | :--- | :--- | :--- |'
const EMDASH_PLACEHOLDER = '| — | — | — | — | — |'

test('1. 携载过滤：对齐分隔行与全占位行不再搬入新渲染（红→绿）；键漂移已填行仍携载', () => {
  const oldText = [
    '## 探针结果（CLI 机械预填）',
    '',
    PROBE7_HEAD,
    FILLED_ROW_JIA,
    ALIGNED_SEPARATOR,
    EMDASH_PLACEHOLDER,
    FILLED_ROW_YI,
    '',
  ].join('\n')
  const skeletonText = [
    '## 探针结果（CLI 机械预填）',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 新丙项 | `test/c.test.mjs` | 命中 | <待填：五选一> | <TODO> |',
    '',
  ].join('\n')

  const r = applySkeletonPreservingHuman(oldText, skeletonText)
  assert.equal(r.text.includes(ALIGNED_SEPARATOR), false, '对齐分隔行 :--- 不得携载进新渲染')
  assert.equal(r.text.includes(EMDASH_PLACEHOLDER), false, '全占位行 — 不得携载进新渲染')
  assert.equal(r.text.includes('|---|---|---|---|---|'), true, '骨架自身的纯 ASCII 分隔行照常在场')
  assert.equal(r.text.includes(FILLED_ROW_JIA), true, '键漂移已填行（甲）仍携载——已填格不丢')
  assert.equal(r.text.includes(FILLED_ROW_YI), true, '键漂移已填行（乙）仍携载')
  assert.equal(r.text.includes('<!-- refresh 携载的已填行'), true, '携载块带归属注释（agent 裁决去留）')
  // carriedRows 计的是「同键原位替换」数；表头行不属已填行不入携载面（评审 P3-3 整改后，
  // 旧表头同键自匹配也不再计数）→ 本用例无同键数据行，计数 0；键漂移已填行走 stale 追加
  assert.equal(r.carriedRows, 0)
})

test('2. 门禁孤行桶：携载注释后的残行不栽给最近 task 锚（红→绿）', () => {
  const md = [
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 判定枚举解析 | `test/x.test.mjs` | 命中 | covered | `test/x.test.mjs` |',
    '',
    '<!-- refresh 携载的已填行（新渲染中无同键行，agent 裁决去留） -->',
    '| 残行一 | test/x.test.mjs | 命中 | — | — |',
    '| 残行二 | | | <待填：五选一> | <TODO> |',
    '',
  ].join('\n')
  const m = extractAcceptanceMatrixSlots(md)
  assert.equal(m.present, true)
  assert.equal(m.rows.length, 1, '正常表行只计 1（残行不入任务矩阵）')
  assert.equal(m.rows[0].task, 'task-01')
  assert.equal(m.unfilled, 0, `残行不计 unfilled（实际 ${m.unfilled}）`)
  assert.equal(m.missingEvidence, 0)
  assert.equal(Array.isArray(m.strayRows), true, 'strayRows 桶字段在场')
  assert.equal(m.strayRows.length, 2, `两条残行进孤行桶（实际 ${m.strayRows.length}）`)
  assert.equal(m.strayRows[0].acceptance, '残行一')
})

test('3. 门禁兼容：正常渲染（锚行→表头→分隔→数据行）零行为变化', () => {
  const md = [
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 判定枚举解析 | `test/x.test.mjs` | 命中 | covered | `test/x.test.mjs` |',
    '| 证据锚点核验 | `test/x.test.mjs` | 命中 | <待填：五选一> | <TODO> |',
    '',
    '**task-02**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 丙项 | `test/y.test.mjs` | 命中 | non-testable | 构建期产物，运行期不可测 |',
    '',
  ].join('\n')
  const m = extractAcceptanceMatrixSlots(md)
  assert.equal(m.rows.length, 3)
  assert.equal(m.unfilled, 1, '未填判定照旧计 unfilled')
  assert.equal(m.strayRows.length, 0, '正常渲染无孤行')
  assert.equal(m.rows[2].task, 'task-02', '锚行归属照旧')
})

// ── validateAcceptanceMatrix 经 runValidators('verify') 注册链 ──

function makeChange(cn, { verifyMd }) {
  const root = mkdtempSync(join(tmpdir(), 'carry-orphan-'))
  tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '---',
    `created_at: ${IR_STRICT_SINCE} 08:00:00`,
    '---',
    '# 设计', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/feature.js | 特性 |', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: 实现\n')
  mkdirSync(join(changeDir, 'tasks'))
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: 门禁', 'allowed_paths:', '  - src/stage-contract.js',
    'acceptance:', '  - 判定枚举解析', '---', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'verify-result.md'), verifyMd)
  return { root, cn }
}

function verifyDoc(bodyLines) {
  return ['# 验证报告', '', '结论枚举：PASS', '', bodyLines.join('\n'), ''].join('\n')
}

test('4. 孤行报错：残行产独立 errors 要求裁决（红→绿：此前误报「判定未填」栽给尾任务）', () => {
  const { root, cn } = makeChange('carry-orphan-gate', {
    verifyMd: verifyDoc([
      PROBE7_HEAD,
      '| 判定枚举解析 | `test/x.test.mjs` | 命中 | covered | `test/x.test.mjs` |',
      '',
      '<!-- refresh 携载的已填行（新渲染中无同键行，agent 裁决去留） -->',
      '| 残行一 | test/x.test.mjs | 命中 | — | — |',
      '| 残行二 | | | <待填：五选一> | <TODO> |',
    ]),
  })
  const r = runValidators('verify', root, cn)
  assert.equal(r.ok, false, '残行仍阻断（报告不得带垃圾）')
  const orphanErr = r.errors.find((e) => e.includes('孤行'))
  assert.ok(orphanErr, `应有独立「孤行」报错（实际 errors=${JSON.stringify(r.errors)}）`)
  assert.ok(orphanErr.includes('2 行'), '报错点数残行条数')
  assert.ok(orphanErr.includes('残行一'), '报错点名残行内容')
  assert.equal(r.errors.some((e) => e.includes('判定未填')), false, '残行不再被计为「判定未填」（此前误栽给最近 task 锚的报错消失）')
})

test('5. 兼容：干净报告（正常表行）不产孤行报错', () => {
  const { root, cn } = makeChange('carry-clean-gate', {
    verifyMd: verifyDoc([
      PROBE7_HEAD,
      '| 判定枚举解析 | `test/x.test.mjs` | 命中 | covered | `test/x.test.mjs` |',
    ]),
  })
  const r = runValidators('verify', root, cn)
  // 干净报告不受孤行门误伤（其他 validator 面——facts 缺失 fail-closed 等——不属本变更口径，
  // acceptance-matrix-gate.test.mjs 全链路用例已覆盖）
  assert.equal(r.errors.some((e) => e.includes('孤行')), false, `孤行门不误伤干净报告（实际 errors=${JSON.stringify(r.errors)}）`)
})
