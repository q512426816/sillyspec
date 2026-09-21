/**
 * handoff.js —— 阶段跑者瘦会话交接块生成器（P1-5 v1，2026-09-20 对撞实验驱动）
 *
 * 为什么需要：单会话跑全流程时主上下文 ~300K 底座 × 每 CLI 往返重发一次——对撞实验
 * 实测 sillyspec 侧主会话 203 请求烧 63M（肥上下文编排税是最大浪费源）。而 CLI prompt
 * 本就自足（进度快照/模块命中/知识注入全由进度库与 prompt 渲染提供，新会话零背景可
 * 续跑）——「每阶段一个瘦会话」是零机制改动的省法，缺的只是把交接信息打成一块可粘贴。
 *
 * 定位：纯只读（ProgressManager 读路径 + 变更目录文本 + 环境探测），不写盘不动状态。输出：
 *   ① 新会话启动块（保持 SILLYSPEC_SESSION_ID 不变——变更所有权按此判定）；
 *   ② 下一阶段建议（当前阶段完成 → MAIN_FLOW_ORDER 后继；进行中 → 同阶段续跑）；
 *   ③ 当前状态摘要（阶段进度 + 停留步骤）；
 *   ④ 上下文三段（B4a 加厚，2026-09-21-r5 优化 C-2）：未决阻断（waiting/blocked/failed 步骤）/
 *      任务面（tasks.md checkbox 计数+待办清单）/ 决策 ID 清单（decisions.md D-xxx@vN，翻案先回源）——
 *      整块 80 行帽（HANDOFF_LINE_CAP），超限从上下文段尾截，粘贴块与警示行永不动。
 */
import { ProgressManager, resolveSpecDir } from './progress.js';
import { MAIN_FLOW_ORDER, STAGE_LABELS } from './progress/shared.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 交接块总行数帽（优化方案 C-2 B4a：把「任务太大爆窗」从硬墙变操作规程——块本身不许变大到失控） */
const HANDOFF_LINE_CAP = 80;

function readChangeFile(specRoot, change, name) {
  try { return readFileSync(join(specRoot, 'changes', change, name), 'utf8'); } catch { return null; }
}

/**
 * 任务面摘要：tasks.md checkbox 行计数（done/total + 待办 ID 清单）。
 * @param {string|null} tasksMdText
 * @returns {string|null} 无 checkbox 行（非 execute 期/未落盘）返回 null
 */
export function summarizeTaskFace(tasksMdText) {
  if (!tasksMdText) return null;
  const boxes = [...tasksMdText.matchAll(/^-\s?\[([ xX])\]\s*(task-\d+)/gm)];
  if (!boxes.length) return null;
  const pending = boxes.filter((m) => m[1].toLowerCase() !== 'x').map((m) => m[2]);
  let line = `📦 任务面：${boxes.length - pending.length}/${boxes.length} 完成`;
  if (pending.length) {
    line += `（待办：${pending.slice(0, 8).join('、')}${pending.length > 8 ? ` 等 ${pending.length} 项` : ''}）`;
  }
  return line;
}

/**
 * 决策清单摘要：decisions.md 的 `## D-xxx@vN` 标题行 ID（跨会话恢复时按 ID 回源翻否决理由）。
 * @param {string|null} decisionsMdText
 * @returns {string|null}
 */
export function summarizeDecisions(decisionsMdText) {
  if (!decisionsMdText) return null;
  const ids = [...decisionsMdText.matchAll(/^##\s+(D-[\w-]+@v\d+)/gm)].map((m) => m[1]);
  if (!ids.length) return null;
  return `🧠 决策：${ids.slice(0, 10).join('、')}${ids.length > 10 ? ` 等 ${ids.length} 条` : ''}（翻案/复潮先读 decisions.md 对应条目）`;
}

/**
 * 未决阻断摘要：进度库步骤态 waiting/blocked/failed（--wait 决策点与门禁拦截点）。
 * @param {object|null} stageData
 * @returns {string|null}
 */
export function summarizeBlockers(stageData) {
  const steps = Array.isArray(stageData && stageData.steps) ? stageData.steps : [];
  const stuck = steps.filter((s) => s && (s.status === 'waiting' || s.status === 'blocked' || s.status === 'failed'));
  if (!stuck.length) return null;
  return `⛔ 未决：${stuck.slice(0, 3).map((s) => `「${String(s.name || s.stepName || s.title || `Step ${s.index ?? '?'}`).slice(0, 20)}」${s.status}`).join('；')}${stuck.length > 3 ? ` 等 ${stuck.length} 步` : ''}`;
}

/**
 * 解析下一阶段建议。
 * @param {string} currentStage - DB 当前阶段
 * @param {boolean} stageCompleted - 当前阶段是否已完成（进度库 stageData.status === 'completed'）
 * @returns {{ next: string, mode: 'advance' | 'resume', reason: string }}
 */
export function nextStageSuggestion(currentStage, stageCompleted) {
  if (!currentStage) return { next: 'brainstorm', mode: 'resume', reason: '无进度记录，从头脑风暴起步' };
  if (!stageCompleted) {
    return { next: currentStage, mode: 'resume', reason: `${STAGE_LABELS[currentStage] || currentStage} 进行中——新会话续跑本阶段（步骤态由进度库恢复）` };
  }
  const idx = MAIN_FLOW_ORDER.indexOf(currentStage);
  if (idx >= 0 && idx < MAIN_FLOW_ORDER.length - 1) {
    const next = MAIN_FLOW_ORDER[idx + 1];
    return { next, mode: 'advance', reason: `${STAGE_LABELS[currentStage] || currentStage} 已完成——新会话开跑下一阶段 ${STAGE_LABELS[next] || next}` };
  }
  if (currentStage === 'archive') {
    return { next: '', mode: 'done', reason: '流程已归档终态——无下一阶段（可 sillyspec progress show 复核或开新变更）' };
  }
  // 辅助阶段（quick/scan/explore/status/doctor）完成：建议回主流程或开新
  return { next: 'brainstorm', mode: 'resume', reason: `辅助阶段 ${STAGE_LABELS[currentStage] || currentStage} 完成——主流程变更请带 --change 续跑，或开新变更` };
}

/**
 * 生成交接块（human 模式行数组 / --json 由调用方取结构）。
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string} [opts.specBase] - 平台模式 specRoot；缺省 resolveSpecDir
 * @param {string} [opts.changeName] - 变更名；缺省取唯一活跃主流程变更
 * @returns {Promise<{ok:true, change, currentStage, stageCompleted, suggestion, sessionId, lines:string[]}|{ok:false, error:string}>}
 */
export async function buildHandoff({ cwd, specBase, changeName } = {}) {
  const specRoot = specBase || resolveSpecDir(cwd);
  const pm = new ProgressManager({ specDir: specRoot });

  let target = changeName;
  let picked = false;
  if (!target) {
    // 唯一活跃主流程变更自动选中（listChanges=目录+DB 联合口径，read 取 currentStage）
    const names = pm.listChanges(cwd) || [];
    const mains = [];
    for (const cn of names) {
      const p = pm.read(cwd, cn);
      if (p && MAIN_FLOW_ORDER.includes(p.currentStage || '')) mains.push({ name: cn, stage: p.currentStage });
    }
    if (mains.length === 1) {
      target = mains[0].name;
      picked = true;
    } else if (mains.length > 1) {
      return { ok: false, error: `多活跃主流程变更（${mains.length} 个：${mains.map((m) => m.name).join('、')}）——请带 --change <名> 指定` };
    } else {
      return { ok: false, error: '无活跃主流程变更（quick/scan 会话或全部归档）——handoff 面向主流程阶段交接' };
    }
  }

  const progress = pm.read(cwd, target);
  if (!progress) return { ok: false, error: `变更不存在: ${target}` };

  const currentStage = progress.currentStage || '';
  const stageData = (progress.stages && progress.stages[currentStage]) || null;
  const stageCompleted = !!(stageData && stageData.status === 'completed');
  const suggestion = nextStageSuggestion(currentStage, stageCompleted);
  const sessionId = process.env.SILLYSPEC_SESSION_ID || null;

  const steps = Array.isArray(stageData && stageData.steps) ? stageData.steps : [];
  const doneSteps = steps.filter((s) => s && s.status === 'completed').length;

  // ── 上下文三段（B4a 加厚：任务面 / 未决 / 决策——进度库+变更目录机械抽取，仍纯只读）──
  const faceLine = summarizeTaskFace(readChangeFile(specRoot, target, 'tasks.md'));
  const decisionLine = summarizeDecisions(readChangeFile(specRoot, target, 'decisions.md'));
  const blockerLine = summarizeBlockers(stageData);
  const contextLines = [blockerLine, faceLine, decisionLine].filter(Boolean);

  const lines = [];
  lines.push('🔗 交接块（瘦会话模式——下一阶段/续跑在新会话执行，主会话收尾省上下文）');
  lines.push('');
  lines.push('# ── 在新会话粘贴以下内容 ──');
  if (sessionId) lines.push(`export SILLYSPEC_SESSION_ID=${sessionId}`);
  else lines.push('export SILLYSPEC_SESSION_ID=<本变更的会话标识——旧会话 echo $SILLYSPEC_SESSION_ID 取>');
  lines.push(`cd ${cwd}`);
  if (suggestion.next) {
    lines.push(`sillyspec run ${suggestion.next} --change ${target}`);
  } else {
    lines.push('# （流程终态，无续跑命令）');
  }
  lines.push('# ── 交接块结束 ──');
  lines.push('');
  lines.push(`📋 ${target}：当前 ${STAGE_LABELS[currentStage] || currentStage}${steps.length > 0 ? `（步骤 ${doneSteps}/${steps.length}）` : ''}${stageCompleted ? ' ✅ 已完成' : ''}`);
  const contextStart = lines.length;
  for (const c of contextLines) lines.push(c);
  // 80 行帽：粘贴块（头）与警示行（尾）不动，超限从上下文段尾截（决策→任务面→未决，重要性递增反向丢）
  let truncated = false;
  while (lines.length + 3 > HANDOFF_LINE_CAP && lines.length > contextStart) {
    lines.splice(lines.length - 1, 1);
    truncated = true;
  }
  if (truncated) lines.push('…（上下文超 80 行帽截尾——任务面/决策明细回源 tasks.md 与 decisions.md）');
  lines.push(`➡️ ${suggestion.reason}`);
  lines.push('💡 为什么可行：CLI prompt 自足——进度快照/模块命中/知识注入由进度库与渲染提供，新会话零背景可续跑。');
  lines.push('⚠️ SILLYSPEC_SESSION_ID 必须保持不变（变更所有权/接管判定按此标识）；缺省降级机器级标识只拦他机。');

  return {
    ok: true,
    change: target,
    autoPicked: picked,
    currentStage,
    stageCompleted,
    suggestion,
    sessionId,
    truncated,
    lines,
  };
}
