/**
 * 探针 8 direct-compare（2026-09-18-probe8-direct-compare task-06）：diff 实际面文件源（task-01
 * 采集器三态 fallback 链）→ 前端载荷字段提取（task-02 三后缀五形态）→ 后端两趟提取（task-03
 * @RequestParam 三态 + 必填三形态）→ 直比对账（task-04 漂移/漏发两类）→ 子段渲染（task-04
 * 防撞锚点负例）→ runProbe8PayloadParity 接线（task-05 diffFiles 注入优先 + 内部采集兜底）。
 *
 * 锁定语义（断言钉行为不钉实现）：
 *   - collectProbe8DiffFiles 三态：worktree diff（meta 锚 baseline..HEAD ∪ porcelain）/
 *     in-place（HEAD~1..HEAD 已提交窗口 ∪ porcelain）/ design-list（git 不可用退清单面+注记）；
 *     分类 .java→backend、.vue 无条件 frontend、.ts 目录启发式两态+头 10 行裁决、其余 other；
 *     design 差集 designOnlyPaths（advisory，design-list 态恒空）
 *   - extractFrontendPayloadFields：js 三形态（formData./payload./name=）+ 请求 8 行邻近窗口
 *     DTO 起始键（保留字排除、非请求区对象键不收——Grill B-5）+ vue v-model/prop + wxml
 *     value 插值/data- 前缀；URL 归一三步（?query → /api/ 前缀 → 尾斜杠）；snake→camel 归一；
 *     前 5 行 probe8-skip 逃生门；非三后缀空面
 *   - extractBackendFields：@RequestParam 三态（参数名/required=false 排除必填/value 注解显式名）
 *     + String[]/泛型边界 + @RequestBody 二趟回调解析 + 必填三形态（@NotNull 5 行窗口/@RequestParam
 *     缺省必填/方法体前 30 行校验调用三模式）+ @PathVariable 只进参数集 + 类级通配 REQUEST +
 *     非 Java skip 计数 + 逃生门计数 + 回调抛错 fail-soft
 *   - comparePayloadFields：漂移含 file/line（fieldLines 首命中行号，缺失 null）/漏发含
 *     endpoint/method/field/frontendFiles/无 URL 文件未关联不参与漏发/全零态/计数透传聚合
 *   - renderDirectCompareSection：命中统计行+明细行+全零行；明细行行首字面与 verify-postcheck
 *     PROBE8 两锚点正则严格不同（防撞负例——渲染行永不进锚点 N 求和）
 *
 * 夹具纪律：mkdtemp 临时目录构造（不触真实 .sillyspec 共享仓）；git 夹具注入独立
 * identity/关 gpg（跨机确定性）；全程仓外可重复执行。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import {
  collectProbe8DiffFiles, extractFrontendPayloadFields, isSegmentSuffix,
  extractBackendFields, createTypeResolver, comparePayloadFields,
  renderDirectCompareSection, runProbe8PayloadParity,
} from '../src/verify-probes.js'
import {
  PROBE8_CONTRACT_ORPHANS_LINE_RE, PROBE8_MISSING_REQUIRED_LINE_RE,
} from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** git 夹具助手：独立 identity + 关 gpg 签名（commit.gpgsign）——跨机确定性，不读全局配置 */
const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: 'p8dc', GIT_AUTHOR_EMAIL: 'p8dc@test.local', GIT_COMMITTER_NAME: 'p8dc', GIT_COMMITTER_EMAIL: 'p8dc@test.local' }
function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd, env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
}

/** design 清单骨架（文件变更清单表——house 夹具同款形态） */
function designList(rows) {
  return [
    '# design', '', '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    ...rows.map(r => `| 新增 | ${r} | x |`), '',
  ].join('\n')
}

// ── collectProbe8DiffFiles：三态 fallback 链 + 分类规则 ──────────────────────────

test('collectProbe8DiffFiles worktree 态：meta 锚 baseline..HEAD ∪ porcelain——diff 面采集+分类+design 差集', () => {
  const mainRoot = mk('p8dc-wt-main-')
  const wtDir = mk('p8dc-wt-repo-')

  // worktree 侧真 git 仓：base 提交（docs/base.md）→ HEAD 提交（Controller+vue）→ 未提交 ts
  mkdirSync(join(wtDir, 'docs'), { recursive: true })
  writeFileSync(join(wtDir, 'docs', 'base.md'), 'base\n')
  git(wtDir, 'init', '-q')
  git(wtDir, 'add', '-A')
  git(wtDir, 'commit', '-q', '-m', 'base')
  const baseHash = git(wtDir, 'rev-parse', 'HEAD')
  mkdirSync(join(wtDir, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(wtDir, 'src', 'main', 'java', 'com', 'foo', 'OrderController.java'), 'public class OrderController {}\n')
  mkdirSync(join(wtDir, 'src', 'pages'), { recursive: true })
  writeFileSync(join(wtDir, 'src', 'pages', 'order.vue'), '<template/>\n')
  git(wtDir, 'add', '-A')
  git(wtDir, 'commit', '-q', '-m', 'change')
  mkdirSync(join(wtDir, 'src', 'routes'), { recursive: true })
  writeFileSync(join(wtDir, 'src', 'routes', 'order.ts'), 'export const x = 1\n')

  // 主仓（非 git）+ spec：worktree meta（baselineCommit 锚）+ design 清单（含 diff 面无的差集条目）
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, '.runtime', 'worktrees', 'c1'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'worktrees', 'c1', 'meta.json'), JSON.stringify({
    worktreePath: wtDir.split('\\').join('/'), baselineCommit: baseHash, mode: 'isolate',
  }))
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'c1', 'design.md'), designList([
    'src/main/java/com/foo/OrderController.java', 'docs/ghost.md',
  ]))

  const r = collectProbe8DiffFiles({ cwd: mainRoot, changeName: 'c1', specBase })

  assert.equal(r.source, 'diff', `worktree meta 可用 → diff 态（实际 ${r.source}）`)
  assert.equal(r.fallbackMode, 'diff', 'fallbackMode 随 source 同值')
  assert.ok(r.diffFiles.includes('src/main/java/com/foo/OrderController.java')
    && r.diffFiles.includes('src/pages/order.vue')
    && r.diffFiles.includes('src/routes/order.ts'), `diff 面 = baseline..HEAD ∪ porcelain（实际 ${r.diffFiles}）`)
  assert.ok(!r.diffFiles.includes('docs/base.md'), 'baseline 之前已提交文件不进面')
  assert.deepEqual(r.backend, ['src/main/java/com/foo/OrderController.java'], `.java → backend（实际 ${r.backend}）`)
  assert.ok(r.frontend.includes('src/pages/order.vue') && r.frontend.includes('src/routes/order.ts'),
    `.vue → frontend + .ts routes 目录词 → frontend（实际 ${r.frontend}）`)
  assert.ok(r.notes.some(n => n.includes('文件源=worktree diff')), `模式注记（实际 ${r.notes}）`)
  assert.deepEqual(r.designOnlyPaths, ['docs/ghost.md'], `design 差集 advisory（实际 ${r.designOnlyPaths}）`)
})

test('collectProbe8DiffFiles in-place 态：HEAD~1..HEAD 已提交窗口 ∪ porcelain 未提交——差集注记照常', () => {
  const mainRoot = mk('p8dc-ip-')

  // 主仓真 git：commit1（.sillyspec + docs/old.css）→ commit2（Service.java）→ 未提交 readme.md
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c2'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'c2', 'design.md'), designList([
    'src/main/java/x/Service.java', 'docs/missing.md',
  ]))
  mkdirSync(join(mainRoot, 'docs'), { recursive: true })
  writeFileSync(join(mainRoot, 'docs', 'old.css'), 'a{}')
  git(mainRoot, 'init', '-q')
  git(mainRoot, 'add', '-A')
  git(mainRoot, 'commit', '-q', '-m', 'base')
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'x'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'x', 'Service.java'), 'public class Service {}\n')
  git(mainRoot, 'add', '-A')
  git(mainRoot, 'commit', '-q', '-m', 'change')
  writeFileSync(join(mainRoot, 'readme.md'), 'wip\n')

  const r = collectProbe8DiffFiles({ cwd: mainRoot, changeName: 'c2', specBase })

  assert.equal(r.source, 'in-place', `无 worktree meta → in-place 态（实际 ${r.source}）`)
  assert.ok(r.diffFiles.includes('src/main/java/x/Service.java') && r.diffFiles.includes('readme.md'),
    `已提交窗口 ∪ porcelain 未提交（实际 ${r.diffFiles}）`)
  assert.ok(!r.diffFiles.includes('docs/old.css'), 'HEAD~1 之前已提交文件不进面（窗口边界）')
  assert.ok(r.notes.some(n => n.includes('文件源=in-place diff')), `模式注记（实际 ${r.notes}）`)
  assert.ok(r.backend.includes('src/main/java/x/Service.java') && r.other.includes('readme.md'),
    `分类 .java→backend / .md→other（实际 ${JSON.stringify(r.fileClassification)}）`)
  assert.deepEqual(r.designOnlyPaths, ['docs/missing.md'], `design 差集照常（实际 ${r.designOnlyPaths}）`)
})

test('collectProbe8DiffFiles design-list 态：git 不可用退清单面——分类全规则 + 差集恒空 + 未注册跨仓现身注记', () => {
  const mainRoot = mk('p8dc-dl-')
  const specBase = join(mainRoot, '.sillyspec')

  // .ts 头 10 行裁决二态素材（目录两不中时才读头）：head.ts 含 @RestController / bare.ts 纯内容
  mkdirSync(join(mainRoot, 'src', 'plain'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'plain', 'head.ts'), '@RestController\nexport const a = 1\n')
  writeFileSync(join(mainRoot, 'src', 'plain', 'bare.ts'), 'export const b = 2\n')

  mkdirSync(join(specBase, 'changes', 'c3'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'c3', 'design.md'), designList([
    'src/ctrl/Ctrl.java',          // .java → backend
    'src/any/Comp.vue',            // .vue 无条件 frontend
    'src/routes/nav.ts',           // 目录词 routes → frontend
    'src/service/api.ts',          // 目录词 service → backend
    'src/plain/head.ts',           // 目录两不中 + 头 10 行 @RestController → backend
    'src/plain/bare.ts',           // 目录两不中 + 头无可裁决 → other
    'src/styles/main.css',         // 其余后缀 → other
    'cross-repo:ghost-repo:src/a.js', // 未注册跨仓 → 现身注记（不静默吞）
  ]))

  const r = collectProbe8DiffFiles({ cwd: mainRoot, changeName: 'c3', specBase })

  assert.equal(r.source, 'design-list', `git 双路取数全失败 → design-list 兜底（实际 ${r.source}）`)
  assert.ok(r.notes.some(n => n.includes('文件源=design 清单（diff 不可用）')), `模式注记（实际 ${r.notes}）`)
  assert.ok(r.backend.includes('src/ctrl/Ctrl.java') && r.backend.includes('src/service/api.ts')
    && r.backend.includes('src/plain/head.ts') && r.backend.length === 3,
    `分类 backend 三路（.java/目录词/头裁决，实际 ${r.backend}）`)
  assert.ok(r.frontend.includes('src/any/Comp.vue') && r.frontend.includes('src/routes/nav.ts')
    && r.frontend.includes('src/a.js') && r.frontend.length === 3,
    `分类 frontend 两路 + 未注册跨仓条目剥前缀后按路径启发式归类（.js → frontend，实际 ${r.frontend}）`)
  assert.ok(r.other.includes('src/plain/bare.ts') && r.other.includes('src/styles/main.css'),
    `分类 other（两不中 .ts/其余后缀，实际 ${r.other}）`)
  assert.deepEqual(r.designOnlyPaths, [], 'design-list 态清单即面 → 差集恒空')
  assert.ok(r.notes.some(n => n.includes('ghost-repo') && n.includes('未在 local.yaml repos 注册')),
    `未注册跨仓前缀现身注记（实际 ${r.notes}）`)
})

test('collectProbe8DiffFiles 入参缺失：空面不抛', () => {
  const r = collectProbe8DiffFiles({ cwd: '', changeName: '', specBase: '' })
  assert.equal(r.source, 'design-list')
  assert.ok(r.diffFiles.length === 0 && r.notes.some(n => n.includes('入参缺失')), '空面 + 注记')
})

// ── extractFrontendPayloadFields：三后缀五形态 + 窗口负例 + 归一 ────────────────

test('extractFrontendPayloadFields js 族：formData./payload./name= 三形态 + snake 归一 + 首命中行号', () => {
  const js = [
    '// 前端服务',
    'const uiState = { loading: false, visible: true }',
    'export function submit(form) {',
    '  const formData = {}',
    '  formData.orderName = form.name',
    '  const payload = {}',
    '  payload.leader_user_id = form.leader',
    '  render(\'<input name="orgCode">\')',
    '  return post(\'/api/v1/orders\', { orderType: \'a\', extraKey: 2 })',
    '  const q = { remark: form.r }',
    '}',
  ].join('\n')
  const r = extractFrontendPayloadFields('src/services/rp.js', js)

  assert.deepEqual(r.fields, ['orderName', 'leaderUserId', 'orgCode', 'orderType', 'remark'],
    `五形态字段集（formData./payload. snake 归一/name=/DTO 起始键/邻近窗口对象，实际 ${r.fields}）`)
  assert.ok(!r.fields.includes('loading') && !r.fields.includes('visible'),
    '非请求区对象字面量键不收（Grill B-5——uiState 在请求调用 8 行窗口外）')
  assert.equal(r.fieldLines.get('orderName'), 5, 'fieldLines=首命中行号（formData 族）')
  assert.equal(r.fieldLines.get('leaderUserId'), 7, 'snake→camel 归一后行号随归一名记录')
  assert.equal(r.fieldLines.get('remark'), 10, 'DTO 邻近窗口键行号（请求调用行后 8 行内对象起始键）')
  assert.ok(!r.fields.includes('extraKey'), '同 line `{ a: 1, b: 2 }` 只起始键入面（{ 与键同行契约，逗号后续键不收）')
  assert.deepEqual(r.urlsByCall, [{ url: '/api/v1/orders', normalizedUrl: 'v1/orders', line: 9 }],
    `URL 首参捕获 + 归一（实际 ${JSON.stringify(r.urlsByCall)}）`)
})

test('extractFrontendPayloadFields：词边界防误命中 + 逃生门 + 非三后缀空面', () => {
  const trap = [
    'export function x(page) {',
    '  mydelete(page)',
    '  onsearch(page)',
    '  const local = { leaked: 1 }',
    '}',
  ].join('\n')
  const t = extractFrontendPayloadFields('src/a.js', trap)
  assert.deepEqual(t.fields, [], `mydelete(/onsearch( 标识符内不误命中请求调用（实际 ${t.fields}）`)

  const hatch = extractFrontendPayloadFields('src/b.js', '// probe8-skip\nformData.x = 1\n')
  assert.equal(hatch.escapeHatch, true, '前 5 行 probe8-skip → 整文件跳过')
  assert.ok(hatch.fields.length === 0 && hatch.urlsByCall.length === 0, '逃生门产出空面')

  const other = extractFrontendPayloadFields('src/styles/main.css', 'formData.x = 1')
  assert.ok(other.escapeHatch === false && other.fields.length === 0, '三后缀之外返回空面（escapeHatch=false）')
})

test('extractFrontendPayloadFields vue/wxml 追加族：v-model/prop + value 插值/data- 前缀；跨族不混', () => {
  const vue = extractFrontendPayloadFields('src/pages/a.vue', [
    '<template>',
    '  <input v-model="orderName" />',
    '  <my-comp prop="orgCode" :prop="dyn" myprop="skip" />',
    '</template>',
  ].join('\n'))
  assert.deepEqual(vue.fields, ['orderName', 'orgCode'],
    `vue 追加族（v-model/prop；:prop 动态绑定与 myprop 连写词不收，实际 ${vue.fields}）`)

  const wxml = extractFrontendPayloadFields('pages/b.wxml', [
    '<view>',
    '  <input value="{{orderType}}" data-orgcode="a" />',
    '  <view v-model="{{nope}}">x</view>',
    '</view>',
  ].join('\n'))
  assert.deepEqual(wxml.fields, ['orderType', 'orgcode'],
    `wxml 追加族（value 插值/data- 前缀；v-model 不属 wxml 族不收，实际 ${wxml.fields}）`)
})

test('isSegmentSuffix 段边界：orders 命中 /api/v1/orders 不误命中 rporders；URL 归一三形态', () => {
  // task-06 回报+主代修复回归钉：isSegmentSuffix 前后归一剥前导/尾随斜杠——带前导斜杠的
  // '/orders' 现在正确命中 '/api/v1/orders'（旧实现 '/'+'/orders'='//orders' 永不命中的缺口已修）。
  assert.equal(isSegmentSuffix('orders', '/api/v1/orders'), true, '段首对齐后缀命中（归一后无前导斜杠形态）')
  assert.equal(isSegmentSuffix('/orders', '/api/v1/orders'), true, '前导斜杠归一后命中（task-06 修复回归钉）')
  assert.equal(isSegmentSuffix('v1/orders', '/api/v1/orders'), true, '多段后缀同命中')
  assert.equal(isSegmentSuffix('rporders', '/api/v1/orders'), false, '段中假阳防线（裸 endsWith 会误命中）')
  assert.equal(isSegmentSuffix('/rporders', '/api/v1/orders'), false, '前导斜杠归一后段中仍不误命中')
  assert.equal(isSegmentSuffix('/orders', '/orders'), true, '全等分支（同形原值）')
  assert.equal(isSegmentSuffix('/orders', '/orders/'), true, '收尾斜杠归一后命中')
  assert.equal(isSegmentSuffix('', '/x'), false, '空 URL 恒 false')
  assert.equal(isSegmentSuffix('/x', ''), false, '空 path 恒 false')

  const r = extractFrontendPayloadFields('src/api.js', [
    "fetch('/api/orders?x=1', o)",
    "post('/orders/', o)",
    "getRequest('/api/v1/rp/order')",
  ].join('\n'))
  assert.deepEqual(r.urlsByCall.map(u => u.normalizedUrl), ['orders', '/orders', 'v1/rp/order'],
    `归一三步：?query 剥除 / 尾斜杠剥除 / ^api/ 前缀剥除（前导斜杠仅在 /api/ 前缀形态下一并剥除，实际 ${JSON.stringify(r.urlsByCall.map(u => u.normalizedUrl))}）`)
})

// ── extractBackendFields：@RequestParam 三态 + 必填三形态 + 边界 ─────────────────

test('extractBackendFields：@RequestParam 三态（参数名/required=false/value 注解名）+ String[] 边界 + 二趟 body 解析', () => {
  const java = [
    'package com.foo;',
    '@RestController',
    '@RequestMapping("/api/v1/orders")',
    'public class OrderController {',
    '    @PostMapping("/add")',
    '    public R add(@RequestParam String orderName,',
    '                 @RequestParam(value = "orderType") String type,',
    '                 @RequestParam(required = false) String remark,',
    '                 @RequestParam String[] ids,',
    '                 @RequestBody OrderReq req) {',
    '        return null;',
    '    }',
    '}',
  ].join('\n')
  const dto = [
    'public class OrderReq {',
    '    @NotNull',
    '    private String orgCode;',
    '',
    '    private String orderDesc;',
    '}',
  ].join('\n')
  const r = extractBackendFields([{ path: 'src/OrderController.java', content: java }], (t) => (t === 'OrderReq' ? dto : null))

  assert.equal(r.endpoints.length, 1, `前缀×方法级拼接产出端点（实际 ${r.endpoints.length}）`)
  const ep = r.endpoints[0]
  assert.equal(ep.path, '/api/v1/orders/add', `完整 path = 类级前缀 + 方法子路径（实际 ${ep.path}）`)
  assert.equal(ep.method, 'POST', '动词注解大写')
  assert.ok(ep.requiredFields.includes('orderName') && ep.requiredFields.includes('orderType')
    && ep.requiredFields.includes('ids'), `必填：参数名态 + value 注解显式名 + String[] 数组边界（实际 ${ep.requiredFields}）`)
  assert.ok(!ep.requiredFields.includes('remark'), 'required=false → 非必填（Spring 缺省 true 的排除分支）')
  assert.ok(r.backendAllFields.includes('remark'), `非必填参数名仍进全字段并集（实际 ${r.backendAllFields}）`)
  assert.deepEqual(ep.bodyFields, ['orderDesc', 'orgCode'], `二趟 @RequestBody 经回调解析 private 字段（实际 ${ep.bodyFields}）`)
  assert.ok(ep.requiredFields.includes('orgCode'), '必填形态①：@NotNull 5 行窗口归引用该类型的端点')
})

test('extractBackendFields：必填形态③ 校验调用三模式 + @PathVariable 只进参数集 + 类级通配 REQUEST', () => {
  const java = [
    'package com.foo;',
    '@RestController',
    '@RequestMapping("/api/x")',
    'public class MixedController {',
    '    @RequestMapping("/legacy")',
    '    public R legacy(@PathVariable String oid) {',
    '        StringBlankValidator("checkA");',
    '        checkC.prepare();',
    '        Valid.valid();',
    '        Valid.valid(checkB);',
    '        if (checkD == null) return null;',
    '        return null;',
    '    }',
    '}',
  ].join('\n')
  const wild = [
    '@RestController',
    '@RequestMapping("/api/y")',
    'public class WildController {',
    '}',
  ].join('\n')
  const r = extractBackendFields([
    { path: 'src/MixedController.java', content: java },
    { path: 'src/WildController.java', content: wild },
  ], () => null)

  const legacy = r.endpoints.find(e => e.path === '/api/x/legacy')
  assert.ok(legacy, `方法级 @RequestMapping 端点在场（实际 ${JSON.stringify(r.endpoints.map(e => e.path))}）`)
  assert.equal(legacy.method, 'REQUEST', '无动词注解 → REQUEST')
  assert.ok(legacy.requiredFields.includes('checkA') && legacy.requiredFields.includes('checkB')
    && legacy.requiredFields.includes('checkC') && legacy.requiredFields.includes('checkD'),
    `校验调用三模式：SBV 首参/Valid.valid 同行首参+上一行标识符宽收/if 判空（实际 ${legacy.requiredFields}）`)
  assert.ok(r.backendAllFields.includes('oid') && !legacy.requiredFields.includes('oid'),
    `@PathVariable 只进参数集不计端点必填（实际 ${JSON.stringify(r.backendAllFields)}）`)
  const wildcard = r.endpoints.find(e => e.path === '/api/y')
  assert.ok(wildcard && wildcard.method === 'REQUEST', `前缀存在零方法级端点 → 类级通配（实际 ${JSON.stringify(r.endpoints)}）`)
})

test('extractBackendFields：非 Java skip + 逃生门计数 + 二趟回调抛错 fail-soft 不炸', () => {
  const boomer = [
    '@RestController',
    'public class BController {',
    '    @PostMapping("/boom")',
    '    public R boom(@RequestBody Boom req) {',
    '        return null;',
    '    }',
    '}',
  ].join('\n')
  const r = extractBackendFields([
    { path: 'src/service/helper.ts', content: 'export const x = 1' },
    { path: 'src/A.java', content: '// probe8-skip\npublic class A {}' },
    { path: 'src/BController.java', content: boomer },
  ], (t) => { if (t === 'Boom') throw new Error('boom'); return null })

  assert.equal(r.nonJavaSkipCount, 1, `分类面 backend 但非 .java → skip 计数（实际 ${r.nonJavaSkipCount}）`)
  assert.equal(r.escapeHatchCount, 1, `前 5 行 probe8-skip → 逃生门计数（实际 ${r.escapeHatchCount}）`)
  const ep = r.endpoints.find(e => e.path === '/boom')
  assert.ok(ep && ep.bodyFields.length === 0, `回调抛错 fail-soft：端点照常产出、bodyFields 留空（实际 ${JSON.stringify(r.endpoints)}）`)
})

// ── createTypeResolver：二趟全仓类型表工厂 ─────────────────────────────────────

test('createTypeResolver：src 根递归扫 .java 类型表 + 不可读根空表闭包 + 500KB cap', () => {
  const root = mk('p8dc-res-')
  mkdirSync(join(root, 'com', 'foo'), { recursive: true })
  writeFileSync(join(root, 'com', 'foo', 'OrderReq.java'), 'public class OrderReq {\n  private String orgCode;\n}')
  writeFileSync(join(root, 'com', 'foo', 'Huge.java'), `// ${'x'.repeat(600 * 1024)}`)

  const resolve = createTypeResolver(root)
  assert.ok(resolve('OrderReq') && resolve('OrderReq').includes('class OrderReq'), '类型名 → 内容命中')
  assert.equal(resolve('Nope'), null, '未知类型 → null')
  assert.equal(resolve('Huge'), null, '超大生成文件（>500KB）不进类型表')

  const empty = createTypeResolver(join(root, 'no', 'such', 'dir'))
  assert.equal(empty('OrderReq'), null, '不可读根 → 空表闭包恒返 null 不抛')
})

// ── comparePayloadFields + renderDirectCompareSection：对账与渲染 ───────────────

test('comparePayloadFields：漂移含行号（缺失 null）/漏发含端点面/未关联不参与漏发/全零态/计数聚合', () => {
  const fe = (filePath, fields, fieldLines, urls, escapeHatch = false) => ({
    filePath,
    extract: { escapeHatch, fields, fieldLines: new Map(Object.entries(fieldLines).map(([k, v]) => [k, v])), urlsByCall: urls },
  })
  const r = comparePayloadFields([
    fe('web/a.js', ['shared', 'drift1'], { shared: 3, drift1: 4 }, [{ url: '/x', normalizedUrl: 'v1/orders', line: 9 }]),
    fe('web/b.js', ['drift2'], {}, []), // 无 URL：未关联端点——仅漂移参与；fieldLines 缺 entry → line null
    fe('web/c.vue', [], {}, [{ url: '/x', normalizedUrl: 'other', line: 1 }], true), // 逃生门：双面皆不参与
  ], [
    { path: '/api/v1/orders', method: 'POST', requiredFields: ['shared', 'miss1'], bodyFields: [] },
    { path: '/api/v1/rporders', method: 'POST', requiredFields: ['hard1'], bodyFields: [] }, // 零关联文件端点
  ], ['shared'], { escapeHatchCount: 2, nonJavaSkipCount: 3 })

  assert.deepEqual(r.driftWarnings, [
    { file: 'web/a.js', line: 4, field: 'drift1' },
    { file: 'web/b.js', line: null, field: 'drift2' },
  ], `漂移嫌疑：∉ backendAllFields 逐条含 file/line（fieldLines 缺失 → null，实际 ${JSON.stringify(r.driftWarnings)}）`)
  assert.ok(!r.driftWarnings.some(d => d.field === 'shared'), '后端已见字段不落漂移')
  assert.deepEqual(r.missingRequiredWarnings, [
    { endpoint: '/api/v1/orders', method: 'POST', field: 'miss1', frontendFiles: ['web/a.js'] },
  ], `漏发嫌疑：requiredFields ∉ 关联文件发送集（未关联/逃生门文件不进 frontendFiles，实际 ${JSON.stringify(r.missingRequiredWarnings)}）`)
  assert.ok(!r.missingRequiredWarnings.some(w => w.field === 'hard1'), '零关联文件端点跳过漏发判定（无发送集可比）')
  assert.equal(r.escapeHatchCount, 3, `逃生门聚合 = 前端 1 + 后端透传 2（实际 ${r.escapeHatchCount}）`)
  assert.equal(r.nonJavaSkipCount, 3, '非 Java 跳过计数自 backendStats 透传')

  const zero = comparePayloadFields([], [], [])
  assert.ok(zero.driftWarnings.length === 0 && zero.missingRequiredWarnings.length === 0
    && zero.escapeHatchCount === 0 && zero.nonJavaSkipCount === 0, '空输入全零态')
})

test('renderDirectCompareSection：命中统计行+明细行+全零行；渲染行不撞 PROBE8 两锚点正则', () => {
  const lines = renderDirectCompareSection({
    driftWarnings: [
      { file: 'web/a.js', line: 4, field: 'drift1' },
      { file: 'web/b.js', line: null, field: 'drift2' },
    ],
    missingRequiredWarnings: [
      { endpoint: '/api/v1/orders', method: 'POST', field: 'miss1', frontendFiles: ['web/a.js'] },
    ],
    escapeHatchCount: 1, nonJavaSkipCount: 2,
  })
  assert.equal(lines[0], '- direct-compare: 漂移嫌疑 2 条 / 必填漏发嫌疑 1 条 / escape hatch 1 文件 / 非 Java 后端跳过 2 文件',
    `命中统计行（实际 ${lines[0]}）`)
  assert.ok(lines.includes('- ⚠️ `web/a.js:4` drift1 —— 不在后端字段集（漂移嫌疑）'), `漂移明细行含 file:line（实际 ${lines[1]}）`)
  assert.ok(lines.some(l => l.includes('web/b.js:?') && l.includes('drift2')), '行号缺失 → ? 占位')
  assert.ok(lines.some(l => l.includes('`/api/v1/orders POST miss1`') && l.includes('必填漏发嫌疑')
    && l.includes('关联面：web/a.js')), `漏发明细行含 endpoint/method/field/关联面（实际 ${JSON.stringify(lines)}）`)

  // 防撞锚点负例（task 卡 acceptance）：direct-compare 渲染行永不匹配 verify-postcheck 两锚点
  // （PROBE8_CONTRACT_ORPHANS_LINE_RE / PROBE8_MISSING_REQUIRED_LINE_RE——行首字面前缀严格不同，
  // 渲染行不进锚点 N 求和；PROBE1_HIT_LINE_RE 虽与漂移行同形但按探针子节定界只统计 s1）
  for (const l of lines) {
    assert.ok(!PROBE8_CONTRACT_ORPHANS_LINE_RE.test(l), `不撞契约外载荷键锚（实际命中行：${l}）`)
    assert.ok(!PROBE8_MISSING_REQUIRED_LINE_RE.test(l), `不撞契约必填漏发锚（实际命中行：${l}）`)
  }

  const zero = renderDirectCompareSection({ driftWarnings: [], missingRequiredWarnings: [], escapeHatchCount: 0, nonJavaSkipCount: 0 })
  assert.deepEqual(zero, ['- direct-compare: 无命中（漂移 0 / 漏发 0）'], `全零态单行（实际 ${JSON.stringify(zero)}）`)
  const zeroWithSkip = renderDirectCompareSection({ driftWarnings: [], missingRequiredWarnings: [], escapeHatchCount: 1, nonJavaSkipCount: 2 })
  assert.ok(zeroWithSkip.length === 2 && zeroWithSkip[1].includes('escape hatch 1 文件') && zeroWithSkip[1].includes('非 Java 后端跳过 2 文件'),
    `全零态仍保全跳过面计数（实际 ${JSON.stringify(zeroWithSkip)}）`)
})

// ── 端到端：runProbe8PayloadParity（task-05 接线）────────────────────────────────

test('端到端：diffFiles 显式注入 → directCompare 漂移+漏发双命中（collector 不跑零注记）', () => {
  const mainRoot = mk('p8dc-e2e-')
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'OrderController.java'), [
    'package com.foo;',
    '@RestController',
    '@RequestMapping("/api/v1/orders")',
    'public class OrderController {',
    '    @PostMapping("/add")',
    '    public R add(@RequestParam String orderName,',
    '                 @RequestParam(value = "orderType") String type,',
    '                 @RequestParam(required = false) String remark,',
    '                 @RequestBody OrderReq req) {',
    '        return null;',
    '    }',
    '}',
  ].join('\n'))
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'OrderReq.java'), [
    'public class OrderReq {',
    '    @NotNull',
    '    private String orgCode;',
    '',
    '    private String orderDesc;',
    '}',
  ].join('\n'))
  mkdirSync(join(mainRoot, 'src', 'services'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'services', 'rp.js'), [
    'export function addOrder(form) {',
    '  const payload = {}',
    '  payload.orderName = form.name',
    '  payload.leaderUserId = form.leader',
    "  return post('/api/v1/orders/add', payload)",
    '}',
  ].join('\n'))
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'p8d'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'p8d', 'design.md'), designList([
    'NEW:src/main/java/com/foo/OrderController.java',
    'NEW:src/main/java/com/foo/OrderReq.java',
    'NEW:src/services/rp.js',
  ]))

  const r = runProbe8PayloadParity({
    specBase, cwd: mainRoot, wtRoot: null, changeName: 'p8d',
    diffFiles: { frontend: ['src/services/rp.js'], backend: ['src/main/java/com/foo/OrderController.java'] },
  })

  assert.equal(r.applicable, true, 'design 清单 Java 面在场 → applicable')
  assert.ok(r.directCompare, 'diffFiles 注入 → directCompare 组装（task-05 接线）')
  const dc = r.directCompare
  assert.ok(dc.driftWarnings.some(d => d.file === 'src/services/rp.js' && d.line === 4 && d.field === 'leaderUserId'),
    `漂移嫌疑：leaderUserId ∉ 后端字段集含首命中行号（实际 ${JSON.stringify(dc.driftWarnings)}）`)
  assert.ok(!dc.driftWarnings.some(d => d.field === 'orderName'), '后端已见字段不落漂移')
  assert.ok(dc.missingRequiredWarnings.some(w => w.endpoint === '/api/v1/orders/add' && w.method === 'POST'
    && w.field === 'orderType' && w.frontendFiles.includes('src/services/rp.js')),
    `必填漏发：value 注解名 orderType 未发送（实际 ${JSON.stringify(dc.missingRequiredWarnings)}）`)
  assert.ok(dc.missingRequiredWarnings.some(w => w.field === 'orgCode'),
    '必填漏发：@NotNull 字段（二趟类型解析链路）未发送')
  assert.ok(!dc.missingRequiredWarnings.some(w => w.field === 'orderName'), '已发送必填不列漏发')
  assert.ok(!(r.notes || []).some(n => n.includes('文件源=')), `显式注入跳过内部采集零模式注记（实际 ${JSON.stringify(r.notes)}）`)
})

test('端到端：diffFiles 缺省 → 内部采集 design-list 兜底——风险注记 + directCompare 随组装', () => {
  const mainRoot = mk('p8dc-dlf-')
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'RpOrder.java'), [
    'public class RpOrder {',
    '  private String rpLeaderUserId;',
    '  private String rpCategory;',
    '}',
  ].join('\n'))
  mkdirSync(join(mainRoot, 'src', 'services'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'services', 'rp.js'), [
    'export function addOrder(form) {',
    '  const payload = {}',
    '  payload.leaderUserId = form.leader',
    '  payload.rpCategory = form.cat',
    "  return post('/v1/rp/order', payload)",
    '}',
  ].join('\n'))
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'p8dl'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'p8dl', 'design.md'), designList([
    'NEW:src/main/java/com/foo/RpOrder.java', 'NEW:src/services/rp.js',
  ]))

  const r = runProbe8PayloadParity({ specBase, cwd: mainRoot, wtRoot: null, changeName: 'p8dl' })

  assert.ok((r.notes || []).some(n => n.includes('文件源=design 清单（diff 不可用）——direct-compare 面可能不全')),
    `design-list 兜底风险注记（实际 ${JSON.stringify(r.notes)}）`)
  assert.ok(r.directCompare && r.directCompare.driftWarnings.some(d => d.field === 'leaderUserId' && d.line === 3),
    `兜底面随组装：漂移 leaderUserId（rpLeaderUserId 归一不覆盖，实际 ${JSON.stringify(r.directCompare && r.directCompare.driftWarnings)}）`)
  assert.ok(r.directCompare.driftWarnings.every(d => d.field !== 'rpCategory'), 'rpCategory 后端已见不落漂移')
  assert.equal(r.directCompare.missingRequiredWarnings.length, 0, 'diff 面实体无端点 → 漏发零面')
})
