// W6 Step9 共享常量：progress.js facade 与 src/progress/* 子模块共用，避免 facade↔子模块循环引用。
// 按需增量抽取（9a: STAGE_ORDER/MAIN_FLOW_ORDER；9c: VALID_STAGES/STAGE_LABELS；9d 追加 emptyStage/SPEC_DIR_NAME 等）。

// 完整主流程顺序（含 scan），用于下游 cascade / 一致性检查
export const STAGE_ORDER = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive'];
// 主流程阶段（不含 scan/quick/explore 等辅助阶段）—— 当前与 STAGE_ORDER 同值
export const MAIN_FLOW_ORDER = STAGE_ORDER;

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

