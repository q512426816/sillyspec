// dry-run 假 agent：零 token 验证管道（工作副本、verify、落库、报告整条链路）。
// mixed 模式确定性制造两臂差异：A 臂全过，B 臂按任务号奇偶过——报告能展示通过率/Δ/置信区间的完整形态。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copyInto } from '../workdir.mjs';

export function run({ task, arm, workdir, solutionDir, mode = 'mixed' }) {
  const numeric = Number.parseInt(String(task.id).split('-')[0], 10);
  let pass;
  if (mode === 'pass') pass = true;
  else if (mode === 'fail') pass = false;
  else pass = arm === 'A' ? true : Number.isInteger(numeric) && numeric % 2 === 1;

  if (pass) copyInto(workdir, solutionDir);
  else writeFileSync(join(workdir, 'DRY_RUN_WRONG_ANSWER.mjs'), '// dry-run 失败路径占位产物\n');

  return {
    code: 0,
    timedOut: false,
    stdout: `[dry-run mode=${mode}] pass=${pass}`,
    stderr: '',
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    logDir: null,
  };
}
