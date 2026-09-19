// QUICKLOG「结果」虚报提交核对（docs/sillyspec/quicklog-result-false-commit-claim，2026-09-18 实证）
//
// ql 条目写「已提交 <hash> 推送 origin」但 git show 核查该提交不含本会话任何文件——
// 代码滞留暂存区 11 小时，台账账实不符。修复：quick 末步 --done 的结果文本声称提交
//（40 位 hex / 短 hash 紧跟「已提交/已推送」）且会话声明文件无一命中提交面 → advisory
// 警告（不阻断，组合提交等正常形态可照常落账，警告留痕即审计面）。
//
// CLI e2e（真 git 仓三步推进 + 对照组）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const cliBin = join(fileURLToPath(import.meta.url).replace(/[\\/][^\\/]+$/, ''), '..', 'src', 'index.js')
const tmpRoots = []
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), `fclaim-${process.pid}-`))
  // 夹具防劫持（Temp 树残留 .sillyspec 会被祖先级解析命中劫持 spec 落点——quick-cancel
  // 同款教训）：显式前置自建 .sillyspec
  mkdirSync(join(dir, '.sillyspec'), { recursive: true })
  tmpRoots.push(dir)
  return dir
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], {
  encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim()

function quickFlow(dir, resultText) {
  const start = spawnSync(process.execPath, [cliBin, 'run', 'quick', '--non-interactive', '--input', 'x', '--files', 'main.js'],
    { cwd: dir, encoding: 'utf-8', timeout: 60_000 })
  const sid = ((start.stdout || '') + (start.stderr || '')).match(/quick-[0-9a-f]{8}/)?.[0]
  assert.ok(sid, `会话已建立（status=${start.status}；输出头 ${((start.stdout || '') + (start.stderr || '')).slice(0, 300)}）`)
  const run = (args) => spawnSync(process.execPath, [cliBin, ...args], { cwd: dir, encoding: 'utf-8', timeout: 120_000 })
  run(['run', 'quick', '--done', '--change', sid, '--output', 's1'])
  run(['run', 'quick', '--done', '--change', sid, '--output', 's2'])
  const done = run(['run', 'quick', '--done', '--change', sid, '--req', 't', '--cause', 'c', '--solution', 's', '--result', resultText])
  return { sid, done, out: (done.stdout || '') + (done.stderr || '') }
}

test('① 虚报形态：hash 提交面不含会话文件 → 警告 + 不阻断落账', () => {
  const dir = makeRepo()
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 't@t']); git(dir, ['config', 'user.name', 't']); git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(dir, 'main.js'), 'console.log(1)\n')
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'init'])
  // 无关提交（不含 main.js）
  writeFileSync(join(dir, 'other.js'), 'export {}\n')
  git(dir, ['add', 'other.js']); git(dir, ['commit', '-q', '-m', 'other'])
  const fakeHash = git(dir, ['rev-parse', 'HEAD'])

  const { done, out } = quickFlow(dir, `6 用例绿；已提交 ${fakeHash} 推送 origin`)
  assert.equal(done.status, 0, `advisory 不阻断（实际 ${done.status}；尾 ${out.slice(-300)}）`)
  assert.ok(out.includes('均不在该提交面内'), '虚报警告出现（指向 git show 复核）')
  assert.ok(out.includes('已提交 ' + String(fakeHash).slice(0, 12).slice(0, 7)) || out.includes(String(fakeHash).slice(0, 7)), '警告点名可疑 hash')
})

test('② 对照：提交面确含会话文件 → 无警告', () => {
  const dir = makeRepo()
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 't@t']); git(dir, ['config', 'user.name', 't']); git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(dir, 'main.js'), 'console.log(1)\n')
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'init'])
  const realHash = git(dir, ['rev-parse', 'HEAD'])

  const { done, out } = quickFlow(dir, `全绿；已提交 ${realHash}`)
  assert.equal(done.status, 0, '正常完成')
  assert.ok(!out.includes('均不在该提交面内'), '真命中不警告')
})

test('③ 结果不含 hash 声称 → 零介入（行为不变）', () => {
  const dir = makeRepo()
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 't@t']); git(dir, ['config', 'user.name', 't']); git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(dir, 'main.js'), 'console.log(1)\n')
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'init'])

  const { done, out } = quickFlow(dir, '3 用例绿，ruff 0（未提及提交）')
  assert.equal(done.status, 0, '正常完成')
  assert.ok(!out.includes('均不在该提交面内') && !out.includes('无法解析'), '无 hash 声称零介入')
})
