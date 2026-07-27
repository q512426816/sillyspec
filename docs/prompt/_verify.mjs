/**
 * 核验 docs/prompt/<stage>.md 里的 prompt 原文是否与 _extracted.json 逐字一致。
 * 用法：node docs/prompt/_verify.mjs
 *
 * 原理：提取 md 里所有 3+ 反引号 fence 块，对 _extracted.json 的每个 prompt
 * 检查是否在 md 中存在逐字相等的 fence 块。逐字一致 = 子代理没有改写。
 *
 * 动态阶段（plan/execute）有预期 miss（示例值/省略重复 Wave），脚本会列出
 * 供人工确认；静态阶段应为全绿。
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./', import.meta.url))
const json = JSON.parse(readFileSync(new URL('./_extracted.json', import.meta.url), 'utf8'))

function extractFences(md) {
  const blocks = []
  // 开 fence = 行首 3+ 反引号 (+可选语言)，闭 fence = 同数量反引号；\1 反向引用保证配对
  const re = /(^|\n)(`{3,})([^\n`]*)\n([\s\S]*?)\n\2(?=\n|$)/g
  let m
  while ((m = re.exec(md)) !== null) {
    blocks.push({ content: m[4], ticks: m[2].length })
  }
  return blocks
}

let checks = 0, match = 0
const miss = []
const missingFiles = []

for (const [stage, v] of Object.entries(json)) {
  const mdPath = new URL(`./${stage}.md`, import.meta.url)
  if (!existsSync(mdPath)) { missingFiles.push(stage); continue }
  const md = readFileSync(mdPath, 'utf8')
  const fences = extractFences(md)
  const ticks4 = fences.filter(f => f.ticks >= 4).length
  const jsonPrompts = (v.steps || []).filter(s => s.prompt && s.prompt.trim().length > 0)
  console.log(`\n=== ${stage} === json有prompt步骤=${jsonPrompts.length}  md-fence块=${fences.length}(4反引号=${ticks4})`)
  for (const s of jsonPrompts) {
    checks++
    const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\n+$/, '')
    if (fences.some(f => norm(f.content) === norm(s.prompt))) {
      match++
    } else {
      miss.push(`${stage}#${s.index} [${s.name}] (${s.prompt.length}字)`)
      console.log(`  ❌ 未逐字匹配: step#${s.index} [${s.name}]`)
    }
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`逐字一致: ${match}/${checks}`)
if (missingFiles.length) console.log(`⚠️ 缺失文件: ${missingFiles.join(', ')}`)
if (miss.length) {
  console.log(`\n未匹配 ${miss.length} 处（动态阶段 plan/execute 的示例值或省略 Wave 属预期，静态阶段应为 0）:`)
  console.log('  ' + miss.join('\n  '))
}
