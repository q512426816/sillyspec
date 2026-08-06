/**
 * worktree-deps python 分支测试（exec 复盘 3-②：detectProjectType/inferInstallCommand 原无 python 分支）
 *
 * 验证：python 项目（pyproject.toml / requirements.txt）在 worktree 里被识别并供给 uv sync /
 * pip install，而不是误判 generic → n/a（ruff/pre-commit 等二进制不供给的根因）。纯函数单元测，
 * 不执行真实 install（避免 uv 是否安装导致的 flaky）。
 *
 * 设计依据：src/worktree-deps.js detectProjectType / inferInstallCommand。
 */
import { detectProjectType, inferInstallCommand } from '../src/worktree-deps.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let failures = 0
const tmpRoots = []
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const newDir = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}

console.log('\n[worktree-deps] python 分支：detectProjectType + inferInstallCommand')

// Case 1: pyproject.toml → detect=python, install=uv sync
{
  const wt = newDir('rsr-py-proj-')
  writeFileSync(join(wt, 'pyproject.toml'), '[project]\nname = "x"\n')
  assert(detectProjectType(wt, null) === 'python', 'pyproject.toml → python')
  assert(inferInstallCommand('python', wt, null) === 'uv sync', 'pyproject.toml → uv sync')
}

// Case 2: uv.lock + pyproject.toml → uv sync（uv.lock 优先命中第一分支）
{
  const wt = newDir('rsr-py-uv-')
  writeFileSync(join(wt, 'pyproject.toml'), '[project]\nname = "x"\n')
  writeFileSync(join(wt, 'uv.lock'), '')
  assert(inferInstallCommand('python', wt, null) === 'uv sync', 'uv.lock + pyproject → uv sync')
}

// Case 3: 纯 requirements.txt（无 pyproject）→ pip install -r requirements.txt
{
  const wt = newDir('rsr-py-req-')
  writeFileSync(join(wt, 'requirements.txt'), 'ruff\n')
  assert(detectProjectType(wt, null) === 'python', 'requirements.txt → python')
  assert(inferInstallCommand('python', wt, null) === 'pip install -r requirements.txt', '纯 requirements.txt → pip install -r')
}

// Case 4: nodejs 优先级高于 python（monorepo 根同时有 package.json + pyproject 不常见，但保 nodejs 优先不回归）
{
  const wt = newDir('rsr-mixed-')
  writeFileSync(join(wt, 'package.json'), '{}')
  writeFileSync(join(wt, 'pyproject.toml'), '[project]\nname = "x"\n')
  assert(detectProjectType(wt, null) === 'nodejs', 'package.json + pyproject → nodejs（nodejs 优先）')
}

// Case 5: 无任何标记 → generic（不误判）
{
  const wt = newDir('rsr-empty-')
  assert(detectProjectType(wt, null) === 'generic', '空目录 → generic')
  assert(inferInstallCommand('generic', wt, null) === null, 'generic → null install（n/a）')
}

// Case 6: local.yaml commands.install 优先（userInstall 覆盖推断）
{
  const wt = newDir('rsr-userinstall-')
  writeFileSync(join(wt, 'pyproject.toml'), '[project]\nname = "x"\n')
  assert(inferInstallCommand('python', wt, 'poetry install') === 'poetry install', 'userInstall 覆盖推断（poetry install）')
}

// Case 7: local.yaml type: python 优先于文件特征（用户显式声明）
{
  const specBase = newDir('rsr-yaml-')
  const wt = newDir('rsr-yaml-wt-')
  mkdirSync(join(specBase), { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'type: python\n')
  assert(detectProjectType(wt, specBase) === 'python', 'local.yaml type: python → python（优先于文件特征）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${7 - failures}  ❌ 失败: ${failures}`)
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failures > 0) throw new Error(`${failures} test(s) failed`)
