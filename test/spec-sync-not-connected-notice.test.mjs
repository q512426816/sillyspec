/**
 * 未连接平台显眼告警（坑 2026-09-27-spec-sync-413-and-nested-runtime 长期修复第三条）
 * + resolveSpecDir 嵌套回环防护（同坑根因 2）
 *
 * 实证（2026-09-27）：主仓 local.yaml 无 platform 段 → --done 自动同步静默 no-op，
 * 用户误判「已同步」，平台断档 8 天才发现；另 .sillyspec/.runtime/ 下嵌套 .sillyspec
 * 残骸使状态采集 30s 超时。
 *
 * 修复断言（src/run/shared.js）：
 * ① triggerSync 未连接 → 每日至多一次的显眼告警（含 connect 指引），第二次同日静默；
 * ② resolveSpecDir 上溯遇 <…>/.runtime/.sillyspec 残骸候选跳过，命中的恒为真根
 *    （仅残骸在场时不误取，回退 cwd 相对缺省）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { triggerSync, resolveSpecDir } = await import('../src/run/shared.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'snc-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

async function captureOut(fn) {
  const lines = []
  const saved = console.log
  console.log = (...a) => { lines.push(a.map(String).join(' ')) }
  try { return { result: await fn(), lines } } finally { console.log = saved }
}

test('① 未连接告警：首报显眼（含 connect 指引），同日第二次静默', async () => {
  const cwd = fx()
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  // 剥净平台 env（防宿主机 env 误判已连接）
  const savedUrl = process.env.SILLYHUB_PLATFORM_URL
  const savedTok = process.env.SILLYHUB_PLATFORM_TOKEN
  const savedBg = process.env.SILLYSPEC_SYNC_BG
  const savedBgCwd = process.env.SILLYSPEC_BG_SYNC_CWD
  delete process.env.SILLYHUB_PLATFORM_URL
  delete process.env.SILLYHUB_PLATFORM_TOKEN
  delete process.env.SILLYSPEC_SYNC_BG
  delete process.env.SILLYSPEC_BG_SYNC_CWD
  try {
    const r1 = await captureOut(() => triggerSync(cwd, 'snc-chg', {}, { inline: false, completion: true }))
    const warn1 = r1.lines.find((l) => l.includes('未连接平台'))
    assert.ok(warn1, `首报有显眼告警：${r1.lines.join(' | ').slice(0, 200)}`)
    assert.ok(r1.lines.some((l) => l.includes('platform connect')), '含 connect 恢复指引')
    const marker = join(cwd, '.sillyspec', '.runtime', 'platform-not-connected-notice.date')
    assert.equal(readFileSync(marker, 'utf8').trim(), new Date().toISOString().slice(0, 10), '节流 marker 落盘')

    const r2 = await captureOut(() => triggerSync(cwd, 'snc-chg', {}, { inline: false, completion: true }))
    assert.ok(!r2.lines.some((l) => l.includes('未连接平台')), `同日第二次静默：${r2.lines.join(' | ').slice(0, 200)}`)
    // 门控回归：非完成时刻（渲染/诊断类调用点）不告警——字节级输出平价契约的面
    const cwd3 = fx()
    mkdirSync(join(cwd3, '.sillyspec'), { recursive: true })
    const r3 = await captureOut(() => triggerSync(cwd3, 'snc-chg3', {}, { inline: false }))
    assert.ok(!r3.lines.some((l) => l.includes('未连接平台')), '非 completion 调用点不告警' )
  } finally {
    if (savedUrl !== undefined) process.env.SILLYHUB_PLATFORM_URL = savedUrl
    if (savedTok !== undefined) process.env.SILLYHUB_PLATFORM_TOKEN = savedTok
    if (savedBg !== undefined) process.env.SILLYSPEC_SYNC_BG = savedBg
    if (savedBgCwd !== undefined) process.env.SILLYSPEC_BG_SYNC_CWD = savedBgCwd
  }
})

test('② 嵌套回环防护：上溯遇 .runtime/.sillyspec 残骸跳过，命中真根', () => {
  const cwd = fx()
  mkdirSync(join(cwd, '.sillyspec', '.runtime', '.sillyspec', '.runtime'), { recursive: true }) // 残骸回环形态（真根同场）
  const deep = join(cwd, '.sillyspec', '.runtime', 'worktrees', 'chg1')
  mkdirSync(deep, { recursive: true })
  assert.equal(resolveSpecDir(deep), join(cwd, '.sillyspec'), '命中真根而非残骸')

  // 残骸路径形态必内含容器根（<root>/.sillyspec/.runtime/.sillyspec）：容器即合法真根，
  // 期望命中容器、绝不取残骸本体
  const cwd2 = fx()
  mkdirSync(join(cwd2, '.sillyspec', '.runtime', '.sillyspec'), { recursive: true })
  const deep2 = join(cwd2, '.sillyspec', '.runtime')
  const hit2 = resolveSpecDir(deep2)
  assert.equal(hit2, join(cwd2, '.sillyspec'), '命中容器真根')
  assert.notEqual(hit2, join(deep2, '.sillyspec'), '绝不取 .runtime 下残骸')
})

test('③ 常规布局回归：.runtime 层自身的 .sillyspec 判定不影响真根命中', () => {
  const cwd = fx()
  writeFileSync(join(mkdirSync(join(cwd, '.sillyspec'), { recursive: true }), 'local.yaml'), 'project:\n  type: generic\n')
  assert.equal(resolveSpecDir(join(cwd, '.sillyspec', '.runtime')), join(cwd, '.sillyspec'), '.runtime 层起向上命中 <root>/.sillyspec')
  assert.equal(resolveSpecDir(cwd), join(cwd, '.sillyspec'), '根层照常命中')
})
