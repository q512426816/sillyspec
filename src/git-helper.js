/**
 * 统一公共 git 调用入口（数组形式 execFileSync，不经 shell）。
 *
 * 背景：worktree 链路原用 `execSync(\`git ${args}\`)` 字符串拼接（经 shell），
 * 文件名/路径/用户输入插值进 shell 存在空格拆词 + 命令注入面；
 * run/shared.js 的 safeGit 已用 execFileSync 数组形式（注释明示避免拆词）。
 * 本模块把 safeGit 收口为单一实现，并补抛错版 git / 静默版 gitQuiet，
 * 供 worktree 链与 run 层共用，消除口径分裂。
 *
 * 三者统一带 `-c safe.directory=<cwd>` per-command（不污染全局 config）+ `-C cwd` 前缀；
 * 默认 timeout 5000ms（opts.timeout 可覆盖），默认 trim（opts.trim:false 保留原样输出）。
 * 数组形式天然规避 shell 拆词，路径含空格 / 元字符安全。
 * safeGit 额外支持 opts.retryOnTimeout：ETIMEDOUT（机器忙瞬时抖动）时用 2× timeout 重试一次。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * git C 风格引号路径解码：`\\` `\"` `\n` `\t` 与 `\NNN` 八进制**原始字节**。
 * 八进制转义的字节需聚合后按 UTF-8 解码（quotepath 关闭前非 ASCII 整段转义、
 * 关闭后控制字符路径仍会转义），逐字节单独 toString 会拆出 U+FFFD。
 * @param {string} s 已去外层引号的内容
 * @returns {string}
 */
export function unquoteGitPath(s) {
  const parts = []
  let out = ''
  let bytes = []
  const flushText = () => {
    if (bytes.length) {
      parts.push(Buffer.from(bytes).toString('utf8'))
      bytes = []
    }
  }
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const n = s[i + 1]
    if (n === 'n' || n === 't' || n === '"' || n === '\\') {
      flushText()
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n
      i++
      continue
    }
    const m = /^[0-7]{3}/.exec(s.slice(i + 1, i + 4))
    if (m) {
      if (out) {
        parts.push(out)
        out = ''
      }
      bytes.push(parseInt(m[0], 8))
      i += 3
      continue
    }
    out += ch // 未知转义保留原样
  }
  flushText()
  if (out) parts.push(out)
  return parts.join('')
}

/**
 * 构造带统一 per-command 配置的 git 参数前缀。
 * core.quotepath=false：非 ASCII 路径在 porcelain/diff 输出原始 UTF-8 而非 "\346\226\207" 八进制
 * 转义（中文文件名经 parsePorcelainPath 的 \\(.) 解引会被拆成裸数字拼坏路径）。
 */
function buildFullArgs(cwd, args) {
  return ['-c', `safe.directory=${cwd}`, '-c', 'core.quotepath=false', '-C', cwd, ...args]
}

// maxBuffer：execFileSync 默认 1MB，untracked 清单/大 diff 超限抛 ENOBUFS——
// safeGit 吞成 null、调用方 `|| ''` 会把"输出很大"静默变成"输出为空"（补丁漏文件级联）。
// 32MB 对齐 verify-postcheck 的 diff 读取口径。
// 256MB（坑 apply-spawnsync-enobufs，2026-08-22 实证：大 diff binary patch 超 32MB 抛
// ENOBUFS 只能 git merge 绕行）——上限只在真输出那么大时才占用
const GIT_MAX_BUFFER = 256 * 1024 * 1024

/**
 * CLI 自建 git 子进程的统一 env：GIT_OPTIONAL_LOCKS=0（坑 git-optional-locks，
 * 2026-10-06-module-map-list-leak 收口 add 静默失效根因收口）——status/diff 等读命令的
 * 机会性 index 刷新会短暂持 index.lock（watcher 每 ~3s 轮询 status 即常驻锁源），并发
 * git add 落进窗口即失败。该开关只禁机会性锁，add/commit 等真写的必需锁不受影响；
 * 权威注入（调用方显式值不覆盖）——「CLI 子进程恒不机会性抢锁」是统一不变量，不逐调用点分叉。
 * 展开合并不裸替换（丢 SystemRoot/USERPROFILE/TEMP 会毁 Windows 子进程，终批-③ 同坑）。
 */
function gitChildEnv(env) {
  return { ...(env || process.env), GIT_OPTIONAL_LOCKS: '0' }
}

/**
 * 安全执行 git：失败不抛，返回 { value, error } 结构。
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ trim?: boolean, timeout?: number, retryOnTimeout?: boolean, input?: string|Buffer, stdio?: string[] }} [opts]
 *   - trim:false 保留原样输出（git status --porcelain 首行前导空格
 *     是状态码的一部分，trim 会削掉致 parsePorcelainPath 丢首字符，坑见 auditQuickCompletion 注释）
 *   - timeout 默认 5000ms，长操作（大 diff / worktree list）可传更大值
 *   - retryOnTimeout:true 时，ETIMEDOUT 用 2× timeout 重试一次（默认 false 向后兼容）。
 *     机器忙时 git 子进程启动慢易瞬时超时；审计锚点 git 调用失败即 blocked 中断 quick，
 *     重试一次能消化绝大多数瞬时抖动，免去用户手工重跑。权限 / 损坏等非超时错误不重试（救不回）。
 *   - input: 写入子进程 stdin；传入时自动把 stdio[0] 设为 pipe（否则 Node 静默丢弃 input）
 *   - stdio: 显式覆盖子进程 stdio
 * @returns {{ value: string|null, error: string|null }}
 */
export function safeGit(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000, retryOnTimeout = false, input, stdio = null } = opts
  const fullArgs = buildFullArgs(cwd, args)
  // stdin 形态：input 传入时必须把 stdin 设为 pipe——Node 的 execFileSync 在
  // stdio[0]='ignore' 时会静默丢弃 input（commit-tree -F - 会收到空消息）。
  const childStdio = stdio || (input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'])
  // 单次尝试：返回 { value, errorObj }（errorObj 为原始 Error 或 null），不在内部格式化 message。
  // 格式化（取首行）推迟到最终返回，避免重试分支重复格式化，并保留原始 code 供重试判定。
  const attempt = (t) => {
    try {
      let value = execFileSync('git', fullArgs, {
        encoding: 'utf8', timeout: t, maxBuffer: GIT_MAX_BUFFER, stdio: childStdio,
        ...(input === undefined ? {} : { input }), env: gitChildEnv(), windowsHide: true,
      })
      if (trim) value = value.trim()
      return { value, errorObj: null }
    } catch (e) {
      return { value: null, errorObj: e }
    }
  }
  let { value, errorObj } = attempt(timeout)
  if (errorObj && retryOnTimeout && errorObj.code === 'ETIMEDOUT') {
    ({ value, errorObj } = attempt(timeout * 2))
  }
  return { value, error: errorObj ? errorObj.message.split('\n')[0] : null }
}

/**
 * 抛错版 git：失败抛异常，成功返回 trim 后 string（对齐 worktree 本地 git() 语义）。
 * 调用方自行 catch；不经 shell，参数以数组元素传递。
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ trim?: boolean, timeout?: number, encoding?: string, env?: NodeJS.ProcessEnv, input?: string|Buffer, stdio?: string[] }} [opts]
 *   - encoding:'buffer' 返回原始 Buffer（git diff --binary 等**二进制输出**专用——
 *     utf8 解码会破坏 NUL 字节使补丁不可应用；Buffer 输出跳过 trim）
 *   - input: 写入子进程 stdin（如 commit-tree -F - 的多行消息）；传入时自动把 stdio[0] 设为 pipe
 *   - stdio: 显式覆盖子进程 stdio（push 需要实时透传 hook 输出时用 inherit）
 * @returns {string|Buffer}
 */
export function git(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000, encoding = 'utf8', env, input, stdio = null } = opts
  const fullArgs = buildFullArgs(cwd, args)
  // env（终批-③）：可选注入（如 baseline checkpoint 的临时 GIT identity）——调用方必须
  // 用 { ...process.env, GIT_xxx } 展开形式，裸替换会丢 SystemRoot/USERPROFILE/TEMP（Windows）；
  // 最终经 gitChildEnv 展开合并并权威注入 GIT_OPTIONAL_LOCKS=0（调用方 GIT 键照常透传）
  // stdio：input 传入时 stdin 必须 pipe——Node 在 stdio[0]='ignore' 下会静默丢弃 input
  // （commit-tree -F - 收到空消息）；push 用 inherit 透传 pre-push hook 输出。
  const childStdio = stdio || (input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'])
  const value = execFileSync('git', fullArgs, {
    encoding, timeout, maxBuffer: GIT_MAX_BUFFER, stdio: childStdio,
    ...(input === undefined ? {} : { input }), env: gitChildEnv(env), windowsHide: true,
  })
  if (Buffer.isBuffer(value)) return value
  return trim ? value.trim() : value
}

/**
 * 批量对象存在性判定（2026-10-21-protocol-tax task-07 / FR-07）。
 *
 * 单次 `git cat-file --batch-check`（SHA 列表走 stdin）替代逐 SHA `cat-file -e`——
 * Windows 单次 git spawn ~100-150ms，归档锚点校验在 681 归档仓实测串行 25s+，批量化后
 * 一次 spawn 判完全部。探针形态 `<sha>^{commit}` 与旧逐查同构（tag/tree 对象不算 commit）。
 *
 * @param {string} cwd
 * @param {string[]} shas 40-hex SHA 列表（大小写不敏感，返回键统一小写）
 * @returns {Map<string, boolean>} sha → 是否为可解析 commit；整批失败返回空 Map
 *   （调用方查表 miss = false = 不可解析 = 悬空——与逐查失败同向 fail，不静默洗白）
 */
export function batchCatFileExists(cwd, shas) {
  const map = new Map()
  if (!Array.isArray(shas) || shas.length === 0) return map
  const probes = shas.map((s) => `${s}^{commit}`)
  try {
    const out = execFileSync('git', buildFullArgs(cwd, ['cat-file', '--batch-check']), {
      encoding: 'utf8', timeout: 30000, maxBuffer: GIT_MAX_BUFFER,
      input: probes.join('\n') + '\n',
      env: gitChildEnv(), windowsHide: true,
    })
    for (const line of String(out).split('\n')) {
      // 行形态：可解析 → git 回显**解析后裸 SHA**（不回显输入串）`<sha> commit <size>`；
      // 不可解析 → 回显输入串 `<sha>^{commit} missing`。统一剥后缀取裸 SHA 作键。
      const m = line.match(/^([0-9a-f]{40})(?:\^\{commit\})?\s+(\S+)/i)
      if (m) map.set(m[1].toLowerCase(), m[2] === 'commit')
    }
  } catch { /* 整批失败：空表全 miss=悬空（同逐查失败语义） */ }
  return map
}

/**
 * 批量暂存区 blob 内容哈希（2026-10-21-protocol-tax task-07 / FR-07 配套）。
 *
 * 单次 `git cat-file --batch`（stdin 逐行 `:path`）替代逐文件 `git show :path`——apply
 * 交付指纹漂移维度对最近 5 份 manifest × 全部文件逐个起进程，Windows spawn 税可观。
 * 响应按输入顺序回流：成功 `<oid> blob <size>\n<content>\n`、缺失 `<ref> missing\n`；
 * 内容与写侧同基（staged blob 即 LF 规范态），sha256 直算 content 字节。
 *
 * @param {string} cwd
 * @param {string[]} paths 仓库相对路径列表
 * @returns {Map<string, string|null>} path → staged 内容 sha256（null=未暂存/不可解析）；
 *   整批失败返回空 Map（调用方查表 miss=null=未暂存，与逐查 gitQuiet null 同语义）
 */
export function batchStageBlobSha256(cwd, paths) {
  const map = new Map()
  if (!Array.isArray(paths) || paths.length === 0) return map
  let out
  try {
    out = execFileSync('git', buildFullArgs(cwd, ['cat-file', '--batch']), {
      encoding: 'buffer', timeout: 30000, maxBuffer: GIT_MAX_BUFFER,
      input: paths.map((p) => `:${p}`).join('\n') + '\n',
      env: gitChildEnv(), windowsHide: true,
    })
  } catch { return map }
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(String(out), 'binary')
  let pos = 0
  let idx = 0
  while (pos < buf.length && idx < paths.length) {
    const nl = buf.indexOf(0x0a, pos)
    if (nl === -1) break
    const header = buf.toString('utf8', pos, nl).trim()
    pos = nl + 1
    const parts = header.split(/\s+/)
    if (parts[parts.length - 1] === 'missing') {
      map.set(paths[idx], null)
      idx++
      continue
    }
    const size = Number.parseInt(parts[parts.length - 1], 10)
    if (!Number.isFinite(size) || pos + size > buf.length) break // 形态意外：截断防错读
    map.set(paths[idx], createHash('sha256').update(buf.subarray(pos, pos + size)).digest('hex'))
    pos += size + 1 // 内容 + 尾随换行
    idx++
  }
  // 尾部未覆盖的路径（流截断等）按未暂存处理——与逐查失败同向
  for (; idx < paths.length; idx++) map.set(paths[idx], null)
  return map
}

/**
 * 静默版 git：内部调 git，失败 catch 返回 null（对齐 worktree 本地 gitQuiet() 语义）。
 * ENOBUFS（输出超 GIT_MAX_BUFFER 上限）不是"无输出"，静默成 null 会让调用方把大输出误当空清单——
 * 至少 stderr 留一行，不与正常空结果同语义。
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ trim?: boolean, timeout?: number }} [opts]
 * @returns {string|null}
 */
export function gitQuiet(cwd, args, opts = {}) {
  try {
    return git(cwd, args, opts)
  } catch (e) {
    if (e && e.code === 'ENOBUFS') {
      console.error(`[sillyspec] git 输出超过 ${GIT_MAX_BUFFER / (1024 * 1024)}MB 上限被截断：git ${args.join(' ')}`)
    }
    return null
  }
}

/**
 * 归档产物机械暂存（2026-09-05 全流程审计：原 archive 步骤 6 的 3 条 git add agent 指令 CLI 化）。
 * 固定路径：changes/archive/（归档产物）、knowledge/decisions/（决策提炼）、docs/<project>/modules/
 * （本次同步的模块文档——按已存在目录枚举，未变的目录 git add 是无害 no-op）。
 * 只 add 不 commit（统一提交工具处理）；平台模式由调用方跳过（specRoot 在源码仓外）。
 * @param {string} cwd 源码项目根
 * @returns {{ staged: string[], skipped: string[] }}
 */
export function stageArchiveArtifacts(cwd) {
  const specBase = join(cwd, '.sillyspec')
  const candidates = [join(specBase, 'changes', 'archive'), join(specBase, 'knowledge', 'decisions')]
  const docsRoot = join(specBase, 'docs')
  try {
    for (const e of readdirSync(docsRoot, { withFileTypes: true })) {
      if (e.isDirectory()) candidates.push(join(docsRoot, e.name, 'modules'))
    }
  } catch { /* 无 docs 目录 → 跳过 */ }
  const staged = []
  const skipped = []
  const existing = candidates.filter(p => existsSync(p))
  if (existing.length === 0) return { staged, skipped }
  // 2026-10-09-verify-papercuts ④：排除嵌套运行时异物——归档变更目录内嵌套的 .sillyspec/
  // （历史 cwd 漂移事故的遗留 db/日志）会被目录级 add 一并扫进暂存（当日实证：他变更的
  // sillyspec.db 与 spec-sync-bg.log 被夹带提交）。pathspec exclude 精确拦截该形态，正常
  // 归档产物（md/json/patch）零影响；检出异物在场时点名提示清理（不静默吞）。
  const excludes = [
    ':(exclude).sillyspec/changes/archive/*/.sillyspec',
    ':(exclude).sillyspec/changes/archive/*/.sillyspec/**',
  ]
  let nestedJunk = []
  try {
    const archRoot = join(specBase, 'changes', 'archive')
    for (const e of readdirSync(archRoot, { withFileTypes: true })) {
      if (e.isDirectory() && existsSync(join(archRoot, e.name, '.sillyspec'))) {
        nestedJunk.push(join(archRoot, e.name, '.sillyspec'))
      }
    }
  } catch { /* 归档目录不可读 → 跳过提示 */ }
  const r = safeGit(cwd, ['add', ...existing, ...excludes])
  if (r && r.error) {
    console.warn(`  ⚠️ 归档产物 git add 失败（可手动处理）：${String(r.error).slice(0, 120)}`)
    return { staged, skipped: existing }
  }
  if (nestedJunk.length > 0) {
    console.warn(`  ⚠️ 检出 ${nestedJunk.length} 个归档目录内嵌套 .sillyspec/ 运行时异物（已从本次暂存排除）：`)
    for (const j of nestedJunk.slice(0, 5)) console.warn(`     - ${j}`)
    console.warn(`     处置：确认无归属后删除目录；若已被 git 跟踪先 git rm -r --cached <路径>（不该入库的 db/日志）`)
  }
  return { staged: existing, skipped }
}
