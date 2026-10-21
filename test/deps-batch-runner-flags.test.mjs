/**
 * deps 批运行器尾随 flag 保留回归（2026-10-21-deps-batch-runner-flags）。
 *
 * dsh 0ff6f1c8 补充诊断（22:53）取证：buildDepsBatches 的 pytest 运行器提取正则「截到
 * pytest 一词为止」，local.yaml 模块命令显式配置的 `-q --no-cov -n auto` 被静默丢弃——
 * multi-agent-platform deps(auto-py) 批 124 文件（2081 例）单核串行 1183s，同仓全量
 * 4771 例带 -n auto 仅 357s（同规模差 6-10 倍）；600s 超时截在 69% 判失败，六轮验证
 * 累计空耗约 1 小时。本文件锁死：flag 保留、位置参数丢弃、无 flag 命令零变化、
 * 重定基/cd 前缀语义不破、jsx 提取路径不动。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const u = (p) => new URL('file:///' + p.replace(/\\/g, '/').replace(/^\/*/, '')).href
const load = async (rel) => await import(u(join(ROOT, rel).replace(/\\/g, '/')))

const { extractRunnerTrailingFlags, buildDepsBatches } = await load('src/verify-postcheck.js')

// ── 纯函数矩阵 ─────────────────────────────────────────────────────────────
test('extractRunnerTrailingFlags：裸 flag/含等号一体/吃值 flag 连值/位置参数丢弃矩阵', () => {
  // 高频主路径：-n auto 吃值 + 裸 flag 串 + 目录位置参数丢弃
  assert.equal(
    extractRunnerTrailingFlags({ command: 'cd backend && uv run pytest -q --no-cov -n auto app/modules/daemon/tests', runner: 'cd backend && uv run pytest' }),
    ' -q --no-cov -n auto',
    '-n auto 值保留、路径位置参数丢弃',
  )
  // 含等号一体 flag
  assert.equal(
    extractRunnerTrailingFlags({ command: 'uv run pytest --cov-report=xml -q', runner: 'uv run pytest' }),
    ' --cov-report=xml -q',
    '含等号 flag 整 token 保留',
  )
  // 其他吃值 flag 连值
  assert.equal(
    extractRunnerTrailingFlags({ command: 'pytest -k "fast and not slow" -m unit --maxfail 3', runner: 'pytest' }),
    ' -k "fast and not slow" -m unit --maxfail 3',
    '-k 表达式（带引号值）/-m/--maxfail 值保留',
  )
  // 无尾随 flag → ''（零变化路径）
  assert.equal(extractRunnerTrailingFlags({ command: 'cd backend && uv run pytest', runner: 'cd backend && uv run pytest' }), '', '无尾随 flag 返回空串')
  // runner 不在命令中 → ''（防御）
  assert.equal(extractRunnerTrailingFlags({ command: 'npm test', runner: 'pytest' }), '', 'runner 缺席返回空串')
  // 段边界防御：runner 之后跟 && 的下一段命令不泄入
  assert.equal(
    extractRunnerTrailingFlags({ command: 'cd backend && uv run pytest -n auto && cd .. && echo done', runner: 'cd backend && uv run pytest' }),
    ' -n auto',
    '段边界（&&）之后的 token 不泄入',
  )
  // 未知吃值 flag 的值被按位置参数丢弃（裸 flag 留下——温和退化不炸批）
  assert.equal(
    extractRunnerTrailingFlags({ command: 'pytest --cov-report xml tests/', runner: 'pytest' }),
    ' --cov-report',
    '白名单外吃值 flag 的值词丢弃（裸 flag 保留）',
  )
})

// ── buildDepsBatches 集成 ───────────────────────────────────────────────────
function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'dbf-'))
  execSync('git init -q', { cwd: dir })
  mkdirSync(join(dir, 'backend', 'app', 'tests'), { recursive: true })
  writeFileSync(join(dir, 'backend', 'app', 'tests', 'test_a.py'), 'def test_a():\n    assert 1\n')
  writeFileSync(join(dir, 'backend', 'app', 'tests', 'test_b.py'), 'def test_b():\n    assert 1\n')
  return dir
}

test('buildDepsBatches：-n auto 保留 + 重定基不破 + 无 flag 命令逐字不变 + jsx 路径不动', () => {
  const dir = makeFixtureRepo()
  try {
    const files = ['backend/app/tests/test_a.py', 'backend/app/tests/test_b.py']
    // ① 含 -n auto 的命中命令：批命令保留 flag 且文件面重定基（backend/ 剥离）
    const withFlags = buildDepsBatches({
      cwd: dir,
      deps: files,
      hits: [{ test: 'cd backend && uv run pytest -q --no-cov -n auto app/tests' }],
    })
    const pyBatch1 = withFlags.find((b) => b.short === 'py')
    assert.ok(pyBatch1, 'py 批在场')
    assert.match(pyBatch1.command, /^cd backend && uv run pytest -q --no-cov -n auto app\/tests\/test_a\.py/, '批命令 = runner + 保留 flag + 重定基文件面')
    assert.ok(!/app\/tests app\//.test(pyBatch1.command), '原命令位置参数（app/tests）不混入')
    // ② 无尾随 flag 的命中命令：批命令与现行逐字一致（缺省不补 flag）
    const noFlags = buildDepsBatches({
      cwd: dir,
      deps: files,
      hits: [{ test: 'cd backend && uv run pytest app/tests' }],
    })
    const pyBatch2 = noFlags.find((b) => b.short === 'py')
    assert.ok(pyBatch2.command.startsWith('cd backend && uv run pytest app/tests/test_a.py'), '无 flag 命令零变化（不注入任何缺省 flag）')
    assert.ok(!/ -n /.test(pyBatch2.command), '未配置并行就不出现 -n')
    // ③ vitest 命中命令（jsx 路径）：本变更不动——runner 提取保持「截到 vitest/jest 词」现状
    const jsx = buildDepsBatches({
      cwd: dir,
      deps: ['frontend/src/x.test.tsx'],
      hits: [{ test: 'cd frontend && npx vitest run --reporter=tap' }],
    })
    const jsxBatch = jsx.find((b) => b.short === 'jsx')
    if (jsxBatch) {
      assert.doesNotMatch(jsxBatch.command, /--reporter=tap/, 'jsx 提取路径本变更保持不动（flag 不保留也不报错）')
    }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
