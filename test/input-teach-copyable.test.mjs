/**
 * 2026-10-05-input-teach-copyable 回归：--input 教学可照抄化 + design 模板锚教学防替换
 *
 * 背景（2026-10-05-flow-help-status 实测）：7 处 CLI 教学为分号内联描述形态，
 * 字面照抄 extractSuccessCriteria 提取 0 条、exit 2（探针实证）；design 模板
 * 「答案直接写在问题下方」未防「答案整块替换问题原文」失败模式（三度同型锚拒收）。
 *
 * 锁定：
 *   ① 分号内联旧教学形态零残留（7 处教学所在文件）
 *   ② 各教学处带可照抄多行实例（--input "<动机与背景> 起行 + - <可验证标准>" 收行）
 *   ③ 实例核心形态（顶格/缩进两版）喂 extractSuccessCriteria 提取 ≥ 1 条；
 *      分号内联形态提取 0 条（零残留断言的语义依据）
 *   ④ design 模板锚教学含「问题行勿删勿改勿替换 + 答案另起一行」措辞
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractSuccessCriteria } from '../src/flow-draft.js'

const ROOT = join(import.meta.dirname, '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

/** 分号内联教学所在文件（2026-10-05-flow-help-status 实测定位 7 处 + 本变更零残留断言新抓 3 处：command.js 两处、stage.js 一处） */
const TEACH_FILES = [
  'src/run/command.js',
  'src/flow.js',
  'src/index.js',
  'src/hooks/worktree-guard.js',
  'src/stages/brainstorm.js',
  'src/run/stage.js',
]

/** 分号内联旧形态（照抄提取 0 条——探针实证） */
const SEMICOLON_FORM = '--input "<动机与背景；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』>"'

test('① 分号内联教学形态零残留', () => {
  for (const p of TEACH_FILES) {
    assert.ok(!read(p).includes(SEMICOLON_FORM), `${p} 无分号内联形态`)
  }
})

test('② 各教学处带可照抄多行实例', () => {
  for (const p of TEACH_FILES) {
    const src = read(p)
    assert.ok(src.includes('--input "<动机与背景>'), `${p} 实例起行（--input "<动机与背景>）`)
    assert.ok(src.includes('- <可验证标准>'), `${p} 实例条目行（- <可验证标准>）`)
  }
  // worktree-guard 三处 stage 提示各带一份实例
  const guard = read('src/hooks/worktree-guard.js')
  assert.ok((guard.match(/- <可验证标准>/g) || []).length >= 3, 'worktree-guard 三处 stage 提示各带实例')
})

test('③ 实例核心形态可提取成功标准（缩进容忍）', () => {
  const flat = extractSuccessCriteria('<动机与背景>\n\n成功标准：\n- <可验证标准>')
  assert.ok(flat.length >= 1, '顶格实例形态提取 ≥ 1 条')
  const indented = extractSuccessCriteria('     <动机与背景>\n\n     成功标准：\n     - <可验证标准>')
  assert.ok(indented.length >= 1, '带展示缩进的照抄形态提取 ≥ 1 条（行级 trim）')
})

test('③b 分号内联形态提取 0 条（零残留断言的语义依据）', () => {
  const out = extractSuccessCriteria('修复文档缺口；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』')
  assert.equal(out.length, 0)
})

test('④ design 模板锚教学防替换措辞', () => {
  const src = read('src/flow-draft.js')
  assert.ok(src.includes('勿删勿改'), '模板教学含「勿删勿改」')
  assert.ok(src.includes('答案另起一行'), '模板教学含「答案另起一行写在问题行下方」')
})
