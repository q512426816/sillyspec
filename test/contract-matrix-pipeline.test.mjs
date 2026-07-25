/**
 * 端点契约管线端到端测试（不依赖 run.js，直接测 contract-matrix 核心逻辑）
 *
 * 覆盖：
 * - extractArtifactsForChange：buildContractMatrix 识别 provider → extractProviderArtifact 落盘
 *   artifact 到 contract-artifacts/<changeName>/<taskName>/（跨变更隔离维度）
 * - verifyApiParity：有 artifact + 前端 missing → missingBackend>0；无 artifact → backendCount=0
 *   （runVerifyParityCheck 据此判 skipped，不打扰非全栈项目）
 * - 跨变更隔离：两个 change 同名 task-01 的 artifact 独立存在、不互相覆盖
 *
 * 用 Express（Node）后端 + apiFetch 前端，验证多框架提取（Wave 1）+ 管线接线（Wave 2/3 核心）。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { extractArtifactsForChange, verifyApiParity } from '../src/contract-matrix.js'

function setupChange(specBase, changeName, worktreePath, providerCode) {
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  // plan.md：task-02 depends_on task-01（buildContractMatrix 解析依赖图用）
  writeFileSync(join(changeDir, 'plan.md'), [
    '# Plan',
    '',
    '| task | desc | deps |',
    '|------|------|------|',
    '| task-01 | backend router | - |',
    '| task-02 | frontend api client | 01 |',
  ].join('\n'), 'utf8')
  // task-01 = provider（classifyTask 命中 router/endpoint/backend/express）
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '# task-01',
    '实现后端 router，注册 API endpoint。使用 express 框架。',
  ].join('\n'), 'utf8')
  // task-02 = consumer（classifyTask 命中 frontend/apiFetch）
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), [
    '# task-02',
    '前端 api client，使用 apiFetch 封装后端调用。',
  ].join('\n'), 'utf8')
  // worktree 后端代码（Express）
  mkdirSync(worktreePath, { recursive: true })
  writeFileSync(join(worktreePath, 'routes.js'), providerCode, 'utf8')
  return changeDir
}

describe('端点契约管线', () => {
  const tmp = join(tmpdir(), 'sillyspec-test-pipeline')

  it('extractArtifactsForChange：Express provider 端点落盘到 contract-artifacts/<change>/<task>/', () => {
    rmSync(tmp, { recursive: true, force: true })
    const specBase = join(tmp, '.sillyspec')
    const worktree = join(tmp, 'worktree')
    const changeDir = setupChange(specBase, 'change-a', worktree, [
      'const router = require("express").Router();',
      'router.get("/api/users/:id", getUser);',
      'router.post("/api/users", createUser);',
    ].join('\n'))

    const msg = extractArtifactsForChange({ changeDir, specBase, changeName: 'change-a', worktreePath: worktree })
    assert.ok(msg, '有 provider 时应返回日志摘要')

    const artifact = join(specBase, '.runtime', 'contract-artifacts', 'change-a', 'task-01', 'endpoints.json')
    assert.ok(existsSync(artifact), 'artifact 应落盘到带 changeName 维度的路径')
    const data = JSON.parse(readFileSync(artifact, 'utf8'))
    assert.equal(data.endpoints.length, 2)
    const paths = data.endpoints.map(e => `${e.method} ${e.path}`).sort()
    // extractProviderArtifact 存 normalizePath 后的 path（:id → {param}），契约对账一致
    assert.deepEqual(paths, ['GET /api/users/{param}', 'POST /api/users'])
  })

  it('verifyApiParity：有 artifact + 前端调用 missing → missingBackend>0、backendCount>0', () => {
    const specBase = join(tmp, '.sillyspec')
    const frontendDir = join(tmp, 'frontend')
    mkdirSync(frontendDir, { recursive: true })
    writeFileSync(join(frontendDir, 'api.ts'), [
      'export function getUser(id: string) { return apiFetch(`/api/users/${id}`); }',
      'export function getMissing() { return apiFetch("/api/missing"); }',
    ].join('\n'), 'utf8')

    const r = verifyApiParity(specBase, frontendDir, null, 'change-a')
    assert.equal(r.backendCount, 2, '应读到 change-a 的 2 个 provider 端点')
    assert.equal(r.missingBackend.length, 1, '应发现 1 个前端调用了后端未实现的端点')
    assert.equal(r.missingBackend[0].path, '/api/missing')
    assert.equal(r.ok, false)
  })

  it('verifyApiParity：无 artifact（该 change 未提取）→ backendCount=0（runVerifyParityCheck 判 skipped）', () => {
    const specBase = join(tmp, '.sillyspec')
    const frontendDir = join(tmp, 'frontend')
    const r = verifyApiParity(specBase, frontendDir, null, 'change-not-extracted')
    // backendCount=0 让 runVerifyParityCheck 走 skipped 分支，不打扰非全栈/未提取项目
    assert.equal(r.backendCount, 0)
  })

  it('跨变更隔离：change-a 与 change-b 同名 task-01 的 artifact 独立、不互相覆盖', () => {
    const specBase = join(tmp, '.sillyspec')
    const worktreeB = join(tmp, 'worktree-b')
    const changeDirB = setupChange(specBase, 'change-b', worktreeB, [
      'const router = require("express").Router();',
      'router.delete("/api/items/:itemId", deleteItem);',
    ].join('\n'))
    const msgB = extractArtifactsForChange({ changeDir: changeDirB, specBase, changeName: 'change-b', worktreePath: worktreeB })
    assert.ok(msgB)

    const artifactA = join(specBase, '.runtime', 'contract-artifacts', 'change-a', 'task-01', 'endpoints.json')
    const artifactB = join(specBase, '.runtime', 'contract-artifacts', 'change-b', 'task-01', 'endpoints.json')
    assert.ok(existsSync(artifactA), 'change-a artifact 未被 change-b 覆盖')
    assert.ok(existsSync(artifactB), 'change-b artifact 独立存在')
    const dataA = JSON.parse(readFileSync(artifactA, 'utf8'))
    const dataB = JSON.parse(readFileSync(artifactB, 'utf8'))
    assert.equal(dataA.endpoints.length, 2, 'change-a 仍是 2 个端点')
    assert.equal(dataB.endpoints.length, 1, 'change-b 独立 1 个端点')
    assert.equal(dataB.endpoints[0].method, 'DELETE')
  })

  it('extractArtifactsForChange：无 provider（纯文档变更）→ 返回 null 不落盘', () => {
    const specBase = join(tmp, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'change-doc')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    writeFileSync(join(changeDir, 'plan.md'), [
      '# Plan',
      '| task | desc | deps |',
      '|------|------|------|',
      '| task-01 | 更新文档 | - |',
    ].join('\n'), 'utf8')
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '# task-01\n更新 README 文档。\n', 'utf8')
    const worktree = join(tmp, 'worktree-doc')
    mkdirSync(worktree, { recursive: true })
    const msg = extractArtifactsForChange({ changeDir, specBase, changeName: 'change-doc', worktreePath: worktree })
    assert.equal(msg, null, '无 provider 应返回 null（不打扰）')
  })

  it('cleanup', () => {
    try { rmSync(tmp, { recursive: true, force: true }) } catch {}
  })
})
