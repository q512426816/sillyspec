/**
 * 派发策略生成器（task-dispatcher 抽象层）— task-02
 *
 * 定位（D-007 + UB-2）：dispatcher **不是 JS 执行体**。本文件 = **派发策略生成器**：
 * 依据 probe 结果选择后端（sillyhub / local），并把对应后端的派发指令模板组合成可注入
 * execute prompt 的「派发指令文本」，告诉 agent 用哪个后端、调什么 tool、传什么参数、
 * 怎么轮询与回收。**实际 tool 调用（本机 Agent tool / SillyHub MCP tool）由 agent 执行，
 * 本模块不 import client、不调任何 tool。**
 *
 * backend 选择（acceptance #1/#2，**由 probe.available 驱动，不由 isPathASupported 驱动**）：
 * - `probe.available === true` → backend = `'sillyhub'`（指令走 SillyHub MCP 模板）
 * - 否则（false / undefined / probe 为 null）→ backend = `'local'`（与现状行为一致，零回归）
 *
 * 路径 A 降级（D-003@v2）：`isPathASupported()` **不改 backend 标签**（仍由 probe 驱动），
 * 而是影响 SillyHub 指令的**文本内容**：path A 未支持时（当前 stub 恒 false），在 SillyHub
 * 主指令后附加降级提示段（PATH_A_DOWNGRADE_REASON + per-worker 回退 Local 说明），并始终追加
 * Local 兜底指令全文，让 agent 据此 per-worker 回退本机 Agent tool，不硬试 MCP 路径。
 *
 * 铁律（R-09 / UB-7 / D-004）：
 * - 纯函数：除 import 的模板生成器外无副作用，易测（task-08 mock probe 验两分支）。
 * - 指令必须明确**单后端**（backend 字段 + 文本只描述选定后端 + 兜底），避免 agent 误执行。
 * - allowedPaths 不物化到 SillyHub（仅写入指令供 SillySpec 侧 assess/apply 校验）——
 *   allowedPaths 由各后端模板在指令文本里声明，本策略不额外处理。
 * - 兼容 Win/Linux/macOS：无路径拼接 / 无平台分支，纯模板组合。
 */

import { renderLocalInstruction } from './backends/local-agent.js';
import {
  isPathASupported,
  renderSillyHubInstruction,
  PATH_A_DOWNGRADE_REASON,
} from './backends/sillyhub-mcp.js';

/**
 * @typedef {import('./backends/local-agent.js').DispatchContract} DispatchContract
 * @see design.md「接口定义」DispatchContract：brief / worktreePath / branch / allowedPaths /
 *      readOnly / modelHint / agentProfileHint / runId / missionId
 */

/**
 * @typedef {object} DispatchInstruction
 * @property {string} instruction - 注入 execute prompt 的派发指令文本（含选定后端 + 兜底）
 * @property {'sillyhub' | 'local'} backend - 选定后端标签（由 probe.available 驱动）
 */

/**
 * 生成派发指令（注入 execute prompt，agent 据此执行派发）。
 *
 * 决策（D-007 + task-02 acceptance）：
 * 1. 解析 probe：`available = !!(probe && probe.available)`；probe 为 null/undefined/缺
 *    available 均视为 unavailable → local（零回归）。
 * 2. **backend = available ? 'sillyhub' : 'local'**（acceptance #1/#2，由 probe 驱动）。
 * 3. contract 兜底为 `{}`（renderLocalInstruction / renderSillyHubInstruction 内部已对
 *    缺字段回退醒目占位符，不会崩）。
 * 4. backend==='sillyhub'：
 *    - 主指令 = renderSillyHubInstruction(contract)（含轮询间隔 / kill lease 防双写 / 回收约定）
 *    - 若 !isPathASupported()：追加降级提示段（PATH_A_DOWNGRADE_REASON + per-worker 回退 Local）
 *    - **始终追加 Local 兜底指令全文**（implementation #4，保证可回退）
 * 5. backend==='local'：主指令 = renderLocalInstruction(contract)（与现状行为一致）
 *
 * 注：renderLocalInstruction / renderSillyHubInstruction 内部已自行替换
 * LOCAL_RECYCLE_RULE / SILLYHUB_RECYCLE_RULE 的 `<runId>` 占位符，本策略不重复替换；
 * 仅当额外引用含占位符的常量时才需替换，当前实现未额外引用，故无需处理。
 *
 * @param {DispatchContract} [contract] - 派发契约（缺省视为空对象，模板内部回退占位符）
 * @param {{ available?: boolean, reason?: string } | null} [probe] - probeSillyHub() 的结果
 * @returns {DispatchInstruction} `{ instruction, backend }`
 */
export function renderDispatchInstruction(contract, probe) {
  // 1. 解析 probe：null/undefined/缺 available 均视为 unavailable → local（零回归）
  const available = !!(probe && probe.available);

  // 2. backend 由 probe.available 驱动（acceptance #1/#2，不由 isPathASupported 驱动）
  const backend = available ? 'sillyhub' : 'local';

  // 3. contract 兜底（模板内部对缺字段已有醒目占位符处理，不会崩）
  const c = contract || {};

  if (backend === 'sillyhub') {
    // SillyHub 主指令：含一 Wave 一 mission / dispatch_worker 参数 / 终态轮询间隔 / kill lease
    // 防双写 / 回收约定（acceptance #3 轮询间隔与 kill lease 来自此模板）
    const sillyHubInstruction = renderSillyHubInstruction(c);

    // path A 未支持时的降级提示段（不改 backend 标签，仅追加文本，引导 agent per-worker 回退 Local）
    const pathADowngrade = isPathASupported()
      ? ''
      : [
          '',
          '---',
          '',
          '### 路径 A 降级提示（per-worker 回退 Local）',
          '',
          `${PATH_A_DOWNGRADE_REASON}`,
          '',
          '本次派发 backend 标记仍为 `sillyhub`（由 probe 可达驱动，acceptance 要求不改标签），',
          '但实际执行将回退 Local：agent 调 dispatch_worker 传 worktree_path 会被拒/忽略，',
          '请 per-worker 回退本机 Agent tool（见下方 Local 兜底），不要硬试 MCP 路径。',
          '',
        ].join('\n');

    // 始终追加 Local 兜底指令全文（implementation #4「始终附加 Local 兜底」）：
    // 保证 SillyHub 路径任一步异常（dispatch 被拒 / 轮询超时 kill 后 fallback / path A 未落地）
    // 时 agent 可立即改用本机 Agent tool 重派，零回归。
    const localFallback = [
      '',
      '---',
      '',
      '### 兜底：Local（本机 Agent tool）— SillyHub 路径异常时回退',
      '',
      '当上方 SillyHub MCP 路径任一步失败，立即改用本机 Agent tool 重派该 task。',
      'Local 后端派发指令全文如下（workdir 强制 = contract.worktreePath）：',
      '',
      renderLocalInstruction(c),
    ].join('\n');

    return { instruction: sillyHubInstruction + pathADowngrade + localFallback, backend };
  }

  // backend === 'local'：与现状行为一致（acceptance #2），probe 本就 unavailable，无需额外降级提示
  return { instruction: renderLocalInstruction(c), backend };
}
