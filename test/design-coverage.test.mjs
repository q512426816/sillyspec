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

  it('标题带编号前缀「6. 文件变更清单」→ 仍能解析（P1-4，修 plan-postcheck 硬阻断）', () => {
    // 回归：brainstorm Step11 模板鼓励 design 章节带编号（## 6. 文件变更清单），
    // 旧 FILE_LIST_SECTION_RE 不认编号前缀 → parseFileChangeList 返回空 → plan Step4 误判「清单解析为空」阻断。
    writeDesign(dir, designMd({ sectionTitle: '6. 文件变更清单', table: [
      { op: '新增', path: 'src/a.js' },
      { op: '修改', path: 'src/b.js' },
    ] }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))].sort(), ['src/a.js', 'src/b.js'])
    // 括号编号也兼容
    writeDesign(dir, designMd({ sectionTitle: '6) 文件变更清单', table: [{ op: '修改', path: 'src/c.js' }] }))
    assert.deepEqual([...parseFileChangeList(join(dir, 'design.md'))], ['src/c.js'])
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

  it('design 清单章节带编号（## 6. 文件变更清单）→ 覆盖对账正常，不再误判缺清单（P1-4）', () => {
    // 回归 2026-07-13 issue：编号前缀让 parseFileChangeList 返回空 → postcheck 抛
    // 「design file coverage check failed」硬阻断。修复后应与无编号写法一致地通过。
    writeDesign(dir, designMd({ sectionTitle: '6. 文件变更清单', table: [{ op: '修改', path: 'src/a.js' }] }))
    writeTask(dir, 'task-01', ['src/a.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.uncovered.length, 0)
    assert.ok(r.designFiles.includes('src/a.js'))
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

// ─── 跨仓分段（task-03 / 约束③ / D-014）─────────────────────────────────
// design §6 支持 `## <repo> 仓变更` 段头按仓分段，task allowed_paths 按 (repo, path) 二元组归属，
// 跨仓 task 只覆盖对应 repo 段——避免跨仓文件永远报「未覆盖」阻断 plan。

// 带 repo 字段的 task 卡（跨仓 task）
function taskFileRepo(id, repo, allowedPaths) {
  const lines = ['---', `id: ${id}`, `title: ${id}`, `repo: ${repo}`, 'allowed_paths:']
  for (const p of allowedPaths) lines.push(`  - ${p}`)
  lines.push('---', 'goal: >', '  test', 'acceptance:', '  - test')
  return lines.join('\n') + '\n'
}
const writeTaskRepo = (d, id, repo, allowedPaths) =>
  writeFileSync(join(d, 'tasks', `${id}.md`), taskFileRepo(id, repo, allowedPaths))

describe('validateDesignFileCoverage 跨仓分段（D-014）', () => {
  let dir
  beforeEach(() => { dir = join(tmpdir(), `sillyspec-cov-x-${Math.random().toString(36).slice(2)}`); mkdirSync(join(dir, 'tasks'), { recursive: true }) })
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }) } catch {} })

  it('§6 含 ## sillyspec 仓变更 段：跨仓文件由 sillyspec task 覆盖 → 通过', () => {
    // 主段（无段头前）归 main：src/main.js 由主仓 task 覆盖
    // 段头 ## sillyspec 仓变更 下的 src/task-review.js 由 repo:sillyspec task 覆盖
    writeDesign(dir, designMd({ raw: [
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/main.js | 主仓 |',
      '',
      '## sillyspec 仓变更',
      '',
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/task-review.js | 跨仓 sillyspec |',
    ].join('\n') }))
    writeTask(dir, 'task-01', ['src/main.js'])
    writeTaskRepo(dir, 'task-02', 'sillyspec', ['src/task-review.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.uncovered.length, 0)
  })

  it('跨仓文件未被对应 repo task 覆盖 → 报未覆盖（含 [repo] 前缀）', () => {
    writeDesign(dir, designMd({ raw: [
      '## sillyspec 仓变更',
      '',
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/task-review.js | 跨仓 |',
    ].join('\n') }))
    // 只有主仓 task（无 repo），跨仓段无 sillyspec task 覆盖
    writeTask(dir, 'task-01', ['src/task-review.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, false)
    assert.ok(r.errors.some(e => e.includes('sillyspec') && e.includes('task-review.js')), r.errors.join('; '))
  })

  it('跨仓 task 的 allowed_paths 不覆盖主仓段同名文件（二元组隔离）', () => {
    // 主仓段 src/shared.js + sillyspec 段 src/shared.js 同名，但分属不同 repo
    // 主仓 task 覆盖主仓段、sillyspec task 覆盖 sillyspec 段 → 都通过
    writeDesign(dir, designMd({ raw: [
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/shared.js | 主仓 |',
      '',
      '## sillyspec 仓变更',
      '',
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/shared.js | 跨仓 |',
    ].join('\n') }))
    writeTask(dir, 'task-01', ['src/shared.js'])
    writeTaskRepo(dir, 'task-02', 'sillyspec', ['src/shared.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('段头带编号前缀（## 2. sillyspec 仓变更）→ 仍识别', () => {
    writeDesign(dir, designMd({ raw: [
      '## 2. sillyspec 仓变更',
      '',
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/foo.js | 跨仓 |',
    ].join('\n') }))
    writeTaskRepo(dir, 'task-01', 'sillyspec', ['src/foo.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.uncovered.length, 0)
  })

  it('段头 h3（### sillyspec 仓变更）→ 识别（容忍层级）', () => {
    writeDesign(dir, designMd({ raw: [
      '### sillyspec 仓变更',
      '',
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/bar.js | 跨仓 |',
    ].join('\n') }))
    writeTaskRepo(dir, 'task-01', 'sillyspec', ['src/bar.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('多仓分段（main + sillyspec + multi-agent-platform）→ 各段各 task 覆盖', () => {
    writeDesign(dir, designMd({ raw: [
      '| 操作 | 文件路径 | 说明 |',
      '|---|---|---|',
      '| 修改 | src/a.js | main |',
      '',
      '## sillyspec 仓变更',
      '',
      '| 修改 | src/b.js | sillyspec |',
      '',
      '## multi-agent-platform 仓变更',
      '',
      '| 修改 | src/c.js | map |',
    ].join('\n') }))
    writeTask(dir, 'task-01', ['src/a.js'])
    writeTaskRepo(dir, 'task-02', 'sillyspec', ['src/b.js'])
    writeTaskRepo(dir, 'task-03', 'multi-agent-platform', ['src/c.js'])
    const r = validateDesignFileCoverage(dir)
    assert.equal(r.ok, true, JSON.stringify(r.errors))
  })

  it('无段头（单仓 design）→ 退化为 main 全覆盖对账（零回归）', () => {
    // 与既有「通过」用例同款，确认分段逻辑不破坏单仓退化
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
})
