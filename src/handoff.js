/**
 * handoff.js —— 阶段跑者瘦会话交接块生成器（P1-5 v1，2026-09-20 对撞实验驱动）
 *
 * 为什么需要：单会话跑全流程时主上下文 ~300K 底座 × 每 CLI 往返重发一次——对撞实验
 * 实测 sillyspec 侧主会话 203 请求烧 63M（肥上下文编排税是最大浪费源）。而 CLI prompt
 * 本就自足（进度快照/模块命中/知识注入全由进度库与 prompt 渲染提供，新会话零背景可
 * 续跑）——「每阶段一个瘦会话」是零机制改动的省法，缺的只是把交接信息打成一块可粘贴。
 *
 * 定位：纯只读（ProgressManager 读路径 + 环境探测），不写盘不动状态。输出三件：
 *   ① 新会话启动块（保持 SILLYSPEC_SESSION_ID 不变——变更所有权按此判定）；
 *   ② 下一阶段建议（当前阶段完成 → MAIN_FLOW_ORDER 后继；进行中 → 同阶段续跑）；
 *   ③ 当前状态摘要（阶段进度 + 停留步骤）。
 */
import { ProgressManager, resolveSpecDir } from './progress.js';
import { MAIN_FLOW_ORDER, STAGE_LABELS } from './progress/shared.js';

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
    lines,
  };
}
