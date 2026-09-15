// 2026-09-15 复盘摩擦六坑回归锁定（quick quick-8c38a4b7）：
//   A. P1 对账形态判定双根化（platform-dual-root-form-misjudge）：平台模式 specBase=specRoot
//      时项目侧 .sillyspec 的 meta 单路径读不到 → 误判 post-apply → ②类全量假红。
//      _readWorktreeMeta 双候选 + resolveReconcileActualFiles / resolveVerifyChangedFiles 集成。
//   B. 探针1 词边界（probe1-literal-false-positive）：TODO_FLAG_TODO 业务常量、
//      「XXX完成处置」中文占位模板不再命中；真标记（边界独立/标点相邻）仍命中。
//   C. ③类脚手架聚合（reconcile-undeclared-scaffold-flood）：classifyToolScaffold 命中的
//      工具/平台设施文件不逐条进③类，聚合 note + undeclaredScaffold 计数；全脚手架时 ok。
//   D. 探针5 跨仓 scope 注记（probe5-cross-repo-scope-blindness）：有跨仓 task 卡时渲染
//      「扫描面只含主仓」边界说明。
//   E. push 409 自愈键控闸：首报可见、窗口内同变更同类型静默、异类型/手动旁路可见。
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { _readWorktreeMeta } = await import('../src/contract-matrix.js')
const { resolveReconcileActualFiles, resolveVerifyChangedFiles, reconcileTargetFiles } = await import('../src/verify-postcheck.js')
const { isUnimplementedMarkerLine, renderVerifyProbesReport } = await import('../src/verify-probes.js')
const { bindSyncNoiseRoot, syncSelfHealWarn, _resetSyncNoiseForTest } = await import('../src/sync-noise.js')

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const sh = (cwd, cmd) => execSync(cmd, { cwd, stdio: 'ignore' })
function initRepo(dir) {
  mkdirSync(dir, { recursive: true })
  sh(dir, 'git init -q')
  sh(dir, 'git config user.email t@t.local')
  sh(dir, 'git config user.name tester')
  writeFileSync(join(dir, 'base.txt'), 'base\n')
  sh(dir, 'git add .')
  sh(dir, 'git commit -qm base')
}

function capture() {
  const warns = [], logs = []
  const ow = console.warn, ol = console.log
  console.warn = (m) => warns.push(String(m))
  console.log = (m) => logs.push(String(m))
  return { warns, logs, restore() { console.warn = ow; console.log = ol } }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-retro-fixes-${process.pid}-`))
const writeMeta = (root, change, obj) => {
  const dir = join(root, '.runtime', 'worktrees', change)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(obj))
}

try {
  // ─────────────────────────────────────────
  console.log('\n[A] P1 形态判定双根化（platform-dual-root-form-misjudge）')

  console.log('\n--- A1. _readWorktreeMeta 双候选 ---')
  {
    const specRoot = join(tmpRoot, 'plat-spec')        // 平台 specRoot（无 meta）
    const proj = join(tmpRoot, 'proj')                 // 项目仓（meta 在项目侧 .sillyspec）
    initRepo(proj)
    const wtDir = join(tmpRoot, 'proj-wt')
    initRepo(wtDir)
    writeMeta(join(proj, '.sillyspec'), 'c1', { worktreePath: wtDir, mode: 'linked', baseHash: 'abc123' })

    const found = _readWorktreeMeta(specRoot, proj, 'c1')
    assert(found !== null, 'specRoot miss 时项目侧 meta 命中（双候选）')
    assert(found && found.meta.baseHash === 'abc123', '命中 meta 内容正确')
    assert(found && found.gitDir === wtDir, 'gitDir 解析到 worktreePath')

    const foundSpec = (() => {
      const specWithMeta = join(tmpRoot, 'plat-spec2')
      writeMeta(specWithMeta, 'c1', { worktreePath: wtDir, mode: 'linked' })
      return _readWorktreeMeta(specWithMeta, proj, 'c1')
    })()
    assert(foundSpec !== null && foundSpec.meta.mode === 'linked', 'specBase 侧 meta 优先命中（原行为不回归）')

    assert(_readWorktreeMeta(specRoot, proj, 'nope') === null, '两根全无 → null')

    // BOM 容错（worktree.js:283 同坑）：Windows 编辑器 BOM 不得让双候选静默跳根
    const bomRoot = join(tmpRoot, 'bom-spec')
    const bomDir = join(bomRoot, '.runtime', 'worktrees', 'c1')
    mkdirSync(bomDir, { recursive: true })
    writeFileSync(join(bomDir, 'meta.json'), '\uFEFF' + JSON.stringify({ worktreePath: wtDir, mode: 'linked', baseHash: 'bom1' }))
    const foundBom = _readWorktreeMeta(bomRoot, proj, 'c1')
    assert(foundBom !== null && foundBom.meta.baseHash === 'bom1', 'BOM meta 可解析（不静默跳根）')
  }

  console.log('\n--- A2. resolveReconcileActualFiles 形态判定（平台模式根分离） ---')
  {
    const specRoot = join(tmpRoot, 'plat-spec3')
    const proj = join(tmpRoot, 'proj3')
    initRepo(proj)
    const wtDir = join(tmpRoot, 'proj3-wt')
    initRepo(wtDir)
    writeMeta(join(proj, '.sillyspec'), 'c1', { worktreePath: wtDir, mode: 'linked', baseHash: 'abc123' })

    // 修复前：只查 specRoot → existsSync false → 误判 post-apply（复盘 21 条假红的根因）
    const r = resolveReconcileActualFiles({ cwd: proj, specBase: specRoot, runtimeRoot: join(specRoot, '.runtime'), changeName: 'c1' })
    assert(r.form === 'worktree', 'meta 在项目侧 → 形态判 worktree（修复前误判 post-apply）')

    const r2 = resolveReconcileActualFiles({ cwd: proj, specBase: specRoot, runtimeRoot: join(specRoot, '.runtime'), changeName: 'ghost' })
    assert(r2.form === 'post-apply', '两根全无 → post-apply（原语义）')

    // 常规仓（specBase=cwd/.sillyspec，两候选同根）不回归
    const r3 = resolveReconcileActualFiles({ cwd: proj, specBase: join(proj, '.sillyspec'), runtimeRoot: join(proj, '.sillyspec', '.runtime'), changeName: 'c1' })
    assert(r3.form === 'worktree', '常规仓两候选同根 → worktree（零回归）')
  }

  console.log('\n--- A3. resolveVerifyChangedFiles working-tree 并入（平台模式根分离） ---')
  {
    const specRoot = join(tmpRoot, 'plat-spec4')
    const proj = join(tmpRoot, 'proj4')
    initRepo(proj)
    const wtDir = join(tmpRoot, 'proj4-wt')
    initRepo(wtDir)
    mkdirSync(join(wtDir, 'src'), { recursive: true })
    writeFileSync(join(wtDir, 'src', 'feature.js'), 'export const x = 1\n')
    writeMeta(join(proj, '.sillyspec'), 'c1', { worktreePath: wtDir, mode: 'linked' })

    // 修复前：metaPath=join(specBase) 单路径 miss → 未提交并入静默跳过（形态 A 并入失效）
    const files = resolveVerifyChangedFiles(proj, 'c1', null, { includeWorkingTree: true, specBase: specRoot })
    assert(Array.isArray(files) && files.includes('src/feature.js'), '平台模式下 worktree 未提交文件并入（修复前并入失效）')
  }

  // ─────────────────────────────────────────
  console.log('\n[B] 探针1 词边界（probe1-literal-false-positive）')
  {
    // 复盘实证误报形态
    assert(!isUnimplementedMarkerLine('const TODO_FLAG_TODO = window.CONST.TODO_FLAG_TODO'), 'TODO_FLAG_TODO 业务常量不命中（标识符内部）')
    assert(!isUnimplementedMarkerLine('标题「XXX完成处置」模板行'), '「XXX完成处置」中文占位模板不命中（后邻 CJK）')
    assert(!isUnimplementedMarkerLine('订单XXX号已创建'), '「订单XXX号」不命中（前邻 CJK）')
    assert(!isUnimplementedMarkerLine('function parseHackArgs(input) {'), 'parseHackArgs 标识符内部不命中')
    assert(!isUnimplementedMarkerLine('let myFIXMElist = []'), 'myFIXMElist 标识符内部不命中')
    // 真标记仍命中
    assert(isUnimplementedMarkerLine('// TODO: 后端接口未接'), '独立 TODO 注释命中')
    assert(isUnimplementedMarkerLine('TODO at line start'), '行首 TODO 命中')
    assert(isUnimplementedMarkerLine('    FIXME: broken'), 'FIXME 命中')
    assert(isUnimplementedMarkerLine(' // HACK 临时绕过'), 'HACK 命中')
    assert(isUnimplementedMarkerLine('// XXX: rewrite this'), '独立 XXX 注释命中')
    assert(isUnimplementedMarkerLine('// XXX：待重构'), 'XXX 前是空白、后全角冒号命中（真标记形态）')
    assert(!isUnimplementedMarkerLine('标记XXX：待重构'), 'XXX 前邻 CJK（标记XXX=占位语义）不命中')
    assert(isUnimplementedMarkerLine('该功能尚未实现'), '「尚未实现」子串命中（中文高置信，零回归）')
    assert(isUnimplementedMarkerLine('这行注释里有TODO标记'), '中文行内 TODO 命中（TODO 不做 CJK 排除）')
  }

  // ─────────────────────────────────────────
  console.log('\n[C] ③类脚手架聚合（reconcile-undeclared-scaffold-flood）')
  {
    const proj = join(tmpRoot, 'proj5')
    initRepo(proj)
    const sb = join(proj, '.sillyspec')
    const changeDir = join(sb, 'changes', 'c1')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), `---
id: task-01
target_files:
  - src/feature.js
---
# task-01
`)
    // 实际侧（post-apply B2 untracked）：声明文件 + 真未声明 + 3 个脚手架设施文件
    mkdirSync(join(proj, 'src'), { recursive: true })
    writeFileSync(join(proj, 'src', 'feature.js'), 'x\n')
    writeFileSync(join(proj, 'src', 'sneak.js'), 'x\n')
    mkdirSync(join(proj, '.claude', 'skills', 'helper'), { recursive: true })
    writeFileSync(join(proj, '.claude', 'skills', 'helper', 'SKILL.md'), 'x\n')
    mkdirSync(join(proj, 'attachments'), { recursive: true })
    writeFileSync(join(proj, 'attachments', 'spec-v2.md'), 'x\n')
    writeFileSync(join(proj, 'CLAUDE.md'), 'x\n')

    const r = reconcileTargetFiles({ cwd: proj, specBase: sb, changeName: 'c1', runtimeRoot: join(sb, '.runtime') })
    assert(r.matched.includes('src/feature.js'), '①声明∩actual：feature.js matched')
    assert(r.undeclared.length === 1 && r.undeclared[0].path === 'src/sneak.js', '③类只剩真未声明 sneak.js（脚手架不逐条进）')
    assert(r.undeclaredScaffold === 3, `脚手架聚合计数=3（claude/skills+attachments+CLAUDE.md，实际 ${r.undeclaredScaffold}）`)
    assert(r.notes.some(n => n.includes('3 个工具/平台脚手架文件') && n.includes('.claude/skills/helper/SKILL.md')), '聚合 note 带计数与样例')
    assert(r.status === 'undeclared', '有真未声明 → status=undeclared（WARNING 语义保留）')

    // 全脚手架形态：无真未声明 → ok（脚手架不构成 scope creep）
    rmSync(join(proj, 'src', 'sneak.js'))
    const r2 = reconcileTargetFiles({ cwd: proj, specBase: sb, changeName: 'c1', runtimeRoot: join(sb, '.runtime') })
    assert(r2.status === 'ok' && r2.undeclared.length === 0, '仅剩脚手架 → status=ok（修复前 undeclared 刷屏）')
    assert(r2.undeclaredScaffold === 3 && r2.notes.some(n => n.includes('脚手架文件')), 'ok 态仍留聚合 note（可见性不丢）')
  }

  // ─────────────────────────────────────────
  console.log('\n[D] 探针5 跨仓 scope 注记（probe5-cross-repo-scope-blindness）')
  {
    const base = {
      probe1: { matches: [], skippedFiles: [], worktreeHits: 0, globEntries: [] },
      probe3: { results: [], tasks: [] },
      probe5: { ok: true, missingBackend: [], unusedBackend: [], summary: 'backend 3 端点 / frontend 0 调用', backendCount: 3, frontendCount: 0, crossRepoCardCount: 2 },
      probe6: { deletions: [], unavailable: false },
      probe7: { applicable: false, tasks: [] },
    }
    const md = renderVerifyProbesReport(base)
    assert(md.includes('parity 扫描面只含主仓') && md.includes('2 张跨仓 task 卡'), '有跨仓卡 → 渲染扫描面边界注记')

    const md2 = renderVerifyProbesReport({ ...base, probe5: { ...base.probe5, crossRepoCardCount: undefined } })
    assert(!md2.includes('parity 扫描面只含主仓'), '无跨仓卡 → 不渲染注记（零回归）')
  }

  // ─────────────────────────────────────────
  console.log('\n[E] push 409 自愈键控闸（syncSelfHealWarn）')
  {
    const rt = join(tmpRoot, 'e', '.runtime')
    bindSyncNoiseRoot(rt)
    const change = 'my-change'

    let cap = capture()
    const v1 = syncSelfHealWarn(change, 'self-race', '⚠️ [sync] push 409 自竞态判定：平台 ts=t1')
    cap.restore()
    assert(v1 === true && cap.warns.length === 1, '首报完整可见（含 ⚠️ 原文）')

    cap = capture()
    const v2 = syncSelfHealWarn(change, 'self-race', '⚠️ [sync] push 409 自竞态判定：平台 ts=t2')
    cap.restore()
    assert(v2 === false && cap.warns.length === 0, '窗口内同变更同类型静默（ts 变了也静默——键不含 ts）')

    cap = capture()
    const v3 = syncSelfHealWarn(change, 'self-echo', '⚠️ [sync] push 409 自回声判定：ts=t2')
    cap.restore()
    assert(v3 === true && cap.warns.length === 1, '同变更不同类型（kind 键控）首报可见')

    cap = capture()
    const v4 = syncSelfHealWarn(change, 'self-race', '⚠️ [sync] push 409 自竞态判定：ts=t3', { noMute: true })
    cap.restore()
    assert(v4 === true && cap.warns.length === 1, '手动 platform sync（noMute）旁路可见')

    // 模拟下一进程（marker 留存、进程内状态清空）：窗口内仍静默
    _resetSyncNoiseForTest()
    bindSyncNoiseRoot(rt)
    cap = capture()
    const v5 = syncSelfHealWarn(change, 'self-race', '⚠️ [sync] push 409 自竞态判定：ts=t4')
    cap.restore()
    assert(v5 === false && cap.warns.length === 0, '跨进程窗口内静默（每步命令重刷的正是这种）')
    assert(existsSync(join(rt, 'sync-noise-self-heal.json')), 'marker 已落盘')
  }
} finally {
  rmSync(tmpRoot, { recursive: true, force: true })
  _resetSyncNoiseForTest()
}

console.log(failures === 0 ? `\n✅ 通过: 全部` : `\n❌ 失败: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
