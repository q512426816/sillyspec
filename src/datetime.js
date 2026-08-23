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
