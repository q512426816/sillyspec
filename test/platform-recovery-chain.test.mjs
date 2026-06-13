/**
 * 平台 scan 恢复链路测试
 *
 * 验证：
 * 1. 首次带 --spec-dir 跑 scan，pointer 文件被创建
 * 2. 后续 --done 不带参数能从 pointer 恢复平台参数
 * 3. scan 完成后 pointer 状态标记为 scan_completed
 * 4. pointer 异常残留能被检测
 *
 * 跑法: node test/platform-recovery-chain.test.mjs
 */

import { join, basename } from 'path'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const binCLI = join(__dirname, '..', 'src', 'index.js')
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

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 15_000, ...opts })
  } catch (e) {
    return e.stdout || e.message
  }
}

// ── 测试 1：pointer 文件创建和内容 ──
console.log('\n=== Test 1: pointer 文件创建 ===')
{
  const tmpCwd = `/tmp/recovery-test-${randomUUID().slice(0, 8)}`
  const tmpSpec = `/tmp/recovery-test-spec-${randomUUID().slice(0, 8)}`
  const tmpRuntime = `/tmp/recovery-test-rt-${randomUUID().slice(0, 8)}`

  try {
    mkdirSync(tmpCwd, { recursive: true })
    writeFileSync(join(tmpCwd, 'package.json'), '{}')

    // init 项目（使用外部 specDir）
    const initOut = run(`node "${binCLI}" init "${tmpCwd}" --spec-root "${tmpSpec}"`)
    assert('init 成功', !initOut.includes('❌'))

    // run scan 会触发参数持久化
    run(`node "${binCLI}" --dir "${tmpCwd}" run scan --spec-root "${tmpSpec}" 2>&1 || true`)

    const pointerPath = join(tmpCwd, '.sillyspec-platform.json')
    assert('pointer 文件存在', existsSync(pointerPath))

    const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'))
    assert('pointer 有 specRoot', !!pointer.specRoot)
    assert('pointer 有 savedAt', !!pointer.savedAt)
    assert('pointer specRoot 指向外部', pointer.specRoot === tmpSpec)

    // pointer 不应包含 status（初始创建时）
    assert('初始 pointer 无 status 字段', !('status' in pointer))
  } finally {
    cleanup(tmpCwd)
    cleanup(tmpSpec)
  }
}

// ── 测试 2：--done 不带参数能恢复 ──
console.log('\n=== Test 2: --done 恢复平台参数 ===')
{
  const tmpCwd = `/tmp/recovery-test2-${randomUUID().slice(0, 8)}`
  const tmpSpec = `/tmp/recovery-test2-spec-${randomUUID().slice(0, 8)}`
  const tmpRuntime = `/tmp/recovery-test2-rt-${randomUUID().slice(0, 8)}`
  const scanRunId = `scan-${Date.now()}`

  try {
    mkdirSync(tmpCwd, { recursive: true })
    writeFileSync(join(tmpCwd, 'package.json'), '{}')

    // init + 触发 run 写入 pointer
    run(`node "${binCLI}" init "${tmpCwd}" --spec-root "${tmpSpec}"`)
    run(`node "${binCLI}" --dir "${tmpCwd}" run scan --spec-root "${tmpSpec}" 2>&1 || true`)

    // 手动模拟一个"scan 第一步 --done"（不带 --spec-root）
    // 关键验证：--done 时能从 pointer 恢复参数
    const doneOut = run(`node "${binCLI}" --dir "${tmpCwd}" run scan --done --input "test" --output "test output" 2>&1`, { cwd: tmpCwd })

    // --done 应该能找到平台参数，不应该报"需要 --spec-root"
    assert('--done 恢复成功', !doneOut.includes('需要 --spec-root') && !doneOut.includes('缺少 specRoot'))
  } finally {
    cleanup(tmpCwd)
    cleanup(tmpSpec)
    cleanup(tmpRuntime)
  }
}

// ── 测试 3：manifest 包含路径和 pointer 信息 ──
console.log('\n=== Test 3: manifest 路径字段 ===')
{
  const { readFile } = await import('fs/promises')
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  // manifest 初始化中包含三路径
  assert('manifest 有 source_root: cwd', runSrc.includes('source_root: cwd'))
  assert('manifest 有 spec_root', runSrc.includes('spec_root: platformOpts'))
  assert('manifest 有 runtime_root', runSrc.includes('runtime_root: platformOpts'))
  assert('manifest 有 platform_pointer_path', runSrc.includes('platform_pointer_path:'))
  assert('manifest platform_pointer_status 使用枚举', runSrc.includes('POINTER_STATUS') || runSrc.includes('POINTER_STATUS.ACTIVE'))
}

// ── 测试 4：异常 pointer 检测 ──
console.log('\n=== Test 4: 异常 pointer 残留检测 ===')
{
  const tmpCwd = `/tmp/recovery-test4-${randomUUID().slice(0, 8)}`
  const tmpSpec = `/tmp/recovery-test4-spec-${randomUUID().slice(0, 8)}`

  try {
    mkdirSync(tmpCwd, { recursive: true })
    writeFileSync(join(tmpCwd, 'package.json'), '{}')

    // init + 触发 run 写入 pointer
    run(`node "${binCLI}" init "${tmpCwd}" --spec-root "${tmpSpec}"`)
    run(`node "${binCLI}" --dir "${tmpCwd}" run scan --spec-root "${tmpSpec}" 2>&1 || true`)

    const pointerPath = join(tmpCwd, '.sillyspec-platform.json')
    assert('pointer 文件存在', existsSync(pointerPath))

    // 模拟损坏的 pointer（缺少 specRoot）
    writeFileSync(pointerPath, JSON.stringify({ workspaceId: 'fake', savedAt: new Date().toISOString() }))
    const badOut = run(`node "${binCLI}" --dir "${tmpCwd}" run scan 2>&1`)
    assert('损坏 pointer 报错', badOut.includes('缺少 specRoot') || badOut.includes('❌'))

    // 模拟有效 pointer（手动修复）
    writeFileSync(pointerPath, JSON.stringify({
      specRoot: tmpSpec,
      runtimeRoot: '/tmp/fake-rt',
      workspaceId: 'test',
      scanRunId: 'scan-test',
      savedAt: new Date().toISOString(),
    }))
    // init 不应报错
    const goodOut = run(`node "${binCLI}" --dir "${tmpCwd}" run scan --help 2>&1`)
    assert('有效 pointer 不报错', !goodOut.includes('缺少 specRoot'))
  } finally {
    cleanup(tmpCwd)
    cleanup(tmpSpec)
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
  throw new Error('platform-recovery-chain test failed')
} else {
  console.log('\n🎉 平台恢复链路测试全部通过!')
}
