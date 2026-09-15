/**
 * 探针5 跨仓前端扫描根扩展（坑 probe5-cross-repo-frontend-blind，2026-09-15 EHS 生产实证：
 * 三端全栈变更的前端在兄弟仓，主仓 change-diff 永远不含它们 → 报告「0 frontend calls」假象、
 * 本变更端点全落 unused、契约对账只能靠人工逐条对齐 11 端点）。verifyApiParity 扩展：task 卡
 * allowed_paths 的 cross-repo:<key>: 前缀 + design 清单跨仓条目 → local.yaml repos 注册表解析
 * 仓根 → 各仓根扫前端调用并按声明集收窄，并入 frontendCalls。
 *
 * 锁定语义：
 *   - 注册仓可达 → 跨仓前端调用进对账集（本变更端点被匹配、不再落 unused），summary/crossRepoNotes 注记
 *   - 未注册 repo key → fail-soft 注记「未注册」，主仓对账不受影响
 *   - 无跨仓声明 / 无 repos 注册表 → 零行为（存量单仓流不受影响）
 *   - unused 分层：本变更相关（artifact 端点集内）逐条；存量其余折叠计数（unusedStockCount）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { verifyApiParity } from '../src/contract-matrix.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

const CONTROLLER_JAVA = `package com.foo;
import org.springframework.web.bind.annotation.*;
@RequestMapping("/v1/rp/order")
public class RpOrderController {
  @GetMapping("/page")
  public Object page() { return null; }
  @PostMapping("/{id}/submit")
  public Object submit(@PathVariable String id) { return null; }
  @GetMapping("/legacy-only")
  public Object legacy() { return null; }
}
`

function setupScenario({ registerRepo = true } = {}) {
  const mainRoot = mk('p5xr-main-')
  git(mainRoot, ['init', '-q'])
  git(mainRoot, ['config', 'user.email', 't@t.local'])
  git(mainRoot, ['config', 'user.name', 't'])
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'RpOrderController.java'), CONTROLLER_JAVA)

  // 兄弟仓：前端 service 调主仓端点
  const feRoot = mk('p5xr-fe-')
  git(feRoot, ['init', '-q'])
  git(feRoot, ['config', 'user.email', 't@t.local'])
  git(feRoot, ['config', 'user.name', 't'])
  mkdirSync(join(feRoot, 'src', 'services'), { recursive: true })
  writeFileSync(join(feRoot, 'src', 'services', 'rp.js'), [
    'export function fetchPage(params) {',
    '  return apiFetch("/v1/rp/order/page", { params })',
    '}',
    'export function submitOrder(id) {',
    '  return apiFetch(`/v1/rp/order/${id}/submit`, { method: "POST" })',
    '}',
    '',
  ].join('\n'))
  // design 清单声明的第二个跨仓文件（覆盖源2：design 跨仓条目）
  mkdirSync(join(feRoot, 'src', 'components'), { recursive: true })
  writeFileSync(join(feRoot, 'src', 'components', 'RpExtra.js'),
    'export const loadLegacy = () => apiFetch("/v1/rp/order/legacy-only")\n')
  git(feRoot, ['add', '.'])
  git(feRoot, ['commit', '-q', '-m', 'init'])

  git(mainRoot, ['add', '.'])

  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  if (registerRepo) {
    writeFileSync(join(specBase, 'local.yaml'), `repos:\n  fe-repo: ${feRoot.split('\\').join('/')}\n`)
  }
  const changeDir = join(specBase, 'changes', 'cross-demo')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: 网页端\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths:\n  - cross-repo:fe-repo:src/services/rp.js\n---\n# task-01\n')
  writeFileSync(join(changeDir, 'design.md'), [
    '# design',
    '',
    '## 文件变更清单',
    '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | cross-repo:fe-repo:src/components/RpExtra.js | 附加组件 |',
    '',
  ].join('\n'))

  git(mainRoot, ['add', '.sillyspec/'])
  try { git(mainRoot, ['commit', '-q', '-m', 'spec']) } catch { /* 无 user 配置环境已预设 */ }
  return { mainRoot, feRoot, specBase }
}

test('注册仓可达 → 跨仓前端调用进对账：端点被匹配不落 unused、notes/summary 注记', () => {
  const { mainRoot, specBase } = setupScenario()
  const r = verifyApiParity(specBase, mainRoot, join(specBase, '.runtime'), 'cross-demo')

  // 跨仓调用并入：page + submit + legacy-only 三条（task 卡 1 文件 + design 清单 1 文件）
  assert.ok(r.frontendCount >= 3, `跨仓前端调用并入对账集（实际 frontendCount=${r.frontendCount}）`)
  assert.ok((r.crossRepoNotes || []).some(n => n.includes('fe-repo') && n.includes('前端调用')), `crossRepoNotes 注记（实际：${JSON.stringify(r.crossRepoNotes)}）`)
  assert.match(r.summary, /cross-repo:fe-repo\(\d+\)/, 'summary 注记跨仓 scope')
  // 三个端点全部被前端调用 → 不落 unused
  const unusedKeys = (r.unusedBackend || []).map(u => `${u.method} ${u.path}`)
  assert.ok(!unusedKeys.includes('GET /v1/rp/order/page'), 'page 端点被跨仓调用匹配')
  assert.ok(!unusedKeys.includes('POST /v1/rp/order/{id}/submit'), 'submit 端点被跨仓调用匹配')
  assert.ok(!unusedKeys.includes('GET /v1/rp/order/legacy-only'), 'legacy-only 端点被跨仓调用匹配')
})

test('repo key 未注册（无 repos 段）→ fail-soft 注记，主仓对账不受影响', () => {
  const { mainRoot, specBase } = setupScenario({ registerRepo: false })
  const r = verifyApiParity(specBase, mainRoot, join(specBase, '.runtime'), 'cross-demo')
  assert.equal(r.frontendCount, 0, '跨仓调用未并入（未注册）')
  assert.ok((r.crossRepoNotes || []).some(n => n.includes('fe-repo')), '未注册注记在场')
  // 主仓端点照常 live 扫描
  assert.ok(r.backendCount >= 3, '主仓端点扫描不受跨仓失败影响')
})

test('无跨仓声明（无 task 卡前缀）→ 零行为', () => {
  const { mainRoot, specBase } = setupScenario()
  // 换一个无跨仓声明的变更名（无 tasks 目录）→ 不触发跨仓扫描
  const bareDir = join(specBase, 'changes', 'bare')
  mkdirSync(bareDir, { recursive: true })
  writeFileSync(join(bareDir, 'tasks.md'), '- [x] task-01: 后端\n')
  const r = verifyApiParity(specBase, mainRoot, join(specBase, '.runtime'), 'bare')
  assert.equal(r.frontendCount, 0, '无跨仓声明零行为')
  assert.deepEqual(r.crossRepoNotes || [], [], '无跨仓注记')
})

test('unused 分层：本变更相关逐条 + 存量折叠计数（无 artifact 时回退全列零回归）', () => {
  const { mainRoot, specBase } = setupScenario()
  // 造一个主仓存量未调用端点：追加新 controller（不在跨仓调用集）
  const extra = join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'OtherController.java')
  writeFileSync(extra, 'package com.foo;\nimport org.springframework.web.bind.annotation.*;\n@RequestMapping("/v1/other")\npublic class OtherController {\n  @GetMapping("/list")\n  public Object list() { return null; }\n}\n')
  const r = verifyApiParity(specBase, mainRoot, join(specBase, '.runtime'), 'cross-demo')
  // 无 contract artifact → 回退：unused 全列（零回归），stockCount=0
  assert.ok((r.unusedBackend || []).some(u => u.path === '/v1/other/list'), '存量未调用端点照常列出（无 artifact 回退）')
  assert.equal(r.unusedStockCount || 0, 0, '无 artifact 不折叠')
})
