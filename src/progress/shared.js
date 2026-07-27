// W6 Step9 共享常量：progress.js facade 与 src/progress/* 子模块共用，避免 facade↔子模块循环引用。
// 按需增量抽取（9a: STAGE_ORDER/MAIN_FLOW_ORDER；9c/9d 追加 VALID_STAGES/STAGE_LABELS/emptyStage 等）。

// 完整主流程顺序（含 scan），用于下游 cascade / 一致性检查
export const STAGE_ORDER = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive'];
// 主流程阶段（不含 scan/quick/explore 等辅助阶段）—— 当前与 STAGE_ORDER 同值
export const MAIN_FLOW_ORDER = STAGE_ORDER;

