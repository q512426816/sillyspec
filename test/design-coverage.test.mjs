/**
 * design.md 文件覆盖对账测试
 *
 * 命中场景：design.md 声明要改某源码文件（如 access-guide UI），但没有任何 task 的
 * allowed_paths 覆盖它 → execute 子代理被 allowed_paths 锁死不能碰它 → 「页面还是错的」，
 * 而 verify 一路对照 task 卡片循环验证照样 PASS。
 *
 * 覆盖：
 * 1. parseFileChangeList: 表格 / 分类列表 / CRLF / 归一化（change-list.js）
 * 2. validateDesignFileCoverage: plan-postcheck 确定性对账（plan 阶段阻断）
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseFileChangeList } from '../src/change-list.js'
import { validateDesignFileCoverage } from '../src/stages/plan-postcheck.js'

// ─── 辅助 ────────────────────────────────────────────────────────────────

function designMd({ table = null, list = null, crlf = false } = {}) {
  const parts = ['# D', '', '## 文件变更清单', '']
  if (table) {
    parts.push('| 操作 | 文件路径 | 说明 |', '|---|---|---|')
    for (const r of table) parts.push(`| ${r.op} | ${r.path} | ${r.note || ''} |`)
    parts.push('')
  }
  if (list) {
    const section = (title, items) => { if (items) { parts.push(`### ${title}`); for (const p of items) parts.push(`- \`${p}\``); parts.push('') } }
    section('新增文件', list.add)
    section('修改文件', list.modify)
    section('删除文件', list.delete)
    section('不修改文件', list.keep)
  }
  parts.push('## 后续章节', '', '其他内容，截断到这里')
  let text = parts.join('\n')
  if (crlf) text = text.replace(/\n/g, '\r\n')
  return text
}

function taskFile(id, allowedPaths) {
  const lines = ['---', `id: ${id}`, `title: ${id}`, 'allowed_paths:']
  for (const p of allowedPaths) lines.push(`  - ${p}`)
  lines.push('---', 'goal: >', '  test', 'acceptance:', '  - test')
  return lines.join('\n') + '\n'
}

function writeDesign(dir, content) { writeFileSync(join(dir, 'design.md'), content) }
function writeTask(dir, id, allowedPaths) { writeFileSync(join(dir, 'tasks', `${id}.md`), taskFile(id, allowedPaths)) }

// ─── parseFileChangeList ─────────────────────────────────────────────────

describe('parseFileChangeList', () => {
  let dir
  beforeEach(() => { dir = join(tmpdir(), `sillyspec-pcl-${Math.random().toString(36).slice(2)}`); mkdirSync(dir, { recursive: true }) })
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }) } catch {} })

  it('表格格式：解析路径，跳过表头/分隔行', () => {
    writeDesign(dir, designMd({ table: [
      { op: '新增', path: 'src/a.js' },
      { op: '修改', path: 'src/b.js', note: '新增 xx 方法' },
      { op: '删除', path: 'src/c.js' },
    ] }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files.sort(), ['src/a.js', 'src/b.js', 'src/c.js'])
  })

  it('分类列表格式 B：新增/修改加入，不修改排除', () => {
    writeDesign(dir, designMd({ list: {
      add: ['.sillyspec/docs/x.md'],          // .sillyspec/ 会被排除
      modify: ['src/stages/scan/*.md', 'src/stages/brainstorm.js'],
      keep: ['src/index.js'],                 // 不修改 → 不加入
    } }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files.sort(), ['src/stages/brainstorm.js', 'src/stages/scan/*.md'])
  })

  it('CRLF 容错：分隔行不产生垃圾项', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }], crlf: true }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files, ['src/a.js'], `不应包含分隔行残渣，实际: ${JSON.stringify(files)}`)
  })

  it('行内注释归一化：反引号 + 中英文括号', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: '`src/a.js`（新增方法）' },
      { op: '新增', path: '`src/b.js` (note)' },
    ] }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files.sort(), ['src/a.js', 'src/b.js'])
  })

  it('「不修改文件」子段排除表格已加入的文件', () => {
    writeDesign(dir, designMd({
      table: [{ op: '修改', path: 'src/a.js' }],
      list: { keep: ['src/a.js'] },
    }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files, [], 'src/a.js 应被「不修改文件」排除')
  })

  it('无「文件变更清单」章节 → 空集', () => {
    writeFileSync(join(dir, 'design.md'), '# D\n\n## 别的章节\n\n内容\n')
    assert.equal(parseFileChangeList(join(dir, 'design.md')).size, 0)
  })

  it('文件不存在 → 空集', () => {
    assert.equal(parseFileChangeList(join(dir, 'nope.md')).size, 0)
  })
})

// ─── validateDesignFileCoverage ──────────────────────────────────────────

describe('validateDesignFileCoverage', () => {
  let dir
  beforeEach(() => { dir = join(tmpdir(), `sillyspec-cov-${Math.random().toString(36).slice(2)}`); mkdirSync(join(dir, 'tasks'), { recursive: true }) })
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }) } catch {} })

  it('通过：design 文件全被 task allowed_paths 覆盖', () => {
    writeDesign(dir, designMd({ table: [
      { op: '新增', path: 'src/worktree.js' },
      { op: '修改', path: 'src/stages/execute.js' },
    ] }))
    writeTask(dir, 'task-01', ['src/worktree.js (新增)'])
    writeTask(dir, 'task-02', ['src/stages/execute.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.uncovered.length, 0)
  })

  it('失败：design 文件未被任何 task 覆盖（命中 access-guide UI 漏改场景）', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: 'src/binding.ts' },
      { op: '修改', path: 'frontend/src/pages/access-guide.tsx' },  // 没有任何 task 覆盖
    ] }))
    writeTask(dir, 'task-11', ['src/binding.ts'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    assert.ok(
      r.errors.some(e => e.includes('access-guide.tsx') && e.includes('未')),
      `错误信息应点出 access-guide.tsx 未被覆盖，实际: ${r.errors.join('; ')}`
    )
  })

  it('路径前缀容差：task allowed_paths 写目录覆盖 design 具体文件', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/stages/scan/scan.js' }] }))
    writeTask(dir, 'task-01', ['src/stages/scan/'])   // 目录前缀
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('glob 容差：design 写 glob，task 写具体文件（双向）', () => {
    writeDesign(dir, designMd({ list: { modify: ['src/stages/scan/*.md'] } }))
    writeTask(dir, 'task-01', ['src/stages/scan/scan.md'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('allowed_paths 行内注释容差：带 (新增) 仍匹配', () => {
    writeDesign(dir, designMd({ table: [{ op: '新增', path: 'src/a.js' }] }))
    writeTask(dir, 'task-01', ['src/a.js (新增)'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('多文件漏覆盖全报（互不掩盖）', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: 'src/a.js' },
      { op: '修改', path: 'src/b.js' },
      { op: '修改', path: 'src/c.js' },
    ] }))
    // 只覆盖 a.js
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    const err = r.errors.join('; ')
    assert.ok(err.includes('src/b.js'), err)
    assert.ok(err.includes('src/c.js'), err)
    assert.ok(!err.includes('src/a.js'), '已覆盖的 a.js 不该出现在未覆盖列表')
  })

  it('fail-open：design.md 不存在 → ok', () => {
    rmSync(join(dir, 'tasks'), { recursive: true, force: true })
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true)
    assert.deepEqual(r.designFiles, [])
  })

  it('fail-open：design 无清单章节 → warning 不阻断', () => {
    writeFileSync(join(dir, 'design.md'), '# D\n\n## 别的\n\n内容\n')
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true)
    assert.ok(r.warnings.some(w => w.includes('跳过文件覆盖对账')), r.warnings.join('; '))
  })

  it('fail-open：无 tasks/ 目录（none/light 兼容）→ ok', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }] }))
    rmSync(join(dir, 'tasks'), { recursive: true, force: true })
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true)
    assert.equal(r.uncovered.length, 0)
  })

  it('.sillyspec/ 文件不计入 design 清单（不强制 task 覆盖）', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: 'src/a.js' },
      { op: '新增', path: '.sillyspec/docs/sillyspec/modules/x.md' },
    ] }))
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.ok(!r.designFiles.some(f => f.startsWith('.sillyspec/')))
  })
})
