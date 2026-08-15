/**
 * doc-ref-check — 文档行号引用校验（change: 2026-08-14-doc-ref-check；2026-08-15 迁移）
 *
 * 2026-08-15 docs-check-productize task-05：内联实现已抽离到 src/docs-check.js（runDocsCheck），
 * 本测试改为调产品化入口。两层校验全开（keywordAssert 缺省 true，D-007 检测力不降级）：
 *   层1 存在性：文件存在 + 行号边界；层2 关键词断言：反引号代码符号在 [start-2, end+5] 窗口。
 *
 * 用法：node test/doc-ref-check.test.mjs（也被 test/run-tests.mjs 自动收集）
 * 铁律：只读；纯 Node 内置零依赖；CRLF/LF 兼容。
 */
import { runDocsCheck } from '../src/docs-check.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 被校验文档白名单（后续渐进加） */
const DOCS = [
  'docs/sillyspec/platform-interface-map.md',
]

const result = runDocsCheck({ projectRoot: REPO_ROOT, docs: DOCS })

if (!result.ok) {
  console.error(`\n❌ doc-ref-check: ${result.invalid.length}/${result.total} 处引用失效：`)
  for (const inv of result.invalid) {
    console.error(`  ❌ [${inv.doc}:L${inv.docLine}] ${inv.ref} → ${inv.reason}`)
  }
  console.error(`\n修复指引：行号漂移 → 更新文档行号到当前源码；文件删改名 → 更新引用路径；`)
  console.error(`关键词缺失但行号正确 → 确认符号是否改名，改文档 token 或行号。`)
  process.exit(1)
}

console.log(`✅ doc-ref-check: ${DOCS.length} 份文档 ${result.total} 处引用全通过（其中 ${result.kwChecked} 处带关键词断言）`)
