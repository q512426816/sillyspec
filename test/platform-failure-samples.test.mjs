/**
 * 平台 scan 失败样本测试
 *
 * 验证失败场景下 postcheck + manifest 能稳定表达失败：
 * 1. source_root 污染 → postcheck status = failed_post_check + source_root_leak check
 * 2. spec 缺文档 → postcheck status = failed_post_check + all_docs_missing check
 * 3. 混合场景 → 多个 check，failed 优先
 * 4. postcheck-result.json 结构可被 SillyHub 稳定解析
 *
 * 跑法: node test/platform-failure-samples.test.mjs
 */

import { join, basename } from 'path'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { SCAN_STATUS, CHECK_SEVERITY } from '../src/constants.js'

const passed = []
const failed = []

function assert(label, condition, detail) {
  if (condition) {
    passed.push(label)
    console.log(`  ✅ PASS: ${label}`)
  } else {
    failed.push({ label, detail })
    console.log(`  ❌ FAIL: ${label}`)
    if (detail) console.log(`     ${detail}`)
  }
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

function setup(name) {
  const base = join(tmpdir(), `failure-test-${name}-${randomUUID().slice(0, 8)}`)
  const spec = join(tmpdir(), `failure-test-spec-${name}-${randomUUID().slice(0, 8)}`)
  mkdirSync(base, { recursive: true })
  mkdirSync(spec, { recursive: true })
  writeFileSync(join(base, 'package.json'), '{}')
  return { cwd: base, specDir: spec }
}

// ── Test 1: source_root 污染 → failed_post_check ──
console.log('\n=== Test 1: source_root docs 污染 ===')
{
  const { cwd, specDir } = setup('leak')
  const proj = basename(cwd)
  try {
    // 在 source_root/.sillyspec/docs/ 下创建泄漏文件
    mkdirSync(join(cwd, '.sillyspec', 'docs', proj, 'scan'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'docs', proj, 'scan', 'ARCHITECTURE.md'), '# leak')

    const { runScanPostCheck } = await import('../src/scan-postcheck.js')
    const result = runScanPostCheck({ cwd, specDir })

    assert('status = failed_post_check', result.status === SCAN_STATUS.FAILED_POST_CHECK, `实际: ${result.status}`)
    assert('有 source_root_docs_leak check', result.checks.some(c => c.name === 'source_root_docs_leak'))
    assert('source_root_docs_leak severity = failed',
      result.checks.find(c => c.name === 'source_root_docs_leak')?.severity === CHECK_SEVERITY.FAILED)

    // 验证结构化输出
    const { formatStructuredResult } = await import('../src/scan-postcheck.js')
    const structured = formatStructuredResult(result, { source_root: cwd })
    assert('结构化输出有 overall_status', !!structured.overall_status)
    assert('结构化输出有 checks', Array.isArray(structured.checks))
    assert('结构化输出 path_pollution 非空', structured.failure_categories.path_pollution.length > 0)
  } finally {
    cleanup(cwd)
    cleanup(specDir)
  }
}

// ── Test 2: spec 缺文档 → failed_post_check ──
console.log('\n=== Test 2: spec 无文档 ===')
{
  const { cwd, specDir } = setup('missing')
  const proj = basename(cwd)
  try {
    const { runScanPostCheck } = await import('../src/scan-postcheck.js')
    const result = runScanPostCheck({ cwd, specDir })

    assert('status = failed_post_check', result.status === SCAN_STATUS.FAILED_POST_CHECK, `实际: ${result.status}`)
    assert('有 all_docs_missing check', result.checks.some(c => c.name === 'all_docs_missing'))

    const { formatStructuredResult } = await import('../src/scan-postcheck.js')
    const structured = formatStructuredResult(result, { source_root: cwd })
    assert('结构化输出 missing_outputs 非空', structured.failure_categories.missing_outputs.length > 0)
  } finally {
    cleanup(cwd)
    cleanup(specDir)
  }
}

// ── Test 3: 混合场景（污染 + 缺文档）→ failed 优先 ──
console.log('\n=== Test 3: 混合失败场景 ===')
{
  const { cwd, specDir } = setup('mixed')
  const proj = basename(cwd)
  try {
    // source_root 污染
    mkdirSync(join(cwd, '.sillyspec', 'docs', proj, 'scan'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'docs', proj, 'scan', 'CONVENTIONS.md'), '# leak')
    // spec 不写文档（缺文档）

    const { runScanPostCheck } = await import('../src/scan-postcheck.js')
    const result = runScanPostCheck({ cwd, specDir })

    assert('混合场景 status = failed_post_check', result.status === SCAN_STATUS.FAILED_POST_CHECK, `实际: ${result.status}`)
    assert('混合场景有多个 check', result.checks.length >= 2, `实际: ${result.checks.length}`)
    assert('混合场景包含 source_root_docs_leak', result.checks.some(c => c.name === 'source_root_docs_leak'))
    assert('混合场景包含 all_docs_missing', result.checks.some(c => c.name === 'all_docs_missing'))

    // 所有 failed check 的 name 列出，确保 SillyHub 能定位问题
    const failedChecks = result.checks.filter(c => c.severity === CHECK_SEVERITY.FAILED)
    assert('混合场景至少 2 个 failed check', failedChecks.length >= 2, `实际: ${failedChecks.length}`)
    for (const fc of failedChecks) {
      assert(`failed check "${fc.name}" 有 detail`, !!fc.detail, `check: ${fc.name}`)
    }
  } finally {
    cleanup(cwd)
    cleanup(specDir)
  }
}

// ── Test 4: 警告场景（文档缺 header）→ completed_with_warnings ──
console.log('\n=== Test 4: 文档缺 header → 警告 ===')
{
  const { cwd, specDir } = setup('warn')
  const proj = basename(cwd)
  try {
    // 写文档但缺少 frontmatter header
    const docs = ['ARCHITECTURE.md', 'CONVENTIONS.md', 'PROJECT.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md']
    for (const doc of docs) {
      mkdirSync(join(specDir, 'docs', proj, 'scan'), { recursive: true })
      writeFileSync(join(specDir, 'docs', proj, 'scan', doc), `# ${doc.replace('.md', '')}\nno header`)
    }

    const { runScanPostCheck } = await import('../src/scan-postcheck.js')
    const result = runScanPostCheck({ cwd, specDir })

    assert('警告场景 status = completed_with_warnings', result.status === SCAN_STATUS.COMPLETED_WITH_WARNINGS, `实际: ${result.status}`)
    assert('警告场景有 docs_missing_header check', result.checks.some(c => c.name === 'docs_missing_header'))
  } finally {
    cleanup(cwd)
    cleanup(specDir)
  }
}

// ── Test 5: 正常成功场景 → success ──
console.log('\n=== Test 5: 正常成功场景 ===')
{
  const { cwd, specDir } = setup('success')
  const proj = basename(cwd)
  try {
    // 写所有 7 份文档，带正确 header
    const docs = ['ARCHITECTURE.md', 'CONVENTIONS.md', 'PROJECT.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md']
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    for (const doc of docs) {
      mkdirSync(join(specDir, 'docs', proj, 'scan'), { recursive: true })
      writeFileSync(join(specDir, 'docs', proj, 'scan', doc),
        `author: bot\ncreated_at: ${now}\n# ${doc.replace('.md', '')}\n`)
    }

    // 在 specDir 写 local.yaml
    writeFileSync(join(specDir, 'local.yaml'), 'build: echo ok\ntest: echo ok\n')

    // 创建 knowledge 目录和 INDEX.md（scan 已产出知识）
    mkdirSync(join(specDir, 'knowledge'), { recursive: true })
    writeFileSync(join(specDir, 'knowledge', 'INDEX.md'), '# Knowledge Index\n')

    const { runScanPostCheck } = await import('../src/scan-postcheck.js')
    const result = runScanPostCheck({ cwd, specDir })

    assert('成功场景 status = success', result.status === SCAN_STATUS.SUCCESS, `实际: ${result.status}`)
    assert('成功场景 checks 全部 passed 或空', result.checks.every(c => c.severity === CHECK_SEVERITY.PASSED) || result.checks.length === 0)
  } finally {
    cleanup(cwd)
    cleanup(specDir)
  }
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed.length}  ❌ 失败: ${failed.length}`)
console.log(`${'='.repeat(50)}`)

if (failed.length > 0) {
  console.log('\n失败详情:')
  for (const f of failed) {
    console.log(`  ❌ ${f.label}`)
    if (f.detail) console.log(`     ${f.detail}`)
  }
  throw new Error('platform-failure-samples test failed')
} else {
  console.log('\n🎉 平台失败样本测试全部通过!')
}
