/**
 * 2026-10-05-disposition-refreeze-drift 回归：处置重入审计时点漂移检测
 *
 * 背景（主清单 P1，两例实证）：评审发现处置涉及代码修改后重跑 flow done，patch 子步幂等
 * 跳过让 change.patch/review.json 停在处置前时点——2026-10-05-review-promise-negation 处置
 * 提交 905397ef（冻结 patch 查 RISK_ADMITTING_RE 零命中）；2026-10-05-flowdone-lintfail-output
 * 收编复现（评审 P1 处置提交后不带 --refreeze 重跑，归档件缺处置面）。
 *
 * 锁定：
 *   ① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧后缀不触发 / 裸提交不触发
 *   ② e2e 处置重入链路：漂移警告 + 自动重冻结（patch 含处置提交）+ review.json 隔离
 *      （.superseded）+ 重评任务书再现（exit 1 @ review）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { detectPatchDrift } = await import('../src/flow-parity.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'drift-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const CHG = '2026-10-05-drift-x'

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

test('① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧与裸提交不触发', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  // 他侧后缀提交（不触发）
  writeFileSync(join(d, 'foreign.txt'), 'f\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 他侧交付 (2026-10-05-other-change)'])
  // 裸提交（不触发——保守不动作）
  writeFileSync(join(d, 'bare.txt'), 'b\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'chore: 无后缀裸提交'])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, false, `他侧+裸提交不触发（ownCommits=${JSON.stringify(r.ownCommits)}）`)
  // 本变更后缀提交（触发）
  writeFileSync(join(d, 'own.txt'), 'o\n')
  run(['add', '.']); run(['commit', '-q', '-m', `fix: 处置提交 (${CHG}) (task-05)`])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, '本变更后缀提交触发漂移')
  assert.equal(r.ownCommits.length, 1, '只计本变更后缀提交（他侧/裸不计入）')
  assert.match(r.ownCommits[0], /处置提交/)
  // 冻结锚 == HEAD（无新提交）不触发
  const nowHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  assert.equal(detectPatchDrift({ cwd: d, change: CHG, freezeHead: nowHead }).drifted, false, '锚==HEAD 不触发')
  // 锚缺失（旧冻结件无 head 字段）不触发
  assert.equal(detectPatchDrift({ cwd: d, change: CHG, freezeHead: null }).drifted, false, '无锚不触发（旧件兼容）')
})

test('② e2e：处置重入——漂移警告 + 自动重冻结 + review.json 隔离 + 重评任务书再现', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-05-drift-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '漂移检测 e2e\n\n成功标准：\n- 处置重入后审计件含处置面'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  // v2 纯 markdown 填法：design 四问作实质作答（触发评审定档）+ FR 正文成形
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：漂移检测链路验证，存在时序窗口（冻结与处置提交之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在处置重入时重冻结审计件（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「② e2e 处置重入」'))
  // 设计清单声明交付文件（免夹带嫌疑 advisory 噪声干扰）
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n| 修改 | src/work2.js | 处置交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 首轮 done：gate 过 → patch 冻结 → 评审任务书（exit 1）
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(existsSync(join(base, 'change-patch.json')), '首轮已冻结 patch')
  const patch1 = readFileSync(join(base, 'change.patch'), 'utf8')
  assert.ok(patch1.includes('+++ b/src/work.js') && !patch1.includes('+++ b/src/work2.js'), '首轮冻结面不含处置文件（按 diff hunk 头判——design 清单字样不算）')
  // 模拟评审 FAIL（P1 发现）——flow done 消费后拦截在 review（不归档，等待处置）
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'FAIL', findings: [{ severity: 'P1', title: '夹具发现', evidence: 'e2e', location: 'src/work.js:1' }], dimensionNotes: { 乱序: 'finding', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(out3.includes('独立评审未过'), `第二轮应拦截在评审 FAIL（尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(s3.status !== 0, 'FAIL 拦截 exit≠0')
  // 处置提交（冻结后新交付）
  writeFileSync(join(cwd, 'src', 'work2.js'), 'export const b = 2\n')
  run(['add', 'src/work2.js']); run(['commit', '-q', '-m', `fix: 评审处置 (${cn}) (task-02)`])
  // 第三轮 done：漂移检测应触发——重冻结 + 隔离 FAIL review.json + 重评任务书再现
  const s4 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out4 = s4.stdout + s4.stderr
  assert.ok(out4.includes('审计时点漂移'), `漂移警告在场（尾部：${out4.split('\n').slice(-6).join(' | ')}）`)
  const quarantined = readdirSync(base).find((f) => f.startsWith('review.json.superseded'))
  assert.ok(!!quarantined, `旧 review.json 已隔离（时间戳槽位；目录实况：${readdirSync(base).join(',')}）`)
  assert.ok(!existsSync(join(base, 'review.json')), '隔离后 review.json 不在场（重评入口开）')
  const patch2 = readFileSync(join(base, 'change.patch'), 'utf8')
  assert.ok(patch2.includes('+++ b/src/work2.js'), '重冻结面含处置提交（按 diff hunk 头判）')
  assert.ok(s4.status !== 0, '重评任务书再现（exit 1 @ review）')
  assert.ok(out4.includes('独立评审任务书'), '重评任务书在场')
})
