/**
 * change-identity.js — 变更身份行单一来源（2026-11-15-change-key-visibility）。
 *
 * 用户痛点：头脑风暴/轻量变更创建变更后 agent 直接干活，用户不知道创建的变更
 * key 与名称——CLI 输出里 key/标题虽在场但零「必须转述」指令。本函数把
 * 「完整 key + 名称 + 必须原样转述指令」渲染为一行可照抄文案，在四个创建/收编
 * 时点接线输出（flow.js 新建横幅与 adopt 收编、run/command.js 净新建与
 * brainstorm 零活跃自动创建）。选 console 输出层而非阶段 prompt：agent 对两者
 * 同样可见，console 层零提示词文档同步负担（docs/prompt/_extract.mjs 链）。
 */

/**
 * 渲染变更身份指令行。
 * @param {string} change 变更完整 key（如 2026-11-15-change-key-visibility）
 * @param {string} [title] 变更名称（标题）；缺省兜底 change（防御——调用点应传已解析标题，
 *   brainstorm 无 --input 时标题本就兜底为 key 同值，语义一致）
 * @returns {string} 单行指令文案（console.log 直接输出）
 */
export function renderChangeIdentityLine(change, title) {
  return `📣 变更身份（必须原样转述给用户——用户需知道本次创建的变更名）：key：${change}｜名称：${title || change}`
}
