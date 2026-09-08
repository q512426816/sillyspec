// 2026-09-08 用户反馈第二批（两轮合并）六项修复的行为锁定：
//   ① --file-notes 路径并入 quick 边界声明（与 QUICKLOG 文件行口径一致，不再「超出 allowedFiles」误拦）
//   ② quick --done 检出文档行号漂移时自动重锚（autoReanchorDocRefs，--fix 主链路编程化）
//   ③ backfill-reviews --adopt 切片空不冲空 changedFiles（保留 reviewer 声明）
//   ④ 平台模式 apply allowlist 读 specRoot（resolveApplyAllowSet/collectReviewDeclaredFiles
//      的 specBase/runtimeRoot 参数 + 指针静默回退），不再读本地空目录整批 BLOCKED
//   ⑤ meta.json 带 UTF-8 BOM 不再被当损坏（parseJSON 剥 BOM）
//   ⑥ target_files 对账路径键归一（大小写折叠 + 尾部注记 + ./ 前缀），计划名 vs 实测名字面差不再假红
//
// 隔离：全部 fixture 落 os.tmpdir() 临时目录（套件级 TEMP 隔离下天然分家），绝不碰真实 .sillyspec。
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { WorktreeManager } from '../src/worktree.js'
import { resolveApplyAllowSet, collectReviewDeclaredFiles } from '../src/worktree-apply.js'
import { reconcileTargetFiles } from '../src/verify-postcheck.js'
import { autoReanchorDocRefs } from '../src/docs-check.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} 失败: ${r.stderr}`)
  return (r.stdout || '').trim()
}
function gitInit(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 't@t.local'])
  git(dir, ['config', 'user.name', 't'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}
function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8', timeout: 90_000, stdio: ['pipe', 'pipe', 'pipe'] })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

console.log('\n[feedback-batch2] 六项修复行为锁定')

try {
  // ─────────────────────────────────────────
  console.log('\n--- ⑤ meta.json BOM 容错 ---')
  {
    const proj = mkTmp('bom-')
    const metaDir = join(proj, '.sillyspec', '.runtime', 'worktrees', 'c1')
    mkdirSync(metaDir, { recursive: true })
    // \uFEFF 前缀：Windows 记事本 / 部分 PowerShell 重定向的常见产物
    writeFileSync(join(metaDir, 'meta.json'), '\uFEFF' + JSON.stringify({ changeName: 'c1', baseHash: 'abc', worktreePath: proj, mode: 'in-place-fallback' }))
    const wm = new WorktreeManager({ cwd: proj })
    const meta = wm.getMeta('c1')
    assert(meta !== null && meta.baseHash === 'abc', '带 BOM 的 meta.json 正常解析（此前被判损坏返回 null）')

    writeFileSync(join(metaDir, 'meta.json'), '\uFEFF{broken')
    assert(wm.getMeta('c1') === null, '真损坏（BOM + 坏 JSON）仍如实返回 null')
  }

  // ─────────────────────────────────────────
  console.log('\n--- ③ adopt 切片空不冲空 changedFiles ---')
  {
    const proj = mkTmp('adopt-keep-')
    gitInit(proj)
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    writeFileSync(join(proj, 'feature.js'), 'export const x = 0\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])
    const baseHash = git(proj, ['rev-parse', 'HEAD'])

    const specBase = join(proj, '.sillyspec')
    const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
    mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({ changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj }))

    // task 卡 allowed_paths 与真实 diff 完全失配（agent 手写路径形态差——正是切片空的真实形态）
    const tasksDir = join(specBase, 'changes', 'c1', 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(tasksDir, 'task-01.md'), '---\nid: task-01\nallowed_paths: [Feature.js]\n---\n# task-01\n改 feature.js\n')

    writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
    git(proj, ['add', 'feature.js'])
    git(proj, ['commit', '-q', '-m', 'feat'])

    const runId = 'exec-2026-09-08-120000'
    const reviewDir = join(specBase, '.runtime', 'execute-runs', runId, 'tasks', 'task-01')
    mkdirSync(reviewDir, { recursive: true })
    writeFileSync(join(specBase, '.runtime', 'current-execute-run-id-c1'), runId + '\n')
    // reviewer 已声明 changedFiles（gate 会交叉校验的真实声明）
    writeFileSync(join(reviewDir, 'review.json'), JSON.stringify({
      schemaVersion: 2, task: 'task-01', base: 'deadbeef', head: 'cafebabe',
      changedFiles: ['feature.js'],
      specVerdict: 'pass', qualityVerdict: 'pass',
      reviewerNotes: 'agent 语义结论',
    }, null, 2))

    const r = runCLI(['backfill-reviews', '--change', 'c1', '--adopt'], proj)
    assert(r.status === 0, `adopt exit 0（实际 ${r.status}；输出 ${r.combined.slice(0, 200)}）`)
    const rv = JSON.parse(readFileSync(join(reviewDir, 'review.json'), 'utf8'))
    assert(Array.isArray(rv.changedFiles) && rv.changedFiles.includes('feature.js'),
      `allowed_paths 切片空时保留原 changedFiles 声明（实际 ${JSON.stringify(rv.changedFiles)}）`)
    assert(rv.base === baseHash, 'mechanics 其余字段照常重算（base）')
    assert(rv.specVerdict === 'pass' && String(rv.reviewerNotes).includes('agent 语义结论'), 'verdict/notes 保留')
  }

  // ─────────────────────────────────────────
  console.log('\n--- ④ 平台模式 apply allowlist 读 specRoot ---')
  {
    const proj = mkTmp('allowlist-')
    gitInit(proj)
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n.platform-spec/\n')
    // 平台 specRoot：changes/ 实体在这里（design §6 清单 + task allowed_paths）
    const specRoot = join(proj, 'platform-spec')
    const changeDir = join(specRoot, 'changes', 'c1')
    const tasksDir = join(changeDir, 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '# 设计\n\n## 文件变更清单\n\n| 序号 | 文件 | 说明 |\n|---|---|---|\n| 1 | src/a.js | 主改动 |\n')
    writeFileSync(join(tasksDir, 'task-01.md'), '---\nid: task-01\nallowed_paths: [test/a.test.js]\n---\n# task-01\n')

    // 4a. opts.specBase 显式传入
    const m1 = resolveApplyAllowSet(proj, 'c1', { specBase: specRoot })
    const main1 = m1.get('main')
    assert(main1 && main1.has('src/a.js') && main1.has('test/a.test.js'),
      `显式 specBase 读平台 specRoot（design ∪ allowed_paths；实际 ${[...(main1 || [])].join(',')}）`)

    // 4b. 指针静默回退（调用方没穿参——.sillyspec-platform.json 在 projectRoot）
    writeFileSync(join(proj, '.sillyspec-platform.json'), JSON.stringify({ specRoot, runtimeRoot: null }))
    const m2 = resolveApplyAllowSet(proj, 'c1')
    assert(m2.get('main') && m2.get('main').has('src/a.js'), '平台指针静默回退命中 specRoot')

    // 4c. 无指针无传参 → 本地（既有行为零回归）：本地 .sillyspec 无该 change → 空集
    const proj2 = mkTmp('allowlist-local-')
    const m3 = resolveApplyAllowSet(proj2, 'c1')
    assert((m3.get('main') || new Set()).size === 0, '本地无 change 目录时空集（零回归）')

    // 4d. collectReviewDeclaredFiles 的 runtimeRoot 解析（显式 + 指针回退）
    const runId = 'exec-2026-09-08-130000'
    const reviewDir = join(specRoot, '.runtime', 'execute-runs', runId, 'tasks', 'task-01')
    mkdirSync(reviewDir, { recursive: true })
    writeFileSync(join(specRoot, '.runtime', 'current-execute-run-id-c1'), runId + '\n')
    // 注意 stampExecuteRunChange 归属戳：resolveLatestExecuteRunIdWithTasks 需 run 归属 c1
    writeFileSync(join(specRoot, '.runtime', 'execute-runs', runId, 'change'), 'c1\n')
    // readReview 内嵌 validateReviewSchema——最小骨架过不了校验，须给全 schema 必填字段
    writeFileSync(join(reviewDir, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: 'task-01', base: 'aaa', head: 'bbb',
      changedFiles: ['src/b.js'], repo: 'main',
      specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: 'x',
    }))
    const byRepo1 = collectReviewDeclaredFiles(proj, 'c1', { runtimeRoot: join(specRoot, '.runtime') })
    assert((byRepo1.get('main') || []).includes('src/b.js'), 'runtimeRoot 显式传参命中平台 execute-runs')
    const byRepo2 = collectReviewDeclaredFiles(proj, 'c1')
    assert((byRepo2.get('main') || []).includes('src/b.js'), 'collectReviewDeclaredFiles 指针回退（specRoot/.runtime）')
  }

  // ─────────────────────────────────────────
  console.log('\n--- ⑥ target_files 对账路径键归一 ---')
  {
    const proj = mkTmp('reconcile-')
    gitInit(proj)
    // 注意大小写：磁盘 / git 里是 src/foo.js，声明侧写 Src/Foo.js
    mkdirSync(join(proj, 'src'), { recursive: true })
    writeFileSync(join(proj, 'src', 'foo.js'), 'export const a = 0\n')
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])
    const baseHash = git(proj, ['rev-parse', 'HEAD'])

    const specBase = join(proj, '.sillyspec')
    const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
    mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({ changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj }))
    const tasksDir = join(specBase, 'changes', 'c1', 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    // 声明侧三种脆弱形态：大小写差、尾部注记、./ 前缀（parseTargetFiles 已剥 ./，注记与大小写由对账键归一）
    writeFileSync(join(tasksDir, 'task-01.md'), '---\nid: task-01\ntarget_files:\n  - Src/Foo.js（入口）\n---\n# task-01\n')

    writeFileSync(join(proj, 'src', 'foo.js'), 'export const a = 1\n')
    git(proj, ['add', 'src/foo.js'])
    git(proj, ['commit', '-q', '-m', 'feat'])

    const r = reconcileTargetFiles({ cwd: proj, specBase, changeName: 'c1' })
    assert(r.missing.length === 0, `大小写+注记声明的文件不再落②类假红（missing 实际 ${JSON.stringify(r.missing)}）`)
    assert(r.matched.length === 1 && /foo\.js/i.test(r.matched[0]), `归一后命中 matched（实际 ${JSON.stringify(r.matched)}）`)
    assert(r.status === 'ok', `对账状态 ok（实际 ${r.status}）`)

    // 真没做的声明照旧拦（归一不放水）
    writeFileSync(join(tasksDir, 'task-02.md'), '---\nid: task-02\ntarget_files: [NEW: src/never-made.js]\n---\n# task-02\n')
    const r2 = reconcileTargetFiles({ cwd: proj, specBase, changeName: 'c1' })
    assert(r2.missing.length === 1 && r2.missing[0].isNew === true, 'NEW 声明未建仍落②类（归一只对齐字面差，不放水）')
  }

  // ─────────────────────────────────────────
  console.log('\n--- ② autoReanchorDocRefs：行号漂移自动重锚 ---')
  {
    const proj = mkTmp('reanchor-')
    mkdirSync(join(proj, 'src'), { recursive: true })
    mkdirSync(join(proj, 'docs'), { recursive: true })
    // 源文件 22 行，目标符号 export function target 在第 20 行——旧引用 :6 的关键词窗口
    // （[start-2, end+5] = 4..11）够不着，才构成「行界在但 keyword 失配」的漂移态
    const srcLines = Array.from({ length: 19 }, (_, i) => `// filler ${i + 1}`)
    srcLines.push('export function resolveTarget() {', '}')
    writeFileSync(join(proj, 'src', 'a.js'), srcLines.join('\n') + '\n')
    // 文档行：引用 + 同行反引号代码符号（层2 token 只认反引号内符号——活文档既定契约）
    writeFileSync(join(proj, 'docs', 'x.md'), '# 活文档\n\n见 `src/a.js:6` 的 `resolveTarget` 定义。\n')

    const r = autoReanchorDocRefs(proj, ['docs/x.md'])
    assert(r.invalidBefore === 1, `漂移被检出（实际 before=${r.invalidBefore}）`)
    assert(r.applied === 1, `唯一/优选命中自动重锚 1 处（实际 applied=${r.applied}）`)
    assert(r.invalidAfter === 0 && r.remaining === 0, `同口径复跑 0 失效（回执 before→after）`)
    const docText = readFileSync(join(proj, 'docs', 'x.md'), 'utf8')
    assert(/src\/a\.js:20/.test(docText), `文档行号已改写到 20（实际 ${docText.match(/src\/a\.js:\d+/)?.[0]}）`)

    // 幂等：再跑无漂移可修
    const r2 = autoReanchorDocRefs(proj, ['docs/x.md'])
    assert(r2.applied === 0 && r2.remaining === 0, '幂等：全绿后零改写')
  }

  // ─────────────────────────────────────────
  console.log('\n--- ① --file-notes 路径并入 quick 边界 ---')
  {
    const proj = mkTmp('fnotes-boundary-')
    gitInit(proj)
    writeFileSync(join(proj, 'a.js'), 'a\n')
    writeFileSync(join(proj, 'extra.js'), 'extra\n')
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])

    // 启动 quick（step1）声明 a.js——必须带 --input（无描述启动被拒）
    const start = runCLI(['run', 'quick', '--files', 'a.js', '--input', 'fileNotes 边界口径测试', '--non-interactive'], proj)
    const sid = (start.stdout.match(/quick-[0-9a-f]{8}/) || [])[0]
    assert(sid, `quick 会话已启动（输出 ${start.combined.slice(0, 160)}）`)

    // 会话期间改 a.js + extra.js（后者未在 --files 声明）
    writeFileSync(join(proj, 'a.js'), 'a2\n')
    writeFileSync(join(proj, 'extra.js'), 'extra2\n')

    // step2 / step3 推进：--done 收尾带 --file-notes（不带 --files）——修复前审计会按
    // 「超出 allowedFiles」拦 extra.js；修复后 fileNotes 路径并入边界，SAFE/WARNING 不再误报
    for (let s = 1; s <= 2; s++) {
      const rs = runCLI(['run', 'quick', '--done', '--change', sid, '--input', `step${s}`], proj)
      assert(/已|完成|✅/.test(rs.combined) || rs.status === 0, `step${s} --done 推进（${rs.combined.slice(0, 120)}）`)
    }
    const fin = runCLI([
      'run', 'quick', '--done', '--change', sid,
      '--req', '边界与文件行口径一致', '--cause', '反馈修复', '--solution', 'fileNotes 并入边界',
      '--result', '测试绿',
      '--file-notes', 'a.js::主改动 || extra.js::追加修复',
    ], proj)
    assert(!/超出/.test(fin.combined) || /已追加/.test(fin.combined),
      `extra.js 不再被「超出 allowedFiles」误拦（输出片段：${fin.combined.match(/[^\n]*超出[^\n]*/)?.[0] || '(无超出字样)'}）`)
    assert(/边界已追加（--file-notes/.test(fin.combined), '输出点明 --file-notes 声明并入边界')

    // QUICKLOG 文件行与审计口径一致：两文件都在
    const qlDir = join(proj, '.sillyspec', 'quicklog')
    let qlText = ''
    for (const f of readdirSync(qlDir)) {
      if (f.startsWith('QUICKLOG')) qlText = readFileSync(join(qlDir, f), 'utf8')
    }
    assert(qlText.includes('a.js') && qlText.includes('extra.js'), 'QUICKLOG 文件行含两文件（fileNotes 落盘）')
    assert(!/归属切分[^\n]*extra\.js/.test(qlText), 'extra.js 不再被误标「归属切分：未声明」')
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* Windows EPERM 容忍 */ } }
}

if (failures > 0) {
  console.error(`\n[feedback-batch2] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[feedback-batch2] ✅ 全部通过')
