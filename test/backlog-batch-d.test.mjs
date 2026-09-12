/**
 * backlog 批 D 六项修复回归（ql-20260912-008）。
 *
 * 锁行为：
 *  1. flag 值位守卫（index.js 52 处三元 + 解析器 5 分支）：值位是 flag 名/缺值 → 视为未提供，
 *     不再把 --json 吞成变更名（机器输出丢失）/目录名
 *  2. EXCLUDE-DIRTY 三方合并覆写主仓前备份原文（.sillyspec/.runtime/merge-backups/）
 *  3. chunkPaths argv 分批：批内长度受限、并集保序完整；getBlobHashMap 分批 ls-tree
 *  4. isPointerStale 非法 completedAt（NaN）→ true（损坏指针标 STALE 可见）
 *  5. config-cat home 守卫大小写归一（win32）——小写盘符路径不误命中 ~/.sillyspec
 *  6. git-helper ENOBUFS 文案与 GIT_MAX_BUFFER 对齐（编译期断言，无行为面）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { makeRepo, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { mergeDirtyOverlapThreeWay, chunkPaths } from '../src/worktree-apply.js'
import { isPointerStale } from '../src/constants.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'bin', 'sillyspec.js')

console.log('=== ① flag 值位守卫（CLI 冒烟）===')
{
  const { cwd } = makeRepo('bd-flag-')
  // --change --json：值位是 flag → change 未提供 → 用法错误（旧版：变更不存在: --json 且 --json 被吞）
  const r1 = runCLI(['--dir', cwd, 'gate', 'plan', '--change', '--json'], { cwd })
  assert(r1.status !== 0 && /用法|change/.test(r1.combined) && !/变更不存在: --json/.test(r1.combined),
    `gate --change --json 报用法错而非「变更不存在: --json」（exit ${r1.status}）`)
  // progress show --change --json：--json 不被吞 → 机器 JSON 正常输出
  const r2 = runCLI(['--dir', cwd, 'progress', 'show', '--change', '--json'], { cwd })
  let parsed = null
  try { parsed = JSON.parse(r2.combined.slice(r2.combined.indexOf('{'), r2.combined.lastIndexOf('}') + 1)) } catch {}
  assert(parsed !== null && parsed.schema_version === 1, 'progress show --change --json 仍输出机器 JSON envelope（--json 未被吞）')
  // --dir --json：值位是 flag → 目录未提供 → 可见错误（旧版：目录不存在: --json）
  const r3 = runCLI(['--dir', '--json', 'next'], { cwd })
  assert(r3.status !== 0 && /未知|用法|目录/.test(r3.combined), `--dir --json 可见报错（${r3.combined.slice(0, 50).replace(/\n/g, ' ')}）`)
}

console.log('\n=== ② EXCLUDE-DIRTY 合并前备份 ===')
{
  const proj = mkdtempSync(join(tmpdir(), 'bd-merge-'))
  const git = (a) => execFileSync('git', a, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git(['init', '-q']); git(['config', 'user.email', 't@t.local']); git(['config', 'user.name', 't']); git(['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(proj, 'overlap.txt'), 'l1\nl2\nl3\nl4\nl5\n')
  git(['add', '.']); git(['commit', '-q', '-m', 'init'])
  const baseHash = git(['rev-parse', 'HEAD']).trim()
  // 主仓在途改动与 worktree 侧改动落在不同行（同区域不同改会冲突，非 clean merge）
  writeFileSync(join(proj, 'overlap.txt'), 'main edits l1\nl2\nl3\nl4\nl5\n')
  const wtDir = join(proj, 'wt')
  mkdirSync(wtDir)
  writeFileSync(join(wtDir, 'overlap.txt'), 'l1\nl2\nl3\nl4\nworktree edits l5\n')
  const r = mergeDirtyOverlapThreeWay({ projectRoot: proj, worktreePath: wtDir, baseHash }, ['overlap.txt'])
  assert(r.merged.includes('overlap.txt'), 'clean 三方合并成功')
  const backupDir = join(proj, '.sillyspec', '.runtime', 'merge-backups')
  const backups = existsSync(backupDir) ? (await import('node:fs')).readdirSync(backupDir) : []
  assert(backups.length === 1, `覆写前原文已备份（${backups.join(',')}）`)
  const backupContent = backups.length ? readFileSync(join(backupDir, backups[0]), 'utf8') : ''
  assert(backupContent.includes('main edits l1'), '备份内容是主仓在途原文（合并版覆写前的版本）')
  const mergedContent = readFileSync(join(proj, 'overlap.txt'), 'utf8')
  assert(mergedContent.includes('main edits l1') && mergedContent.includes('worktree edits l5'), '合并版含两侧改动')
  rmSync(proj, { recursive: true, force: true })
}

console.log('\n=== ③ chunkPaths 分批 ===')
{
  const long = Array.from({ length: 300 }, (_, i) => `packages/some-deeply/nested/path/segment-${i}/file-with-a-rather-long-name-${i}.ts`)
  const batches = chunkPaths(long)
  assert(batches.length > 1, `300 长路径切多批（${batches.length} 批）`)
  const flat = batches.flat()
  assert(flat.length === long.length && flat.every((p, i) => p === long[i]), '并集完整且保序')
  const maxLen = Math.max(...batches.map(b => b.join(' ').length))
  assert(maxLen <= 8200, `批内长度受限（最大 ${maxLen} 字符）`)
  assert(chunkPaths(['a']).length === 1 && chunkPaths([]).flat().length === 0, '小输入单批/空输入安全')
}

console.log('\n=== ④ isPointerStale NaN → STALE ===')
{
  assert(isPointerStale({ completedAt: 'not-a-date' }) === true, '非法时间串判 STALE（旧版 NaN 比较恒 false 永不标时）')
  assert(isPointerStale({ completedAt: new Date().toISOString() }) === false, '新鲜指针不 STALE')
  assert(isPointerStale({ completedAt: '2026-09-01T00:00:00.000Z' }) === true, '超 24h 指针 STALE')
  assert(isPointerStale({}) === false, '无 completedAt 不 STALE（语义不变）')
}

console.log('\n=== ⑤ config-cat home 守卫大小写（win32）===')
{
  if (process.platform === 'win32') {
    const { resolveLocalYaml } = await import('../src/config-cat.js')
    const home = homedir()
    // 构造仅大小写不同的 home 子路径（小写盘符）：守卫必须仍识别「home 子树」→ 不命中 home 层配置
    const flipped = home.startsWith('C:') || home.match(/^[A-Z]:/)
      ? home[0].toLowerCase() + home.slice(1)
      : home
    const projDir = join(flipped, 'case-guard-proj-' + Date.now())
    mkdirSync(projDir, { recursive: true })
    const r = resolveLocalYaml(projDir)
    const pickedHome = r && String(r.path || '').replace(/\\/g, '/').endsWith('/.sillyspec/local.yaml')
      && !String(projDir).replace(/\\/g, '/').endsWith('.sillyspec')
    assert(r === null || !pickedHome || String(r.path).startsWith(projDir.replace(/\\/g, '/')) || !r.path,
      `大小写变体路径不越级命中 home 层配置（resolved: ${r ? r.path : 'null'}）`)
    rmSync(projDir, { recursive: true, force: true })
  } else {
    console.log('  ⏭️ 非 win32 跳过（大小写不敏感是 Windows 特性）')
    count.passed++
  }
}

console.log('\n=== ⑥ git-helper ENOBUFS 文案对齐（源断言）===')
{
  const src = readFileSync(join(root, 'src', 'git-helper.js'), 'utf8')
  assert(!/超过 32MB/.test(src) && /GIT_MAX_BUFFER \/ \(1024 \* 1024\)}MB/.test(src),
    'ENOBUFS 提示由 GIT_MAX_BUFFER 推导（不再写死 32MB——实际 256MB）')
}

cleanup()
report(count.passed, count.failed, count.failures)
