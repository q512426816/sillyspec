/**
 * design.md 文件覆盖对账测试
 *
 * 命中场景：design.md 声明要改某源码文件（如 access-guide UI），但没有任何 task 的
 * allowed_paths 覆盖它 → execute 子代理被 allowed_paths 锁死不能碰它 → 「页面还是错的」，
 * 而 verify 一路对照 task 卡片循环验证照样 PASS。
 *
 * 覆盖：
 * 1. parseFileChangeList: 表格 / 分类列表 / 列顺序 / 标题同义词 / CRLF / 归一化（change-list.js）
 * 2. globMatch / pathMatches: 容差匹配基础（*、**、?、前缀双向）
 * 3. validateDesignFileCoverage: plan-postcheck 确定性对账（plan 阶段阻断）
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseFileChangeList, globMatch, pathMatches } from '../src/change-list.js'
import { validateDesignFileCoverage } from '../src/stages/plan-postcheck.js'

// ─── 辅助 ────────────────────────────────────────────────────────────────

function designMd({ table = null, list = null, crlf = false, sectionTitle = '文件变更清单', raw = null } = {}) {
  const parts = ['# D', '', `## ${sectionTitle}`, '']
  if (raw !== null) {
    parts.push(raw)
  } else {
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

// inline 数组格式 allowed_paths: [a, b]
function taskFileInline(id, allowedPaths) {
  const lines = ['---', `id: ${id}`, `title: ${id}`, `allowed_paths: [${allowedPaths.join(', ')}]`,
    '---', 'goal: >', '  test', 'acceptance:', '  - test']
  return lines.join('\n') + '\n'
}

const writeDesign = (dir, content) => writeFileSync(join(dir, 'design.md'), content)
const writeTask = (dir, id, allowedPaths) => writeFileSync(join(dir, 'tasks', `${id}.md`), taskFile(id, allowedPaths))

// ─── globMatch ───────────────────────────────────────────────────────────

describe('globMatch', () => {
  it('无通配符 → false（由调用方做完全相等判断）', () => {
    assert.equal(globMatch('src/a.js', 'src/a.js'), false)
  })

  it('`*` 单段通配（不跨 /）', () => {
    assert.equal(globMatch('src/ab.js', 'src/*.js'), true)
    assert.equal(globMatch('src/sub/ab.js', 'src/*.js'), false, '* 不应跨目录')
  })

  it('`**` 跨目录通配', () => {
    assert.equal(globMatch('src/sub/deep/a.js', 'src/**/a.js'), true)
    assert.equal(globMatch('src/a.js', 'src/**/a.js'), true)
  })

  it('`?` 单字符通配（不当正则量词）', () => {
    assert.equal(globMatch('src/ab.ts', 'src/a?.ts'), true, '? 应匹配单字符 b')
    assert.equal(globMatch('src/a.ts', 'src/a?.ts'), false, '? 应强制占一位，a 后无字符不应匹配')
  })

  it('字面字符正确转义（. 不当任意字符）', () => {
    assert.equal(globMatch('src/aXjs', 'src/*.js'), false, '. 应为字面，aXjs 不应匹配 *.js')
    assert.equal(globMatch('src/a.js', 'src/*.js'), true)
  })
})

// ─── pathMatches ─────────────────────────────────────────────────────────

describe('pathMatches', () => {
  it('完全相等 / 行内注释归一化', () => {
    assert.equal(pathMatches('src/a.js', 'src/a.js'), true)
    assert.equal(pathMatches('src/a.js', '`src/a.js` (新增)'), true)
  })

  it('目录前缀双向 + glob 双向', () => {
    assert.equal(pathMatches('src/sub/a.js', 'src/sub/'), true)   // b 是 a 的目录
    assert.equal(pathMatches('src/sub/', 'src/sub/a.js'), true)   // 反向
    assert.equal(pathMatches('src/sub/a.js', 'src/*.js'), false)  // glob 不跨目录
    assert.equal(pathMatches('src/sub/a.js', 'src/**/*.js'), true) // ** 跨目录
  })
})

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
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))].sort(), ['src/a.js', 'src/b.js', 'src/c.js'])
  })

  it('表格列顺序非标准（文件路径在前）→ 仍正确定位路径列（P0-1）', () => {
    writeDesign(dir, designMd({ raw: [
      '| 文件路径 | 操作 | 说明 |',
      '|---|---|---|',
      '| src/access-guide.tsx | 修改 | UI 维度 |',
      '| src/binding.ts | 新增 | daemon 绑定 |',
    ].join('\n') }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files.sort(), ['src/access-guide.tsx', 'src/binding.ts'], `不应把操作名当路径，实际: ${JSON.stringify(files)}`)
  })

  it('标题同义词「File Changes」/「文件清单」→ 正常解析（P1-2）', () => {
    writeDesign(dir, designMd({ sectionTitle: 'File Changes', table: [{ op: '新增', path: 'src/a.js' }] }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], ['src/a.js'])
    writeDesign(dir, designMd({ sectionTitle: '文件清单', table: [{ op: '修改', path: 'src/b.js' }] }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], ['src/b.js'])
  })

  it('分类列表格式 B：新增/修改加入，不修改排除', () => {
    writeDesign(dir, designMd({ list: {
      add: ['.sillyspec/docs/x.md'],
      modify: ['src/stages/scan/*.md', 'src/stages/brainstorm.js'],
      keep: ['src/index.js'],
    } }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))].sort(), ['src/stages/brainstorm.js', 'src/stages/scan/*.md'])
  })

  it('分类列表近义 exclude 词：暂缓/暂不/保留 → 不计入清单（P1-5）', () => {
    writeDesign(dir, designMd({ raw: [
      '### 修改文件', '- `src/a.js`',
      '### 暂缓改动', '- `src/b.js`',
      '### 暂不修改', '- `src/c.js`',
    ].join('\n') }))
    const files = [...parseFileChangeList(join(dir, 'design.md'))]
    assert.deepEqual(files, ['src/a.js'], `暂缓/暂不应计入，实际: ${JSON.stringify(files)}`)
  })

  it('CRLF 容错：分隔行不产生垃圾项', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }], crlf: true }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], ['src/a.js'])
  })

  it('行内注释归一化：反引号 + 中英文括号', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: '`src/a.js`（新增方法）' },
      { op: '新增', path: '`src/b.js` (note)' },
    ] }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))].sort(), ['src/a.js', 'src/b.js'])
  })

  it('占位符 N/A / 无 → 过滤（P2-2）', () => {
    writeDesign(dir, designMd({ raw: [
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | N/A | 待定 |',
      '| 新增 | 无 | — |',
      '| 修改 | src/a.js | ok |',
    ].join('\n') }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], ['src/a.js'])
  })

  it('「不修改文件」子段排除表格已加入的文件', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }], list: { keep: ['src/a.js'] } }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], [])
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
      { op: '修改', path: 'frontend/src/pages/access-guide.tsx' },
    ] }))
    writeTask(dir, 'task-11', ['src/binding.ts'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    assert.ok(r.errors.some(e => e.includes('access-guide.tsx')), r.errors.join('; '))
  })

  it('路径前缀容差：task allowed_paths 写目录覆盖 design 具体文件', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/stages/scan/scan.js' }] }))
    writeTask(dir, 'task-01', ['src/stages/scan/'])
    assert.equal(validateDesignFileCoverage(dir).ok, true)
  })

  it('反向前缀容差：design 写目录、task 写具体文件（P2-1）', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/stages/scan/' }] }))
    writeTask(dir, 'task-01', ['src/stages/scan/scan.js'])
    assert.equal(validateDesignFileCoverage(dir).ok, true)
  })

  it('glob 容差：design 写 glob，task 写具体文件', () => {
    writeDesign(dir, designMd({ list: { modify: ['src/stages/scan/*.md'] } }))
    writeTask(dir, 'task-01', ['src/stages/scan/scan.md'])
    assert.equal(validateDesignFileCoverage(dir).ok, true)
  })

  it('glob 容差：** 跨目录（design 写 **，task 写深层文件）（P1-1）', () => {
    writeDesign(dir, designMd({ list: { modify: ['src/**/*.spec.ts'] } }))
    writeTask(dir, 'task-01', ['src/widgets/button/button.spec.ts'])
    assert.equal(validateDesignFileCoverage(dir).ok, true)
  })

  it('allowed_paths 行内注释容差：带 (新增) 仍匹配', () => {
    writeDesign(dir, designMd({ table: [{ op: '新增', path: 'src/a.js' }] }))
    writeTask(dir, 'task-01', ['src/a.js (新增)'])
    assert.equal(validateDesignFileCoverage(dir).ok, true)
  })

  it('inline 数组 allowed_paths 格式：[a, b] 仍可解析对账（P2-1）', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }, { op: '修改', path: 'src/b.js' }] }))
    writeFileSync(join(dir, 'tasks', 'task-01.md'), taskFileInline('task-01', ['src/a.js', 'src/b.js']))
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('多文件漏覆盖全报（互不掩盖）', () => {
    writeDesign(dir, designMd({ table: [
      { op: '修改', path: 'src/a.js' },
      { op: '修改', path: 'src/b.js' },
      { op: '修改', path: 'src/c.js' },
    ] }))
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    const err = r.errors.join('; ')
    assert.ok(err.includes('src/b.js') && err.includes('src/c.js'), err)
    assert.ok(!err.includes('src/a.js'), '已覆盖的 a.js 不该出现在未覆盖列表')
  })

  it('阻断：有 task 但 design 无清单章节 → error（P1-3）', () => {
    writeFileSync(join(dir, 'design.md'), '# D\n\n## 别的\n\n内容\n')
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    assert.ok(r.errors.some(e => e.includes('文件变更清单')), r.errors.join('; '))
  })

  it('fail-open：无 task 卡片 + design 无清单 → ok（none 级别兼容，P1-3）', () => {
    writeFileSync(join(dir, 'design.md'), '# D\n\n## 别的\n\n内容\n')
    rmSync(join(dir, 'tasks'), { recursive: true, force: true })
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true)
  })

  it('fail-open：design.md 不存在 → ok', () => {
    rmSync(join(dir, 'tasks'), { recursive: true, force: true })
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true)
    assert.deepEqual(r.designFiles, [])
  })

  it('fail-open：无 tasks/ 目录（none/light 兼容）→ ok', () => {
    writeDesign(dir, designMd({ table: [{ op: '修改', path: 'src/a.js' }] }))
    rmSync(join(dir, 'tasks'), { recursive: true, force: true })
    assert.equal(validateDesignFileCoverage(dir).ok, true)
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
