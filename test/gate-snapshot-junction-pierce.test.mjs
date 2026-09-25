/**
 * junction 穿透回归测试（坑 git-worktree-remove-pierce，2026-09-24 R16 批次一收口实证）
 *
 * 根因：`git worktree remove --force` 的递归删在 Windows **跟随 junction**——删含链接的
 * 快照目录会把链接目标（主仓 node_modules/venv/gate_snapshot.copy 真身）内容一并删光
 * （当晚主仓依赖树三次被清空、js-yaml ERR_MODULE_NOT_FOUND 连环的根因；git remove 本身
 * 「成功」返回，穿透无声）。修复 = cleanupSnapshot / reclaimStaleGateSnapshots 先解链
 * 全部 reparse 点再交给 git/rmSync 删目录本体（junction-rm.js）。
 *
 * 本测试用真实 junction 钉死四件事：
 * 1. 环境自证（warn 级）：裸 rmSync 若穿透则提示（受控测试未复现，守护性保留）；
 * 2. safeRemoveDirWithLinks 删含 junction 的目录：目标内容完好；
 * 3. cleanupSnapshot removeDir 分支（runGit 注入抛错）：目标内容完好；
 * 4. 端到端真 git 路径（真实仓 + worktree + junction + 真 git remove）：目标内容完好
 *    ——当晚事故形态逐字复现的核心回归。
 * 非 Windows 平台 junction 不可建，全组跳过。
 *
 * 设计依据：src/run/junction-rm.js、src/run/gate-snapshot.js cleanupSnapshot。
 */
import { safeRemoveDirWithLinks } from '../src/run/junction-rm.js'
import { cleanupSnapshot } from '../src/run/gate-snapshot.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

let failures = 0
const roots = []
const assert = (cond, msg, warnOnly = false) => {
  if (cond) console.log('  ✅ ' + msg)
  else if (warnOnly) console.log('  ⚠️ ' + msg + '（环境不再复现穿透——守护性断言降级 warn）')
  else { console.error('  ❌ ' + msg); failures++ }
}
const newDir = (prefix) => { const d = mkdtempSync(join(tmpdir(), prefix)); roots.push(d); return d }
const mkJunction = (linkPath, targetPath) => {
  mkdirSync(linkPath, { recursive: true })
  // 清掉占位目录再建 junction（mklink 要求链接点不存在）
  rmSync(linkPath, { recursive: true, force: true })
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', linkPath, targetPath], { windowsHide: true })
}
const makeVictim = (root) => {
  const nm = join(root, 'node_modules', 'marker-pkg')
  mkdirSync(nm, { recursive: true })
  writeFileSync(join(nm, 'package.json'), '{"name":"marker-pkg"}', 'utf8')
  return nm
}

console.log('\n[junction-pierce] 快照清理穿透回归（Node ' + process.version + ' / ' + process.platform + '）')

if (process.platform !== 'win32') {
  console.log('  ⏭️ 非 Windows 平台无 junction——全组跳过')
} else {
  // ── 1. 环境自证：裸 rmSync 穿透（Node 若修复则降级 warn，不影响 2/3 的守护价值）──
  {
    const root = newDir('jp-bare-')
    const victim = makeVictim(root)
    const holder = join(root, 'holder')
    mkJunction(join(holder, 'node_modules'), victim)
    // 占位文件保证 holder 非空（与真实快照形态一致：junction + 普通文件混布）
    writeFileSync(join(holder, 'marker.txt'), 'x', 'utf8')
    rmSync(holder, { recursive: true, force: true })
    const pierced = !existsSync(join(victim, 'package.json'))
    assert(pierced, '环境自证：裸 rmSync(recursive) 穿透 junction（目标内容被删）', true)
  }

  // ── 2. safeRemoveDirWithLinks：目标完好 ──
  {
    const root = newDir('jp-safe-')
    const victim = makeVictim(root)
    const holder = join(root, 'holder')
    mkdirSync(holder, { recursive: true })
    writeFileSync(join(holder, 'marker.txt'), 'x', 'utf8')
    mkJunction(join(holder, 'node_modules'), victim)
    safeRemoveDirWithLinks(holder)
    assert(!existsSync(holder), 'safeRemoveDirWithLinks：含 junction 目录已删')
    assert(existsSync(join(victim, 'package.json')), 'safeRemoveDirWithLinks：链接目标内容完好（marker-pkg 还在）')
    // 嵌套形态：junction 在子目录层（venv/copy 面真实形态）
    const victim2 = makeVictim(join(root, 'deep'))
    const holder2 = join(root, 'holder2')
    mkdirSync(join(holder2, 'sub', 'a'), { recursive: true })
    writeFileSync(join(holder2, 'sub', 'a', 'f.txt'), 'x', 'utf8')
    mkJunction(join(holder2, 'sub', 'a', 'node_modules'), victim2)
    safeRemoveDirWithLinks(holder2)
    assert(existsSync(join(victim2, 'package.json')), 'safeRemoveDirWithLinks：嵌套深层 junction 目标完好')
  }

  // ── 3. cleanupSnapshot 默认路径（快照清理真实入口；runGit 注入抛错走 removeDir 分支）──
  {
    const root = newDir('jp-cleanup-')
    const victim = makeVictim(root)
    const snap = join(root, 'snap')
    mkdirSync(snap, { recursive: true })
    writeFileSync(join(snap, 'marker.txt'), 'x', 'utf8')
    mkJunction(join(snap, 'node_modules'), victim)
    const r = cleanupSnapshot({
      snapshotRoot: snap,
      cwd: root,
      runGit: () => { throw new Error('git remove 注入失败——逼 removeDir 分支') },
      worktreeRegistered: () => false,
    })
    assert(r.dirRemoved === true && !existsSync(snap), 'cleanupSnapshot（removeDir 分支）：快照目录已删')
    assert(existsSync(join(victim, 'package.json')),
      'cleanupSnapshot（removeDir 分支）：junction 目标内容完好')
  }

  // ── 4. 端到端真 git 路径（当晚事故形态逐字复现）：真实仓 + worktree + junction +
  //    cleanupSnapshot 默认 runGit=真 git worktree remove——修复前该路径实测穿透
  //    （git remove「成功」且删光 victim 内容）。修复=先解链再交 git。──
  if (process.platform === 'win32') {
    const root = newDir('jp-e2e-')
    const mainDir = join(root, 'main')
    mkdirSync(mainDir, { recursive: true })
    const G = (args) => execFileSync('git', args, { cwd: mainDir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    G(['init', '-q'])
    G(['config', 'user.email', 't@t'])
    G(['config', 'user.name', 't'])
    writeFileSync(join(mainDir, 'f.txt'), 'x', 'utf8')
    G(['add', 'f.txt']); G(['commit', '-qm', 'init'])
    const victim = makeVictim(mainDir) // main/node_modules/marker-pkg（主仓真身）
    const snap = join(root, 'snap')
    execFileSync('git', ['worktree', 'add', '--detach', '--quiet', snap, 'HEAD'], { cwd: mainDir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    writeFileSync(join(snap, 'marker.txt'), 'x', 'utf8')
    mkJunction(join(snap, 'node_modules'), victim)
    const r = cleanupSnapshot({ snapshotRoot: snap, cwd: mainDir, worktreeRegistered: () => false })
    assert(r.dirRemoved === true && !existsSync(snap), '端到端（真 git worktree remove 路径）：快照目录已删')
    assert(existsSync(join(victim, 'package.json')) && readFileSync(join(victim, 'package.json'), 'utf8').includes('marker-pkg'),
      '端到端（真 git worktree remove 路径）：主仓 node_modules 真身完好——当晚清空事故的核心回归断言')
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${3 - failures}  ❌ 失败: ${failures}`)
for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* 清理 best-effort */ } }
if (failures > 0) throw new Error(`${failures} test(s) failed`)
