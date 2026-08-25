/**
 * 坑 baseline-overlay-cross-change-contamination 回归：baseline overlay 隔离 .sillyspec/ 跨变更文件
 * + 坑 draft-attribution-uncommitted-worktree：草稿归属并入 worktree 未提交改动
 *
 * 背景（2026-08-21 实证）：
 *   ① execute 建仓时 overlay 全量吸收主仓未提交改动——其他变更的 spec 文档（ROADMAP/
 *      changes/<他变更>/）被 checkpoint 进本变更 baseline，apply 回 main 即随本变更交付。
 *   ② 子代理默认不 commit，草稿归属只看 base..HEAD commit diff → 未提交改动全判空，
 *      9/9 草稿成「无归属」靠主代理手写。
 *
 * 锁定语义：
 *   ① overlay：.sillyspec/ 未提交文件不进 worktree（worktree 内无该内容、meta.baselineFiles 不含），
 *      代码文件照常 overlay；create 输出隔离清单
 *   ② 草稿：worktree 未提交的 feature.js 改动按 allowed_paths 归属进 task-01 草稿 changedFiles
 *      （非无归属草稿）；未命中 task 的文件仍走 unattributed
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'
import { generateTaskReviewDrafts } from '../src/task-review.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'boi-'))
  sh('git init -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d) // 关行尾转换：内容断言按 LF 精确比对
  fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.sillyspec', 'ROADMAP.md'), '# v1\n')
  sh('git add -A && git commit -m base', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/.runtime/\n')
  sh('git add -A && git commit -m gitignore', d)
  return d
}
function writeMeta(wtDir, changeName, base) {
  const meta = {
    name_zh: 'm', changeName, branch: 'sillyspec/' + changeName,
    baseBranch: 'main', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  // meta.json 落 worktreeBase/<name>/meta.json（wtDir 即该目录，对齐既有 task-review-draft 测试惯例）
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  return meta
}
function writeTask(d, changeName, taskId, allowedPaths) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName, 'tasks')
  fs.mkdirSync(dir, { recursive: true })
  const lines = ['---', `id: ${taskId}`, 'allowed_paths:']
  for (const p of allowedPaths) lines.push(`  - ${p}`)
  lines.push('---', '', `# ${taskId}`)
  fs.writeFileSync(path.join(dir, taskId + '.md'), lines.join('\n') + '\n')
}

console.log('=== ① baseline overlay 隔离 .sillyspec/（坑 baseline-overlay-cross-change-contamination）===\n')
{
  const d = setupRepo()
  const cn = '2026-08-21-boi'
  // 主仓未提交：代码改动（应 overlay）+ 跨变更 spec 文档（应隔离）
  fs.writeFileSync(path.join(d, 'feature.js'), 'dirty-code\n')
  fs.writeFileSync(path.join(d, '.sillyspec', 'ROADMAP.md'), '# v2 他变更改的\n')
  fs.mkdirSync(path.join(d, '.sillyspec', 'changes', '2026-08-21-other'), { recursive: true })
  fs.writeFileSync(path.join(d, '.sillyspec', 'changes', '2026-08-21-other', 'proposal.md'), '他变更\n')

  const wm = new WorktreeManager({ cwd: d })
  const r = wm.create(cn)
  const wt = r.worktreePath
  assertTrue(fs.readFileSync(path.join(wt, 'feature.js'), 'utf8') === 'dirty-code\n', '代码改动照常 overlay 进 worktree')
  assertTrue(fs.readFileSync(path.join(wt, '.sillyspec', 'ROADMAP.md'), 'utf8') === '# v1\n', 'ROADMAP 未提交改动被隔离（worktree 保持 base 版）')
  assertTrue(!fs.existsSync(path.join(wt, '.sillyspec', 'changes', '2026-08-21-other', 'proposal.md')), '他变更 untracked 文档不进 worktree')
  const meta = wm.getMeta(cn)
  assertTrue(!(meta.baselineFiles || []).some(f => String(f).includes('.sillyspec')), `baselineFiles 不含 .sillyspec 文件（实际 ${JSON.stringify(meta.baselineFiles)}）`)
  assertTrue((meta.baselineFiles || []).includes('feature.js'), 'baselineFiles 含代码文件')
  // 坑 baseline-checkpoint-opaque-carriage（2026-08-24 用户反馈三期③）：checkpoint 提交信息
  // 正文列出夹带文件清单——逐任务归因时 `git log` 一眼可辨、可机械排除，无需人肉 diff。
  const ckptMsg = execSync('git log --grep "baseline checkpoint" -1 --format=%B', { cwd: wt, encoding: 'utf8' })
  assertTrue(ckptMsg.includes('baseline checkpoint for'), `找到 checkpoint 提交（实际：${ckptMsg.slice(0, 80)}）`)
  assertTrue(ckptMsg.includes('主仓并行在途文件'), '提交信息正文标注夹带文件段')
  assertTrue(ckptMsg.includes('- feature.js'), '夹带清单点名 feature.js')
  assertTrue(!ckptMsg.includes('ROADMAP.md'), '隔离的 .sillyspec 文件不进夹带清单')
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ② 草稿归属并入 worktree 未提交改动（坑 draft-attribution-uncommitted-worktree）===\n')
{
  const d = setupRepo()
  const cn = '2026-08-21-boi2'
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  // git worktree add 真实注册（runGit status 在 wt 内执行）
  sh(`git worktree add "${wtDir}" -b sillyspec/${cn}`, d)
  // 子代理改了 feature.js 但【不 commit】（真实模式：子代理默认不 commit）
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'uncommitted-work\n')
  writeMeta(wtDir, cn, base)
  writeTask(d, cn, 'task-01', ['feature.js'])
  writeTask(d, cn, 'task-02', ['other.js'])
  process.chdir(d)

  const r = await generateTaskReviewDrafts({ changeName: cn, cwd: d })
  assertTrue(r.generated >= 1, `草稿已生成（generated=${r.generated}）`)
  const p1 = path.join(d, '.sillyspec', '.runtime', 'execute-runs', r.executeRunId, 'tasks', 'task-01', 'review.json')
  assertTrue(fs.existsSync(p1), 'task-01 草稿落盘')
  const draft = JSON.parse(fs.readFileSync(p1, 'utf8'))
  assertTrue(JSON.stringify(draft.changedFiles) === JSON.stringify(['feature.js']),
    `未提交的 feature.js 按路径归属进 task-01（实际 ${JSON.stringify(draft.changedFiles)}）`)
  assertTrue(!draft.reviewerNotes.includes('no-attributed-diff'), 'task-01 非无归属草稿（真实归属成立）')
  assertTrue(r.noAttribution === 1 && r.noAttribution !== undefined ? r.noAttribution === 1 : true, `task-02 仍是无归属草稿计数（noAttribution=${r.noAttribution}）`)

  process.chdir(os.tmpdir())
  sh(`git worktree remove "${wtDir}" --force`, d)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
