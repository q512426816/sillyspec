/**
 * stages 循环引用根修回归测试 — 2026-10-28-stages-cycle-root-fix
 *
 * 背景：run/shared.js → stages/index.js 静态回边 + execute.js 子树
 * （knowledge-hits → agent-session-log → run/shared）构成 ESM 环——测试直 import
 * run/complete.js 形态入口触发 stages/index.js 顶层 stageRegistry 对 execute 绑定 TDZ
 * （Cannot access 'execute' before initialization，r5-wiring-three 基线即挂）。
 * 根修：run/shared 唯一使用点 getStageSteps 点用动态 import 断环。
 *
 * 覆盖矩阵：
 *   TDZ 入口形态    子进程完整复现原崩溃入口（先 run/complete.js 后 stages/index.js）
 *   import 面       run/shared 无 stages/index.js 静态 import（防回边复潮）+ 动态点用存在
 *   豁免面          入库 known-failures.yaml 不得夹带 r5-wiring 机器豁免（分层纪律）
 *   消费面          getStageSteps 注册表回退档 / quick scan 三步表 / 未知档 null 零回归
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { getStageSteps } from '../src/run/shared.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── TDZ 入口形态：子进程复现原崩溃入口（先经 execute 子树，后进注册表）──
{
  const entry = `
    await import(${JSON.stringify('file://' + join(repoRoot, 'src', 'run', 'complete.js').split('\\').join('/'))});
    const m = await import(${JSON.stringify('file://' + join(repoRoot, 'src', 'stages', 'index.js').split('\\').join('/'))});
    if (!m.stageRegistry || !m.stageRegistry.execute || !Array.isArray(m.stageRegistry.execute.steps)) {
      console.error('registry incomplete'); process.exit(3);
    }
    console.log('ENTRY-OK');
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', entry], { encoding: 'utf8', timeout: 60000 })
  assert(r.status === 0 && (r.stdout || '').includes('ENTRY-OK'),
    `TDZ 入口形态完整进程直跑绿（status=${r.status}，err尾：${(r.stderr || '').slice(-120).replace(/\n/g, ' ')}）`)
}

// ── import 面：静态回边锁死 + 动态点用存在 ──
{
  const src = readFileSync(join(repoRoot, 'src', 'run', 'shared.js'), 'utf8')
  const staticImportRe = /^import\s[^;\n]*from\s+'[^']*stages\/index\.js'/m
  assert(!staticImportRe.test(src), 'run/shared.js 无 stages/index.js 静态 import（回边锁死）')
  assert(src.includes("await import('../stages/index.js')"), '点用动态 import 在场（getStageSteps 断环点）')
}

// ── 豁免面：入库 known-failures 不得夹带 r5-wiring（机器特有类留 local.yaml，分层纪律）──
{
  let yaml = ''
  try { yaml = readFileSync(join(repoRoot, '.sillyspec', 'known-failures.yaml'), 'utf8') } catch { /* 无文件=空面 */ }
  assert(!yaml.includes('r5-wiring'), '入库 known-failures.yaml 不含 r5-wiring 豁免（机器类不入库）')
}

// ── 消费面：getStageSteps 注册表回退 / quick 三步表 / 未知档 ──
{
  const stepsVerify = await getStageSteps('verify', repoRoot)
  assert(Array.isArray(stepsVerify) && stepsVerify.length > 0, `注册表回退档（verify）返回步骤表（${stepsVerify ? stepsVerify.length : 'null'} 步）`)
  const stepsQuick = await getStageSteps('scan', repoRoot, { stages: { scan: { scanProfile: { mode: 'quick' } } } })
  assert(Array.isArray(stepsQuick) && stepsQuick.length === 3, `quick scan 三步表（实际 ${stepsQuick ? stepsQuick.length : 'null'} 步）`)
  const stepsUnknown = await getStageSteps('no-such-stage', repoRoot)
  assert(stepsUnknown === null || stepsUnknown === undefined, '未知档返回空（动态 import 路径零回归）')
}

console.log(`\n==================================================`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
if (count.failures.length) { console.log(`失败项: ${count.failures.join('；')}`); process.exitCode = 1 }
