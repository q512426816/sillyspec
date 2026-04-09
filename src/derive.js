import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 从 artifacts 文件系统反推状态，与 progress.json 交叉校验。
 * 纯函数，零外部副作用（fix 模式除外）。
 *
 * @param {string} cwd - 项目根目录
 * @param {object} options
 * @param {'light'|'full'} options.mode - 轻量（当前步骤）或全量扫描
 * @param {boolean} options.fix - 是否自动修复明显不一致
 * @param {object} options.pm - ProgressManager 实例（fix 模式需要）
 * @param {object} options.progress - 已加载的 progress 数据
 * @returns {{ issues: Array<{type:string, severity:string, stage:string, step:number, message:string, suggestion:string}>, fixed: number }}
 */
export function deriveState(cwd, options = {}) {
  const { mode = 'light', fix = false, pm = null, progress = null } = options;

  const issues = [];
  let fixed = 0;

  const artifactsDir = join(cwd, '.sillyspec', '.runtime', 'artifacts');
  if (!existsSync(artifactsDir)) {
    return { issues: [{ type: 'no-artifacts', severity: 'info', stage: '-', step: 0, message: 'artifacts 目录不存在', suggestion: '正常，项目刚开始' }], fixed: 0 };
  }

  // 扫描 artifacts 文件，解析 stage/step 信息
  const artifactMap = {}; // { "stage:stepN": [filenames] }
  const stageStepSet = new Set(); // "stage:stepN"

  let files;
  try {
    files = readdirSync(artifactsDir).filter(f => f.endsWith('.txt'));
  } catch {
    return { issues: [], fixed: 0 };
  }

  for (const file of files) {
    // 格式: {stage}-step{N}-{timestamp}.txt
    const match = file.match(/^(.+)-step(\d+)-\d+\.txt$/);
    if (match) {
      const [, stage, stepStr] = match;
      const key = `${stage}:${stepStr}`;
      if (!artifactMap[key]) artifactMap[key] = [];
      artifactMap[key].push(file);
      stageStepSet.add(key);
    }
  }

  // 需要检查的阶段
  let stagesToCheck = [];
  if (progress) {
    if (mode === 'light') {
      // 轻量：只检查 currentStage
      const currentStage = progress.currentStage || '';
      if (currentStage) stagesToCheck.push(currentStage);
    } else {
      // 全量：检查所有阶段
      stagesToCheck = Object.keys(progress.stages || {});
    }
  } else {
    // 没有 progress 数据，从 artifacts 推断所有阶段
    for (const key of stageStepSet) {
      const stage = key.split(':')[0];
      if (!stagesToCheck.includes(stage)) stagesToCheck.push(stage);
    }
  }

  for (const stage of stagesToCheck) {
    const stageData = progress?.stages?.[stage];
    const steps = stageData?.steps || [];

    // 收集 artifacts 中该阶段的步骤编号
    const artifactSteps = new Set();
    for (const key of stageStepSet) {
      const [s, n] = key.split(':');
      if (s === stage) artifactSteps.add(parseInt(n));
    }

    // 检查1：artifacts 有但 progress 未标记完成
    for (const stepNum of artifactSteps) {
      const stepIdx = stepNum - 1;
      if (stepIdx < steps.length) {
        const step = steps[stepIdx];
        if (step.status !== 'done') {
          issues.push({
            type: 'missing-progress',
            severity: 'issue',
            stage,
            step: stepNum,
            message: `artifacts 有 ${stage}-step${stepNum} 文件但 progress 未标记完成`,
            suggestion: '标记该步骤为 done'
          });
          if (fix && pm && progress) {
            step.status = 'done';
            pm._write(cwd, progress);
            fixed++;
          }
        }
      }
    }

    // 检查2：progress 有但 artifacts 无文件（warning，不修复）
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.status === 'done' && !artifactSteps.has(i + 1)) {
        issues.push({
          type: 'missing-artifact',
          severity: 'warning',
          stage,
          step: i + 1,
          message: `${stage} step ${i + 1} 标记完成但 artifacts 无对应文件`,
          suggestion: '可能被手动清理，忽略即可'
        });
      }
    }

    // 检查3：artifacts 有 step5 但 progress 只到 step3（中间漏记）
    if (artifactSteps.size > 0) {
      const maxArtifactStep = Math.max(...artifactSteps);
      const maxProgressDoneStep = steps.reduce((max, s, i) => s.status === 'done' ? Math.max(max, i + 1) : max, 0);

      if (maxArtifactStep > maxProgressDoneStep && maxProgressDoneStep > 0) {
        // 检查中间是否有漏记的
        for (let i = maxProgressDoneStep + 1; i <= maxArtifactStep; i++) {
          if (artifactSteps.has(i) && i - 1 < steps.length && steps[i - 1].status !== 'done') {
            // 已在检查1处理，跳过
          }
        }
      }

      // progress 步骤数少于 artifacts 最大步骤号
      if (maxArtifactStep > steps.length) {
        issues.push({
          type: 'missing-steps',
          severity: 'issue',
          stage,
          step: steps.length + 1,
          message: `artifacts 有 step${maxArtifactStep} 但 progress 只有 ${steps.length} 个步骤`,
          suggestion: 'progress 数据可能不完整'
        });
      }
    }
  }

  return { issues, fixed };
}
