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
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { extractSuccessCriteria } from '../src/flow-draft.js'

const ROOT = join(import.meta.dirname, '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

/** 递归列出目录下指定扩展名文件（workspace 相对路径，/ 分隔——跨平台） */
const listFiles = (dir, exts) =>
  readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
    .map((e) => relative(ROOT, join(e.parentPath, e.name)).replace(/\\/g, '/'))

/** 分号内联旧形态（照抄提取 0 条——探针实证） */
const SEMICOLON_FORM = '--input "<动机与背景；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』>"'

/** 倒推行引号内联模糊形态（2026-10-05-input-teach-non-src 清零对象） */
const VAGUE_FORM = '--input "<已做改动的描述＋成功标准>"'

/** src 教学点定点文件（实例在场断言——2026-10-05-flow-help-status 实测定位 7 处 + 零残留断言新抓 3 处） */
const TEACH_FILES = [
  'src/run/command.js',
  'src/flow.js',
  'src/index.js',
  'src/hooks/worktree-guard.js',
  'src/stages/brainstorm.js',
  'src/run/stage.js',
]

/** 非 src 教学面：定点文件 + 递归目录（init 分发源与本仓已装副本） */
const NON_SRC_FILES = ['AGENTS.md', 'CLAUDE.md']
const NON_SRC_DIRS = ['assets/command-cards', '.claude/skills', 'templates']

test('① 分号内联教学形态零残留（src 递归遍历——2026-10-05-input-teach-non-src 升级，防新文件回流）', () => {
  const files = listFiles('src', ['.js', '.mjs', '.cjs'])
  assert.ok(files.length > 50, `递归扫描面有效（实际 ${files.length} 文件）`)
  const hits = files.filter((p) => read(p).includes(SEMICOLON_FORM))
  assert.deepEqual(hits, [], `src 零残留（命中：${hits.join(', ')}）`)
})

test('①b 非 src 教学面分号形态零残留（逐字三处清零）', () => {
  const files = [
    ...NON_SRC_FILES,
    ...NON_SRC_DIRS.flatMap((d) => listFiles(d, ['.md'])),
  ]
  assert.ok(files.length >= 15, `非 src 扫描面有效（实际 ${files.length} 文件）`)
  const hits = files.filter((p) => read(p).includes(SEMICOLON_FORM))
  assert.deepEqual(hits, [], `非 src 教学面零残留（命中：${hits.join(', ')}）`)
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

test('②b 非 src 教学面实例在场与模糊形态清零', () => {
  // 逐字两处（CLAUDE.md / flow.md 卡）与描述式两处（AGENTS.md / SKILL.md）均带实例
  for (const p of ['CLAUDE.md', 'assets/command-cards/flow.md', 'AGENTS.md', '.claude/skills/sillyspec-flow/SKILL.md']) {
    const src = read(p)
    assert.ok(src.includes('--input "<动机与背景>'), `${p} 实例起行`)
    assert.ok(src.includes('- <可验证标准>'), `${p} 实例条目行`)
  }
  // 倒推行引号内联模糊形态清零（AGENTS.md 与模板源）
  for (const p of ['AGENTS.md', 'templates/agents-instruction.md']) {
    assert.ok(!read(p).includes(VAGUE_FORM), `${p} 无倒推行模糊引号形态`)
  }
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

test('④ design 锚防改写教学在协议提示面（2026-10-07-thin-tasks-v3 文件内指令迁出）', () => {
  const draftSrc = read('src/flow-draft.js')
  assert.ok(!draftSrc.includes('勿删勿改'), '模板文件内指令已清零')
  const flowSrc = read('src/flow.js')
  assert.ok(flowSrc.includes('答案写在问题下方'), '横幅：作答位置教学（答案写在问题下方）')
  assert.ok(flowSrc.includes('勿改写'), '横幅：锚行防改写教学')
})
