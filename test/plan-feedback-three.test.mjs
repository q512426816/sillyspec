/**
 * 三坑回归（2026-08-22 plan 阶段反馈）：
 *   ① TaskCard 生成 prompt 明示「frontmatter 字段式 vs body 章节」形态
 *   ② design 文件清单组合路径单元格拆分（router.py + service.py）
 *   ③ quick/plan 同文件并发宽严差异在两处提示里明示设计原因
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'node:url'
import { parseFileChangeList } from '../src/change-list.js'
import { buildCoordinatorStep } from '../src/stages/plan.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== ② 组合路径单元格拆分（坑 design-combined-cell-mismatch）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'comb-'))
  const design = path.join(d, 'design.md')
  const mk = (cell) => {
    fs.writeFileSync(design, `# D\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | ${cell} | x |\n`)
    return [...parseFileChangeList(design)].sort()
  }
  assertTrue(JSON.stringify(mk('router.py + service.py')) === JSON.stringify(['router.py', 'service.py']),
    `"a + b" 拆两路径（实际 ${JSON.stringify(mk('router.py + service.py'))}）`)
  assertTrue(JSON.stringify(mk('a.ts、b.ts')) === JSON.stringify(['a.ts', 'b.ts']), '顿号 、 拆分')
  assertTrue(JSON.stringify(mk('src/x.js／src/y.js')) === JSON.stringify(['src/x.js', 'src/y.js']), '全角斜杠 ／ 拆分')
  assertTrue(JSON.stringify(mk('a.py;b.py')) === JSON.stringify(['a.py', 'b.py']), '分号拆分')
  assertTrue(JSON.stringify(mk('single.ts')) === JSON.stringify(['single.ts']), '单路径零变化')
  // 管道 | 在 markdown 表格里先分列（split('|')），单元格里不会出现——管道拆分针对非表格场景（如 design 正文），此处不测
  // 单元格内含说明文字混路径（looksLikePath 过滤脏文本）
  assertTrue(JSON.stringify(mk('src/real.ts + 说明性自由文本不带扩展名')) === JSON.stringify(['src/real.ts']), '自由文本 token 被滤，真实路径保留')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ① 生成 prompt 形态警告（坑 taskcard-body-section-rework）===\n')
{
  const step = buildCoordinatorStep('/tmp/x', [{ num: '01', name: 't' }])
  const prompt = step?.prompt || ''
  assertTrue(prompt.includes('frontmatter') && prompt.includes('不是 body 章节'), 'prompt 明示「frontmatter 字段式 vs body 章节」')
  assertTrue(prompt.includes('三组校验全挂'), '点明返工后果')
  assertTrue(prompt.includes('骨架即正确形态'), '引导先跑骨架再 Edit')
}

console.log('\n=== ③ 宽严差异双向明示（坑 concurrent-policy-inconsistency）===\n')
{
  const sharedSrc = fs.readFileSync(join(root, 'src', 'run', 'shared.js'), 'utf8')
  assertTrue(sharedSrc.includes('边界说明') && sharedSrc.includes('两阶段宽严不同是设计使然'),
    'quick 同文件并发提示附「边界说明：quick 轻量流程最坏后果 git 可分离；plan 硬拦因并行覆盖不可恢复」')
  const ppSrc = fs.readFileSync(join(root, 'src', 'stages', 'plan-postcheck.js'), 'utf8')
  assertTrue(ppSrc.includes('两阶段宽严不同是设计使然'), 'plan 同 Wave 冲突报错附同款差异说明')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
