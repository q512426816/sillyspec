// 流程命令卡注入器测试（2026-09-21-flow-command-cards task-01）
// 三态四分支逐态断言 + 双落点 + 资产齐全 + 四段契约内容锚（FR-01~04）
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { injectCommandCards, readCardAssets, COMMAND_CARD_TARGETS, COMMAND_CARD_NAMES } from '../src/command-cards.js'

let failed = 0, total = 0
const t = (cond, msg) => { total++; if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else console.log(`  ✅ PASS: ${msg}`) }
const tmpRoots = []
const mk = (p) => { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
const anchorRe = /<!-- sillyspec-card: v(\S+) sha256=([0-9a-f]{64}) -->$/

// ── 1. 资产齐全（发布白屏本地防线）──
const assets = readCardAssets()
t(assets.size === 7, `包内卡资产 7 张（实得 ${assets.size}）`)
for (const n of COMMAND_CARD_NAMES) t(assets.has(n), `资产在列：${n}.md`)

// ── 2. 四段契约内容锚（FR-04）──
for (const [name, body] of assets) {
  const stage = name.replace('run-', '')
  t(body.includes('# 何时用') && body.includes('# 生命周期速查') && body.includes('# 防坑清单') && body.includes('# 边界声明'), `${name} 四段契约齐`)
  t(body.includes(`sillyspec run ${stage}`) || name === 'status' ? true : false, `${name} 生命周期含命令`)
}
// run-quick 卡防坑清单锚定 954946ae 修复后语义（P2-5 验收）
const quick = assets.get('run-quick')
t(quick.includes('--linked-changes') && quick.includes('有效'), 'run-quick 卡含 --linked-changes 有效语义（954946ae 后）')
t(quick.includes('--req') && quick.includes('--cause') && quick.includes('--solution') && quick.includes('--result'), 'run-quick 卡含四参数 --done')

// ── 3. 注入产生双落点 7 卡（FR-01/03）──
const proj = mk('cc-')
const r1 = await injectCommandCards(proj, { tools: ['zcode', 'claude'], version: '9.9.9' })
t(r1.written.length === 14 && r1.warnings.length === 0, `首轮全写（7×2，实得 ${r1.written.length}；警告 ${r1.warnings.length}）`)
t(existsSync(join(proj, COMMAND_CARD_TARGETS.zcode, 'run-quick.md')), 'zcode 落点在')
t(existsSync(join(proj, COMMAND_CARD_TARGETS.claude, 'status.md')), 'claude 落点在')
const landed = readFileSync(join(proj, COMMAND_CARD_TARGETS.zcode, 'run-quick.md'), 'utf8')
t(anchorRe.test(landed.replace(/\n$/, '')) && landed.includes('v9.9.9'), '锚行含版本与 sha')

// ── 4. 同参重跑 no-op（mtime 不动，FR-02 分支 2a）──
const f1 = join(proj, COMMAND_CARD_TARGETS.zcode, 'run-quick.md')
const before = readFileSync(f1).toString()
const stat = statSync(f1)
await new Promise((r) => setTimeout(r, 1100))
const r2 = await injectCommandCards(proj, { tools: ['zcode'], version: '9.9.9' })
t(r2.written.length === 0 && r2.updated.length === 0 && r2.skipped.length === 7, `同参重跑 no-op（skipped=${r2.skipped.length}）`)
t(r2.warnings.length === 0, `no-op 零警告（完好文件勿误判手改——实得 ${JSON.stringify(r2.warnings)}）`)
t(statSync(f1).mtimeMs === stat.mtimeMs, 'mtime 不动')
t(readFileSync(f1).toString() === before, '内容零变化')

// ── 5. 内容更新覆盖（分支 2b：完好但内容旧——纯版本号变内容同应 no-op，先钉语义）──
const r3a = await injectCommandCards(proj, { tools: ['zcode'], version: '9.9.10' })
t(r3a.updated.length === 0 && r3a.skipped.length === 7, '纯版本变内容同 → no-op（内容 sha 才是判据）')
const curLanded = readFileSync(f1, 'utf8')
const curBody = curLanded.slice(0, curLanded.match(/<!-- sillyspec-card/).index)
const oldBody = curBody.replace('# 何时用', '# 何时用（旧版内容）')
const { createHash } = await import('crypto')
const oldSha = createHash('sha256').update(oldBody, 'utf8').digest('hex')
writeFileSync(f1, `${oldBody}<!-- sillyspec-card: v9.9.9 sha256=${oldSha} -->
`, 'utf8')
const r3 = await injectCommandCards(proj, { tools: ['zcode'], version: '9.9.10' })
t(r3.updated.length === 1 && r3.updated.includes('run-quick') && r3.skipped.length === 6, `内容更新覆盖（仅旧内容那张：updated=${JSON.stringify(r3.updated)} skipped=${r3.skipped.length}）`)
t(readFileSync(f1, 'utf8').includes('v9.9.10') && !readFileSync(f1, 'utf8').includes('旧版内容'), '覆盖后为新内容+新锚')

// ── 6. 手改正文 → 跳过；force → 覆盖（分支 3）──
writeFileSync(f1, readFileSync(f1, 'utf8').replace('# 何时用', '# 何时用（用户手改）'), 'utf8')
const r4 = await injectCommandCards(proj, { tools: ['zcode'], version: '9.9.11' })
t(r4.updated.length === 0 && r4.skipped.includes('run-quick') && r4.warnings.some((w) => w.includes('手改')), '手改正文被跳过并 warn')
const r5 = await injectCommandCards(proj, { tools: ['zcode'], version: '9.9.11', force: true })
t(r5.updated.includes('run-quick'), 'force 覆盖手改文件')
t(!readFileSync(f1, 'utf8').includes('用户手改'), '手改内容已被覆盖')

// ── 7. 外来同名无锚行 → 跳过（分支 3'）──
const fExt = join(proj, COMMAND_CARD_TARGETS.claude, 'status.md')
writeFileSync(fExt, '# 我自己的 status 卡，别动\n', 'utf8')
const r6 = await injectCommandCards(proj, { tools: ['claude'], version: '9.9.12' })
t(r6.skipped.includes('status') && r6.warnings.some((w) => w.includes('外来')), '外来同名跳过并 warn')
t(readFileSync(fExt, 'utf8').startsWith('# 我自己的'), '外来文件原样保留')

// ── 8. 未知工具零动作（FR-06 侧）──
const r7 = await injectCommandCards(proj, { tools: ['codex'], version: '1' })
t(r7.written.length === 0 && r7.updated.length === 0, 'codex 等未映射工具零落点')

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
