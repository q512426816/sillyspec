// 2026-11-06-knowledge-propose-body-file——propose 正文文件通道
// 平台会话实证（2026-11-06）：中文长正文经命令行传递被 Runtime Policy 朴素分词误杀
// （「斜杠+中文标点」序列被误判为不存在的假路径，PowerShell/Bash 双中招）。本文件锁
// FR-01~05：--body-file 主路径落盘一致/互斥报错/结构化错误码零落盘/既有 --body 零回归/
// help+usage 文案同步。正文样本特意含误杀序列，验证文件通道畅通。

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { cmdPropose } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `kpb-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(dir) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }

/** 捕获 console.log 跑 cmdPropose，返回解析后的输出 JSON。 */
async function runPropose(dir, args) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await cmdPropose(dir, args, {})
  } finally { console.log = orig }
  const text = lines.join('\n')
  const start = text.indexOf('{')
  return start >= 0 ? JSON.parse(text.slice(start)) : { ok: false, _raw: text }
}

const proposedDirOf = (dir) => join(dir, '.sillyspec', 'knowledge', 'proposed')

// 误杀序列正文样本：斜杠路径形态 + 紧跟中文标点 + 多行——经命令行必被策略层拦截的形态
const BODY = [
  '根因：非工作区会话创建时 cwd 为空，reopen 依赖 cwd 定位 Claude transcript',
  '（transcript 按 projects/<encoded-cwd>/ 归档），2026-08-21 DS-7 决策提前 409 拒绝。',
  '',
  '规避：把会话建在工作区下，结束后即可重开续聊。',
].join('\n')

// ── T1: --body-file 主路径落盘与源文件一致 ──
console.log('\n=== T1: --body-file 主路径落盘与源文件一致 ===')
{
  const dir = setup('t1')
  try {
    const bodyFile = join(dir, 'body.md')
    writeFileSync(bodyFile, BODY, 'utf8')
    const r = await runPropose(dir, ['--title', '非工作区会话重开', '--body-file', bodyFile])
    ok(r.ok === true, `ok:true（实得 ok=${r.ok}，error=${JSON.stringify(r.error)}）`)
    ok(r.action === 'created', 'action:created')
    const propPath = join(proposedDirOf(dir), '非工作区会话重开.md')
    ok(existsSync(propPath), `落盘 proposed/非工作区会话重开.md`)
    const content = readFileSync(propPath, 'utf8')
    ok(content.includes(BODY), '正文段与源文件逐字一致（含误杀序列文本）')
    ok(content.includes('status: pending_review'), 'frontmatter status 行保持')
    ok(content.includes('# 非工作区会话重开'), '标题行保持')

    // 空文件：文件通道逐字（空正文落空，不走 argv 兜底串）
    const emptyFile = join(dir, 'empty.md')
    writeFileSync(emptyFile, '', 'utf8')
    const r2 = await runPropose(dir, ['--title', '空正文条目', '--body-file', emptyFile])
    ok(r2.ok === true, '空文件 ok:true')
    const c2 = readFileSync(join(proposedDirOf(dir), '空正文条目.md'), 'utf8')
    ok(!c2.includes('(no body provided)'), '空文件落空正文（不落 argv 兜底串）')
  } finally { clean(dir) }
}

// ── T2: --body 与 --body-file 互斥报错且零落盘 ──
console.log('\n=== T2: --body 与 --body-file 互斥报错且零落盘 ===')
{
  const dir = setup('t2')
  try {
    const bodyFile = join(dir, 'body.md')
    writeFileSync(bodyFile, BODY, 'utf8')
    const r = await runPropose(dir, ['--title', '冲突条目', '--body', 'argv正文', '--body-file', bodyFile])
    ok(r.ok === false, `ok:false（实得 ok=${r.ok}）`)
    ok(r.error && r.error.code === 'body_source_conflict', `error.code=body_source_conflict（实得 ${JSON.stringify(r.error)}）`)
    ok(!existsSync(proposedDirOf(dir)), 'proposed/ 目录未创建（零落盘）')
  } finally { clean(dir) }
}

// ── T3: 缺失/不可读结构化错误码且零落盘 ──
console.log('\n=== T3: 缺失/不可读结构化错误码且零落盘 ===')
{
  const dir = setup('t3')
  try {
    const r1 = await runPropose(dir, ['--title', '缺失条目', '--body-file', join(dir, 'nope.md')])
    ok(r1.ok === false, '缺失文件 ok:false')
    ok(r1.error && r1.error.code === 'body_file_missing', `error.code=body_file_missing（实得 ${JSON.stringify(r1.error)}）`)
    ok(!existsSync(proposedDirOf(dir)), '缺失路径零落盘')

    // 不可读：body-file 指向目录（readFileSync 抛 EISDIR）
    mkdirSync(join(dir, 'adir'))
    const r2 = await runPropose(dir, ['--title', '不可读条目', '--body-file', join(dir, 'adir')])
    ok(r2.ok === false, '目录作 body-file ok:false')
    ok(r2.error && r2.error.code === 'body_file_read_failed', `error.code=body_file_read_failed（实得 ${JSON.stringify(r2.error)}）`)
    ok(r2.error && typeof r2.error.reason === 'string' && r2.error.reason.length > 0, 'error 附 reason 摘要')
    ok(!existsSync(proposedDirOf(dir)), '不可读路径零落盘')
  } finally { clean(dir) }
}

// ── T4: 既有 --body 形态零回归对照 ──
console.log('\n=== T4: 既有 --body 形态零回归对照 ===')
{
  const dir = setup('t4')
  try {
    const r = await runPropose(dir, ['--title', '旧形态', '--body', 'argv正文', '--from', 'some-change'])
    ok(r.ok === true, '--body argv 形态 ok:true')
    const content = readFileSync(join(proposedDirOf(dir), '旧形态.md'), 'utf8')
    ok(content.includes('argv正文'), '--body 正文落盘保持')
    ok(content.includes('source: some-change'), '--from source 行保持')

    const r2 = await runPropose(dir, ['--title', '无正文'])
    ok(r2.ok === true, '无 body 调用 ok:true')
    const c2 = readFileSync(join(proposedDirOf(dir), '无正文.md'), 'utf8')
    ok(c2.includes('(no body provided)'), '无 body 时兜底串保持')
    ok(!c2.includes('source:'), '无 --from 时无 source 行保持')

    const r3 = await runPropose(dir, ['--title', '分类', '--category', 'known-issues', '--body', 'x'])
    ok(r3.ok === true && r3.category === 'known-issues', '--category 回显保持')
    ok(readFileSync(join(proposedDirOf(dir), '分类.md'), 'utf8').includes('category: known-issues'), 'frontmatter category 行保持')
  } finally { clean(dir) }
}

// ── T5: help 与 usage 文案同步 ──
console.log('\n=== T5: help 与 usage 文案同步 ===')
{
  const kj = readFileSync(join(root, 'src', 'stages', 'knowledge.js'), 'utf8')
  ok(kj.includes('--body-file'), 'cmdKnowledge --help 文案含 --body-file')
  ok(kj.includes('从文件读正文'), 'help 注明从文件读正文语义')
  const idx = readFileSync(join(root, 'src', 'index.js'), 'utf8')
  ok(idx.includes('--body-file'), 'src/index.js usage 含 --body-file')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
