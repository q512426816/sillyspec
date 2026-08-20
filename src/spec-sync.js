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
 */

import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
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
 * 同步本地 .sillyspec 树到平台（CLI 直跑增量同步入口）。
 *
 * @param {string} specRoot - 本地 .sillyspec 目录绝对路径
 * @param {object} platform - { url, token }
 * @param {string} changeName - 当前变更名
 * @returns {Promise<{synced: number, conflict?: boolean, serverVersions?: object}>}
 */
export async function syncSpecTree(specRoot, platform, changeName) {
  if (!platform || !platform.url || !platform.token) {
    debugLog('[spec-sync] 未连接平台（本地合法状态）；跳过 spec 树增量同步');
    return { synced: 0 };
  }

  const manifestUrl = `${platform.url.replace(/\/$/, '')}/api/changes/-/spec-manifest`;
  const syncUrl = `${platform.url.replace(/\/$/, '')}/api/changes/-/spec-sync`;

  // 1. GET 服务器清单
  let serverManifest = {};
  try {
    const res = await fetch(manifestUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
      signal: AbortSignal.timeout(10000),
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
  const ops = computeSpecOps(serverManifest, localFiles);

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
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn(`[spec-sync] 同步请求失败 HTTP ${res.status}（文件树本次未同步，下次自动重试）: ${changeName}`);
      return { synced: 0 };
    }
    const body = await res.json().catch(() => ({}));
    if (body.conflict) {
      console.warn(
        `[spec-sync] 检测到冲突，请人工拍板。服务器版本: ${JSON.stringify(body.server_versions || {})}`
      );
      return { synced: 0, conflict: true, serverVersions: body.server_versions };
    }
    console.log(`[spec-sync] 已同步 ${ops.length} 个文件变更: ${changeName}`);
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
  syncSpecTree,
};
