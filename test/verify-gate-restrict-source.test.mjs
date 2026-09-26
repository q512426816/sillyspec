/**
 * 收口门命中源回退（2026-09-26-thin-gate-module-source）
 *
 * 背景：thin 协议「先提交再 flow done」使门跑时 HEAD 已含全部改动——runVerifyTestCheck
 * 的 module 命中源（无 worktree meta 时回退 git diff HEAD，仅未提交改动）恒空 → 0 命中
 * 假 skip（2026-09-25-quick-channel-retire 收口实证：72 个门文件在手、test 门 skipped、
 * 诊断打印 diff 0 个文件；匹配器本身无辜）。quick 会话全部提交后同形。
 *
 * 修复语义：命中源为空数组（含他者声明过滤后为空）且调用方传了 restrictFiles（flow 的
 * baseline..HEAD 归属面 / quick 的审计∪声明面——与快照 overlay 同源的会话清单）时，以
 * 清单兜底作命中源；仅兜空不替代非空源；git 不可用（源 null / hitCount=-1）语义不变。
 *
 * 用例：
 *   A 全提交仓 + module 策略 + restrictFiles 含 src 文件 → 命中模块实测子集（修复前 0 命中 skip）
 *   B 同仓不带 restrictFiles → 维持 0 命中 skip + 诊断文案（回归保护）
 *   C 未配置 test_strategy 仓 + restrictFiles 含测试文件 → deps-auto 子集实测（非 skip/非全量）
 *   D 工作树有未提交改动（源非空）→ restrictFiles 不替代 git diff 源（命中仍按 diff 面）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runVerifyTestCheck } from '../src/verify-postcheck.js'

// 嵌套 test-runner 防污染（实测注：内层 node --test 继承 NODE_TEST_CONTEXT 静默不跑）
delete process.env.NODE_TEST_CONTEXT

let total = 0, failed = 0
const assert = (c, m) => { total++; if (c) console.log(`  ✅ PASS: ${m}`); else { failed++; console.log(`  ❌ FAIL: ${m}`) } }
const tmpRoots = []
function git(dir, args) { return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }

/**
 * 造「全部已提交、工作树干净」的仓（thin 收口时点的形态）。
 * @param {string} prefix
 * @param {{strategy?: 'module'|null}} [opts] strategy=null 时不写 test_strategy/modules（deps-auto 缺省收窄仓）
 */
function makeCommittedRepo(prefix, { strategy = 'module' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(repo)
  git(repo, ['init', '-q', '-b', 'main'])
  git(repo, ['config', 'user.email', 't@t.local'])
  git(repo, ['config', 'user.name', 't'])
  git(repo, ['config', 'commit.gpgsign', 'false'])
  mkdirSync(join(repo, 'src'), { recursive: true })
  mkdirSync(join(repo, 'test'), { recursive: true })
  writeFileSync(join(repo, 'src', 'a.js'), 'export const a = 1\n')
  // 刻意不 import src/a.js：保持 deps 附加面为空，断言聚焦 module 命中本身
  writeFileSync(join(repo, 'test', 'a.test.mjs'), 'import assert from "node:assert"; import test from "node:test"; test("a", () => assert.ok(true));\n')
  const specBase = join(repo, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const yml = [`commands:`, `  test: node --test test/`, `  lint: node -e "0"`]
  if (strategy === 'module') {
    yml.push(`test_strategy: module`, `modules:`, `  core: { path: "src/", test: "node -e \\"console.log('CORE-MOD-OK')\\"" }`)
  }
  writeFileSync(join(specBase, 'local.yaml'), yml.join('\n') + '\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])
  return { repo, specBase }
}

console.log('=== 收口门命中源回退（thin 先提交后收口 0 命中假 skip）===\n')

console.log('--- A 全提交仓 + restrictFiles → 命中模块实测子集 ---')
{
  const { repo, specBase } = makeCommittedRepo('vgr-a-')
  const r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'src-fallback-e2e', restrictFiles: ['test/a.test.mjs'] })
  assert(r.status === 'passed', `A 命中动态子集实测 passed（实际 ${r.status}；reason=${r.reason || '无'}）`)
  assert(String(r.command || '').includes('deps(js'), `A command 为动态子集聚合（实际 ${r.command}）`)
}

console.log('\n--- B 同仓不带 restrictFiles → 维持 0 命中 skip（回归保护） ---')
{
  const { repo, specBase } = makeCommittedRepo('vgr-b-')
  const r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'src-fallback-e2e', restrictFiles: null })
  assert(r.status === 'skipped', `B 无清单维持 skip（实际 ${r.status}）`)
  assert(String(r.reason || '').includes('零关系'), `B skip 标因三源零关系（实际 reason 首段：${String(r.reason || '').slice(0, 60)}）`)
}

console.log('\n--- C 未配置策略仓 + restrictFiles 含测试文件 → deps-auto 子集实测 ---')
{
  const { repo, specBase } = makeCommittedRepo('vgr-c-', { strategy: null })
  const r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'src-fallback-e2e', restrictFiles: ['test/a.test.mjs'] })
  assert(r.status === 'passed', `C deps-auto 子集实测 passed（实际 ${r.status}；reason=${r.reason || '无'}）`)
  assert(String(r.command || '').includes('deps('), `C command 含 deps(...)（实际 ${r.command}）`)
}

console.log('\n--- D 工作树有未提交的已跟踪改动（diff 源非空）→ 走既有命中路径，回退不触发 ---')
{
  const { repo, specBase } = makeCommittedRepo('vgr-d-')
  writeFileSync(join(repo, 'test', 'a.test.mjs'), 'import assert from "node:assert"; import test from "node:test"; test("a2", () => assert.ok(true));\n') // 修改已跟踪测试文件未提交：git diff HEAD 非空
  // 捕获 console.log 判「回退」未触发（非空源不被清单替代）
  const origLog = console.log; let logged = ''
  console.log = (...a) => { logged += a.join(' ') + '\n' }
  let r
  try {
    r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'src-fallback-e2e', restrictFiles: ['test/a.test.mjs'] })
  } finally { console.log = origLog }
  assert(r.status === 'passed' && String(r.command || '').includes('deps(js'), `D 非空源正常命中动态子集（实际 ${r.status}/${r.command}）`)
  assert(!logged.includes('回退调用方清单'), 'D diff 源非空时回退不触发（不替代既有路径）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
