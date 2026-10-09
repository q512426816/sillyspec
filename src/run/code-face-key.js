/**
 * code-face-key.js — 代码面口径单点（2026-10-09-verify-reuse-friction FR-03 / D-002@v1）。
 *
 * 问题：两类复用指纹（green-cache 的 computeGateFingerprint / 质量扫描的
 * computeQualityScanFingerprint）原先以 git HEAD 为「代码态」分量——收口窗口内任何提交
 * （哪怕纯文档的声明修正）都换 HEAD → 缓存必 miss（2026-10-09 multi-agent-platform
 * tombstone 取证：13:35-14:10 五笔提交每笔击穿，2-3 轮 ×3.5min 重测纯浪费）。
 *
 * 修复：HEAD 分量替换为「代码树内容键」——`git ls-tree -r -z HEAD` 条目按既有非代码
 * 路径口径（.sillyspec/、docs/、*.md——与 filterCodePorcelain 同源判据）过滤后哈希。
 * ls-tree 条目自带 git 对象哈希（内容寻址）：纯文档提交不进过滤集 → 键不变 → 缓存存活；
 * 代码提交必进/必变 → 键变 → 必失配。整树 oid（HEAD^{tree}）作快路径：oid 与上次相同
 * → 直接沿用上次键（纯缓存优化，语义不变——oid 相同 ⇔ 整树逐字节相同）。
 *
 * 红线合规：非代码判据是**路径口径**（沿既有单点），不是语言/框架/扩展名枚举；
 * ls-tree 是 git 对象枚举，与语言无关。-z（NUL 分隔）输出不加引号不转义——非 ASCII
 * 路径的 endsWith 判据不被尾部引号击穿（独立审查指出的 quotepath 边界）。
 *
 * fail-open：git 不可用/任何异常 → null（调用方按 miss 处理，多跑一轮不误复用——
 * 与两指纹既有的 git 不可用语义同向）。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function safeGit(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, windowsHide: true });
  } catch {
    return null;
  }
}

/**
 * 非代码路径判据（口径单点）：.sillyspec/、docs/ 与 *.md——verify 窗口内的合法产出
 * （规范文档/声明修正）不算代码面。green-cache.filterCodePorcelain 与质量扫描
 * porcelainCodeLines 均消费本判据，不再各自实现。
 */
export function isNonCodePath(p) {
  return p.startsWith('.sillyspec/') || p.startsWith('docs/') || /\.md$/i.test(p);
}

/**
 * porcelain 行过滤为「代码面」（原 green-cache.js 实现迁入，语义不变）：
 * rename 行「old -> new」两侧任一是文档面即整行剔除（防 rename 伪装穿透）；排序保序。
 */
export function filterCodePorcelain(porcelain) {
  return String(porcelain || '')
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.trim()) return false;
      const raw = line.slice(3).trim();
      if (!raw) return false;
      const parts = raw.split(' -> ').map((p) => p.replace(/^"|"$/g, ''));
      return !parts.every((p) => isNonCodePath(p));
    })
    .sort();
}

/** 整树 oid 快路径缓存：cwd → { treeOid, key }（模块级；进程短命令生命周期内有效） */
const treeKeyMemo = new Map();

/**
 * 代码树内容键：`git ls-tree -r -z HEAD` 条目（mode type oid\tpath）过滤非代码路径后
 * 对逐条目原文（含 git 对象哈希——内容寻址）做 sha256。
 * @returns {string|null} git 不可用/无 HEAD → null（调用方 fail-open miss）
 */
export function computeCodeTreeKey({ cwd }) {
  const treeOid = safeGit(cwd, ['rev-parse', 'HEAD^{tree}']);
  if (treeOid === null) return null;
  const oid = treeOid.trim();
  const memo = treeKeyMemo.get(cwd);
  if (memo && memo.treeOid === oid) return memo.key;
  const out = safeGit(cwd, ['ls-tree', '-r', '-z', 'HEAD']);
  if (out === null) return null;
  const entries = String(out).split('\0').filter((e) => {
    if (!e) return false;
    const tab = e.indexOf('\t');
    if (tab === -1) return false;
    return !isNonCodePath(e.slice(tab + 1));
  });
  const key = createHash('sha256').update(entries.join('\n')).digest('hex');
  treeKeyMemo.set(cwd, { treeOid: oid, key });
  return key;
}
