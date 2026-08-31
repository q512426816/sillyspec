/**
 * 归档目标目录名恒等契约回归（2026-08-31 变更名提名断链审计）。
 *
 * 历史 bug 两代（归档移动改名的根因溯源，git --diff-filter=R 实证 3 单）：
 *   ① 无条件拼日期：destDir = `<归档日>-<changeName>`——日期前缀名得双日期目录
 *      （2026-07-09-machine-interface-v1 → 2026-07-09-2026-07-09-machine-interface-v1），
 *      DB 名 / 文档提名 / 磁盘目录三方分叉；
 *   ② 剥前缀重拼：`<归档日>-<去日期名>`——目录不再双日期但日期被重订成归档日
 *      （2026-08-16-state-split-fixes → 2026-08-17-state-split-fixes），活文档提名断链。
 * 5be251c（ql-20260819-013-1b70）改为恒等返回。本测试用直给期望值钉死契约（不经
 * archiveDestDirName 自证——其余 archive 测试用该函数推导期望，同函数自证测不出回归）：
 * 归档只搬目录不改名，date 参数仅为调用方兼容保留。
 */
import { archiveDestDirName } from '../src/stage-contract.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) { console.log(`  ✅ ${msg}`) }
  else { failed++; failures.push(msg); console.error(`  ❌ ${msg}`) }
}

console.log('=== archiveDestDirName 恒等语义（直给期望值，防同函数自证）===')

{
  const got = archiveDestDirName('2026-08-31', '2026-08-16-state-split-fixes')
  assertTrue(got === '2026-08-16-state-split-fixes', `日期前缀名保持原名（实得 ${got}）——钉住「重订日期」bug 不回归`)
}
{
  const got = archiveDestDirName('2026-08-31', 'workflow-spec')
  assertTrue(got === 'workflow-spec', `无日期名保持原名（实得 ${got}）——钉住「无条件拼日期双前缀」bug 不回归`)
}
{
  const got = archiveDestDirName('2099-01-01', '中文变更-带空格')
  assertTrue(got === '中文变更-带空格', `非 ASCII 名透传（实得 ${got}）`)
}
{
  const got = archiveDestDirName('2026-08-31', '')
  assertTrue(got === '', `空名透传不自行造目录名（实得 ${got}）`)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
