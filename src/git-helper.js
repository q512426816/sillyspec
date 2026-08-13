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
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  // 单次尝试：返回 { value, errorObj }（errorObj 为原始 Error 或 null），不在内部格式化 message。
  // 格式化（取首行）推迟到最终返回，避免重试分支重复格式化，并保留原始 code 供重试判定。
  const attempt = (t) => {
    try {
      let value = execFileSync('git', fullArgs, { encoding: 'utf8', timeout: t })
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
 * @param {{ trim?: boolean, timeout?: number }} [opts]
 * @returns {string}
 */
export function git(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000 } = opts
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  const value = execFileSync('git', fullArgs, { encoding: 'utf8', timeout })
  return trim ? value.trim() : value
}

/**
 * 静默版 git：内部调 git，失败 catch 返回 null（对齐 worktree 本地 gitQuiet() 语义）。
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ trim?: boolean, timeout?: number }} [opts]
 * @returns {string|null}
 */
export function gitQuiet(cwd, args, opts = {}) {
  try {
    return git(cwd, args, opts)
  } catch {
    return null
  }
}
