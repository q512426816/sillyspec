/**
 * MultiRepoContext — 跨仓 task 运行时多仓执行上下文（W1 task-01）。
 *
 * 设计依据：design §7.1（接口权威定义）+ 决策 D-005/D-006/D-007/D-013。
 *
 * 收口 execute 链路 7 个单仓假设点（applyWorktree / validateTaskReviews /
 * runVerifyTestCheck / generateTaskReviewDrafts 等）——把"主仓=唯一仓库"假设
 * 抽成 Map<repoKey, RepoEntry>，单仓 change 退化为 {main:{...}} 单值 map 零回归
 * （GOAL-2），跨仓 change 实时反映各仓 HEAD（约束①）+ 配置错误 fail-closed（约束②）。
 *
 * 关键约束：
 *   - 约束①（D-006）：跨仓仓无 meta.json，base/head 不读 meta。resolveHead 实时
 *     `git -C <crossRepo> rev-parse HEAD`（不缓存，task 推进后过期）；resolveBase
 *     用 taskBaseCommit（task 卡 base_commit 锡点，跨仓必传）。
 *   - 约束②（D-007）：declaredRepos 有 key 不在 repoRegistry → throw；跨仓仓
 *     `git -C <crossRepo> rev-parse HEAD` 失败 → throw。配置错误不降级，不沿用
 *     主仓 verifyReviewGitEvidence 的 unavailable 降级（那是环境缺失容错；跨仓
 *     不可用是用户 local.yaml 配错，性质不同，必须阻断）。
 *   - D-013：execute 启动时构造一次，进程级缓存贯穿 execute/apply/verify（本模块
 *     不持有进程级缓存——ctx 实例本身就是进程级单例，由 execute 入口持有）。
 *
 * 不涉及生命周期契约（design §7.5）：纯内存对象，不跨进程、不持久化、不入库。
 */

import { git, gitQuiet } from '../git-helper.js';

/**
 * @typedef {Object} RepoEntry
 * @property {string} repoKey        - repo 标识（'main' 或 local.yaml repos: 的键名）
 * @property {string} gitDir         - git 工作目录（rev-parse/diff/apply 的 cwd）
 * @property {string} worktreePath   - 子代理工作目录（主仓=worktreePath 或 in-place-fallback 时=cwd；跨仓=跨仓仓根）
 * @property {string} projectRoot    - apply 目标根（主仓=主仓根；跨仓=跨仓仓根，但跨仓 apply=no-op 不用）
 * @property {boolean} isMain        - 是否主仓
 * @property {function} resolveHead  - () => string，实时 git rev-parse HEAD（跨仓不缓存）
 * @property {function} resolveBase  - (taskBaseCommit?) => string，base 锚点（主仓→meta.baseHash；跨仓→taskBaseCommit 必传）
 */

export class MultiRepoContext {
  /**
   * @param {Object} opts
   * @param {string} opts.cwd              - 主仓 cwd
   * @param {string} opts.changeName       - 当前 change 名（读 worktreeManager.getMeta）
   * @param {Object} [opts.platformOpts]   - 平台选项（specRoot 等，预留，本模块不消费）
   * @param {string[]} opts.declaredRepos  - 所有 task 卡片声明的 repo: 值（含 'main'）
   * @param {Map<string,string>} opts.repoRegistry - local.yaml repos: 段解析结果 Map<key, path>
   * @param {Object} opts.worktreeManager  - WorktreeManager 实例（主仓 meta 读取；in-place-fallback 兜底 cwd）
   * @throws {Error} 约束②: declaredRepos 中有 repoKey 不在 repoRegistry → 抛错列已注册 repo，阻断 execute
   *                 约束②: 跨仓仓 git rev-parse 失败（路径不存在/非 git 仓）→ 抛错阻断 execute
   */
  constructor({ cwd, changeName, platformOpts, declaredRepos, repoRegistry, worktreeManager }) {
    if (!cwd) throw new Error('MultiRepoContext: cwd 必传');
    if (!Array.isArray(declaredRepos)) throw new Error('MultiRepoContext: declaredRepos 必传为数组');
    if (!(repoRegistry instanceof Map)) throw new Error('MultiRepoContext: repoRegistry 必传为 Map<key,path>');
    if (!worktreeManager || typeof worktreeManager.getMeta !== 'function') {
      throw new Error('MultiRepoContext: worktreeManager 必传（需 getMeta 方法）');
    }

    this.cwd = cwd;
    this.changeName = changeName;
    this.platformOpts = platformOpts || {};
    this.repoRegistry = repoRegistry;
    this.worktreeManager = worktreeManager;

    // dedupe + 保留声明顺序（同一 repo 多 task 声明只建一项）
    const seen = new Set();
    const orderedKeys = [];
    for (const key of declaredRepos) {
      if (!seen.has(key)) {
        seen.add(key);
        orderedKeys.push(key);
      }
    }

    // 约束② fail-closed 预检：declaredRepos ⊆ repoRegistry ∪ {'main'}
    // main 隐式 = cwd，不要求注册；其余 key 必须在 repoRegistry 命中。
    const unregistered = orderedKeys.filter(k => k !== 'main' && !repoRegistry.has(k));
    if (unregistered.length > 0) {
      const registered = ['main (隐式)', ...repoRegistry.keys()];
      throw new Error(
        `MultiRepoContext: 以下 repo 未在 local.yaml repos: 段注册：[${unregistered.join(', ')}]。` +
        `当前已注册 repo：[${registered.join(', ')}]。` +
        `一键注册（每个缺的 key 各跑一次，勿手编 YAML）：` +
        unregistered.map(k => `sillyspec local register-repo ${k} <${k} 仓根路径>`).join('；') +
        `。补注册后再启动 execute（约束② fail-closed，跨仓 apply 走错仓=数据所有权事故）。`
      );
    }

    const map = new Map();
    for (const repoKey of orderedKeys) {
      map.set(repoKey, repoKey === 'main'
        ? this._buildMainEntry()
        : this._buildCrossRepoEntry(repoKey, repoRegistry.get(repoKey)));
    }
    this.map = map;
  }

  /**
   * 主仓 RepoEntry：isMain=true，读 worktreeManager.getMeta 的 baseHash + worktreePath。
   * in-place-fallback 模式（meta.mode==='in-place-fallback' 或 meta 缺失）worktreePath 兜底为 cwd。
   * @returns {RepoEntry}
   * @private
   */
  _buildMainEntry() {
    const meta = this.changeName ? this.worktreeManager.getMeta(this.changeName) : null;
    const isInPlace = !meta || meta.mode === 'in-place-fallback';
    const worktreePath = isInPlace ? this.cwd : (meta.worktreePath || this.cwd);
    const baseHash = meta?.baseHash || null;
    const gitDir = worktreePath; // 主仓 git 操作 cwd = worktree（或 in-place 的 cwd）
    const projectRoot = this.cwd;

    return {
      repoKey: 'main',
      gitDir,
      worktreePath,
      projectRoot,
      isMain: true,
      // 主仓 HEAD：从 worktree/cwd 实时取（不缓存）。主仓单仓不变式下也可用 meta.baseHash 作 base，
      // 但 HEAD 反映 worktree 当前态（子代理可能 commit 推进），故实时取与跨仓一致语义。
      resolveHead: () => git(gitDir, ['rev-parse', 'HEAD']),
      // 主仓 base：meta.baseHash（单仓不变式，CLI 创建 worktree 时锡点）。
      // 跨仓 base 不走这里（resolveBase 必传 taskBaseCommit，由 _buildCrossRepoEntry 闭包消费）。
      // 主仓忽略 taskBaseCommit 参数——主仓 base 永远锚 meta.baseHash，与单仓行为一致（零回归）。
      resolveBase: (_taskBaseCommit) => {
        if (!baseHash) {
          throw new Error(
            'MultiRepoContext: 主仓 meta.baseHash 缺失，无法解析 base。' +
            '可能 worktree 未创建或 meta.json 损坏——请先 sillyspec worktree doctor 检查。'
          );
        }
        return baseHash;
      },
    };
  }

  /**
   * 跨仓 RepoEntry：isMain=false，gitDir=projectRoot=worktreePath=跨仓仓根。
   * 构造时 `git -C <crossRepo> rev-parse HEAD` 必须 succeed（约束② fail-closed），
   * 路径不存在/非 git 仓 → throw 阻断 execute。
   * @param {string} repoKey
   * @param {string} crossRepoPath - repoRegistry 解析出的跨仓仓绝对路径
   * @returns {RepoEntry}
   * @private
   */
  _buildCrossRepoEntry(repoKey, crossRepoPath) {
    if (!crossRepoPath) {
      throw new Error(
        `MultiRepoContext: repo "${repoKey}" 在 local.yaml repos: 段注册但路径为空。` +
        `请补全路径（约束② fail-closed）。`
      );
    }
    // 约束②：跨仓 git 必须可达。失败 = 路径不存在 / 非 git 仓 / git 异常，一律阻断。
    // 不沿用主仓 verifyReviewGitEvidence unavailable 降级（design §9 兼容策略表）。
    let headVerify;
    try {
      headVerify = git(crossRepoPath, ['rev-parse', 'HEAD']);
    } catch (e) {
      throw new Error(
        `MultiRepoContext: 跨仓 repo "${repoKey}" git 不可达（路径：${crossRepoPath}）。` +
        `rev-parse HEAD 失败：${e.message}。` +
        `请检查 local.yaml repos: 段路径是否正确、目录是否存在且为 git 仓（约束② fail-closed，配置错误不降级）。`
      );
    }
    if (!headVerify) {
      // git() 返回空串属异常态（无 commit 的空仓 rev-parse HEAD 会非零退出，已被 catch 兜底），
      // 此处仅作防御性双保险，触发同样走 fail-closed。
      throw new Error(
        `MultiRepoContext: 跨仓 repo "${repoKey}"（${crossRepoPath}）rev-parse HEAD 返回空——` +
        `疑似空 git 仓（无 commit）。跨仓 task 需仓库已有至少一个 commit（约束② fail-closed）。`
      );
    }

    return {
      repoKey,
      gitDir: crossRepoPath,
      worktreePath: crossRepoPath,
      projectRoot: crossRepoPath,
      isMain: false,
      // 约束①：跨仓 HEAD 实时取，不缓存（task 推进后过期，每次 resolveHead 反映最新 HEAD）。
      resolveHead: () => git(crossRepoPath, ['rev-parse', 'HEAD']),
      // 约束①：跨仓 base = task 卡 base_commit 锡点（必传）。跨仓仓无 meta.json，
      // 不读 meta；taskBaseCommit 由 task-02 DeclaredRepos 之外的 task 卡 frontmatter 提供。
      resolveBase: (taskBaseCommit) => {
        if (!taskBaseCommit) {
          throw new Error(
            `MultiRepoContext: 跨仓 repo "${repoKey}" resolveBase 必传 taskBaseCommit（task 卡 base_commit 锡点）。` +
            `跨仓仓无 meta.json，base 只能由 task 卡片锡点提供（约束①）。`
          );
        }
        return taskBaseCommit;
      },
    };
  }

  /** @returns {RepoEntry|null} */
  resolve(repoKey) {
    return this.map.get(repoKey) || null;
  }

  /** @returns {Map<string, RepoEntry>} */
  get repos() {
    return this.map;
  }

  /** @returns {boolean} 是否含跨仓 task（map.size>1，execute prompt 分叉用） */
  hasCrossRepo() {
    return this.map.size > 1;
  }
}
