/**
 * 坑 verify-modules-crlf-blanket-fallback 的 e2e 收口：CRLF local.yaml → runVerifyTestCheck
 * 真跑 module 子集命令（而非回退全量 600s）
 *
 * 背景（2026-08-20 用户实测）：Windows 仓 local.yaml CRLF 时 modules 映射解析恒失败 →
 * 回退全量（12 分钟 vs 应有的 2 分钟，且引发一次超时误判）。extractor 层修复已有
 * verify-postcheck-crlf.test.mjs 锁定；本测试锁端到端：CRLF 配置下 CLI 选择并执行
 * 命中的模块测试命令（用 marker 文件证明跑的是模块命令而非全量命令）。
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { runVerifyTestCheck } from '../src/verify-postcheck.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log('  ✅ ' + msg)) : (failed++, failures.push(msg), console.log('  ❌ ' + msg)) }

console.log('=== CRLF local.yaml → verify module 子集 e2e ===\n')
{
  const repo = mkdtempSync(join(tmpdir(), `verify-crlf-e2e-${Date.now()}-`))
  try {
    // git 仓 + 基线提交 + backend/ 改动（动态子集命中源）
    // 2026-09-26-dynamic-test-inference 迁移：modules.*.test 退役——CRLF 配置解析不碎的断言
    // 面改为「CRLF local.yaml（含退役 modules 块）+ 变更测试文件 → 动态子集真跑」；
    // 原 fixtures 经 module 命令 marker 触达，现经变更测试文件 marker 触达（同款防线）。
    execSync('git init -b main && git config user.email t@t && git config user.name t', { cwd: repo, stdio: 'ignore' })
    mkdirSync(join(repo, 'backend'), { recursive: true })
    mkdirSync(join(repo, 'frontend'), { recursive: true })
    writeFileSync(join(repo, 'backend', 'app.py'), 'x = 1\n')
    writeFileSync(join(repo, 'backend', 'smoke.test.mjs'), "import { test } from 'node:test'\nimport { writeFileSync } from 'node:fs'\ntest('m', () => { writeFileSync('backend-marker.txt', '1') })\n")
    writeFileSync(join(repo, 'frontend', '.keep'), '') // frontend 无关（未改）
    execSync('git add . && git commit -m base', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'backend', 'app.py'), 'x = 2\n') // 未提交改动 + smoke.test.mjs 基线在场
    writeFileSync(join(repo, 'backend', 'smoke.test.mjs'), "import { test } from 'node:test'\nimport { writeFileSync } from 'node:fs'\ntest('m', () => { writeFileSync('backend-marker.txt', '2') })\n")

    // CRLF local.yaml：modules 映射（退役块在场——退役指引可打印即解析不碎）+ module 策略（折算动态）
    const specBase = join(repo, '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    const crlf = [
      'commands:',
      `  test: node -e "require('fs').writeFileSync('full-marker.txt','1')"`,
      '',
      'test_strategy: module',
      '',
      'modules:',
      `  backend: { path: "backend/", test: "node -e \\"require('fs').writeFileSync('backend-marker.txt','1')\\"" }`,
      `  frontend: { path: "frontend/", test: "node -e \\"require('fs').writeFileSync('frontend-marker.txt','1')\\"" }`,
      '',
    ].join('\r\n')
    writeFileSync(join(specBase, 'local.yaml'), crlf, 'utf8')

    delete process.env.NODE_TEST_CONTEXT
    const r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'crlf-e2e' })

    assert(r.status === 'passed', `动态子集执行 passed（实得 ${r.status}）`)
    assert(String(r.command || '').includes('deps('), `command 为动态子集聚合标签而非全量命令（command: ${r.command}）`)
    assert(existsSync(join(repo, 'backend-marker.txt')), 'backend 变更测试真实执行（marker 落盘）')
    assert(!existsSync(join(repo, 'full-marker.txt')), '全量命令未执行（无回退）')
    assert(!existsSync(join(repo, 'frontend-marker.txt')), '未触碰模块（frontend）的退役命令未执行')
    assert(r.mode === 'dynamic-subset', `结果 mode=dynamic-subset（${r.mode}）`)
  } finally {
    try { rmSync(repo, { recursive: true, force: true }) } catch {}
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
