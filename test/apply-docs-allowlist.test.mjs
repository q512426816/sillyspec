/**
 * apply docs 白名单直测（2026-09-16-friction5-hardening task-03 / FR-03 / D-003@v2）。
 *
 * 背景（坑 apply-docs-sync-blocked，用户 2026-09-16 驾驭小结③）：filterDeliverableFiles 保留
 * `.sillyspec/docs/` 为交付物，而 allow 面（design §6 ∪ task allowed_paths）不含 docs 时 Gate1
 * 又拦同一文件——approved 文档同步照样 BLOCKED。D-003@v2 修正：
 *   - 条件加白：main 仓声明面非空才 add('.sillyspec/docs/')——design 与任务卡全缺的空清单变更
 *     维持 fail-open（Gate1 跳过、patch 全量），杜绝 docs-only 单条目面翻转语义（design-grill M5）
 *   - declaredFace 快照：加白前原声明面随返回 Map 附挂带出，Gate1 hasAllowList 与 docs 越权
 *     审计报备均以 declaredFace 为口径（已声明的 docs 文件不误报越权，M3）
 *
 * 覆盖：
 *   ① design §6 非空 → main Set 含 .sillyspec/docs/（尾斜杠），declaredFace 不含（加白前快照）
 *   ② design + 任务卡全缺 → allowMap/declaredFace 均空（fail-open 语义不变）
 *   ③ Gate1：未声明 docs 文件零违规（classifyAllowListViolations）且进 patch（resolvePatchFiles），
 *      完全越界文件仍拦
 *   ④ applyWorktree checkOnly 集成：审计报备含未声明 docs 文件、不含 allowed_paths 已声明者
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { resolveApplyAllowSet, classifyAllowListViolations, resolvePatchFiles, applyWorktree } from '../src/worktree-apply.js'

const tempDirs = []
function mkProject(prefix = 'docs-allow-') {
  const root = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(root)
  return root
}
test.after(() => { for (const d of tempDirs) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } } })

function writeDesign(specBase, name, listBody) {
  const dir = join(specBase, 'changes', name)
  mkdirSync(join(dir, 'tasks'), { recursive: true })
  writeFileSync(join(dir, 'design.md'), `# Design\n\n## 6. 文件变更清单\n${listBody}`)
  return dir
}

// ── ① 条件加白 + declaredFace 快照（纯函数级）──
test('条件加白：design §6 非空 → main Set 含 .sillyspec/docs/（尾斜杠），declaredFace 不含', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  writeDesign(specBase, 'c1', '- src/a.js\n')
  const m = resolveApplyAllowSet(root, 'c1', { specBase })
  assert.ok(m.get('main').has('.sillyspec/docs/'), 'main Set 含白名单条目（尾斜杠写法，pathMatches 目录前缀放行整目录）')
  assert.ok(m.declaredFace instanceof Set, 'declaredFace 以 Map 附挂属性带出（Map 方法全保留）')
  assert.ok(!m.declaredFace.has('.sillyspec/docs/'), 'declaredFace 不含白名单条目（加白前快照）')
  assert.deepEqual([...m.declaredFace].sort(), ['src/a.js'], 'declaredFace = design §6 原声明面')
})

// ── ② 空清单 fail-open 不变（design-grill M5：无条件加白会翻转空清单语义）──
test('空清单：design 与任务卡全缺 → allowMap 与 declaredFace 均空（fail-open 语义不变）', () => {
  const root = mkProject()
  const m = resolveApplyAllowSet(root, 'nope-change', { specBase: join(root, '.sillyspec') })
  const mainSet = m.get('main') || new Set()
  assert.equal(mainSet.size, 0, '无 design/tasks → main Set 空（条件加白不翻转空清单）')
  assert.ok(m.declaredFace instanceof Set && m.declaredFace.size === 0, 'declaredFace 亦空 → hasAllowList=false（Gate1 跳过、patch 全量）')
})

// ── ③ Gate1 放行 + patch 圈定（纯函数级，与 Gate1/resolvePatchFiles 同源消费同一 allowSet）──
test('Gate1：changedFiles 含 .sillyspec/docs/x.md 而 design 只声明 src/a.js → 零违规且进 patch，越界文件仍拦', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  writeDesign(specBase, 'c2', '- src/a.js\n')
  const m = resolveApplyAllowSet(root, 'c2', { specBase })
  const allowSet = m.get('main')
  assert.deepEqual(
    classifyAllowListViolations(['src/a.js', '.sillyspec/docs/x.md'], allowSet),
    [],
    'docs 文件零违规（白名单条目放行）'
  )
  const patchFiles = resolvePatchFiles(['src/a.js', '.sillyspec/docs/x.md'], allowSet, true)
  assert.ok(patchFiles.includes('.sillyspec/docs/x.md'), 'docs 文件进 patch（resolvePatchFiles 同源 allowSet）')
  assert.ok(patchFiles.includes('src/a.js'), '声明文件进 patch')
  // 白名单只放行 docs 子树——完全越界文件仍拦（容差不等于放行）
  assert.deepEqual(
    classifyAllowListViolations(['src/run.js'], allowSet),
    ['src/run.js'],
    'design 与 task 都未声明的越界文件仍违规'
  )
})

// ── ④ applyWorktree checkOnly 集成：审计报备口径（declaredFace）──
test('applyWorktree checkOnly：未声明 docs 文件报备、allowed_paths 已声明者不报备', () => {
  const mainRepo = mkProject('docs-allow-int-')
  // 初始提交：README + 两份模块文档（tracked——真实场景 .sillyspec/docs/ 模块卡在主仓被跟踪，
  // 变更修改它们 → tracked-modified 进 worktree diff；untracked 会被 --exclude-standard 吞掉）
  for (const c of [
    'git init -q',
    'git config user.email t@t.com',
    'git config user.name t',
    'git config commit.gpgsign false',
  ]) execSync(c, { cwd: mainRepo, stdio: 'pipe' })
  writeFileSync(join(mainRepo, 'README.md'), 'init\n')
  mkdirSync(join(mainRepo, '.sillyspec', 'docs'), { recursive: true })
  writeFileSync(join(mainRepo, '.sillyspec', 'docs', 'x.md'), 'x\n')
  writeFileSync(join(mainRepo, '.sillyspec', 'docs', 'y.md'), 'y\n')
  execSync('git add . && git commit -q -m init', { cwd: mainRepo, stdio: 'pipe' })
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()

  // 变更文档：design 只声明 src/a.js；task-01 allowed_paths 额外声明 .sillyspec/docs/y.md
  //（y.md = declaredFace 命中样本；x.md = 纯靠白名单放行样本）
  const changesDir = join(mainRepo, '.sillyspec', 'changes', 'tc1')
  mkdirSync(join(changesDir, 'tasks'), { recursive: true })
  writeFileSync(join(changesDir, 'design.md'), '# Design\n\n## 6. 文件变更清单\n- src/a.js\n')
  writeFileSync(join(changesDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths:\n  - .sillyspec/docs/y.md\n---\n')

  // 建主仓 worktree（同 cross-repo-apply.test.mjs 夹具模式）
  const wtDir = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'tc1')
  mkdirSync(wtDir, { recursive: true })
  execSync(`git worktree add "${wtDir}" -b sillyspec/tc1`, { cwd: mainRepo, stdio: 'pipe' })

  // worktree 内子代理改动：源码交付 + 改两份模块文档（x.md 未声明 / y.md 已声明）
  mkdirSync(join(wtDir, 'src'), { recursive: true })
  writeFileSync(join(wtDir, 'src', 'a.js'), 'from-worktree\n')
  writeFileSync(join(wtDir, '.sillyspec', 'docs', 'x.md'), 'x changed\n')
  writeFileSync(join(wtDir, '.sillyspec', 'docs', 'y.md'), 'y changed\n')
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: 'tc1', branch: 'sillyspec/tc1', baseHash, baselineCommit: baseHash,
    baselineHash: null, worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }))

  const r = applyWorktree('tc1', { cwd: mainRepo, checkOnly: true })
  assert.equal(r.errors.length, 0, `Gate1 零违规（approved 文档同步不再拦；实际：${r.errors.join('; ')}）`)
  assert.ok(r.changedFiles.includes('.sillyspec/docs/x.md'), '未声明 docs 文件进 changedFiles（filter 保交付）')
  assert.ok(r.changedFiles.includes('.sillyspec/docs/y.md'), '已声明 docs 文件进 changedFiles')
  assert.ok(r.changedFiles.includes('src/a.js'), '源码交付进 changedFiles')
  const docsWarn = (r.warnings || []).find(w => w.includes('白名单放行'))
  assert.ok(docsWarn, `审计报备存在（实际 warnings：${(r.warnings || []).join(' | ')}）`)
  assert.ok(docsWarn.includes('.sillyspec/docs/x.md'), '报备含未声明的 x.md')
  assert.ok(!docsWarn.includes('.sillyspec/docs/y.md'), '报备不含已声明的 y.md（declaredFace 命中不误报，M3）')
})
