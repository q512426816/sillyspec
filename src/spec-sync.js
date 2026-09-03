/**
 * CLI 直跑 spec 文件增量同步模块。
 *
 * Change 2026-08-17-spec-file-incremental-sync：daemon↔后端已有增量同步协议，但 CLI
 * 直跑场景（本地 agent 直接跑 sillyspec 无 daemon）只有四件套直推到 documents 列。
 * 本模块补齐 CLI 直跑的文件树增量同步：以服务器清单为锚，walk/hash/diff 后只推送
 * 变化文件（add/update/delete/rename），无差异时短路不发请求。
 *
 * 复用 daemon 已验证的排除口径（UPLOAD_EXCLUDE_TOP_BASE / UPLOAD_PRUNE_NAMES_BASE），
 * 与 daemon 共用同一套清单语义（base_version 乐观锁、conflict 提示但不阻塞）。
 *
 * 并行会话 fail-closed 护栏（computeSpecOps 空树/changes 整删守卫 + filterStaleUpdates
 * 旧副本回推守卫）：共享同一平台工作空间的多会话/多机场景下，错锚或滞后本地的破坏性
 * ops（整删 changes/、旧版内容回推）在发出前拦下——服务器侧一旦被破坏会经同步链路
 * 落地回各端本地（2026-08-26/27 两次实证）。
 */

import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative, sep } from 'path';

// 与 sillyhub-daemon/src/spec-sync.ts 共用排除口径（task-07 / FR-06 / D-008@v2）：
// .runtime（有点）/ runtime（无点）/ projects（本地环境文件）在顶层排除；
// worktrees 在任意深度按 basename 剪枝（可能嵌在 .runtime/worktrees 下）。
const UPLOAD_EXCLUDE_TOP_BASE = new Set(['.runtime', 'runtime', 'projects']);
const UPLOAD_PRUNE_NAMES_BASE = new Set(['worktrees']);
// ql-20260818-002：local.yaml 是本机连接配置（platform/mcp 段含 shpsync_ token），
// 不上传——与服务器侧过滤（backend spec_workspace SERVER_EXCLUDED_FILENAMES）双侧
// 对齐。服务器清单残留 local.yaml 行时，本地 walk 不含它 → 生成 delete op，
// 服务器放行 delete 清存量（token 不落 landing 树、不随 bundle 跨机分发）。
const UPLOAD_EXCLUDE_FILENAMES = new Set(['local.yaml']);

function isUploadExcludedPath(relPath) {
  const segs = relPath.split('/');
  if (UPLOAD_EXCLUDE_TOP_BASE.has(segs[0] ?? '')) return true;
  if (UPLOAD_EXCLUDE_FILENAMES.has(segs[segs.length - 1] ?? '')) return true;
  return segs.some((s) => UPLOAD_PRUNE_NAMES_BASE.has(s));
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function debugLog(msg) {
  if (process.env.SILLYSPEC_DEBUG_SYNC) console.warn(msg);
}

function _hashBuffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * 单遍 walk 本地 .sillyspec 树。
 *
 * 返回 { path, absPath, mtimeMs } 列表；path 已统一为 POSIX。
 * 不收集目录项（只关心文件）；命中排除规则的路径直接跳过不递归。
 */
export function walkSpecTree(specRoot) {
  const out = [];
  if (!existsSync(specRoot)) return out;

  function recurse(dir) {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const abs = join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      const relToRoot = toPosix(relative(specRoot, abs));
      if (isUploadExcludedPath(relToRoot)) continue;
      // pruneNames：任意深度按 basename 命中即不收集/不递归
      if (UPLOAD_PRUNE_NAMES_BASE.has(name)) continue;

      if (st.isDirectory()) {
        recurse(abs);
      } else if (st.isFile()) {
        out.push({ path: relToRoot, absPath: abs, mtimeMs: st.mtimeMs });
      }
      // symlink / 其他：跳过
    }
  }

  recurse(specRoot);
  return out;
}

/**
 * 计算本地文件哈希。
 *
 * 返回 { path, hash, mtime, absPath }（mtime 为 Unix 秒，供 os.utime；absPath
 * 保留给 computeSpecOps 读 content 用，避免按相对路径回退错位）。
 */
export function hashFiles(entries) {
  return entries.map((e) => {
    const buf = readFileSync(e.absPath);
    return {
      path: e.path,
      hash: _hashBuffer(buf),
      mtime: Math.floor(e.mtimeMs / 1000),
      absPath: e.absPath,
    };
  });
}

/**
 * 根据服务器清单与本地文件差异生成 FileOp[]。
 *
 * 服务器清单格式：{ [path]: { hash, version, exists } }
 * 本地文件格式：hashFiles 结果 { path, hash, mtime }
 *
 * 规则（与 daemon computeIncrementalOps 对齐）：
 * - 本地有、服务器无 → add（base_version=0）
 * - 服务器有 exists=true、本地无 → delete（base_version=服务器 version）
 * - 服务器有 exists=false、本地无 → 不生成 delete（已软删）
 * - 同路径 hash 不同 → update（base_version=服务器 version）
 * - 服务器旧路径有、本地新路径有且 hash 相同 → rename（base_version=服务器旧路径 version）
 */
export function computeSpecOps(serverManifest, localFiles) {
  const server = serverManifest || {};
  const localMap = new Map(localFiles.map((f) => [f.path, f]));
  const localSet = new Set(localMap.keys());

  // 只拿服务器 exists=true 的行参与 diff；exists=false 视为已删除，不生成 delete
  const serverPaths = Object.keys(server).filter((p) => server[p]?.exists !== false);
  const serverSet = new Set(serverPaths);

  // fail-closed 护栏（2026-08-20 全量体检 BUG-01）：本地树为空而服务器非空时，
  // 全量 delete 几乎必然是「锚错了目录」（如平台模式 cwd/.sillyspec 只剩 local.yaml
  // 被 walk 排除），而不是用户真的删光了所有文件——一旦发出就是服务器整树清空。
  // 唯一放行：服务器只剩 local.yaml 存量（顶层单文件），保留「delete 清 token 存量」
  // 的既定语义（见 UPLOAD_EXCLUDE_FILENAMES 注释）。真实清空需求需本地树非空逐轮收敛。
  const nonTrivialServer = serverPaths.filter((p) => p !== 'local.yaml');
  if (localFiles.length === 0 && nonTrivialServer.length > 0) {
    console.warn(
      `[spec-sync] 本地 spec 树为空但服务器有 ${serverPaths.length} 个文件，跳过同步（防误清空；请检查 spec 目录锚点）`
    );
    return [];
  }

  // 并行会话护栏（坑 spec-sync-parallel-changes-wipe，2026-08-26/27 两次实证：平台同步
  // 删整个 changes 目录）：本地树非空但 changes/ 子树一个文件都没有、服务器却有——
  // 几乎必然是错锚/新机未先落地，而非用户真删光了所有变更（archive 是移动不是清空）。
  // 放行即服务器 changes/ 整树清空，再经 daemon/对端同步落地回本地（破坏本地）。
  // 逐个变更目录的合法删除不受影响（本地仍有其他 changes/ 文件时不触发本护栏）。
  const serverChanges = serverPaths.filter((p) => p.startsWith('changes/'));
  const localChanges = localFiles.filter((f) => f.path.startsWith('changes/'));
  if (localFiles.length > 0 && serverChanges.length > 0 && localChanges.length === 0) {
    console.warn(
      `[spec-sync] 本地 spec 树无 changes/ 文件但服务器有 ${serverChanges.length} 个，跳过同步（防并行会话/错锚整删 changes/；请检查 spec 目录锚点，新环境先完成平台侧文件落地）`
    );
    return [];
  }

  // rename 检测：旧路径（服务器有、本地无）↔ 新路径（本地有、服务器无）hash 相同
  const renames = [];
  const consumedNew = new Set();
  for (const oldPath of serverPaths) {
    if (localSet.has(oldPath)) continue;
    const cachedEntry = server[oldPath];
    for (const newPath of localMap.keys()) {
      if (serverSet.has(newPath)) continue;
      if (consumedNew.has(newPath)) continue;
      if (localMap.get(newPath).hash === cachedEntry.hash) {
        renames.push({ oldPath, newPath });
        consumedNew.add(newPath);
        break;
      }
    }
  }
  const renamedOld = new Set(renames.map((r) => r.oldPath));
  const renamedNew = new Set(renames.map((r) => r.newPath));

  const ops = [];

  for (const r of renames) {
    ops.push({
      op: 'rename',
      path: r.oldPath,
      new_path: r.newPath,
      base_version: server[r.oldPath].version,
    });
  }

  for (const p of serverPaths) {
    if (renamedOld.has(p)) continue;
    if (localSet.has(p)) {
      const localEntry = localMap.get(p);
      if (localEntry.hash !== server[p].hash) {
        const content = readFileSync(localEntry.absPath ?? join('.', p)).toString('base64');
        ops.push({
          op: 'update',
          path: p,
          hash: localEntry.hash,
          content,
          base_version: server[p].version,
          mtime: localEntry.mtime,
        });
      }
    } else {
      ops.push({
        op: 'delete',
        path: p,
        base_version: server[p].version,
      });
    }
  }

  for (const p of localMap.keys()) {
    if (renamedNew.has(p)) continue;
    if (!serverSet.has(p)) {
      const localEntry = localMap.get(p);
      const content = readFileSync(localEntry.absPath ?? join('.', p)).toString('base64');
      ops.push({
        op: 'add',
        path: p,
        hash: localEntry.hash,
        content,
        base_version: 0,
        mtime: localEntry.mtime,
      });
    }
  }

  return ops;
}

/**
 * 从 ops 提取本次涉及的变更目录名集合（change_dirs 标注，D-005@v1）。
 *
 * 对每个 op 的 path（rename 含新旧 path），取 `changes/<name>/` 或
 * `changes/archive/<name>/` 前缀分组的 key（去掉前缀、取第一段目录名），去重。
 * 非 changes 前缀路径不进结果。best-effort，失败降级 []。
 */
export function extractChangeDirs(ops) {
  const dirs = new Set();
  for (const op of ops) {
    collectChangeDir(dirs, op.path);
    if (op.new_path) collectChangeDir(dirs, op.new_path);
  }
  return [...dirs];
}

function collectChangeDir(dirs, p) {
  const norm = p.split(/[\\/]/).join('/');
  let rest = null;
  if (norm.startsWith('changes/')) {
    rest = norm.slice('changes/'.length);
  } else if (norm.startsWith('changes\\')) {
    rest = norm.slice('changes\\'.length).replace(/\\/g, '/');
  }
  if (!rest) return;

  if (rest.startsWith('archive/')) {
    rest = rest.slice('archive/'.length);
  }
  const first = rest.split('/', 1)[0];
  if (first && first !== 'archive' && !first.includes('/')) {
    dirs.add(first);
  }
}

/**
 * 过滤「旧副本回推」型 update op（坑 spec-sync-parallel-stale-overwrite，2026-08-26/27
 * 两次实证：平台同步把本地文件覆盖回旧版）。
 *
 * 判据：本地文件 mtime 早于上次成功同步（mtime + 1s 缓冲）= 该文件自上次同步后本地从未
 * 改动——此刻服务器 hash 却不同，只可能是他者会话/他机推进了服务器内容。本地这份是旧
 * 副本，照推 update 就是把服务器内容回退到旧版（再经 daemon/对端落地破坏各端本地）。
 * 本地改过的文件（mtime 晚于上次同步）不受影响，正常 last-writer-wins。
 *
 * 被滤掉的文件如确需以本地为准覆盖服务器：本地重存（touch/再编辑）后重推。
 *
 * @param {Array} ops computeSpecOps 产物
 * @param {Array} localFiles hashFiles 产物（含 mtime，Unix 秒）
 * @param {number|null} lastSyncTs 上次成功同步完成时刻（ms）；null/0 → 不过滤
 * @returns {{ ops: Array, stale: string[] }} 过滤后 ops + 被拦下的路径
 */
export function filterStaleUpdates(ops, localFiles, lastSyncTs) {
  if (!lastSyncTs || !Array.isArray(ops) || ops.length === 0) {
    return { ops, stale: [] };
  }
  const mtimeByPath = new Map(localFiles.map((f) => [f.path, f.mtime]));
  const stale = [];
  const kept = [];
  for (const op of ops) {
    if (op.op === 'update') {
      const mtime = mtimeByPath.get(op.path);
      if (mtime !== undefined && mtime * 1000 + 1000 <= lastSyncTs) {
        stale.push(op.path);
        continue;
      }
    }
    kept.push(op);
  }
  return { ops: kept, stale };
}

// 上次成功同步标记（本地 .runtime 下，walk 排除不上传）：filterStaleUpdates 的时间锚。
const LAST_SUCCESS_MARKER = 'spec-sync-last-success.json';

function readLastSyncTs(specRoot) {
  try {
    const raw = readFileSync(join(specRoot, '.runtime', LAST_SUCCESS_MARKER), 'utf8');
    const ts = JSON.parse(raw).ts;
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function writeLastSyncTs(specRoot) {
  try {
    mkdirSync(join(specRoot, '.runtime'), { recursive: true });
    writeFileSync(join(specRoot, '.runtime', LAST_SUCCESS_MARKER), JSON.stringify({ ts: Date.now() }) + '\n', 'utf8');
  } catch { /* 标记失败只损失下次的防回推过滤，不影响本次同步结果 */ }
}

// 本地内容基线快照（坑 quicksync-conflict-granularity，2026-09-03 实证）：
// 上次成功同步时刻的**本地文件 hash 全集**。「本地未改动」的内容级判据——
// filterStaleUpdates 的 mtime 启发式会被 git 操作（pull/checkout/归档重写）刷新
// mtime 击穿（本地 164 个旧归档全部伪装成「刚改过」，重试路径把陈旧副本静默
// 推上服务器=回退）。hash 基线免疫 mtime 刷新：内容没变就是没改，服务器前进
// 属正常多端演进 → 跟随服务器（不发 op、冲突时自动消解），只有内容真变了的
// 文件才进冲突人工裁决。语义锚定「local at last sync」而非「server at last sync」：
// 判据只回答「本地是否改过」，与服务器无关（bundle 拉回的新内容与快照不同 →
// 视为本地改动照推，服务器同内容豁免兜底，无副作用）。
const BASE_SNAPSHOT = 'spec-sync-base.json';

function readBaseSnapshot(specRoot) {
  try {
    const raw = readFileSync(join(specRoot, '.runtime', BASE_SNAPSHOT), 'utf8');
    const hashes = JSON.parse(raw).hashes;
    return hashes && typeof hashes === 'object' ? hashes : null;
  } catch {
    return null;
  }
}

function writeBaseSnapshot(specRoot, localFiles) {
  try {
    const hashes = {};
    for (const f of localFiles) hashes[f.path] = f.hash;
    mkdirSync(join(specRoot, '.runtime'), { recursive: true });
    writeFileSync(join(specRoot, '.runtime', BASE_SNAPSHOT), JSON.stringify({ ts: Date.now(), hashes }, null, 2) + '\n', 'utf8');
  } catch { /* 快照失败只损失下次的内容级防回推，不影响本次同步结果 */ }
}

/**
 * 丢弃「跟随服务器」型 update op（坑 quicksync-conflict-granularity ①）。
 *
 * 判据：本地文件 hash 与基线快照一致 = 自上次同步内容未变——此刻与服务器 hash
 * 不同只可能是他端会话推进了服务器，本地是陈旧副本，推送即回退（spec-sync-
 * parallel-stale-overwrite 同族，但 mtime 免疫）。与 filterStaleUpdates 互补：
 * 快照覆盖内容级判定，mtime 兜底快照缺失（首次同步/快照损坏）的过渡期。
 * 快照无该路径（新文件/过渡期）→ 保留 op 维持旧行为。
 *
 * @param {Array} ops computeSpecOps 产物
 * @param {Array} localFiles hashFiles 产物
 * @param {object|null} baseHashes 基线快照 { [path]: hash }；null → 不过滤
 * @returns {{ ops: Array, followed: string[] }}
 */
export function dropFollowServerUpdates(ops, localFiles, baseHashes) {
  if (!baseHashes || !Array.isArray(ops) || ops.length === 0) {
    return { ops, followed: [] };
  }
  const hashByPath = new Map(localFiles.map((f) => [f.path, f.hash]));
  const followed = [];
  const kept = [];
  for (const op of ops) {
    if (op.op === 'update') {
      const base = baseHashes[op.path];
      const loc = hashByPath.get(op.path);
      if (base !== undefined && loc !== undefined && base === loc) {
        followed.push(op.path);
        continue;
      }
    }
    kept.push(op);
  }
  return { ops: kept, followed };
}

/**
 * 冲突路径分流（坑 quicksync-conflict-granularity ②）：服务器 conflict 回告的路径里，
 * 区分「本地未改动 → 自动跟随服务器」与「本地真改动 → 需人工裁决」。
 * follower 判据 = 内容基线命中（hash 级）或 mtime 兜底（filterStaleUpdates 同款）。
 * @returns {{ followers: string[], real: object }} real = { [path]: server_version }
 */
export function partitionConflictPaths(serverVersions, localFiles, baseHashes, lastSyncTs) {
  const hashByPath = new Map(localFiles.map((f) => [f.path, f.hash]));
  const mtimeByPath = new Map(localFiles.map((f) => [f.path, f.mtime]));
  const followers = [];
  const real = {};
  for (const [path, version] of Object.entries(serverVersions || {})) {
    const base = baseHashes?.[path];
    const loc = hashByPath.get(path);
    const mtime = mtimeByPath.get(path);
    const contentUnchanged = base !== undefined && loc !== undefined && base === loc;
    const mtimeStale = mtime !== undefined && lastSyncTs && mtime * 1000 + 1000 <= lastSyncTs;
    if (contentUnchanged || mtimeStale) followers.push(path);
    else real[path] = version;
  }
  return { followers, real };
}

/**
 * 同步本地 .sillyspec 树到平台（CLI 直跑增量同步入口）。
 *
 * @param {string} specRoot - 本地 .sillyspec 目录绝对路径
 * @param {object} platform - { url, token }
 * @param {string} changeName - 当前变更名
 * @returns {Promise<{synced: number, conflict?: boolean, serverVersions?: object}>}
 */
export async function syncSpecTree(specRoot, platform, changeName, opts = {}) {
  if (!platform || !platform.url || !platform.token) {
    debugLog('[spec-sync] 未连接平台（本地合法状态）；跳过 spec 树增量同步');
    return { synced: 0 };
  }
  // HUB-09：单请求超时与外部熔断 signal 合并——trigger* 熔断时在飞请求被真实取消
  const withSignal = (timeoutMs) => (opts.signal ? AbortSignal.any([AbortSignal.timeout(timeoutMs), opts.signal]) : AbortSignal.timeout(timeoutMs));

  const manifestUrl = `${platform.url.replace(/\/$/, '')}/api/changes/-/spec-manifest`;
  const syncUrl = `${platform.url.replace(/\/$/, '')}/api/changes/-/spec-sync`;

  // 1. GET 服务器清单
  let serverManifest = {};
  try {
    const res = await fetch(manifestUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
      signal: withSignal(10000),
    });
    if (!res.ok) {
      // ql-20260818-008：debugLog → console.warn。树同步失败原本完全静默（要
      // SILLYSPEC_DEBUG_SYNC=1 才可见），文件迟到平台且无任何线索（multi-agent-platform
      // 2026-08-18-workspace-file-browser 实证：design/decisions 迟到 27 分钟、plan.md 迟到
      // 8 分钟才被后续步骤的同步补上）。失败可见、成功不打扰。
      console.warn(`[spec-sync] 拉取清单失败 HTTP ${res.status}（文件树本次未同步，下次自动重试）: ${changeName}`);
      return { synced: 0 };
    }
    const body = await res.json().catch(() => ({}));
    serverManifest = body.files || {};
  } catch (err) {
    console.warn(`[spec-sync] 拉取清单异常（文件树本次未同步，下次自动重试）: ${changeName}: ${err.message}`);
    return { synced: 0 };
  }

  // 2. walk/hash/diff
  const entries = walkSpecTree(specRoot);
  const localFiles = hashFiles(entries);
  let ops = computeSpecOps(serverManifest, localFiles);

  // 旧副本回推防护（并行会话一致性）：上次同步后本地从未改动的文件不回推覆盖服务器新内容。
  // 双层判据（坑 quicksync-conflict-granularity）：内容基线快照（hash 级，免疫 git 操作刷新
  // mtime——pull/checkout/归档重写后的旧文件内容未变即「未改动」）为主，mtime 启发式兜底
  // 快照缺失的过渡期/新文件。forcePush（resolve --keep-local 强制重推）全旁路——用户显式
  // 裁决「以本地为准」时本地意志高于跟随服务器语义，不得被防回推削掉。
  const lastSyncTs = readLastSyncTs(specRoot);
  const baseHashes = readBaseSnapshot(specRoot);
  if (!opts.forcePush) {
    const dropped = dropFollowServerUpdates(ops, localFiles, baseHashes);
    if (dropped.followed.length > 0) {
      console.log(
        `[spec-sync] ${dropped.followed.length} 个本地未改动文件自动跟随服务器（他端推进，内容未变不回推）: ${dropped.followed.slice(0, 5).join(', ')}${dropped.followed.length > 5 ? ' 等' : ''}`
      );
    }
    ops = dropped.ops;
    const filtered = filterStaleUpdates(ops, localFiles, lastSyncTs);
    if (filtered.stale.length > 0) {
      console.warn(
        `[spec-sync] 拦下 ${filtered.stale.length} 个旧副本回推（本地自上次同步未改动而服务器已前进，如确需以本地为准：重存后重推）: ${filtered.stale.slice(0, 5).join(', ')}${filtered.stale.length > 5 ? ' 等' : ''}`
      );
    }
    ops = filtered.ops;
  }

  if (ops.length === 0) {
    debugLog(`[spec-sync] 无差异，跳过同步: ${changeName}`);
    return { synced: 0 };
  }

  // 3. POST ops
  try {
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform.token}`,
      },
      body: JSON.stringify({ ops }),
      signal: withSignal(30000),
    });
    if (!res.ok) {
      console.warn(`[spec-sync] 同步请求失败 HTTP ${res.status}（文件树本次未同步，下次自动重试）: ${changeName}`);
      return { synced: 0 };
    }
    const body = await res.json().catch(() => ({}));
    if (body.conflict) {
      // HUB-08 冲突闭环：落 spec-sync-conflict-<change>.json（与进度 sync-conflict-* 同目录），
      // 供 platform status 列出 + platform resolve 三态处置。此前只 warn 返回，下次 sync 用
      // 同一 base_version 继续冲突循环，无人工裁决入口。
      //
      // 坑 quicksync-conflict-granularity（2026-09-03 实证 164 个旧归档整树冲突）：GET 清单
      // → 全树 hash → POST 的竞态窗内他端推进，base_version 过期引发大规模「假冲突」——
      // 这些文件本地根本没改（与本次 quick 零交集），却把冲突文件坐实、后续自动同步进
      // resolve 流程。冲突粒度收窄：follower（本地未改动，内容基线/mtime 判定）自动跟随
      // 服务器、不进冲突文件；服务器「冲突 op 跳过、其余照常 apply」语义下本会话真改动
      // 已落——follower 清空即视为本轮同步成功（写基线，下次起 pre-POST 即拦）。
      const serverVersions = body.server_versions || {};
      const { followers, real } = opts.forcePush
        ? { followers: [], real: serverVersions }
        : partitionConflictPaths(serverVersions, localFiles, baseHashes, lastSyncTs);
      if (followers.length > 0) {
        console.warn(`[spec-sync] ${followers.length} 个本地未改动文件自动跟随服务器（正常多端前进，无需人工裁决）: ${followers.slice(0, 5).join(', ')}${followers.length > 5 ? ' 等' : ''}`);
      }
      if (Object.keys(real).length === 0) {
        writeLastSyncTs(specRoot);
        writeBaseSnapshot(specRoot, localFiles);
        console.log(`[spec-sync] 冲突已自动消解（0 个需人工裁决；本会话改动 ${ops.length - followers.length > 0 ? '已同步' : '无差异'}）: ${changeName}`);
        return { synced: Math.max(ops.length - followers.length, 0), conflict: false, autoResolved: followers.length };
      }
      let conflictPath = null;
      try {
        const runtimeDir = join(specRoot, '.runtime');
        mkdirSync(runtimeDir, { recursive: true });
        conflictPath = join(runtimeDir, `spec-sync-conflict-${changeName}.json`);
        writeFileSync(conflictPath, JSON.stringify({
          change: changeName,
          kind: 'spec-tree',
          created_at: new Date().toISOString(),
          server_versions: real,
          conflicting_paths: Object.keys(real),
          auto_followed: followers,
          note: 'spec 树文件冲突（仅列本地真改动文件；本地未改动文件已自动跟随服务器）。resolve --keep-local 以本地为准重推；--take-platform 暂不支持（平台无文件下载端点）',
        }, null, 2) + '\n', 'utf8');
      } catch (e) {
        console.warn(`[spec-sync] 冲突文件写入失败（冲突信息仅打印）: ${e.message}`);
      }
      console.warn('');
      console.warn(`⚠️ [spec-sync] 检测到 spec 树冲突（${Object.keys(real).length} 个文件，服务器版本: ${JSON.stringify(real)}）`);
      console.warn(`⚠️ 处置：sillyspec platform resolve ${changeName} --keep-local | --abort（冲突详情: ${conflictPath || '(写入失败)'}）`);
      return { synced: 0, conflict: true, serverVersions: real, autoResolved: followers.length, conflictPath };
    }
    console.log(`[spec-sync] 已同步 ${ops.length} 个文件变更: ${changeName}`);
    writeLastSyncTs(specRoot);
    writeBaseSnapshot(specRoot, localFiles);
    return { synced: ops.length };
  } catch (err) {
    console.warn(`[spec-sync] 同步异常（文件树本次未同步，下次自动重试）: ${changeName}: ${err.message}`);
    return { synced: 0 };
  }
}

export default {
  walkSpecTree,
  hashFiles,
  computeSpecOps,
  extractChangeDirs,
  filterStaleUpdates,
  dropFollowServerUpdates,
  partitionConflictPaths,
  syncSpecTree,
};
