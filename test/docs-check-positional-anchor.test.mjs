/**
 * 纯位置锚语法 `file.js:line?`（2026-09-11 用户实证 docs gate 误伤：跨文件引用+反话论述——
 * 锚 A 文件而行内反引号 token 全是 B 概念，层 2 窗口断言必失败，被迫删行号绕开）。
 *
 * 锁定语义：
 *   - collectDocRefs：`?` 尾标解析进 kwSkip；无 `?` 零变化
 *   - runDocsCheck：kwSkip 引用跳过层 2（B 概念 token 不再误伤），层 1 照校（坏行号仍拦）
 *   - 层 2 失败 reason 附 `?` 语法教学（不用删行号绕开）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { collectDocRefs, runDocsCheck } from '../src/docs-check.js'

const tmpRoots = []
function mk() { const d = mkdtempSync(join(tmpdir(), 'dcpa-')); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function setup() {
  const root = mk()
  mkdirSync(join(root, 'src'), { recursive: true })
  // A 文件（锚点）：内容与 B 概念无关
  writeFileSync(join(root, 'src', 'a-file.js'), 'export function alphaTask() {\n  return 1\n}\n')
  mkdirSync(join(root, 'docs'), { recursive: true })
  return root
}

test('collectDocRefs：? 尾标 → kwSkip=true；无 ? 零变化', () => {
  const refs = collectDocRefs('见 src/a-file.js:2?（论述）与 src/a-file.js:1')
  assert.equal(refs.length, 2)
  assert.equal(refs[0].kwSkip, true, '? 尾标解析进 kwSkip')
  assert.equal(refs[1].kwSkip, false, '无 ? 零变化')
})

test('runDocsCheck：跨文件论述行（token 全是 B 概念）——裸锚误伤、? 锚放行', () => {
  const root = setup()
  // 反话论述形态：锚 A 文件，行内反引号 token 全是 B 文件的概念（createMission/dispatchWorker）
  const doc = '不同于 `createMission` 的派发形态（src/a-file.js:1），本设计改走 `dispatchWorker` 直读\n'
  writeFileSync(join(root, 'docs', 'design.md'), doc)

  const bare = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
  assert.equal(bare.ok, false, '裸锚（现状）：B 概念 token 对 A 窗口断言必失败——用户实证的误伤')
  assert.ok(bare.invalid.some(i => i.reason.includes('关键词缺失')), '失败归因层 2')

  writeFileSync(join(root, 'docs', 'design.md'),
    '不同于 `createMission` 的派发形态（src/a-file.js:1?），本设计改走 `dispatchWorker` 直读\n')
  const marked = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
  assert.equal(marked.ok, true, '? 纯位置锚跳过层 2——不再被迫删行号')
})

test('runDocsCheck：? 锚层 1 照校（坏行号/缺文件仍拦）', () => {
  const root = setup()
  writeFileSync(join(root, 'docs', 'design.md'), '锚过界（src/a-file.js:99?）仍应拦截\n')
  const r1 = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
  assert.equal(r1.ok, false, '? 不豁免层 1 行界')
  assert.ok(r1.invalid.some(i => i.reason.includes('超界')), '归因行号超界（非关键词）')

  writeFileSync(join(root, 'docs', 'design.md'), '缺文件（src/nope.js:1?）仍应拦截\n')
  const r2 = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
  assert.equal(r2.ok, false, '? 不豁免层 1 存在性')
})

test('层 2 失败 reason 附 ? 语法教学（指引加尾标而非删行号）', () => {
  const root = setup()
  writeFileSync(join(root, 'docs', 'design.md'), '`betaConcept` 论述（src/a-file.js:1）\n')
  const r = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
  assert.equal(r.ok, false)
  const hit = r.invalid.find(i => i.reason.includes('关键词缺失'))
  assert.ok(hit && hit.reason.includes('? 跳过关键词断言'), `教学提示在场（实际：${hit && hit.reason.slice(-90)}）`)
})
