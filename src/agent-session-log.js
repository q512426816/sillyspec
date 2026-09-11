/**
 * agent-session-log.js — 本地 agent 会话日志路径探测 + 上报平台（多 harness）
 *
 * 背景：平台模式（SillyHub daemon 调 CLI）下，平台会话只能看到 CLI 内部阶段信息，
 * 看不到本地 agent 的实际执行日志——agent 的完整模型 I/O / 工具调用 / 输出都在各
 * agent CLI 本地的会话日志里（如 Codex rollout、Claude Code transcript、ZCode
 * model-io），平台无从得知。
 *
 * 方案（docs/platform-agent-log-protocol.md）：CLI 在 run 命令入口探测「当前正被哪个
 * agent CLI 驱动」，把 agent **完整会话日志**的本地绝对路径**主动 REST 上报**到平台
 * （POST /api/agent-logs，与进度上报同风格；平台端落库后在会话视图展示，再按路径让
 * daemon 读本地文件解析内容）。同时写本地产物 <runtimeRoot>/agent-session-log.json
 * 留底（上报失败兜底 + `sillyspec agent-log` 查询源）。
 *
 * 支持的 harness（探测规则全部实证——本机布局 + CLI 包源码/二进制，见 protocol 文档）：
 *   - claude-code：env CLAUDECODE / CLAUDE_CODE_ENTRYPOINT 门控；
 *       <home>/.claude/projects/<slug-cwd>/<sessionId>.jsonl（slug = 路径非字母数字全替 '-'）
 *   - codex：无可靠 env 标记，按 mtime 活跃窗口扫 <home>/.codex/sessions/YYYY/MM/DD/
 *       rollout-*.jsonl，读首行 session_meta.cwd 精确匹配 CLI cwd（并带出 originator，
 *       如 sillyhub-daemon，供平台关联派发来源）
 *   - zcode：env ZCODE_* 门控；<home>/.zcode/cli/rollout/model-io-sess_<id>.jsonl（含
 *       subagent 会话，文件名带 sess_subagent_agent_ 前缀）。rollout 目录全局共享（所有
 *       ZCode 窗口/项目混居），读首块系统提示词工作目录标记与 cwd 精确匹配——主会话
 *       `Primary working directory:` / subagent `<env>` 块 `Working directory:` 两形态均
 *       实证；标记读不出 fail-closed 不登（错登比漏登危害大，SILLYSPEC_AGENT_LOG 兜底）
 *   - pi：目录名即 cwd 编码（--<路径非字母数字替'-'>--），无需 env 门控；
 *       <home>/.pi/agent/sessions/<safePath>/session.jsonl
 *   - deepseek-dsh（@deepseek-ai/dsh）：同 pi 构但 ':' 删除；
 *       <home>/.dsh/sessions/<safePath>/session-<uuid>/session.jsonl.zstd（zstd 压缩）
 *   - cursor / opencode：loose 探测器（无 cwd/env 归属线索，仅 precise 全落空时启用）
 *   - 其他 CLI：env SILLYSPEC_AGENT_LOG 显式指定（绝对路径）
 *
 * 上报配置来源（优先级）：env SILLYHUB_PLATFORM_URL + SILLYHUB_PLATFORM_TOKEN（预留
 * 通道，daemon 未实现注入、需显式 export）> local.yaml platform 段（与进度同步同源）。**不受平台模式 sentinel 限制**
 * （链路 A 进度同步在平台模式跳过是因为 daemon 自有进度回传链路；agent 日志没有
 * daemon 链路，本上报就是它的主通道）。env SILLYSPEC_AGENT_LOG_PUSH=0 可关。
 *
 * 会话身份锚定（2026-09-11-agent-log-attribution-refactor）：探测之上叠 own 集合解析
 * （resolveOwnLogPaths）——per harness 锚定「本 run 所属 agent 会话」的日志文件（claude-code
 * =CLAUDE_SESSION_ID 精确/project 目录最新；zcode=db.sqlite 主会话+parent_id 子代理链，
 * 不可用回退最新 cwd 匹配主文件（workdir 标记校验，不匹配不打标）；pi/dsh=safePath 目录直算；
 * codex=rollout 首行 cwd 最新；SILLYSPEC_AGENT_LOG 覆盖=own）。ctx 打标与平台推送只作用于 own 条目（D-001/D-007），
 * quick/change 双向互斥（D-006@v2）；cursor/opencode（loose）不锚定不打标不推送仅本地留底。
 *
 * 铁律：全程 best-effort——探测不到不发不写、任何失败只 warn 一行绝不阻断 run 主流程。
 * 只上报路径 + 元信息（session_id/format/originator），不读日志内容（解析归平台侧），
 * 不引入新依赖。
 */
import { existsSync, readdirSync, statSync, readFileSync, mkdirSync, openSync, readSync, closeSync } from 'fs';
import { join, isAbsolute } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { writeAtomicSync } from './fs-atomic.js';
import { withFileLock } from './quicklog.js';
import { resolveRuntimeRoot } from './run/shared.js';

// node:sqlite 惰性同步加载通道（zcode 锚定读 db.sqlite 用）：ESM 下无同步动态 import，
// createRequire 在调用点 require——node:sqlite 不可用（Node<22.13/构建裁剪）时 try/catch
// 降级回退链，绝不在模块顶层 import 硬依赖。
const nodeRequire = createRequire(import.meta.url);

export const AGENT_LOG_SCHEMA_VERSION = 1;
export const AGENT_LOG_ARTIFACT_FILENAME = 'agent-session-log.json';
/** daemon/用户显式指定 agent 日志路径的 env 名（绝对路径；相对路径忽略）。 */
export const AGENT_LOG_ENV_OVERRIDE = 'SILLYSPEC_AGENT_LOG';

// 自动探测只认「活跃窗口」内被写过的会话文件：CLI 此刻正被 agent 驱动，当前会话日志的
// mtime 必然新鲜；窗口外的旧文件（上周的会话）不登记，防平台解析到错误日志。
// env 覆盖不受此窗口限制（显式指定 = 调用方负责正确性）。
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
// 单 harness 单次探测的条目上限（并行 Wave 会同时开多个子代理会话，都算 agent 日志）。
const MAX_PER_HARNESS = 6;
// 产物 entries 上限（按 last_seen_at 新→旧保留；超出淘汰最旧）。
const MAX_ENTRIES = 10;
// 产物合并锁超时：登记是附带动作，锁竞争超时直接放弃本次（下次 run 自愈）。
const MERGE_LOCK_TIMEOUT_MS = 2_000;
// 上报超时（与 quicklog 推送同量级：best-effort，不拖 run 主流程）。
const PUSH_TIMEOUT_MS = 5_000;

function debugLog(msg) {
  if (process.env.SILLYSPEC_DEBUG_AGENT_LOG || process.env.SILLYSPEC_DEBUG_SYNC) {
    console.warn(`[agent-log] ${msg}`);
  }
}

/** 路径归一正斜杠（跨平台产物契约：Windows 反斜杠不出现在 JSON 产物里）。 */
function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

/** cwd 等值比较口径：正斜杠归一 + Windows 形态路径大小写不敏感。
 * 按数据形态判而非宿主平台——平台 hub 场景 daemon 跑在任意平台，都要能与 Windows
 * agent 上报的 cwd（盘符 `c:/x` 或 UNC `\\server\share`）等值比较；toPosix 在前，
 * UNC 的反斜杠此时已成 `//`。POSIX 形态路径保持大小写敏感（文件系统语义如此）。 */
function normCwd(p) {
  const s = toPosix(p);
  const winForm = /^[a-zA-Z]:\//.test(s) || s.startsWith('//');
  return winForm ? s.toLowerCase() : s;
}

function cwdsMatch(a, b) {
  return Boolean(a) && Boolean(b) && normCwd(a) === normCwd(b);
}

function statSafe(p) {
  try { return statSync(p); } catch { return null; }
}

/**
 * 会话化上下文 id 消毒（2026-08-23-agent-activity-sessions）：非空字符串 trim 后返回，
 * 其余（undefined/null/空白）返回 null——best-effort 语义：ctx 解析失败不带、不抛错。
 * 只用于标识类值（hubSessionId / changeKey / quickId），非 flag 值。
 */
function pickCtxId(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

/**
 * 读文件首行并 JSON.parse（只读前 maxBytes 字节，防大日志整读）。
 * codex rollout 首行是 session_meta（含 cwd/originator），这是 cwd 精确匹配的数据源。
 * @returns {object|null} 解析失败/文件不可读返回 null
 */
function readFirstLineJson(filePath, maxBytes = 16384) {
  let fd = null;
  try {
    fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(maxBytes);
    const n = readSync(fd, buf, 0, maxBytes, 0);
    const text = buf.subarray(0, n).toString('utf8');
    const nl = text.indexOf('\n');
    return JSON.parse(nl === -1 ? text : text.slice(0, nl));
  } catch {
    return null;
  } finally {
    if (fd !== null) { try { closeSync(fd) } catch { /* best effort */ } }
  }
}

// zcode model-io 无结构化 cwd 字段，归属数据源 = 首行首个请求系统提示词的环境段工作目录标记。
// 两形态均本机实证：主会话 `Primary working directory: <path>\n- Is a git repository: yes`；
// subagent 会话 `<env>\nWorking directory: <path>\nIs directory a git repository`。
const ZCODE_WORKDIR_RE = /[Ww]orking directory: /;

/**
 * 从 zcode model-io 文件首块字节提取会话工作目录（cwd 归属判定的数据源）。
 *
 * 文件是 JSONL：首行 = 首个模型请求（含完整系统提示词），路径以 JSON 字符串内嵌形态出现
 * ——分隔符双写（`\\`）、行尾是字面 `\n` 两字符。因此取值不能裸 indexOf 截 `\n`：Windows
 * 路径普遍含 `\n` 字面序列（`\node_modules`、`\notifications`…），须按转义逐字符扫描，
 * 直到未转义的换行转义（提示词行边界）为止。只读首块不整行 JSON.parse（首行可达 MB 级）。
 * @returns {string|null} 未命中标记/文件不可读/值为空返回 null（调用方 fail-closed 丢弃）
 */
function extractZcodeWorkdir(filePath, maxBytes = 64 * 1024) {
  let fd = null;
  try {
    fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(maxBytes);
    const n = readSync(fd, buf, 0, maxBytes, 0);
    const text = buf.subarray(0, n).toString('utf8');
    const m = ZCODE_WORKDIR_RE.exec(text);
    if (!m) return null;
    const s = text.slice(m.index + m[0].length);
    let out = '';
    for (let j = 0; j < s.length;) {
      const c = s[j];
      if (c !== '\\') { out += c; j += 1; continue; }
      const e = s[j + 1];
      if (e === undefined || e === 'n') break; // 行尾换行转义 → 值结束
      if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(j + 2, j + 6))) {
        out += String.fromCharCode(parseInt(s.slice(j + 2, j + 6), 16));
        j += 6;
      } else if (e === 'r') { out += '\r'; j += 2; }
      else if (e === 't') { out += '\t'; j += 2; }
      else { out += e === '/' ? '/' : e; j += 2; } // \\ \" \/ 等：取转义次字符
    }
    return out || null;
  } catch {
    return null;
  } finally {
    if (fd !== null) { try { closeSync(fd) } catch { /* best effort */ } }
  }
}

// 活跃文件收集：dir 内 suffix 结尾文件，mtime 在窗口内，mtime 新→旧
function listActiveFiles(dir, { now, windowMs, limit }) {
  let names;
  try {
    names = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  } catch {
    return [];
  }
  const active = [];
  for (const name of names) {
    const full = join(dir, name);
    const st = statSafe(full);
    if (!st || now - st.mtimeMs > windowMs) continue;
    active.push({ name, full, mtimeMs: st.mtimeMs });
  }
  active.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return active.slice(0, limit);
}

/**
 * Claude Code 项目目录名 munging 规则：绝对路径所有非字母数字字符替换为 '-'。
 * 实证（本机 ~/.claude/projects/）：
 *   C:\Users\qinyi\IdeaProjects\sillyspec                → C--Users-qinyi-IdeaProjects-sillyspec
 *   C:\Users\qinyi\IdeaProjects\sillyspec\.worktrees\8f1 → C--Users-qinyi-IdeaProjects-sillyspec--worktrees-8f1
 */
export function mungeClaudeProjectDir(cwd) {
  return String(cwd).replace(/[^a-zA-Z0-9]/g, '-');
}

// ── harness 探测器注册表（新增 CLI = 加一个探测器对象 + protocol 文档补格式说明）──

/** Claude Code：env 门控（CLAUDECODE / CLAUDE_CODE_ENTRYPOINT）+ 项目 slug 目录精确到 cwd。 */
function detectClaudeCode(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  if (!(env.CLAUDECODE === '1' || (typeof env.CLAUDE_CODE_ENTRYPOINT === 'string' && env.CLAUDE_CODE_ENTRYPOINT))) {
    return [];
  }
  const claudeRoot = env.CLAUDE_CONFIG_DIR || join(homeDir, '.claude');
  const projectsRoot = join(claudeRoot, 'projects');
  const entries = [];
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const projectDir = join(projectsRoot, mungeClaudeProjectDir(rawCwd));
    if (!existsSync(projectDir)) continue;

    // CLAUDE_SESSION_ID 精确匹配（存在则必登）：比 newest-mtime 猜测可靠
    const sessionId = typeof env.CLAUDE_SESSION_ID === 'string' ? env.CLAUDE_SESSION_ID.trim() : '';
    if (sessionId) {
      const exact = join(projectDir, `${sessionId}.jsonl`);
      if (existsSync(exact)) {
        entries.push({
          harness: 'claude-code', format: 'claude-code-jsonl', detected_via: 'claude-code-session-id',
          log_path: toPosix(exact), agent_cwd: toPosix(rawCwd),
          session_id: sessionId, originator: null,
          mtime_ms: statSafe(exact)?.mtimeMs ?? null,
        });
      }
    }

    for (const f of listActiveFiles(projectDir, { now, windowMs, limit: MAX_PER_HARNESS })) {
      const posix = toPosix(f.full);
      if (entries.some(e => e.log_path === posix)) continue;
      entries.push({
        harness: 'claude-code', format: 'claude-code-jsonl', detected_via: 'claude-code-active-scan',
        log_path: posix, agent_cwd: toPosix(rawCwd),
        session_id: f.name.replace(/\.jsonl$/, ''), originator: null,
        mtime_ms: f.mtimeMs,
      });
    }
  }
  return entries;
}

/**
 * Codex：无可靠子进程 env 标记（daemon 拉起场景实证），按日期目录扫活跃 rollout，
 * 读首行 session_meta.cwd 精确匹配。originator（如 sillyhub-daemon）一并带出供平台关联。
 * 布局实证：<home>/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl，首行
 * {"type":"session_meta","payload":{"session_id","cwd","originator","cli_version",...}}。
 */
function detectCodex(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  const codexHome = env.CODEX_HOME || join(homeDir, '.codex');
  const sessionsRoot = join(codexHome, 'sessions');
  if (!existsSync(sessionsRoot)) return [];

  // 只扫今天/昨天两个日期目录（窗口 15min 跨零点最多涉及两天；目录按日期分层是天然的扫描剪枝）
  const dayDirs = [new Date(now), new Date(now - 24 * 60 * 60 * 1000)]
    .map(d => join(sessionsRoot, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')));

  const entries = [];
  for (const dir of [...new Set(dayDirs)]) {
    for (const f of listActiveFiles(dir, { now, windowMs, limit: MAX_PER_HARNESS })) {
      const meta = readFirstLineJson(f.full);
      const payload = meta && meta.type === 'session_meta' ? (meta.payload || {}) : {};
      // cwd 精确匹配：防并发其他项目的 codex 会话串台（session_meta.cwd 与 CLI cwd 等值才登记）
      if (!cwdCandidates.some(c => c && payload.cwd && cwdsMatch(c, payload.cwd))) continue;
      entries.push({
        harness: 'codex', format: 'codex-rollout-jsonl', detected_via: 'codex-session-meta-cwd',
        log_path: toPosix(f.full), agent_cwd: toPosix(payload.cwd),
        session_id: typeof payload.session_id === 'string' ? payload.session_id : null,
        originator: typeof payload.originator === 'string' ? payload.originator : null,
        mtime_ms: f.mtimeMs,
      });
      if (entries.length >= MAX_PER_HARNESS) break;
    }
  }
  return entries;
}

/**
 * ZCode：env ZCODE_* 门控（本机实证子进程可见 ZCODE_APP_VERSION/ZCODE_ENV 等）；
 * <home>/.zcode/cli/rollout/model-io-sess_<id>.jsonl（含 subagent 会话，文件名带
 * sess_subagent_agent_ 前缀），完整模型 I/O。
 *
 * cwd 归属：rollout 目录全局共享（所有 ZCode 窗口/项目混居），env 门控只证明「CLI 正被
 * 某个 ZCode 实例驱动」，证明不了「该文件属于本项目」——多窗口并行时另一项目的活跃会话
 * 会被整体误登（2026-08-31 实证：sillyspec run 把 multi-agent-platform 会话上报为本地
 * agent 日志）。修法对齐 codex 的 session_meta.cwd 精确匹配：读首块工作目录标记
 * （extractZcodeWorkdir）与 cwdCandidates 等值比较；标记读不出 fail-closed 丢弃
 * （错登比漏登危害大——平台把该文件当本会话权威日志解析展示；env 覆盖是兜底通道）。
 */
function detectZcode(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  const inZcode = Boolean(env.ZCODE_APP_VERSION || env.ZCODE_ENV || env.ZCODE_RUNTIME_ENV);
  if (!inZcode) return [];
  const rolloutDir = join(homeDir, '.zcode', 'cli', 'rollout');
  // 预筛多扫一倍再按 cwd 过滤：窗口内其他项目的活跃会话不应在过滤前挤占 MAX_PER_HARNESS 名额
  const candidates = listActiveFiles(rolloutDir, { now, windowMs, limit: MAX_PER_HARNESS * 2 });
  const entries = [];
  for (const f of candidates) {
    const workdir = extractZcodeWorkdir(f.full);
    if (!workdir || !cwdCandidates.some(c => c && cwdsMatch(c, workdir))) {
      debugLog(`zcode rollout cwd 不匹配/无标记，跳过: ${f.name} workdir=${workdir || '(none)'}`);
      continue;
    }
    entries.push({
      harness: 'zcode', format: 'zcode-model-io-jsonl', detected_via: 'zcode-workdir-marker',
      log_path: toPosix(f.full), agent_cwd: toPosix(workdir),
      session_id: f.name.replace(/^model-io-sess_/, '').replace(/\.jsonl$/, ''),
      originator: null,
      mtime_ms: f.mtimeMs,
    });
    if (entries.length >= MAX_PER_HARNESS) break;
  }
  return entries;
}

/**
 * pi（@earendil-works/pi-coding-agent）：完整会话 = <home>/.pi/agent/sessions/<safePath>/session.jsonl。
 * safePath 编码规则（dist/migrations.js:101 源码实证）：
 *   `--${cwd.replace(/^[/\\]/,'').replace(/[/\\:]/g,'-')}--`
 * 实证：C:\Users\qinyi\IdeaProjects\multi-agent-platform → --C--Users-qinyi-IdeaProjects-multi-agent-platform--
 * 目录名即 cwd 编码 → 天然精确归属，无需 env 门控。
 */
export function mungePiSafePath(cwd) {
  return `--${String(cwd).replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`;
}

function detectPi(ctx) {
  const { cwdCandidates, homeDir, now, windowMs } = ctx;
  const entries = [];
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const sessionFile = join(homeDir, '.pi', 'agent', 'sessions', mungePiSafePath(rawCwd), 'session.jsonl');
    const st = statSafe(sessionFile);
    if (!st || now - st.mtimeMs > windowMs) continue;
    entries.push({
      harness: 'pi', format: 'pi-session-jsonl', detected_via: 'pi-safe-path',
      log_path: toPosix(sessionFile), agent_cwd: toPosix(rawCwd),
      session_id: null, originator: null,
      mtime_ms: st.mtimeMs,
    });
  }
  return entries;
}

/**
 * dsh（@deepseek-ai/dsh，DeepSeek agent CLI）：完整会话 =
 * <home>/.dsh/sessions/<safePath>/session-<uuid>/session.jsonl.zstd（zstd 压缩 jsonl）。
 * safePath 编码（sessions/ 目录名 + storages/session_projcache.json 的 cwd 字段交叉实证）：
 * 与 pi 同构但 `:` 是删除而非替换 —— `--${cwd 去首斜杠、删 ':'、[/\\]→'-'}--`。
 * 实证：C:\Users\qinyi\IdeaProjects\multi-agent-platform → --C-Users-qinyi-IdeaProjects-multi-agent-platform--
 */
export function mungeDshSafePath(cwd) {
  return `--${String(cwd).replace(/^[/\\]/, '').replace(/:/g, '').replace(/[/\\]/g, '-')}--`;
}

function detectDsh(ctx) {
  const { cwdCandidates, homeDir, now, windowMs } = ctx;
  const entries = [];
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const projectDir = join(homeDir, '.dsh', 'sessions', mungeDshSafePath(rawCwd));
    if (!existsSync(projectDir)) continue;
    // 会话目录（session-<uuid>/）按 mtime 活跃窗口取最新几个，完整日志 = 目录内 session.jsonl.zstd
    let sessionDirs;
    try {
      sessionDirs = readdirSync(projectDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    } catch { continue; }
    const active = [];
    for (const name of sessionDirs) {
      const logFile = join(projectDir, name, 'session.jsonl.zstd');
      const st = statSafe(logFile);
      if (!st || now - st.mtimeMs > windowMs) continue;
      active.push({ name, logFile, mtimeMs: st.mtimeMs });
    }
    active.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const a of active.slice(0, MAX_PER_HARNESS)) {
      entries.push({
        harness: 'deepseek-dsh', format: 'dsh-session-jsonl-zstd', detected_via: 'dsh-safe-path',
        log_path: toPosix(a.logFile), agent_cwd: toPosix(rawCwd),
        session_id: a.name.replace(/^session-/, ''), originator: null,
        mtime_ms: a.mtimeMs,
      });
    }
  }
  return entries;
}

/**
 * Cursor（IDE / cursor-agent CLI）：完整会话 = <home>/.cursor/chats/<workspaceHash>/<chatUuid>/
 * {meta.json, store.db(sqlite)}。无 cwd 映射（workspaceHash 算法未知）也无子进程 env 标记
 * → 宽探测器（loose）：仅按 store.db(+wal) mtime 活跃窗口登记，且只在所有精确探测器
 * 落空时启用（防 Cursor IDE 日常使用在其他项目聊天时误报为当前 agent 日志）。
 */
function detectCursor(ctx) {
  const { cwdCandidates, homeDir, now, windowMs } = ctx;
  const chatsRoot = join(homeDir, '.cursor', 'chats');
  let wsDirs;
  try {
    wsDirs = readdirSync(chatsRoot, { withFileTypes: true }).filter(d => d.isDirectory());
  } catch { return []; }
  const cwdPosix = toPosix(cwdCandidates[0] || '');
  const active = [];
  for (const ws of wsDirs) {
    let chatDirs;
    try {
      chatDirs = readdirSync(join(chatsRoot, ws.name), { withFileTypes: true }).filter(d => d.isDirectory());
    } catch { continue; }
    for (const chat of chatDirs) {
      const chatDir = join(chatsRoot, ws.name, chat.name);
      // sqlite WAL 模式下写入打在 -wal 侧车，取两者 mtime 较大者判活跃
      const db = statSafe(join(chatDir, 'store.db'));
      const wal = statSafe(join(chatDir, 'store.db-wal'));
      const st = db || wal;
      if (!st) continue;
      const mtime = Math.max(db?.mtimeMs ?? 0, wal?.mtimeMs ?? 0);
      if (now - mtime > windowMs) continue;
      active.push({ chatDir, sessionId: chat.name, mtimeMs: mtime });
    }
  }
  active.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return active.slice(0, 3).map(a => ({
    harness: 'cursor', format: 'cursor-chat-sqlite', detected_via: 'cursor-recent-scan',
    log_path: toPosix(a.chatDir), agent_cwd: cwdPosix,
    session_id: a.sessionId, originator: null,
    mtime_ms: a.mtimeMs,
  }));
}

/**
 * opencode（opencode-ai v1.17+）：完整会话 = <dataRoot>/opencode/storage/session/ 下的
 * JSON 树（info/<id>.json 会话元信息 + message/ + part/ 全量内容；二进制字符串实证布局）。
 * dataRoot = $XDG_DATA_HOME || ~/.local/share。cwd 归属：读活跃窗口内 info/*.json 做
 * cwd 文本包含匹配（对 JSON 形状宽容）；无匹配不登记。宽探测器（loose，布局未本机实证，
 * 生产不命中时静默 no-op，env 覆盖兜底）。
 */
function detectOpencode(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  const dataRoot = env.XDG_DATA_HOME || join(homeDir, '.local', 'share');
  const sessionRoot = join(dataRoot, 'opencode', 'storage', 'session');
  const infoDir = join(sessionRoot, 'info');
  let infoFiles;
  try {
    infoFiles = readdirSync(infoDir).filter(f => f.endsWith('.json'));
  } catch { return []; }
  const cwdPosix = toPosix(cwdCandidates[0] || '');
  const active = [];
  for (const f of infoFiles) {
    const full = join(infoDir, f);
    const st = statSafe(full);
    if (!st || now - st.mtimeMs > windowMs) continue;
    active.push({ full, sessionId: f.replace(/\.json$/, ''), mtimeMs: st.mtimeMs });
  }
  active.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const entries = [];
  for (const a of active.slice(0, 3)) {
    // cwd 包含匹配（原文本容错：原分隔符 / 正斜杠 / JSON 转义双反斜杠三形态命中其一即可）
    let text = '';
    try { text = readFileSync(a.full, 'utf8'); } catch { continue; }
    const cwds = cwdCandidates.filter(Boolean);
    const hit = cwds.some(c => text.includes(c) || text.includes(toPosix(c))
      || text.includes(JSON.stringify(c).slice(1, -1)));
    if (!hit) continue;
    entries.push({
      harness: 'opencode', format: 'opencode-session-json-tree', detected_via: 'opencode-session-info-cwd',
      // 会话内容分散在 info/message/part 三棵子树，log_path 指向 session/ 根（平台侧按 format 遍历）
      log_path: toPosix(sessionRoot), agent_cwd: cwdPosix,
      session_id: a.sessionId, originator: null,
      mtime_ms: a.mtimeMs,
    });
    break; // 同根目录只登一条（log_path 相同），session_id 取最新命中会话
  }
  return entries;
}

/**
 * 探测器注册表。tier 语义：
 *   - precise：cwd/env 精确归属（claude-code / codex / zcode / pi / deepseek-dsh），恒参与；
 *   - loose：无归属线索（cursor / opencode），**仅在 precise 全落空时启用**——
 *     防「Cursor IDE 在别的项目聊天 / 其他项目 opencode 会话活跃」被误报进当前登记。
 * 新增 CLI = 加一个探测器对象 + protocol 文档补布局与格式说明。
 */
const HARNESS_DETECTORS = [
  { name: 'claude-code', tier: 'precise', detect: detectClaudeCode },
  { name: 'codex', tier: 'precise', detect: detectCodex },
  { name: 'zcode', tier: 'precise', detect: detectZcode },
  { name: 'pi', tier: 'precise', detect: detectPi },
  { name: 'deepseek-dsh', tier: 'precise', detect: detectDsh },
  { name: 'cursor', tier: 'loose', detect: detectCursor },
  { name: 'opencode', tier: 'loose', detect: detectOpencode },
];

// ── 会话身份锚定器（2026-09-11-agent-log-attribution-refactor，D-001/D-008）──
//
// own 集合 = 本 run 所属 agent 会话的日志文件（锚定主会话 + zcode parent_id 子代理链）。
// 用途：① ctx 打标收敛——recordAgentLogInvocation 仅对 detected∩own 条目写 ctx/计数；
// ② 推送收敛（D-007）——push payload 只含 own 条目（留底仍全量）；③ 探测上限豁免
// （DG-17）——own 文件被 MAX_PER_HARNESS 裁剪或 cwd 等值过滤挤出 detected 时定向补收
// （zcode worktree 子代理 directory=worktree≠仓库根，绕过 cwd 等值过滤是主场景）。
// 宁缺毋滥（D-001）：锚定识别失败不打标，绝不用 cwd 猜测兜底打标。
// cursor/opencode（loose 档）无归属线索不锚定——不出现在 own 集，仅本地留底探测（DG-06）。
// anchor 对象与探测 entry 同构（除 mtime_ms 外字段一致），补收时只需补 stat。

/** env 覆盖（SILLYSPEC_AGENT_LOG 绝对路径）：显式指定 = 调用方负责正确性，恒视为 own。 */
function anchorEnvOverride(ctx) {
  const { cwdCandidates, env } = ctx;
  const override = env[AGENT_LOG_ENV_OVERRIDE];
  if (typeof override !== 'string' || !override.trim()) return [];
  const p = override.trim();
  if (!isAbsolute(p)) return [];
  return [{
    harness: 'env-override', format: p.endsWith('.jsonl') ? 'jsonl' : 'unknown', detected_via: 'env',
    log_path: toPosix(p), agent_cwd: toPosix(cwdCandidates[0] || ''),
    session_id: null, originator: null,
  }];
}

/**
 * claude-code 锚定：env CLAUDE_SESSION_ID → <claudeRoot>/projects/<slug(cwd)>/<sessionId>.jsonl
 * 精确（cwd 候选逐个试，命中存在的）；env 缺席/未命中回退 project 目录窗口内最新 mtime 的
 * jsonl（DG-07）。与探测同 env 门控（CLAUDECODE/CLAUDE_CODE_ENTRYPOINT）——不在 claude 会话
 * 内时不应认领其他窗口的会话文件。
 */
function anchorClaudeCode(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  if (!(env.CLAUDECODE === '1' || (typeof env.CLAUDE_CODE_ENTRYPOINT === 'string' && env.CLAUDE_CODE_ENTRYPOINT))) {
    return [];
  }
  const claudeRoot = env.CLAUDE_CONFIG_DIR || join(homeDir, '.claude');
  const projectsRoot = join(claudeRoot, 'projects');
  const sessionId = typeof env.CLAUDE_SESSION_ID === 'string' ? env.CLAUDE_SESSION_ID.trim() : '';
  if (sessionId) {
    for (const rawCwd of cwdCandidates) {
      if (!rawCwd) continue;
      const exact = join(projectsRoot, mungeClaudeProjectDir(rawCwd), `${sessionId}.jsonl`);
      if (!statSafe(exact)) continue;
      return [{
        harness: 'claude-code', format: 'claude-code-jsonl', detected_via: 'claude-code-own-anchor',
        log_path: toPosix(exact), agent_cwd: toPosix(rawCwd), session_id: sessionId, originator: null,
      }];
    }
  }
  // 回退：各 cwd 候选 project 目录内窗口内最新者（同一会话 transcript 只有一个，取全局最新）
  let best = null;
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const files = listActiveFiles(join(projectsRoot, mungeClaudeProjectDir(rawCwd)), { now, windowMs, limit: 1 });
    if (files.length && (!best || files[0].mtimeMs > best.mtimeMs)) best = { ...files[0], cwd: rawCwd };
  }
  if (!best) return [];
  return [{
    harness: 'claude-code', format: 'claude-code-jsonl', detected_via: 'claude-code-own-anchor',
    log_path: toPosix(best.full), agent_cwd: toPosix(best.cwd),
    session_id: best.name.replace(/\.jsonl$/, ''), originator: null,
  }];
}

/**
 * zcode 锚定主路径（D-008）：node:sqlite 只读 URI（mode=ro）开 ~/.zcode/cli/db/db.sqlite，
 * session 表取 directory==cwd 的最新主会话（time_updated desc；directory 实测存 Windows
 * 反斜杠原样，候选「原样/正斜杠归一/normCwd 归一」逐形态等值尝试，全 miss 再近期主会话
 * 扫描 + cwdsMatch 归一兜底——DG-16）+ parent_id==主会话 id 的全部子代理行（不比
 * directory——worktree TaskCard 子代理 directory=worktree≠仓库根）。
 * @returns {Array|null} anchor 列表（主会话 rollout 文件在才算命中）；null = 库不可用/无主会话，走回退链
 */
function anchorZcodeFromDb(ctx) {
  const { cwdCandidates, homeDir } = ctx;
  let db = null;
  try {
    let DatabaseSync = null;
    try {
      ({ DatabaseSync } = nodeRequire('node:sqlite'));
    } catch (e) {
      debugLog(`zcode 锚定回退（原因：node:sqlite 不可用: ${e && e.message ? e.message : e}）`);
      return null;
    }
    try {
      // 只读打开（file:...?mode=ro + readOnly，不写入不加锁不重试）；pathToFileURL 处理
      // Windows 反斜杠/盘符/特殊字符的 URI 编码
      db = new DatabaseSync(pathToFileURL(join(homeDir, '.zcode', 'cli', 'db', 'db.sqlite')).href + '?mode=ro', { readOnly: true });
    } catch (e) {
      debugLog(`zcode 锚定回退（原因：db.sqlite 打开失败: ${e && e.message ? e.message : e}）`);
      return null;
    }
    // 候选形态逐个等值尝试：原样 / 正斜杠归一 / normCwd 归一（DG-16——directory 实测存
    // Windows 反斜杠原样，但等值口径要对齐 cwdsMatch 的归一语义）；全部 miss 再用一次
    // 近期主会话扫描 + JS 侧 cwdsMatch 兜底（覆盖 db 侧大小写/分隔符形态差异）。
    const forms = [...new Set(cwdCandidates.flatMap(c => (c ? [c, toPosix(c), normCwd(c)] : [])))];
    for (const dirVal of forms) {
      let main = null;
      try {
        main = db.prepare("SELECT id, directory FROM session WHERE directory = ? AND parent_id IS NULL AND id NOT LIKE 'sess_subagent_agent_%' ORDER BY time_updated DESC LIMIT 1").get(dirVal);
      } catch (e) {
        debugLog(`zcode 锚定回退（原因：session 表查询失败: ${e && e.message ? e.message : e}）`);
        return null;
      }
      if (!main) continue;
      const anchored = anchorsForMainSession(db, homeDir, main);
      if (anchored) return anchored;
    }
    const scanned = matchMainSessionByNorm(db, cwdCandidates);
    if (scanned) {
      const anchored = anchorsForMainSession(db, homeDir, scanned);
      if (anchored) return anchored;
    }
    debugLog('zcode 锚定回退（原因：db 无该 cwd 的主会话行）');
    return null;
  } finally {
    if (db) { try { db.close(); } catch { /* best effort */ } }
  }
}

/** 近期主会话扫描 + cwdsMatch 归一匹配（形态等值全 miss 时的兜底，DG-16 归一口径）。 */
function matchMainSessionByNorm(db, cwdCandidates) {
  const cwds = cwdCandidates.filter(Boolean);
  if (cwds.length === 0) return null;
  try {
    for (const row of db.prepare("SELECT id, directory FROM session WHERE parent_id IS NULL AND id NOT LIKE 'sess_subagent_agent_%' ORDER BY time_updated DESC LIMIT 50").all()) {
      if (cwds.some(c => row.directory && cwdsMatch(c, row.directory))) return row;
    }
  } catch { /* 兜底扫描失败按未命中处理 */ }
  return null;
}

/**
 * 主会话行 → anchor 列表（主会话 rollout 文件在才算命中；附 parent_id 子代理链，
 * 子代理不比 directory——worktree TaskCard 子代理 directory=worktree≠仓库根）。
 * @returns {Array|null}
 */
function anchorsForMainSession(db, homeDir, main) {
  // session id → rollout 文件名映射（两形态通用）：sess_<x> / sess_subagent_agent_<x>
  // 都映射为 model-io-<id>.jsonl
  const anchorFor = (id, directory) => {
    const filePath = join(homeDir, '.zcode', 'cli', 'rollout', `model-io-${id}.jsonl`);
    if (!statSafe(filePath)) return null; // 行在但 rollout 已清理（实证存在）不算命中
    return {
      harness: 'zcode', format: 'zcode-model-io-jsonl', detected_via: 'zcode-own-anchor',
      log_path: toPosix(filePath), agent_cwd: toPosix(directory || ''),
      session_id: `model-io-${id}.jsonl`.replace(/^model-io-sess_/, '').replace(/\.jsonl$/, ''),
      originator: null,
    };
  };
  const mainAnchor = anchorFor(main.id, main.directory);
  if (!mainAnchor) return null; // 主文件不在 → 调用方试下一形态/走回退
  const anchors = [mainAnchor];
  try {
    for (const sub of db.prepare('SELECT id, directory FROM session WHERE parent_id = ?').all(main.id)) {
      const a = anchorFor(sub.id, sub.directory);
      if (a) anchors.push(a); // 子代理文件可能已清理，缺一个不少链
    }
  } catch { /* 子代理链查询失败按空链处理（主会话锚定不受影响，best-effort） */ }
  return anchors;
}

/**
 * zcode 锚定：与探测同 env 门控（ZCODE_*）——不在 zcode 会话内不认领 rollout 文件。
 * db 主路径命中即用；失败回退链（D-008）：rollout 目录窗口内主文件（排除 subagent 文件
 * 名）按 mtime 新→旧逐个过 cwd 校验——extractZcodeWorkdir 读首块工作目录标记与
 * cwdCandidates cwdsMatch（与探测同源同口径），标记读不出 fail-closed 跳过；取首个匹配，
 * 全不匹配返回空集不打标（宁缺毋滥——回退无 db 身份证据，绝不做无 cwd 校验的认领，
 * 否则多项目机器会把别的项目活跃会话错认成 own，复现 D-001 跨项目抢标）。子代理不打标，
 * debug 输出原因行。
 */
function anchorZcode(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  if (!(env.ZCODE_APP_VERSION || env.ZCODE_ENV || env.ZCODE_RUNTIME_ENV)) return [];
  const fromDb = anchorZcodeFromDb(ctx);
  if (fromDb) return fromDb;
  const rolloutDir = join(homeDir, '.zcode', 'cli', 'rollout');
  // 回退：仅主文件（model-io-sess_<uuid>.jsonl，排除 sess_subagent_agent_ 前缀），mtime 新→旧
  const active = listActiveFiles(rolloutDir, { now, windowMs, limit: 64 })
    .filter(f => !f.name.startsWith('model-io-sess_subagent_agent_'));
  if (active.length === 0) {
    debugLog('zcode 锚定回退：rollout 窗口内无主文件，own 为空（不打标）');
    return [];
  }
  for (const f of active) {
    const workdir = extractZcodeWorkdir(f.full);
    if (!workdir) continue; // 标记读不出 fail-closed（错认比漏认危害大，协议 §3 同口径）
    if (!cwdCandidates.some(c => c && cwdsMatch(c, workdir))) continue;
    debugLog(`zcode 锚定回退生效：rollout 主文件 cwd 匹配 ${f.name}（子代理不打标）`);
    return [{
      harness: 'zcode', format: 'zcode-model-io-jsonl', detected_via: 'zcode-own-anchor',
      log_path: toPosix(f.full), agent_cwd: toPosix(workdir),
      session_id: f.name.replace(/^model-io-sess_/, '').replace(/\.jsonl$/, ''),
      originator: null,
    }];
  }
  debugLog('zcode 锚定回退：窗口内主文件无一 cwd 匹配（含无标记跳过），own 为空（不打标）');
  return [];
}

/**
 * codex 锚定：与探测同口径扫描（今天/昨天 sessions 目录，首行 session_meta.cwd 与 cwd
 * 候选 cwdsMatch），取最新主文件一条（跨目录按 mtime 取最新——零点前后两个日期目录都
 * 可能持有活跃文件）。
 */
function anchorCodex(ctx) {
  const { cwdCandidates, env, homeDir, now, windowMs } = ctx;
  const codexHome = env.CODEX_HOME || join(homeDir, '.codex');
  const sessionsRoot = join(codexHome, 'sessions');
  if (!existsSync(sessionsRoot)) return [];
  const dayDirs = [new Date(now), new Date(now - 24 * 60 * 60 * 1000)]
    .map(d => join(sessionsRoot, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')));
  let best = null;
  for (const dir of [...new Set(dayDirs)]) {
    for (const f of listActiveFiles(dir, { now, windowMs, limit: MAX_PER_HARNESS })) {
      const meta = readFirstLineJson(f.full);
      const payload = meta && meta.type === 'session_meta' ? (meta.payload || {}) : {};
      if (!cwdCandidates.some(c => c && payload.cwd && cwdsMatch(c, payload.cwd))) continue;
      if (!best || f.mtimeMs > best.f.mtimeMs) best = { f, payload };
    }
  }
  if (!best) return [];
  return [{
    harness: 'codex', format: 'codex-rollout-jsonl', detected_via: 'codex-session-meta-cwd',
    log_path: toPosix(best.f.full), agent_cwd: toPosix(best.payload.cwd),
    session_id: typeof best.payload.session_id === 'string' ? best.payload.session_id : null,
    originator: typeof best.payload.originator === 'string' ? best.payload.originator : null,
  }];
}

/** pi 锚定：safePath 目录名即 cwd 编码（天然锚定），主文件恒为该目录 session.jsonl。 */
function anchorPi(ctx) {
  const { cwdCandidates, homeDir, now, windowMs } = ctx;
  const anchors = [];
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const sessionFile = join(homeDir, '.pi', 'agent', 'sessions', mungePiSafePath(rawCwd), 'session.jsonl');
    const st = statSafe(sessionFile);
    if (!st || now - st.mtimeMs > windowMs) continue;
    anchors.push({
      harness: 'pi', format: 'pi-session-jsonl', detected_via: 'pi-safe-path',
      log_path: toPosix(sessionFile), agent_cwd: toPosix(rawCwd), session_id: null, originator: null,
    });
  }
  return anchors;
}

/** dsh 锚定：同 pi 构 safePath 直算，取目录下最新活跃 session-<uuid>/session.jsonl.zstd。 */
function anchorDsh(ctx) {
  const { cwdCandidates, homeDir, now, windowMs } = ctx;
  const anchors = [];
  for (const rawCwd of cwdCandidates) {
    if (!rawCwd) continue;
    const projectDir = join(homeDir, '.dsh', 'sessions', mungeDshSafePath(rawCwd));
    let sessionDirs;
    try {
      sessionDirs = readdirSync(projectDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    } catch { continue; }
    let best = null;
    for (const name of sessionDirs) {
      const logFile = join(projectDir, name, 'session.jsonl.zstd');
      const st = statSafe(logFile);
      if (!st || now - st.mtimeMs > windowMs) continue;
      if (!best || st.mtimeMs > best.mtimeMs) best = { name, logFile, mtimeMs: st.mtimeMs };
    }
    if (!best) continue;
    anchors.push({
      harness: 'deepseek-dsh', format: 'dsh-session-jsonl-zstd', detected_via: 'dsh-safe-path',
      log_path: toPosix(best.logFile), agent_cwd: toPosix(rawCwd),
      session_id: best.name.replace(/^session-/, ''), originator: null,
    });
  }
  return anchors;
}

/** own anchor 全量解析（env 覆盖优先；cursor/opencode 不参与）。任何异常由调用方兜底。 */
function resolveOwnLogAnchors(ctx) {
  const anchors = [];
  for (const a of [
    ...anchorEnvOverride(ctx),
    ...anchorClaudeCode(ctx),
    ...anchorZcode(ctx),
    ...anchorCodex(ctx),
    ...anchorPi(ctx),
    ...anchorDsh(ctx),
  ]) {
    if (!anchors.some(x => x.log_path === a.log_path)) anchors.push(a);
  }
  return anchors;
}

/**
 * 解析本 run 的 own 日志文件集合（锚定主会话 + 子代理，posix log_path，与 ledger/push 同口径）。
 * 识别失败返回空集（仅回退主文件或空）——调用方据此不打标不推送（宁缺毋滥，D-001）。
 * @param {object} [opts] - 入参与 detectAgentLogEntries 对齐（cwdCandidates/env/homeDir/now/windowMs）
 * @returns {Set<string>} posix log_path 集合
 */
export function resolveOwnLogPaths({
  cwdCandidates = [],
  env = process.env,
  homeDir = homedir(),
  now = Date.now(),
  windowMs = ACTIVE_WINDOW_MS,
} = {}) {
  return new Set(resolveOwnLogAnchors({ cwdCandidates, env, homeDir, now, windowMs }).map(a => a.log_path));
}

/**
 * 探测当前驱动 CLI 的本地 agent 会话日志（纯读，不写盘）+ own 锚定。
 *
 * 常规探测照旧（cwd 等值过滤 + 单 harness 上限裁剪 + loose 压制）；其上叠加 own 豁免
 * （DG-17）：锚定命中但被裁剪/被 cwd 过滤挤出的 own 文件（zcode worktree 子代理为主场景）
 * 定向补收进 entries——own 不得漏推优先于 12 条总数上限。锚定本身 best-effort，任何异常
 * 按空 own 处理（探测结果不受影响）。
 *
 * @param {object} [opts] - 同 detectAgentLogEntries
 * @returns {{entries: Array, ownAnchors: Array}} entries 同 detectAgentLogEntries 返回形状；
 *   ownAnchors 与 entry 同构（无 mtime_ms）
 */
function detectAgentLogEntriesWithOwn({
  cwdCandidates = [],
  env = process.env,
  homeDir = homedir(),
  now = Date.now(),
  windowMs = ACTIVE_WINDOW_MS,
} = {}) {
  const entries = [];

  // ── 优先级 1：env 显式覆盖（绝对路径；相对路径忽略——产物里的路径必须可直接消费）──
  // 不依赖任何 harness 标记：daemon/用户最可靠的指定通道（其他 CLI 一律走这条路）
  const override = env[AGENT_LOG_ENV_OVERRIDE];
  if (typeof override === 'string' && override.trim()) {
    const p = override.trim();
    if (isAbsolute(p)) {
      entries.push({
        harness: 'env-override', format: p.endsWith('.jsonl') ? 'jsonl' : 'unknown',
        detected_via: 'env',
        log_path: toPosix(p), agent_cwd: toPosix(cwdCandidates[0] || ''),
        session_id: null, originator: null,
        mtime_ms: statSafe(p)?.mtimeMs ?? null,
      });
    } else {
      debugLog(`${AGENT_LOG_ENV_OVERRIDE} 非绝对路径，忽略: ${p}`);
    }
  }

  // ── 优先级 2：已登记 harness 自动探测（precise 恒参与；loose 仅在 precise 全落空时启用）──
  const ctx = { cwdCandidates, env, homeDir, now, windowMs };
  let preciseFound = false;
  for (const h of HARNESS_DETECTORS) {
    if (h.tier === 'loose' && preciseFound) continue;
    try {
      const found = h.detect(ctx);
      if (found.length > 0) {
        entries.push(...found);
        if (h.tier === 'precise') preciseFound = true;
      }
    } catch (e) {
      debugLog(`${h.name} 探测异常（跳过）: ${e && e.message ? e.message : e}`);
    }
  }

  entries.sort((a, b) => (b.mtime_ms ?? 0) - (a.mtime_ms ?? 0));
  const capped = entries.slice(0, 12);

  // ── own 豁免补收（DG-17）：own 集合中不在 entries 的文件（被上限挤出/被 cwd 等值过滤，
  // 如 directory=worktree 的 zcode 子代理）定向补收；own 不漏推优先于 12 条上限 ──
  let ownAnchors = [];
  try {
    ownAnchors = resolveOwnLogAnchors(ctx);
  } catch (e) {
    debugLog(`own 锚定异常（按空 own 处理）: ${e && e.message ? e.message : e}`);
  }
  const seen = new Set(capped.map(e => e.log_path));
  for (const a of ownAnchors) {
    if (seen.has(a.log_path)) continue;
    const st = statSafe(a.log_path);
    if (!st) continue;
    capped.push({ ...a, mtime_ms: st.mtimeMs });
  }
  return { entries: capped, ownAnchors };
}

/**
 * 探测当前驱动 CLI 的本地 agent 会话日志（纯读，不写盘）。
 *
 * @param {object} [opts]
 * @param {string[]} [opts.cwdCandidates] - agent 可能的 cwd 列表（CLI 原始 cwd + 纠正后项目根；
 *   agent 在子目录启动时部分 harness 日志挂在子目录维度，两者都探）
 * @param {object}   [opts.env]       - 默认 process.env（可注入测试）
 * @param {string}   [opts.homeDir]   - 默认 homedir()（可注入测试）
 * @param {number}   [opts.now]       - 默认 Date.now()（可注入测试）
 * @param {number}   [opts.windowMs]  - 活跃窗口，默认 15min
 * @returns {Array<{harness:string, log_path:string, format:string, detected_via:string,
 *   agent_cwd:string, session_id:string|null, originator:string|null, mtime_ms:number|null}>}
 *   探测结果（mtime_ms 新→旧，含 own 豁免补收条目）；空数组 = 未探测到（不在 agent 环境或无活跃会话）
 */
export function detectAgentLogEntries(opts) {
  return detectAgentLogEntriesWithOwn(opts).entries;
}

/**
 * 读 agent 日志上报配置（与进度同步 quicklog 推送同风格，自带轻量 local.yaml 解析，
 * 不 import sync.js 防拖 ProgressManager 重链）。
 *
 * 优先级：env SILLYHUB_PLATFORM_URL + SILLYHUB_PLATFORM_TOKEN（两键齐全才生效——
 * 预留的外部注入通道，daemon 未实现注入、需显式 export；平台模式 specRoot 的
 * local.yaml 无 platform 段时本就无凭据可上报，勿指望 env 兜底）>
 * specBase/local.yaml platform 段（url + token，与链路 A 同源）。
 * @returns {{url:string, token:string}|null} 未配置返回 null（合法状态，静默跳过上报）
 */
function readPlatformPushConfig(specBase, env = process.env) {
  if (env.SILLYHUB_PLATFORM_URL && env.SILLYHUB_PLATFORM_TOKEN) {
    return { url: env.SILLYHUB_PLATFORM_URL, token: env.SILLYHUB_PLATFORM_TOKEN };
  }
  try {
    const yamlPath = join(specBase, 'local.yaml');
    if (!existsSync(yamlPath)) return null;
    const lines = readFileSync(yamlPath, 'utf8').split(/\r?\n/);
    let inPlatform = false;
    const cfg = {};
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      if (!/^\s/.test(line)) inPlatform = line.startsWith('platform:');
      else if (inPlatform) {
        const m = line.match(/^\s+(url|token)\s*:\s*(.*)$/);
        if (m) {
          let v = m[2].trim();
          if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
          if (v) cfg[m[1]] = v;
        }
      }
    }
    if (!cfg.url || !cfg.token) return null;
    return cfg;
  } catch {
    return null;
  }
}

/**
 * 上报 agent 日志登记到平台：POST {url}/api/agent-logs（Bearer platform token）。
 * 平台端落库后在会话视图展示；内容解析由平台/daemon 按路径读本地文件完成。
 * best-effort：无配置静默跳过；网络/非 2xx/超时 warn 一行不抛（本地产物已落盘兜底）。
 * @param {object} p
 * @param {string} p.specBase - local.yaml 所在 spec 基路径
 * @param {object} [p.env]    - env（默认 process.env；测试注入用）
 * @param {object} p.payload  - 上报 body（见 protocol 文档 §3）
 * @returns {Promise<{pushed:boolean|null, reason?:string}>} pushed=null 表示未配置/被禁用
 */
async function pushAgentLogToPlatform({ specBase, env = process.env, payload }) {
  if (env.SILLYSPEC_AGENT_LOG_PUSH === '0') {
    debugLog('SILLYSPEC_AGENT_LOG_PUSH=0，上报关闭');
    return { pushed: null, reason: 'disabled' };
  }
  const cfg = readPlatformPushConfig(specBase, env);
  if (!cfg) {
    debugLog('未配置 platform 段/env（未连接平台，合法状态），跳过上报');
    return { pushed: null, reason: 'no-config' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/api/agent-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[agent-log-push] → HTTP ${res.status}（本地产物已落盘兜底，不影响主流程）`);
      return { pushed: false, reason: `http-${res.status}` };
    }
    return { pushed: true };
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? '超时' : (err && err.message ? err.message : err);
    console.warn(`[agent-log-push] 上报失败: ${msg}（本地产物已落盘兜底）`);
    return { pushed: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 读 agent-session-log.json 产物（不存在/损坏返回 null）。
 * @param {string} runtimeRoot - .runtime 根目录（resolveRuntimeRoot 的返回值）
 * @returns {object|null}
 */
export function readAgentLogArtifact(runtimeRoot) {
  const p = join(runtimeRoot, AGENT_LOG_ARTIFACT_FILENAME);
  if (!existsSync(p)) return null;
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    debugLog(`产物损坏，按无产物处理: ${p}`);
    return null;
  }
}

/**
 * 登记 agent 会话日志路径进 <runtimeRoot>/agent-session-log.json（run 命令入口调用）。
 *
 * 合并语义：按 log_path 去重——同路径 invocations+1 / 刷新 last_seen_at 与文件 stat；
 * 新路径追加；entries 按 last_seen_at 新→旧排序（同毫秒平局按 seq 登记序决胜），
 * 上限 10 条（超出淘汰最旧）。
 * 探测不到（非 agent 环境）不写盘不上报。全程 best-effort：失败 warn 一行返回 null 不抛。
 * 落盘后立即 REST 上报平台（POST /api/agent-logs，主通道），上报失败本地产物兜底。
 *
 * @param {object} p
 * @param {string}   p.cwd          - CLI 当前 cwd（项目根；平台模式 = source root）
 * @param {string}   [p.invokedCwd] - CLI 原始 cwd（cwd 纠正前；agent 子目录启动时探测用）
 * @param {object}   [p.platformOpts] - 平台参数（workspaceId/scanRunId 进产物元信息）
 * @param {string}   p.specBase     - 规范基路径（本地模式 cwd/.sillyspec；平台模式 specRoot）
 * @param {string}   [p.command]    - 触发登记的命令描述（flag 名级，不含 flag 值）
 * @param {object}   [p.context]    - 会话化上下文（2026-08-23-agent-activity-sessions，可选）：
 *   {hubSessionId, changeKey, quickId}——hubSessionId 为 body 级（run 所属平台会话唯一，
 *   daemon 注入 env SILLYHUB_SESSION_ID 的兜底也在此读取）；changeKey/quickId 为 entry 级，
 *   仅写入本 run own 条目（D-001 会话身份锚定：锚定主会话+子代理，非 own 只留底不被改写），
 *   双向互斥（D-006@v2：quick run 清 change_key，change run 清 quick_id；两键皆空 keep-prev）。
 *   缺省全不带。
 * @param {object}   [p.env]        - 探测用 env（默认 process.env；测试注入用）
 * @param {string}   [p.homeDir]    - 探测用 home（默认 homedir()；测试注入用）
 * @param {number}   [p.now]        - 探测用时钟（默认 Date.now()；测试注入用）
 * @param {number}   [p.windowMs]   - 活跃窗口（默认 15min）
 * @returns {Promise<{artifactPath:string, detected:number, latestLogPath:string|null, isNew:boolean, pushed:boolean|null}|null>}
 *   null = 未探测到 / 失败（调用方无需区分）
 */
export async function recordAgentLogInvocation({ cwd, invokedCwd, platformOpts = {}, specBase, command, context = {}, env, homeDir, now, windowMs } = {}) {
  try {
    if (!cwd || !specBase) return null;
    const cwdCandidates = [...new Set([invokedCwd, cwd].filter(Boolean))];
    const { entries: detected, ownAnchors } = detectAgentLogEntriesWithOwn({ cwdCandidates, env, homeDir, now, windowMs });
    if (detected.length === 0) return null;
    // own 集合（D-001 会话身份锚定）：仅 detected∩own 条目写 ctx/计数/推送；锚定识别
    // 失败为空集 → 只留底不归属（宁缺毋滥）
    const ownPaths = new Set(ownAnchors.map(a => a.log_path));

    // 会话化上下文（best-effort 消毒，解析失败不带）：entry 级 ctx（changeKey/quickId）随
    // 检出/更新该 entry 的本次 run 持久化；hubSessionId 为 body 级——context 显式传入优先，
    // 缺省回落 env SILLYHUB_SESSION_ID（daemon 派发平台会话时的注入通道，见 protocol 文档 §1）。
    const hubSessionId = pickCtxId(context.hubSessionId) || pickCtxId((env || process.env).SILLYHUB_SESSION_ID);
    const ctxChangeKey = pickCtxId(context.changeKey);
    const ctxQuickId = pickCtxId(context.quickId);

    const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase);
    const artifactPath = join(runtimeRoot, AGENT_LOG_ARTIFACT_FILENAME);
    const nowIso = new Date().toISOString();

    // 读-改-写按文件锁串行化（BUG-17 同款口径：多会话并发 run 时防互相覆盖丢条目）
    const merged = await withFileLock(`${artifactPath}.lock`, () => {
      const existing = readAgentLogArtifact(runtimeRoot);
      const byPath = new Map((existing?.entries || []).map(e => [e.log_path, e]));

      // 平局决胜序号：last_seen_at 是毫秒精度 ISO，快机器上连续登记落在同一毫秒打平，
      // 稳定排序会让旧条目留在首位（latestLogPath 假"未更新"）。seq 按登记触及顺序单调
      // 递增并随条目持久化，平局时后触及者胜（存量产物无 seq 视为 0，老条目间次序不变）。
      let seq = (existing?.entries || []).reduce((m, e) => Math.max(m, Number(e.seq) || 0), 0);

      for (const det of detected) {
        const st = statSafe(det.log_path);
        const prev = byPath.get(det.log_path);
        // 非 own 条目（D-001 打标收敛）：只留底探测事实（exists/size/mtime 刷新），ctx/计数/
        // 时间戳/last_command 全部 keep-prev 不动——同 cwd 活跃窗口内他人会话的日志不被本
        // run 改写归属（FR-01/FR-06）。新见的非 own 条目也入留底（本地可见性不变），不计数。
        if (!ownPaths.has(det.log_path)) {
          byPath.set(det.log_path, prev ? {
            ...prev,
            exists: Boolean(st),
            size_bytes: st ? st.size : null,
            mtime_ms: st ? st.mtimeMs : (det.mtime_ms ?? null),
          } : {
            harness: det.harness,
            log_path: det.log_path,
            format: det.format,
            detected_via: det.detected_via,
            agent_cwd: det.agent_cwd,
            session_id: det.session_id ?? null,
            originator: det.originator ?? null,
            change_key: null,
            quick_id: null,
            exists: Boolean(st),
            size_bytes: st ? st.size : null,
            mtime_ms: st ? st.mtimeMs : (det.mtime_ms ?? null),
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            invocations: 0,
            last_command: null,
            seq: ++seq,
          });
          continue;
        }
        // own 条目：entry 级 ctx 双向互斥（D-006@v2）——quick run 置 quick_id 且清空
        // change_key；change run 置 change_key 且清空 quick_id（单向清会留镜像键，change
        // 日志漏进旧 quick 会话）；两键皆空的 run（如 status）keep-prev 保留原值。
        let nextChangeKey;
        let nextQuickId;
        if (ctxQuickId) {
          nextQuickId = ctxQuickId;
          nextChangeKey = null;
        } else if (ctxChangeKey) {
          nextChangeKey = ctxChangeKey;
          nextQuickId = null;
        } else {
          nextChangeKey = prev?.change_key ?? null;
          nextQuickId = prev?.quick_id ?? null;
        }
        byPath.set(det.log_path, {
          ...(prev || {}),
          harness: det.harness,
          log_path: det.log_path,
          format: det.format,
          detected_via: det.detected_via,
          agent_cwd: det.agent_cwd,
          session_id: det.session_id ?? prev?.session_id ?? null,
          originator: det.originator ?? prev?.originator ?? null,
          change_key: nextChangeKey,
          quick_id: nextQuickId,
          exists: Boolean(st),
          size_bytes: st ? st.size : null,
          mtime_ms: st ? st.mtimeMs : (det.mtime_ms ?? null),
          first_seen_at: prev?.first_seen_at || nowIso,
          last_seen_at: nowIso,
          invocations: (prev?.invocations || 0) + 1,
          last_command: command || null,
          seq: ++seq,
        });
      }

      const entries = [...byPath.values()]
        .sort((a, b) => (b.last_seen_at || '').localeCompare(a.last_seen_at || '') || ((b.seq || 0) - (a.seq || 0)))
        .slice(0, MAX_ENTRIES);

      const artifact = {
        schema_version: AGENT_LOG_SCHEMA_VERSION,
        generated_at: nowIso,
        agent_cwd: toPosix(invokedCwd || cwd),
        workspace_id: platformOpts.workspaceId ?? null,
        scan_run_id: platformOpts.scanRunId ?? null,
        entries,
      };
      mkdirSync(runtimeRoot, { recursive: true });
      writeAtomicSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n');
      return { entries, prevLatest: existing?.entries?.[0]?.log_path || null };
    }, { timeoutMs: MERGE_LOCK_TIMEOUT_MS });

    const latest = merged.entries[0] || null;
    const isNew = Boolean(latest && latest.log_path !== merged.prevLatest);

    // 上报平台（主通道，与进度上报同风格；失败本地产物兜底）。不受平台模式 sentinel
    // 限制——进度同步在平台模式跳过是因为 daemon 有自有进度链路，agent 日志没有。
    // 推送收敛（D-007）：payload 只含本 run own 条目（按 log_path 过滤，非 own 不进任何
    // 推送——hub 会话不再把共享留底里别人的条目整批挂走）；留底产物已写全量（上方
    // merged.entries，本地 sillyspec agent-log 可见性不变）；own 留底条目为空不发请求。
    const payloadEntries = merged.entries.filter(e => ownPaths.has(e.log_path));
    let push = { pushed: null, reason: 'no-own-entries' };
    if (payloadEntries.length > 0) {
      push = await pushAgentLogToPlatform({
        specBase,
        env: env || process.env,
        payload: {
          schema_version: AGENT_LOG_SCHEMA_VERSION,
          pushed_at: nowIso,
          agent_cwd: toPosix(invokedCwd || cwd),
          workspace_id: platformOpts.workspaceId ?? null,
          scan_run_id: platformOpts.scanRunId ?? null,
          // body 级会话关联键（run 所属平台会话唯一；非空才带，schema_version 保持 1 纯可选增量）
          ...(hubSessionId ? { hub_session_id: hubSessionId } : {}),
          // entries 各自带 entry 级 ctx（change_key/quick_id，随 entry 持久化的原值或本次 run 的新值）
          entries: payloadEntries,
        },
      });
    } else {
      debugLog('无 own 留底条目（D-007 推送收敛），跳过上报');
    }

    return {
      artifactPath: toPosix(artifactPath),
      detected: detected.length,
      latestLogPath: latest ? latest.log_path : null,
      isNew,
      pushed: push.pushed,
    };
  } catch (e) {
    console.warn(`[agent-log] 登记失败（忽略，不影响主流程）: ${e && e.message ? e.message : e}`);
    return null;
  }
}

/**
 * 解析 agent-session-log.json 产物路径的落点（查询命令用；与写入侧同口径）。
 *
 * 优先级：平台指针（cwd/.sillyspec-platform.json 的 runtimeRoot/specRoot）> 显式 specDir
 * > 本地 cwd/.sillyspec。runtimeRoot 缺省回落 <specRoot>/.runtime（对齐 resolveRuntimeRoot）。
 * @returns {{artifactPath: string, runtimeRoot: string, restored: boolean}}
 */
export function resolveAgentLogArtifactPath({ cwd, specDir } = {}) {
  let runtimeRoot = null;
  let restored = false;
  if (cwd) {
    try {
      const pointerPath = join(cwd, '.sillyspec-platform.json');
      if (existsSync(pointerPath)) {
        const saved = JSON.parse(readFileSync(pointerPath, 'utf8'));
        if (saved.runtimeRoot) {
          runtimeRoot = saved.runtimeRoot;
          restored = true;
        } else if (saved.specRoot) {
          runtimeRoot = join(saved.specRoot, '.runtime');
          restored = true;
        }
      }
    } catch { /* 指针损坏按本地模式处理 */ }
  }
  if (!runtimeRoot) {
    const specBase = specDir || join(cwd || process.cwd(), '.sillyspec');
    runtimeRoot = join(specBase, '.runtime');
  }
  return { artifactPath: join(runtimeRoot, AGENT_LOG_ARTIFACT_FILENAME), runtimeRoot, restored };
}

/**
 * `sillyspec agent-log` 查询命令实现（index.js case 'agent-log' 薄封装）。
 *
 * 默认读产物展示；--detect 现场探测（不写盘）。--json 输出纯 JSON（stdout 无其他内容）。
 * @param {string[]} subArgs - 'agent-log' 之后的参数
 * @param {object} opts - { json, cwd, specDir }
 */
export async function cmdAgentLog(subArgs, { json = false, cwd = process.cwd(), specDir = null } = {}) {
  const detectOnly = subArgs.includes('--detect');
  if (detectOnly) {
    const detected = detectAgentLogEntries({ cwdCandidates: [cwd] });
    if (json) {
      console.log(JSON.stringify({ detected }, null, 2));
      return;
    }
    if (detected.length === 0) {
      console.log('📭 未探测到本地 agent 会话日志。');
      console.log('   支持: Claude Code / Codex / ZCode 自动探测；其他 CLI 用 SILLYSPEC_AGENT_LOG=<日志绝对路径> 显式指定。');
      return;
    }
    console.log(`🔍 现场探测到 ${detected.length} 条 agent 日志：`);
    for (const d of detected) {
      console.log(`   📄 ${d.log_path}`);
      console.log(`      ${d.harness} / ${d.format} / via=${d.detected_via}${d.session_id ? ` / session=${d.session_id}` : ''}${d.originator ? ` / originator=${d.originator}` : ''}`);
    }
    return;
  }

  const { artifactPath, runtimeRoot, restored } = resolveAgentLogArtifactPath({ cwd, specDir });
  const artifact = readAgentLogArtifact(runtimeRoot);
  if (json) {
    console.log(JSON.stringify({ artifact_path: toPosix(artifactPath), platform_restored: restored, artifact }, null, 2));
    return;
  }
  if (!artifact || !Array.isArray(artifact.entries) || artifact.entries.length === 0) {
    console.log(`📭 无 agent 日志登记产物（${toPosix(artifactPath)}）。`);
    console.log('   run <stage> 命令在 agent 环境内执行时自动登记；或用 agent-log --detect 现场探测。');
    return;
  }
  console.log(`📄 本地 agent 会话日志登记（${toPosix(artifactPath)}，${artifact.entries.length} 条）`);
  if (artifact.workspace_id || artifact.scan_run_id) {
    console.log(`   workspace=${artifact.workspace_id || '-'} scan_run=${artifact.scan_run_id || '-'}`);
  }
  for (const e of artifact.entries) {
    const state = e.exists ? '✅' : '⚠️（文件已不存在）';
    console.log(`   ${state} ${e.log_path}`);
    const meta = [e.harness, e.format, e.session_id ? `session=${e.session_id}` : null, e.originator ? `originator=${e.originator}` : null]
      .filter(Boolean).join(' / ');
    console.log(`      ${meta} / 见过 ${e.invocations} 次 / 最近 ${e.last_seen_at}${e.last_command ? ` / ${e.last_command}` : ''}`);
  }
  console.log('   协议: docs/platform-agent-log-protocol.md（run 命令自动 REST 上报平台 POST /api/agent-logs；此产物为本地留底）');
}
