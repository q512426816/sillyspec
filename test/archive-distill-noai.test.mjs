/**
 * archive「decision-distill 决策提炼」步 noAI 化（P0-4 安全变体，noai-ir-roadmap §3）：
 * executeArchiveDistill 把旧 prompt 的「调 CLI 纯函数转述输出」中继下沉为机械执行——
 * written 逐条打印 / skipped 零输出注记 / needsWait 打印裁决指引（人工裁决收敛到
 * 「确认归档 --confirm」）/ 异常降级不抛。全路径不抛是硬契约（裁决是确认步输入）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { executeArchiveDistill } from '../src/run/archive-distill.js'

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'adist-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add -A && git commit -qm init', { cwd: dir })
  const specBase = join(dir, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  return { dir, specBase, changeDir: join(specBase, 'changes', 'c1') }
}

function captureLogs(fn) {
  const out = [], err = []
  const ol = console.log, oe = console.warn
  console.log = (...a) => out.push(a.map(String).join(' '))
  console.warn = (...a) => err.push(a.map(String).join(' '))
  try { fn() } finally { console.log = ol; console.warn = oe }
  return { out: out.join('\n'), err: err.join('\n') }
}

test('常规：入选决策机械写入 knowledge/decisions/，不抛', async () => {
  const fx = makeFixture()
  try {
    writeFileSync(join(fx.changeDir, 'decisions.md'), [
      '---', 'author: t', 'created_at: 2026-09-10 00:00:00', '---', '',
      '## D-001@v1 用 CLI 纯函数做决策提炼',
      '- 状态：confirmed',
      '- 类型：process',
      '- 模块域：core-engine',
      '',
    ].join('\n'))
    const { out } = captureLogs(() => {}) // 占位防 lint 未用
    const logs = { out: '', err: '' }
    const ol = console.log
    const buf = []
    console.log = (...a) => buf.push(a.map(String).join(' '))
    try {
      await executeArchiveDistill({ cwd: fx.dir, specBase: fx.specBase, changeName: 'c1' })
    } finally { console.log = ol }
    const text = buf.join('\n')
    assert.ok(text.includes('决策提炼（CLI 机械执行'), '机械执行标记')
    assert.ok(existsSync(join(fx.specBase, 'knowledge', 'decisions', 'core-engine.md')), '知识库域文件已写')
    assert.ok(readFileSync(join(fx.specBase, 'knowledge', 'decisions', 'core-engine.md'), 'utf8').includes('D-001@v1'), '条目落盘')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})

test('零输出：无 decisions.md → skipped 注记不建文件', async () => {
  const fx = makeFixture()
  try {
    const buf = []
    const ol = console.log
    console.log = (...a) => buf.push(a.map(String).join(' '))
    try {
      await executeArchiveDistill({ cwd: fx.dir, specBase: fx.specBase, changeName: 'c1' })
    } finally { console.log = ol }
    const text = buf.join('\n')
    assert.ok(text.includes('零输出'), '零输出注记')
    assert.ok(text.includes('decisions.md 不存在'), '原因=文件缺失')
    assert.ok(!existsSync(join(fx.specBase, 'knowledge')), '不创建任何知识库文件')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})

test('needsWait：rejected 缺字段 → 打印裁决指引且不抛（裁决是确认归档步的输入）', async () => {
  const fx = makeFixture()
  try {
    // D-001 implemented 正常提炼 + D-002 rejected 缺否决理由 → needsWait
    writeFileSync(join(fx.changeDir, 'decisions.md'), [
      '---', 'author: t', 'created_at: 2026-09-10 00:00:00', '---', '',
      '## D-001@v1 常规决策',
      '- 状态：confirmed',
      '- 类型：process',
      '- 模块域：core-engine',
      '',
      '## D-002@v1 缺字段的否决决策',
      '- 状态：rejected',
      '- 类型：architecture',
      '',
    ].join('\n'))
    const buf = [], wbuf = []
    const ol = console.log, ow = console.warn
    console.log = (...a) => buf.push(a.map(String).join(' '))
    console.warn = (...a) => wbuf.push(a.map(String).join(' '))
    try {
      await executeArchiveDistill({ cwd: fx.dir, specBase: fx.specBase, changeName: 'c1' })
    } finally { console.log = ol; console.warn = ow }
    const text = buf.join('\n') + '\n' + wbuf.join('\n')
    assert.ok(text.includes('needsWait'), 'needsWait 提示在场')
    assert.ok(text.includes('确认归档'), '裁决指引指向确认归档步')
    assert.ok(text.includes('D-001@v1') || text.includes('1 条已写入'), '其余条目照常提炼')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})
