/**
 * quick 审计指引分流 + docsCheckHint 逐条指名（2026-09-11 用户实证两点：
 * ①文档门只报计数 N/M 不指名哪处，四轮复现才定位一处预存债；②allowedFiles 推断漏实改
 * 文件被拦，与「危险文件」混推 --force-baseline——语义过宽吓人）。
 *
 * 锁定语义（渲染层纯文本断言，捕获 console.error/warn）：
 *   - BLOCKED：仅「超出 allowedFiles」（无危险/新增）→ 点名文件 + --files 追加命令；
 *     不出现 --force-baseline（最小解锁，不吓人）
 *   - BLOCKED：含危险文件 → --force-baseline 点名保留（两套开关语义不丢）
 *   - docsCheckHint 明细：invalidRefs 逐条 [doc:line] ref → reason 渲染
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { printQuickAuditReview } from '../src/run/quick-audit.js'

function capture(fn) {
  const origErr = console.error, origWarn = console.warn, origLog = console.log
  let err = '', warn = '', log = ''
  console.error = (...a) => { err += a.join(' ') + '\n' }
  console.warn = (...a) => { warn += a.join(' ') + '\n' }
  console.log = (...a) => { log += a.join(' ') + '\n' }
  try { fn() } finally {
    console.error = origErr; console.warn = origWarn; console.log = origLog
  }
  return { err, warn, log }
}

test('BLOCKED 仅超出 allowedFiles：点名 + --files 追加命令，不推 --force-baseline', () => {
  const review = {
    status: 'blocked',
    reasons: ['超出 allowedFiles: src/foo.js', '超出 allowedFiles: src/bar.js'],
    deletedFiles: [],
    changedFiles: ['src/foo.js', 'src/bar.js'],
  }
  const { err } = capture(() => printQuickAuditReview(review))
  assert.ok(err.includes('src/foo.js') && err.includes('src/bar.js'), '点名漏归属文件')
  assert.ok(err.includes('非危险'), '明示非危险语义（不吓人）')
  assert.ok(err.includes('--files'), '给 --files 追加出路')
  assert.ok(err.includes('quick --files src/foo.js,src/bar.js --change'), '精确恢复命令带文件清单')
  assert.ok(!err.includes('--force-baseline'), '纯归属问题不推 --force-baseline（最小解锁）')
})

test('BLOCKED 混合（危险 + 超出 + 新增）：三类各自点名、flag 集精确拼装', () => {
  const review = {
    status: 'blocked',
    reasons: [
      '危险文件变更: src/run/gates.js',
      '超出 allowedFiles: src/mine.js',
      '新增文件（需 --allow-new）: test/new.test.mjs',
    ],
    deletedFiles: [],
    changedFiles: ['src/run/gates.js', 'src/mine.js', 'test/new.test.mjs'],
  }
  const { err } = capture(() => printQuickAuditReview(review))
  assert.ok(err.includes('⛔ 受保护/危险文件变更：src/run/gates.js') && err.includes('--force-baseline'), '危险文件点名+专属开关')
  assert.ok(err.includes('📋 边界归属未声明（非危险变更）：src/mine.js') && err.includes('--files'), '归属类分流到 --files')
  assert.ok(err.includes('📋 新增文件待放行：test/new.test.mjs') && err.includes('--allow-new'), '新增类分流到 --allow-new')
  // 最小 flag 集三条齐（--files/--allow-new/--force-baseline），无 --allow-delete
  assert.ok(!err.includes('--allow-delete'), '未涉及删除不出 --allow-delete')
})

test('docsCheckHint 明细：invalidRefs 逐条 [doc:line] ref → reason 渲染', () => {
  const review = {
    status: 'warning',
    reasons: [],
    changedFiles: ['docs/a.md'],
    docsCheckHint: {
      invalid: 2, total: 473,
      invalidRefs: [
        { doc: 'docs/code-quality.md', docLine: 12, ref: 'src/x.js:99', reason: '行号超界' },
        { doc: 'docs/api.md', docLine: 34, ref: 'src/y.js:4', reason: '关键词缺失：期望任一「foo」' },
      ],
      invalidTruncated: false,
    },
  }
  const { warn } = capture(() => printQuickAuditReview(review))
  assert.ok(warn.includes('2/473'), '计数行保留')
  assert.ok(warn.includes('[docs/code-quality.md:12] src/x.js:99 → 行号超界'), '第一条 文件:行号 指名')
  assert.ok(warn.includes('[docs/api.md:34] src/y.js:4 →'), '第二条指名')
})
