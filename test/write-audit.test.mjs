/**
 * write-audit 直测（2026-09-17 用户驾驭小结⑥②法证收口）：
 * 批量写入方留痕——take-platform 回放 / pull --spec 解包 / worktree apply 三个批量写入口
 * 落一条 JSONL 审计行（.runtime/write-audit.jsonl），含 CRLF 画像。背景实证：3 文件毫秒级
 * 同 mtime + CRLF 的批量写入事后只能靠 mtime 考古定位写入方，审计行让「18:09 谁动了
 * design.md」查一行即中。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendWriteAudit, detectCrlfFiles, WRITE_AUDIT_FILE_CAP } from '../src/write-audit.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tmpDirs = []
const tmp = (prefix) => { const d = mkdtempSync(join(tmpdir(), `wa-${prefix}-`)); tmpDirs.push(d); return d }
process.on('exit', () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('appendWriteAudit：JSONL 追加 + 目录自建 + 多行追加', () => {
  const specDir = join(tmp('basic'), '.sillyspec')
  assert.equal(appendWriteAudit(specDir, { via: 'platform-resolve-take-platform', overwritten: 3, files: ['changes/x/design.md'], crlfPaths: ['changes/x/design.md'], crlfCount: 1 }), true, '首条落盘成功')
  assert.equal(appendWriteAudit(specDir, { via: 'worktree-apply', change: 'c2', files: ['src/a.js'] }), true, '第二条落盘成功')
  const lines = readFileSync(join(specDir, '.runtime', 'write-audit.jsonl'), 'utf8').trim().split('\n')
  assert.equal(lines.length, 2, '两行审计')
  const first = JSON.parse(lines[0])
  assert.equal(first.via, 'platform-resolve-take-platform', 'via 字段保留')
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(first.ts), 'ts 为 ISO 时间戳（法证对表用）')
  assert.deepEqual(first.crlfPaths, ['changes/x/design.md'], 'CRLF 画像字段保留')
})

test('appendWriteAudit：异常路径 fail-open 返回 false 不抛', () => {
  // 只读父目录下建 .sillyspec 子路径必失败（EACCES/ENOTDIR 因平台而异）——断言不抛 + false
  const ok = appendWriteAudit(join(tmp('ro'), 'file-not-dir', '.sillyspec'), { via: 'x' })
  assert.equal(typeof ok, 'boolean', '返回布尔不抛异常')
})

test('detectCrlfFiles：CRLF/LF 混合面精确命中（Buffer 与 string 双形态）', () => {
  const entries = [
    ['a.md', 'line1\r\nline2\r\n'],           // CRLF string
    ['b.md', Buffer.from('x\r\ny')],            // CRLF Buffer
    ['c.md', 'pure lf\nonly\n'],                // 纯 LF
    ['d.md', Buffer.from('pure lf\n')],         // 纯 LF Buffer
    ['e.bin', Buffer.from([0x0d, 0x0a, 0x00])], // 二进制含 CRLF 字节
  ]
  assert.deepEqual(detectCrlfFiles(entries), ['a.md', 'b.md', 'e.bin'], 'CRLF 命中三件，LF 不误报')
  assert.deepEqual(detectCrlfFiles([]), [], '空面零命中')
  assert.deepEqual(detectCrlfFiles(null), [], 'null 容错')
})

test('三个批量写入口均已接线（源文本锚——take-platform 回放/pull 解包/worktree apply）', () => {
  const syncSrc = readFileSync(join(root, 'src', 'sync.js'), 'utf8')
  const applySrc = readFileSync(join(root, 'src', 'worktree-apply.js'), 'utf8')
  assert.ok(syncSrc.includes("via: 'platform-resolve-take-platform'"), 'take-platform 落地循环写审计行')
  assert.ok(syncSrc.includes("via: 'pull-spec-bundle'"), 'pull --spec 解包写审计行')
  assert.ok(applySrc.includes("via: 'worktree-apply'"), 'worktree apply 成功出口写审计行')
  assert.ok(syncSrc.includes('CRLF 行尾（他机编辑器产物按字节回放'), 'take-platform CRLF 即时警示在场')
})

test('WRITE_AUDIT_FILE_CAP 截断帽为常量（防大树撑爆审计行）', () => {
  assert.equal(typeof WRITE_AUDIT_FILE_CAP, 'number', '数值常量')
  assert.ok(WRITE_AUDIT_FILE_CAP >= 5 && WRITE_AUDIT_FILE_CAP <= 50, '合理区间')
})
