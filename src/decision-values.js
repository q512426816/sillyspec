/**
 * decision-values.js — 决策 type/status 正典值集单一源（2026-10-20-decision-caliber-unify）。
 *
 * 背景：值集此前三套口径并存——decisions-io 写入白名单（type 6 值缺 feasibility/consistency）、
 * decision-distill 蒸馏入选集（类型 7 值含 scope 排除；状态仅 confirmed/accepted，implemented
 * 写入合法却永不入选）、brainstorm 提示面两处清单（term/premise/risk/unresolved 等机器永不
 * 收录的值）。写入者拒绝蒸馏想收的值、提示面教 agent 写机器不认的值——口径漂移是事故温床
 * （八条 feasibility 决策因五类集漏选入库事故，见 decision-distill.js 头注）。
 *
 * 单一消费契约：
 *   - decisions-io 写入白名单 = 正典全集（fail-fast 拦正典外值）
 *   - decision-distill 入选裁决 = KNOWLEDGE_* 派生集（scope 刻意不入知识库——范围裁决，
 *     文档明载；KNOWLEDGE_TYPES 恒等于正典去 scope）
 *   - brainstorm 决策记录提示清单 = 正典全集（渲染产物 docs/prompt/ 经 _extract 链同步）
 *
 * 开放世界边界：手写 decisions.md 的历史散值（40+ 种 type）不在正典集，由 parseDecisions
 * 宽容解析保留、蒸馏不入选——存量行为零变化，本集只约束机器面（写入校验/入选裁决/提示文案）。
 */

/** 正典 type：写入白名单全集（8 值）。 */
export const DECISION_TYPES = Object.freeze([
  'architecture', 'compatibility', 'boundary', 'definition', 'process', 'scope', 'feasibility', 'consistency',
])

/** 正典 status：写入白名单全集（7 值）。 */
export const DECISION_STATUSES = Object.freeze([
  'confirmed', 'accepted', 'implemented', 'rejected', 'proposed', 'superseded', 'draft',
])

/** 蒸馏入选 type：正典去 scope（范围裁决刻意不入知识库，保持既有 7 值口径）。 */
export const KNOWLEDGE_TYPES = Object.freeze(DECISION_TYPES.filter((t) => t !== 'scope'))

/** 蒸馏入选 status：定案/接受/已实现三值（rejected 走独立防复潮通道，其余状态不入选）。 */
export const KNOWLEDGE_STATUSES = Object.freeze(['confirmed', 'accepted', 'implemented'])
