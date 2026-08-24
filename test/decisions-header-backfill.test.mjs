/**
 * decisions.md header 自动补齐测试（坑 decisions-header-late-warning，2026-08-24 用户反馈二期：
 * brainstorm step8 旧模板自带无 frontmatter 的 decisions 样例——agent 照抄生成必缺 header，
 * 拖到平台同步等后续环节才提示）。
 *
 * 覆盖：
 * 1. brainstorm/brainstorm-auto 模板含 frontmatter（根治侧，防回归）
 * 2. backfillFrontmatter 纯函数：无 frontmatter 补整块 / 有 --- 只补缺失键 / 已齐不变 / CRLF 归一
 * 3. ensureDecisionDocHeader：无 header 补（author=git user）/ 已齐幂等 false / 无文件 false
 * 4. fixScanDocHeaders 回归（重构后共用 backfillFrontmatter，行为不变）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { backfillFrontmatter, fixScanDocHeaders } from '../src/scan-postcheck.js'
import { ensureDecisionDocHeader } from '../src/stage-contract.js'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { definition as brainstormAutoDef } from '../src/stages/brainstorm-auto.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

console.log('--- 1. 模板含 frontmatter（根治侧）---')
{
  const prompts = [
    ['brainstorm step8', brainstormDef.steps.map(s => s.prompt || '').join('\n')],
    ['brainstorm-auto', brainstormAutoDef.steps.map(s => s.prompt || '').join('\n')],
  ]
  for (const [name, text] of prompts) {
    const decisionsBlock = text.slice(text.indexOf('decisions.md 格式要求') >= 0 ? text.indexOf('decisions.md 格式要求') : text.indexOf('#### decisions.md'))
    assert(decisionsBlock.includes('author: <git-user>') && decisionsBlock.includes('created_at: <now-datetime>'),
      `${name} decisions 模板含 author/created_at frontmatter`)
  }
}

console.log('--- 2. backfillFrontmatter 纯函数 ---')
{
  const r1 = backfillFrontmatter('# 决策记录（Decisions）\n\n## D-001@v1: x\n', { author: 't', createdAt: '2026-08-24 00:00:00' })
  assert(r1.changed && r1.content.startsWith('---\nauthor: t\ncreated_at: 2026-08-24 00:00:00\n---\n\n# 决策记录'), '无 frontmatter → 整块前置')

  const r2 = backfillFrontmatter('---\ncreated_at: 2026-01-01 00:00:00\n---\n# D\n', { author: 't', createdAt: '2026-08-24 00:00:00' })
  assert(r2.changed && r2.content.startsWith('---\nauthor: t\ncreated_at: 2026-01-01 00:00:00\n---'), '已有 frontmatter 只补缺失键（既有值保留）')

  const r3 = backfillFrontmatter('---\nauthor: a\ncreated_at: b\n---\n# D\n', { author: 't', createdAt: 'x' })
  assert(!r3.changed && r3.content === '---\nauthor: a\ncreated_at: b\n---\n# D\n', '已齐 → changed=false 原文返回')

  const crlf = '# D\r\n\r\n## D-001@v1: x\r\n'
  const r4 = backfillFrontmatter(crlf, { author: 't', createdAt: 'now' })
  assert(r4.changed && !r4.content.includes('\r'), '无 frontmatter 的 CRLF 内容 → 补齐并归一 LF')
}

console.log('--- 3. ensureDecisionDocHeader ---')
{
  const cwd = mkdtempSync(join(tmpdir(), 'dh-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 'tester'])
  const changeDir = join(cwd, '.sillyspec', 'changes', 'dh')
  mkdirSync(changeDir, { recursive: true })

  assert(ensureDecisionDocHeader(changeDir) === false, '无 decisions.md → false 不报错')

  writeFileSync(join(changeDir, 'decisions.md'), '# 决策记录（Decisions）\n\n## D-001@v1: 决策\n- status: accepted\n')
  const fixed = ensureDecisionDocHeader(changeDir)
  const content = readFileSync(join(changeDir, 'decisions.md'), 'utf8')
  assert(fixed === true, '缺 header → 返回 true（已补齐）')
  assert(content.startsWith('---\nauthor: tester\ncreated_at: '), '补的 author 取 git user.name（tester）')
  assert(content.includes('# 决策记录（Decisions）') && content.includes('## D-001@v1'), '正文原样保留')

  assert(ensureDecisionDocHeader(changeDir) === false, '二次调用幂等 false（header 已齐）')
  assert(readFileSync(join(changeDir, 'decisions.md'), 'utf8') === content, '幂等调用不改文件')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 4. fixScanDocHeaders 回归（重构共用 backfillFrontmatter）---')
{
  const cwd = mkdtempSync(join(tmpdir(), 'sfh-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't'])
  const scanDir = join(cwd, '.sillyspec', 'docs', 'proj', 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'PROJECT.md'), '# P\n\n内容\n')
  writeFileSync(join(scanDir, 'ARCHITECTURE.md'), '---\nauthor: x\ncreated_at: y\n---\n\n# A\n')
  const r = fixScanDocHeaders({ cwd })
  assert(r.fixed.length === 1 && r.fixed[0].endsWith('PROJECT.md'), `缺 header 的被补（fixed: ${r.fixed.length}）`)
  assert(r.skipped.length === 1 && r.skipped[0].endsWith('ARCHITECTURE.md'), '已齐的被跳过')
  const second = fixScanDocHeaders({ cwd })
  assert(second.fixed.length === 0 && second.skipped.length === 2, '幂等：二跑全跳过')
  rmSync(cwd, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
