/**
 * close-trace-freeze-integrity.test.mjs — 收口冻结面完整性三面直测
 * （2026-10-12-close-trace-freeze-integrity FR-01/FR-02）。
 *
 * 覆盖验收面：
 *   FR-01 ① e2e：flow done 冻结面剔除 .sillyspec/changes/ 全子树（含本变更目录工件），
 *      保留 .sillyspec/docs/ 交付文档——change-patch.json files[] 与 change.patch 正文双面钉；
 *   FR-01 ② e2e：工件-only 面（无交付面改动）→ 显式空面提示 + 不落 patch 两件；
 *   FR-02 ③ 单测：scanOrphanFace 孤儿提交（reflog 残留、不在 HEAD 祖先链）触及交付面被捕获；
 *   FR-02 ④ 单测：amend/rebase 等价残留（patch-id 相同）不误报；
 *   FR-02 ⑤ 单测：flow start 前既有历史（baseline 祖先）不算缺口；治理面-only 孤儿不算缺口；
 *   FR-02 ⑥ e2e：会话专属 worktree 内 flow done 遇孤儿实现提交 → 阻断收口不归档；
 *      --accept-orphan-face 放行且 acceptedOrphanFace 留痕。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { scanOrphanFace } from '../src/flow-parity.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ctfi-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

function fillDesignSlots(specBase, change) {
  const base = join(specBase, 'changes', change)
  const dp = join(base, 'design.md')
  const rp = join(base, 'requirements.md')
  const dText = readFileSync(dp, 'utf8')
  if (/<!--AGENT:槽\d+/.test(dText)) {
    writeFileSync(dp, dText.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——一行作答即合规'))
    writeFileSync(rp, readFileSync(rp, 'utf8')
      .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 协议测试夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 全部子步通过')
      .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——无独立测试面'))
  } else {
    writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规'))
    writeFileSync(rp, readFileSync(rp, 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
  }
}

// ── FR-01 ① e2e：冻结面剔除工件子树、保留 docs 交付 ──
test('flow 冻结面剔除 .sillyspec/changes 子树保留 docs 交付', () => {
  const cwd = makeRepo()
  const change = '2026-10-12-ctfi-face'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '交付面冻结口径含跨仓标注\n成功标准：\n- work.txt 与 docs 模块卡入冻结面，治理工件不入', '--autopilot'])
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    // 交付提交：代码 + .sillyspec/docs 交付文档（均入冻结面）
    writeFileSync(join(cwd, 'work.txt'), 'done\n')
    mkdirSync(join(specBase, 'docs', 'x', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'x', 'modules', 'setup.md'), '# setup\n')
    git(cwd, ['add', 'work.txt', '.sillyspec/docs/x/modules/setup.md'])
    git(cwd, ['commit', '-q', '-m', `work (${change}) (task-01)`])
    fillDesignSlots(specBase, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
    const archDir = join(specBase, 'changes', 'archive')
    const archived = readdirSyncSafe(archDir).find((d) => d.includes(change))
    assert.ok(archived, '归档目录在')
    const meta = JSON.parse(readFileSync(join(archDir, archived, 'change-patch.json'), 'utf8'))
    assert.ok(meta.files.includes('work.txt'), '代码交付入 files[]')
    assert.ok(meta.files.includes('.sillyspec/docs/x/modules/setup.md'), '.sillyspec/docs 交付文档保留')
    assert.equal(meta.files.filter((f) => f.startsWith('.sillyspec/changes/')).length, 0, '.sillyspec/changes/ 全子树不入 files[]（含本变更目录工件）')
    const patch = readFileSync(join(archDir, archived, 'change.patch'), 'utf8')
    assert.match(patch, /diff --git a\/work\.txt/)
    assert.match(patch, /diff --git a\/\.sillyspec\/docs\/x\/modules\/setup\.md/)
    assert.doesNotMatch(patch, /\.sillyspec\/changes\//, 'patch 正文不含治理工件 diff')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

function readdirSyncSafe(dir) {
  try { return readdirSync(dir) } catch { return [] }
}

// ── FR-01 ② e2e：工件-only 面 = 空面显式提示 ──
test('工件-only 面输出空面提示不落 patch', () => {
  const cwd = makeRepo()
  const change = '2026-10-12-ctfi-empty'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '无交付面场景空面提示归档\n成功标准：\n- 空面提示且归档完成', '--autopilot'])
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    fillDesignSlots(specBase, change) // 只写工件（未提交、无交付改动）
    // 任务勾选走工件提交（ledger 门要 task token 提交）——工件提交存在但 FR-01 后不入冻结面
    const tasksPath = join(specBase, 'changes', change, 'tasks.md')
    writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace('- [ ] task-01', '- [x] task-01'))
    git(cwd, ['add', tasksPath])
    git(cwd, ['commit', '-q', '-m', `chore: tick (task-01)`])
    // 空面变更无 patchText → 评审证据不足以豁免：夹具代行评审（PASS，schema 同任务书）
    const head = git(cwd, ['rev-parse', 'HEAD'])
    writeFileSync(join(specBase, 'changes', change, 'review.json'), JSON.stringify({
      schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: head,
      findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
    }, null, 2))
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
    assert.match(s2.stdout, /可归属文件面为空/, '空面哨兵显式提示')
    const archDir = join(specBase, 'changes', 'archive')
    const archived = readdirSyncSafe(archDir).find((d) => d.includes(change))
    assert.ok(archived, '归档目录在（空面不阻断）')
    assert.equal(existsSync(join(archDir, archived, 'change.patch')), false, '空面不落伪完整 change.patch')
    assert.equal(existsSync(join(archDir, archived, 'change-patch.json')), false, '空面不落伪完整 change-patch.json')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-02 ③④⑤ 单测：scanOrphanFace ──
function mkScanRepo() {
  const cwd = makeRepo()
  const baseline = git(cwd, ['rev-parse', 'HEAD'])
  return { cwd, baseline }
}

test('孤儿提交触及交付面阻断收口（scanOrphanFace 捕获）', () => {
  const { cwd, baseline } = mkScanRepo()
  try {
    // 孤儿：提交后 reset --hard 弃置（reflog 残留、不在 HEAD 祖先链）
    writeFileSync(join(cwd, 'src-impl.js'), 'impl\n')
    git(cwd, ['add', 'src-impl.js'])
    git(cwd, ['commit', '-q', '-m', 'feat: impl'])
    git(cwd, ['reset', '-q', '--hard', baseline])
    const r = scanOrphanFace(cwd, { baseline })
    assert.equal(r.commits.length, 1, '孤儿提交被捕获')
    assert.deepEqual(r.files, ['src-impl.js'], '交付文件入缺口')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('patch-id 等价重复不误报（amend 残留）', () => {
  const { cwd, baseline } = mkScanRepo()
  try {
    writeFileSync(join(cwd, 'ok.js'), 'ok\n')
    git(cwd, ['add', 'ok.js'])
    git(cwd, ['commit', '-q', '-m', 'wip'])
    git(cwd, ['commit', '-q', '--amend', '-m', 'feat: ok (final)']) // 旧提交 reflog 残留但内容等价
    const r = scanOrphanFace(cwd, { baseline })
    assert.equal(r.commits.length, 0, 'amend 等价残留零缺口')
    assert.equal(r.files.length, 0)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('baseline 祖先链内与治理面-only 孤儿不算缺口', () => {
  const { cwd, baseline } = mkScanRepo()
  try {
    // HEAD 链内正常提交
    writeFileSync(join(cwd, 'in-head.js'), 'a\n')
    git(cwd, ['add', 'in-head.js'])
    git(cwd, ['commit', '-q', '-m', 'feat: in-head'])
    // 治理面-only 孤儿（只碰 .sillyspec/changes/**）
    mkdirSync(join(cwd, '.sillyspec', 'changes', 'x'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'changes', 'x', 'design.md'), '# d\n')
    git(cwd, ['add', '.sillyspec/changes/x/design.md'])
    git(cwd, ['commit', '-q', '-m', 'chore: artifact only'])
    git(cwd, ['reset', '-q', '--hard', 'HEAD~1'])
    const r = scanOrphanFace(cwd, { baseline })
    assert.equal(r.commits.length, 0, '治理面-only 孤儿不入缺口（交付面完备性守卫只管交付文件）')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('merge 提交自身不判但侧支成员提交经 reflog 捕获（披露边界钉行为）', () => {
  const { cwd, baseline } = mkScanRepo()
  try {
    // 侧支提交 + 合并后整体 reset 弃置：merge 提交经 git show（combined diff 空）取不到文件面
    git(cwd, ['checkout', '-q', '-b', 'side'])
    writeFileSync(join(cwd, 'merged.js'), 'm\n')
    git(cwd, ['add', 'merged.js'])
    git(cwd, ['commit', '-q', '-m', 'feat: side work'])
    git(cwd, ['checkout', '-q', 'main'])
    git(cwd, ['merge', '-q', '--no-ff', '-m', 'merge: side', 'side'])
    git(cwd, ['reset', '-q', '--hard', baseline])
    const r = scanOrphanFace(cwd, { baseline })
    // merge 提交自身经 combined diff 空面不判（披露边界）；但侧支成员提交发生在 HEAD 轨迹上
    // （checkout side 后 commit），reflog 可见 → 仍被捕获（merge 盲区不掩盖成员工作）
    assert.equal(r.commits.length, 1, '侧支成员提交经 HEAD reflog 捕获')
    assert.deepEqual(r.files, ['merged.js'])
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-02 ⑥ e2e：会话专属 worktree 孤儿阻断 + --accept-orphan-face 放行 ──
test('孤儿提交触及交付面阻断收口（worktree e2e）+ --accept-orphan-face 放行留痕', () => {
  const cwd = makeRepo()
  const change = '2026-10-12-ctfi-orphan'
  const specBase = join(cwd, '.sillyspec')
  const wtPath = join(specBase, '.runtime', 'worktrees', change)
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '孤儿守卫冻结面外提交阻断\n成功标准：\n- 冻结面外实现提交阻断收口', '--autopilot'])
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    // 会话专属 worktree（linked，路径命中 gate-snapshot 判定）
    mkdirSync(join(specBase, '.runtime', 'worktrees'), { recursive: true })
    git(cwd, ['worktree', 'add', '-q', '--detach', wtPath])
    const wtBaseline = git(wtPath, ['rev-parse', 'HEAD'])
    // 孤儿实现提交：在 worktree 提交后 reset 弃置（事故形态：提交不在 flow done 时点 HEAD 祖先链）
    mkdirSync(join(wtPath, 'src'), { recursive: true })
    writeFileSync(join(wtPath, 'src', 'lost-impl.js'), 'lost\n')
    git(wtPath, ['add', 'src/lost-impl.js'])
    git(wtPath, ['commit', '-q', '-m', `feat: lost impl (${change})`])
    git(wtPath, ['reset', '-q', '--hard', wtBaseline])
    // 合法在链提交（保非空冻结面，使 acceptedOrphanFace 留痕可断言）——reset 清空了 src/ 目录须重建
    mkdirSync(join(wtPath, 'src'), { recursive: true })
    writeFileSync(join(wtPath, 'src', 'ok.js'), 'ok\n')
    git(wtPath, ['add', 'src/ok.js'])
    git(wtPath, ['commit', '-q', '-m', `feat: ok (${change}) (task-01)`])
    fillDesignSlots(specBase, change)
    // flow done 在 worktree 内跑（--spec-dir 锚主仓 specBase）
    const s2 = cli(wtPath, ['flow', 'done', '--change', change, '--spec-dir', specBase, '--allow-worktree-cwd'])
    assert.notEqual(s2.status, 0, '孤儿提交必须阻断收口')
    const out = s2.stdout + s2.stderr
    assert.match(out, /冻结面外交付改动/, '阻断理由点名孤儿面')
    assert.match(out, /--accept-orphan-face/, '处置指引含放行 flag')
    assert.equal(existsSync(join(specBase, 'changes', change)), true, '变更未归档（阻断半态可重入）')
    // 放行重跑
    const s3 = cli(wtPath, ['flow', 'done', '--change', change, '--spec-dir', specBase, '--allow-worktree-cwd', '--accept-orphan-face'])
    assert.equal(s3.status, 0, `accept 放行失败: ${s3.stdout}\n${s3.stderr}`)
    const archDir = join(specBase, 'changes', 'archive')
    const archived = readdirSyncSafe(archDir).find((d) => d.includes(change))
    assert.ok(archived, '放行后归档完成')
    const meta = JSON.parse(readFileSync(join(archDir, archived, 'change-patch.json'), 'utf8'))
    assert.equal(meta.acceptedOrphanFace, 1, '缺口数随 acceptedOrphanFace 留痕')
    assert.ok(meta.files.includes('src/ok.js'), '在链交付入冻结面')
    assert.equal(meta.files.includes('src/lost-impl.js'), false, '孤儿交付不入冻结面（显式接受）')
  } finally {
    try { git(cwd, ['worktree', 'remove', '--force', wtPath]) } catch { /* 已清理 */ }
    rmSync(cwd, { recursive: true, force: true })
  }
})
