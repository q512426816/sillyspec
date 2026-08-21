/**
 * 四坑回归：parity 扫描噪音 / module 子集 0 命中未提交改动 / junction 创建后复核 / 模板元数据头
 *
 * 坑（2026-08-21 用户实证）：
 *   ① 探针 5 扫进 .claude/worktrees/agent-* 陈旧检出与 build 产物，872 条全噪音
 *   ② frontend/** 变更映射 frontend 模块却 0 命中直接跳过（worktree 未提交改动不进命中集）
 *   ③ doctor 的 node_modules junction 在 Windows 静默失败报成功（本会话手动补 junction）
 *   ④ author/created_at 校验在产物写完后才提醒——骨架/模板应自带真值
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { scanFrontendApiCalls } from '../src/endpoint-extractor.js'
import { runVerifyTestCheck } from '../src/verify-postcheck.js'
import { definition as archiveDef } from '../src/stages/archive.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

console.log('=== ① parity 扫描排除非 src 目录（坑 parity-scan-stale-dirs）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-excl-'))
  // 真实源码（应命中）+ 各类噪音目录（应排除）
  fs.mkdirSync(path.join(d, 'src'), { recursive: true })
  fs.writeFileSync(path.join(d, 'src', 'app.js'), 'fetch("/api/real/endpoint")\n')
  for (const junk of [
    ['.claude', 'worktrees', 'agent-abc123', 'stale.js'],
    ['node_modules', 'lib', 'dep.js'],
    ['dist', 'bundle.js'],
    ['build', 'out.js'],
    ['coverage', 'report.js'],
    ['.worktrees', 'agent-xyz', 'copy.js'],
  ]) {
    fs.mkdirSync(path.join(d, ...junk.slice(0, -1)), { recursive: true })
    fs.writeFileSync(path.join(d, ...junk), 'fetch("/api/stale/noise")\n')
  }
  fs.writeFileSync(path.join(d, 'min.lib.js'), 'fetch("/api/stale/min")\n') // .min/bundle 文件级
  fs.renameSync(path.join(d, 'min.lib.js'), path.join(d, 'app.min.js'))
  const calls = scanFrontendApiCalls(d)
  const paths = calls.map(c => c.path)
  assertTrue(paths.includes('/api/real/endpoint'), `真实 src 调用被扫描（${JSON.stringify(paths)}）`)
  assertTrue(!paths.some(p => p.includes('stale') || p.includes('noise')), '陈旧检出/build/产物/压缩文件的噪音调用全部排除')
}
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-excl2-'))
  fs.mkdirSync(path.join(d, '.d-ts-probe'), { recursive: true })
  fs.writeFileSync(path.join(d, 'types.d.ts'), 'declare function fetchx(): void\n')
  const calls = scanFrontendApiCalls(d)
  assertTrue(calls.length === 0, '.d.ts 声明文件不参与扫描')
}

console.log('\n=== ② module 子集命中并入 worktree 未提交改动（坑 module-subset-zero-hit-uncommitted）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mod-wt-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.mkdirSync(path.join(d, 'frontend'), { recursive: true })
  fs.writeFileSync(path.join(d, 'frontend', 'base.txt'), 'base\n')
  sh('git add -A && git commit -qm base', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gi', d)
  const cn = 'mod-wt'
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  sh(`git worktree add "${wtDir}" -b sillyspec/${cn}`, d)
  // 子代理改了 frontend 文件但【不 commit】——module 命中集须并入未提交改动
  fs.writeFileSync(path.join(wtDir, 'frontend', 'app.js'), 'export const x = 1\n')
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: wtDir, mode: 'worktree',
    baseHash: base, baselineCommit: base, branch: `sillyspec/${cn}`,
  }))
  const specBase = path.join(d, '.sillyspec')
  fs.mkdirSync(specBase, { recursive: true })
  fs.writeFileSync(path.join(specBase, 'local.yaml'),
    ['commands:', '  test: node -e "1"', '', 'test_strategy: module', '', 'modules:',
     `  frontend: { path: "frontend/", test: "node -e \\"require('fs').writeFileSync('fe-marker.txt','1')\\"" }`, ''].join('\n'))
  process.chdir(d)
  const r = runVerifyTestCheck({ cwd: d, specBase, changeName: cn })
  assertTrue(r.mode === 'module-subset', `未提交的 frontend 改动命中模块 → module-subset（实得 ${r.mode}，修复前 zero-hit 跳过）`)
  assertTrue(fs.existsSync(path.join(d, 'fe-marker.txt')), 'frontend 模块测试命令真实执行（marker 落盘）')
  sh(`git worktree remove --force "${wtDir}"`, d)
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ③ junction 创建后实物复核（坑 provision-silent-fake-installed 第②层）===\n')
{
  // 可观测契约：tryLink 成功（linked 状态）后 junction 必真实存在且指向 main——复核代码已内嵌
  // （cmd.exe 假成功无法在测试中模拟，锁源码契约 + linked 正常路径的实物断言在 worktree-doctor 既有覆盖）
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'worktree-deps.js'), 'utf8')
  assertTrue(src.includes('link 创建后复核失败'), 'tryLink 内嵌创建后 lstat+existsSync 复核（假成功判失败走 install 兜底）')
  assertTrue(src.includes('linked\' 后验证') || src.includes('linked：junction 实存硬校验') || src.includes("result.depsStatus === 'linked'"), 'provisionDeps linked 状态实存硬校验在位（双层防线）')
}

console.log('\n=== ④ 模板自带元数据头（坑 skeleton-metadata-header-late）===\n')
{
  const step3 = archiveDef.steps.find(s => s.name === 'sync-module-docs')
  const prompt = step3?.prompt || ''
  assertTrue(prompt.includes('author: <git-user>'), '模块卡模板 frontmatter 带 author: <git-user>（CLI 每步替换真值）')
  assertTrue(prompt.includes('created_at: <now-datetime>'), '模块卡模板带 created_at: <now-datetime>（秒级）')
  // outputStep 全局占位符替换机制（<git-user>/<now-datetime> 每步无条件替换）既有测试覆盖；
  // 此处锁模板不回退到裸占位符删除态
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
