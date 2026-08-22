/**
 * 两坑回归（2026-08-22）：
 *   ① module 匹配对 monorepo 布局失灵（packages/frontend vs modules 配 frontend/）→
 *      段匹配 fallback + 0 命中诊断输出
 *   ② verify 实测与自留 dev server 端口竞争无提示（差点误报 FAIL）→ 端口占用预警 + EADDRINUSE 鉴别
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { pickHitModules } from '../src/verify-postcheck.js'
import { runVerifyTestCheck } from '../src/verify-postcheck.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

console.log('=== ① pickHitModules 段匹配 fallback（坑 module-path-layout-mismatch）===\n')
{
  const modules = {
    frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' },
    daemon: { path: 'daemon/', test: 'cd daemon && npm test' },
  }
  // 严格前缀命中（零回归）
  const strict = pickHitModules(['frontend/src/app.js'], modules)
  assertTrue(strict.length === 1 && strict[0].name === 'frontend' && !strict[0].looseMatch, '严格前缀命中照常（frontend/src → frontend）')
  // monorepo 布局：packages/frontend/... 严格不命中 → 段匹配 fallback
  const cap = []
  const ow = console.warn
  console.warn = (...a) => cap.push(a.join(' '))
  let loose
  try { loose = pickHitModules(['packages/frontend/src/app.js'], modules) }
  finally { console.warn = ow }
  assertTrue(loose.length === 1 && loose[0].name === 'frontend' && loose[0].looseMatch === true,
    `packages/frontend 布局 → 段匹配兜底命中 frontend（实得 ${JSON.stringify(loose.map(h => h.name))}）`)
  assertTrue(cap.some(m => m.includes('宽松段匹配')), '宽松匹配 warn 可见（提示对齐 path 配置）')
  // 段匹配不误蹭前缀相近目录（frontend-guide ≠ frontend）
  const noFalse = pickHitModules(['docs/frontend-guide.md'], modules)
  assertTrue(noFalse.length === 0, 'frontend-guide 不误蹭 frontend 模块（段精确匹配）')
  // 严格命中存在时不用宽松（防多测）
  const mixed = pickHitModules(['daemon/x.js', 'packages/frontend/y.js'], modules)
  assertTrue(mixed.length === 1 && mixed[0].name === 'daemon' && !mixed[0].looseMatch,
    '有严格命中（daemon）时不用宽松兜底（避免多测）')
}

console.log('\n=== ①-b 0 命中诊断输出（黑箱可见化）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zerohit-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'x\n')
  sh('git add -A && git commit -qm base', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'changed\n') // 未提交 diff → 有文件但 0 模块命中
  const specBase = path.join(d, '.sillyspec')
  fs.mkdirSync(specBase, { recursive: true })
  fs.writeFileSync(path.join(specBase, 'local.yaml'),
    'commands:\n  test: node -e "1"\n\ntest_strategy: module\n\nmodules:\n  frontend: { path: "frontend/", test: "cd frontend && npm test" }\n')
  const cap = []
  const ow = console.warn
  console.warn = (...a) => cap.push(a.join(' '))
  let r
  try { r = runVerifyTestCheck({ cwd: d, specBase, changeName: 'zh' }) }
  finally { console.warn = ow }
  assertTrue(r.mode === 'module-zero-hit', `0 命中维持 skip 语义（mode=${r.mode}）`)
  const all = cap.join('\n') + (r.reason || '')
  assertTrue(all.includes('已配置 modules') && all.includes('frontend→frontend/'), '诊断列 modules 配置 path')
  assertTrue(all.includes('本次 diff') && all.includes('base.txt'), '诊断列 diff 文件样例——配置与布局对照一眼可见')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ② dev server 端口竞争预警 + EADDRINUSE 鉴别（坑 verify-devserver-port-race）===\n')
{
  // 2a：起一个真实监听服务占端口，测试命令带 --port → 实测前 warn 资源竞争
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'portrace-'))
  const specBase = path.join(d, '.sillyspec')
  fs.mkdirSync(specBase, { recursive: true })
  const server = createServer()
  await new Promise(res => server.listen(0, '127.0.0.1', res))
  const port = server.address().port
  // 测试命令：探测会占 ~1.5s（端口试连 timeout），为省时直接构造占用命中（node 起服务进程保持监听）
  fs.writeFileSync(path.join(specBase, 'local.yaml'),
    `commands:\n  test: node -e "process.exit(0)"\n\nmodules:\n  web: { path: "web/", test: "node -e \\"const n=require('net');const s=n.createServer();s.listen(${port});setTimeout(()=>{console.error('Error: listen EADDRINUSE :::${port}');process.exit(1)},300)\\"" }\n\ntest_strategy: module\n`)
  fs.mkdirSync(path.join(d, 'web'), { recursive: true })
  fs.writeFileSync(path.join(d, 'web', 'a.txt'), 'x') // 无 git 仓 → diff 不可用？需要 git
  sh('git init -q -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'x\n')
  sh('git add -A && git commit -qm base', d)
  fs.writeFileSync(path.join(d, 'web', 'a.txt'), 'changed\n') // 未提交 → 命中 web 模块

  const cap = []
  const ow = console.warn, ol = console.log
  console.warn = (...a) => cap.push(a.join(' '))
  console.log = () => {}
  let r
  try {
    r = runVerifyTestCheck({ cwd: d, specBase, changeName: 'pr' })
  } finally { console.warn = ow; console.log = ol }
  server.close()
  assertTrue(r.status === 'failed', `端口被占 → 模块测试 failed（实得 ${r.status}）`)
  assertTrue((r.reason || '') + cap.join(' ').includes('EADDRINUSE'), '失败 reason 含 EADDRINUSE 信号')
  assertTrue(((r.reason || '') + cap.join(' ')).includes('资源竞争') || ((r.reason || '') + cap.join(' ')).includes('dev server'),
    '输出明示「资源竞争/dev server」鉴别——勿误报代码 FAIL')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
