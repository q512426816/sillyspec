/**
 * change-list-operation.test.mjs — design 文件清单 operation 字段解析单测
 * 覆盖：表格操作列识别 / 列顺序反转 / 无操作列 / 分类列表子标题映射 /
 *       EXCLUDE 优先（### 不修改文件 含「修改」二字不误匹配）/ 中英归一化 / 向后兼容
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { parseFileChangeList, parseFileChangeListDetailed } from '../src/change-list.js'

const passed = []
const failed = []
function assert(label, cond) {
  ;(cond ? passed : failed).push(label)
  if (!cond) console.error(`  ❌ ${label}`)
}

function setupTmp() {
  const root = mkdtempSync(join(tmpdir(), 'clop-'))
  const specDir = join(root, '.sillyspec')
  return { root, specDir, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

function writeDesign(specDir, name, body) {
  const dir = join(specDir, 'changes', name)
  mkdirSync(dir, { recursive: true })
  const p = join(dir, 'design.md')
  writeFileSync(p, body)
  return p
}

const SECTION = (table) => `# x\n\n## 文件变更清单\n\n${table}\n`

// 测试 1：表格操作列识别（默认 操作|路径|说明 顺序）
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c1', SECTION(
      `| 操作 | 文件路径 | 说明 |\n|------|----------|------|\n| 删除 | src/a.js | 替代 |\n| 新增 | src/b.js | 新建 |`
    ))
    const byPath = Object.fromEntries(parseFileChangeListDetailed(p).map(x => [x.path, x.operation]))
    assert('表格 op 列：src/a.js operation=删除', byPath['src/a.js'] === '删除')
    assert('表格 op 列：src/b.js operation=新增', byPath['src/b.js'] === '新增')
  } finally { cleanup() }
}

// 测试 2：表格列顺序反转（路径|操作|说明）
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c2', SECTION(
      `| 文件路径 | 操作 | 说明 |\n|----------|------|------|\n| src/b.js | 修改 | x |`
    ))
    const byPath = Object.fromEntries(parseFileChangeListDetailed(p).map(x => [x.path, x.operation]))
    assert('列顺序反转：src/b.js operation=修改', byPath['src/b.js'] === '修改')
  } finally { cleanup() }
}

// 测试 3：表格无操作列 → operation=null
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c3', SECTION(
      `| 文件路径 | 说明 |\n|----------|------|\n| src/c.js | x |`
    ))
    const e = parseFileChangeListDetailed(p)
    const c = e.find(x => x.path === 'src/c.js')
    assert('无操作列：src/c.js 仍被解析', c?.path === 'src/c.js')
    assert('无操作列：operation=null', c?.operation === null)
  } finally { cleanup() }
}

// 测试 4-6：分类列表子标题映射 + EXCLUDE 优先
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c4',
      `# x\n\n## 文件变更清单\n\n### 删除文件\n- src/d.js\n\n### 新增文件\n- src/e.js\n\n### 修改文件\n- src/f.js\n\n### 不修改文件\n- src/g.js\n`)
    const e = parseFileChangeListDetailed(p)
    const paths = e.map(x => x.path)
    const byPath = Object.fromEntries(e.map(x => [x.path, x.operation]))
    assert('分类列表：src/d.js operation=删除', byPath['src/d.js'] === '删除')
    assert('分类列表：src/e.js operation=新增', byPath['src/e.js'] === '新增')
    assert('分类列表：src/f.js operation=修改', byPath['src/f.js'] === '修改')
    assert('EXCLUDE 优先：### 不修改文件 下的 src/g.js 不出现', !paths.includes('src/g.js'))
  } finally { cleanup() }
}

// 测试 7：中英归一化
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c5', SECTION(
      `| 操作 | 文件路径 | 说明 |\n|------|----------|------|\n| create | src/e.js | x |\n| delete | src/f.js | x |\n| new | src/g.js | x |\n| update | src/h.js | x |`
    ))
    const byPath = Object.fromEntries(parseFileChangeListDetailed(p).map(x => [x.path, x.operation]))
    assert('中英归一：create→新增', byPath['src/e.js'] === '新增')
    assert('中英归一：delete→删除', byPath['src/f.js'] === '删除')
    assert('中英归一：new→新增', byPath['src/g.js'] === '新增')
    assert('中英归一：update→修改', byPath['src/h.js'] === '修改')
  } finally { cleanup() }
}

// 测试 8：向后兼容（entry 字段齐全 + parseFileChangeList 仍返回 Set）
{
  const { specDir, cleanup } = setupTmp()
  try {
    const p = writeDesign(specDir, 'c6', SECTION(
      `| 操作 | 文件路径 | 说明 |\n|------|----------|------|\n| 修改 | src/x.js | 顺带修复：补注释 |`
    ))
    const detailed = parseFileChangeListDetailed(p)
    const x = detailed.find(e => e.path === 'src/x.js')
    assert('向后兼容：entry 含 path', x && typeof x.path === 'string')
    assert('向后兼容：entry 含 operation（=修改）', x && x.operation === '修改')
    assert('向后兼容：entry 含 incidental（顺带修复命中=true）', x && x.incidental === true)
    const set = parseFileChangeList(p)
    assert('向后兼容：parseFileChangeList 返回 Set', set instanceof Set)
    assert('向后兼容：Set 含 src/x.js', set.has('src/x.js'))
  } finally { cleanup() }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed.length}`)
console.log(`❌ 失败: ${failed.length}`)
console.log(`${'='.repeat(50)}`)

if (failed.length > 0) {
  console.log('\n失败详情:')
  for (const f of failed) console.log(`  ❌ ${f}`)
}

process.exit(failed.length > 0 ? 1 : 0)
