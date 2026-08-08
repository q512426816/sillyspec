/**
 * SillySpec applyWorktree — 将 worktree 中的变更应用到主工作区
 *
 * 流程：
 * 1. 读取 meta.json 获取 baseHash
 * 2. git diff --name-only baseHash 获取 worktree 中所有变更文件
 * 3. 从 design.md 解析文件变更清单（无清单 = 允许所有）
 * 4. 校验：变更文件 ⊆ 清单
 * 5. 校验：主工作区文件 base hash 一致
 * 6. --check-only 模式只输出检查结果
 * 7. 非 checkOnly：生成 patch → apply --check → apply --3way
 * 8. 成功后自动 cleanup
 */

import { execSync, execFileSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync, mkdtempSync, rmSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { WorktreeManager } from './worktree.js';
import { parseFileChangeList, parseFileChangeListDetailed, pathMatches } from './change-list.js';
import { parseAllowedPaths } from './stages/plan-postcheck.js';

const CHANGES_REL = '.sillyspec/changes';

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function gitQuiet(cwd, args) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * 过滤掉 worktree 基础设施文件（非交付物），让 apply 只关心真正的变更产出：
 *   - meta.json：worktree 元数据，baseline commit 中被跟踪、working-tree 被 CLI 改写
 *     （provisioning→linked 等）。它必须保持 modified（其 baselineCommit 字段是 apply diff
 *     的锚点，保证 baseline overlay 文件不被误判为变更）。若不排除，modified-tracked 的
 *     meta.json 会落入 changedFiles，触发「不在 design.md 清单」误判，导致每个 execute 的
 *     assess 恒 BLOCKED。
 *   - .sillyspec/changes/：变更文档（worktree 专属，apply 回主仓污染进度库）。
 *   - .sillyspec/.runtime/：运行时产物（进度库/锁/review 产物，非源码）。
 *   - .sillyspec/quicklog/：quicklog 条目（worktree 进度，非交付物）。
 *   保留 .sillyspec/docs/（dogfood 模块规范文档 = 交付物，apply 回主仓）。
 * 对 modified-tracked（git diff）与 untracked（ls-files --others）一视同仁。
 */
export function filterDeliverableFiles(files) {
  return files.filter(f =>
    !f.startsWith('.sillyspec/changes/') &&
    !f.startsWith('.sillyspec/.runtime/') &&
    !f.startsWith('.sillyspec/quicklog/') &&
    f !== 'meta.json'
  );
}

/**
 * 校验变更文件是否都在 design.md 清单内——容差匹配（与 plan-postcheck validateDesignFileCoverage
 * 同语义）：design 清单写 glob（双星通配）或目录前缀（如 src/ 子树）也能覆盖 git diff 出的具体路径，
 * 避免「plan 阶段放过、apply 阶段卡死」逼用户回去补字面文件名。
 *
 * @param {string[]} changedFiles  git diff 出的具体变更路径
 * @param {Set<string>} allowSet   design.md 清单项（可能含 glob / 目录前缀）
 * @returns {string[]} 不被任何清单项覆盖的文件（违规项，apply 将据此 BLOCK）
 */
export function classifyAllowListViolations(changedFiles, allowSet) {
  const allow = [...allowSet];
  return changedFiles.filter(f => !allow.some(ap => pathMatches(f, ap)));
}

/**
 * 确定进 patch 的文件：有清单取「实际变更 ∩ 清单（pathMatches 容差）」，无清单取全部变更。
 *
 * 口径须与 classifyAllowListViolations 一致——否则 design §6 用 glob（如 test_*.py）或多路径
 * 单 cell 覆盖的文件过 manifest 校验（Gate1 用 pathMatches 放行），却因字面 includes 不在
 * changedFiles → 被滤出 patchFiles → patch 不含 → 主工作区静默丢失（坑 apply-glob-manifest）。
 * 以 changedFiles 为基按容差圈定，glob/前缀覆盖的具体文件都能进 patch。
 *
 * @param {string[]} changedFiles  filterDeliverableFiles 已过滤的实际变更路径
 * @param {Set<string>} allowSet   design §6 清单 ∪ task allowed_paths（可含 glob / 目录前缀）
 * @param {boolean} hasAllowList   是否有清单
 * @returns {string[]} 进 patch 的文件
 */
export function resolvePatchFiles(changedFiles, allowSet, hasAllowList) {
  if (!hasAllowList) return changedFiles;
  return changedFiles.filter(f => [...allowSet].some(ap => pathMatches(f, ap)));
}
/**
 * 批量获取多个文件在某个 treeish 中的 blob hash（一次 git ls-tree 替代 N 次 rev-parse）。
 *
 * 语义等价于对每个文件调 `git rev-parse <treeish>:<path>`：
 *   - 文件在 tree 中 → Map<f, hash>（与 rev-parse 返回的同一 blob hash）
 *   - 文件不在 tree 中 → 不在 Map 中（调用方 map.get(f) ?? null 得 null，等同 rev-parse 失败→null）
 * ls-tree 输出 "<mode> <type> <hash>\t<path>"。path 恒为文件路径（来自 git diff/ls-files），
 * 非目录，故不带 -r 也正确——文件在 tree 时 rev-parse treeish:path 与 ls-tree 都给同一 hash，
 * 不在时都不给，等价。（沿用 git() 字符串拼接模式，不引入新的引号/空格破法。）
 *
 * @param {string} cwd
 * @param {string} treeish
 * @param {string[]} files
 * @returns {Map<string, string>} path → blob hash（仅含存在于 tree 中的文件）
 */
function getBlobHashMap(cwd, treeish, files) {
  const map = new Map();
  if (files.length === 0) return map; // 空 pathspec 会让 ls-tree 列出整棵树，必须拦截
  const raw = gitQuiet(cwd, `ls-tree ${treeish} -- ${files.join(' ')}`);
  if (!raw) return map;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;
    const filePath = line.slice(tabIdx + 1);
    const hash = line.slice(0, tabIdx).split(' ')[2]; // "<mode> <type> <hash>"
    if (hash) map.set(filePath, hash);
  }
  return map;
}

/**
 * apply 的文件清单 = design §6 清单 ∪ plan TaskCard allowed_paths（execute 复盘 c）。
 *
 * design §6 常只列源码、漏测试/产物文件，而 task allowed_paths（plan 阶段产出）已含——apply 若只认
 * design 清单会在测试/产物文件上误拦（assess 用 task allowed_paths 已放行、apply 用 design 清单又拦，
 * 两 gate 口径不一致）。union 后两源并集为准；plan 已过 validateDesignFileCoverage 单向校验（design ⊆
 * plan），union 不会放开 design/plan 之外的任意文件（仍拦完全越界文件）。
 *
 * @param {string} projectRoot - 主仓库根
 * @param {string} changeName - 变更名
 * @returns {Set<string>} 并集清单（无 design 清单且无 task 卡片时为空集）
 */
export function resolveApplyAllowSet(projectRoot, changeName) {
  const allowSet = parseFileChangeList(join(projectRoot, CHANGES_REL, changeName, 'design.md'), { keepSillyspecDocs: true });
  const tasksDir = join(projectRoot, CHANGES_REL, changeName, 'tasks');
  if (existsSync(tasksDir)) {
    for (const tf of readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))) {
      for (const p of parseAllowedPaths(readFileSync(join(tasksDir, tf), 'utf8'))) allowSet.add(p);
    }
  }
  return allowSet;
}

/**
 * apply worktree 变更到主工作区
 *
 * @param {string} changeName - 变更名
 * @param {{ cwd?: string, checkOnly?: boolean }} opts
 * @returns {{
 *   ok: boolean,
 *   changedFiles: string[],
 *   extraFiles: string[],
 *   hashMismatchFiles: string[],
 *   patchPath: string|null,
 *   errors: string[]
 * }}
 */
export function applyWorktree(changeName, { cwd, checkOnly = false, merge = false } = {}) {
  const projectRoot = cwd || process.cwd();
  const wm = new WorktreeManager({ cwd: projectRoot });
  const meta = wm.getMeta(changeName);
  const result = {
    ok: false,
    changedFiles: [],
    extraFiles: [],
    hashMismatchFiles: [],
    patchPath: null,
    errors: [],
    merged: false,
  };

  // --- 1. 校验 worktree 存在 + meta.json 有效 ---
  if (!meta) {
    result.errors.push(`worktree not found: ${changeName}。meta.json 不存在或已损坏。`);
    return result;
  }

  const { worktreePath, baseHash, baselineCommit } = meta;
  // diff 起始点：有 baseline checkpoint 用它（只合子代理改动），否则 fallback 到 baseHash
  const diffBase = baselineCommit || baseHash;

  if (!existsSync(worktreePath)) {
    result.errors.push(`worktree 目录不存在: ${worktreePath}`);
    return result;
  }

  // --- 2. 获取变更文件列表 ---
  // worktree 内修改可能没有 commit，用 git diff <baseHash>（比较 baseHash 到工作区内容）
  // 同时检测 untracked 新文件（git diff 不包含 untracked）
  let changedFiles;
  try {
    // 用 --name-status 捕获 rename/delete（--name-only 会丢失 rename 源文件）
    const statusRaw = git(worktreePath, `diff --name-status ${diffBase}`);
    const statusFiles = new Set();
    if (statusRaw) {
      for (const line of statusRaw.split('\n').filter(Boolean)) {
        const parts = line.split('\t');
        // R100 old.txt new.txt → 提取两个文件
        if (parts.length >= 2) statusFiles.add(parts[parts.length - 1]);
        if (parts.length >= 3) statusFiles.add(parts[parts.length - 2]);
      }
    }

    // untracked 新文件（diffBase 中不存在的文件）
    const untrackedRaw = gitQuiet(worktreePath, `ls-files --others --exclude-standard`);
    const untrackedFiles = untrackedRaw ? untrackedRaw.split('\n').filter(Boolean) : [];

    // 排除 worktree 基础设施文件（meta.json / .sillyspec/，见 filterDeliverableFiles）。
    // 对 modified-tracked（statusFiles）与 untracked 一视同仁——否则 modified 的 meta.json
    // 会被误算入 changedFiles，触发 design.md 清单校验失败（assess 恒 BLOCKED）。
    changedFiles = filterDeliverableFiles([...new Set([...statusFiles, ...untrackedFiles])]);
  } catch (e) {
    result.errors.push(`获取变更文件列表失败: ${e.message}`);
    return result;
  }

  result.changedFiles = changedFiles;

  if (changedFiles.length === 0) {
    // 没有变更
    if (!checkOnly) {
      wm.cleanup(changeName);
    }
    result.ok = true;
    return result;
  }

  // --- 3. 解析 apply 文件清单（design §6 清单 ∪ plan TaskCard allowed_paths，execute 复盘 c） ---
  const allowSet = resolveApplyAllowSet(projectRoot, changeName);
  const hasAllowList = allowSet.size > 0;

  // --- 4. 校验：变更文件 ⊆ 清单（无清单则跳过）---
  if (hasAllowList) {
    const violations = classifyAllowListViolations(changedFiles, allowSet);
    if (violations.length > 0) {
      result.extraFiles.push(...violations);
      result.errors.push(
        `文件清单校验失败：以下变更文件不在 design.md 清单中：\n  ${violations.join('\n  ')}`
      );
      // checkOnly（assess）模式不短路：继续跑 Gate3，收集所有道供一次报全（坑 worktree-execute-apply-friction 坑4）。
      // 真实 apply（checkOnly=false）仍短路，保安全。
      if (!checkOnly) return result;
    }
  }

  // --- 4.6 显式 --merge：用户显式选择 git merge 兜底（主干已提交推进重叠时的三方合并） ---
  // 触发点从「4.5 baseline 漂移自动降级」改为「用户显式 --merge flag」（D-001 保留，触发方式变化）。
  // 用 --merge 时跳过未提交 dirty 拦截——merge 同样要求工作区相对干净，此处仅提示风险，真正失败由 applyByMerge 报告。
  if (merge && !checkOnly) {
    return applyByMerge(result, changeName, projectRoot, wm);
  }

  // --- 4.5 校验：主工作区是否有「未提交」脏改动（未提交 dirty 是 git apply --3way 危险区，必须拦）---
  // 分工：4.5（排除规则下当前 dirty）+ 5a（脏∩changedFiles）挡「未提交」dirty；5b 管「已提交」HEAD 分叉（已放宽，见下）。
  // 实测：主干未提交 dirty 时，git apply --3way 报 `does not match index` 且行为不一致（可能报错/可能半应用，
  // 哪怕脏文件与 patch 不重叠）——这是 git 硬约束，故此处友好拦截，引导用户先 commit/stash。
  // 排除非交付物的元数据/文档 churn（execute 自身改的 + 多操作者常改的 agent 指引/文档），
  // 否则别人改 CLAUDE.md/docs/.claude → 判定 dirty → apply 误阻断（多操作者仓库高频踩坑）。
  // 注意：排除规则必须和 computeBaselineHash (worktree.js) 一致（虽已不比对 hash，仍用同一口径判当前 dirty）。
  if (meta.baselineHash) {
    const exclude = '-- . ":(exclude).sillyspec/" ":(exclude).claude/" ":(exclude)docs/" ":(exclude)CLAUDE.md"';
    const staged = gitQuiet(projectRoot, `diff --cached ${exclude}`) || '';
    const unstaged = gitQuiet(projectRoot, `diff ${exclude}`) || '';
    const untracked = gitQuiet(projectRoot, `ls-files --others --exclude-standard ${exclude}`) || '';
    // 意图（与 computeBaselineHash 注释一致）：只挡「未提交 dirty」——git apply --3way 对 dirty 工作区不稳。
    // 不比对 hash 是否等于 execute 启动时 baselineHash：主仓 dirty→clean（execute 期间 commit 无关文件）后
    // hash 必变，若仍比对会永久死锁（须手改 meta.baselineHash）。改判「排除规则下当前是否有未提交 dirty」。
    const hasUncommittedDirty = staged !== '' || unstaged !== '' || untracked !== '';
    if (hasUncommittedDirty) {
      // 未提交 dirty 拦截：列脏文件 + 指引先 commit/stash（git --3way 对 dirty 工作区不稳，merge 同理，故不再提 --merge）
      const dirtyFiles = [...new Set(
        ((gitQuiet(projectRoot, 'diff --name-only HEAD') || '').split('\n').filter(Boolean))
          .concat((gitQuiet(projectRoot, 'ls-files --others --exclude-standard') || '').split('\n').filter(Boolean))
      )].filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json');
      result.errors.push(
        `主工作区有未提交的改动，git apply 无法安全应用。\n` +
        (dirtyFiles.length > 0 ? `未提交文件：\n  ${dirtyFiles.join('\n  ')}\n` : '') +
        `请先提交或暂存这些改动，再重新 apply：\n  git add -A && git commit -m "..."   或   git stash\n`
      );
      if (!checkOnly) return result; // checkOnly 收集不短路（一次报全）；真实 apply 短路
    }
  }

  // --- 5. 校验：主工作区文件 base hash 一致 ---
  // 5a. 检查主工作区是否有未 commit 的脏文件（会影响 apply）
  const mainDirtyRaw = gitQuiet(projectRoot, 'diff --name-only HEAD');
  const mainDirtyFiles = mainDirtyRaw ? mainDirtyRaw.split('\n').filter(Boolean) : [];
  if (mainDirtyFiles.length > 0) {
    // 如果脏文件和本次 apply 的文件有交集 → 报错
    const conflictDirty = mainDirtyFiles.filter(f => changedFiles.includes(f));
    if (conflictDirty.length > 0) {
      result.errors.push(
        `主工作区有以下未 commit 的变更，会影响 apply：\n  ${conflictDirty.join('\n  ')}\n请先 commit 或 stash 这些变更。`
      );
      if (!checkOnly) return result; // checkOnly 收集不短路（一次报全）；真实 apply 短路
    }
  }

  // 5b. 对比 worktree 的 baseHash 和主工作区 HEAD 中每个清单文件的 blob hash
  // 批量化：两次 ls-tree（worktree 的 baseHash + 主仓库 HEAD）各建一张 path→hash Map，
  // 替代 per-file getFileBlobHash × 2（原 2N spawn → 固定 2）。语义等价见 getBlobHashMap。
  // 放宽（2026-07）：blob 不一致不再 BLOCKED——它意味着主干「已提交」推进改了同文件，
  // 而 git apply --3way 能自动三路合并这种场景（不同区域直接合，同区域留冲突标记）。
  // 故仅记录为风险提示（hashMismatchFiles → assess WARNING / summary 展示），放行交 step7 --3way 实测。
  // 真重叠时 --3way 冲突，由 step7 回滚并提示 --merge 兜底。
  const targetFiles = hasAllowList ? [...allowSet] : changedFiles;
  const wtHashMap = getBlobHashMap(worktreePath, baseHash, targetFiles);
  const mainHashMap = getBlobHashMap(projectRoot, 'HEAD', targetFiles);
  for (const f of targetFiles) {
    const wtBlob = wtHashMap.get(f) ?? null;
    const mainBlob = mainHashMap.get(f) ?? null;

    // 两者都为 null（文件在 base 时不存在）→ OK
    if (wtBlob === null && mainBlob === null) continue;
    // 两者一致 → OK
    if (wtBlob === mainBlob) continue;
    // 不一致 → 主干已提交推进改了此文件，记风险提示（不拦截，交 --3way）
    result.hashMismatchFiles.push(f);
  }

  // --- 6. checkOnly 模式：到此返回 ---
  if (checkOnly) {
    result.ok = true;
    return result;
  }

  // --- 7. 生成 patch 并 apply ---
  // 确定要包含在 patch 中的文件：有清单用「实际变更 ∩ 清单（pathMatches 容差）」，无清单用全部变更。
  // 口径与 classifyAllowListViolations 一致（坑 apply-glob-manifest-passes-check-but-not-patch）。
  const patchFiles = resolvePatchFiles(changedFiles, allowSet, hasAllowList);

  // 创建临时文件
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-patch-'));
  const patchPath = join(tmpDir, 'apply.patch');
  result.patchPath = patchPath;

  try {
    let patchContent = '';

    // 分 tracked 变更和 untracked 新文件生成 patch
    // 批量化：一次 ls-tree（diffBase tree 中存在的文件）+ 一次 ls-files（index 中存在的文件）
    // 建集合，替代 per-file cat-file -e / ls-files --error-unmatch（原至多 2N spawn → 固定 2）。
    // 语义等价：cat-file -e diffBase:f 成功 ⟺ f 在 ls-tree diffBase 输出（getBlobHashMap key）；
    // ls-files --error-unmatch f 成功 ⟺ f 在 ls-files -- 输出。
    const inTree = getBlobHashMap(worktreePath, diffBase, patchFiles);
    const inIndexList = patchFiles.length > 0
      ? (gitQuiet(worktreePath, `ls-files -- ${patchFiles.join(' ')}`) || '').split('\n').filter(Boolean)
      : [];
    const inIndex = new Set(inIndexList);
    const trackedFiles = patchFiles.filter(f => inTree.has(f) || inIndex.has(f));
    const trackedSet = new Set(trackedFiles);
    const untrackedPatchFiles = patchFiles.filter(f => !trackedSet.has(f));

    // tracked 文件：git diff baseHash
    if (trackedFiles.length > 0) {
      const trackedArgs = trackedFiles.length > 0 ? `-- ${trackedFiles.join(' ')}` : '';
      patchContent += execSync(
        `git diff --binary ${diffBase} ${trackedArgs}`,
        { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }

    // untracked 新文件：git add 到 index，git diff --cached，然后 reset
    if (untrackedPatchFiles.length > 0) {
      const addArgs = untrackedPatchFiles.length > 0 ? `-- ${untrackedPatchFiles.join(' ')}` : '';
      git(worktreePath, `add ${addArgs}`);
      try {
        const diffCachedArgs = untrackedPatchFiles.length > 0 ? `-- ${untrackedPatchFiles.join(' ')}` : '';
        patchContent += execSync(
          `git diff --binary --cached ${diffCachedArgs}`,
          { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } finally {
        // 重置 index（不保留 staged 状态）
        gitQuiet(worktreePath, `reset HEAD -- ${addArgs}`);
      }
    }

    if (!patchContent.trim()) {
      // patch 为空（清单中部分文件可能没实际变更）
      result.ok = true;
      rmSync(tmpDir, { recursive: true, force: true });
      return result;
    }

    writeFileSync(patchPath, patchContent);

    // apply --check 预检失败不再拦截（--check 只测 clean apply，--3way 能处理 clean apply 失败的
    // 三路合并场景——主干已提交推进时 --check 恒失败但 --3way 可合）。故跳过 --check，直接试 --3way。

    // 回滚准备：记录 patch 涉及的 tracked 文件（--3way 冲突后需恢复 HEAD 版，不留半成品冲突标记）。
    // tracked 文件冲突 → git checkout -- <f> 还原；untracked 新建文件（--3way 不会对其冲突）不在回滚范围，
    // 但若 --3way 部分成功后冲突，已创建的新文件需删，故记录 untracked 集合。
    const trackedPatchFiles = patchFiles.filter(f => {
      // 该文件在主仓库 HEAD 存在 → 是 tracked（--3way 冲突时留标记需 checkout 还原）
      return gitQuiet(projectRoot, `cat-file -e HEAD:${f}`) === null ? false : true;
    });
    const newPatchFiles = patchFiles.filter(f => !trackedPatchFiles.includes(f));

    // apply --3way 正式应用（主干已提交推进时自动三路合并）
    try {
      git(projectRoot, `apply --3way ${patchPath}`);
    } catch (e) {
      // --3way 冲突（exit 1，工作区已留冲突标记）：回滚到 apply 前干净状态，不留半成品
      const rollback = rollbackApply(projectRoot, trackedPatchFiles, newPatchFiles);
      result.errors.push(
        `apply --3way 冲突：以下文件与主干「已提交」推进重叠，无法自动合并：\n` +
        `  ${rollback.conflicts.length > 0 ? rollback.conflicts.join('\n  ') : '(未能获取冲突文件列表)'}\n` +
        `已回滚工作区到 apply 前状态（无半成品冲突标记）。\n` +
        `可选：用 --merge 自动三方合并兜底（git merge sillyspec/${changeName}，会引入合并提交）：\n` +
        `  sillyspec worktree apply ${changeName} --merge\n` +
        `或手动解决后重试。`
      );
      if (rollback.error) result.warnings = (result.warnings || []).concat([`回滚警告: ${rollback.error}`]);
      return result;
    }

    result.ok = true;

    // --- 8. 成功后自动 cleanup（失败不影响整体结果） ---
    try {
      wm.cleanup(changeName);
    } catch (cleanupErr) {
      result.warnings = result.warnings || [];
      result.warnings.push(`cleanup 失败（不影响应用结果）: ${cleanupErr.message}`);
    }

  } catch (e) {
    result.errors.push(`patch 生成/应用异常: ${e.message}`);
    return result;
  } finally {
    // 清理临时目录
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  return result;
}

/**
 * 回滚 --3way 冲突后的工作区到 apply 前状态（不留半成品冲突标记）。
 * tracked 文件：git checkout -- <f> 还原 HEAD 版（清除冲突标记）。
 * 新文件（apply 前不存在）：删除（--3way 可能部分创建）。
 * @param {string} projectRoot
 * @param {string[]} trackedFiles 主仓库 HEAD 已存在、patch 触及的文件
 * @param {string[]} newFiles apply 前不存在、patch 可能新建的文件
 * @returns {{ conflicts: string[], error: string|null }} conflicts=冲突文件列表
 */
function rollbackApply(projectRoot, trackedFiles, newFiles) {
  let error = null;
  // 冲突文件：git status 里带冲突标记（UU/AA 等）的文件
  let conflicts = [];
  try {
    const unmerged = gitQuiet(projectRoot, 'diff --name-only --diff-filter=U') || '';
    conflicts = unmerged.split('\n').filter(Boolean);
  } catch {}
  // 回滚 tracked 文件到 HEAD（强制从 HEAD 还原——--3way 冲突标记同时污染工作区和 index，
  // `checkout -- f` 从 index 还原会拿到冲突版，必须 `checkout HEAD -- f` 才能还原干净）
  for (const f of trackedFiles) {
    try { gitQuiet(projectRoot, `checkout HEAD -- ${f}`); } catch (e) { error = (error ? error + '; ' : '') + `checkout ${f}: ${e.message}`; }
  }
  // 删除 --3way 可能新建的文件（apply 前不存在）
  for (const f of newFiles) {
    try {
      const p = join(projectRoot, f);
      if (existsSync(p)) unlinkSync(p);
    } catch (e) { error = (error ? error + '; ' : '') + `delete ${f}: ${e.message}`; }
  }
  // 兜底：若 index 处于 unmerged 状态，重置 index（不影响工作区已还原的文件）
  try { gitQuiet(projectRoot, 'reset --quiet'); } catch {}
  return { conflicts, error };
}

/**
 * baseline 漂移时的 merge 降级路径（D-001）。
 *
 * 当主工作区 baseline 在 execute 期间漂移、patch 无法干净应用时，用
 * `git merge sillyspec/<change>` 替代 patch apply（BRANCH_PREFIX='sillyspec/'，worktree.js:18）。
 * git merge 比 patch 鲁棒，能处理 baseline 漂移 + 潜在冲突。会引入合并提交
 * （D-002：与 worktree.md:84「patch 而非 merge 保持线性历史」架构决策的张力——
 * 仅作 --merge 显式 opt-in，不改变默认 patch 行为）。
 *
 * merge 冲突时不自动解决：git merge --abort 回滚到合并前状态 + 报冲突文件列表。
 *
 * @param {object} result - applyWorktree 的 result 对象（mutate 后返回）
 * @param {string} changeName
 * @param {string} projectRoot - 主仓库根
 * @param {object} wm - WorktreeManager 实例
 * @returns {object} result（merged=true 表示走了 merge 降级）
 */
function applyByMerge(result, changeName, projectRoot, wm) {
  const meta = wm.getMeta(changeName);
  const changedFiles = result.changedFiles || [];
  // 用 meta.branch（native-worktree 模式分支名可能不是 sillyspec/<change>），不硬编码。
  const branch = meta.branch || `sillyspec/${changeName}`;

  try {
    git(projectRoot, `merge --no-ff ${branch}`);
  } catch (e) {
    // merge 冲突：取冲突文件列表 + abort 回滚（不 cleanup，保留 worktree）
    let conflictFiles = [];
    try {
      const cf = gitQuiet(projectRoot, `diff --name-only --diff-filter=U`);
      conflictFiles = cf ? cf.split('\n').filter(Boolean) : [];
    } catch {}
    try { gitQuiet(projectRoot, `merge --abort`); } catch {}
    result.errors.push(
      `git merge ${branch} 冲突，请手动解决。冲突文件：\n` +
      (conflictFiles.length ? `  ${conflictFiles.join('\n  ')}\n` : `  (未能获取冲突文件列表)\n`) +
      `已执行 git merge --abort 回滚到合并前状态。`
    );
    return result;
  }

  // 落地校验：merge 报成功（exit 0）不代表交付物真进 main——
  // 分支可能只含 baseline checkpoint（子代理改动未 commit），merge 产生空内容合并，文件零落地。
  // 逐个确认 changedFiles 在 main HEAD 存在。任一缺失 → 不 cleanup（fail-open：保留 worktree 唯一副本）。
  result.merged = true;
  const notLanded = changedFiles.filter(f => gitQuiet(projectRoot, `cat-file -e HEAD:${f}`) === null);
  if (notLanded.length > 0) {
    result.ok = false;
    result.errors.push(
      `git merge ${branch} 报成功，但 ${notLanded.length}/${changedFiles.length} 个交付文件未出现在 main HEAD` +
      `（分支可能只含 baseline checkpoint，子代理改动未 commit）。worktree 已保留（未 cleanup），` +
      `请用 git cherry-pick 或手动 cp 落地：\n  ${notLanded.join('\n  ')}`
    );
    return result;
  }

  result.ok = true;
  try { result.mergeSummary = git(projectRoot, `log --oneline -1`); } catch {}
  try {
    wm.cleanup(changeName);
  } catch (cleanupErr) {
    result.warnings = result.warnings || [];
    result.warnings.push(`cleanup 失败（不影响 merge 结果）: ${cleanupErr.message}`);
  }
  return result;
}

/**
 * 风险审计：评估 worktree 变更是否可以安全自动 apply
 *
 * 检查项：
 * 1. patch --check 通过
 * 2. 所有变更在 allowed_paths 内
 * 3. 主工作区 baseline 未变化
 * 4. 没有删除/重命名关键文件
 * 5. 没有改高风险文件（lockfile/migration/配置/入口）除非任务显式允许
 * 6. diff 规模没有异常膨胀
 *
 * @param {string} changeName
 * @param {{ cwd?: string }} opts
 * @returns {{
 *   decision: 'SAFE' | 'WARNING' | 'BLOCKED',
 *   changedFiles: string[],
 *   reasons: string[],
 *   warnings: string[],
 *   stats: { additions: number, deletions: number }
 * }}
 */
export function assessApplyRisk(changeName, { cwd } = {}) {
  const projectRoot = cwd || process.cwd();
  const reasons = [];
  const warnings = [];

  // 先跑 --check-only 模式的 applyWorktree 获取变更文件列表
  const checkResult = applyWorktree(changeName, { cwd: projectRoot, checkOnly: true });

  // applyWorktree(checkOnly) 已收集所有道（Gate1/3 不短路）——其 errors 纳入 reasons，
  // 继续跑 Gate2/4/6 一次报全（坑 worktree-execute-apply-friction 坑4：原此处提前 return 致逐道挤牙膏）。
  reasons.push(...checkResult.errors);
  if (checkResult.warnings?.length) warnings.push(...checkResult.warnings);

  const changedFiles = checkResult.changedFiles;

  if (changedFiles.length === 0) {
    // 无变更：若仍有 Gate 错误（如主区 dirty）则 BLOCKED，否则 SAFE
    if (reasons.length > 0) {
      return { decision: 'BLOCKED', changedFiles: [], reasons, warnings, stats: { additions: 0, deletions: 0 } };
    }
    return {
      decision: 'SAFE',
      changedFiles: [],
      reasons: ['无变更需要应用'],
      warnings: [],
      stats: { additions: 0, deletions: 0 }
    };
  }

  // 解析 TaskCard allowed_paths（复用 plan-postcheck.parseAllowedPaths，消除内联重复实现漂移）
  const wm = new WorktreeManager({ cwd: projectRoot });
  const meta = wm.getMeta(changeName);
  const tasksDir = join(projectRoot, CHANGES_REL, changeName, 'tasks');
  const allowedPaths = new Set();
  if (existsSync(tasksDir)) {
    for (const tf of readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))) {
      for (const p of parseAllowedPaths(readFileSync(join(tasksDir, tf), 'utf8'))) {
        if (p) allowedPaths.add(p);
      }
    }
  }

  // design §6 标记为「顺带修复」的文件（坑 worktree-execute-apply-friction 坑1）：合规修预存债，
  // 不属任何 task 边界，assess 豁免 allowed_paths 严格校验（降级 warning），避免被迫 cherry-pick 绕过。
  const designPath = join(projectRoot, CHANGES_REL, changeName, 'design.md');
  const incidentalSet = new Set(
    parseFileChangeListDetailed(designPath).filter(e => e.incidental).map(e => e.path)
  );

  // 检查 2: 变更在 allowed_paths 内（仅在 TaskCard 存在时）；顺带修复文件豁免。
  // 匹配换 pathMatches（与 Gate1/plan-postcheck 同语义容差），消除原字面前缀弱匹配漂移。
  if (allowedPaths.size > 0) {
    const isIncidental = f => [...incidentalSet].some(ap => pathMatches(f, ap));
    const outsideAll = changedFiles.filter(f => ![...allowedPaths].some(allowed => pathMatches(f, allowed)));
    const outsidePaths = outsideAll.filter(f => !isIncidental(f));
    const exempted = outsideAll.filter(f => isIncidental(f));
    if (outsidePaths.length > 0) {
      reasons.push(`变更文件超出 allowed_paths：\n  ${outsidePaths.join('\n  ')}`);
    }
    if (exempted.length > 0) {
      warnings.push(`顺带修复文件（已豁免 allowed_paths，来源 design §6 标记）：${exempted.join(', ')}`);
    }
  }

  // 检查 4+5: 高风险文件模式
  const HIGH_RISK_PATTERNS = [
    /(^|\/)package-lock\.json$/,
    /(^|\/)pnpm-lock\.yaml$/,
    /(^|\/)yarn\.lock$/,
    /(^|\/)\.env($|\.)/,
    /(^|\/)docker-compose.*\.ya?ml$/,
    /(^|\/)Dockerfile$/,
    /migration[\w.-]*\.(sql|js|ts)$/i,
    /(^|\/).*entry.*\.(js|ts)$/i,
    /(^|\/)main\.(js|ts)$/i,
    /(^|\/)index\.(js|ts)$/i,
    /(^|\/)app\.(js|ts)$/i,
  ];
  const riskyFiles = changedFiles.filter(f => HIGH_RISK_PATTERNS.some(p => p.test(f)));
  if (riskyFiles.length > 0) {
    // 高风险文件只有在 allowedPaths 显式包含时才放行
    const trulyRisky = riskyFiles.filter(f => !
      [...allowedPaths].some(allowed => f === allowed)
    );
    if (trulyRisky.length > 0) {
      reasons.push(`高风险文件变更（未在 allowed_paths 中显式声明）：\n  ${trulyRisky.join('\n  ')}`);
    } else {
      warnings.push(`高风险文件变更（已在 allowed_paths 中声明）：${riskyFiles.join(', ')}`);
    }
  }

  // 检查 6: diff 规模异常（>2000 行变更视为异常）
  const wtPath = meta?.worktreePath;
  const diffBase = meta?.baselineCommit || meta?.baseHash;
  let additions = 0, deletions = 0;
  if (wtPath && diffBase) {
    try {
      const shortstat = gitQuiet(wtPath, `diff --shortstat ${diffBase}`);
      const insMatch = shortstat?.match(/(\d+) insertion/);
      const delMatch = shortstat?.match(/(\d+) deletion/);
      additions = insMatch ? parseInt(insMatch[1]) : 0;
      deletions = delMatch ? parseInt(delMatch[1]) : 0;
      if (additions + deletions > 2000) {
        reasons.push(`diff 规模异常（${additions} additions + ${deletions} deletions = ${additions + deletions} 行）`);
      }
    } catch {}
  }

  // 判定
  let decision;
  if (reasons.length > 0) {
    decision = 'BLOCKED';
  } else if (warnings.length > 0) {
    decision = 'WARNING';
  } else {
    decision = 'SAFE';
  }

  return { decision, changedFiles, reasons, warnings, stats: { additions, deletions } };
}

/**
 * 格式化 execute run summary（人类可读）
 *
 * 只展示 CLI 真实掌握的信息，不声称知道 per-task 状态。
 * @param {object} opts
 * @param {string} opts.changeName - 变更名
 * @param {number} opts.stepsCompleted - 已完成步骤数
 * @param {number} opts.stepsTotal - 总步骤数
 * @param {string} opts.agentSummary - Agent 最终输出摘要
 * @param {string} [opts.cwd] - 项目根目录（默认 process.cwd()）
 * @returns {string} 格式化的 summary 文本
 */
export function formatExecuteSummary({ changeName, stepsCompleted, stepsTotal, agentSummary, cwd }) {
  const wm = new WorktreeManager({ cwd });
  const meta = wm.getMeta(changeName);
  const lines = [];

  const SEPARATOR = '─'.repeat(32);

  // --- Header ---
  lines.push(`Execute Summary`);
  lines.push(SEPARATOR);

  // --- Status ---
  if (!meta) {
    // worktree 不存在（可能已 cleanup 或没有用过 worktree）
    lines.push(`Status:     COMPLETED`);
    lines.push(`Steps:      ${stepsCompleted} / ${stepsTotal}`);
    lines.push(`Apply:      N/A`);
  } else {
    const hasBaseline = meta.baselineCommit != null;
    const wtExists = existsSync(meta.worktreePath);

    const applyStatus = wtExists ? 'pending' : 'applied';
    const baselineCount = meta.baselineFiles?.length || 0;
    const baselineStatus = hasBaseline
      ? `dirty (${baselineCount} baseline file${baselineCount === 1 ? '' : 's'} protected)`
      : 'clean';

    // Worktree 最终状态
    const mode = meta.mode || 'worktree';
    let worktreeStatus;
    if (mode === 'native-worktree') {
      worktreeStatus = 'kept (external worktree)';
    } else if (mode === 'in-place-fallback') {
      worktreeStatus = 'none (in-place)';
    } else if (!wtExists) {
      worktreeStatus = 'cleaned';
    } else {
      worktreeStatus = 'exists';
    }

    lines.push(`Status:     COMPLETED`);
    lines.push(`Steps:      ${stepsCompleted} / ${stepsTotal}`);
    lines.push(`Baseline:   ${baselineStatus}`);
    lines.push(`Apply:      ${applyStatus}`);
    lines.push(`Worktree:   ${worktreeStatus}`);
  }

  // --- Changed files ---
  // 从主工作区 diff 获取（worktree 已 apply）或从 worktree diff 获取
  if (meta && existsSync(meta.worktreePath)) {
    // worktree 还在，用 baselineCommit 或 baseHash 做 diff
    try {
      const diffBase = meta.baselineCommit || meta.baseHash;
      // execFileSync 数组形式：路径无需引号化（含空格也安全）；stdio stderr=ignore
      // 替代 `2>/dev/null`（Windows cmd.exe 无法解析该重定向，导致 Windows 上恒抛错→Changed Files 空）
      const filesRaw = execFileSync('git', ['-C', meta.worktreePath, 'diff', '--name-only', diffBase], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
      const files = filesRaw ? filesRaw.trim().split('\n').filter(Boolean) : [];
      if (files.length > 0) {
        lines.push(``);
        const maxShow = 10;
        const showFiles = files.slice(0, maxShow);
        const remain = files.length - maxShow;
        lines.push(`Changed Files (${files.length})`);
        showFiles.forEach(f => lines.push(`  ${f}`));
        if (remain > 0) {
          lines.push(`  ... ${remain} more`);
        }
      }
    } catch {}
  }

  // --- Agent Summary ---
  if (agentSummary) {
    lines.push(``);
    lines.push(`Agent Summary`);
    // 缩进每行，截断过长内容
    const maxLen = 200;
    const summary = agentSummary.length > maxLen
      ? agentSummary.slice(0, maxLen) + '...'
      : agentSummary;
    summary.split('\n').forEach(l => lines.push(`  ${l}`));
  }

  // --- Next ---
  lines.push(``);
  lines.push(`Next`);
  lines.push(`  → sillyspec run verify`);

  return lines.join('\n');
}
