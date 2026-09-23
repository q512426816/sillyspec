/**
 * preview-progress.js — watcher 预览进度账本写路径（2026-09-23-watcher-preview-progress task-02）。
 *
 * 职责：把 watcher 快照的阶段级推断态投影为 progress 库 stages 预览行（authority='watcher'）。
 * 设计契约（decisions D-004/D-005，design §3）：
 *   - 粒度=阶段级（工件签名→progress 阶段映射；steps 级不投影，D-004）；
 *   - 写纪律=短连接（open→写→close）+ 自带 PRAGMA busy_timeout（连接级，openDatabase 不自动——
 *     影子审查 gap①）+ 存在性条件进 SQL + maxRows 写放大护栏 + 全程 fail-open（任何异常返回 false，
 *     绝不影响 watcher 事件流主循环）。WHERE 认领语义（D-005@v2 执行期修正：initChange 预建
 *     全套 cli/pending 行，纯 authority='watcher' 条件永远空转）：watcher 行可自刷；**CLI 从未
 *     触碰的 pending 行（status='pending' 且 started_at IS NULL）可被预览认领**（flip 为 watcher，
 *     语义无损——pending 空行不含 CLI 任何 authored 信息）；CLI 已触碰行（started/completed/
 *     reopened）SQL 层不可中招；CLI --done 归章（task-01 fail① 修复）把认领行收回 cli。
 *   - archived 拍不投影（终态只认 CLI）。
 * 读侧出口在 progress.js readPreviewProgress（task-03）；读侧保险丝在 progress.js 读方法（task-01）。
 */
import { join } from 'node:path'
import { openDatabase } from './db-engine.js'

/** 工件签名 → progress 阶段映射（纯静态；watcher 快照 files 的键为工件基名）。 */
export const PREVIEW_STAGE_SOURCES = {
  brainstorm: ['proposal.md', 'requirements.md', 'decisions.md', 'design.md'],
  plan: ['plan.md'],
  execute: ['tasks.md'],
  verify: ['verify-result.md', 'verify-facts.json'],
}

/**
 * 纯函数：快照差分 → 阶段级预览行集合。
 * @param {{ ts:number, archived:boolean, files?:Object }} snapshot 当前拍
 * @param {{ files?:Object }=} prevSnapshot 上一拍（缺省全量视角）
 * @returns {{ stage:string, status:'in-progress', startedAt:string, evidence:Object }[]}
 *   evidence = { ts, files: 命中的工件清单, changed: 本拍有无内容变化（差分信号） }
 */
export function projectPreviewStages({ snapshot, prevSnapshot = null } = {}) {
  if (!snapshot || snapshot.archived) return []
  const files = snapshot.files || {}
  const prevFiles = (prevSnapshot && prevSnapshot.files) || {}
  const rows = []
  for (const [stage, sources] of Object.entries(PREVIEW_STAGE_SOURCES)) {
    const hit = sources.filter((k) => Object.prototype.hasOwnProperty.call(files, k))
    if (hit.length === 0) continue
    const changed = hit.some((k) => {
      const a = files[k]; const b = prevFiles[k]
      if (b === undefined) return true // 出现
      return JSON.stringify(a) !== JSON.stringify(b) // 内容变化（checked 增/键值漂移）
    })
    rows.push({
      stage,
      status: 'in-progress',
      startedAt: new Date(snapshot.ts || Date.now()).toISOString(),
      evidence: { ts: snapshot.ts || null, files: hit, changed },
    })
  }
  return rows
}

/**
 * 短连接写入预览行（best-effort，全程 fail-open）。
 * @returns {boolean} true=至少尝试写入（库在/变更注册）；false=跳过（库缺失/变更未注册/异常）
 */
export function writePreviewStages({ specDir, changeName, rows, maxRows = 8 } = {}) {
  if (!specDir || !changeName || !Array.isArray(rows) || rows.length === 0) return false
  let db = null
  try {
    db = openDatabase(join(specDir, '.runtime', 'sillyspec.db'), {})
    // 连接级 PRAGMA（影子审查 gap①）：openDatabase 不自动带，缺省 0 = 撞锁立即 BUSY
    db.exec('PRAGMA busy_timeout = 5000')
    const changeRow = db.prepare('SELECT id FROM changes WHERE name = ?').get(changeName)
    if (!changeRow) return false // 变更未注册（未跑过任何阶段）——无从挂预览，安静跳过
    const cid = changeRow.id
    const stmt = db.prepare(
      `INSERT INTO stages (change_id, stage, status, started_at, authority, preview_evidence)
       VALUES (?, ?, ?, ?, 'watcher', ?)
       ON CONFLICT(change_id, stage) DO UPDATE SET
         status = excluded.status,
         started_at = COALESCE(stages.started_at, excluded.started_at),
         preview_evidence = excluded.preview_evidence,
         authority = 'watcher'
       WHERE stages.authority = 'watcher'
          OR (stages.authority = 'cli' AND stages.status = 'pending' AND stages.started_at IS NULL)`
    )
    for (const r of rows.slice(0, maxRows)) {
      stmt.run(cid, r.stage, r.status, r.startedAt, JSON.stringify(r.evidence || {}))
    }
    return true
  } catch {
    return false // fail-open：锁竞争/库损坏/迁移未达——事件流不受影响，下轮重投影
  } finally {
    if (db) { try { db.close() } catch { /* 关闭失败不放大 */ } }
  }
}

/** 步骤级工件映射：变更工件基名 → (阶段, 步骤名) 的对应——watcher 步骤节拍的数据源。 */
export const PREVIEW_STEP_SOURCES = {
  'proposal.md': { stage: 'brainstorm', step: '写设计文档并自审' },
  'requirements.md': { stage: 'brainstorm', step: '写设计文档并自审' },
  'design.md': { stage: 'brainstorm', step: '写设计文档并自审' },
  'decisions.md': { stage: 'brainstorm', step: '写设计文档并自审' },
  'plan.md': { stage: 'plan', step: '生成分级计划' },
  'verify-result.md': { stage: 'verify', step: '输出验证报告' },
  'verify-facts.json': { stage: 'verify', step: '输出验证报告' },
  'module-impact.md': { stage: 'archive', step: 'extract-module-impact 与归档语义收尾' },
}

/**
 * 纯函数：快照差分 → 步骤级预览行集合（预览账本 v2，D-004 兑现）。
 * 粒度=工件信号可映射的步骤（tasks.md 勾选→execute 逐任务步不可靠映射，不做——纯思考
 * 型步骤由 --done 批量自述，burst 已支持）。返回行带 stage+step 双键。
 */
export function projectPreviewSteps({ snapshot, prevSnapshot = null } = {}) {
  if (!snapshot || snapshot.archived) return []
  const files = snapshot.files || {}
  const prevFiles = (prevSnapshot && prevSnapshot.files) || {}
  const rows = []
  for (const [fname, target] of Object.entries(PREVIEW_STEP_SOURCES)) {
    if (!Object.prototype.hasOwnProperty.call(files, fname)) continue
    const changed = prevFiles[fname] === undefined || JSON.stringify(files[fname]) !== JSON.stringify(prevFiles[fname])
    rows.push({
      stage: target.stage,
      step: target.step,
      status: 'in-progress',
      startedAt: new Date(snapshot.ts || Date.now()).toISOString(),
      evidence: { ts: snapshot.ts || null, file: fname, changed },
    })
  }
  return rows
}

/**
 * 写步骤级预览行（短连接，fail-open）：steps 表 authority='watcher'，仅当该步骤
 * 不存在或也是 watcher 行时写入（CLI 步骤行不可中招）。
 */
export function writePreviewSteps({ specDir, changeName, rows, maxRows = 12 } = {}) {
  if (!specDir || !changeName || !Array.isArray(rows) || rows.length === 0) return false
  let db = null
  try {
    db = openDatabase(join(specDir, '.runtime', 'sillyspec.db'), {})
    db.exec('PRAGMA busy_timeout = 5000')
    const changeRow = db.prepare('SELECT id FROM changes WHERE name = ?').get(changeName)
    if (!changeRow) return false
    const cid = changeRow.id
    const stageStmt = db.prepare("SELECT id FROM stages WHERE change_id = ? AND stage = ? AND (authority = 'watcher' OR authority = 'cli' OR authority IS NULL)")
    const insStmt = db.prepare(
      `INSERT INTO steps (stage_id, name, status, completed_at, ordering, authority, preview_evidence)
       VALUES (?, ?, 'in-progress', NULL, 0, 'watcher', ?)
       ON CONFLICT DO NOTHING`
    )
    for (const r of rows.slice(0, maxRows)) {
      const stageRow = stageStmt.get(cid, r.stage)
      if (!stageRow) continue // 阶段行不在场——CLI 尚未进入该阶段，不预建
      insStmt.run(stageRow.id, r.step, JSON.stringify(r.evidence || {}))
    }
    return true
  } catch {
    return false
  } finally {
    if (db) { try { db.close() } catch {} }
  }
}
