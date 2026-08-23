/**
 * 跨仓三坑回归（2026-08-23 用户实证批次）：
 *   ① register-repo CRLF 死循环（坑 register-repo-crlf-idempotent-loop）：外部写入的 CRLF
 *      local.yaml + register-repo 幂等跳过不落盘 + parseRepoRegistry 唯一没归一 → 假成功死循环。
 *      双保险：解析侧容 \r + 写侧幂等路径落盘治愈。
 *   ③ 幽灵目录 junction 穿透（坑 ghost-dir-junction-pierce）：safeRemoveWorktreeDir /
 *      unlinkNodeModulesLinks 共享解链（根 + depsModules 子模块）；doctor ghost-dir-with-files
 *      junction 警示。
 *   ② 派生产物基线漂移（坑 derived-artifact-stale-baseline）：apply 的 hashMismatch advisory。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync, execFileSync } from 'child_process'
import { parseRepoRegistry } from '../src/stages/plan-postcheck.js'
import { registerRepoInLocalYaml } from '../src/local-register.js'
import { unlinkNodeModulesLinks, safeRemoveWorktreeDir, WorktreeManager } from '../src/worktree.js'
import { applyWorktree } from '../src/worktree-apply.js'
import { computeBaselineHash } from '../src/worktree.js'

let passed = 0, failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function git(args, cwd) { return execSync('git ' + args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }

const tmpRoots = []
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
const cleanupAll = () => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ①-1 parseRepoRegistry 容 CRLF（解析侧保险）===')
{
  const crlf = 'repos:\r\n  shared-lib: C:/x/shared-lib\r\n  hub: C:/y/hub\r\n'
  const reg = parseRepoRegistry(crlf)
  assertTrue(reg.size === 2 && reg.get('shared-lib') === 'C:/x/shared-lib' && reg.get('hub') === 'C:/y/hub',
    `CRLF 文本 → Map 含全部 key（实际 ${JSON.stringify([...reg.entries()])}——修复前 \\r 致条目正则全失配返回空 Map）`)
  const lf = parseRepoRegistry('repos:\n  a: /tmp/a\n')
  assertTrue(lf.size === 1, 'LF 文本零回归')
}

console.log('\n=== ①-2 registerRepoInLocalYaml 幂等路径治愈 CRLF（写侧保险）===')
{
  const d = mkTmp('crlf-heal-')
  const yamlPath = path.join(d, '.sillyspec', 'local.yaml')
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  // 模拟外部写入的 CRLF（agent Write 工具/Windows 编辑器）且条目已存在同值
  fs.writeFileSync(yamlPath, 'repos:\r\n  shared-lib: C:/x/shared-lib\r\n')
  const r = registerRepoInLocalYaml(yamlPath, 'shared-lib', 'C:/x/shared-lib')
  assertTrue(r.replaced === false, `幂等（值未变）语义保持（replaced=${r.replaced}）`)
  const after = fs.readFileSync(yamlPath, 'utf8')
  assertTrue(!after.includes('\r'), `磁盘被治愈为 LF（幂等路径也落盘——治「假成功」死循环）`)
  assertTrue(parseRepoRegistry(after).get('shared-lib') === 'C:/x/shared-lib', '治愈后 parseRepoRegistry 可读回（循环解开）')
  // LF 文件幂等仍不改文件（零回归）
  const before2 = fs.readFileSync(yamlPath, 'utf8')
  registerRepoInLocalYaml(yamlPath, 'shared-lib', 'C:/x/shared-lib')
  assertTrue(fs.readFileSync(yamlPath, 'utf8') === before2, 'LF 文件幂等仍不改文件（既有断言零回归）')
}

console.log('\n=== ③-1 unlinkNodeModulesLinks：根 + 子模块 junction 全解（Windows）===')
if (process.platform === 'win32') {
  const base = mkTmp('junc-')
  const fakeMain = path.join(base, 'main')
  const fakeMainSub = path.join(base, 'main', 'frontend', 'node_modules')
  fs.mkdirSync(path.join(fakeMain, 'node_modules'), { recursive: true })
  fs.mkdirSync(fakeMainSub, { recursive: true })
  fs.writeFileSync(path.join(fakeMain, 'node_modules', '.keep'), '')
  fs.writeFileSync(path.join(fakeMainSub, '.keep'), '')
  const wt = path.join(base, 'wt')
  fs.mkdirSync(path.join(wt, 'frontend'), { recursive: true })
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', path.join(wt, 'node_modules'), path.join(fakeMain, 'node_modules')], { stdio: ['pipe', 'pipe', 'pipe'] })
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', path.join(wt, 'frontend', 'node_modules'), fakeMainSub], { stdio: ['pipe', 'pipe', 'pipe'] })

  const details = []
  const n = unlinkNodeModulesLinks(wt, { depsModules: [{ path: 'frontend', status: 'linked' }] }, details)
  assertTrue(n === 2, `根 + depsModules 子模块 junction 均解除（${n}，此前子模块 junction 不覆盖）`)
  assertTrue(fs.existsSync(path.join(fakeMain, 'node_modules', '.keep')) && fs.existsSync(path.join(fakeMainSub, '.keep')),
    '假主仓 node_modules 内容完好（未穿透）')
  assertTrue(!fs.existsSync(path.join(wt, 'node_modules')) && !fs.existsSync(path.join(wt, 'frontend', 'node_modules')), 'worktree 侧 junction 已移除')
  assertTrue(details.length === 2, `details 记录解链明细（${details.length} 条）`)

  // safeRemoveWorktreeDir：重建 junction 后整目录安全删除
  fs.mkdirSync(path.join(wt, 'frontend'), { recursive: true })
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', path.join(wt, 'node_modules'), path.join(fakeMain, 'node_modules')], { stdio: ['pipe', 'pipe', 'pipe'] })
  fs.writeFileSync(path.join(wt, 'code.js'), 'x')
  safeRemoveWorktreeDir(wt, { depsModules: [{ path: 'frontend', status: 'linked' }] })
  assertTrue(!fs.existsSync(wt), 'safeRemoveWorktreeDir 删除 worktree 目录')
  assertTrue(fs.existsSync(path.join(fakeMain, 'node_modules', '.keep')), '删除后主仓 node_modules 内容完好（穿透防护核心）')
} else {
  console.log('  ⏭️ 跳过（非 Windows 无 junction）')
}

console.log('\n=== ③-2 doctor ghost-dir-with-files junction 警示 ===')
{
  const d = mkTmp('ghost-')
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'README.md'), 'x\n')
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm init', d)
  // 幽灵目录：无 meta、含文件 + node_modules junction（Windows）或普通目录占位（跨平台跑判定）
  const ghost = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'ghosty')
  fs.mkdirSync(ghost, { recursive: true })
  fs.writeFileSync(path.join(ghost, 'leftover.js'), 'x')
  if (process.platform === 'win32') {
    const fakeMain = path.join(d, 'main-nm')
    fs.mkdirSync(fakeMain, { recursive: true })
    fs.writeFileSync(path.join(fakeMain, '.keep'), '')
    execFileSync('cmd.exe', ['/c', 'mklink', '/J', path.join(ghost, 'node_modules'), fakeMain], { stdio: ['pipe', 'pipe', 'pipe'] })
  }
  process.chdir(d)
  const wm = new WorktreeManager({ cwd: d })
  const diag = await wm.doctor({ fix: false })
  const ghostIssue = diag.issues.find(i => i.type === 'ghost-dir-with-files' && i.name === 'ghosty')
  assertTrue(!!ghostIssue, `检出 ghost-dir-with-files（${JSON.stringify(diag.issues.map(i => i.type + ':' + i.name))}）`)
  if (process.platform === 'win32') {
    assertTrue(ghostIssue.detail.includes('junction') && ghostIssue.detail.includes('rm -rf'), `detail 含 junction 穿透警示（实际 ${ghostIssue.detail.slice(-160)}）`)
    assertTrue(ghostIssue.detail.includes('rmdir'), '警示给安全手动指引（先解链再删）')
  }
  assertTrue(ghostIssue.fixable === false, '含文件幽灵保持 fixable:false（内容不明不自动删）')
  process.chdir(os.tmpdir())
}

console.log('\n=== ② apply 派生产物基线漂移 advisory（hashMismatch 消费）===')
{
  const d = mkTmp('derived-')
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'api-types.ts'), 'enum E {\n  A = 1\n}\n')
  fs.writeFileSync(path.join(d, 'other.txt'), 'o\n')
  sh('git add -A && git commit -qm init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gitignore', d)
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  // worktree 改 api-types.ts 文件头（旧基线生成的形态）
  fs.writeFileSync(path.join(wtDir, 'api-types.ts'), '// wt-generated\nenum E {\n  A = 1\n}\n')
  sh('git add -A && git commit -qm wt-change', wtDir)
  // 主仓基线后推进同文件尾部（并行变更合入新枚举——不同区域，3way 可干净合）
  fs.writeFileSync(path.join(d, 'api-types.ts'), 'enum E {\n  A = 1\n}\n// parallel-added\n')
  sh('git add -A && git commit -qm parallel-merge', d)
  const base = git('rev-parse HEAD~1', d)
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash: computeBaselineHash(d),
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }))
  process.chdir(d)
  const r = applyWorktree('tc', { cwd: d })
  process.chdir(os.tmpdir())
  assertTrue(r.ok === true, `3way 干净可合 → apply 成功（实际 errors: ${JSON.stringify((r.errors || []).map(e => e.slice(0, 60)))}）`)
  assertTrue((r.warnings || []).some(w => w.includes('基线后主仓已有新提交') && w.includes('api-types.ts')),
    `derivedRisk warning：点名列出漂移文件 + 指引重跑生成命令（实际 ${JSON.stringify((r.warnings || []).map(w => w.slice(0, 60)))}）`)
  assertTrue((r.warnings || []).some(w => w.includes('重跑生成命令')), 'warning 含「重跑生成命令」指引')
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
