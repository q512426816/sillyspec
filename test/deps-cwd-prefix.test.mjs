/**
 * deps-cwd-prefix.test.mjs — deps(auto-py) 运行器 cd 前缀保留与路径重定基（2026-09-25-deps-cwd-prefix）
 *
 * R15/R16 实证缺陷：py 运行器推断剥掉模块命令的 `cd backend &&` 前缀，从 worktree 根跑
 * `uv run pytest`——根上无 pyproject.toml，uv 解析到无 dev extras 的错环境，aiobotocore 假红。
 * 验收面：①带 cd 前缀的模块命令 → 批次命令保留前缀且文件剥前导目录重定基；②裸 pytest 段
 * 命令行为不变；③无命中模块兜底 python -m pytest；④js 组不受影响。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDepsBatches } from '../src/verify-postcheck.js'

test('① cd 前缀保留 + 路径重定基（R15/R16 病灶的正解形态）', () => {
  const b = buildDepsBatches({
    deps: ['backend/tests/test_a.py', 'backend/tests/test_b.py', 'frontend/x.test.ts'],
    changedFiles: ['backend/app/x.py'],
    hits: [{ test: 'cd backend && uv run pytest app/modules/observation -q' }],
  })
  const py = b.find((x) => x.name === 'deps(auto-py)')
  assert.ok(py, 'py 批次在场')
  assert.match(py.command, /^cd backend && uv run pytest /, 'cd 前缀保留（不再从根跑）')
  assert.ok(py.command.includes('tests/test_a.py') && !py.command.includes('backend/tests/test_a.py'), '路径按 backend/ 重定基')
})

test('② 裸 pytest 段命令：行为不变（回归保护）', () => {
  const b = buildDepsBatches({ deps: ['tests/test_a.py'], changedFiles: [], hits: [{ test: 'pytest -q tests' }] })
  assert.match(b[0].command, /^pytest tests\/test_a\.py$/)
})

test('③ 无命中模块兜底 + ④ js 组不受影响', () => {
  const b = buildDepsBatches({ deps: ['a.test.ts', 'b.test.ts'], changedFiles: [], hits: [] })
  assert.equal(b.length, 1)
  assert.match(b[0].command, /^node --test /)
  const b2 = buildDepsBatches({ deps: ['x.py'], changedFiles: [], hits: [] })
  assert.match(b2[0].command, /^python -m pytest x\.py$/)
})
