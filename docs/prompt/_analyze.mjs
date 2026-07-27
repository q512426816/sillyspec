import { readFileSync } from 'node:fs'
const d = JSON.parse(readFileSync(new URL('./_extracted.json', import.meta.url), 'utf8'))
const PH = /<(?:git-user|now-datetime|now-timestamp|now-date|change-name|project|quick-session-id|quicklog-id|linked-changes)>|\{(?:SPEC_ROOT|DOCS_ROOT|PROJECTS_ROOT|WORKFLOWS_ROOT|KNOWLEDGE_ROOT|KNOWLEDGE_HIT_REPORT|EXECUTE_RUN_ID|REVIEW_TIER|REVIEW_TIER_REASON|STAGE_REVIEW_RUN_ID|REVIEW_JSON_CONTRACT)\}/g
console.log('阶段 / step / prompt字符数 / 含占位符')
for (const [k, v] of Object.entries(d)) {
  for (const s of v.steps || []) {
    const p = s.prompt || ''
    const found = [...new Set((p.match(PH) || []))]
    console.log(`  ${k.padEnd(15)} #${s.index} [${s.name}] chars=${p.length}${found.length ? '  → ' + found.join(', ') : ''}`)
  }
}
