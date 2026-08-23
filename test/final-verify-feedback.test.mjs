/**
 * 三坑回归（2026-08-22 execute/verify 阶段反馈）：
 *   ① 探针5 endpoints 基线失配 → 现算端点并入比对集（存量基线只补充不主导）
 *   ② execute 派发提示要求子代理 commit（纯新增文件不 commit → apply --3way 炸）
 *   ③ pull 部署噪声冲突自愈（内容一致仅 ts 扰动 → base_ts 推进，不落冲突文件）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'node:url'
import { verifyApiParity } from '../src/contract-matrix.js'
import { definition as executeDef } from '../src/stages/execute.js'
import { buildWavePrompt } from '../src/stages/execute.js'
import { SyncManager } from '../src/sync.js'

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

console.log('=== ① 探针5 现算端点并入（坑 probe5-endpoint-baseline-stale）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p5-'))
  // 当前代码：后端有 /api/new 端点 + 前端调用它；存量 artifact 基线只有旧端点 /old/x
  fs.mkdirSync(path.join(d, 'backend'), { recursive: true })
  fs.writeFileSync(path.join(d, 'backend', 'r.py'), '@router.get("/api/new")\ndef f(): pass\n')
  fs.writeFileSync(path.join(d, 'fe.tsx'), 'fetch("/api/new")\n')
  const rt = path.join(d, '.rt')
  fs.mkdirSync(path.join(rt, 'contract-artifacts', 'cn', 't1'), { recursive: true })
  fs.writeFileSync(path.join(rt, 'contract-artifacts', 'cn', 't1', 'endpoints.json'),
    JSON.stringify({ endpoints: [{ method: 'GET', path: '/old/x', source: 'r.py' }] }))
  const r = verifyApiParity(d, d, rt, 'cn')
  assertTrue(r.ok === true && r.missingBackend.length === 0, `存量基线失配不再误报 missingBackend（现算覆盖 /api/new；ok=${r.ok}）`)
  assertTrue(r.unusedBackend.length === 0, `存量过期端点（/old/x）不再误报 unusedBackend（实得 ${JSON.stringify(r.unusedBackend)}）`)
  assertTrue(r.summary.includes('live'), `summary 标注现算来源（${r.summary.slice(0, 60)}）`)
  fs.rmSync(d, { recursive: true, force: true })
}
{
  // 真缺失仍报（前端调用了后端确实没有的端点——底线不松）
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p5b-'))
  fs.writeFileSync(path.join(d, 'fe.tsx'), 'fetch("/api/nonexistent")\n')
  const r = verifyApiParity(d, d, d, 'cn2')
  assertTrue(r.ok === false && r.missingBackend.length === 1, `前端调用无后端实现仍报 missingBackend（实得 ${r.missingBackend.length}）`)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ② execute 派发提示子代理 commit（坑 subagent-uncommitted-newfile-apply3way）===\n')
{
  // buildWavePrompt 的调度要求里含 commit 指令
  const wave = { index: 1, tasks: [{ name: 't', id: 'task-01', index: 1, dependsOn: [], file: '' }] }
  const prompt = buildWavePrompt(wave, 1, '/tmp/x', '/tmp/wt', {})
  assertTrue(prompt.includes('git add -A && git commit'), 'Wave prompt 调度要求含「git add -A && git commit」')
  assertTrue(prompt.includes('does not exist in index'), '点明不 commit 的后果（apply --3way 炸）')
  assertTrue(prompt.includes('真实锚点'), '点明 commit 的附带收益（review head 锚点）')
}

console.log('\n=== ③ pull 部署噪声自愈（坑 pull-deploy-noise-conflict）===\n')
{
  const sm = new SyncManager(process.cwd())
  const base = {
    project: { name: 'p', schema_version: 5 },
    changes: [{ name: 'c', current_stage: 'execute', status: 'active' }],
    stages: [{ stage: 'execute', status: 'in-progress' }],
    steps: [{ stage: 'execute', step: 3, name: 'Wave 1', status: 'completed' }],
    batch_progress: [], approvals: [],
  }
  // 内容一致（仅时间戳列不同）→ true
  const platform = JSON.parse(JSON.stringify(base))
  platform.changes[0].last_active = '2026-08-23T10:00:00Z'
  platform.stages[0].started_at = '2026-08-23T09:00:00Z'
  assertTrue(sm._progressContentEquals(base, platform) === true, '仅时间戳列不同 → 内容一致（自愈路径）')
  // 实质差异（step 状态不同）→ false
  const diverged = JSON.parse(JSON.stringify(base))
  diverged.steps[0].status = 'pending'
  assertTrue(sm._progressContentEquals(base, diverged) === false, 'step 状态实质差异 → 不一致（真冲突路径）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
