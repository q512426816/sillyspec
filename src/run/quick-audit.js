/**
 * run/quick-audit.js（W6 Step2 从 run.js 抽出）。
 *
 * quick 审计结论打印 + quick 多变更关联选择（自洽，不依赖 run.js 闭包）。
 * 安全锚：run.js 始终 barrel，本模块函数 run.js import 回来；无 test 直接 import，无需 re-export。
 *
 * 路径修正（相对 src/run/）：
 *   - resolveQuickLinkedChanges 的 quick-recommend.js 动态 import './quick-recommend.js' → '../quick-recommend.js'
 *   - 脏文件信号改用 safeGit（带 safe.directory，Q3）；不再 import execSync
 *   - parsePorcelainPath 从 ./shared.js 重 import；checkbox 顶部 import
 */
import { checkbox } from '@inquirer/prompts'
import { parsePorcelainPath, safeGit } from './shared.js'

/**
 * 打印 quick 完成审计结论（按 review.status 输出 SAFE/WARNING/BLOCKED）。
 */
export function printQuickAuditReview(review) {
  if (review.status === 'blocked') {
    console.error(`\n🚫 quick 变更边界审计 — BLOCKED：`)
    for (const r of review.reasons) {
      console.error(`   - ${r}`)
    }
    console.error(`\n   quick 已停止：请恢复/拆分这些变更，或重新运行 quick 并显式声明范围。`)
    // 解锁咒语须在 BLOCKED 分支也给出 —— 原只在 confirm/review 分支打印，
    // 普通 --done 走这里只看到「恢复/拆分」反方向指引，正确解法（带 flag 重跑）根本不出现。
    // 但删除是例外：deletedFiles.length>0 是裸判定（auditQuickCompletion 判定行不受任何 flag
    // 门控），--force-baseline / --allow-new 都救不回。此时甩 flag 建议会误导调用者照加后继续
    // 被拦——改提示走完整流程 execute（有意设计：删除是高危操作，须 review 把关）。
    if (review.deletedFiles && review.deletedFiles.length > 0) {
      console.error(`\n   ⛔ 本次含删除文件 ${review.deletedFiles.length} 个：${review.deletedFiles.join(', ')}`)
      console.error(`   quick 不支持删除——--force-baseline / --allow-new 均无法解锁（有意设计，高危操作须走 review 把关）。`)
      console.error(`   请改走完整流程：sillyspec run execute（在 plan 的 task allowed_paths 内删除），或先 git restore 撤回删除后再 --done。`)
    } else {
      console.error(`   如确认接受这些变更，重新运行 --done 时带上对应 flag 即可解锁：`)
      console.error(`     sillyspec run quick --done --force-baseline --allow-new --change <id> --output "..."`)
      console.error(`     （--force-baseline 覆盖受保护/危险文件如 src/run.js；--allow-new 允许新增文件）`)
    }
  } else if (review.status === 'warning') {
    console.warn(`\n⚠️ quick 变更边界审计 — WARNING：`)
    for (const r of review.reasons) {
      console.warn(`   - ${r}`)
    }
  } else {
    // 区分「本轮新增」（changedFiles，已扣前序 baseline）vs「累计暂存」（stagedTotal，全部未提交）。
    // 仅当存在前序 baseline 残留（累计 > 本轮新增）时才追加括注，避免普通场景冗余。
    const stagedTotal = typeof review.stagedTotal === 'number' ? review.stagedTotal : review.changedFiles.length
    if (stagedTotal > review.changedFiles.length) {
      console.log(`\n✅ quick 变更边界审计 — SAFE (本轮新增变更 ${review.changedFiles.length} 个文件；累计暂存 ${stagedTotal} 个，含前序 baseline ${stagedTotal - review.changedFiles.length} 个未计入本轮)`)
    } else {
      console.log(`\n✅ quick 变更边界审计 — SAFE (本轮新增变更 ${review.changedFiles.length} 个文件)`)
    }
  }
}

/**
 * quick 阶段多变更交互式选择关联变更。
 * - 0 活跃变更 → []（仅记 QUICKLOG，不关联）
 * - 1 活跃变更 → 默认关联它（保持现状友好，不弹交互）
 * - ≥2 活跃变更 + 交互 → checkbox 多选（推荐项默认勾，空选 = 不关联）
 * - ≥2 活跃变更 + 非交互 → []（不关联）+ 提示用 --change a,b
 */
export async function resolveQuickLinkedChanges({ pm, cwd, specDir, quickFiles, taskDescription, nonInteractive }) {
  let activeChanges = []
  try {
    activeChanges = pm.listChanges(cwd)
  } catch {
    activeChanges = []
  }
  if (activeChanges.length === 0) return []
  if (activeChanges.length === 1) return [activeChanges[0]]

  if (nonInteractive || !process.stdin.isTTY) {
    console.log('💡 非交互环境，已默认不关联变更；如需关联请用 --change a,b')
    return []
  }

  // 脏文件（推荐信号之一）。safeGit 带 safe.directory，避免 linked worktree/容器/挂载点下裸
  // `git status` 抛错致推荐信号静默丢失（multi-agent-review Q3 同类）。推荐非关键路径，失败回退 []。
  // trim:false：porcelain 首行前导空格是状态码，trim 会削掉致 parsePorcelainPath 丢首字符。
  let baselineFiles = []
  const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false })
  if (!statusResult.error) {
    baselineFiles = (statusResult.value || '').split('\n').filter(Boolean)
      .map(l => parsePorcelainPath(l))
      .filter(Boolean)
      .filter(f => !f.startsWith('.sillyspec/'))
  }

  // 推荐打分（脏文件 + 任务描述双信号）
  let recommendations = []
  try {
    // quick-recommend.js 在 src/，本模块在 src/run/ → 退一层（真环依赖，保留动态 import）
    const { recommendChanges } = await import('../quick-recommend.js')
    recommendations = recommendChanges({ activeChanges, specDir, baselineFiles, quickFiles, taskDescription })
  } catch {
    recommendations = activeChanges.map(name => ({ name, score: 0, reasons: [] }))
  }
  const scoreMap = new Map(recommendations.map(r => [r.name, r.score]))
  const reasonMap = new Map(recommendations.map(r => [r.name, r.reasons]))
  const recommendedSet = new Set(recommendations.filter(r => r.score > 0).map(r => r.name))

  // 按推荐分降序展示
  const ordered = [...activeChanges].sort((a, b) =>
    (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0) || a.localeCompare(b))

  const choices = ordered.map(name => {
    const reasons = reasonMap.get(name) || []
    const isRec = recommendedSet.has(name)
    return {
      name: `${isRec ? '⭐ ' : '   '}${name}`,
      value: name,
      description: reasons.length > 0 ? reasons.join('；') : '无推荐信号',
      checked: isRec,
    }
  })

  console.log('🔗 检测到多个活跃变更，选择本次 quick 关联哪些（可多选；不勾选任何项 = 仅记 QUICKLOG，不关联变更）')
  if (recommendedSet.size > 0) {
    console.log('   ⭐ = 基于脏文件/任务描述推荐，已默认勾选')
  }
  const selected = await checkbox({ message: '关联变更（空格切换，回车确认）', choices })
  return selected
}
