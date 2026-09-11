/**
 * run/archive-distill.js（P0-4 安全变体，docs/sillyspec/noai-ir-roadmap.md §3）。
 *
 * archive「decision-distill 决策提炼」步 noAI 化：该步旧 prompt 本身就是「调用 CLI 纯函数
 * distillIntoKnowledge 并转述返回」——全流程最纯的中继步（提炼/幂等/INDEX 路由本体全在
 * src/decision-distill.js），LLM 在此零判断增量，仅 rejected 缺字段时的人工裁决留价值。
 *
 * 动作语义（与旧 prompt 三点分流逐字对齐）：
 *   - written 非空 → 已写盘，逐条打印（旧「常规」分支）；
 *   - needsWait 真 → 该批 rejected 条目未写盘，打印裁决指引：补录 decisions.md 后重跑提炼
 *     （幂等，命令行保留在指引里），或经用户裁决跳过并在「确认归档」--output 注记
 *     （旧 conditionalWait 三段式收敛到确认归档的用户确认点——归档的用户裁决本就归那里）；
 *   - skipped（无 decisions.md / 0 条入选）→ 零输出注记（同 docs-debt 无债零输出原则）；
 *   - 执行异常 → warn 降级跳过不阻断归档（旧步第 4 点 best-effort 语义）。
 *
 * 全路径不抛——本步永远可完成（裁决是确认归档步的输入，不是本步的阻断条件）。
 */
import { join } from 'node:path'
import { gitQuiet } from '../git-helper.js'

export async function executeArchiveDistill({ cwd, specBase, changeName }) {
  const changeDir = join(specBase, 'changes', changeName)
  const knowledgeRoot = join(specBase, 'knowledge')
  let headHash = ''
  try {
    headHash = gitQuiet(cwd, ['rev-parse', '--short', 'HEAD']) || ''
  } catch { /* git 不可用 → 空串（「最近确认」字段留空，不阻断） */ }
  try {
    const { distillIntoKnowledge } = await import('../decision-distill.js')
    const r = distillIntoKnowledge(changeDir, knowledgeRoot, headHash)
    const written = Array.isArray(r && r.written) ? r.written : []
    if (written.length > 0) {
      console.log(`\n📝 决策提炼（CLI 机械执行，幂等）：${written.length} 条已写入决策知识库——`)
      for (const w of written) console.log(`   - ${typeof w === 'string' ? w : JSON.stringify(w)}`)
    } else if (r && r.skipped) {
      console.log(`\nℹ️  决策提炼零输出：${r.skipped}`)
    }
    if (r && r.needsWait) {
      console.warn(`\n⚠️  rejected 决策缺否决理由/复潮条件（needsWait）——这些条目未写盘，其余条目照常提炼。`)
      console.warn(`   裁决指引（确认归档 --confirm 前处理）：`)
      console.warn(`   ① 补录：把缺失字段补进 ${join(changeDir, 'decisions.md')} 后重跑提炼（幂等）——`)
      console.warn(`      node --input-type=module -e "import { distillIntoKnowledge } from '<sillyspec 源码路径>/src/decision-distill.js'; console.log(JSON.stringify(distillIntoKnowledge(${JSON.stringify(changeDir)}, ${JSON.stringify(knowledgeRoot)}, ${JSON.stringify(headHash)}), null, 2))"`)
      console.warn(`   ② 跳过：经用户裁决不入库该条，并在「确认归档」--output 注记跳过原因。`)
    }
  } catch (e) {
    console.warn(`\n⚠️  决策提炼执行异常，降级跳过（best-effort，不阻断归档——同旧步降级语义）: ${e && e.message ? e.message : e}`)
  }
}
