/**
 * 探针 9 守卫一致性支点测试（2026-09-16 guard-consistency-probe task-03，配套 task-01 的
 * clusterMutationMethods / detectGuardSignals / runProbe9GuardConsistency 三导出）：
 * 同实体变更方法组「有守卫/无守卫并存」比对面的五用例锁定——
 *   1. 不一致命中：Order 实体 doSubmit（无守卫）/ deleteOrder（userId.equals 当前用户比对）/
 *      withdrawOrder（canHandle 能力类调用）→ 组命中 + 信号类别断言；锚点 round-trip（task-02
 *      接线件：渲染→parseProbePrefillAnchors→probe9InconsistentGroups=机械计数 + 形态区分负例）
 *   2. 全守卫零告警：三方法全带守卫 → inconsistentGroups 空（组在场 groupCount=1，非不成组假象）
 *   3. 单方法组 skipped：仅一个变更方法（getOrder 查询面不收）→ groupCount=0 + 不成组注记
 *   4. 注解式命中：@PreAuthorize 方法 vs 无守卫方法 → 命中且信号含注解式
 *   5. 非 Java 与豁免：改动集仅 .js → 不适用；Java 首行 `// probe9-skip` → 整文件跳过
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  clusterMutationMethods, detectGuardSignals, runProbe9GuardConsistency,
  renderVerifyProbesReport,
} from '../src/verify-probes.js'
import {
  parseProbePrefillAnchors, PROBE9_INCONSISTENT_LINE_RE,
} from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/**
 * 标准双层 fixture：spec（design 清单）+ 主仓 Java service 文件（NEW: 待建前缀）。
 * @param {{ prefix: string, java?: string|null, js?: boolean }} opts
 *   java=null → 清单不含 Java 行；js=true → 清单含 .js 行（非 Java 扫描面）
 */
function mkFixture({ prefix, java = null, js = false }) {
  const mainRoot = mk(prefix)
  const relJava = 'src/main/java/com/foo/OrderService.java'
  const relJs = 'src/services/rp.js'
  if (java !== null) {
    mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
    writeFileSync(join(mainRoot, relJava), java)
  }
  if (js) {
    mkdirSync(join(mainRoot, 'src', 'services'), { recursive: true })
    writeFileSync(join(mainRoot, relJs), 'export function submitOrder() { return 1 }\n')
  }
  const specBase = join(mainRoot, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'p9g')
  mkdirSync(changeDir, { recursive: true })
  const rows = [
    ...(java !== null ? [`| 新增 | NEW:${relJava} | service |`] : []),
    ...(js ? [`| 新增 | NEW:${relJs} | service |`] : []),
  ]
  writeFileSync(join(changeDir, 'design.md'), [
    '# design', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    ...rows, '',
  ].join('\n'))
  return { mainRoot, specBase, changeName: 'p9g' }
}

/** EHS 同族三方法形态：doSubmit（纯动词→类实体兜底）/ deleteOrder / withdrawOrder → 同 Order 组 */
const ORDER_SERVICE_MIXED = [
  'public class OrderService {',
  '    public void doSubmit(Order o) {',
  '        submit(o);',
  '    }',
  '    public boolean deleteOrder(Long id) {',
  '        if (!userId.equals(o.getCreateBy())) { throw new RuntimeException("deny"); }',
  '        return true;',
  '    }',
  '    public void withdrawOrder(Long id) {',
  '        if (!canHandle(id)) { throw new RuntimeException("deny"); }',
  '    }',
  '}',
].join('\n')

test('不一致命中：doSubmit 无守卫 / deleteOrder 当前用户比对 / withdrawOrder 能力类调用 → 组命中 + 信号类别', () => {
  // 纯函数直调①：聚类——三方法（纯动词类实体兜底 + 剥动词尾段）归同 Order 组
  const groups = clusterMutationMethods(ORDER_SERVICE_MIXED)
  assert.equal(groups.length, 1, `Order 一组（实际 ${JSON.stringify(groups.map(g => g.entity))}）`)
  assert.equal(groups[0].entity, 'Order')
  assert.deepEqual(groups[0].methods.map(m => m.name).sort(), ['deleteOrder', 'doSubmit', 'withdrawOrder'],
    `三变更方法全入组（实际 ${JSON.stringify(groups[0].methods.map(m => m.name))}）`)

  // 纯函数直调②：信号类别——owner equals → 当前用户比对；canHandle( → 能力类调用；裸体 → 空
  assert.deepEqual(detectGuardSignals('public boolean deleteOrder(Long id) { if (!userId.equals(o.getCreateBy())) {} }'),
    ['当前用户比对'], 'userId.equals( → 当前用户比对')
  assert.deepEqual(detectGuardSignals('public void withdrawOrder(Long id) { if (!canHandle(id)) {} }'),
    ['能力类调用'], 'canHandle( → 能力类调用')
  assert.deepEqual(detectGuardSignals('public void doSubmit(Order o) { submit(o); }'),
    [], '无守卫调用/比对形态 → 空信号（纯标识符弱信号不计）')

  // 主体直调③：不一致组命中——doSubmit 无守卫 vs 两守卫方法并存
  const fx = mkFixture({ prefix: 'p9g-mixed-', java: ORDER_SERVICE_MIXED })
  const r = runProbe9GuardConsistency({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })
  assert.equal(r.applicable, true, 'Java 面在场 → applicable')
  assert.equal(r.javaFileCount, 1, 'Java 文件计数如实')
  assert.equal(r.groupCount, 1, `同实体变更方法组 1（实际 ${r.groupCount}）`)
  assert.equal(r.inconsistentGroups.length, 1, `守卫不一致组命中（实际 ${JSON.stringify(r.inconsistentGroups)}）`)
  const g = r.inconsistentGroups[0]
  assert.equal(g.entity, 'Order')
  assert.deepEqual(g.unguarded, ['doSubmit'], 'doSubmit 无守卫')
  assert.deepEqual([...g.guarded].sort(), ['deleteOrder', 'withdrawOrder'], '两守卫方法入 guarded')
  assert.ok(g.signals.deleteOrder.includes('当前用户比对'), `deleteOrder 信号含当前用户比对（实际 ${JSON.stringify(g.signals)}）`)
  assert.ok(g.signals.withdrawOrder.includes('能力类调用'), `withdrawOrder 信号含能力类调用（实际 ${JSON.stringify(g.signals)}）`)
  assert.deepEqual(g.signals.doSubmit, [], 'doSubmit 信号为空')

  // 锚点 round-trip + 形态锁定（task-02 接线件，同 probe8-contract-pivot 套件口径）：真渲染行
  // （防手写行与渲染形态漂移）→ parseProbePrefillAnchors → 锚点值=机械计数
  const rendered = renderVerifyProbesReport({
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: '语义判断留 agent' },
    probe5: { summary: 'No scan root for parity check' },
    probe6: { unavailable: false, deletions: [], note: 'git diff 对账' },
    probe9: r,
  })
  const anchors = parseProbePrefillAnchors(rendered)
  assert.equal(anchors.subsections.probe9, true, '探针 9 子节在场性纳入 subsections')
  assert.equal(anchors.probe9InconsistentGroups, r.inconsistentGroups.length,
    `渲染→解析 round-trip：守卫不一致实体组锚=机械计数（实际 ${anchors.probe9InconsistentGroups} vs ${r.inconsistentGroups.length}）`)
  // 形态区分 + 行首锚定（负例手写行）：不认段内逐条实体组行 / 缩进行
  assert.ok(!PROBE9_INCONSISTENT_LINE_RE.test('- ⚠️ 实体 Order：有守卫 [deleteOrder（当前用户比对）] / 无守卫 [doSubmit]'),
    '不认逐条实体组行（形态区分）')
  assert.ok(!PROBE9_INCONSISTENT_LINE_RE.test('  - ⚠️ 守卫不一致实体组 2 个（缩进行）'), '行首锚定（缩进不命中）')
})

test('全守卫零告警：三方法全带守卫 → inconsistentGroups 空（组在场非不成组假象）', () => {
  const java = [
    'public class OrderService {',
    '    public void doSubmit(Order o) {',
    '        if (!userId.equals(o.getCreateBy())) { throw new RuntimeException("deny"); }',
    '        submit(o);',
    '    }',
    '    public boolean deleteOrder(Long id) {',
    '        if (!hasRole("admin")) { throw new RuntimeException("deny"); }',
    '        return true;',
    '    }',
    '    public void withdrawOrder(Long id) {',
    '        if (!canHandle(id)) { throw new RuntimeException("deny"); }',
    '    }',
    '}',
  ].join('\n')
  const fx = mkFixture({ prefix: 'p9g-guarded-', java })
  const r = runProbe9GuardConsistency({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.equal(r.applicable, true, 'Java 面在场 → applicable')
  assert.equal(r.groupCount, 1, `三方法仍成组（实际 ${r.groupCount}，防「零告警因不成组」假象）`)
  assert.equal(r.inconsistentGroups.length, 0, `全守卫零告警（实际 ${JSON.stringify(r.inconsistentGroups)}）`)
})

test('单方法组 skipped：仅一个变更方法（getOrder 查询面不收）→ groupCount=0 + 不成组注记', () => {
  const java = [
    'public class OrderService {',
    '    public void submitOrder(Order o) {',
    '        submit(o);',
    '    }',
    '    public Order getOrder(Long id) {',
    '        return repo.findById(id);',
    '    }',
    '}',
  ].join('\n')
  const fx = mkFixture({ prefix: 'p9g-single-', java })
  const r = runProbe9GuardConsistency({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.equal(r.applicable, true, 'Java 面在场 → applicable（成组维度正常进入才谈 skipped）')
  assert.equal(r.groupCount, 0, `单方法不成组（≥2 才比对，实际 ${r.groupCount}）`)
  assert.equal(r.inconsistentGroups.length, 0, '不成组 → 无不一致可比')
  assert.ok((r.notes || []).some(n => n.includes('单方法实体 1 个不成组')),
    `notes 含不成组注记（实际 ${JSON.stringify(r.notes)}）`)
})

test('注解式命中：@PreAuthorize 方法 vs 无守卫方法 → 命中且信号含注解式', () => {
  const java = [
    'public class OrderService {',
    '    @PreAuthorize("hasRole(\'admin\')")',
    '    public void submitOrder(Order o) {',
    '        submit(o);',
    '    }',
    '    public void deleteOrder(Long id) {',
    '        repo.deleteById(id);',
    '    }',
    '}',
  ].join('\n')
  const fx = mkFixture({ prefix: 'p9g-anno-', java })
  const r = runProbe9GuardConsistency({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.equal(r.applicable, true, 'Java 面在场 → applicable')
  assert.equal(r.inconsistentGroups.length, 1, `注解式 vs 无守卫命中（实际 ${JSON.stringify(r.inconsistentGroups)}）`)
  const g = r.inconsistentGroups[0]
  assert.equal(g.entity, 'Order')
  assert.deepEqual(g.guarded, ['submitOrder'], '@PreAuthorize 方法入 guarded')
  assert.deepEqual(g.unguarded, ['deleteOrder'], '无守卫方法入 unguarded')
  assert.ok(g.signals.submitOrder.includes('注解式'),
    `submitOrder 信号含注解式（实际 ${JSON.stringify(g.signals)}）`)
  assert.deepEqual(g.signals.deleteOrder, [], 'deleteOrder 信号为空（注解不串扰——窗口不跨上一方法签名行）')
})

test('非 Java 与豁免：改动集仅 .js → 不适用；Java 首行 // probe9-skip → 整文件跳过', () => {
  // ① 非 Java：清单仅 .js → applicable=false + 无 .java 注记
  const fxJs = mkFixture({ prefix: 'p9g-nonjava-', java: null, js: true })
  const rJs = runProbe9GuardConsistency({ specBase: fxJs.specBase, cwd: fxJs.mainRoot, wtRoot: null, changeName: fxJs.changeName })
  assert.equal(rJs.applicable, false, '无 .java 改动文件 → 不适用')
  assert.equal(rJs.javaFileCount, 0, 'Java 文件计数为 0')
  assert.equal(rJs.groupCount, 0, '组数为 0')
  assert.equal(rJs.inconsistentGroups.length, 0, '无命中')
  assert.ok((rJs.notes || []).some(n => n.includes('清单无 .java 文件')),
    `notes 含无 .java 注记（实际 ${JSON.stringify(rJs.notes)}）`)

  // ② 豁免：Java 首行 // probe9-skip → 整文件跳过（守卫由上游统一拦截等形态的逃生门）
  const javaSkip = ['// probe9-skip', ORDER_SERVICE_MIXED].join('\n')
  const fxSkip = mkFixture({ prefix: 'p9g-skip-', java: javaSkip })
  const rSkip = runProbe9GuardConsistency({ specBase: fxSkip.specBase, cwd: fxSkip.mainRoot, wtRoot: null, changeName: fxSkip.changeName })
  assert.equal(rSkip.applicable, false, '唯一 Java 文件被豁免 → 不适用（javaFileCount=0）')
  assert.equal(rSkip.javaFileCount, 0, '豁免文件不计入 javaFileCount')
  assert.equal(rSkip.groupCount, 0, '组数为 0')
  assert.ok((rSkip.notes || []).some(n => n.includes('probe9-skip') && n.includes('豁免')),
    `notes 含豁免注记（实际 ${JSON.stringify(rSkip.notes)}）`)
})
