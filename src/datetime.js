/**
 * 人读墙钟时间工具（坑 taskcard-created-at-utc，2026-08-23 实证：taskcard 骨架 created_at 用
 * toISOString() 落 UTC——本地 09:39 生成写 01:39，子代理两次手工改）。
 *
 * 项目内「人读的 markdown/YAML frontmatter 时间字段」统一走本函数：本地时区 +
 * `YYYY-MM-DD HH:mm:ss` 形状（scan.js 文档示例形状），手工拼接零 locale/ICU 依赖（Node
 * small-icu 构建下 toLocaleString('sv-SE') 不可靠）。机器可读处（JSON/DB 列/目录名）继续用
 * toISOString()——那是 ISO 惯例不是坑。
 */

/**
 * 本地墙钟时间字符串（YYYY-MM-DD HH:mm:ss，各段补零）。
 * @param {Date} [d] 可注入时钟（测试用），缺省当前时间
 * @returns {string}
 */
export function nowWallClock(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} `
    + `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 任意时刻输入 → 本地墙钟串（YYYY-MM-DD HH:mm:ss）：Date 实例 / epoch 毫秒数 /
 * 时间字符串（解析委托 Date 构造器——开放解析面归语言规范，不建格式枚举白名单）。
 * 无效输入（非三类之一，或解析产物为 NaN 时刻）抛 TypeError，message 含输入的字符串形式。
 * @param {Date|number|string} input
 * @returns {string}
 */
export function toWallClock(input) {
  const d = input instanceof Date ? input
    : (typeof input === 'number' || typeof input === 'string') ? new Date(input)
    : null;
  if (!d || Number.isNaN(d.getTime())) {
    throw new TypeError(`toWallClock: 无法解析的时间输入：${String(input)}`);
  }
  return nowWallClock(d);
}
