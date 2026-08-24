// 任务加载与内容指纹。任务 = eval/tasks/<id>/ 下四件套：
//   task.json（id/instruction）· verify.mjs（cwd=被测工作目录，退出码 0=过）· files/（工作副本脚手架）· solution/（dry-run 参考解）
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function loadTasks(tasksDir) {
  if (!existsSync(tasksDir)) return [];
  const out = [];
  for (const entry of readdirSync(tasksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(tasksDir, entry.name);
    const taskFile = join(dir, 'task.json');
    if (!existsSync(taskFile)) continue;
    const meta = JSON.parse(readFileSync(taskFile, 'utf8'));
    const task = {
      id: meta.id ?? entry.name,
      title: meta.title ?? entry.name,
      instruction: meta.instruction,
      tags: meta.tags ?? [],
      dir,
      verifyPath: join(dir, 'verify.mjs'),
      filesDir: join(dir, 'files'),
      solutionDir: join(dir, 'solution'),
    };
    if (typeof task.instruction !== 'string' || !task.instruction.trim()) {
      throw new Error(`任务 ${task.id} 缺少 instruction`);
    }
    if (!existsSync(task.verifyPath)) {
      throw new Error(`任务 ${task.id} 缺少 verify.mjs`);
    }
    out.push(task);
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  const seen = new Set();
  for (const t of out) {
    if (seen.has(t.id)) throw new Error(`任务 id 重复: ${t.id}`);
    seen.add(t.id);
  }
  return out;
}

/**
 * 全量任务内容指纹（task.json + verify.mjs + files/ 递归内容；solution/ 不参与——
 * 它只服务 dry-run，改动不应让真实评测换组）。始终对目录内全部任务计算，
 * 与实际抽样跑哪些无关——否则 --task 子集会产生另一套分组，报告对不上。
 */
export function tasksFingerprint(tasks) {
  const h = createHash('sha256');
  for (const t of tasks) {
    h.update(t.id); h.update('\0');
    h.update(readFileSync(join(t.dir, 'task.json')));
    h.update('\0');
    h.update(readFileSync(t.verifyPath));
    h.update('\0');
    for (const rel of walkFiles(t.filesDir)) {
      h.update(rel); h.update('\0');
      h.update(readFileSync(join(t.filesDir, rel))); h.update('\0');
    }
  }
  return h.digest('hex').slice(0, 16);
}

function walkFiles(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  const acc = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) acc.push(...walkFiles(join(dir, e.name), rel));
    else acc.push(rel);
  }
  return acc.sort();
}
