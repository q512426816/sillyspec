/**
 * session-friction-crossrepo-fixes.test.mjs — wp 会话（2026-09-15 奖惩功能开发）实证的
 * 跨仓/门控四坑回归：
 *
 *   ① register-repo-specbase-split-brain：平台模式下 register-repo 写平台 spec 根
 *      local.yaml，而 repos: 读侧（execute MultiRepoContext / plan-postcheck / worktree-cross）
 *      恒读 <cwd>/.sillyspec/local.yaml → 注册=死配置，execute fail-closed 报未注册。
 *      修复：无显式 --spec-dir 时写目标走读侧对齐链（项目 local.yaml）+ spec 根双份提醒。
 *   ② design-file-ref-cross-repo-blind：validateDesignFileList 只按主仓核验存在性，
 *      `## <repo> 仓变更` 段（D-014）下的跨仓「修改」既有文件被逼标 NEW:（41 条误报）。
 *      修复：分段 + local.yaml repos: 注册根逐段核验。
 *   ③ verify-cmd-absolute-cd-path / verify-cmd-cross-repo-root：TaskCard verify 的
 *      `cd <绝对路径> &&` 被 join(主仓根, 绝对路径) 拼成病态路径；卡片 repo: 声明未切换
 *      命令存在性校验的基准根。修复：绝对路径不拼根 + 跨仓卡以注册根为基准。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateDesignFileList } from '../src/design-facts.js'
import { validateScriptCommands } from '../src/stages/cmd-existence.js'
import { validateTaskCommands } from '../src/stages/plan-postcheck.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpDirs.push(d)
  return d
}
function cleanupAll() { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }
function gitInit(dir) { execSync('git init -q', { cwd: dir, stdio: 'pipe' }) }
function writePkg(dir, scripts) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', scripts }, null, 2))
}
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')

console.log('=== ① register-repo 写目标对齐读侧（平台模式双 local.yaml 分裂）===')
{
  const project = mkTmp('rr-proj-')
  const specRoot = mkTmp('rr-spec-')
  const crossRepo = mkTmp('rr-cross-')
  gitInit(crossRepo)

  // 平台模式：pointer 指向 spec 根；两侧都已有 local.yaml（wp 会话同构）
  mkdirSync(join(project, '.sillyspec'), { recursive: true })
  mkdirSync(specRoot, { recursive: true })
  writeFileSync(join(project, '.sillyspec-platform.json'), JSON.stringify({ specRoot: specRoot.replace(/\\/g, '/') }), 'utf8')
  const specYaml = join(specRoot, 'local.yaml')
  const projYaml = join(project, '.sillyspec', 'local.yaml')
  writeFileSync(specYaml, 'repos:\n  old-key: C:/somewhere/old\n', 'utf8')
  writeFileSync(projYaml, 'repos:\n  sub-grid-security: C:/somewhere/web\n', 'utf8')

  const res = spawnSync(process.execPath, [join(repoRoot, 'bin', 'sillyspec.js'),
    'local', 'register-repo', 'spdemo', crossRepo, '--dir', project], {
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000,
  })
  const out = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `CLI exit=0（实际 ${res.status}；输出：${out.slice(-300)}）`)

  const projAfter = readFileSync(projYaml, 'utf8')
  const specAfter = readFileSync(specYaml, 'utf8')
  assert(/spdemo:/.test(projAfter), '注册写进项目 local.yaml（读侧对齐——修复前写平台 spec 根死配置）')
  assert(!/spdemo:/.test(specAfter), '平台 spec 根 local.yaml 未被写入（不再分裂双写）')
  assert(projAfter.includes('sub-grid-security'), '项目 local.yaml 既有条目保留（外科手术式）')
  assert(/repos\.spdemo 已注册/.test(out), 'CLI 输出注册成功')
  assert(/死配置/.test(out), '双份 local.yaml 时输出 spec 根 repos: 不生效提醒')
}

console.log('\n=== ② validateDesignFileList 跨仓分段核验 ===')
{
  const cwd = mkTmp('dfl2-cwd-')
  const crossRoot = mkTmp('dfl2-cross-')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `repos:\n  web: ${crossRoot.replace(/\\/g, '/')}\n`, 'utf8')
  writeFileSync(join(cwd, 'README.md'), 'x', 'utf8')
  mkdirSync(join(crossRoot, 'src', 'common'), { recursive: true })
  writeFileSync(join(crossRoot, 'src', 'common', 'router.js'), 'x', 'utf8')

  const changeDir = join(cwd, '.sillyspec', 'changes', 'demo')
  mkdirSync(changeDir, { recursive: true })
  const FM = '---\nauthor: t\ncreated_at: 2026-09-15T00:00:00\nscale: large\n---\n\n'
  writeFileSync(join(changeDir, 'design.md'), FM + `## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | README.md | 主仓既有 |

## web 仓变更

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/common/router.js | 跨仓既有（修复前被逼标 NEW:） |
| 修改 | src/ghost.js | 跨仓幻觉 |
| 新增 | NEW:src/brand-new.js | 计划新建 |

## notregistered 仓变更

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/whatever.js | 仓未注册 |
`, 'utf8')

  const r = validateDesignFileList({ changeDir, cwd })
  const errPaths = r.errors.map(e => e.path)
  assert(!errPaths.includes('src/common/router.js'), '跨仓段既有文件按其仓根核验通过（不再要求 NEW:）')
  assert(errPaths.includes('src/ghost.js'), '跨仓段幻觉路径仍报 error')
  assert(r.errors.some(e => e.path === 'src/ghost.js' && e.message.includes('web 仓')), 'error 消息指明核验根（web 仓）')
  assert(!errPaths.some(p => p.startsWith('NEW:')), 'NEW: 豁免保持')
  assert(!errPaths.includes('README.md'), '主仓段（段头前）照常按主仓核验')
  assert(r.warnings.some(w => w.includes('notregistered') && w.includes('未在 local.yaml repos: 注册')), '未注册仓段降级为 warning + register-repo 指引')

  // 零回归：无段头整章 main（既有用例覆盖于 design-file-list-gate.test.mjs，此处补一条冒烟）
  writeFileSync(join(changeDir, 'design.md'), FM + `## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | nope-main.js | 幻觉 |\n`, 'utf8')
  const r2 = validateDesignFileList({ changeDir, cwd })
  assert(r2.ok === false && r2.errors[0].path === 'nope-main.js', '无段头 → 整章按主仓核验（零回归）')
}

console.log('\n=== ③-a validateScriptCommands：cd 绝对路径不再拼主仓根 ===')
{
  const mainRoot = mkTmp('cmd3-main-')
  const crossRoot = mkTmp('cmd3-cross-')
  writePkg(mainRoot, { test: 'x' }) // 主仓根有 package.json 但无 lint
  writePkg(crossRoot, { lint: 'x' })
  const absCross = crossRoot.replace(/\\/g, '/')

  const bad = validateScriptCommands(`cd ${absCross} && npm run lint`, { projectRoot: mainRoot })
  assert(bad.invalid.length === 0, `绝对 cd 路径直接解析（修复前 join 出 <主仓>/${absCross} 病态路径误报死命令）`)

  const stillChecked = validateScriptCommands(`cd ${absCross} && npm run nope`, { projectRoot: mainRoot })
  assert(stillChecked.invalid.length === 1 && stillChecked.invalid[0].cmd === 'npm run nope', '绝对路径下 script 不存在仍报 invalid（校验强度不降）')

  writePkg(join(mainRoot, 'sub'), { test: 'x' })
  const rel = validateScriptCommands('cd sub && npm run test', { projectRoot: mainRoot })
  assert(rel.invalid.length === 0, '相对 cd 路径仍按主仓根解析锁定子目录（零回归）')
}

console.log('\n=== ③-b validateTaskCommands：跨仓卡按其仓根核验命令 ===')
{
  const mainRoot = mkTmp('tc3-main-')
  const crossRoot = mkTmp('tc3-cross-')
  writePkg(mainRoot, { test: 'x' })
  writePkg(join(crossRoot, 'src'), { lint: 'x' })

  const changeDir = join(mainRoot, '.sillyspec', 'changes', 'demo3')
  const tasksDir = join(changeDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 跨仓卡
repo: web
allowed_paths:
  - src
goal: >
  x
implementation: 修改
acceptance: ok
verify:
  - cd src && npm run lint
---
正文
`, 'utf8')

  const registry = new Map([['web', crossRoot]])
  const withReg = validateTaskCommands(changeDir, mainRoot, null, registry)
  assert(withReg.ok === true, '跨仓卡 repo: 命中注册表 → 以跨仓根核验（src/package.json 的 lint 命中）')

  const noReg = validateTaskCommands(changeDir, mainRoot, null, null)
  assert(noReg.ok === false && noReg.errors[0].includes('npm run lint'), '不传注册表 → 按主仓根解析报 invalid（证明根切换生效，主仓无 src/package.json）')

  // 主仓卡零回归
  writeFileSync(join(tasksDir, 'task-02.md'), `---
id: task-02
title: 主仓卡
allowed_paths:
  - src
goal: >
  x
implementation: 修改
acceptance: ok
verify: npm run test
---
正文
`, 'utf8')
  const mixed = validateTaskCommands(changeDir, mainRoot, null, registry)
  assert(mixed.ok === true, '主仓卡（无 repo:）仍按主仓根核验（npm run test 命中主仓 scripts）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) console.log(`❌ 失败项: ${failures.join('; ')}`)
cleanupAll()
process.exit(failed === 0 ? 0 : 1)
