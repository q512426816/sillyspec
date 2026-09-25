/**
 * 坑 register-stage-review-cwd-pollution-no-hint 回归：specBase 回退向上找根
 *
 * 背景（2026-09-25 实证）：bash 工作目录持久化停在 .sillyspec/changes/<变更>/tasks/
 * 时跑 register-stage-review --stage plan，join(cwd,'.sillyspec') 拼出 cwd 相对的
 * 事务性错误路径 → 「主审查文档不存在 …\tasks\.sillyspec\changes\<变更>\plan.md」，
 * plan.md 实际存在于仓库根。
 *
 * 锁定语义：
 *   1. 深 cwd（变更目录子树内）→ resolveSpecDir 向上找根，注册成功且产物落在
 *      仓库根 .sillyspec/.runtime/stage-reviews/（与仓库根执行同结果）
 *   2. cwd 祖先链确无 .sillyspec（tmpdir 夹具裸目录）→ 仍报主审查文档缺失
 *      （fail-fast 保留，不静默猜根）
 */
import { join } from 'node:path'
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { registerStageReview } from '../src/stage-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpDirs = []
const cleanup = () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== register-stage-review 深 cwd 回根（坑 register-stage-review-cwd-pollution-no-hint）===\n')

console.log('--- ① 深 cwd（changes/<变更>/tasks/）向上找根，注册成功 ---')
{
  const d = mkdtempSync(join(tmpdir(), 'rsr-cwd-'))
  tmpDirs.push(d)
  const cn = '2026-09-25-cwd-deep'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  // 坑现场形态：bash cd 持久化停在 tasks/ 子目录
  const deepCwd = join(changeDir, 'tasks')
  mkdirSync(deepCwd, { recursive: true })

  let result = null, err = null
  try { result = registerStageReview({ changeName: cn, stage: 'plan', cwd: deepCwd }) } catch (e) { err = e }
  assert(err === null, `深 cwd 注册不报错（旧代码报「主审查文档不存在 …tasks\\.sillyspec\\…」）：${err ? err.message : 'ok'}`)
  assert(!!result && !!result.reviewRunId, `注册返回 reviewRunId：${result ? result.reviewRunId : 'null'}`)
  assert(!!result && result.reviewPath.startsWith(join(d, '.sillyspec', '.runtime', 'stage-reviews')),
    `产物落在仓库根 stage-reviews（非 cwd 相对路径）：${result ? result.reviewPath : 'null'}`)
}

console.log('--- ② 祖先链无 .sillyspec → fail-fast 保留（不静默猜根）---')
{
  const d = mkdtempSync(join(tmpdir(), 'rsr-bare-'))
  tmpDirs.push(d)
  let err = null
  try { registerStageReview({ changeName: 'whatever', stage: 'plan', cwd: d }) } catch (e) { err = e }
  assert(!!err && /主审查文档不存在/.test(err.message), `裸目录仍报主审查文档缺失：${err ? err.message.slice(0, 60) : 'no error'}`)
}

cleanup()
console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) { console.error(failures.map((f) => `  - ${f}`).join('\n')); process.exit(1) }
