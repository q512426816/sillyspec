// W6 Step9 共享常量：progress.js facade 与 src/progress/* 子模块共用，避免 facade↔子模块循环引用。
// 9a: STAGE_ORDER/MAIN_FLOW_ORDER；9c: VALID_STAGES/STAGE_LABELS；9d: SPEC_DIR_NAME/CURRENT_VERSION/emptyStage。

export const SPEC_DIR_NAME = '.sillyspec';

// 合法阶段名（含辅助阶段 scan/quick/explore）
export const VALID_STAGES = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore'];

// 阶段展示文案
export const STAGE_LABELS = {
  brainstorm: '🧠 需求探索',
  plan: '📐 实现计划',
  execute: '⚡ 波次执行',
  verify: '🔍 验证确认',
  scan: '🔍 代码扫描',
  quick: '⚡ 快速任务',
  explore: '🧭 自由探索',
  archive: '📦 归档变更',
};

// 完整阶段顺序（含 scan），仅用于展示/迭代顺序
export const STAGE_ORDER = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive'];
// 主流程阶段（不含 scan/quick/explore 等辅助阶段）—— 用于下游 cascade / 一致性上下游判定。
// scan 是 auxiliary（AUXILIARY_STAGES，按需显式跑、可 failed_post_check、永不要求 completed），
// 把它算进主流程上下游会让「scan stale/revising」误报 brainstorm/plan/execute 不该 completed
// （consistency-doctor 坑 + prompt-control-debt plan-c 同根因）。
export const MAIN_FLOW_ORDER = ['brainstorm', 'plan', 'execute', 'verify', 'archive'];

// progress 数据版本（v3 = SQLite；v4 = changes 加 base_ts / 本地脏度两列，platform-sync §8）
export const CURRENT_VERSION = 5;

// 滞留提示阈值（天，2026-08-30 用户反馈②：7 个「代码全落地但流程没收口」的变更挂 38 天
// 无人发现）：活跃变更 last_active 距今超该天数且流程未收口（archive 未完成）时，progress
// show 输出滞留提示行。与 doctor-diagnostics 空壳目录 7 天门槛（GHOST_EMPTY_DIR_STALE_MS）
// 同量级——「多久算滞留」全仓统一口径。
export const STALL_WARN_DAYS = 7;

// 空阶段骨架
export function emptyStage() {
  return { status: 'pending', steps: [], startedAt: null, completedAt: null };
}

