/**
 * quick-recommend.test.mjs — 推荐打分单测
 * 覆盖：脏文件命中 / 任务描述命中 / 双信号叠加 / 都不命中 / 空活跃变更 / 排序
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { recommendChanges } from '../src/quick-recommend.js'

const passed = []
const failed = []
function assert(label, cond) {
  ;(cond ? passed : failed).push(label)
  if (!cond) console.error(`  ❌ ${label}`)
}

function setupTmp() {
  const root = mkdtempSync(join(tmpdir(), 'qrec-'))
  const specDir = join(root, '.sillyspec')
  return { root, specDir, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

function writeChange(specDir, name, { designFiles = [], proposalText = '' } = {}) {
  const dir = join(specDir, 'changes', name)
  mkdirSync(dir, { recursive: true })
  if (designFiles.length) {
    const rows = designFiles.map((f) => `| 修改 | \`${f}\` | x |`).join('\n')
    writeFileSync(
      join(dir, 'design.md'),
      `# ${name}\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|------|----------|------|\n${rows}\n`,
    )
  } else {
    writeFileSync(join(dir, 'design.md'), `# ${name}\n\n无文件清单\n`)
  }
  writeFileSync(join(dir, 'proposal.md'), proposalText || `# ${name} proposal\n`)
}

// 测试 1：脏文件命中
{
  const { specDir, cleanup } = setupTmp()
  try {
    writeChange(specDir, 'change-a', { designFiles: ['src/foo.js', 'src/bar.js'] })
    writeChange(specDir, 'change-b', { designFiles: ['docs/x.md'] })
    const r = recommendChanges({
      activeChanges: ['change-a', 'change-b'],
      specDir,
      baselineFiles: ['src/foo.js'],
      taskDescription: '',
    })
    const a = r.find((x) => x.name === 'change-a')
    const b = r.find((x) => x.name === 'change-b')
    assert('脏文件命中：change-a score>0', a.score > 0)
    assert('脏文件命中：change-a reasons 含「脏文件命中」', a.reasons.some((rr) => rr.startsWith('脏文件命中')))
    assert('脏文件未命中：change-b score=0', b.score === 0)
    assert('排序：高分在前', r[0].name === 'change-a')
  } finally {
    cleanup()
  }
}

// 测试 2：任务描述命中
{
  const { specDir, cleanup } = setupTmp()
  try {
    writeChange(specDir, 'parser-fix', { proposalText: '# 解析器重构\n本变更修复解析器逻辑\n' })
    writeChange(specDir, 'unrelated', { proposalText: '# 文档更新\n' })
    const r = recommendChanges({
      activeChanges: ['parser-fix', 'unrelated'],
      specDir,
      taskDescription: '修复解析器 bug',
    })
    const p = r.find((x) => x.name === 'parser-fix')
    const u = r.find((x) => x.name === 'unrelated')
    assert('描述命中：parser-fix score>0', p.score > 0)
    assert('描述命中：reasons 含「任务描述命中」', p.reasons.some((rr) => rr.startsWith('任务描述命中')))
    assert('描述未命中：unrelated score=0', u.score === 0)
  } finally {
    cleanup()
  }
}

// 测试 3：双信号叠加
{
  const { specDir, cleanup } = setupTmp()
  try {
    writeChange(specDir, 'both', { designFiles: ['src/foo.js'], proposalText: '# 解析器\n修复解析器\n' })
    const r = recommendChanges({
      activeChanges: ['both'],
      specDir,
      baselineFiles: ['src/foo.js'],
      taskDescription: '修解析器',
    })
    assert('双信号叠加 score=2', r[0].score === 2)
    assert('双信号 reasons 数=2', r[0].reasons.length === 2)
  } finally {
    cleanup()
  }
}

// 测试 4：都不命中
{
  const { specDir, cleanup } = setupTmp()
  try {
    writeChange(specDir, 'c', { designFiles: ['src/x.js'], proposalText: '# 其他\n' })
    const r = recommendChanges({
      activeChanges: ['c'],
      specDir,
      baselineFiles: ['src/unrelated.js'],
      taskDescription: '别的任务',
    })
    assert('都不命中 score=0', r[0].score === 0)
    assert('都不命中 reasons 为空', r[0].reasons.length === 0)
  } finally {
    cleanup()
  }
}

// 测试 5：空活跃变更
{
  const r = recommendChanges({ activeChanges: [], specDir: '/tmp/x', baselineFiles: ['a.js'] })
  assert('空活跃变更返回 []', Array.isArray(r) && r.length === 0)
}

// 测试 6：无 design/proposal 文件不报错（robustness）
{
  const { specDir, cleanup } = setupTmp()
  try {
    mkdirSync(join(specDir, 'changes', 'empty'), { recursive: true }) // 无任何文件
    const r = recommendChanges({ activeChanges: ['empty'], specDir, baselineFiles: ['a.js'], taskDescription: 'x' })
    assert('缺文件不报错 score=0', r[0].score === 0)
  } finally {
    cleanup()
  }
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
