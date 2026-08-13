/**
 * git-helper 注入与空格回归测试（task-05 / FR-07）
 *
 * 被测对象：src/git-helper.js 的 safeGit / git / gitQuiet —— 统一公共 git 调用入口，
 * 全部 execFileSync 数组形式（永不经 shell），带 -c safe.directory + -C cwd 前缀。
 *
 * 4 类用例：
 * 1. 含空格文件名不拆词（数组形式 argv 单元素传递，shell 拆词回归锚点）
 * 2. 命令替换元字符无副作用（用 marker 副作用文件证明永不经 shell —— design R5）
 * 3. safeGit / git / gitQuiet 三者 trim / 抛错 / 静默语义回归
 * 4. grep 反向断言（src/ 不再残留字符串拼接 git 调用模板串 —— design R1）
 *
 * 依据：.sillyspec/changes/2026-08-09-worktree-git-injection/design.md「测试方案」+ tasks/task-05.md
 * 模式：node:assert strict，失败抛 AssertionError 致非零 exit，run-tests.mjs runner 按退出码判通过。
 * 自包含：所有临时 git 仓库用 os.tmpdir()+fs.mkdtemp 隔离构造，try/finally 清理（Windows rm recursive force）。
 */

import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeGit, git, gitQuiet } from '../src/git-helper.js'

const worktreeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(worktreeRoot, 'src')

let passed = 0
/**
 * 临时 git 仓库工厂：mkdtemp 建隔离目录 + 原生 execFileSync 数组形式 git init。
 * setup 故意独立于被测 SUT（不走 git-helper），避免循环依赖——helper 若坏，setup 不受影响。
 */
function makeTempRepo(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  execFileSync(
    'git',
    ['-c', `safe.directory=${dir}`, '-C', dir, 'init', '--quiet'],
    { encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] }
  )
  return dir
}
function cleanup(p) {
  try { fs.rmSync(p, { recursive: true, force: true }) } catch { /* 最佳努力清理 */ }
}

console.log('git-helper 注入与空格回归测试')

// ---------------------------------------------------------------------------
// 用例 1：含空格文件名不拆词（数组形式核心保证）
// 思路：含空格文件名经 git(cwd,['add',filename]) 数组调用，若误用 shell 字符串形式，
// 'my file with spaces.txt' 会被 shell 切成 4 个 argv → git add 报 pathspec 不匹配抛错，
// 或加入错误的多个文件。数组形式下文件名作为单个 argv 元素，git add 命中唯一文件，
// ls-files 恰好列出该完整文件名（含空格、且仅 1 个）。
// ---------------------------------------------------------------------------
{
  const dir = makeTempRepo('gh-spaces-')
  try {
    const filename = 'my file with spaces.txt'
    fs.writeFileSync(path.join(dir, filename), 'hello')

    git(dir, ['add', filename]) // 数组形式：filename 作为单个 argv 元素

    const listed = git(dir, ['ls-files'])
    const files = listed.split('\n').filter(Boolean)
    assert.ok(files.length === 1, `应只列出 1 个文件，实际 ${files.length}：${JSON.stringify(files)}`)
    assert.strictEqual(files[0], filename, 'ls-files 应完整保留含空格文件名（未被拆词）')

    // status --porcelain 也含完整文件名（状态列之后），再次确认未被切词
    const status = git(dir, ['status', '--porcelain'])
    assert.ok(
      status.includes(filename),
      `status --porcelain 应含完整含空格文件名：${JSON.stringify(status)}`
    )

    passed++
    console.log('  ✓ 用例1 含空格文件名不拆词（作为单个 argv 元素，ls-files 命中唯一文件）')
  } finally {
    cleanup(dir)
  }
}

// ---------------------------------------------------------------------------
// 用例 2：命令替换元字符无副作用（可观测 marker 锚点证明永不经 shell —— design R5）
// 思路：构造一个「若经 shell 解释必产生 marker 副作用文件」的 argv 元素，经 helper（数组形式）
// 调用 git 后断言 marker 不存在。execFileSync 数组形式在任何平台都不经 shell，故 marker 永不出现。
// 平台分支：POSIX sh 用 $(...) 命令替换（design R5 原例）；win32 cmd.exe 用 & 分隔 + > 重定向
// （cmd 不展开 $()，故 Windows 取原生 shell 的注入向量才有回归意义）。
// ---------------------------------------------------------------------------
{
  const dir = makeTempRepo('gh-noshell-')
  // marker：tmpdir 下唯一路径（pid+时间戳防并发碰撞）
  const marker = path.join(os.tmpdir(), `git-helper-noshell-${process.pid}-${Date.now()}.txt`)
  try {
    assert.ok(!fs.existsSync(marker), `前置：marker 应不存在（${marker}）`)

    const injArg = process.platform === 'win32'
      ? `safe & echo injected > "${marker}"` // cmd.exe：& 分隔后续命令 + > 重定向建文件
      : `$(touch "${marker}")`               // POSIX sh：$(...) 命令替换执行 touch

    // 经 helper（数组形式）调用：check-ignore 对无 .gitignore 命中的 pathspec 返回非零，
    // 用 gitQuiet 包裹（失败返 null 不抛）——重点是调用后 marker 是否被创建。
    gitQuiet(dir, ['check-ignore', injArg])

    assert.ok(
      !fs.existsSync(marker),
      `命令替换元字符经 helper 数组调用后 marker 不应被创建（若经 shell 会执行建文件）：${injArg}`
    )

    passed++
    const shown = injArg.replace(marker, '<marker>')
    console.log(`  ✓ 用例2 命令替换元字符无副作用（marker 未创建，证明不经 shell）：${shown}`)
  } finally {
    cleanup(dir)
    cleanup(marker)
  }
}

// ---------------------------------------------------------------------------
// 用例 3：safeGit / git / gitQuiet 三 helper 语义回归
// - safeGit：成功 {value:<非空>, error:null}；失败 {value:null, error:<非空串>} 且不抛
// - git：成功返回 trim 后 string；失败抛异常
// - gitQuiet：成功返回 string；失败返回 null 不抛
// - trim:false 保留原样（git 输出尾换行不削）
// ---------------------------------------------------------------------------
{
  const dir = makeTempRepo('gh-semantics-')
  try {
    // safeGit 成功
    const sgOk = safeGit(dir, ['rev-parse', '--is-inside-work-tree'])
    assert.strictEqual(sgOk.value, 'true', 'safeGit 成功 value=trim 后输出')
    assert.strictEqual(sgOk.error, null, 'safeGit 成功 error=null')
    passed++

    // safeGit 失败（不抛，返回 error 结构）
    const sgErr = safeGit(dir, ['nonexistent-cmd-xyz'])
    assert.strictEqual(sgErr.value, null, 'safeGit 失败 value=null')
    assert.ok(
      typeof sgErr.error === 'string' && sgErr.error.length > 0,
      'safeGit 失败 error 为非空字符串'
    )
    passed++

    // git 成功（trim string）
    assert.strictEqual(
      git(dir, ['rev-parse', '--is-inside-work-tree']),
      'true',
      'git 成功返回 trim 后 string'
    )
    passed++

    // git 失败抛异常
    assert.throws(
      () => git(dir, ['nonexistent-cmd-xyz']),
      undefined,
      'git 失败应抛异常'
    )
    passed++

    // gitQuiet 成功
    assert.strictEqual(
      gitQuiet(dir, ['rev-parse', '--is-inside-work-tree']),
      'true',
      'gitQuiet 成功返回 string'
    )
    passed++

    // gitQuiet 失败返回 null（不抛）
    assert.strictEqual(
      gitQuiet(dir, ['nonexistent-cmd-xyz']),
      null,
      'gitQuiet 失败返回 null'
    )
    passed++

    // trim:false 保留原样（rev-parse 输出尾换行）—— safeGit
    const sgTrim = safeGit(dir, ['rev-parse', '--is-inside-work-tree']).value
    const sgRaw = safeGit(dir, ['rev-parse', '--is-inside-work-tree'], { trim: false }).value
    assert.strictEqual(sgTrim, 'true', 'safeGit 默认 trim 去尾换行')
    assert.ok(
      sgRaw !== 'true' && sgRaw.endsWith('\n'),
      `safeGit trim:false 应保留尾换行：${JSON.stringify(sgRaw)}`
    )
    passed++

    // trim:false —— git
    const gTrim = git(dir, ['rev-parse', '--is-inside-work-tree'])
    const gRaw = git(dir, ['rev-parse', '--is-inside-work-tree'], { trim: false })
    assert.ok(gRaw.endsWith('\n') && gRaw !== gTrim, 'git trim:false 保留尾换行')
    passed++

    console.log('  ✓ 用例3 safeGit/git/gitQuiet 三者 trim/抛错/静默语义回归（含 trim:false）')
  } finally {
    cleanup(dir)
  }
}

// ---------------------------------------------------------------------------
// 用例 5：safeGit retryOnTimeout（ETIMEDOUT 重试一次，治审计 git 超时偏紧）
// 思路：超时分支用极小 timeout（1ms）触发 ETIMEDOUT（git 子进程 fork/exec git.exe 远 >1ms），
// 遵循测试用例设计第5条（超时参数可注入、毫秒级极小值、不真等）。
// 契约覆盖（"重试成功"场景因 git 启动耗时不稳无法确定性构造，不测）：
//   - retryOnTimeout=false + 极小 timeout → 超时被捕获，{value:null,error:非空}，不抛
//   - retryOnTimeout=true  + 极小 timeout → 重试也超时，仍 {value:null,error:非空}，不抛（重试路径不破坏 safeGit 语义）
//   - retryOnTimeout=true  + 默认 timeout + 正常命令 → 成功（重试逻辑不影响正常路径，只对 ETIMEDOUT 触发）
// ---------------------------------------------------------------------------
{
  const dir = makeTempRepo('gh-retry-')
  try {
    // retryOnTimeout=false + 极小 timeout：ETIMEDOUT 被捕获不抛，返回 error 结构
    const sgTimeout = safeGit(dir, ['status', '--porcelain'], { trim: false, timeout: 1 })
    assert.strictEqual(sgTimeout.value, null, '极小 timeout 下 safeGit value=null')
    assert.ok(
      typeof sgTimeout.error === 'string' && sgTimeout.error.length > 0,
      '极小 timeout 下 safeGit error 为非空字符串（ETIMEDOUT 被捕获不抛）'
    )
    passed++

    // retryOnTimeout=true + 极小 timeout：重试一次（2ms 仍超时，git 启动 >2ms），仍 error 不抛
    const sgRetry = safeGit(dir, ['status', '--porcelain'], { trim: false, timeout: 1, retryOnTimeout: true })
    assert.strictEqual(sgRetry.value, null, 'retryOnTimeout=true 极小 timeout 下重试也超时 value=null')
    assert.ok(
      typeof sgRetry.error === 'string' && sgRetry.error.length > 0,
      'retryOnTimeout=true 重试后仍返回非空 error（不抛）'
    )
    passed++

    // retryOnTimeout=true + 默认 timeout + 正常命令：成功（重试逻辑不影响正常路径）
    const sgOk = safeGit(dir, ['rev-parse', '--is-inside-work-tree'], { retryOnTimeout: true })
    assert.strictEqual(sgOk.value, 'true', 'retryOnTimeout=true 正常命令仍成功')
    assert.strictEqual(sgOk.error, null, 'retryOnTimeout=true 正常命令 error=null')
    passed++

    console.log('  ✓ 用例5 safeGit retryOnTimeout（ETIMEDOUT 重试，超时捕获不抛 + 正常路径不受影响）')
  } finally {
    cleanup(dir)
  }
}

// ---------------------------------------------------------------------------
// 用例 4：grep 反向断言（src/ 不残留字符串拼接 git 调用模板串 —— design R1）
// 思路：递归读 src/ 下所有 .js 源码文本，断言不含以下注入范式（反引号模板串 git 调用）：
//   - `git ${            反引号模板 + git + 变量插值（注入核心，原 worktree helper 范式）
//   - execSync(`git      execSync + 反引号模板 + git（字符串经 shell）
//   - execFileSync(`git  execFileSync + 反引号模板 + git（错误单模板串当 file）
// 安全形式（不命中）：execFileSync('git', [...]) 单引号固定 file + 数组 args（git-helper 实现）；
//   execSync('git rev-parse') 单引号无变量固定串（白名单，非注入）。
// 排除：src/git-helper.js —— 它正是数组形式实现，其顶部 JSDoc 注释含 `execSync(\`git ${args}\`)`
//   背景说明字面（非真实调用），会误命中，故显式排除（实现本身由其它用例行为覆盖）。
// ---------------------------------------------------------------------------
{
  const patterns = [
    '`git ${',           // 反引号模板串 git 变量插值（注入核心）
    'execSync(`git',     // execSync + 反引号 + git（字符串经 shell）
    'execFileSync(`git'  // execFileSync + 反引号 + git（错误单模板串当 file）
  ]
  const skipFiles = new Set(['git-helper.js']) // 含背景注释字面，显式排除
  const offenders = []
  let scanned = 0

  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.js')) {
        scanned++
        if (skipFiles.has(entry.name)) continue
        const content = fs.readFileSync(full, 'utf8')
        for (const p of patterns) {
          if (content.includes(p)) {
            offenders.push({ file: path.relative(worktreeRoot, full), pattern: p })
          }
        }
      }
    }
  }
  walk(srcDir)

  assert.strictEqual(
    offenders.length,
    0,
    `src/ 不应残留字符串拼接 git 调用模板（注入面），发现 ${offenders.length} 处：\n` +
      offenders.map((o) => `  ${o.file} 命中 ${JSON.stringify(o.pattern)}`).join('\n')
  )

  passed++
  console.log(`  ✓ 用例4 反向断言：扫描 src/ ${scanned} 个 .js（排除 git-helper.js），无字符串拼接 git 调用残留`)
}

console.log(`\n✅ 全部 ${passed} 个用例块通过（git-helper 注入与空格回归）`)
