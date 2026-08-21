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
const GIT_MAX_BUFFER = 32 * 1024 * 1024

/**
 * 安全执行 git：失败不抛，返回 { value, error } 结构。
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ trim?: boolean, timeout?: number, retryOnTimeout?: boolean }} [opts]
 *   - trim:false 保留原样输出（git status --porcelain 首行前导空格
 *     是状态码的一部分，trim 会削掉致 parsePorcelainPath 丢首字符，坑见 auditQuickCompletion 注释）
 *   - timeout 默认 5000ms，长操作（大 diff / worktree list）可传更大值
 *   - retryOnTimeout:true 时，ETIMEDOUT 用 2× timeout 重试一次（默认 false 向后兼容）。
 *     机器忙时 git 子进程启动慢易瞬时超时；审计锚点 git 调用失败即 blocked 中断 quick，
 *     重试一次能消化绝大多数瞬时抖动，免去用户手工重跑。权限 / 损坏等非超时错误不重试（救不回）。
 * @returns {{ value: string|null, error: string|null }}
 */
export function safeGit(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000, retryOnTimeout = false } = opts
  const fullArgs = buildFullArgs(cwd, args)
  // 单次尝试：返回 { value, errorObj }（errorObj 为原始 Error 或 null），不在内部格式化 message。
  // 格式化（取首行）推迟到最终返回，避免重试分支重复格式化，并保留原始 code 供重试判定。
  const attempt = (t) => {
    try {
      let value = execFileSync('git', fullArgs, { encoding: 'utf8', timeout: t, maxBuffer: GIT_MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] })
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
 * @param {{ trim?: boolean, timeout?: number, encoding?: string }} [opts]
 *   - encoding:'buffer' 返回原始 Buffer（git diff --binary 等**二进制输出**专用——
 *     utf8 解码会破坏 NUL 字节使补丁不可应用；Buffer 输出跳过 trim）
 * @returns {string|Buffer}
 */
export function git(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000, encoding = 'utf8' } = opts
  const fullArgs = buildFullArgs(cwd, args)
  const value = execFileSync('git', fullArgs, { encoding, timeout, maxBuffer: GIT_MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] })
  if (Buffer.isBuffer(value)) return value
  return trim ? value.trim() : value
}

/**
 * 静默版 git：内部调 git，失败 catch 返回 null（对齐 worktree 本地 gitQuiet() 语义）。
 * ENOBUFS（输出超 32MB）不是"无输出"，静默成 null 会让调用方把大输出误当空清单——
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
      console.error(`[sillyspec] git 输出超过 32MB 上限被截断：git ${args.join(' ')}`)
    }
    return null
  }
}
