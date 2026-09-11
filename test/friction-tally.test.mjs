// friction-tally.js — 摩擦信号计数数据层单测（friction-signal-hint task-06）
//
// 覆盖（FR-01~04 / D-002@v1 / D-003@v1 / D-005@v1）：
// 1. 路由落点红线（D-002/R-04）：真实变更 → <specBase>/.runtime/friction-tally-<change>.json；
//    quick-<8hex> 会话 → <specBase>/.runtime/quick-sessions/<id>/friction-tally.json——两类路径都必须
//    在 .runtime 树内、绝不落 changes/（平台同步排除区红线）
// 2. 计数正确性：同类型 3 连记 count=3 / lastAt / history 追加；非法类型拒绝且零写入
// 3. history 截尾：25 条只留最近 20（FRICTION_HISTORY_CAP），events 计数不截
// 4. consume 清零语义（D-003）：非零 → hint 含标签与计数 + 删文件；二次 consume → null
// 5. 全零文件：hint null 且不删文件（无提示即无副作用）
// 6. 配置开关（R-05）：嵌套/flat enabled:false → record/consume 双 no-op 零写入；
//    enabled:true / 垃圾值 / 缺键 / 文件缺失 → 默认开
// 7. 损坏 JSON 静默降级：从零重计不抛
// 8. 隐私值域（D-005）：顶层只有 events/history，history 项只有 at/type/detail，detail 精确往返，
//    落盘内容不含提示词/对话原文样例
// 9. renderFrictionHintLine 纯渲染：空/全零 null、未知类型忽略、固定输出序
// 10. 非法 changeName（路径分隔符/../空）→ no-op，无任何落盘
//
// 隔离：os.tmpdir() 下每组用例独立 cwd（specBase=cwd/.sillyspec 推导，不传 platformOpts），
// 绝不碰真实 .sillyspec/.runtime；结束统一清理。
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { recordFrictionEvent, consumeFrictionHint, renderFrictionHintLine } from '../src/friction-tally.js'

// 跨平台：node:path join 在 win32 产反斜杠，统一成正斜杠再做包含断言
const norm = (p) => String(p).replace(/\\/g, '/')

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-friction-${process.pid}-`))
let seq = 0
const makeCwd = () => {
  const cwd = join(tmpRoot, `case-${++seq}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}
const specBaseOf = (cwd) => join(cwd, '.sillyspec')
const runtimeRootOf = (cwd) => join(specBaseOf(cwd), '.runtime')
const realTallyPath = (cwd, change) => join(runtimeRootOf(cwd), `friction-tally-${change}.json`)
const quickTallyPath = (cwd, sessionId) =>
  join(runtimeRootOf(cwd), 'quick-sessions', sessionId, 'friction-tally.json')
const record = (cwd, changeName, type, detail) => recordFrictionEvent({ cwd, changeName, type, detail })
const consume = (cwd, changeName) => consumeFrictionHint({ cwd, changeName })
const readTally = (p) => JSON.parse(readFileSync(p, 'utf8'))
const writeLocalYaml = (cwd, body) => {
  mkdirSync(specBaseOf(cwd), { recursive: true })
  writeFileSync(join(specBaseOf(cwd), 'local.yaml'), body)
}
const ensureFile = (p, body) => {
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body))
}

console.log('\n[friction-tally] 摩擦信号计数数据层')

// ─────────────────────────────────────────
// 1. 路由落点红线（D-002/R-04）
// ─────────────────────────────────────────
console.log('\n--- 1. 路由落点：.runtime 树内、永不落 changes/ ---')
{
  const cwd = makeCwd()
  const change = '2026-09-11-routing-check'

  const r = record(cwd, change, 'gate_rollback')
  assert.ok(r && r.count === 1, '真实变更首次记录返回 count:1')
  const p = realTallyPath(cwd, change)
  assert.ok(existsSync(p), '真实变更计数文件存在')
  const np = norm(p)
  assert.ok(np.includes('/.runtime/'), '真实变更路径在 .runtime 树内')
  assert.ok(!np.includes('/changes/'), '真实变更路径不含 changes/（平台同步红线）')

  const q = record(cwd, 'quick-abcd1234', 'gate_rollback')
  assert.ok(q && q.count === 1, 'quick 会话首次记录返回 count:1')
  const qp = quickTallyPath(cwd, 'quick-abcd1234')
  assert.ok(existsSync(qp), 'quick 会话计数文件存在')
  const nq = norm(qp)
  assert.ok(
    nq.includes('/.runtime/quick-sessions/quick-abcd1234/'),
    'quick 会话路径落 .runtime/quick-sessions/<id>/'
  )
  assert.ok(!nq.includes('/changes/'), 'quick 会话路径不含 changes/')

  // 大写 hex 同形态（QUICK_SESSION_ID_RE 为 /i）
  const r2 = record(cwd, 'quick-ABCD1234', 'verify_run_failed')
  assert.ok(r2 && r2.count === 1, '大写 hex quick id 同样按会话形态路由')
  assert.ok(existsSync(quickTallyPath(cwd, 'quick-ABCD1234')), '大写 hex 会话目录存在')
}

// ─────────────────────────────────────────
// 2. 计数正确性
// ─────────────────────────────────────────
console.log('\n--- 2. 计数 / lastAt / history / 非法类型拒绝 ---')
{
  const cwd = makeCwd()
  const change = 'count-check'
  let r
  for (let i = 0; i < 3; i++) r = record(cwd, change, 'verify_run_failed', 'verify-test')
  assert.deepEqual(r, { type: 'verify_run_failed', count: 3 }, '第 3 次记录返回 {type, count:3}')
  const t = readTally(realTallyPath(cwd, change))
  assert.equal(t.events.verify_run_failed.count, 3, 'events 计数累加到 3')
  assert.ok(
    typeof t.events.verify_run_failed.lastAt === 'string' && t.events.verify_run_failed.lastAt,
    'lastAt 存在且非空'
  )
  assert.equal(t.history.length, 3, 'history 追加 3 条')

  const cwd2 = makeCwd()
  assert.equal(record(cwd2, 'bogus-type', 'bogus'), null, '非法类型返回 null')
  assert.ok(!existsSync(runtimeRootOf(cwd2)), '非法类型不产生任何文件（连 .runtime 目录都不建）')
}

// ─────────────────────────────────────────
// 3. history 截尾（FRICTION_HISTORY_CAP=20）
// ─────────────────────────────────────────
console.log('\n--- 3. history 截尾至 20，events 不截 ---')
{
  const cwd = makeCwd()
  const change = 'cap-check'
  for (let i = 0; i < 25; i++) record(cwd, change, 'gate_rollback', `d${i}`)
  const t = readTally(realTallyPath(cwd, change))
  assert.equal(t.events.gate_rollback.count, 25, 'events 计数累计 25 不截尾')
  assert.equal(t.history.length, 20, 'history 截尾至 20 条')
  assert.equal(t.history[0].detail, 'd5', '保留最近 20 条（最旧为第 6 条）')
  assert.equal(t.history[19].detail, 'd24', '最新为第 25 条')
}

// ─────────────────────────────────────────
// 4. consume 清零语义（D-003）
// ─────────────────────────────────────────
console.log('\n--- 4. consume 提示 + 删文件，二次 consume 为 null ---')
{
  const cwd = makeCwd()
  const change = 'consume-check'
  record(cwd, change, 'gate_rollback')
  record(cwd, change, 'gate_rollback')
  record(cwd, change, 'review_rejected')
  const p = realTallyPath(cwd, change)

  const out = consume(cwd, change)
  assert.equal(out.counts.gate_rollback, 2, 'counts 含 gate_rollback:2')
  assert.equal(out.counts.review_rejected, 1, 'counts 含 review_rejected:1')
  assert.ok(
    typeof out.hint === 'string' &&
      out.hint.includes('gate 回滚 2 次') &&
      out.hint.includes('审查打回 1 次'),
    'hint 含两类标签与次数'
  )
  assert.ok(!existsSync(p), '消费后计数文件删除（提示后清零）')

  const again = consume(cwd, change)
  assert.equal(again.hint, null, '二次 consume hint 为 null')
  assert.deepEqual(again.counts, {}, '二次 consume counts 为空')
}

// ─────────────────────────────────────────
// 5. 全零文件：不提示也不删
// ─────────────────────────────────────────
console.log('\n--- 5. 全零文件 → hint null 且文件保留 ---')
{
  const cwd = makeCwd()
  const change = 'zero-check'
  const p = realTallyPath(cwd, change)
  ensureFile(p, { events: {}, history: [] })

  const out = consume(cwd, change)
  assert.equal(out.hint, null, '全零 → hint null')
  assert.deepEqual(out.counts, {}, '全零 → counts 空')
  assert.ok(existsSync(p), '全零不删除文件（无提示即无副作用）')
}

// ─────────────────────────────────────────
// 6. 配置开关（R-05：仅显式 false 关，缺键/缺文件/垃圾值默认开）
// ─────────────────────────────────────────
console.log('\n--- 6. enabled:false 双直通 / 默认开矩阵 ---')
{
  // 嵌套形态
  const cwd = makeCwd()
  writeLocalYaml(cwd, 'friction_hint:\n  enabled: false\n')
  assert.equal(record(cwd, 'cfg-nested', 'gate_rollback'), null, '嵌套 enabled:false → record no-op')
  assert.ok(!existsSync(runtimeRootOf(cwd)), '关闭态 .runtime 零写入')
  const nestedP = realTallyPath(cwd, 'cfg-nested')
  ensureFile(nestedP, { events: { gate_rollback: { count: 1, lastAt: '2026-09-11T00:00:00Z' } }, history: [] })
  assert.equal(consume(cwd, 'cfg-nested').hint, null, '关闭态 consume 直通 null')
  assert.ok(existsSync(nestedP), '关闭态 consume 不删文件（一键全关零副作用）')

  // flat 形态
  const cwd2 = makeCwd()
  writeLocalYaml(cwd2, 'friction_hint.enabled: false\n')
  assert.equal(record(cwd2, 'cfg-flat', 'gate_rollback'), null, 'flat enabled:false → record no-op')
  assert.ok(!existsSync(realTallyPath(cwd2, 'cfg-flat')), 'flat 关闭态不落计数文件')
  assert.equal(consume(cwd2, 'cfg-flat').hint, null, 'flat 关闭态 consume 直通 null')

  // 默认开矩阵：enabled:true / 垃圾值 / 有 local.yaml 但缺键 / 无 local.yaml
  const onCases = [
    ['enabled-true', 'friction_hint:\n  enabled: true\n'],
    ['enabled-garbage', 'friction_hint:\n  enabled: banana\n'],
    ['key-missing', 'commands:\n  test: node --test\n'],
  ]
  for (const [change, yaml] of onCases) {
    const c = makeCwd()
    writeLocalYaml(c, yaml)
    const r = record(c, change, 'gate_rollback')
    assert.ok(r && r.count === 1, `${change} → 默认开照常记录`)
    assert.ok(existsSync(realTallyPath(c, change)), `${change} → 计数文件落盘`)
  }
  const cwd4 = makeCwd()
  assert.ok(record(cwd4, 'yaml-absent', 'gate_rollback'), 'local.yaml 缺失 → 默认开')
}

// ─────────────────────────────────────────
// 7. 损坏 JSON 静默降级
// ─────────────────────────────────────────
console.log('\n--- 7. 损坏 JSON 从零重计，不抛 ---')
{
  const cwd = makeCwd()
  const change = 'corrupt-check'
  const p = realTallyPath(cwd, change)
  ensureFile(p, '{not valid json')

  const r = record(cwd, change, 'verify_run_failed')
  assert.ok(r && r.count === 1, '损坏 JSON 后记录从 count:1 重新累计')
  const out = consume(cwd, change)
  assert.equal(out.counts.verify_run_failed, 1, 'consume 也能读回重计结果')
  assert.ok(out.hint && out.hint.includes('验证失败 1 次'), '损坏后 hint 正常产出')
}

// ─────────────────────────────────────────
// 8. 隐私值域（D-005）
// ─────────────────────────────────────────
console.log('\n--- 8. 落盘字段最小集，detail 精确往返 ---')
{
  const cwd = makeCwd()
  const change = 'privacy-check'
  record(cwd, change, 'verify_run_failed', 'verify-test')
  const p = realTallyPath(cwd, change)
  const raw = readFileSync(p, 'utf8')

  assert.ok(raw.includes('verify-test'), 'detail 预定义标签按原样落盘')
  assert.ok(!raw.includes('请帮我修复这个 bug'), '不含提示词/对话原文样例字符串')

  const t = JSON.parse(raw)
  assert.deepEqual(Object.keys(t).sort(), ['events', 'history'], '顶层只有 events/history')
  assert.deepEqual(
    Object.keys(t.events.verify_run_failed).sort(),
    ['count', 'lastAt'],
    'events 项只有 count/lastAt'
  )
  assert.equal(t.history.length, 1)
  for (const h of t.history) {
    assert.deepEqual(Object.keys(h).sort(), ['at', 'detail', 'type'], 'history 项只有 at/detail/type')
    assert.equal(h.detail, 'verify-test', 'detail 精确往返（无加工）')
    assert.equal(h.type, 'verify_run_failed', 'type 为枚举值')
  }

  // detail 非字符串 → 落 null（不进结构化字段）
  record(cwd, change, 'gate_rollback', 123)
  const t2 = readTally(p)
  const last = t2.history[t2.history.length - 1]
  assert.equal(last.detail, null, '非字符串 detail 落 null')
}

// ─────────────────────────────────────────
// 9. renderFrictionHintLine 纯渲染
// ─────────────────────────────────────────
console.log('\n--- 9. 纯渲染：空/全零 null、未知忽略、固定序 ---')
{
  assert.equal(renderFrictionHintLine({}), null, '空 counts → null')
  assert.equal(renderFrictionHintLine(null), null, 'null → null')
  assert.equal(renderFrictionHintLine({ gate_rollback: 0 }), null, '全零 → null')

  const one = renderFrictionHintLine({ gate_rollback: 2 })
  assert.ok(one.includes('gate 回滚 2 次'), '单类型渲染标签与次数')

  const mixed = renderFrictionHintLine({ gate_rollback: 1, verify_run_failed: 2, review_rejected: 3, bogus: 9 })
  assert.ok(
    mixed.includes('gate 回滚 1 次') &&
      mixed.includes('验证失败 2 次') &&
      mixed.includes('审查打回 3 次'),
    '三类已知类型都渲染'
  )
  assert.ok(!mixed.includes('bogus'), '未知类型不进提示')
  assert.ok(
    mixed.indexOf('gate 回滚') < mixed.indexOf('验证失败') &&
      mixed.indexOf('验证失败') < mixed.indexOf('审查打回'),
    '固定输出序：gate 回滚 → 验证失败 → 审查打回'
  )
}

// ─────────────────────────────────────────
// 10. 非法 changeName：no-op 零落盘
// ─────────────────────────────────────────
console.log('\n--- 10. 非法 changeName 拒绝 ---')
{
  for (const bad of ['foo/bar', '..', 'a\\b', '']) {
    const cwd = makeCwd()
    assert.equal(record(cwd, bad, 'gate_rollback'), null, `changeName ${JSON.stringify(bad)} → record null`)
    assert.ok(!existsSync(runtimeRootOf(cwd)), `${JSON.stringify(bad)} → 零写入`)
    const out = consume(cwd, bad)
    assert.equal(out.hint, null, `${JSON.stringify(bad)} → consume null`)
    assert.deepEqual(out.counts, {}, `${JSON.stringify(bad)} → counts 空`)
  }
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* OS 清 */ }

console.log('\n[friction-tally] ✅ 全部通过')
