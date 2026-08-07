/**
 * SillyHub MCP 客户端 — streamable HTTP 连接（协议 2025-11-25）
 *
 * 设计参考 src/sync.js 的 best-effort 风格：
 * - 网络失败 / 非 2xx / 异常一律 console.warn 不抛错，绝不抛穿到 execute（约束：HTTP 错误保守返回 unavailable/空/false）
 * - 未配置（缺 SILLYHUB_MCP_URL 或 SILLYHUB_MCP_TOKEN）→ 所有方法降级，不发网络
 *
 * 配置来源：环境变量 SILLYHUB_MCP_URL / SILLYHUB_MCP_TOKEN；
 *           构造函数可传 { url, token, timeoutMs } 覆盖，缺省读 env。
 *
 * 端点：POST ${url}/mcp/（尾斜杠必需，MCP streamable HTTP 协议要求），Bearer token 鉴权。
 * 请求体：JSON-RPC 2.0 tools/call。
 * 响应：application/json（直接 JSON-RPC）或 text/event-stream（SSE，取 data: 行拼装后 JSON.parse）。
 * tool 返回值惯例：从 result.content[0].text 再 JSON.parse 得到。
 *
 * 铁律：
 * - converge_mission 不封装不调用（D-004 SillySpec 自己 apply）。
 * - worktree_path 仅作 dispatch_worker 入参传递，本文件不碰 DB（不持久化为新列）。
 * - 仅用 Node 原生 fetch（engine>=18），不引入新依赖。
 */

const DEFAULT_TIMEOUT_MS = 10_000;
// MCP streamable HTTP 协议版本（task 指定 2025-11-25）
const MCP_PROTOCOL_VERSION = '2025-11-25';

export class SillyHubMcpClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.url]       - 覆盖 SILLYHUB_MCP_URL；显式传空串视为未配置
   * @param {string} [opts.token]     - 覆盖 SILLYHUB_MCP_TOKEN
   * @param {number} [opts.timeoutMs] - 请求超时毫秒，默认 10000
   */
  constructor({ url, token, timeoutMs } = {}) {
    const u = url !== undefined ? url : process.env.SILLYHUB_MCP_URL;
    const t = token !== undefined ? token : process.env.SILLYHUB_MCP_TOKEN;
    // 去掉 url 尾部斜杠，便于后续稳定拼 /mcp/（跨平台：URL 一律用正斜杠，不用 path.join）
    this._url = typeof u === 'string' ? u.replace(/\/+$/, '') : '';
    this._token = typeof t === 'string' ? t : '';
    this._timeoutMs = typeof timeoutMs === 'number' && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS;
    // 缺 url 或 token → 视为未配置，所有方法降级不发网络
    this._configured = Boolean(this._url && this._token);
    // 端点必须带尾斜杠
    this._endpoint = this._url ? `${this._url}/mcp/` : '';
    this._rpcId = 0;
  }

  // ── 内部辅助 ──

  /**
   * 调用 MCP tool（JSON-RPC tools/call）。best-effort：任何失败返回 null 不抛。
   * @param {string} toolName
   * @param {object} args - tool 参数（snake_case 对齐 SillyHub schema）
   * @param {object} [opts]
   * @param {boolean} [opts.quiet=false] - 静默失败警告（killLease 等已知 best-effort 路径用）
   * @returns {Promise<object|null>} MCP tool result（{content:[{type,text}]}），失败返回 null
   */
  async _callTool(toolName, args = {}, { quiet = false } = {}) {
    if (!this._configured) {
      if (!quiet) console.warn(`[sillyhub-mcp] 未配置（缺 SILLYHUB_MCP_URL/TOKEN），${toolName} 跳过`);
      return null;
    }

    this._rpcId += 1;
    const id = this._rpcId;
    const body = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeoutMs);
    let res;
    try {
      res = await fetch(this._endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this._token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (!quiet) {
        if (err && err.name === 'AbortError') {
          console.warn(`[sillyhub-mcp] ${toolName} 请求超时 (${this._timeoutMs}ms)`);
        } else {
          const msg = err && err.message ? err.message : String(err);
          console.warn(`[sillyhub-mcp] ${toolName} 请求失败: ${msg}`);
        }
      }
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      if (!quiet) {
        let detail = '';
        try { detail = await res.text(); } catch { /* best effort */ }
        console.warn(`[sillyhub-mcp] ${toolName} → HTTP ${res.status} ${String(detail).slice(0, 200)}`);
      }
      return null;
    }

    // 解析响应：JSON 或 SSE（跨平台兼容 \r\n / \n）
    const ct = res.headers.get('content-type') || '';
    let rpc = null;
    try {
      if (ct.includes('text/event-stream')) {
        const text = await res.text();
        rpc = this._parseSseResponse(text, id);
      } else {
        // application/json（或其他）：直接 JSON.parse
        rpc = await res.json();
      }
    } catch (err) {
      if (!quiet) {
        const msg = err && err.message ? err.message : String(err);
        console.warn(`[sillyhub-mcp] ${toolName} 响应解析失败: ${msg}`);
      }
      return null;
    }

    if (!rpc) {
      if (!quiet) console.warn(`[sillyhub-mcp] ${toolName} 响应无 JSON-RPC 内容`);
      return null;
    }

    if (rpc.error) {
      if (!quiet) console.warn(`[sillyhub-mcp] ${toolName} JSON-RPC error: ${JSON.stringify(rpc.error)}`);
      return null;
    }

    return rpc.result || null;
  }

  /**
   * 解析 SSE 响应：取含 JSON-RPC result/error 的事件；优先 id 精确匹配，否则取首个。
   * 事件间空行分隔；事件内 data: 行可多行，拼装时用 \n 连接。
   */
  _parseSseResponse(text, expectedId) {
    const events = String(text).split(/\r?\n\r?\n/);
    let fallback = null;
    for (const evt of events) {
      const dataLines = [];
      for (const line of evt.split(/\r?\n/)) {
        if (line.startsWith('data:')) {
          // 去掉 "data:" 前缀与一个可选前导空格
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
      }
      if (dataLines.length === 0) continue;
      const data = dataLines.join('\n');
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue; // 非 JSON data（心跳/注释等），跳过
      }
      if (!parsed || typeof parsed !== 'object') continue;
      if (parsed.result !== undefined || parsed.error !== undefined) {
        if (expectedId !== undefined && parsed.id === expectedId) return parsed;
        if (!fallback) fallback = parsed;
      }
    }
    return fallback;
  }

  /**
   * 从 MCP tool result 提取 content[0].text 并 JSON.parse 为 tool 返回值（MCP tool 结果惯例）。
   * @returns {any|null} 解析后的 tool 返回值；非 JSON 字符串则原样返回；缺失返回 null
   */
  _parseToolReturnValue(result) {
    if (!result || !Array.isArray(result.content) || result.content.length === 0) return null;
    const first = result.content[0];
    if (!first || typeof first.text !== 'string') return null;
    const text = first.text;
    try {
      return JSON.parse(text);
    } catch {
      return text; // tool 返回非 JSON 字符串，原样返回
    }
  }

  // ── 对外方法（均 async，best-effort 不抛） ──

  /**
   * 探测 daemon 连通性 + token 有效性（调 list_agent_profiles tool）。
   * 未配置 / HTTP 异常 / 非 2xx / JSON-RPC error → 返回 false（不阻塞调用方）。
   * @returns {Promise<boolean>} 成功且 tool 返回非空 → true，否则 false
   */
  async probeDaemon() {
    if (!this._configured) return false;
    const result = await this._callTool('list_agent_profiles', {});
    return result !== null;
  }

  /**
   * 创建 mission（调 create_mission tool）。
   * @param {object} p
   * @param {string} p.objective
   * @param {string} p.changeId
   * @param {number} [p.budgetUsd]
   * @returns {Promise<{missionId: string|null}>} 未配置/失败 → { missionId: null }
   */
  async createMission({ objective, changeId, budgetUsd } = {}) {
    if (!this._configured) return { missionId: null };
    const args = {
      objective,
      change_id: changeId,
    };
    if (budgetUsd !== undefined && budgetUsd !== null) args.budget_usd = budgetUsd;
    const result = await this._callTool('create_mission', args);
    if (result === null) return { missionId: null };
    const value = this._parseToolReturnValue(result);
    const missionId = value && typeof value === 'object'
      ? (value.mission_id ?? value.missionId ?? null)
      : null;
    return { missionId };
  }

  /**
   * 派发 worker（调 dispatch_worker tool，路径A 入参含 worktree_path/branch/worker_prompt）。
   * worktree_path 仅作 tool 入参传递，不持久化为 DB 列。
   * @param {object} p
   * @param {string} p.missionId
   * @param {string} p.objective
   * @param {string} [p.worktreePath]
   * @param {string} [p.branch]
   * @param {boolean} [p.readOnly]
   * @param {string} [p.model]
   * @param {string} [p.agentProfileId]
   * @param {string} [p.workerPrompt]
   * @returns {Promise<{workerId: string|null, status: string}>} 未配置/失败 → { workerId: null, status: 'unavailable' }
   */
  async dispatchWorker({
    missionId, objective, worktreePath, branch, readOnly, model, agentProfileId, workerPrompt,
  } = {}) {
    if (!this._configured) return { workerId: null, status: 'unavailable' };
    const args = {
      mission_id: missionId,
      objective,
    };
    if (readOnly !== undefined) args.read_only = readOnly;
    if (worktreePath !== undefined && worktreePath !== null) args.worktree_path = worktreePath;
    if (branch !== undefined && branch !== null) args.branch = branch;
    if (model !== undefined && model !== null) args.model = model;
    if (agentProfileId !== undefined && agentProfileId !== null) args.agent_profile_id = agentProfileId;
    if (workerPrompt !== undefined && workerPrompt !== null) args.worker_prompt = workerPrompt;
    const result = await this._callTool('dispatch_worker', args);
    if (result === null) return { workerId: null, status: 'unavailable' };
    const value = this._parseToolReturnValue(result);
    const workerId = value && typeof value === 'object'
      ? (value.worker_id ?? value.workerId ?? null)
      : null;
    const status = value && typeof value === 'object'
      ? (value.status ?? 'unknown')
      : 'unknown';
    return { workerId, status };
  }

  /**
   * 列出 mission 下的 worker（调 list_workers tool）。
   * @param {string} missionId
   * @returns {Promise<Array>} 未配置/失败返回 []；兼容 tool 返回数组或 { workers: [...] }
   */
  async listWorkers(missionId) {
    if (!this._configured) return [];
    const result = await this._callTool('list_workers', { mission_id: missionId });
    if (result === null) return [];
    const value = this._parseToolReturnValue(result);
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.workers)) return value.workers;
    return [];
  }

  /**
   * 终止 worker lease 防双写（UB-6 超时 fallback 用）。
   *
   * 注：SillyHub 当前 8 个 tool 无显式 kill，路径A 未落地；best-effort 实现——
   * 尝试 report_progress 带 kill 标记投递终止请求；tool 不存在/不支持/HTTP 异常时静默返回不抛。
   * 由于无专用 kill tool，lease 实际终止不保证，结果保守报 killed=false
   * （路径A 落地专用 kill tool 后再升级为 killed=true 语义）。
   * @param {string} workerId
   * @returns {Promise<{killed: boolean, reason?: string}>}
   */
  async killLease(workerId) {
    if (!this._configured) {
      return { killed: false, reason: '未配置 SillyHub MCP（路径A 未落地/kill tool 未支持）' };
    }
    // best-effort：quiet 抑制已知未落地路径的失败噪音（静默返回不抛）
    const result = await this._callTool('report_progress', {
      worker_id: workerId,
      kill: true,
      marker: 'sillyspec-kill-lease',
    }, { quiet: true });
    if (result === null) {
      return { killed: false, reason: '路径A 未落地/kill tool 未支持（report_progress kill 标记未生效或被拒）' };
    }
    // report_progress 调用成功 ≠ lease 已终止（其非专用 kill tool）；保守报 killed=false
    return {
      killed: false,
      reason: '路径A 未落地/kill tool 未支持（kill 标记已投递，lease 实际终止需 daemon 侧专用 kill tool）',
    };
  }
}
