import { readFileSync, writeFileSync } from 'node:fs'
import { unlinkSync } from 'node:fs'

const p = '.sillyspec/changes/2026-10-15-eval-workdir-naming/review.json'
const BS = String.fromCharCode(92)
let raw = readFileSync(p, 'utf8')
const bad = '[^' + BS + 'd]'
const good = '[^' + BS + BS + 'd]'
if (raw.includes(bad)) {
  raw = raw.replace(bad, good)
  writeFileSync(p, raw)
  console.log('已修复 \\d → \\\\d')
} else {
  console.log('未找到待修复序列')
}
JSON.parse(readFileSync(p, 'utf8'))
console.log('JSON.parse 通过')
try {
  unlinkSync('quicklog/tmp-scan-review.mjs')
  console.log('临时脚本已删')
} catch {}
