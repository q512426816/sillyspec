/**
 * MSYS 路径转换污染嗅探测试（坑 quick-req-msys-path-mangling）
 *
 * Git Bash(MSYS2) 对以 / 开头的参数做 POSIX→Windows 自动转换，--req "/sessions 页修复"
 * 到达 CLI 时已是 "E:/Software/Git/sessions 页修复"，无感写入 QUICKLOG 标题并推送平台。
 * 验证两层：looksLikeMsysMangledPath 纯函数启发式（正/负例）+ CLI 冒烟（stderr 告警可见、
 * 干净值不误报、告警不阻断——缺会话仍走会话层报错而非 flag 层拦截）。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { looksLikeMsysMangledPath } from '../src/run/command.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

console.log('纯函数启发式：')
assert(looksLikeMsysMangledPath('E:/Software/Git/sessions 页整页滚动条修复（门户容器高度与 TopBar 不符）'),
  '实际事故样本（盘符路径+空格+中文）→ true')
assert(looksLikeMsysMangledPath('C:\\Software\\Git\\sessions 页修复'), '反斜杠形态 → true')
assert(!looksLikeMsysMangledPath('登录限流修复——INCR 计数误清'), '常规中文标题 → false')
assert(!looksLikeMsysMangledPath('E:/Software/Git/sessions'), '纯绝对路径无正文 → false')
assert(!looksLikeMsysMangledPath('修复 E:/logs 乱码问题'), '盘符不在开头（正文引用路径）→ false')
assert(!looksLikeMsysMangledPath(''), '空串 → false')
assert(!looksLikeMsysMangledPath(null), 'null（flag 未给）→ false')

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, 'run', 'quick', ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') }
}

const dir = mkdtempSync(join(tmpdir(), 'qm-'))
try {
  console.log('CLI 冒烟（告警层，不阻断）：')
  {
    const r = runCLI(['--done', '--req', 'E:/Software/Git/sessions 页整页滚动条修复', '--cause', '无', '--solution', '改', '--result', '过'], dir)
    assert(r.out.includes('路径转换污染') && r.out.includes('--req'), '污染 --req → stderr 告警（点名 flag）')
    assert(r.out.includes('MSYS_NO_PATHCONV'), '告警给出 MSYS_NO_PATHCONV=1 修复指引')
    assert(!(r.status === 2 && r.out.includes('缺项')), '告警不改变 flag 校验结果（非阻断）')
  }
  {
    const r = runCLI(['--done', '--req', '登录限流修复——INCR 计数误清', '--cause', '无', '--solution', '改', '--result', '过'], dir)
    assert(!r.out.includes('路径转换污染'), '干净 --req → 无告警（零误报）')
  }
  {
    const r = runCLI(['--done', '--output', '需求：修复 X 根因：无 方案：加文件 结果：测试通过'], dir)
    assert(!r.out.includes('路径转换污染'), '干净 --output → 无告警')
  }
} finally {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
