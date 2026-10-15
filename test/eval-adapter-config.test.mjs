/**
 * eval-adapter-config.test.mjs — 评测适配器权限配置漂移保护（2026-10-15-eval-adapter-permissions）
 *
 * 根因链：claude -p headless 无交互授批通道，adapter command 无权限旗标时 Write/Bash 全部
 * 自动拒绝（claude 自身 JSON 输出 permission_denials 实证）——被测 agent 只读空转烧 token，
 * 判分 fail 与能力无关。本文件钉死旗标在场（有人删旗标时测试红）与两臂 setup/prompt 语义不变。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(REPO_ROOT, 'eval', 'eval.config.json'), 'utf8'))

test('adapter command 含 --dangerously-skip-permissions（headless 写入权限——缺失即评测环境性 fail 复发）', () => {
  const cmd = config.adapter.command
  assert.ok(Array.isArray(cmd), 'adapter.command 为数组')
  assert.ok(cmd.includes('--dangerously-skip-permissions'), `旗标在场：${JSON.stringify(cmd)}`)
  // 原有形态不回退
  assert.equal(cmd[0], 'claude')
  assert.ok(cmd.includes('-p') && cmd.includes('--output-format') && cmd.includes('json'), 'headless JSON 形态保留')
  assert.ok(cmd.includes('--max-turns') && cmd.includes('{maxTurns}'), '轮数占位保留')
})

test('两臂 setup/promptTemplate 语义不变（B 臂 sillyspec init 在场、{instruction} 占位双臂在场）', () => {
  assert.deepEqual(config.arms.A.setup, [], 'A 臂裸跑零 setup')
  assert.match(config.arms.B.setup[0], /sillyspec init/, 'B 臂 setup 装 SillySpec')
  assert.match(config.arms.A.promptTemplate, /\{instruction\}/)
  assert.match(config.arms.B.promptTemplate, /\{instruction\}/)
})

test('maxTurns 轮数帽与 B 臂话术（2026-10-15-eval-b-arm-turn-budget）', () => {
  assert.equal(config.adapter.maxTurns, 120, 'B 臂流程完成空间：60 轮实测掐断时产物已正确（帽测的是帽不是方法）')
  assert.ok(!config.arms.B.promptTemplate.includes('quick'), 'B 臂 prompt 不含退役通道话术（quick 通道 v3.30.0 已退役）')
  assert.match(config.arms.B.promptTemplate, /flow start/, 'B 臂话术对齐现行协议（flow start 立项）')
  assert.match(config.arms.B.promptTemplate, /flow done/, 'B 臂话术对齐现行协议（flow done 收口）')
})
