/**
 * 把 _extracted.json 的 step prompt 同步进 docs/prompt/<stage>.md 的「提示词原文」fence。
 * 用法：node docs/prompt/_sync.mjs [stage ...]（缺省 = 全部阶段；动态阶段 plan/execute 跳过）
 *
 * 规则：
 *   - 只替换既有 fence 的内容（\`\`\`\`markdown … \`\`\`\`），不新增章节；缺 fence 的步骤列出人工补
 *   - Step 标题行（## Step n/M：<名>）顺带同步为当前 step 名
 *   - 行尾统一写回 LF（坑 verify-md-crlf：verify.md 曾整文件 CRLF 导致 _verify 提取 0 块）
 *
 * 流水线：改 src/stages/<stage>.js → node _extract.mjs → node _sync.mjs → node _verify.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const json = JSON.parse(readFileSync(join(__dirname, '_extracted.json'), 'utf8'))
const DYNAMIC = ['plan', 'execute'] // 步骤由 build*Steps 动态构建，md 里的 fence 带示例值，不机械同步

const wanted = process.argv.slice(2)
const stages = wanted.length ? wanted : Object.keys(json).filter(s => !DYNAMIC.includes(s))

const OPEN = '\n````markdown\n'
const CLOSE = '\n````\n'

for (const stage of stages) {
  const def = json[stage]
  const mdPath = join(__dirname, `${stage}.md`)
  if (!def || !existsSync(mdPath)) { console.log(`⚠️ ${stage}: 无定义或无 ${stage}.md，跳过`); continue }
  let md = readFileSync(mdPath, 'utf8').replace(/\r\n?/g, '\n')
  const report = []

  for (const s of def.steps || []) {
    if (!s.prompt || !s.prompt.trim()) continue
    const headRe = new RegExp(`^## Step ${s.index + 1}/${def.stepsCount}[：:].*$`, 'm')
    const head = md.match(headRe)
    if (!head) { report.push(`  ❌ step#${s.index} [${s.name}]: 找不到标题行，人工处理`); continue }
    const wantHead = `## Step ${s.index + 1}/${def.stepsCount}：${s.name}`
    if (head[0] !== wantHead) {
      md = md.replace(head[0], wantHead)
      report.push(`  🔖 step#${s.index} 标题同步: "${head[0].slice(2)}" → "${wantHead.slice(2)}"`)
    }
    const headEnd = md.indexOf(head[0]) + head[0].length
    const open = md.indexOf(OPEN, headEnd)
    if (open === -1) { report.push(`  ❌ step#${s.index} [${s.name}]: 标题后无 4 反引号 fence，人工补`); continue }
    const contentStart = open + OPEN.length
    const close = md.indexOf(CLOSE, contentStart)
    if (close === -1) { report.push(`  ❌ step#${s.index} [${s.name}]: fence 未闭合，人工处理`); continue }
    const old = md.slice(contentStart, close)
    if (old === s.prompt) { report.push(`  ✅ step#${s.index} [${s.name}]: 已一致`); continue }
    md = md.slice(0, contentStart) + s.prompt + md.slice(close)
    report.push(`  🔄 step#${s.index} [${s.name}]: fence 已替换（${old.length} → ${s.prompt.length} 字）`)
  }

  writeFileSync(mdPath, md, 'utf8')
  console.log(`=== ${stage} ===`)
  console.log(report.join('\n') || '  （无可同步步骤）')
}
