/**
 * 坑 flowdone-lint-fail-no-output 回归：flow done lint 门 FAIL 时「命令与输出尾部见上」
 * 名不副实——runVerifyLintCheck 全程静默、lint 结果不落 test-result.json（tally 只记一句）。
 *
 * 锁定：
 *   ① persistLintResult：并入 test 结果文件（modules 并列一节 lint）；test 无结果文件时
 *      独立落盘（kind: 'lint'）；skipped lint 不落。
 *   ② e2e：flow done lint 门 FAIL → 输出 lint 命令 + 输出尾部 + 失败文件 + 结果文件，
 *      test-result.json 含 lint 节。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { persistLintResult } = await import('../src/verify-postcheck.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'lfail-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① persistLintResult 三态：并入 / 独立落盘 / skipped 不落', () => {
  const d = fx()
  const specBase = join(d, '.sillyspec')
  // 并入分支：伪造既有 test-result.json
  const runDir = join(specBase, '.runtime', 'verify-runs', '20260101000000')
  mkdirSync(runDir, { recursive: true })
  const trp = join(runDir, 'test-result.json')
  writeFileSync(trp, JSON.stringify({ change: 'c1', status: 'passed', modules: [] }))
  const p1 = persistLintResult({ specBase, changeName: 'c1', testResultPath: trp, lint: { status: 'failed', command: 'ruff check .', exitCode: 1, outputTail: 'a.py:1:1 E501', reason: 'lint 命令退出码 1', failureFiles: ['a.py'] } })
  assert.equal(p1, trp, '返回并入路径')
  const j = JSON.parse(readFileSync(trp, 'utf8'))
  assert.equal(j.lint.command, 'ruff check .', 'lint 并入 test-result.json（modules 并列节）')
  assert.equal(j.modules.length, 0, '既有字段不受扰')

  // 独立落盘分支：无 testResultPath
  const p2 = persistLintResult({ specBase, changeName: 'c2', testResultPath: null, lint: { status: 'failed', command: 'x', exitCode: 1, outputTail: 'y', reason: null } })
  assert.ok(p2 && existsSync(p2), '独立落盘在场')
  const j2 = JSON.parse(readFileSync(p2, 'utf8'))
  assert.equal(j2.kind, 'lint', 'kind: lint 标识')
  assert.equal(j2.status, 'failed')

  // skipped 不落
  const p3 = persistLintResult({ specBase, changeName: 'c3', testResultPath: null, lint: { status: 'skipped' } })
  assert.equal(p3, null, 'skipped 不落盘')
})

test('② e2e：flow done lint 门 FAIL 输出 lint 命令/尾部/失败文件，结果并入 test-result.json', () => {
  const cwd = fx()
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  // lint 命令失败且输出提及本变更文件（归属鉴定硬拦口径）
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node lint-fail.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'lint-fail.js'), "console.error('src/work.js:1:1 E501 line too long (fake lint)'); process.exit(1)\n")
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-03-lint-fail-x'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--input', 'lint 失败输出可见性\n\n成功标准：\n- lint 门红时输出含命令与尾部', '--no-review'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  // 填槽 + 干活提交（task token 进 subject 过哨兵；交付 src/ 代码文件才起 test+lint 门——
  // 非代码文件不触门，test/lint 双 — 是首轮假绿的根因）
  // ⚠️ 2026-10-04-thin-docs-v2 适配（zcode-thin-docs-v2 会话代改，非本变更原作者）：起草已是
  // v2 纯 markdown（零 AGENT 槽）——填槽改正文作答；done 前需 spec 断点批准（flow approve）。
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：lint 输出夹具'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在 lint 门红时输出命令与尾部（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：门禁夹具'))
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const x = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', 'work task-01'])
  const ap = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'approve', '--change', cn], { cwd, encoding: 'utf8', timeout: 60_000, env })
  assert.equal(ap.status, 0, `approve 失败: ${ap.stderr}`)

  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 180_000, env })
  assert.notEqual(s2.status, 0, `lint 门红应 FAIL（实际 ${s2.status}）: ${(s2.stdout + s2.stderr).split('\n').filter((l) => /实测面|测试门/.test(l)).join(' | ')}`)
  const out = s2.stdout + s2.stderr
  assert.ok(out.includes('测试门 FAIL'), 'FAIL 主输出在场')
  assert.ok(out.includes('lint 命令：node lint-fail.js'), `lint 命令打印：${out.split('\n').filter((l) => l.includes('lint 命令')).join(' | ')}`)
  assert.ok(out.includes('lint 输出尾部'), '输出尾部段在场')
  assert.ok(out.includes('src/work.js:1:1'), '尾部含失败行内容')
  assert.ok(out.includes('lint 失败文件') && out.includes('src/work.js'), '失败文件清单在场')
  // 持久化：test-result.json 含 lint 节（test 通过 → 并入分支）
  const runsDir = join(cwd, '.sillyspec', '.runtime', 'verify-runs')
  const dirs = readdirSync(runsDir).sort()
  const latest = dirs[dirs.length - 1]
  const tr = JSON.parse(readFileSync(join(runsDir, latest, 'test-result.json'), 'utf8'))
  assert.equal(tr.lint && tr.lint.status, 'failed', `test-result.json 含 lint 节（kind=${tr.kind || 'test'}）`)
  assert.equal(tr.lint.command, 'node lint-fail.js')
})
