// 参考解（dry-run 假 agent 使用，也供人工对照）。
// 思路：空白先归一为 \u0000 哨兵；字符过滤同时保留 [a-z0-9]、哨兵和字面分隔符；
// 再把「哨兵/分隔符的连续串」折叠为单个分隔符并去首尾。
// 注意不能只折叠哨兵——输入里本来就有的连续分隔符（如 'a--b'）也要折叠。
const SENTINEL = '\u0000';

function escapeRe(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

export function slugify(value, options = {}) {
  if (value === null || value === undefined) return '';
  const sep = options.hyphen ?? '-';
  if (typeof sep !== 'string' || sep.length !== 1) {
    throw new TypeError('hyphen must be a single character');
  }
  const esc = escapeRe(sep);
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, SENTINEL)
    .replace(new RegExp(`[^a-z0-9\\u0000${esc}]`, 'g'), '')
    .replace(new RegExp(`[\\u0000${esc}]+`, 'g'), sep)
    .replace(new RegExp(`^${esc}+|${esc}+$`, 'g'), '');
}

export default slugify;
