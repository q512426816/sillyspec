// 参考解（dry-run 假 agent 使用，也供人工对照）。
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;
const DAY_MS = 86_400_000;

function parseUtc(value) {
  if (typeof value !== 'string') throw new TypeError('invalid date');
  const m = DATE_PREFIX.exec(value.trim());
  if (!m) throw new TypeError('invalid date');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ts = Date.UTC(y, mo - 1, d);
  const dt = new Date(ts);
  // 往返校验拦住 '2024-02-30' 这类被 Date 自动进位的假日期
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new TypeError('invalid date');
  }
  return ts;
}

export function eachDay(start, end) {
  const s = parseUtc(start);
  const e = parseUtc(end);
  if (e < s) throw new RangeError('end must not be before start');
  const days = [];
  for (let t = s; t <= e; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}
