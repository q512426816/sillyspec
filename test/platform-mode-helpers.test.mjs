/**
 * platform-mode-helpers.test.mjs — isSelfReferentialSpecRoot / isPlatformMode 单测
 * （变更 2026-08-23-repo-native-spec-backfill task-02，design.md Phase 2 接口定义）。
 *
 * 自指语义：daemon repo-native 工作区的 --spec-root 入参（缓存目录）经 junction/symlink
 * 指回源项目 <cwd>/.sillyspec——realpath 双方相等即自指回环，CLI 按本地模式处理
 * （内置 sync / auto-pull 不跳过）。junction（win32 免特权）与 dir symlink（POSIX）
 * 均被 fs.realpathSync 原生穿透，跨平台同语义。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isSelfReferentialSpecRoot, isPlatformMode } from '../src/run/shared.js'

const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir'

const tmp = mkdtempSync(join(tmpdir(), 'sillyspec-selfref-'))
try {
  // fixture：<tmp>/proj/.sillyspec 真目录（repo-native 源项目真理源）+
  // <tmp>/cache-ws 链接指回它（daemon 缓存 junction 回环形态）
  const projRoot = join(tmp, 'proj')
  const localSpec = join(projRoot, '.sillyspec')
  mkdirSync(localSpec, { recursive: true })
  const cacheWs = join(tmp, 'cache-ws')
  symlinkSync(localSpec, cacheWs, LINK_TYPE)
  // 真外部目录（platform-managed 场景：daemon 全量缓存，与项目 .sillyspec 不同物理目录）
  const external = join(tmp, 'external-spec')
  mkdirSync(external, { recursive: true })
  // 无 .sillyspec 的项目根
  const bareRoot = join(tmp, 'bare-proj')
  mkdirSync(bareRoot, { recursive: true })

  // ── isSelfReferentialSpecRoot ──
  // 自指 true：链接缓存路径 realpath 解析回 proj/.sillyspec
  assert.equal(isSelfReferentialSpecRoot(projRoot, cacheWs), true,
    'symlink/junction 回环 specRoot → true')
  // 直接传本地路径本身（非链接）也自指——realpath 相等即真
  assert.equal(isSelfReferentialSpecRoot(projRoot, localSpec), true,
    'specRoot 直接传本地 .sillyspec 路径 → true')

  // 非自指 false 四例
  assert.equal(isSelfReferentialSpecRoot(projRoot, external), false,
    '真外部目录 → false')
  assert.equal(isSelfReferentialSpecRoot(bareRoot, external), false,
    'cwd/.sillyspec 不存在 → false（realpath 抛错按外部目录处理）')
  assert.equal(isSelfReferentialSpecRoot(projRoot, null), false,
    'specRoot null → false')
  assert.equal(isSelfReferentialSpecRoot(projRoot, undefined), false,
    'specRoot undefined → false')
  assert.equal(isSelfReferentialSpecRoot(projRoot, join(tmp, 'no-such-dir')), false,
    'specRoot 指向不存在的路径 → false')

  // ── isPlatformMode 四象限 ──
  // ① 无平台参数 → 本地模式
  assert.equal(isPlatformMode(undefined, projRoot), false,
    '象限① 无平台参数（undefined）→ false')
  assert.equal(isPlatformMode({}, projRoot), false,
    '象限① 空平台参数 → false')
  // ② 平台参数 + 非自指 → 平台模式
  assert.equal(isPlatformMode({ specRoot: external }, projRoot), true,
    '象限② specRoot 非自指 → true')
  assert.equal(isPlatformMode({ specRoot: external, runtimeRoot: join(external, '.runtime') }, projRoot), true,
    '象限② 全套平台参数 + 非自指 → true')
  // ③ 平台参数 + 自指 → 本地模式（repo-native 断链修复核心）
  assert.equal(isPlatformMode({ specRoot: cacheWs }, projRoot), false,
    '象限③ specRoot 自指回环 → false（内置 sync/auto-pull 按本地语义）')
  assert.equal(isPlatformMode({ specRoot: cacheWs, runtimeRoot: join(cacheWs, '.runtime') }, projRoot), false,
    '象限③ 全套平台参数（runtimeRoot 落在自指 specRoot 内）→ false')
  // ④ 仅 runtimeRoot（无 specRoot）→ 平台模式（自指检查以 specRoot 为准，runtimeRoot-only 不触发豁免）
  assert.equal(isPlatformMode({ runtimeRoot: join(external, '.runtime') }, projRoot), true,
    '象限④ 仅 runtimeRoot → true')

  console.log('✅ isSelfReferentialSpecRoot / isPlatformMode: 自指回环 + 平台模式四象限 passed')
} finally {
  rmSync(tmp, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
}
