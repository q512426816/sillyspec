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
 * 输入 → Date 的私有强转（toWallClock/timeAgo 共用）：Date 实例 / epoch 毫秒数 /
 * 时间字符串（解析委托 Date 构造器——开放解析面归语言规范，不建格式枚举白名单）。
 * 无效输入（非三类之一，或解析产物为 NaN 时刻）抛 TypeError，message 含输入的字符串形式。
 */
function coerceClock(input, fnName) {
  const d = input instanceof Date ? input
    : (typeof input === 'number' || typeof input === 'string') ? new Date(input)
    : null;
  if (!d || Number.isNaN(d.getTime())) {
    throw new TypeError(`${fnName}: 无法解析的时间输入：${String(input)}`);
  }
  return d;
}

/**
 * 任意时刻输入 → 本地墙钟串（YYYY-MM-DD HH:mm:ss）：Date 实例 / epoch 毫秒数 /
 * 时间字符串。无效输入抛 TypeError，message 含输入的字符串形式。
 * @param {Date|number|string} input
 * @returns {string}
 */
export function toWallClock(input) {
  return nowWallClock(coerceClock(input, 'toWallClock'));
}

/**
 * 任意时刻输入 → 人读相对时间串，档位与进度面板（stage-machine._timeAgo）逐字同构：
 * 差值折算分钟 floor 后 <1（含负差/未来时间）→「刚刚」；<60 →「N 分钟前」；折算小时
 * 后 <24 →「N 小时前」；否则「N 天前」。人读串硬编码不依赖 locale/ICU（与 nowWallClock
 * 同理：Node small-icu 构建下 toLocaleString 不可靠）。
 * @param {Date|number|string} input
 * @param {Date|number} [now] 可注入「当前时刻」（测试钉档位边界用），缺省当前时间；
 *   仅接受 Date 实例或 epoch 毫秒，非法值抛 TypeError
 * @returns {string}
 */
export function timeAgo(input, now = new Date()) {
  const ts = coerceClock(input, 'timeAgo').getTime();
  const nowTs = now instanceof Date ? now.getTime()
    : typeof now === 'number' ? now
    : NaN;
  if (!Number.isFinite(nowTs)) {
    throw new TypeError(`timeAgo: 无法解析的当前时刻：${String(now)}`);
  }
  const minutes = Math.floor((nowTs - ts) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
