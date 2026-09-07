/**
 * progressConfirm — 主流程 Step1「进度确认」的 noAI 动作（brainstorm / execute / verify）
 * （2026-09-07 noAI 主流程首批；机制先例：scan 系 noAI 步 + planPostcheck，见 run/stage.js noAI 分支）
 *
 * noAI 化依据（step1 职责在历次加固后已全部机械化）：
 *   - 阶段路由：`run <stage>` 显式调用即写 currentStage（run/stage.js D-003@v1），
 *     阶段顺序违规由 checkTransition 拦截——原 prompt 的「阶段不符则停止」检查已残留化
 *     （{PROGRESS_SNAPSHOT} 注入文案本就写着「CLI 已路由到本阶段」）；
 *   - 进度摘要：快照三行（变更/阶段/步骤位置）由 CLI 注入，agent 的「输出当前进度摘要」
 *     只是把注入内容复述一遍再 --done——整轮往返零判断增量；
 *   - brainstorm 变更名检查：自动名在创建时 CLI 已打印 rename 提示（run/command.js），
 *     此处机械复检一次模式命中；命中只打印 ⚠️ 建议（noAI 步的 console 输出仍在 CLI 工具
 *     结果里，agent 可见、可在后续步骤与用户交互改名）——不 throw、不阻塞推进。
 *   - execute 执行范围：$ARGUMENTS 是会话层信息，CLI 不掺入；本步只补 tasks 勾选计数
 *     （readPlanCheckboxStatus 既有机器事实），范围以用户在会话中给出的为准。
 *   - verify 测试提示：原 prompt 首段的「CLI 在 --done 统一跑测试」要点改为 console 提示。
 *
 * 输出纪律：只 console 打印（noAI 步不写 step output，与 scan 系动作一致）；
 * 纯确认步无失败语义，不 throw。
 */
import { join } from 'node:path'

/** brainstorm 自动生成变更名的模式（run/command.js:1083 `${date}-new-change-${hex}`） */
const AUTO_CHANGE_NAME_RE = /^\d{4}-\d{2}-\d{2}-new-change-[a-f0-9]+$/

/**
 * 执行「进度确认」noAI 动作：打印进度快照 + 阶段专属机械提示。
 *
 * @param {object} opts
 * @param {string} opts.stageName - brainstorm / execute / verify
 * @param {string} opts.cwd
 * @param {object} opts.stageData - progress.stages[stageName]（steps 数组）
 * @param {string|null} opts.changeName
 * @param {object|null} [opts.pm] - ProgressManager（execute 档 tasks 勾选计数用；缺省跳过该段）
 */
export function executeProgressConfirm({ stageName, cwd, stageData, changeName, pm = null }) {
  const steps = Array.isArray(stageData?.steps) ? stageData.steps : []
  const done = steps.filter(s => s.status === 'completed').length
  console.log('📊 进度快照（CLI 注入，无需跑 progress show）：')
  console.log(`   - 变更：${changeName || '（未知）'}`)
  console.log(`   - 阶段：${stageName}（CLI 已路由到本阶段）`)
  console.log(`   - 步骤：${done}/${steps.length} 已完成；本步已由 CLI 自动确认`)

  if (stageName === 'brainstorm' && changeName && AUTO_CHANGE_NAME_RE.test(changeName)) {
    console.log('')
    console.log(`⚠️  变更名「${changeName}」疑似自动生成——建议与用户确认语义化名称后执行：`)
    console.log(`   sillyspec change-rename ${changeName} <新名称>（勿用 mv，会漏改进度库引用）`)
  }

  if (stageName === 'execute' && pm && changeName) {
    try {
      const changeDir = join(pm._getSpecDir(cwd), 'changes', changeName)
      const plan = pm.readPlanCheckboxStatus(changeDir)
      if (plan && plan.total > 0) {
        console.log(`   - 任务勾选：tasks ${plan.checked}/${plan.total}（执行范围以用户会话指定为准，未指定则全部 Wave）`)
      }
    } catch { /* 勾选计数 fail-soft：plan.md 缺失/解析失败不阻塞确认步 */ }
  }

  if (stageName === 'verify') {
    console.log('')
    console.log('💡 `run verify` 只下发指令不跑测试——全量测试由 CLI 在最后 --done 统一执行')
    console.log('   （local.yaml 的 commands.test，同步对账可能耗时较长）；后续「运行测试和质量扫描」')
    console.log('   步骤无需手动跑全量，只做 lint/静态检查 + 可选快速冒烟。')
  }
}
