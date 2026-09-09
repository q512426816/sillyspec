// 并发 --done 防护（docs/sillyspec/execute-concurrent-done-skips-next-wave，2026-09-08 实证）
//
// 会话 B 先 --done 推进 Wave N 后，会话 A 的 --done 落到新当前步 Wave N+1，用旧摘要静默
// 完成未实现的 Wave。修复两层（src/run/complete.js 完成标记前）：
// ① execute 邻步 60s 内刚被完成 → 醒目警示横幅（advisory，操作者可立即 --reopen）；
// ② 写前重读校验：本命令要完成的步骤在 DB 已被并行进程标 completed/skipped → 拒绝推进
//    （防双写交错；CLI 短进程读库→落盘窗口内的真实竞态）。
//
// 进程内 characterization（runCapturing 桩 process.exit），不碰真实 .sillyspec。
import { ProgressManager } from '../src/progress.js'
import { completeStep } from '../src/run/complete.js'
import { makeRepo, runCapturing, seedStage } from './_complete-step-harness.mjs'

const passed = [], failed = []
const assert = (cond, msg) => {
  cond ? (passed.push(msg), console.log(`  ✅ ${msg}`))
    : (failed.push(msg), console.log(`  ❌ ${msg}`))
}

const CN = '2026-09-08-demo-change'
// 全 8 步 brainstorm 定义（少种会触发 def↔DB 漂移守卫中止，到不了被测点）
const STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
function seedAll(cwd, specBase, pm, currentIdx) {
  return seedStage(pm, cwd, CN, 'brainstorm',
    STEPS.map((name, i) => i < currentIdx
      ? { name, status: 'completed', completedAt: '2026/09/08 10:00:00' }
      : { name, status: 'pending' }))
}

console.log('--- 1. 双写竞态：本命令读库后步骤被并行进程标完成 → 拒绝推进 ---')
{
  const { cwd, specBase } = makeRepo('ecd-race-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, CN)
  await seedAll(cwd, specBase, pm, 1)

  // 会话 A 读取进度（此时步骤 2 pending）——A 的旧快照
  const staleProgress = await pm.read(cwd, CN)
  // 会话 B 在 A 处理期间完成步骤 2（写 DB）
  const bProgress = await pm.read(cwd, CN)
  bProgress.stages.brainstorm.steps[1].status = 'completed'
  bProgress.stages.brainstorm.steps[1].completedAt = '2026/09/08 10:05:00'
  await pm._write(cwd, bProgress, CN)

  // A 用旧快照 --done → 守卫重读 DB 发现已完成 → exit(1) 拒绝
  const r = await runCapturing(() =>
    completeStep(pm, staleProgress, 'brainstorm', cwd, 'A 的旧摘要', null, { changeName: CN }))
  assert(r.exitCode === 1, `拒绝推进 exit 1（实际 ${r.exitCode}）`)
  assert(r.stdout.includes('拒绝重复推进'), `报错含拒绝语义（实际含：${(r.stdout.match(/❌[^\n]*/) || ['(无)'])[0]}）`)
  const after = await pm.read(cwd, CN)
  assert(after.stages.brainstorm.steps[1].output !== 'A 的旧摘要',
    'A 的旧摘要未落盘（步骤 output 未被写）')
}

console.log('\n--- 2. 正常路径：无并发推进 → 守卫放行完成 ---')
{
  const { cwd, specBase } = makeRepo('ecd-normal-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, CN)
  await seedAll(cwd, specBase, pm, 1)
  const progress = await pm.read(cwd, CN)
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '探索完成', null, { changeName: CN }))
  assert(r.exitCode === null, `正常完成不 exit（实际 ${r.exitCode}）`)
  const after = await pm.read(cwd, CN)
  assert(after.stages.brainstorm.steps[1].status === 'completed', '步骤 2 正常标完成')
}

console.log(`\n${failed.length === 0 ? '✅' : '❌'} execute-concurrent-done-guard：通过 ${passed.length} / 失败 ${failed.length}`)
if (failed.length > 0) process.exitCode = 1
