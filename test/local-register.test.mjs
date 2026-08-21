/**
 * local register-repo 测试（2026-08-21 agent-手工产出审计项④）
 *
 * 验证：
 * 1. registerRepoInLocalYaml 外科手术式写入：新文件建段 / 既有文件追加段（注释与
 *    凭据段逐行保留）/ 段内插入 / 同 key 改值 / 幂等；key 校验（main / 非法字符）。
 * 2. 写入产物与读侧 parseRepoRegistry（plan-postcheck.js）成对可读。
 * 3. CLI 集成：sillyspec local register-repo <key> <path>（git 仓校验 / 路径不存在报错）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { registerRepoInLocalYaml } from '../src/local-register.js'
import { parseRepoRegistry } from '../src/stages/plan-postcheck.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

console.log('--- 1. 新文件：建段 ---')
{
  const dir = makeTmpDir('lr-')
  const p = join(dir, '.sillyspec', 'local.yaml')
  const r = registerRepoInLocalYaml(p, 'shared-lib', 'C:/x/shared-lib')
  assert(r.fileCreated === true && r.sectionCreated === true, '返回 fileCreated+sectionCreated')
  const text = readFileSync(p, 'utf8')
  assert(text.includes('repos:\n  shared-lib: C:/x/shared-lib\n'), '内容含 repos 段与条目（posix 路径）')
  assert(parseRepoRegistry(text).get('shared-lib') === 'C:/x/shared-lib', 'parseRepoRegistry 读回一致')
}

console.log('--- 2. 既有文件追加段：注释/凭据段逐行保留 ---')
{
  const dir = makeTmpDir('lr-')
  const p = join(dir, 'local.yaml')
  const before = [
    '# SillySpec 本地配置（gitignored）',
    'mcp:',
    '  url: "http://127.0.0.1:8001"',
    '  token: "shmcp_secret"',
    '',
    'commands:',
    '  test: "npm test"',
    '',
  ].join('\n')
  writeFileSync(p, before)
  const r = registerRepoInLocalYaml(p, 'tool-repo', 'C:/x/tool-repo')
  assert(r.fileCreated === false && r.sectionCreated === true, '返回 sectionCreated')
  const after = readFileSync(p, 'utf8')
  for (const keep of ['# SillySpec 本地配置（gitignored）', 'mcp:', '  token: "shmcp_secret"', '  test: "npm test"']) {
    assert(after.includes(keep), `原内容逐行保留：${keep.slice(0, 20)}…`)
  }
  assert(/commands:\n[\s\S]*\nrepos:\n  tool-repo: C:\/x\/tool-repo\n$/.test(after), 'repos 段追加在文件尾')
  assert(parseRepoRegistry(after).get('tool-repo') === 'C:/x/tool-repo', '读回一致')
}

console.log('--- 3. 段内插入 / 同 key 改值 / 幂等 ---')
{
  const dir = makeTmpDir('lr-')
  const p = join(dir, 'local.yaml')
  writeFileSync(p, ['repos:', '  shared-lib: C:/old/shared-lib', '  # main 不用注册（隐式 = cwd）', '', 'commands:', '  test: "npm test"', ''].join('\n'))

  const rIns = registerRepoInLocalYaml(p, 'tool-repo', 'C:/x/tool-repo')
  assert(rIns.replaced === false && rIns.sectionCreated === false, '段内插入返回值')
  let text = readFileSync(p, 'utf8')
  assert(text.indexOf('  shared-lib: C:/old/shared-lib') < text.indexOf('  tool-repo: C:/x/tool-repo')
    && text.indexOf('  tool-repo:') < text.indexOf('commands:'), '新条目插在段内（旧条目后、下一顶层 key 前）')
  assert(text.includes('  # main 不用注册（隐式 = cwd）'), '段内注释保留')
  assert(parseRepoRegistry(text).size === 2, '读回 2 个 key')

  const rRep = registerRepoInLocalYaml(p, 'shared-lib', 'C:/new/shared-lib')
  assert(rRep.replaced === true, '同 key 改值返回 replaced')
  text = readFileSync(p, 'utf8')
  assert(text.includes('  shared-lib: C:/new/shared-lib') && !text.includes('C:/old'), '旧值被替换')
  assert(parseRepoRegistry(text).get('shared-lib') === 'C:/new/shared-lib', '改值后读回一致')

  const textBefore = readFileSync(p, 'utf8')
  const rIdem = registerRepoInLocalYaml(p, 'shared-lib', 'C:/new/shared-lib')
  assert(rIdem.replaced === false, '同值幂等跳过')
  assert(readFileSync(p, 'utf8') === textBefore, '幂等时不改文件内容')
}

console.log('--- 4. key 校验 ---')
{
  const dir = makeTmpDir('lr-')
  const p = join(dir, 'local.yaml')
  let threw = 0
  try { registerRepoInLocalYaml(p, 'main', 'C:/x') } catch { threw++ }
  assert(threw === 1, "key='main' 拒绝（隐式不用注册）")
  threw = 0
  try { registerRepoInLocalYaml(p, 'bad key!', 'C:/x') } catch { threw++ }
  assert(threw === 1, '非法字符 key 拒绝')
}

console.log('--- 5. CLI 集成 ---')
function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}
{
  const proj = makeTmpDir('lr-cli-')
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  git(proj, ['init', '-q'])
  const libRepo = makeTmpDir('lr-lib-')
  git(libRepo, ['init', '-q'])

  const r = runCLI(['local', 'register-repo', 'shared-lib', libRepo], proj)
  assert(r.status === 0, `注册 git 仓 exit 0（实际 ${r.status}；${r.combined.slice(0, 200)}）`)
  const yamlText = readFileSync(join(proj, '.sillyspec', 'local.yaml'), 'utf8')
  const reg = parseRepoRegistry(yamlText)
  assert(reg.get('shared-lib') === libRepo.replace(/\\/g, '/'), 'CLI 写入可被 parseRepoRegistry 读回（posix）')

  const rAgain = runCLI(['local', 'register-repo', 'shared-lib', libRepo], proj)
  assert(rAgain.status === 0 && rAgain.combined.includes('已注册'), '幂等重跑 exit 0')

  const notGit = makeTmpDir('lr-notgit-')
  const rNotGit = runCLI(['local', 'register-repo', 'bad', notGit], proj)
  assert(rNotGit.status === 1 && rNotGit.combined.includes('不是 git 仓库'), '非 git 仓路径 exit 1')

  const rMissing = runCLI(['local', 'register-repo', 'bad', 'C:/definitely/not/here'], proj)
  assert(rMissing.status === 1 && rMissing.combined.includes('路径不存在'), '路径不存在 exit 1')

  const rUsage = runCLI(['local', 'register-repo'], proj)
  assert(rUsage.status === 2 && rUsage.combined.includes('用法'), '缺参数打印用法 exit 2')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
