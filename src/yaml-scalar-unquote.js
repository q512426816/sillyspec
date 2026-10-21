/**
 * yaml-scalar-unquote —— local.yaml known_failures 条目的 YAML 标量规范化单点
 * （2026-10-21-known-failures-unescape）。
 *
 * 背景（2026-10-21-verify-reuse-large-repo 收口实战）：写侧（config-known-failures
 * renderKey）按 YAML 规范把含反斜杠的锚定豁免模式转义成双引号形态，三个读侧
 * （verify-postcheck extractKnownFailures / docs-check / config-known-failures
 * parseKnownFailureKeys）各自拷贝的「剥引号」提取不反转义——模式带着字面双反斜杠
 * 到达豁免匹配层，正则语义漂移为「字面反斜杠+任意字符」，豁免静默永不命中；CLI
 * remove 同因必未命中。本模块把「条目级规范化」收敛为单点，三读侧统一 import。
 *
 * 零依赖叶子（三消费方刻意轻量化不引重链——js-yaml 整解析会动既有「断链容忍/
 * 注释容忍」行为面，超出对称性修复）；分段/注释容忍结构归各读侧既有实现。
 */

/**
 * 双引号标量内文反转义（YAML 双引号转义集；未知转义回落字面字符——键面无 \x 八进制等
 * 罕见形态，宽松回落优于抛错）。传 inner（不含两侧引号）。
 * @param {string} inner
 * @returns {string}
 */
export function unescapeYamlDoubleQuoted(inner) {
  return String(inner ?? '').replace(/\\(.)/gs, (m, c) => {
    if (c === 'n') return '\n'
    if (c === 't') return '\t'
    if (c === 'r') return '\r'
    if (c === '0') return '\0'
    return c // \\ → \、\" → "、\' → '；未知转义回落字面
  })
}

/**
 * 条目标量规范化（token 可带/不带引号）：双引号 → 反转义；单引号 → '' → '（YAML 单引号
 * 唯一转义）；裸值 → trim 原样。不剥行尾注释（归调用方既有结构）。
 * @param {string} s
 * @returns {string}
 */
export function unquoteYamlScalar(s) {
  const t = String(s ?? '').trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return unescapeYamlDoubleQuoted(t.slice(1, -1))
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}
