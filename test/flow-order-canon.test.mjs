/**
 * flow-order-canon.test.mjs — 轻量道顺序正典（2026-10-19-thin-order-canon）
 *
 * 实证背景（四路子代理调查）：dogfood 会话普遍先动码、收口批量补文档与批准；根因是
 * 教导面自相矛盾（【你要做的】"直接干活"、"动码前后顺手作答"、命令卡/skill 无批准环节、
 * status 相位不看批准、approve/done 把批准叙述成收口动作）。
 *
 * 验收面：
 *   ① flow start 横幅：【你要做的】为正典顺序句（先答 spec 面 → 批准 → 才动码），
 *      三断点纪律标题含「①未过不动码」顺序语义，无「直接干活：改代码、写测试」；
 *   ② 恢复简报：spec 批准状态行在场；未批准时「下一步」指向补批；
 *   ③ flow status：未批准且非 autopilot 时相位停在 ① spec 待批准；批准/autopilot 进执行段
 *      并标注；--json 增 specApproved/specApprovedChannel（增量，不动既有键）；
 *   ④ 五面措辞：src/flow.js 无「动码前后顺手/写码前后顺手/干活时作答」，done 拦截与
 *      approve 输出含「动码前置」语义；
 *   ⑤ 命令卡与 SKILL.md 生命周期含「补 spec 面 → 批准 → 干活」与 flow approve 环节；
 *   ⑥ 模板/本仓 AGENTS.md/CLAUDE.md 同步 + package.json 版本 ≥ 3.34.0；
 *   ⑦ src/ 与 assets/ 递归无许可后补措辞。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'oc-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
}

/** status 夹具：直写 flow-state（v1 槽双格式沿用 flow-status-json 的构造法），docs 已填齐。 */
function statusFixture({ state }) {
  const cwd = mkdtempSync(join(tmpdir(), 'ocs-'))
  const dir = join(cwd, '.sillyspec', 'changes', '2026-10-19-oc-fx')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), state)
  writeFileSync(join(dir, 'design.md'), [
    '# D', '',
    '<!--AGENT:槽1 -->', '答一', '',
    '<!--AGENT:槽2 -->', '答二', '',
    '<!--AGENT:槽3 -->', '答三', '',
    '<!--AGENT:槽4 -->', '答四', '',
  ].join('\n'))
  writeFileSync(join(dir, 'requirements.md'), [
    '# R', '',
    '<!--AGENT:FR区 -->', '### FR-01: 某需求', '- 场景：x', '',
    '<!--AGENT:测试绑定FR-01 -->', 'test/a.test.mjs「用例」', '',
  ].join('\n'))
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
}

test('① flow start 横幅：【你要做的】正典顺序句 + 断点纪律顺序语义', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', '2026-09-01-oc-1', '--input', '补齐轻量道顺序正典的面\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0)
  const todoIdx = s.stdout.indexOf('【你要做的】')
  assert.ok(todoIdx !== -1, '【你要做的】标记在场（flow-clarity-probe 切点不得破坏）')
  const todoSeg = s.stdout.slice(todoIdx, todoIdx + 400)
  assert.ok(todoSeg.includes('先答 spec 面'), '首义=先答 spec 面')
  assert.ok(todoSeg.includes('flow approve') || todoSeg.includes('批准'), '含批准环节')
  assert.ok(todoSeg.includes('才动码') || todoSeg.includes('才干活'), '动码后置')
  assert.ok(!s.stdout.includes('直接干活：改代码、写测试'), '旧首行动指令退役')
  assert.match(s.stdout, /三断点纪律（顺序纪律：①未过不动码/, '断点纪律标题=顺序语义')
  assert.ok(!s.stdout.includes('动码前后顺手'), '横幅无顺手作答措辞')
  rmSync(cwd, { recursive: true, force: true })
})

test('② 恢复简报：spec 批准状态行在场，未批准时下一步指向补批', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-oc-2', '--input', '补齐轻量道顺序正典的面\n成功标准：\n- 行为 X'])
  const r = cli(['flow', 'start', '--change', '2026-09-01-oc-2'])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /spec 批准/, '批准状态行在场')
  assert.match(r.stdout, /未批准/, '未批准状态如实显示')
  const nextLine = r.stdout.split(/\r?\n/).find((l) => l.includes('下一步'))
  assert.ok(nextLine && nextLine.includes('flow approve'), `下一步指向补批，实际：${nextLine}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('③ flow status：未批准停在 ① spec 待批准；批准/autopilot 进执行段并标注', () => {
  // 未批准（docs 已填齐）：相位停在 ① spec 并提示待批准
  const a = statusFixture({ state: 'tier: thin\nsubsteps: {}\n' })
  const sa = a.cli(['flow', 'status', '--change', '2026-10-19-oc-fx'])
  assert.equal(sa.status, 0)
  assert.match(sa.stdout, /待用户批准/, '未批准→相位停在待批准')
  assert.ok(!/② 执行（(?!autopilot)/.test(sa.stdout), '未批准不得进普通执行段')
  const ja = JSON.parse(a.cli(['flow', 'status', '--change', '2026-10-19-oc-fx', '--json']).stdout)
  assert.equal(ja.specApproved, false)
  assert.equal(ja.specApprovedChannel, null)
  assert.ok(typeof ja.designFilled === 'boolean', '既有键不回归（designFilled）')
  rmSync(a.cwd, { recursive: true, force: true })

  // 已批准（user-confirmed）：进执行段并标注
  const b = statusFixture({ state: 'tier: thin\nsubsteps: {}\nspec_approved: true\nspec_approved_by: u\nspec_approved_channel: user-confirmed\n' })
  const sb = b.cli(['flow', 'status', '--change', '2026-10-19-oc-fx'])
  assert.match(sb.stdout, /② 执行（已批准/, '已批准→执行段标注')
  const jb = JSON.parse(b.cli(['flow', 'status', '--change', '2026-10-19-oc-fx', '--json']).stdout)
  assert.equal(jb.specApproved, true)
  assert.equal(jb.specApprovedChannel, 'user-confirmed')
  rmSync(b.cwd, { recursive: true, force: true })

  // autopilot：进执行段带豁免标注
  const c = statusFixture({ state: 'tier: thin\nsubsteps: {}\nautopilot: true\n' })
  const sc = c.cli(['flow', 'status', '--change', '2026-10-19-oc-fx'])
  assert.match(sc.stdout, /autopilot 豁免/, 'autopilot→豁免标注')
  rmSync(c.cwd, { recursive: true, force: true })
})

test('④ 五面措辞（源码文本级）：顺手措辞清零 + 动码前置语义在场', () => {
  const src = read('src/flow.js')
  assert.ok(!src.includes('动码前后顺手'), '无「动码前后顺手」')
  assert.ok(!src.includes('写码前后顺手'), '无「写码前后顺手」')
  assert.ok(!src.includes('干活时作答'), '无「干活时作答」')
  assert.ok(src.includes('批准是动码前置'), 'done 拦截/approve 输出含动码前置语义')
  assert.ok(src.includes('若尚未动码'), 'approve 输出区分批前/批后动码')
  assert.ok(src.includes('写码前作答'), 'adopt 收编横幅绑定槽=动码前作答')
})

test('⑤ 命令卡与 SKILL.md：生命周期含补 spec 面 → 批准 → 干活', () => {
  const card = read('assets/command-cards/flow.md')
  assert.ok(card.includes('补 spec 面'), '命令卡含补 spec 面环节')
  assert.ok(card.includes('flow approve'), '命令卡含 approve 环节')
  assert.ok(card.includes('批准'), '命令卡含批准环节')
  assert.ok(card.includes('按层适用'), '按层适用限定保留（tdd-scope-guidance 锚）')
  assert.ok(!card.includes('# ② 直接干活'), '步骤②不再是直接干活')

  const skill = read('.claude/skills/sillyspec-flow/SKILL.md')
  assert.ok(skill.includes('补 spec 面'), 'skill 含补 spec 面环节')
  assert.ok(skill.includes('flow approve'), 'skill 含 approve 环节')
  assert.ok(skill.includes('动码前'), 'design 四节期限=动码前')
  assert.ok(!skill.includes('直接干活（改代码写测试）'), 'description 不再以直接干活概括第②步')
})

test('⑥ 模板与本仓指令文件同步 + 版本提升', () => {
  const tpl = read('templates/agents-instruction.md')
  assert.ok(tpl.includes('补 spec 面'), '模板选道行含补 spec 面')
  assert.ok(tpl.includes('批准先于动码') || tpl.includes('批准（flow approve'), '模板规则含批准先于动码语义')
  assert.ok(!tpl.includes('flow start → 直接干活 → flow done'), '旧简写链退役')
  for (const f of ['AGENTS.md', 'CLAUDE.md']) {
    const t = read(f)
    assert.ok(t.includes('补 spec 面'), `${f} 轻量道行同步`)
  }
  const v = read('package.json')
  const m = v.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/)
  assert.ok(m, 'version 可解析')
  const [maj, min] = [Number(m[1]), Number(m[2])]
  assert.ok(maj > 3 || (maj === 3 && min >= 34), `版本 ≥ 3.34.0（实际 ${m[1]}.${m[2]}.${m[3]}）——消费仓重跑 init 才能取到新资产`)
})

test('⑦ src/ 与 assets/ 递归无许可后补措辞', () => {
  const bad = [/动码前后顺手/, /写码前后顺手/, /干活时作答/]
  const hits = []
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === '.git' || e === 'changes') continue
      const p = join(d, e)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else if (/\.(js|mjs|cjs|md)$/.test(e)) {
        const t = readFileSync(p, 'utf8')
        for (const re of bad) if (re.test(t)) hits.push(`${p} 命中 ${re}`)
      }
    }
  }
  walk(join(ROOT, 'src'))
  walk(join(ROOT, 'assets'))
  assert.deepEqual(hits, [], `许可后补措辞清零：${hits.join('；')}`)
})
