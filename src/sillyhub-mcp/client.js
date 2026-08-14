/**
 * SillyHub MCP 客户端 — streamable HTTP 连接（协议 2025-11-25）
 *
 * 设计参考 src/sync.js 的 best-effort 风格：
 * - 网络失败 / 非 2xx / 异常一律 console.warn 不抛错，绝不抛穿到 execute（约束：HTTP 错误保守返回 unavailable/空/false）
 * - 未配置（缺 SILLYHUB_MCP_URL 或 SILLYHUB_MCP_TOKEN）→ 所有方法降级，不发网络
 *
 * 配置来源（优先级）：显式参数 > local.yaml mcp 段（via readMcpConfig）> 环境变量 SILLYHUB_MCP_URL/TOKEN（fallback）；
 *           构造函数可传 { cwd, url, token, timeoutMs }，缺省经 readMcpConfig(cwd) 读 local.yaml mcp 段 + env fallback。
 *
 * 端点：POST ${url}/mcp/（尾斜杠必需，MCP streamable HTTP 协议要求），Bearer token 鉴权。
 * 请求体：JSON-RPC 2.0（tools/call 调 tool；tools/list 列 tool schema，task-11 路径A 探测用）。
 * 响应：application/json（直接 JSON-RPC）或 text/event-stream（SSE，取 data: 行拼装后 JSON.parse）。
 * tool 返回值惯例：从 result.content[0].text 再 JSON.parse 得到（tools/list 例外：result 直接是 {tools:[...]}）。
 *
 * 铁律：
 * - converge_mission 不封装不调用（D-004 SillySpec 自己 apply）。
 * - worktree_path 仅作 dispatch_worker 入参传递，本文件不碰 DB（不持久化为新列）。
 * - 仅用 Node 原生 fetch（engine>=18），不引入新依赖。
 */

import { readMcpConfig } from './config.js';
import { getVersion } from '../version.js';

const DEFAULT_TIMEOUT_MS = 10_000;
// MCP streamable HTTP 协议版本（task 指定 2025-11-25）
const MCP_PROTOCOL_VERSION = '2025-11-25';
// 单次 RPC 返回哨兵：server 回 400 Missing session（session 未建立/过期）→ _sendRpc 重连重试
const SESSION_EXPIRED = Symbol('SESSION_EXPIRED');

export class SillyHubMcpClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.cwd]       - local.yaml 所在主仓库根，默认 process.cwd()（design §7.3）
   * @param {string} [opts.url]       - 显式覆盖（优先级最高 > readMcpConfig > env）；显式传空串视为未配置
   * @param {string} [opts.token]     - 显式覆盖（优先级最高 > readMcpConfig > env）
   * @param {number} [opts.timeoutMs] - 请求超时毫秒，默认 10000
   */
  constructor({ cwd, url, token, timeoutMs } = {}) {
    const workCwd = cwd || process.cwd();
    const cfg = readMcpConfig(workCwd);
    const u = url !== undefined ? url : (cfg?.url ?? '');
    const t = token !== undefined ? token : (cfg?.token ?? '');
    // 去 url 尾部斜杠，便于后续稳定拼 /mcp/（跨平台：URL 一律用正斜杠，不用 path.join）
    this._url = typeof u === 'string' ? u.replace(/\/+$/, '') : '';
    this._token = typeof t === 'string' ? t : '';
    // 安全提示（sec-e 缓解）：url 来自 local.yaml（agent 可写），非 https 时 Bearer token 明文上线。
    // 一次性 warn（构造时）不刷屏；本机 http://localhost 调试场景 warn 可接受。
    if (this._url && !/^https:\/\//i.test(this._url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(this._url)) {
      console.warn(`[sillyhub-mcp] mcp.url 非 https（${this._url.slice(0, 60)}），Bearer token 将明文传输——请确认为受控环境`);
    }
    this._token = typeof t === 'string' ? t : '';
    this._timeoutMs = typeof timeoutMs === 'number' && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS;
    // 缺 url 或 token → 视为未配置，所有方法降级不发网络
    this._configured = Boolean(this._url && this._token);
    // 端点必须带尾斜杠
    this._endpoint = this._url ? `${this._url}/mcp/` : '';
    this._rpcId = 0;
    // MCP streamable HTTP session 状态：惰性 initialize 后才有（见 _ensureSession）
    this._sessionId = null;
    this._sessionPromise = null;
  }

  // ── 内部辅助 ──

  /**
   * 调用 MCP tool（JSON-RPC tools/call）。best-effort：任何失败返回 null 不抛。
   *
   * task-11 抽出共享骨架：本方法现为薄封装 `_sendRpc('tools/call', {name,arguments})`，
   * warn 文案经 label=toolName 与改前逐字一致（零回归现有调用方）。
   * @param {string} toolName
   * @param {object} args - tool 参数（snake_case 对齐 SillyHub schema）
   * @param {object} [opts]
   * @param {boolean} [opts.quiet=false] - 静默失败警告（killLease 等已知 best-effort 路径用）
   * @returns {Promise<object|null>} MCP tool result（{content:[{type,text}]}），失败返回 null
   */
  async _callTool(toolName, args = {}, { quiet = false } = {}) {
    return this._sendRpc('tools/call', { name: toolName, arguments: args }, { quiet, label: toolName });
  }

  /**
   * 发 JSON-RPC 请求（fetch/SSE/鉴权/session 骨架，tools/call 与 tools/list 共用）。best-effort 不抛。
   *
   * MCP streamable HTTP（2025-11-25）要求先 initialize 拿 session，后续请求带
   * Mcp-Session-Id header，否则 server 回 -32600 Missing session ID（2026-08-14 实测：
   * SillyHub FastMCP v1.29 streamable_http_app 强制 session；此前本 client 直接发
   * tools/call 无 session → 一律 400，probe 误判 daemon-unreachable）。本方法：
   *   1. 惰性 _ensureSession（并发安全，仅 initialize 一次）；
   *   2. _rpcOnce 发单次请求；
   *   3. 遇 session 过期（400 Missing session）→ 重置重连重试一次。
   *
   * task-11 抽出：原 _callTool 的网络骨架；method/params 泛化——tools/call 带 {name,arguments}，
   * tools/list 带空 params。warn 文案用 label 作 tag（tools/call 传 toolName 保文案不变，
   * tools/list 传 'tools/list'）。
   * @param {string} method - JSON-RPC method（'tools/call' | 'tools/list'）
   * @param {object} params - JSON-RPC params（tools/call: {name,arguments}; tools/list: {}）
   * @param {object} [opts]
   * @param {boolean} [opts.quiet=false] - 静默失败警告
   * @param {string} [opts.label] - warn 文案标签（默认 method；tools/call 传 toolName 保文案）
   * @returns {Promise<object|null>} JSON-RPC result（tools/call: {content}; tools/list: {tools}），失败 null
   */
  async _sendRpc(method, params, { quiet = false, label } = {}) {
    const tag = label || method;
    if (!this._configured) {
      if (!quiet) console.warn(`[sillyhub-mcp] 未配置（缺 SILLYHUB_MCP_URL/TOKEN），${tag} 跳过`);
      return null;
    }

    // 惰性 initialize + 过期重连（最多 2 次：首次 + 重试）
    for (let attempt = 0; attempt < 2; attempt++) {
      await this._ensureSession(quiet);
      if (!this._sessionId) {
        // initialize 失败（网络/非 2xx/无 session）→ best-effort 降级，不再发业务请求
        if (!quiet) console.warn(`[sillyhub-mcp] ${tag} initialize 失败，跳过`);
        return null;
      }
      this._rpcId += 1;
      const result = await this._rpcOnce(method, params, { quiet, tag, id: this._rpcId });
      if (result !== SESSION_EXPIRED) return result;
      // session 过期（400 Missing session）→ 重置重连重试一次
      if (!quiet) console.warn(`[sillyhub-mcp] ${tag} session 过期，重连重试`);
      this._sessionId = null;
      this._sessionPromise = null;
    }
    return null;
  }

  /**
   * 发单次 JSON-RPC 请求（不管理 session）。返回 rpc.result；失败返回 null；
   * 400 Missing session ID → 返回 SESSION_EXPIRED 哨兵（调用方 _sendRpc 据此重连重试）。
   */
  async _rpcOnce(method, params, { quiet, tag, id }) {
    const body = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
    const headers = {
      Authorization: `Bearer ${this._token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    };
    if (this._sessionId) headers['Mcp-Session-Id'] = this._sessionId;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeoutMs);
    let res;
    try {
      res = await fetch(this._endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (!quiet) {
        if (err && err.name === 'AbortError') {
          console.warn(`[sillyhub-mcp] ${tag} 请求超时 (${this._timeoutMs}ms)`);
        } else {
          const msg = err && err.message ? err.message : String(err);
          console.warn(`[sillyhub-mcp] ${tag} 请求失败: ${msg}`);
        }
      }
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch { /* best effort */ }
      // session 未建立/过期：FastMCP 回 HTTP 400 + body 含 "Missing session ID"
      if (res.status === 400 && detail.includes('Missing session')) {
        return SESSION_EXPIRED;
      }
      if (!quiet) console.warn(`[sillyhub-mcp] ${tag} → HTTP ${res.status} ${String(detail).slice(0, 200)}`);
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
        console.warn(`[sillyhub-mcp] ${tag} 响应解析失败: ${msg}`);
      }
      return null;
    }

    if (!rpc) {
      if (!quiet) console.warn(`[sillyhub-mcp] ${tag} 响应无 JSON-RPC 内容`);
      return null;
    }

    if (rpc.error) {
      if (!quiet) console.warn(`[sillyhub-mcp] ${tag} JSON-RPC error: ${JSON.stringify(rpc.error)}`);
      return null;
    }

    return rpc.result || null;
  }

  /**
   * 确保已建立 MCP session（惰性 initialize，并发安全）。已初始化直接返回 true；
   * 初始化进行中则复用同一 promise。失败返回 false 且不留半成品状态。
   * @param {boolean} [quiet] - 静默初始化失败警告（探测路径默认用）
   * @returns {Promise<boolean>}
   */
  async _ensureSession(quiet = false) {
    if (this._sessionId) return true;
    if (this._sessionPromise) return this._sessionPromise;
    this._sessionPromise = this._initialize(quiet).finally(() => { this._sessionPromise = null; });
    return this._sessionPromise;
  }

  /**
   * MCP initialize 握手：POST initialize → 从响应 header（或 body _meta）读 mcp-session-id。
   * 成功存 this._sessionId；失败返回 false（best-effort，warn 不抛）。
   *
   * 注：协议要求 initialize 后发 notifications/initialized，本客户端只做探测
   * （tools/list / 只读 tool），实测 FastMCP 不强制该通知即可用（2026-08-14 验证），
   * 为省一次 RPC 不发；若未来 server 强校验再补。
   * @returns {Promise<boolean>}
   */
  async _initialize(quiet = false) {
    this._rpcId += 1;
    const id = this._rpcId;
    const body = {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        // MCP 2025-11-25 协议要求 clientInfo 必含 name + version，缺 version FastMCP
        // 回 -32602 Invalid request parameters（2026-08-14 实测锁定）
        clientInfo: { name: 'sillyspec-cli', version: getVersion() },
      },
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
        const msg = err && err.message ? err.message : String(err);
        console.warn(`[sillyhub-mcp] initialize 请求失败: ${msg}`);
      }
      return false;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      if (!quiet) console.warn(`[sillyhub-mcp] initialize → HTTP ${res.status}`);
      return false;
    }

    // 优先取 header mcp-session-id（FastMCP 实测返回）；缺失再查 body _meta.sessionId。
    // ⚠️ 无论 header 是否有 session，都必须读完 body（消费 SSE 流）——FastMCP 在
    // initialize 响应流未消费完时 session 未就绪，后续 tools/call 回 -32602
    // "Invalid request parameters"（2026-08-14 实测：node 只读 header 不读 body 必现，
    // python 读完 body 则过）。
    let sid = res.headers.get('mcp-session-id');
    let text = '';
    try { text = await res.text(); } catch { /* best effort */ }
    if (!sid && text) {
      const rpc = this._parseSseResponse(text, id);
      if (rpc && rpc.result && rpc.result._meta && typeof rpc.result._meta.sessionId === 'string') {
        sid = rpc.result._meta.sessionId;
      }
    }
    if (!sid) {
      if (!quiet) console.warn('[sillyhub-mcp] initialize 响应无 mcp-session-id');
      return false;
    }
    this._sessionId = sid;
    return true;
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
   * 列出 daemon 暴露的 MCP tools（JSON-RPC `tools/list`，task-11 路径A 探测用）。
   *
   * 与 tools/call 的差异：method='tools/list'，无 name/arguments；响应 result 是
   * `{tools: [{name, description, inputSchema}, ...]}`（MCP 标准）。本方法返回 tools 数组
   * （优先 result.tools，兼容 daemon 直接返回数组），调用方（probe.js 路径A 探测）据此查
   * dispatch_worker.inputSchema.properties 是否含 worktree_path + worker_prompt。
   *
   * best-effort：未配置 / HTTP 异常 / 非 2xx / JSON-RPC error / 解析失败 → 返回 null 不抛
   * （R-04 保守，探测失败由调用方降级 false）。默认 quiet=true（探测路径不刷失败噪音，
   * 区别于业务 tool 调用默认 quiet=false）。
   * @param {object} [opts]
   * @param {boolean} [opts.quiet=true] - 静默失败警告（探测路径默认静默）
   * @returns {Promise<Array<{name:string, inputSchema?:object}>|null>} tools 数组；失败/未配置 null
   */
  async listTools({ quiet = true } = {}) {
    if (!this._configured) return null;
    const result = await this._sendRpc('tools/list', {}, { quiet, label: 'tools/list' });
    if (!result) return null;
    if (Array.isArray(result)) return result;            // daemon 直接返回数组（兼容）
    if (Array.isArray(result.tools)) return result.tools; // 标准 MCP {tools:[...]}
    return null;
  }

  /**
   * best-effort 从 daemon 拿 workspace root_path（task-12 路径A 越界校验用）。
   *
   * 复用 tools/list RPC 机制（与 listTools 同 method，复用 _sendRpc 骨架，task-12 "复用 task-11
   * listTools"）：defensively 读 result.root_path（若 daemon 在 tools/list 响应顶层暴露）。
   * 当前 SillyHub gateway 的 tools/list 仅返 `{tools:[...]}` 不含 root_path → 实际返回 null
   * （probe 跳过越界校验，best-effort 语义）。**不臆造 daemon 接口**（无专用 get_workspace_root
   * tool，见 task-12 constraints / spike-01 结论）；后续 daemon 若在 tools/list 顶层暴露 root_path，
   * 本方法自动适配，probe 无需改。
   *
   * best-effort：未配置 / 异常 / 无 root_path 字段 → 返回 null 不抛。
   * @param {object} [opts]
   * @param {boolean} [opts.quiet=true] - 静默失败警告
   * @returns {Promise<string|null>} root_path 绝对路径；拿不到 null
   */
  async getRootPath({ quiet = true } = {}) {
    if (!this._configured) return null;
    const result = await this._sendRpc('tools/list', {}, { quiet, label: 'tools/list' });
    if (!result || typeof result !== 'object') return null;
    const rp = result.root_path;
    return typeof rp === 'string' && rp.length > 0 ? rp : null;
  }

  /**
   * 创建 mission（调 create_mission tool）。
   * @param {object} p
   * @param {string} p.objective
   * @param {string} p.changeId
   * @param {number} [p.budgetUsd]
   * @param {string} [p.orchestrationMode] - 'team'(默认,不传走原逻辑零回归,FR-05) |
   *   'external'(路径A,SillySpec 外部调度:跳 orchestrator spawn + converge 跳 merge,FR-08/D-007)。
   *   传入时 args.orchestration_mode = mode；不传/Null 不加字段（team 默认，零回归）。
   * @returns {Promise<{missionId: string|null}>} 未配置/失败 → { missionId: null }
   */
  async createMission({ objective, changeId, budgetUsd, orchestrationMode } = {}) {
    if (!this._configured) return { missionId: null };
    const args = {
      objective,
      change_id: changeId,
    };
    if (budgetUsd !== undefined && budgetUsd !== null) args.budget_usd = budgetUsd;
    // task-12：路径A 传 'external'（跳 orchestrator spawn，FR-08）；不传 → 不加字段，daemon 默认 team 零回归
    if (orchestrationMode !== undefined && orchestrationMode !== null) {
      args.orchestration_mode = orchestrationMode;
    }
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
    // task-12 / D-009：branch 字段名对齐跨仓契约（design §7.3，round-1 worktree_branch 已统一为 branch）
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
