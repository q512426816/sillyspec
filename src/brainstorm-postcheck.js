/**
 * brainstorm-postcheck.js — plan 阶段对 brainstorm 产物的校验
 *
 * 在 brainstorm → plan 之间执行，校验 brainstorm 产物完整性。
 * PASS → 继续 plan
 * WARN → 继续 plan，记录警告并分配补齐任务
 * FAIL → 回退到 brainstorm 补齐（最多 2 次重试）
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * 校验 brainstorm 产物完整性
 * @param {string} changeDir - 变更目录路径（.sillyspec/changes/<change>）
 * @returns {{ ok: boolean, level: 'PASS'|'WARN'|'FAIL', errors: string[], warnings: string[] }}
 */
export function checkBrainstormArtifacts(changeDir) {
  const errors = []
  const warnings = []
  const brainstormDir = join(changeDir, 'brainstorm')

  // ── 1. 产物完整性检查 ──
  const requiredFiles = ['design.md', 'decisions.md', 'gaps.md', 'assumptions.md', 'next-action.json']
  for (const file of requiredFiles) {
    if (!existsSync(join(brainstormDir, file))) {
      errors.push(`brainstorm/${file} 不存在`)
    }
  }

  // ── 2. next-action.json 有效性检查 ──
  const nextActionFile = join(brainstormDir, 'next-action.json')
  if (existsSync(nextActionFile)) {
    try {
      const nextAction = JSON.parse(readFileSync(nextActionFile, 'utf8'))

      // 必填字段
      if (!['ready_for_plan', 'waiting_for_user'].includes(nextAction.status)) {
        errors.push(`next-action.json.status 无效值: ${nextAction.status}`)
      }
      if (typeof nextAction.has_blocking_questions !== 'boolean') {
        errors.push(`next-action.json.has_blocking_questions 不是布尔值`)
      }
      if (!['high', 'medium', 'low'].includes(nextAction.decision_level)) {
        warnings.push(`next-action.json.decision_level 无效值: ${nextAction.decision_level}`)
      }

      // 状态一致性
      if (nextAction.status === 'waiting_for_user' && nextAction.has_blocking_questions !== true) {
        errors.push(`next-action.json status=waiting_for_user 但 has_blocking_questions !== true`)
      }
      if (nextAction.status === 'ready_for_plan' && nextAction.has_blocking_questions === true) {
        errors.push(`next-action.json status=ready_for_plan 但 has_blocking_questions === true`)
      }
    } catch (e) {
      errors.push(`next-action.json 解析失败: ${e.message}`)
    }
  }

  // ── 3. design.md 覆盖度检查 ──
  const designFile = join(brainstormDir, 'design.md')
  if (existsSync(designFile)) {
    const designContent = readFileSync(designFile, 'utf8')

    // 必须覆盖的维度
    if (!/(?:目标|goal|objective|背景|background|问题|problem)/i.test(designContent)) {
      warnings.push('design.md 缺少设计目标/背景描述')
    }
    if (!/(?:范围|scope|总体方案|方案|approach)/i.test(designContent)) {
      warnings.push('design.md 缺少总体方案描述')
    }

    // 弱覆盖检测
    if (/影响模块.*TBD|文件变更.*TBD|待定/i.test(designContent)) {
      warnings.push('design.md 包含 TBD/待定内容')
    }
    if (!/(?:验收|acceptance|完成标准)/i.test(designContent)) {
      warnings.push('design.md 缺少验收标准')
    }
  }

  // ── 4. gaps.md 覆盖度检查 ──
  const gapsFile = join(brainstormDir, 'gaps.md')
  if (existsSync(gapsFile)) {
    const gapsContent = readFileSync(gapsFile, 'utf8')
    const hasBlocker = /BLOCKER/i.test(gapsContent)
    if (hasBlocker) {
      errors.push('gaps.md 包含 BLOCKER 级缺口，需要先解决')
    }
    // 检查是否为空
    const nonEmpty = gapsContent.split('\n').filter(l => l.trim() && !l.startsWith('#')).length
    if (nonEmpty === 0) {
      warnings.push('gaps.md 为空（brainstorm 可能遗漏了缺口分析）')
    }
  }

  // ── 5. assumptions.md 风险检查 ──
  const assumptionsFile = join(brainstormDir, 'assumptions.md')
  if (existsSync(assumptionsFile)) {
    const assumptionsContent = readFileSync(assumptionsFile, 'utf8')
    if (/假设现有数据格式不变|假设.*API.*不变|假设.*性能.*可接受/i.test(assumptionsContent)) {
      warnings.push('assumptions.md 包含高风险假设，需在 verify 阶段验证')
    }
  }

  // ── 6. decisions.md 一致性检查 ──
  const decisionsFile = join(brainstormDir, 'decisions.md')
  if (existsSync(decisionsFile)) {
    const decisionsContent = readFileSync(decisionsFile, 'utf8')
    const autoDecided = (decisionsContent.match(/AUTO_DECIDED/g) || []).length
    const autoDecidedWithReason = (decisionsContent.match(/AUTO_DECIDED[\s\S]*?checklist/i) || []).length
    if (autoDecided > 0 && autoDecidedWithReason < autoDecided) {
      errors.push(`${autoDecided - autoDecidedWithReason} 个 AUTO_DECIDED 决策缺少 checklist 依据`)
    }
  }

  // ── 判定结果 ──
  let level
  if (errors.length > 0) {
    level = 'FAIL'
  } else if (warnings.length > 0) {
    level = 'WARN'
  } else {
    level = 'PASS'
  }

  return { ok: level !== 'FAIL', level, errors, warnings }
}

/**
 * 执行 brainstorm postcheck（供 run.js 调用）
 */
export async function executeBrainstormPostcheck(cwd, platformOpts, changeName) {
  const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', changeName)
  if (!existsSync(changeDir)) {
    console.log('⚠️  brainstorm postcheck: 变更目录不存在，跳过')
    return
  }

  const result = checkBrainstormArtifacts(changeDir)

  if (result.level === 'PASS') {
    console.log('✅ brainstorm postcheck: PASS')
  } else if (result.level === 'WARN') {
    console.log('⚠️  brainstorm postcheck: WARN')
    for (const w of result.warnings) {
      console.log(`   - ${w}`)
    }
  } else {
    console.error('❌ brainstorm postcheck: FAIL')
    for (const e of result.errors) {
      console.error(`   - ${e}`)
    }
    console.error('\\n   请修复以上问题后重试，或使用 --skip-approval 跳过。')
    process.exit(1)
  }
}
