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

import { execFileSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync, mkdtempSync, rmSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { WorktreeManager } from './worktree.js';
import { parseFileChangeList, parseFileChangeListDetailed, pathMatches } from './change-list.js';
import { parseAllowedPaths, parseRepo } from './stages/plan-postcheck.js';
import { git, gitQuiet } from './git-helper.js';
import { resolveLatestExecuteRunId, readReview } from './task-review.js';

const CHANGES_REL = '.sillyspec/changes';

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
 * dirty 拦截触发时生成「逐文件 rescue 指令」——旁路 git apply 的安全逃生通道（design §接口定义 generateRescueCommands）。
 *
 * 逐文件四分类（按优先级判定，命中即 continue）：
 *   1. DELETE           ∈ deletedFiles      → rm "<projectRoot>/<f>"（不计 cpFileCount 也不计 excludedCount）
 *   2. EXCLUDE-DIRTY    ∈ dirtyFiles        → warning（cp 会覆盖 main 工作区未提交改动），excludedCount++
 *   3. EXCLUDE-MISMATCH ∈ hashMismatchFiles → warning（cp 会回退主干已提交推进改动），excludedCount++
 *   4. SAFE-CP          其余（main 该文件干净）→ cp "<worktreePath>/<f>" "<projectRoot>/<f>"，cpFileCount++
 *
 * 路径用 path.join 拼接后 replace 反斜杠为正斜杠（Git Bash 兼容，规则 13）。
 *
 * 纯函数：无 git/fs 调用无副作用，不读 meta/worktree 状态，不 mutate 入参；
 *        所有 dirtyFiles/hashMismatchFiles/deletedFiles 集合均由调用方（step4.5/5a/assess）算好传入。
 *
 * @param {object} args
 * @param {string[]} args.changedFiles        filterDeliverableFiles 后的实际变更路径
 * @param {Set<string>|string[]} args.dirtyFiles   main 工作区未提交文件集（统一口径：tracked-modified ∪ untracked，排 .sillyspec/+meta.json）
 * @param {string[]} args.hashMismatchFiles   主干已提交推进文件（step3.5 前移算，依赖 baseHash/HEAD blob 对比）
 * @param {string[]} [args.deletedFiles=[]]   worktree 删除文件（git diff name-status D）
 * @param {string} args.worktreePath
 * @param {string} args.projectRoot
 * @returns {{
 *   commands: string[],      // 可复制粘贴 shell 命令（cp/rm），正斜杠路径
 *   warnings: string[],      // 被排除文件（dirty/mismatch）的风险标注
 *   cpFileCount: number,     // SAFE-CP 文件数
 *   excludedCount: number    // EXCLUDE-DIRTY + EXCLUDE-MISMATCH 数
 * }}
 */
export function generateRescueCommands({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles = [], worktreePath, projectRoot }) {
  // 集合归一：dirtyFiles 接受 Set 或数组（调用方 step4.5/5a 可能传任一形态），其余统一数组→Set
  const dirtySet = dirtyFiles instanceof Set ? dirtyFiles : new Set(dirtyFiles || []);
  const mismatchSet = new Set(hashMismatchFiles || []);
  const deletedSet = new Set(deletedFiles || []);

  const commands = [];
  const warnings = [];
  let cpFileCount = 0;
  let excludedCount = 0;

  for (const f of changedFiles) {
    // 优先级 1→2→3→4，命中即 continue（DELETE 最先判）
    if (deletedSet.has(f)) {
      commands.push(`rm "${join(projectRoot, f).replace(/\\/g, '/')}"`);
      continue;
    }
    if (dirtySet.has(f)) {
      warnings.push(`跳过 ${f}：EXCLUDE-DIRTY（main 工作区该文件有未提交改动，cp 会覆盖）`);
      excludedCount++;
      continue;
    }
    if (mismatchSet.has(f)) {
      warnings.push(`跳过 ${f}：EXCLUDE-MISMATCH（主干已提交推进该文件，cp 会回退他人改动；请先 commit main 未提交改动再正常 apply 走 --3way 合并）`);
      excludedCount++;
      continue;
    }
    commands.push(`cp "${join(worktreePath, f).replace(/\\/g, '/')}" "${join(projectRoot, f).replace(/\\/g, '/')}"`);
    cpFileCount++;
  }

  return { commands, warnings, cpFileCount, excludedCount };
}

/**
 * 算 rescue 用的统一 dirtyFiles 口径：main 工作区所有未提交文件 = tracked-modified（git diff HEAD）
 * ∪ untracked（git ls-files others），再用 filterDeliverableFiles 过滤（排 .sillyspec/changes/.runtime/quicklog
 * + meta.json，保留 .sillyspec/docs/——对齐 changedFiles 同宇宙，闭合 design Grill 的 .sillyspec/docs/ 残留 gap）。
 * 注意：此口径与 step4.5「是否触发拦截」的判定口径（排除 .claude/docs/CLAUDE.md）不同，二者不混用（design §dirtyFiles 口径统一）。
 * @param {string} projectRoot
 * @returns {string[]} 未提交文件（filterDeliverableFiles 过滤后）
 */
export function computeRescueDirtyFiles(projectRoot) {
  const tracked = (gitQuiet(projectRoot, ['diff', '--name-only', 'HEAD']) || '').split('\n').filter(Boolean);
  const untracked = (gitQuiet(projectRoot, ['ls-files', '--others', '--exclude-standard']) || '').split('\n').filter(Boolean);
  return filterDeliverableFiles([...new Set([...tracked, ...untracked])]);
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
 * 不在时都不给，等价。（沿用公共 git() 数组形式，不经 shell、不引入引号/空格破法。）
 *
 * @param {string} cwd
 * @param {string} treeish
 * @param {string[]} files
 * @returns {Map<string, string>} path → blob hash（仅含存在于 tree 中的文件）
 */
function getBlobHashMap(cwd, treeish, files) {
  const map = new Map();
  if (files.length === 0) return map; // 空 pathspec 会让 ls-tree 列出整棵树，必须拦截
  const raw = gitQuiet(cwd, ['ls-tree', treeish, '--', ...files]);
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
 * **跨仓切片（task-05 / D-009 / design §6 A4）**：返回 `Map<repoKey, Set<path>>`，按 task 卡片
 * `repo:` 字段把 allowed_paths 归属到对应 repo；design §6 清单归属 'main'（清单文件相对主仓根）。
 * 单仓 change（task 卡无 repo:）→ 所有 allowed_paths 归 'main' → `{main: Set}` 退化零回归
 * （GOAL-2）。allowed_paths 基准=各 repo 自身根（跨仓 task 卡片 allowed_paths 相对跨仓仓根，design §7.2）。
 *
 * 主流程（applyWorktree A5 主仓 apply）只消费 main 仓的 Set（主仓 worktree diff 只含主仓文件，
 * 跨仓文件不在主仓 worktree 故永不进 diff）；跨仓 task 走 no-op（D-009），其 allowed_paths 仅
 * 作 Map 切片返回，供上游（assess / 跨仓 review 校验）按 repo 取用。
 *
 * @param {string} projectRoot - 主仓库根
 * @param {string} changeName - 变更名
 * @returns {Map<string, Set<string>>} repoKey → 并集清单 Set（无 design 清单且无 task 卡片时为空 Map）
 */
export function resolveApplyAllowSet(projectRoot, changeName) {
  const repoMap = new Map();
  const getOrCreate = (key) => {
    if (!repoMap.has(key)) repoMap.set(key, new Set());
    return repoMap.get(key);
  };
  // design §6 清单归属 main（清单路径相对主仓根；跨仓 task 的 allowed_paths 由 task 卡片 repo 切片）
  const mainSet = getOrCreate('main');
  parseFileChangeList(
    join(projectRoot, CHANGES_REL, changeName, 'design.md'),
    { keepSillyspecDocs: true }
  ).forEach(p => mainSet.add(p));
  const tasksDir = join(projectRoot, CHANGES_REL, changeName, 'tasks');
  if (existsSync(tasksDir)) {
    for (const tf of readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))) {
      const content = readFileSync(join(tasksDir, tf), 'utf8');
      // task 卡 repo: 字段切片（缺省='main'，design §7.2）；跨仓 task 的 allowed_paths 相对跨仓仓根。
      const repoKey = parseRepo(content) || 'main';
      const repoSet = getOrCreate(repoKey);
      for (const p of parseAllowedPaths(content)) repoSet.add(p);
    }
  }
  return repoMap;
}

/**
 * 跨仓 task apply = no-op 校验（task-05 / D-009 / design §6 A3 G1）。
 *
 * 跨仓 task 的 commit 已由子代理直接落跨仓仓主干（NG-3），apply 阶段无 patch 可打（跨仓仓无
 * worktree/meta/分支——A5 patch 路径不可复用）。本函数对每个跨仓 repo 的 task review.head
 * 校验是否为该跨仓仓真实 commit（约束①+② 保险，R-05：子代理漏 commit / head 伪造 → 这里拦）。
 *
 * 不调 wm.cleanup（跨仓仓无主仓 worktree 可清——wm.cleanup 只作用主仓 worktree，跨仓仓主干工作区
 * 永不进主仓 worktree 生命周期，无需也无法 cleanup）。这是 D-009 no-op 的关键：跨仓 commit 已落主干，
 * apply 只校验不复用 patch、不 cleanup。
 *
 * review.json 物理在主仓 execute-runs（D-003），含 repo + head 字段（design §7.4）。本函数读主仓
 * execute-runs 取最新 runId 的 reviews，按 review.repo 切片到对应跨仓 entry 校验 head。
 *
 * 无 review.json（execute 未走完 / 单 task --done 中途）→ 记 warning 不阻断（apply 可在 review 落盘前
 * 被调用，如 worktree apply --check-only 预检；真阻断由 Task Review Gate 负责，这里不重复）。
 *
 * @param {object} ctx - MultiRepoContext（design §7.1）
 * @param {string} projectRoot - 主仓根（读 .sillyspec/.runtime/execute-runs）
 * @param {string} changeName
 * @returns {{ errors: string[], warnings: string[], validated: Array<{repo:string, task:string, head:string}> }}
 */
function validateCrossRepoNoOp(ctx, projectRoot, changeName) {
  const errors = [];
  const warnings = [];
  const validated = [];
  if (!ctx || typeof ctx.hasCrossRepo !== 'function' || !ctx.hasCrossRepo()) {
    return { errors, warnings, validated }; // 单仓退化：无跨仓，no-op 无事可做（零回归）
  }
  // review.json 物理在主仓 .runtime/execute-runs（D-003）。runtimeRoot = <projectRoot>/.sillyspec/.runtime
  const runtimeRoot = join(projectRoot, '.sillyspec', '.runtime');
  const runId = resolveLatestExecuteRunId({ runtimeRoot, changeName });
  if (!runId) {
    // 无 execute run → 无 review 可校验。不阻断（Task Review Gate 负责拦截 review 缺失），
    // 仅 warn 提示跨仓 head 校验被跳过（约束①保险在此场景未触发，但功能不崩）。
    warnings.push(`跨仓 task no-op 校验跳过：未找到 execute runId（${runtimeRoot}），无法读取跨仓 review.head。跨仓 commit 校验交由 Task Review Gate 负责。`);
    return { errors, warnings, validated };
  }
  const tasksDir = join(runtimeRoot, 'execute-runs', runId, 'tasks');
  if (!existsSync(tasksDir)) {
    warnings.push(`跨仓 task no-op 校验跳过：execute run ${runId} 无 tasks/ 目录。`);
    return { errors, warnings, validated };
  }
  // 遍历 ctx.repos，只对跨仓 entry（isMain=false）校验。每 entry 读所有 review.json 取 repo 匹配的 head。
  for (const [repoKey, entry] of ctx.repos) {
    if (entry.isMain) continue; // 主仓走 A5，不在此 no-op
    // 扫 tasks/ 下 review.json，取 repo === repoKey 的 head 校验
    let taskEntries = [];
    try { taskEntries = readdirSync(tasksDir).filter(f => /^task-\d+$/.test(f)); } catch { taskEntries = []; }
    for (const taskId of taskEntries) {
      const reviewPath = join(tasksDir, taskId, 'review.json');
      if (!existsSync(reviewPath)) continue;
      const r = readReview(reviewPath);
      // readReview 走 validateReviewSchema（task-03 扩展 repo 字段后兼容）；review 不完整则跳过（不在此拦）
      if (!r.ok || !r.review) continue;
      const reviewRepo = r.review.repo || 'main'; // schemaVersion=1 无 repo 视 main（design §9 兼容）
      if (reviewRepo !== repoKey) continue;
      const head = r.review.head;
      if (!head) continue; // schema 校验已挡缺 head，防御性跳过
      // 校验 head 是该跨仓仓真实 commit：git cat-file -e HEAD~0 / rev-parse 校验存在
      // 用 cat-file -e <head> 校验 commit 存在（rev-parse 对缩写/不存在都非零退出）
      const exists = gitQuiet(entry.gitDir, ['cat-file', '-e', head]);
      if (exists === null) {
        errors.push(
          `跨仓 task no-op 校验失败：task ${taskId}（repo: ${repoKey}）的 review.head ${head} ` +
          `不是跨仓仓 ${entry.gitDir} 的真实 commit（git cat-file -e 失败）。` +
          `跨仓 task 的 commit 必须由子代理直接落跨仓仓主干（D-009），apply 为 no-op 不复用 patch，` +
          `故 head 真实性是跨仓改动落地的唯一保险（约束①+②，R-05）。请检查子代理是否漏 commit 或 head 锡点漂移。`
        );
      } else {
        validated.push({ repo: repoKey, task: taskId, head });
      }
    }
  }
  return { errors, warnings, validated };
}

/**
 * apply worktree 变更到主工作区
 *
 * **跨仓 task no-op（task-05 / D-009 / design §6 A3/A5）**：当传 ctx 且 ctx.hasCrossRepo() 时，
 * 跨仓 task 的 commit 已由子代理直接落跨仓仓主干（NG-3 跨仓不经主仓 worktree），apply 阶段对跨仓
 * task = no-op（无 patch 可打，跨仓仓无 worktree/meta/分支——A5 patch 路径不可复用）。只校验跨仓
 * task review.head 是跨仓仓真实 commit（约束①+② 保险，R-05）+ 不调 wm.cleanup（跨仓仓无主仓 worktree
 * 可清，wm.cleanup 只作用于主仓 worktree）。主仓 task 走原 A5 完整 apply 不动（GOAL-2 单仓零回归）。
 *
 * @param {string} changeName - 变更名
 * @param {{ cwd?: string, checkOnly?: boolean, merge?: boolean, ctx?: object }} opts
 *   - ctx：可选 MultiRepoContext（design §7.1）。缺省=单仓退化（仅主仓 apply，零行为变化，GOAL-2）。
 *     提供 ctx 且含跨仓 entry 时，触发跨仓 no-op 校验（校验 review.head 真实 + 不 cleanup 跨仓）。
 * @returns {{
 *   ok: boolean,
 *   changedFiles: string[],
 *   extraFiles: string[],
 *   hashMismatchFiles: string[],
 *   patchPath: string|null,
 *   errors: string[],
 *   crossRepoValidated?: Array<{ repo: string, head: string }>
 * }}
 */
export function applyWorktree(changeName, { cwd, checkOnly = false, merge = false, ctx = null } = {}) {
  const projectRoot = cwd || process.cwd();
  const wm = new WorktreeManager({ cwd: projectRoot });
  const meta = wm.getMeta(changeName);
  const result = {
    ok: false,
    changedFiles: [],
    extraFiles: [],
    hashMismatchFiles: [],
    deletedFiles: [],
    rescueCommands: null,
    patchPath: null,
    errors: [],
    merged: false,
    crossRepoValidated: [],
  };

  // --- 0. 跨仓 task no-op 校验（task-05 / D-009） ---
  // 跨仓 task 的 commit 已落跨仓仓主干，apply = no-op（无 patch）。仅校验 review.head 是跨仓仓真实
  // commit + 不 cleanup（wm.cleanup 只作用主仓 worktree）。校验失败 → 推 errors 阻断 apply（R-05）。
  // 单仓 ctx 缺省 / 无跨仓 entry → validateCrossRepoNoOp 直接返回空（零回归）。
  if (ctx) {
    const cross = validateCrossRepoNoOp(ctx, projectRoot, changeName);
    for (const e of cross.errors) result.errors.push(e);
    if (cross.warnings.length > 0) result.warnings = (result.warnings || []).concat(cross.warnings);
    result.crossRepoValidated = cross.validated;
    // 跨仓 head 校验失败 = 跨仓改动未真落地，apply 不可继续（即使主仓 patch 能跑，跨仓 task 实际未完成）
    if (cross.errors.length > 0) return result;
  }

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
  const deletedFiles = [];
  try {
    // 用 --name-status 捕获 rename/delete（--name-only 会丢失 rename 源文件）
    const statusRaw = git(worktreePath, ['diff', '--name-status', diffBase]);
    const statusFiles = new Set();
    if (statusRaw) {
      for (const line of statusRaw.split('\n').filter(Boolean)) {
        const parts = line.split('\t');
        // R100 old.txt new.txt → 提取两个文件
        if (parts.length >= 2) statusFiles.add(parts[parts.length - 1]);
        if (parts.length >= 3) statusFiles.add(parts[parts.length - 2]);
        // 删除文件（status D / D100）→ 收集到 deletedFiles（rescue DELETE 分类用，design §逐文件分类）
        if (parts[0].startsWith('D')) deletedFiles.push(parts[parts.length - 1]);
      }
    }

    // untracked 新文件（diffBase 中不存在的文件）
    const untrackedRaw = gitQuiet(worktreePath, ['ls-files', '--others', '--exclude-standard']);
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
  result.deletedFiles = deletedFiles;

  if (changedFiles.length === 0) {
    // 没有变更
    if (!checkOnly) {
      wm.cleanup(changeName, { force: true });
    }
    result.ok = true;
    return result;
  }

  // --- 3. 解析 apply 文件清单（design §6 清单 ∪ plan TaskCard allowed_paths，execute 复盘 c） ---
  // resolveApplyAllowSet 返回 Map<repo, Set>（task-05 跨仓切片）；主仓 apply 只消费 main 仓 Set
  // （主仓 worktree diff 只含主仓文件，跨仓文件在跨仓仓不进主仓 worktree diff）。跨仓 allowed_paths
  // 仅作 Map 切片返回供上游用，主流程不消费（跨仓 apply=no-op，D-009）。
  const allowMap = resolveApplyAllowSet(projectRoot, changeName);
  const allowSet = allowMap.get('main') || new Set();
  const hasAllowList = allowSet.size > 0;

  // --- 3.5 主干已提交推进检测：hashMismatch 前移（Grill P0 修复，design §step 顺序修正）---
  // 原在 step5b，但 step4.5/5a dirty 拦截短路在 step5b 之前，致 rescue 拿不到 hashMismatchFiles
  // → EXCLUDE-MISMATCH 失效 → cp 覆盖主干已提交推进。前移到 step4.5 之前（仅依赖 baseHash/HEAD blob
  // 对比，无 dirty 依赖；allowSet/changedFiles/baseHash 均在本步之前可得，前移安全）。
  // 仅记录不拦截（交 step7 --3way 实测，真重叠回滚提示 --merge）。
  const targetFiles = hasAllowList ? [...allowSet] : changedFiles;
  const wtHashMap = getBlobHashMap(worktreePath, baseHash, targetFiles);
  const mainHashMap = getBlobHashMap(projectRoot, 'HEAD', targetFiles);
  for (const f of targetFiles) {
    const wtBlob = wtHashMap.get(f) ?? null;
    const mainBlob = mainHashMap.get(f) ?? null;
    if (wtBlob === null && mainBlob === null) continue;
    if (wtBlob === mainBlob) continue;
    result.hashMismatchFiles.push(f);
  }

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
  // 哪怕脏文件与 patch 不重叠）——这是 Windows/autocrlf 的 CRLF 副作用（非 git 本质限制：
  // autocrlf off 时 --3way 在不重叠 dirty 树能 Applied cleanly，on 时才报 does not match index）。
  // 但仓库 CRLF 混用 + 规则13 要求 Windows 兼容，fail-loud 在 Windows 仍有据，故此处友好拦截，引导用户先 commit/stash。
  // 排除非交付物的元数据/文档 churn（execute 自身改的 + 多操作者常改的 agent 指引/文档），
  // 否则别人改 CLAUDE.md/docs/.claude → 判定 dirty → apply 误阻断（多操作者仓库高频踩坑）。
  // 注意：排除规则必须和 computeBaselineHash (worktree.js) 一致（虽已不比对 hash，仍用同一口径判当前 dirty）。
  if (meta.baselineHash) {
    // pathspec：`--` 结束选项，`.` 包含全部，后续 :(exclude) 排除非交付物元数据/文档 churn
    // （与 computeBaselineHash 同口径）。数组形式逐元素传递，:(exclude) magic 字面直传不经 shell。
    const exclude = ['--', '.', ':(exclude).sillyspec/', ':(exclude).claude/', ':(exclude)docs/', ':(exclude)CLAUDE.md'];
    const staged = gitQuiet(projectRoot, ['diff', '--cached', ...exclude]) || '';
    const unstaged = gitQuiet(projectRoot, ['diff', ...exclude]) || '';
    const untracked = gitQuiet(projectRoot, ['ls-files', '--others', '--exclude-standard', ...exclude]) || '';
    // 意图（与 computeBaselineHash 注释一致）：只挡「未提交 dirty」——git apply --3way 对 dirty 工作区不稳。
    // 不比对 hash 是否等于 execute 启动时 baselineHash：主仓 dirty→clean（execute 期间 commit 无关文件）后
    // hash 必变，若仍比对会永久死锁（须手改 meta.baselineHash）。改判「排除规则下当前是否有未提交 dirty」。
    const hasUncommittedDirty = staged !== '' || unstaged !== '' || untracked !== '';
    if (hasUncommittedDirty) {
      // 未提交 dirty 拦截：列脏文件 + 指引先 commit/stash（git --3way 对 dirty 工作区不稳，merge 同理，故不再提 --merge）
      const dirtyFiles = [...new Set(
        ((gitQuiet(projectRoot, ['diff', '--name-only', 'HEAD']) || '').split('\n').filter(Boolean))
          .concat((gitQuiet(projectRoot, ['ls-files', '--others', '--exclude-standard']) || '').split('\n').filter(Boolean))
      )].filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json');
      // rescue：dirty 拦截触发时生成逐文件 cp 安全子集（旁路 git apply），写 result.rescueCommands 供 assess/打印器消费
      const rescueDirty = computeRescueDirtyFiles(projectRoot);
      result.rescueCommands = generateRescueCommands({
        changedFiles,
        dirtyFiles: rescueDirty,
        hashMismatchFiles: result.hashMismatchFiles,
        deletedFiles: result.deletedFiles,
        worktreePath,
        projectRoot,
      });
      result.errors.push(
        `主工作区有未提交的改动，git apply 无法安全应用。\n` +
        (dirtyFiles.length > 0 ? `未提交文件：\n  ${dirtyFiles.join('\n  ')}\n` : '') +
        `请先提交或暂存这些改动，再重新 apply：\n  git add -A && git commit -m "..."   或   git stash\n` +
        (result.rescueCommands.commands.length > 0 || result.rescueCommands.warnings.length > 0
          ? `或手动 rescue（旁路 git apply，逐文件 cp 安全子集；cp 后需手动 sillyspec worktree cleanup ${changeName}）：\n` +
            result.rescueCommands.commands.map(c => `  ${c}`).join('\n') +
            (result.rescueCommands.warnings.length > 0 ? '\n' + result.rescueCommands.warnings.map(w => `  ${w}`).join('\n') : '') +
            `\n  （共 ${result.rescueCommands.cpFileCount} 个可安全 cp，${result.rescueCommands.excludedCount} 个被排除）\n`
          : '')
      );
      if (!checkOnly) return result; // checkOnly 收集不短路（一次报全）；真实 apply 短路
    }
  }

  // --- 5. 校验：主工作区文件 base hash 一致 ---
  // 5a. 检查主工作区是否有未 commit 的脏文件（会影响 apply）
  const mainDirtyRaw = gitQuiet(projectRoot, ['diff', '--name-only', 'HEAD']);
  const mainDirtyFiles = mainDirtyRaw ? mainDirtyRaw.split('\n').filter(Boolean) : [];
  if (mainDirtyFiles.length > 0) {
    // 如果脏文件和本次 apply 的文件有交集 → 报错
    const conflictDirty = mainDirtyFiles.filter(f => changedFiles.includes(f));
    if (conflictDirty.length > 0) {
      const rescueDirty5a = computeRescueDirtyFiles(projectRoot);
      result.rescueCommands = generateRescueCommands({
        changedFiles, dirtyFiles: rescueDirty5a, hashMismatchFiles: result.hashMismatchFiles,
        deletedFiles: result.deletedFiles, worktreePath, projectRoot,
      });
      result.errors.push(
        `主工作区有以下未 commit 的变更，会影响 apply：\n  ${conflictDirty.join('\n  ')}\n请先 commit 或 stash 这些变更。` +
        (result.rescueCommands.commands.length > 0 || result.rescueCommands.warnings.length > 0
          ? `或手动 rescue（旁路 git apply，逐文件 cp 安全子集；cp 后需手动 sillyspec worktree cleanup ${changeName}）：\n` +
            result.rescueCommands.commands.map(c => `  ${c}`).join('\n') +
            (result.rescueCommands.warnings.length > 0 ? '\n' + result.rescueCommands.warnings.map(w => `  ${w}`).join('\n') : '') +
            `\n  （共 ${result.rescueCommands.cpFileCount} 个可安全 cp，${result.rescueCommands.excludedCount} 个被排除）\n`
          : '')
      );
      if (!checkOnly) return result; // checkOnly 收集不短路（一次报全）；真实 apply 短路
    }
  }

  // 5b hashMismatch 计算已前移到 step3.5（Grill P0），见上

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
      ? (gitQuiet(worktreePath, ['ls-files', '--', ...patchFiles]) || '').split('\n').filter(Boolean)
      : [];
    const inIndex = new Set(inIndexList);
    const trackedFiles = patchFiles.filter(f => inTree.has(f) || inIndex.has(f));
    const trackedSet = new Set(trackedFiles);
    const untrackedPatchFiles = patchFiles.filter(f => !trackedSet.has(f));

    // tracked 文件：git diff baseHash（数组形式，文件名逐个展开为独立 argv，不经 shell；
    // trim:false 保留二进制补丁原样，timeout 放大到 60s 防大 diff 超时——原裸 execSync 无 timeout）
    if (trackedFiles.length > 0) {
      patchContent += git(
        worktreePath,
        ['diff', '--binary', diffBase, '--', ...trackedFiles],
        { trim: false, timeout: 60000 }
      );
    }

    // untracked 新文件：git add 到 index，git diff --cached，然后 reset（均数组形式，文件名逐个展开）
    if (untrackedPatchFiles.length > 0) {
      git(worktreePath, ['add', '--', ...untrackedPatchFiles]);
      try {
        // trim:false 保留二进制补丁原样，timeout 放大到 60s 防大 diff 超时
        patchContent += git(
          worktreePath,
          ['diff', '--binary', '--cached', '--', ...untrackedPatchFiles],
          { trim: false, timeout: 60000 }
        );
      } finally {
        // 重置 index（不保留 staged 状态）
        gitQuiet(worktreePath, ['reset', 'HEAD', '--', ...untrackedPatchFiles]);
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
      return gitQuiet(projectRoot, ['cat-file', '-e', `HEAD:${f}`]) === null ? false : true;
    });
    const newPatchFiles = patchFiles.filter(f => !trackedPatchFiles.includes(f));

    // apply --3way 正式应用（主干已提交推进时自动三路合并）
    try {
      git(projectRoot, ['apply', '--3way', patchPath], { timeout: 30000 });
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
      wm.cleanup(changeName, { force: true });
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
    const unmerged = gitQuiet(projectRoot, ['diff', '--name-only', '--diff-filter=U']) || '';
    conflicts = unmerged.split('\n').filter(Boolean);
  } catch {}
  // 回滚 tracked 文件到 HEAD（强制从 HEAD 还原——--3way 冲突标记同时污染工作区和 index，
  // `checkout -- f` 从 index 还原会拿到冲突版，必须 `checkout HEAD -- f` 才能还原干净）
  for (const f of trackedFiles) {
    try { gitQuiet(projectRoot, ['checkout', 'HEAD', '--', f]); } catch (e) { error = (error ? error + '; ' : '') + `checkout ${f}: ${e.message}`; }
  }
  // 删除 --3way 可能新建的文件（apply 前不存在）
  for (const f of newFiles) {
    try {
      const p = join(projectRoot, f);
      if (existsSync(p)) unlinkSync(p);
    } catch (e) { error = (error ? error + '; ' : '') + `delete ${f}: ${e.message}`; }
  }
  // 兜底：若 index 处于 unmerged 状态，重置 index（不影响工作区已还原的文件）
  try { gitQuiet(projectRoot, ['reset', '--quiet']); } catch {}
  return { conflicts, error };
}

/**
 * merge 前预对齐 baseline 并行文件到 main 版（D-002@v1 / task-02）。
 *
 * 背景：baseline checkpoint 把 execute 启动时主仓 dirty 的并行会话文件快照进了 worktree 分支
 * （worktree.js _createBaselineCheckpoint）。apply --merge 时主仓常已把这批文件推进（并行会话
 * 落了 commit），分支侧旧快照与 main 新版在 merge-base 两侧同改同一文件 → merge 冲突。预对齐在
 * merge 前把这批文件 checkout 成 main 版并提交到分支，使三方合并对该文件 ours == theirs，
 * 消除冲突主因。
 *
 * 过滤集（四条件全满足才对齐；任一不满足跳过该文件）：
 *   a. baseline checkpoint 文件集（已提交口径）：git diff --name-only <baseHash>..<baselineCommit>
 *      ——不用 result.changedFiles（工作区口径且已过滤基础设施文件）
 *   b. ∩ main 已推进集：git diff --name-only <merge-base>..<main HEAD>
 *      （merge-base = 分支与 main HEAD 的最近公共祖先）
 *   c. ∖ 分支已变更集：git diff --name-only <baselineCommit>..<branch> 含该文件（本变更交付，不动）
 *   d. ∖ worktree 工作区 dirty 集：git status --porcelain -- <file> 非空（未提交改动会被 checkout 覆盖）
 *   另排除「main HEAD 与分支 tip 内容已一致」的文件（对齐无意义，且防 nothing-to-commit 空提交）。
 *
 * 执行 cwd：checkout/commit 在 worktreePath（改的是 worktree 分支的 index+工作区）；mainHead /
 * merge-base 锚点在 projectRoot 读取。merge 本身仍在 projectRoot（applyByMerge 原逻辑不动）。
 *
 * 降级（不阻断）：不适用场景（无 baseline checkpoint / 非 worktree 模式（in-place 的 worktreePath
 * 就是主工作区，在其上 commit 等于绕过验收污染 main；native-worktree 是外部隔离环境）/ worktree
 * 目录丢失 / worktree HEAD ≠ 分支 tip（checkout+commit 会落错分支，merge 的却是 meta.branch））
 * 静默跳过；任一 git 步骤失败 → best-effort 回滚已 checkout 文件 + console.warn + result.warnings
 * → 调用方走原 merge 路径（降级不阻断，D-002@v1 约束③）。
 *
 * @param {object} p
 * @param {object} p.meta - worktree meta（baseHash / baselineCommit / worktreePath / mode）
 * @param {string} p.branch - 将被 merge 的分支名（meta.branch）
 * @param {string} p.projectRoot - 主仓库根（merge 的执行侧）
 * @param {object} p.result - applyWorktree 的 result（预对齐信息写入 result.warnings，可追溯，约束④）
 * @returns {{ aligned: string[], commit: string|null }} aligned=本次对齐的文件（空数组=未对齐）
 */
function preAlignBaselineToMain({ meta, branch, projectRoot, result }) {
  const pushWarning = (msg) => {
    result.warnings = result.warnings || [];
    result.warnings.push(msg);
  };

  // 不适用场景（非失败，静默跳过）
  if (!meta || !meta.baseHash || !meta.baselineCommit) return { aligned: [], commit: null };
  if (meta.mode && meta.mode !== 'worktree') return { aligned: [], commit: null };
  const worktreePath = meta.worktreePath;
  if (!worktreePath || !existsSync(worktreePath)) return { aligned: [], commit: null };
  const wtHead = gitQuiet(worktreePath, ['rev-parse', 'HEAD']);
  const branchTip = gitQuiet(projectRoot, ['rev-parse', branch]);
  if (!wtHead || !branchTip || wtHead !== branchTip) return { aligned: [], commit: null };

  const { baseHash, baselineCommit } = meta;
  const done = []; // 已 checkout 的文件（失败回滚用）
  try {
    // (a) baseline checkpoint 文件集（已提交口径；--no-renames：rename 退化为 D+A，两侧路径都进集）
    const baselineSet = new Set(
      (git(worktreePath, ['diff', '--no-renames', '--name-only', baseHash, baselineCommit]) || '')
        .split('\n').filter(Boolean)
    );
    if (baselineSet.size === 0) return { aligned: [], commit: null };

    // (b) main 已推进集（merge-base 后 main HEAD 的树差异；锚点拿不到 → 交原 merge，不算失败）
    const mainHead = git(projectRoot, ['rev-parse', 'HEAD']);
    const mergeBase = git(projectRoot, ['merge-base', branch, 'HEAD']);
    if (!mainHead || !mergeBase) return { aligned: [], commit: null };
    const mainAdvanced = new Set(
      (git(projectRoot, ['diff', '--no-renames', '--name-only', mergeBase, mainHead]) || '')
        .split('\n').filter(Boolean)
    );

    // (c) 分支已变更集（baselineCommit → 分支 tip 的已提交交付，不动）
    const branchChanged = new Set(
      (git(worktreePath, ['diff', '--no-renames', '--name-only', baselineCommit, branchTip]) || '')
        .split('\n').filter(Boolean)
    );

    // (d) worktree 工作区 dirty + 两侧 HEAD 同内容排除 → 最终对齐集
    const candidates = [];
    for (const f of baselineSet) {
      if (!mainAdvanced.has(f) || branchChanged.has(f)) continue;
      // dirty（checkout 会覆盖 worktree 未提交改动）→ 跳过该文件
      if ((gitQuiet(worktreePath, ['status', '--porcelain', '--', f]) || '') !== '') continue;
      // main HEAD 与分支 tip 内容已一致 → 对齐无意义 + 防空提交
      if ((gitQuiet(worktreePath, ['diff', '--name-only', mainHead, branchTip, '--', f]) || '') === '') continue;
      candidates.push(f);
    }
    if (candidates.length === 0) return { aligned: [], commit: null };

    // 对齐：逐文件 checkout main 版（worktree 内执行，同时更新 worktree 分支的 index+工作区）
    for (const f of candidates) {
      git(worktreePath, ['checkout', mainHead, '--', f]);
      done.push(f);
    }
    // 显式 pathspec 提交：只提交对齐文件，不扫入 worktree 内其他 staged 改动（坑 git-commit-sweeps-prestaged）。
    // --no-verify：对齐 commit 与 baseline checkpoint 同性质（锚点非交付物，worktree.js _createBaselineCheckpoint
    // 同款处理）——项目 pre-commit hook（如 husky lint+全量测试）会把预对齐拖成分钟级甚至失败降级。
    git(worktreePath, [
      'commit', '--no-verify', '-m',
      `sillyspec: align baseline files to main (pre-merge, ${done.length} files)`,
      '--', ...done,
    ]);
    const shortHash = gitQuiet(worktreePath, ['rev-parse', '--short', 'HEAD']);
    pushWarning(
      `merge 前预对齐 ${done.length} 个 baseline 并行文件到 main 版` +
      `${shortHash ? `（align commit ${shortHash}）` : ''}：${done.join(', ')}`
    );
    return { aligned: done, commit: shortHash };
  } catch (e) {
    // 降级：任一步失败 → best-effort 回滚已 checkout 文件（checkout <branchTip> -- f 还原 index+工作区）
    for (const f of done) {
      gitQuiet(worktreePath, ['checkout', branchTip, '--', f]);
    }
    const msg = `baseline 预对齐失败，已跳过（降级走原 merge 路径）：${(e.message || '').split('\n')[0]}` +
      (done.length > 0 ? `；已回滚 ${done.length} 个已 checkout 文件` : '');
    console.warn(`⚠️  ${msg}`);
    pushWarning(msg);
    return { aligned: [], commit: null };
  }
}

/**
 * baseline 漂移时的 merge 降级路径（D-001）。
 *
 * 当主工作区 baseline 在 execute 期间漂移、patch 无法干净应用时，用
 * `git merge sillyspec/<change>` 替代 patch apply（BRANCH_PREFIX='sillyspec/'，worktree.js:18）。
 * git merge 比 patch 鲁棒，能处理 baseline 漂移 + 潜在冲突。会引入合并提交
 * （D-002：与 worktree.md:84「patch 而非 merge 保持线性历史」架构决策的张力——
 * 仅作 --merge 显式 opt-in，不改变默认 patch 行为）。
 * merge 前先经 preAlignBaselineToMain 预对齐 baseline 并行文件到 main 版（D-002@v1 / task-02，失败降级走原 merge）。
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

  // --- merge 前预对齐（D-002@v1 / task-02）：baseline 并行旧文件对齐 main 版，消除 merge 冲突主因 ---
  preAlignBaselineToMain({ meta, branch, projectRoot, result });

  try {
    git(projectRoot, ['merge', '--no-ff', branch], { timeout: 30000 });
  } catch (e) {
    // merge 冲突：取冲突文件列表 + abort 回滚（不 cleanup，保留 worktree）
    let conflictFiles = [];
    try {
      const cf = gitQuiet(projectRoot, ['diff', '--name-only', '--diff-filter=U']);
      conflictFiles = cf ? cf.split('\n').filter(Boolean) : [];
    } catch {}
    try { gitQuiet(projectRoot, ['merge', '--abort']); } catch {}
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
  const notLanded = changedFiles.filter(f => gitQuiet(projectRoot, ['cat-file', '-e', `HEAD:${f}`]) === null);
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
  try { result.mergeSummary = git(projectRoot, ['log', '--oneline', '-1']); } catch {}
  try {
    wm.cleanup(changeName, { force: true });
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
      return { decision: 'BLOCKED', changedFiles: [], reasons, warnings, stats: { additions: 0, deletions: 0 }, rescueCommands: checkResult.rescueCommands || null };
    }
    return {
      decision: 'SAFE',
      changedFiles: [],
      reasons: ['无变更需要应用'],
      warnings: [],
      stats: { additions: 0, deletions: 0 },
      rescueCommands: checkResult.rescueCommands || null
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

  // 检查 6: diff 规模异常（两档：>5000 行 BLOCKED；2000~5000 行 WARNING——正常规模 change
  // 常超 2000 行（如 +2368），单档硬拦把正常变更逼进 rescue cp 手动路径，见 ql-20260815-001 复盘）
  const wtPath = meta?.worktreePath;
  const diffBase = meta?.baselineCommit || meta?.baseHash;
  let additions = 0, deletions = 0;
  if (wtPath && diffBase) {
    try {
      const shortstat = gitQuiet(wtPath, ['diff', '--shortstat', diffBase]);
      const insMatch = shortstat?.match(/(\d+) insertion/);
      const delMatch = shortstat?.match(/(\d+) deletion/);
      additions = insMatch ? parseInt(insMatch[1]) : 0;
      deletions = delMatch ? parseInt(delMatch[1]) : 0;
      if (additions + deletions > 5000) {
        reasons.push(`diff 规模异常（${additions} additions + ${deletions} deletions = ${additions + deletions} 行，超过 5000 硬上限）`);
      } else if (additions + deletions > 2000) {
        warnings.push(`diff 规模偏大（${additions} additions + ${deletions} deletions = ${additions + deletions} 行，2000~5000 区间放行为 WARNING，请确认属正常变更规模）`);
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

  return { decision, changedFiles, reasons, warnings, stats: { additions, deletions }, rescueCommands: checkResult.rescueCommands || null };
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
