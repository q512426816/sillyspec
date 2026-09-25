/**
 * stage.wall 阶段墙档位测试（R16 减负批次 A 相位，2026-09-24）
 *
 * 验证：readStageWall 读 local.yaml stage.wall 段（hard/advisory），env SILLYSPEC_STAGE_WALL
 * 强制优先，文件缺/段缺/坏 YAML → 缺省 advisory（fail-open——hard 门只拦「确证同会话硬续」）。
 * runStage 入口 hard 门的集成行为（拒启动/--same-session 逃生/reopen 重入放行）由 R16 实验
 * 环境冒烟覆盖（docs/analysis/R8-R15-改进落地方案-2026-09-24.md §三）。
 *
 * 设计依据：src/run/shared.js readStageWall / STAGE_WALL_STAGES / STAGE_WALL_PREDECESSOR。
 */
import { readStageWall, STAGE_WALL_STAGES, STAGE_WALL_PREDECESSOR, isStageWallBlocked } from '../src/run/shared.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let failures = 0
const tmpRoots = []
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const newDir = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
const writeYaml = (root, text) => {
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'local.yaml'), text, 'utf8')
}
const withEnv = async (val, fn) => {
  const prev = process.env.SILLYSPEC_STAGE_WALL
  if (val === undefined) delete process.env.SILLYSPEC_STAGE_WALL
  else process.env.SILLYSPEC_STAGE_WALL = val
  try { return await fn() } finally {
    if (prev === undefined) delete process.env.SILLYSPEC_STAGE_WALL
    else process.env.SILLYSPEC_STAGE_WALL = prev
  }
}

console.log('\n[stage-wall] 档位读取：env 强制 > yaml > 缺省 advisory')

// Case 1: 无 local.yaml → advisory
{
  const root = newDir('sw-none-')
  const mode = await withEnv(undefined, () => readStageWall(root))
  assert(mode === 'advisory', '无 local.yaml → advisory')
}

// Case 2: stage.wall: hard → hard
{
  const root = newDir('sw-hard-')
  writeYaml(root, 'stage:\n  wall: hard\n')
  const mode = await withEnv(undefined, () => readStageWall(root))
  assert(mode === 'hard', 'stage.wall: hard → hard')
}

// Case 3: 段缺/值非法 → advisory
{
  const root = newDir('sw-soft-')
  writeYaml(root, 'stage:\n  burst: true\n')
  const mode = await withEnv(undefined, () => readStageWall(root))
  assert(mode === 'advisory', 'wall 键缺 → advisory（burst 不误伤）')
}

// Case 4: env 强制优先（yaml hard 被 env advisory 压制；yaml 缺被 env hard 提升）
{
  const hardRoot = newDir('sw-env1-')
  writeYaml(hardRoot, 'stage:\n  wall: hard\n')
  assert(await withEnv('advisory', () => readStageWall(hardRoot)) === 'advisory', 'env=advisory 压制 yaml hard')
  const noneRoot = newDir('sw-env2-')
  assert(await withEnv('hard', () => readStageWall(noneRoot)) === 'hard', 'env=hard 提升（无 yaml）')
}

// Case 5: 坏 YAML → advisory 不抛
{
  const root = newDir('sw-broken-')
  writeYaml(root, 'stage: [unclosed\n')
  let mode = null
  let threw = false
  try { mode = await withEnv(undefined, () => readStageWall(root)) } catch { threw = true }
  assert(!threw && mode === 'advisory', '坏 YAML → advisory 不抛')
}

// Case 6: 常量形态（墙后阶段与前驱映射——runStage 入口门与 handoff 提示共用的单一事实源）
{
  assert(JSON.stringify(STAGE_WALL_STAGES) === JSON.stringify(['execute', 'verify']), 'STAGE_WALL_STAGES = execute/verify')
  assert(STAGE_WALL_PREDECESSOR.execute === 'plan' && STAGE_WALL_PREDECESSOR.verify === 'execute', '前驱映射：execute←plan / verify←execute')
}

// Case 7: isStageWallBlocked 拦截判定（R16-b 实证修正 2026-09-25：SESSION_ID 是变更所有权
// 标识，handoff 协议要求新会话保持不变——切割凭证=前驱收口后执行过 sillyspec handoff）
{
  const base = { sessionId: 'S1', lastStage: 'plan', at: '2026-09-25T17:04:07.000Z', stages: ['brainstorm', 'plan'], stageCount: 2 }
  const p = (ledger, over = {}) => isStageWallBlocked({ ledger, curSession: 'S1', stageName: 'execute', stageHasData: false, ...over })

  assert(p(base) === true, '前驱刚收口且无 handoff → 拦截（真硬续形态）')
  assert(p({ ...base, handoffAt: '2026-09-25T17:04:35.000Z' }) === false, 'handoffAt 晚于收口 → 放行（新会话粘贴交接块，SESSION_ID 相同——handoff 即切割凭证）')
  assert(p({ ...base, handoffAt: '2026-09-25T17:00:00.000Z' }) === true, 'handoffAt 早于收口（收口前旧章）→ 仍拦截')
  assert(p(base, { curSession: 'S2' }) === false, '不同 SESSION_ID（他机/他会话接管）→ 放行')
  assert(p(base, { stageHasData: true }) === false, '目标阶段已有进度（--reopen 重入）→ 放行')
  assert(p(base, { stageName: 'verify' }) === false, 'lastStage=plan 不匹配 verify 前驱 → 放行')
  assert(p(null) === false, '无 ledger → 放行（fail-open）')
  assert(p(base, { curSession: '' }) === false, '会话标识缺省 → 放行（fail-open）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${7 - failures}  ❌ 失败: ${failures}`)
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failures > 0) throw new Error(`${failures} test(s) failed`)
