/**
 * HUB-10 / HUB-12c / HUB-12d 源文本契约（与 git-helper-injection 反向断言同范式）：
 *   HUB-10：sync.js 内嵌 syncModule() CLI 分发已删除（死代码且命令面与 index.js 分叉，
 *           误导维护者改错地方）；
 *   HUB-12c：run/command.js 的 cwd 纠正守卫须同时检查平台接管声明——指针被 cleanup、
 *           声明还在、祖先有别的 .sillyspec 时，cwd 被上移后 checkPlatformManaged 在新
 *           cwd 扑空 → 静默落本地库（双入口 fail-closed 被绕过）；
 *   HUB-12d：sync.js 冲突横幅不再硬编码 .sillyspec/.runtime/sync-conflict-*（平台模式
 *           specRoot 在别处，用户按提示找不到文件）。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

{
  const syncSrc = readFileSync(join(root, 'src', 'sync.js'), 'utf8')
  assert(!syncSrc.includes('export async function syncModule'), 'HUB-10：sync.js 不再有 syncModule 死代码')
}

{
  const cmdSrc = readFileSync(join(root, 'src', 'run', 'command.js'), 'utf8')
  const guardMatch = cmdSrc.match(/if \(!specDir && !existsSync\(join\(cwd, '\.sillyspec-platform\.json'\)\)[^)]*\)/)
  assert(guardMatch !== null, 'HUB-12c：cwd 纠正守卫存在')
  // 守卫之后 6 行内必须出现 checkPlatformManaged（防指针被 cleanup 后声明仍在时被上移）
  const after = cmdSrc.slice(guardMatch.index, guardMatch.index + 400)
  assert(after.includes('checkPlatformManaged'), 'HUB-12c：守卫含平台接管声明检查（checkPlatformManaged）')
}

{
  const syncSrc = readFileSync(join(root, 'src', 'sync.js'), 'utf8')
  assert(!syncSrc.includes("⚠️ 冲突详情已落盘: .sillyspec/.runtime/sync-conflict-"), 'HUB-12d：无硬编码 .sillyspec/.runtime 冲突横幅')
}

console.log(`\n${failures === 0 ? '✅ hub10-12-platform-misc 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exit(failures === 0 ? 0 : 1)
