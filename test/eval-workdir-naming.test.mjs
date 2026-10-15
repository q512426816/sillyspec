/**
 * eval-workdir-naming.test.mjs — eval workdir 命名安全（2026-10-15-eval-workdir-naming）
 *
 * 根因：claude CLI 沙箱把允许目录路径里的 `\004` 形态（workdir 目录段以数字开头，
 * 如 `004-phase-stats__armA`）当八进制转义序列处理，前缀比对恒失败 → workdir 内
 * 一切写入被硬拦（2026-10-15 首次真实 A/B 双臂实证）。本文件钉死：workdir 目录名
 * 必须以非数字字符开头，且保留 taskId/arm 可辨识性、脚手架复制行为不变。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { prepareWorkdir } from '../eval/lib/workdir.mjs'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch { /* Windows EPERM 可接受 */ }
}

test('workdir 命名不以数字开头：数字开头与字母开头 taskId 双形态，basename 首字符非 [0-9] 且含 taskId/arm', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-wd-'))
  try {
    for (const taskId of ['004-phase-stats', 'abc-tool']) {
      for (const arm of ['A', 'B']) {
        const wd = prepareWorkdir(root, taskId, arm, null)
        const name = basename(wd)
        assert.match(name, /^[^\d]/, `basename 首字符非数字：${name}`)
        assert.ok(name.includes(taskId), `保留 taskId 可辨识：${name}`)
        assert.ok(name.includes(`__arm${arm}`), `保留 arm 可辨识：${name}`)
        assert.ok(existsSync(wd), '目录已建')
      }
    }
  } finally { rmQuiet(root) }
})

test('脚手架复制行为不回退：files/ 内容随 prepareWorkdir 落进 workdir', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-wd2-'))
  try {
    const filesDir = join(root, 'files-src')
    mkdirSync(filesDir, { recursive: true })
    writeFileSync(join(filesDir, 'marker.txt'), 'x')
    const wd = prepareWorkdir(root, '004-x', 'A', filesDir)
    assert.ok(existsSync(join(wd, 'marker.txt')), 'files/ 复制进 workdir')
  } finally { rmQuiet(root) }
})
