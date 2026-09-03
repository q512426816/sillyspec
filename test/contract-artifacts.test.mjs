/**
 * endpoint-extractor 和 contract-matrix 测试
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  extractFastApiEndpoints,
  extractExpressEndpoints,
  extractSpringEndpoints,
  scanBackendEndpoints,
  extractMountPrefixes,
  scanMountPrefixes,
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
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-fastapi-'))
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

  // 坑 endpoint-multiline-decorator-miss（2026-08-24 用户实证：多行装饰器路径不在装饰器行，
  // 旧逐行正则漏扫 → probe5 存量端点误报 missing；全文匹配后 \s* 跨换行命中）
  it('多行装饰器（路径独占一行 + response_model 参数）', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'from fastapi import APIRouter',
      'router = APIRouter(prefix="/api/daemon")',
      '',
      '@router.get(',
      '    "/status",',
      '    response_model=Status,',
      ')',
      'async def get_status():',
      '    pass',
      '',
      '@router.post(',
      '        "/reload",',
      ')',
      'async def reload():',
      '    pass',
    ].join('\n'), 'utf8')

    const endpoints = extractFastApiEndpoints(routerFile)
    assert.equal(endpoints.length, 2, `两个多行装饰器端点都提取（实际 ${JSON.stringify(endpoints)}）`)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/daemon/status')
    assert.equal(endpoints[0].line, 4, '行号 = 装饰器起始行')
    assert.equal(endpoints[1].method, 'POST')
    assert.equal(endpoints[1].path, '/api/daemon/reload')
    assert.equal(endpoints[1].line, 11)
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
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-frontend-'))
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

  // ── 挂载前缀对齐（坑 endpoints-mount-prefix-gap，2026-08-31 用户实证）─────────

  it('挂载前缀对齐：前端全路径调用命中欠前缀端点（/api 剥除后匹配）', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/daemon/machines', source: 'api.ts', line: 1 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/daemon/machines', source: 'router.py' }, // 欠挂载前缀（提取口径）
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints, ['/api'])
    assert.equal(result.missingBackend.length, 0, JSON.stringify(result.missingBackend))
    assert.equal(result.ok, true)
    assert.equal(result.prefixAlignedCount, 1)
    // unused 侧同步对齐：欠前缀端点不再因前缀差误报 unused
    assert.equal(result.unusedBackend.length, 0)
  })

  it('不传 mountPrefixes 时维持旧口径（假 missing 仍暴露——回归保护）', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/daemon/machines', source: 'api.ts', line: 1 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/daemon/machines', source: 'router.py' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints)
    assert.equal(result.missingBackend.length, 1)
    assert.equal(result.prefixAlignedCount, 0)
  })

  it('多前缀最长优先：/api/ppm/project 命中欠 /api/ppm 的端点 /project', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/ppm/project-plan/{param}/nodes', source: 'api.ts', line: 1 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/project-plan/{param}/nodes', source: 'router.py' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints, ['/api', '/api/ppm'])
    assert.equal(result.missingBackend.length, 0, JSON.stringify(result.missingBackend))
    assert.equal(result.prefixAlignedCount, 1)
  })

  it('真缺失不因前缀对齐漏报', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/genuinely-missing', source: 'api.ts', line: 1 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/daemon/machines', source: 'router.py' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints, ['/api'])
    assert.equal(result.missingBackend.length, 1)
    assert.equal(result.ok, false)
  })

  it('装饰器自带全路径的仓（提取=真实路径）：直配命中不计 prefixAligned', () => {
    const frontendCalls = [
      { method: 'GET', path: '/api/users', source: 'api.ts', line: 1 },
    ]
    const backendEndpoints = [
      { method: 'GET', path: '/api/users', source: 'routes.js' },
    ]

    const result = diffApiParity(frontendCalls, backendEndpoints, ['/api'])
    assert.equal(result.missingBackend.length, 0)
    assert.equal(result.prefixAlignedCount, 0, '原始路径恒在候选集首位，直配优先')
  })
})

// ─── 挂载前缀提取（extractMountPrefixes / scanMountPrefixes）───────────────

describe('extractMountPrefixes / scanMountPrefixes', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-mount-'))

  it('FastAPI include_router（单行 + 多行）与 Express app.use 前缀提取', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(join(tmpDir, 'main.py'), [
      'from fastapi import FastAPI',
      'app = FastAPI()',
      'app.include_router(daemon_router, prefix="/api")',
      'app.include_router(',
      '    ppm_router,',
      '    prefix="/api/ppm",',
      ')',
      'app.include_router(health_router)  # 无前缀挂载不产出',
    ].join('\n'), 'utf8')
    writeFileSync(join(tmpDir, 'app.js'), [
      'const express = require("express")',
      'const app = express()',
      'app.use("/v2", router)',
    ].join('\n'), 'utf8')

    assert.deepEqual(extractMountPrefixes(join(tmpDir, 'main.py')).sort(), ['/api', '/api/ppm'])
    assert.deepEqual(extractMountPrefixes(join(tmpDir, 'app.js')), ['/v2'])
  })

  it('scanMountPrefixes 递归收集去重，node_modules/test 目录排除', () => {
    // 独立临时目录（坑 mount-prefix-test-isolation，2026-09-02 npm test 偶发红）：describe 级
    // 共享 tmpDir 时 node:test 并发子测试不保序——前序用例写在根目录的 main.py（含 /api/ppm）
    // 会被本用例的递归扫描扫到，断言 ['/api'] 偶发多出 /api/ppm。扫描用例对目录内容敏感，
    // 必须独占目录。
    const scanDir = mkdtempSync(join(tmpdir(), 'sillyspec-mountscan-'))
    mkdirSync(join(scanDir, 'backend', 'app'), { recursive: true })
    writeFileSync(join(scanDir, 'backend', 'app', 'main.py'), 'app.include_router(r, prefix="/api")\n', 'utf8')
    mkdirSync(join(scanDir, 'node_modules', 'lib'), { recursive: true })
    writeFileSync(join(scanDir, 'node_modules', 'lib', 'm.js'), 'app.use("/noise", r)\n', 'utf8')
    mkdirSync(join(scanDir, 'tests'), { recursive: true })
    writeFileSync(join(scanDir, 'tests', 't.py'), 'app.include_router(r, prefix="/test-noise")\n', 'utf8')

    assert.deepEqual(scanMountPrefixes(scanDir), ['/api'])
    try { rmSync(scanDir, { recursive: true, force: true }) } catch {}
  })

  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
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
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-ppm-'))
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

// ─── Express（Node）端点提取 ─────────────────────────────────────────────

describe('extractExpressEndpoints', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-express-'))
  const routerFile = join(tmpDir, 'routes.js')

  it('提取 router/app.<method> 端点', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'const router = express.Router();',
      '',
      'router.get("/api/users/:userId", getUser);',
      'router.post("/api/users", createUser);',
      'router.delete("/api/users/:userId", deleteUser);',
    ].join('\n'), 'utf8')

    const endpoints = extractExpressEndpoints(routerFile)
    assert.equal(endpoints.length, 3)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/users/:userId')
    assert.equal(endpoints[1].method, 'POST')
    assert.equal(endpoints[1].path, '/api/users')
    assert.equal(endpoints[2].method, 'DELETE')
  })

  it('app.use 前缀近似合并（同文件）', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'app.use("/api/v1", router);',
      'router.get("/users", listUsers);',
    ].join('\n'), 'utf8')
    const endpoints = extractExpressEndpoints(routerFile)
    assert.equal(endpoints.length, 1)
    assert.equal(endpoints[0].path, '/api/v1/users')
  })

  // 坑 endpoint-multiline-decorator-miss：多行路由调用同病（handler 在后续行）
  it('多行路由调用（路径独占一行）', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'const router = require("express").Router();',
      '',
      'router.get(',
      '  "/api/daemon/status",',
      '  getStatus',
      ');',
    ].join('\n'), 'utf8')
    const endpoints = extractExpressEndpoints(routerFile)
    assert.equal(endpoints.length, 1, `多行路由命中（实际 ${JSON.stringify(endpoints)}）`)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/daemon/status')
    assert.equal(endpoints[0].line, 3, '行号 = 路由起始行')
  })

  it('链式 router.route(path).<method>()', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, [
      'router.route("/api/items/:id").get(getItem).put(updateItem);',
    ].join('\n'), 'utf8')
    const endpoints = extractExpressEndpoints(routerFile)
    assert.equal(endpoints.length, 2)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/items/:id')
    assert.equal(endpoints[1].method, 'PUT')
  })

  it('空文件返回空', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(routerFile, '', 'utf8')
    assert.equal(extractExpressEndpoints(routerFile).length, 0)
  })

  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})

// ─── Spring（Java）端点提取 ──────────────────────────────────────────────

describe('extractSpringEndpoints', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-spring-'))
  const controllerFile = join(tmpDir, 'UserController.java')

  it('提取 @<Method>Mapping + 类级 @RequestMapping 前缀', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(controllerFile, [
      '@RestController',
      '@RequestMapping("/api/users")',
      'public class UserController {',
      '    @GetMapping("/{id}")',
      '    public User get(@PathVariable Long id) { }',
      '',
      '    @PutMapping("/{id}")',
      '    public User update(@PathVariable Long id) { }',
      '}',
    ].join('\n'), 'utf8')

    const endpoints = extractSpringEndpoints(controllerFile)
    assert.equal(endpoints.length, 2)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/users/{id}')
    assert.equal(endpoints[1].method, 'PUT')
    assert.equal(endpoints[1].path, '/api/users/{id}')
  })

  it('旧式 @RequestMapping(value=path, method=RequestMethod.X)', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(controllerFile, [
      '@RestController',
      '@RequestMapping("/api")',
      'public class OldController {',
      '    @RequestMapping(value = "/items", method = RequestMethod.GET)',
      '    public List<Item> list() { }',
      '}',
    ].join('\n'), 'utf8')
    const endpoints = extractSpringEndpoints(controllerFile)
    assert.equal(endpoints.length, 1)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/items')
  })

  // 坑 endpoint-multiline-decorator-miss：Spring 多行注解同病
  it('多行 @GetMapping / @RequestMapping（路径独占一行）', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(controllerFile, [
      '@RestController',
      '@RequestMapping("/api")',
      'public class Ctrl {',
      '    @GetMapping(',
      '        value = "/users/{id}",',
      '        produces = "application/json"',
      '    )',
      '    public User get(@PathVariable Long id) { }',
      '',
      '    @RequestMapping(',
      '        value = "/users",',
      '        method = RequestMethod.POST',
      '    )',
      '    public User create() { }',
      '}',
    ].join('\n'), 'utf8')
    const endpoints = extractSpringEndpoints(controllerFile)
    assert.equal(endpoints.length, 2, `多行注解两端点都命中（实际 ${JSON.stringify(endpoints)}）`)
    assert.equal(endpoints[0].method, 'GET')
    assert.equal(endpoints[0].path, '/api/users/{id}')
    assert.equal(endpoints[0].line, 4)
    assert.equal(endpoints[1].method, 'POST')
    assert.equal(endpoints[1].path, '/api/users')
    assert.equal(endpoints[1].line, 10)
  })

  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})

// ─── scanBackendEndpoints 多框架分派 ─────────────────────────────────────

describe('scanBackendEndpoints 多框架分派', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-scan-multi-'))

  it('按扩展名分派到 FastAPI/Express/Spring，忽略无关文件', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(join(tmpDir, 'router.py'), [
      'router = APIRouter(prefix="/api")',
      '@router.get("/fast")',
      'async def f(): pass',
    ].join('\n'), 'utf8')
    writeFileSync(join(tmpDir, 'routes.js'), [
      'router.get("/express", h);',
    ].join('\n'), 'utf8')
    writeFileSync(join(tmpDir, 'Ctrl.java'), [
      '@RestController',
      '@RequestMapping("/api")',
      'public class Ctrl {',
      '  @GetMapping("/spring")',
      '  public void s() {}',
      '}',
    ].join('\n'), 'utf8')
    // 无关扩展名不扫
    writeFileSync(join(tmpDir, 'readme.md'), 'router.get("/ignored", h);', 'utf8')

    const endpoints = scanBackendEndpoints(tmpDir)
    const paths = endpoints.map(e => e.path).sort()
    assert.deepEqual(paths, ['/api/fast', '/api/spring', '/express'])
  })

  it('Spring/FastAPI/Express 路径参数都归一化为 {param}（diffApiParity 对账）', () => {
    // backend: Spring {id} / Express :id / FastAPI {id}
    const backendEndpoints = [
      { method: 'GET', path: normalizePath('/api/users/{id}'), source: 'Ctrl.java' },
      { method: 'GET', path: normalizePath('/api/items/:id'), source: 'routes.js' },
      { method: 'GET', path: normalizePath('/api/fast/{id}'), source: 'router.py' },
    ]
    // 前端调用同一归一化路径应全部命中
    const frontendCalls = [
      { method: 'GET', path: '/api/users/{param}', source: 'api.ts', line: 1 },
      { method: 'GET', path: '/api/items/{param}', source: 'api.ts', line: 2 },
      { method: 'GET', path: '/api/fast/{param}', source: 'api.ts', line: 3 },
    ]
    const { missingBackend, ok } = diffApiParity(frontendCalls, backendEndpoints)
    assert.equal(missingBackend.length, 0)
    assert.equal(ok, true)
  })

  it('cleanup', () => {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })
})
