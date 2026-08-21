/**
 * 坑 provision-monorepo-subpackage-fake-installed 回归：pnpm monorepo 子包假 installed
 *
 * 复发链（2026-08-22 实证）：pnpm workspace 根 package.json 的 dependencies 为空（依赖在
 * frontend/daemon 子包）→ 旧后验证的 hasDeclaredDeps 只查根 = false → installed 状态整体
 * 跳过校验 → doctor 标 installed 但 frontend/daemon 的 node_modules 全缺 → deps gate 放行
 * → Wave 1 daemon 测试挂。
 *
 * 锁定语义：
 *   ① 根无依赖 + modules 块子包有依赖 + install 报成功但子包 node_modules 缺 → failed，
 *      depsError 点名缺失子包并给 workspace install 兜底
 *   ② 子包 node_modules 预建（模拟 workspace install 真成功）→ installed 放行
 *   ③ 根与子包都无依赖声明（空壳 monorepo）→ installed 不校验（合法不建，零误杀）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { provisionDeps } from '../src/worktree-deps.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

/** monorepo fixture：workspace 根（空 deps）+ frontend/daemon 子包（有 deps）+ modules 块 */
function mkMonorepo(name, { subDeps } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `mono-${name}-`))
  const main = path.join(d, 'main'); const wt = path.join(d, 'wt'); const spec = path.join(d, 'spec')
  fs.mkdirSync(main); fs.mkdirSync(wt); fs.mkdirSync(spec)
  // workspace 根：pnpm-lock + 空 dependencies（monorepo 常态）
  fs.writeFileSync(path.join(main, 'pnpm-lock.yaml'), 'lock-1')
  fs.writeFileSync(path.join(wt, 'pnpm-lock.yaml'), 'lock-1-DIFF') // 不一致 → 必进 install 分支
  fs.writeFileSync(path.join(main, 'package.json'), JSON.stringify({ name: 'root', private: true, workspaces: ['frontend', 'daemon'] }))
  fs.writeFileSync(path.join(wt, 'package.json'), JSON.stringify({ name: 'root', private: true, workspaces: ['frontend', 'daemon'] }))
  for (const sub of ['frontend', 'daemon']) {
    fs.mkdirSync(path.join(wt, sub)); fs.mkdirSync(path.join(main, sub))
    if (subDeps !== false) {
      fs.writeFileSync(path.join(wt, sub, 'package.json'), JSON.stringify({ name: sub, dependencies: { vue: '^3.0.0' } }))
      fs.writeFileSync(path.join(main, sub, 'package.json'), JSON.stringify({ name: sub, dependencies: { vue: '^3.0.0' } }))
    }
  }
  fs.writeFileSync(path.join(spec, 'local.yaml'),
    'project:\n  type: nodejs\ncommands:\n  install: "npm --version"\n' +
    'modules:\n' +
    '  frontend: { path: "frontend/", test: "cd frontend && npm test" }\n' +
    '  daemon: { path: "daemon/", test: "cd daemon && npm test" }\n')
  return { d, main, wt, spec }
}

console.log('=== monorepo 子包假 installed（坑 provision-monorepo-subpackage-fake-installed）===\n')

console.log('--- ① 子包有依赖 + install 假成功（trivial 命令）→ failed 点名缺失子包 ---')
{
  const { d, main, wt, spec } = mkMonorepo('fake')
  const r = provisionDeps(wt, main, { specBase: spec })
  assertTrue(r.depsStatus === 'failed', `根空 deps + 子包缺 node_modules → failed（实得 ${r.depsStatus}）`)
  assertTrue((r.depsError || '').includes('frontend') && (r.depsError || '').includes('daemon'),
    `depsError 点名缺失子包（实得 ${(r.depsError || '').slice(0, 90)}）`)
  assertTrue((r.depsError || '').includes('workspace') || (r.depsError || '').includes('install'), '给 workspace install 兜底指引')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ② 子包 node_modules 预建（workspace install 真成功形态）→ installed 放行 ---')
{
  const { d, main, wt, spec } = mkMonorepo('ok')
  fs.mkdirSync(path.join(wt, 'frontend', 'node_modules'))
  fs.mkdirSync(path.join(wt, 'daemon', 'node_modules'))
  const r = provisionDeps(wt, main, { specBase: spec })
  assertTrue(r.depsStatus === 'installed' || r.depsStatus === 'failed' ? r.depsStatus === 'installed' : false,
    `子包 node_modules 齐备 → installed（实得 ${r.depsStatus}，err=${(r.depsError || '').slice(0, 80)}）`)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ③ 空壳 monorepo（根与子包都无依赖声明）→ 不校验零误杀 ---')
{
  const { d, main, wt, spec } = mkMonorepo('shell', { subDeps: false })
  const r = provisionDeps(wt, main, { specBase: spec })
  assertTrue(r.depsStatus === 'installed', `无任何依赖声明 → installed 不校验（实得 ${r.depsStatus}）`)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ④ 根有依赖（单包项目旧场景）+ node_modules 缺 → 仍 failed（旧契约零回归）---')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mono-single-'))
  const main = path.join(d, 'main'); const wt = path.join(d, 'wt'); const spec = path.join(d, 'spec')
  fs.mkdirSync(main); fs.mkdirSync(wt); fs.mkdirSync(spec)
  fs.writeFileSync(path.join(main, 'package-lock.json'), 'l')
  fs.writeFileSync(path.join(wt, 'package-lock.json'), 'l-DIFF')
  fs.writeFileSync(path.join(wt, 'package.json'), JSON.stringify({ name: 'x', dependencies: { a: '1' } }))
  fs.writeFileSync(path.join(spec, 'local.yaml'), 'project:\n  type: nodejs\ncommands:\n  install: "npm --version"\n')
  const r = provisionDeps(wt, main, { specBase: spec })
  assertTrue(r.depsStatus === 'failed' && (r.depsError || '').includes('(根)'), `单包根缺 node_modules → failed 点名根（实得 ${r.depsStatus}）`)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
