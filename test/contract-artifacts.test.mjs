/**
 * endpoint-extractor 和 contract-matrix 测试
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  extractFastApiEndpoints,
  extractFrontendApiCalls,
  normalizePath,
  diffApiParity,
} from '../src/endpoint-extractor.js'
import {
  classifyTask,
} from '../src/contract-matrix.js'

// ─── 路径归一化 ─────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('模板字符串归一化', () => {
    assert.equal(normalizePath('/api/ppm/project-plan/${id}/plan-nodes'), '/api/ppm/project-plan/{param}/plan-nodes')
  })

  it('Express 风格参数归一化', () => {
    assert.equal(normalizePath('/api/users/:userId/posts'), '/api/users/{param}/posts')
  })

  it('无参数不改变', () => {
    assert.equal(normalizePath('/api/ppm/plan-node'), '/api/ppm/plan-node')
  })
})

// ─── FastAPI 端点提取 ──────────────────────────────────────────────────

describe('extractFastApiEndpoints', () => {
  const tmpDir = join(tmpdir(), 'sillyspec-test-fastapi')
  const routerFile = join(tmpDir, 'router.py')

  it('提取单行装饰器端点', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'from fastapi import APIRouter',
      'router = APIRouter(prefix="/api/ppm")',
      '',
      '@router.get("/plan-node")',
      'async def list_plan_nodes():',
      '    pass',
      '',
      '@router.post("/plan-node")',
      'async def create_plan_node():',
      '    pass',
      '',
      '@router.get("/project-plan/{plan_id}/plan-nodes")',
      'async def list_ps_plan_nodes(plan_id: str):',
      '    pass',
    ].join('\n'), 'utf8')

    const endpoints = extractFastApiEndpoints(routerFile)
    assert.equal(endpoints.length, 3)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/ppm/plan-node')
    assert.equal(endpoints[1].method, 'POST')
    assert.equal(endpoints[1].path, '/api/ppm/plan-node')
    assert.equal(endpoints[2].method, 'GET')
    assert.equal(endpoints[2].path, '/api/ppm/project-plan/{plan_id}/plan-nodes')
  })

  it('prefix + 路径正确合并', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'router = APIRouter(prefix="/api/v2")',
      '@router.get("/users")',
      'async def list_users():',
      '    pass',
    ].join('\n'), 'utf8')

    const endpoints = extractFastApiEndpoints(routerFile)
    assert.equal(endpoints.length, 1)
    assert.equal(endpoints[0].path, '/api/v2/users')
  })

  it('空文件返回空', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, '', 'utf8')
    const endpoints = extractFastApiEndpoints(routerFile)
    assert.equal(endpoints.length, 0)
  })

  // cleanup
  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})

// ─── 前端 API 调用提取 ─────────────────────────────────────────────────

describe('extractFrontendApiCalls', () => {
  const tmpDir = join(tmpdir(), 'sillyspec-test-frontend')
  const apiFile = join(tmpDir, 'plan.ts')

  it('提取 apiFetch 调用', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(apiFile, [
      'export async function listPlanNodes(params: PageReq): Promise<PlanNode[]> {',
      '  return apiFetch<PlanNode[]>("/api/ppm/plan-node", { query: params });',
      '}',
      '',
      'export async function getProjectPlan(planId: string): Promise<ProjectPlan> {',
      '  return apiFetch<ProjectPlan>(`/api/ppm/project-plan/${planId}`);',
      '}',
      '',
      'export async function listPlanNodesByPlan(planId: string): Promise<PsPlanNode[]> {',
      '  return apiFetch<PsPlanNode[]>(`/api/ppm/project-plan/${planId}/plan-nodes`);',
      '}',
      '',
      'export async function createPlanNode(body: CreateReq): Promise<PlanNode> {',
      '  return apiFetch<PlanNode>("/api/ppm/plan-node", {',
      '    method: "POST",',
      '    json: body,',
      '  });',
      '}',
      '',
      'export async function deletePlan(id: string): Promise<void> {',
      '  await apiFetch(`/api/ppm/plan-node/${id}`, { method: "DELETE" });',
      '}',
    ].join('\n'), 'utf8')

    const calls = extractFrontendApiCalls(apiFile)
    assert.ok(calls.length >= 5)

    // GET /api/ppm/plan-node
    const listCall = calls.find(c => c.raw === '/api/ppm/plan-node' && c.method === 'GET')
    assert.ok(listCall, 'should find GET /api/ppm/plan-node')

    // GET with template string → 归一化
    const detailCall = calls.find(c => c.path === '/api/ppm/project-plan/{param}')
    assert.ok(detailCall, 'should find GET /api/ppm/project-plan/{param}')

    // POST
    const createCall = calls.find(c => c.method === 'POST')
    assert.ok(createCall, 'should find POST call')

    // DELETE
    const deleteCall = calls.find(c => c.method === 'DELETE')
    assert.ok(deleteCall, 'should find DELETE call')
  })

  it('模板字符串归一化为 {param}', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(apiFile, [
      'const id = "123";',
      'apiFetch(`/api/users/${id}/profile`);',
    ].join('\n'), 'utf8')

    const calls = extractFrontendApiCalls(apiFile)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].path, '/api/users/{param}/profile')
  })

  // cleanup
  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})

// ─── Parity Check ──────────────────────────────────────────────────────

describe('diffApiParity', () => {
  it('前端调用后端不存在路径时 missingBackend', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/ppm/plan-node', source: 'plan.ts', line: 10 },
      { method: 'GET', path: '/api/ppm/project-plan/{param}/plan-nodes', source: 'plan.ts', line: 20 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/api/ppm/plan-node', source: 'router.py' },
      // 缺少 /project-plan/{id}/plan-nodes
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints)
    assert.equal(result.missingBackend.length, 1)
    assert.equal(result.missingBackend[0].path, '/api/ppm/project-plan/{param}/plan-nodes')
    assert.equal(result.unusedBackend.length, 0)
    assert.equal(result.ok, false)
  })

  it('全部匹配时 ok', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/ppm/plan-node', source: 'plan.ts', line: 10 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/api/ppm/plan-node', source: 'router.py' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints)
    assert.equal(result.ok, true)
    assert.equal(result.missingBackend.length, 0)
  })

  it('后端有但前端未调用的路径在 unusedBackend', () => {
    const frontendCalls = []
    const backendEndpoints = [
      { method: 'GET', path: '/api/ppm/internal/health', source: 'router.py' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints)
    assert.equal(result.unusedBackend.length, 1)
    assert.equal(result.unusedBackend[0].path, '/api/ppm/internal/health')
  })
})

// ─── Task 分类 ──────────────────────────────────────────────────────────

describe('classifyTask', () => {
  it('后端 router task 识别为 provider', () => {
    const content = '## 目标\n实现 plan 子域后端 router，包含 APIRouter 路由注册。'
    const result = classifyTask(content)
    assert.ok(result.isProvider)
  })

  it('前端 API client task 识别为 consumer', () => {
    const content = '## 目标\n为前端提供统一 API client，使用 apiFetch 封装。'
    const result = classifyTask(content)
    assert.ok(result.isConsumer)
  })

  it('纯文档 task 两者都不是', () => {
    const content = '## 目标\n更新 README 文档。'
    const result = classifyTask(content)
    assert.ok(!result.isProvider || result.confidence < 0.5)
    assert.ok(!result.isConsumer || result.confidence < 0.5)
  })
})

// ─── 集成测试：复现 PPM 真实场景 ───────────────────────────────────────

describe('PPM 真实场景：跨 task 端点漏实现', () => {
  const tmpDir = join(tmpdir(), 'sillyspec-test-ppm')
  const routerFile = join(tmpDir, 'router.py')
  const apiClientFile = join(tmpDir, 'plan.ts')

  it('verify 应该 FAIL：前端调用 /project-plan/{id}/plan-nodes 但后端未实现', () => {
    mkdirSync(tmpDir, { recursive: true })

    // 模拟 task-04 后端实现：只注册了基础 CRUD，遗漏嵌套端点
    writeFileSync(routerFile, [
      'router = APIRouter(prefix="/api/ppm")',
      '',
      '@router.get("/plan-node")',
      'async def list_plan_nodes():',
      '    pass',
      '',
      '@router.post("/plan-node")',
      'async def create_plan_node():',
      '    pass',
      '',
      '@router.get("/project-plan")',
      'async def list_project_plans():',
      '    pass',
      '',
      '@router.post("/project-plan")',
      'async def create_project_plan():',
      '    pass',
    ].join('\n'), 'utf8')

    // 模拟 task-09 前端 API client：调用了后端不存在的嵌套端点
    writeFileSync(apiClientFile, [
      'export async function listProjectPlans(params: PageReq) {',
      '  return apiFetch<ProjectPlan[]>("/api/ppm/project-plan", pageQuery(params));',
      '}',
      '',
      'export async function listPlanNodes(planId: string) {',
      '  // ← 后端没实现这个嵌套端点',
      '  return apiFetch<PsPlanNode[]>(`/api/ppm/project-plan/${planId}/plan-nodes`);',
      '}',
      '',
      'export async function listPlanNodeDetails(nodeId: string) {',
      '  // ← 后端也没实现这个',
      '  return apiFetch<PlanNodeDetail[]>(`/api/ppm/plan-node/${nodeId}/details`);',
      '}',
    ].join('\n'), 'utf8')

    // 提取后端端点
    const backendEndpoints = extractFastApiEndpoints(routerFile)
    const backendPaths = new Set(backendEndpoints.map(e => normalizePath(e.path)))

    // 提取前端调用
    const frontendCalls = extractFrontendApiCalls(apiClientFile)
    const { missingBackend, ok } = diffApiParity(frontendCalls, backendEndpoints)

    // 断言：后端只实现了基础 CRUD
    assert.ok(backendPaths.has('/api/ppm/plan-node'), '后端应有 GET /plan-node')
    assert.ok(backendPaths.has('/api/ppm/project-plan'), '后端应有 GET /project-plan')

    // 断言：parity check 失败
    assert.equal(ok, false, 'verify 应该 FAIL')
    assert.equal(missingBackend.length, 2, '应发现 2 个缺失端点')

    // 断言：缺失的端点正是 PPM 真实 bug 的那两个
    const missingPaths = missingBackend.map(m => m.path)
    assert.ok(
      missingPaths.includes('/api/ppm/project-plan/{param}/plan-nodes'),
      '应捕获缺失的 /project-plan/{id}/plan-nodes'
    )
    assert.ok(
      missingPaths.includes('/api/ppm/plan-node/{param}/details'),
      '应捕获缺失的 /plan-node/{id}/details'
    )

    // 断言：diff 输出带 source 文件路径
    const planNodesGap = missingBackend.find(
      m => m.path === '/api/ppm/project-plan/{param}/plan-nodes'
    )
    assert.ok(planNodesGap.consumerFile.includes('plan.ts'), '应带前端文件路径')
    assert.equal(planNodesGap.consumerLine, 7, '应带行号')
  })

  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})
