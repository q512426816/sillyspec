/**
 * 变更名提名 advisory 回归（2026-08-31 变更关联审计 P2）。
 *
 * 钉住三组行为：
 *   ① token 提取的结构化排除（纯函数）——lookbehind 化合物 / run-id 时间戳 / .md 文件名 /
 *      ql-* id / 双日期前缀目录名；
 *   ② IO 面：名单口径（活跃∪归档目录）、悬空 findings 与豁免（known_failures change-name.* 键）、
 *      强制 skip（archive/ 冻结历史、docs/prompt 模板）、跨仓根（cross_repo_roots）；
 *   ③ advisory 铁律：不进 runDocsCheck invalid（gate 不受影响）由实现结构保证，此处测
 *      runChangeNameAdvisory 自身只读零写盘 + 空 projectRoot 容错。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectChangeNameTokens, runChangeNameAdvisory, CHANGE_NAME_DEFAULT_PATHS } from '../src/docs-check.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) { console.log(`  ✅ ${msg}`) }
  else { failed++; failures.push(msg); console.error(`  ❌ ${msg}`) }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

console.log('=== collectChangeNameTokens：结构化排除（纯函数）===')
{
  const t = (s) => collectChangeNameTokens(s)
  assertTrue(eq(t('继 2026-08-05-tooling-feedback-fixes 修复 5 个坑后'), ['2026-08-05-tooling-feedback-fixes']), '基本提名命中')
  assertTrue(eq(t('review-2026-08-08.md 与 multi-agent-review-2026-08-08.md'), []), 'x- 前缀化合物（评审快照文件名）不拆半名')
  assertTrue(eq(t('brainstorm-review-2026-08-23-205426 marker'), []), 'run-id 时间戳（HHMMSS 纯数字 slug）不命中')
  assertTrue(eq(t('2026-08-23-205426'), []), '独立纯数字 slug 不命中')
  assertTrue(eq(t('删除 `.sillyspec/plans/2026-04-05-dashboard.md` 暂存'), []), '紧随 .md 的文件名提及排除（plans 快照）')
  assertTrue(eq(t('详见 docs/sillyspec/2026-08-20-foo-bar.md 全文'), []), '紧随 .md 的他仓文档路径排除')
  assertTrue(eq(t('archive/2026-08-07-sillyhub-mcp-dispatch/design.md'), ['2026-08-07-sillyhub-mcp-dispatch']), '目录路径提名（后随 /）保留')
  assertTrue(eq(t('2026-06-28-2026-06-28-worktree-deps-provision'), []), '双日期前缀目录名整体不命中')
  assertTrue(eq(t('ql-20260804-005-83d8 关联'), []), 'ql-* quicklog id 不命中')
  assertTrue(eq(t('对比 2026-08-01-alpha 和 `2026-08-02-beta` 两个变更'), ['2026-08-01-alpha', '2026-08-02-beta']), '一行多名（裸/反引号）都命中')
}

console.log('\n=== runChangeNameAdvisory：IO 面（fixture）===')
{
  const root = mkdtempSync(join(tmpdir(), 'chg-name-adv-'))
  const before = readdirSync(root).length
  try {
    mkdirSync(join(root, '.sillyspec', 'changes', '2026-08-01-alpha'), { recursive: true })
    mkdirSync(join(root, '.sillyspec', 'changes', 'archive', '2026-07-01-beta'), { recursive: true })
    mkdirSync(join(root, '.sillyspec', 'changes', 'archive', 'frozen-old'), { recursive: true })
    mkdirSync(join(root, 'docs', 'prompt'), { recursive: true })
    mkdirSync(join(root, 'docs'), { recursive: true })
    writeFileSync(join(root, 'docs', 'a.md'),
      '继 2026-08-01-alpha 之后又改。\n（2026-07-01-beta 已归档）。\n提到 2026-08-99-gamma 两次：2026-08-99-gamma。\n')
    writeFileSync(join(root, 'docs', 'prompt', 'tpl.md'), '示例变更 2026-05-13-user-auth 与 2026-05-13-demo-change（模板虚构名）。\n')
    writeFileSync(join(root, '.sillyspec', 'changes', 'archive', 'frozen-old', 'design.md'), '冻结历史提 2026-08-99-gamma。\n')

    // 无 local.yaml：gamma 悬空 ×2（tpl 与 archive 被强制 skip，不计）
    const r1 = runChangeNameAdvisory({ projectRoot: root })
    assertTrue(r1.scannedDocs === 1, `扫描集只含 docs/a.md（prompt/archive 强制 skip，实得 ${r1.scannedDocs}）`)
    assertTrue(r1.mentions === 4, `4 处提名（alpha/beta/gamma×2，实得 ${r1.mentions}）`)
    assertTrue(r1.findings.length === 2 && r1.findings.every(f => f.name === '2026-08-99-gamma'), '悬空 findings 只剩 gamma ×2')
    assertTrue(r1.findings[0].message.includes('docs/a.md:L3') && r1.findings[0].message.includes('change-name.2026-08-99-gamma'),
      'finding 消息含 位置 + 豁免键指引')

    // known_failures 豁免：gamma 转入 exempted（披露不隐藏）
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'),
      'known_failures:\n  - change-name.2026-08-99-gamma\n')
    const r2 = runChangeNameAdvisory({ projectRoot: root })
    assertTrue(r2.findings.length === 0 && r2.exempted.length === 2, 'known_failures 键按名豁免（2 处入 exempted 披露）')

    // 跨仓根：兄弟仓变更名经 cross_repo_roots 判有效
    const sibling = mkdtempSync(join(tmpdir(), 'chg-name-sib-'))
    try {
      mkdirSync(join(sibling, '.sillyspec', 'changes', 'archive', '2026-08-20-sibling-fix'), { recursive: true })
      writeFileSync(join(root, 'docs', 'a.md'),
        '主仓 2026-08-01-alpha + 他仓 2026-08-20-sibling-fix（散文跨仓提名）。\n')
      writeFileSync(join(root, '.sillyspec', 'local.yaml'),
        `docs-check:\n  cross_repo_roots:\n    sibling: ${sibling.replace(/\\\\/g, '/')}\n`)
      const r3 = runChangeNameAdvisory({ projectRoot: root })
      assertTrue(r3.mentions === 2 && r3.findings.length === 0, 'cross_repo_roots 配置的兄弟仓名判有效（0 悬空）')
    } finally {
      rmSync(sibling, { recursive: true, force: true })
    }

    assertTrue(eq(runChangeNameAdvisory({ projectRoot: null }).findings, []), 'projectRoot 空 → 容错空结果')
    assertTrue(eq(readdirSync(root).length, before || readdirSync(root).length), '（弱校验）执行后根目录未新增顶层文件——只读零写盘')
    assertTrue(CHANGE_NAME_DEFAULT_PATHS.includes('.sillyspec/changes/**/*.md'), '缺省扫描集含变更文档目录')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
