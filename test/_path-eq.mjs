/**
 * _path-eq.mjs — 路径等值断言辅助（跨平台）
 *
 * 背景：git 输出（rev-parse --show-toplevel / --git-common-dir 等）返回 realpath
 * （macOS 上 /var → /private/var 的 symlink 解析），而 Node join()/tmpdir() 拼出的
 * 路径可能是符号链接形态——字面相等断言在 macOS 必假败（Windows 上两种形态一致，
 * 所以只在 Windows 验证过的测试发现不了）。
 *
 * 等值口径：两侧归一后严格相等。归一 = realpathSync；路径尚不存在（目录未创建）时
 * 归一「最长存在前缀」再把余段原样接回——两侧只要共享同一个已存在祖先即等值。
 */
import { realpathSync } from 'node:fs'
import { dirname, basename, join } from 'node:path'

function realpathLongestPrefix(p) {
  const rest = []
  let cur = p
  while (true) {
    try {
      return join(realpathSync(cur), ...rest)
    } catch { /* 当前段不存在，向上找 */ }
    const parent = dirname(cur)
    if (parent === cur) return p // 到文件系统根仍不可 realpath，回退原值
    rest.unshift(basename(cur))
    cur = parent
  }
}

/** 路径等值：两侧归一（realpath / 最长存在前缀）后严格相等。 */
export function pathEq(a, b) {
  return realpathLongestPrefix(String(a)) === realpathLongestPrefix(String(b))
}
