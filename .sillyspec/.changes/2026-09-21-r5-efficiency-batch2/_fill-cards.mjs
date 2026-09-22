// _fill-cards.mjs — batch2 TaskCard frontmatter 重建（key: value 显式空格版；一次性辅助，plan 过门后删除）
import fs from 'fs';
const base = '.sillyspec/changes/2026-09-21-r5-efficiency-batch2/tasks/';
const cards = {
  'task-01': {
    title: "'M1 指令指纹增量——静态段指纹+落盘+复入短输出（含 test/step-guide-fingerprint.test.mjs）'",
    title_zh: "'M1 指令指纹增量（静态段 sha256+落盘 step-guides+复入 ≤10 行）'",
    priority: 'P0', dep: '[]', req: '[FR-01]', dec: '[D-001@v1]',
    ap: ['src/run/prompt.js', 'test/step-guide-fingerprint.test.mjs'],
    tf: ['src/run/prompt.js', 'NEW:test/step-guide-fingerprint.test.mjs'],
    goal: '压指令注入基数：同步骤复入只印指纹+落盘路径，动态段永不缓存（P8：252KB/73 次全量重印实证）',
    im: [
      'outputStep 渲染分静态段/动态段：静态段（persona/prompt 模板/铁律/命令模板）渲染后 sha256 指纹；首见（指纹新或落盘缺失）全量渲染并写 .sillyspec/.runtime/step-guides/<stage>-<stepIdx>-<fp8>.md',
      '复入（指纹一致）：输出 ≤10 行——步骤名 / fingerprint=<8位> / 落盘绝对路径 / 「指引未变，需全文 Read 路径」提示',
      '动态注入段（REVIEW_MATERIALS/DOCS_DEBT/知识命中/进度快照）独立渲染常驻永不缓存',
      'withJsonOutput 路径（--json，src/index.js:185）不受影响走全量',
    ],
    ac: ['同指纹复入静态部分输出 ≤10 行', '指纹变更（条件分支/persona 差异）全量重印', '动态段两次渲染均在', '--json 全量输出不变'],
    ve: ['node --test test/step-guide-fingerprint.test.mjs', 'npm test'],
    co: ['不改任何步骤语义与门禁判定', '指纹=本次实际渲染静态段（非模板原文）'],
  },
  'task-02': {
    title: "'M2 gate 快照分叉态取 worktree 血统——:424-426 翻转+警告对齐指引（含三态回归钉）'",
    title_zh: "'M2 快照分叉态取 worktree（仅③态，三态回归钉）'",
    priority: 'P0', dep: '[]', req: '[FR-02]', dec: '[D-002@v2]',
    ap: ['src/run/gate-snapshot.js', 'test/gate-snapshot-lineage.test.mjs'],
    tf: ['src/run/gate-snapshot.js', 'NEW:test/gate-snapshot-lineage.test.mjs'],
    goal: '根除定向 worktree 跑遇主仓并行异动的 verify 假红（batch1 移交实证）',
    im: [
      'gate-snapshot.js:424-426 双写分叉分支：src 从 cwdPath 改 wtPath；警告文案补「分叉取 worktree 分支版——主仓侧改动若需保留请 apply/对齐后复跑」',
      ':422（cwdDiff 且非 wtDiff→取主仓）与 :427 注释态（wtDiff 且非 cwdDiff→保持 worktree）逐字节不动',
      '三态回归钉：①保护态取主仓（2026-09-20 零回归）／②正常态取 worktree／③分叉态取 worktree（batch1 假红复刻：主仓异动+worktree 交付→src/test 同血统）',
    ],
    ac: ['三态钉全绿', '既有 gate-snapshot 相关测试零回归', 'batch1 场景复刻用例断言快照内 src 为 worktree 版'],
    ve: ['node --test test/gate-snapshot-lineage.test.mjs', 'npm test'],
    co: ['仅改分叉分支与警告文案', 'merge-backups/local.yaml 复制等其余快照装配逻辑零触碰'],
  },
  'task-03': {
    title: "'M3 PLAN 分组默认化——recommendWaveGroups 纯函数+派发注入+advisory 附分组（含 test/plan-grouping-recommend.test.mjs）'",
    title_zh: "'M3 PLAN 分组默认化（预计算推荐分组注入+advisory 附分组+SillyHub 互斥）'",
    priority: 'P0', dep: "['task-01', 'task-02']", req: '[FR-03]', dec: '[D-003@v1]',
    ap: ['src/stages/execute.js', 'src/stages/plan-postcheck.js', 'test/plan-grouping-recommend.test.mjs'],
    tf: ['src/stages/execute.js', 'src/stages/plan-postcheck.js', 'NEW:test/plan-grouping-recommend.test.mjs'],
    goal: 'CLI 预计算推荐分组默认注入，派发交接单位从 task 升组（P13/GSD 对齐）',
    im: [
      'plan-postcheck.js 新增导出纯函数 recommendWaveGroups(tasks)：按第 1 批三条件（allowed_paths 正交/无 provides-expects_from 契约链/组 ≤3）输出推荐分组',
      'buildWavePrompt 派发段注入「推荐分组」行+偏离须披露话术；SillyHub 模式（execute.js:1346 互斥口径）不注入',
      'checkBatchAdvisory 输出附推荐分组清单（同一纯函数无二源）',
      '不满足条件时渲染输出与旧版逐字节一致（分组行零注入）',
    ],
    ac: ['分组纯函数单测过：正交/契约链/帽值边界', 'buildWavePrompt 含推荐分组行（有可并批）/逐字节一致（无可并批）', 'advisory 文案含分组', 'SillyHub 模式零注入'],
    ve: ['node --test test/plan-grouping-recommend.test.mjs', 'npm test'],
    co: ['不改派发后端判定/对账逻辑', '分组是建议非强制（agent 裁决权保留）'],
  },
  'task-04': {
    title: "'M4 execution_mode 通道——plan frontmatter 键+execute main 直写渲染分支（含 test/execution-mode-render.test.mjs）'",
    title_zh: "'M4 execution_mode 直写通道（缺省 dispatch 零回归+main 渲染分支）'",
    priority: 'P0', dep: "['task-03']", req: '[FR-04]', dec: '[D-004@v1]',
    ap: ['src/stages/plan.js', 'src/stages/execute.js', 'test/execution-mode-render.test.mjs'],
    tf: ['src/stages/plan.js', 'src/stages/execute.js', 'NEW:test/execution-mode-render.test.mjs'],
    goal: '清晰输入任务的主代理直写通道（对撞 A 组 7 分 vs 70 分实证；GSD 无此模式系本仓结论）',
    im: [
      'plan.js frontmatter 模板加 execution_mode 注释键（main 或 dispatch，缺省 dispatch）',
      'execute.js 读 plan.md frontmatter execution_mode：main 时 Wave 步渲染直写指引（逐任务：读卡→worktree 内实现→每任务 commit→锚点→review write→下一任务），派发段/子代理工作目录强制段/并发帽段不渲染，M3 推荐分组段同步抑制',
      'dispatch（含键缺失/值非法回退）：现行为逐字节不变',
    ],
    ac: ['缺省（无键/非法回退）dispatch 渲染与现行为逐字节一致（零回归钉）', 'main 渲染含直写指引段且不含派发段/工作目录段/并发帽段/分组段', '两模式下锚点写入与 review write 指引一致存在'],
    ve: ['node --test test/execution-mode-render.test.mjs', 'npm test'],
    co: ['worktree 隔离/写入守卫/review.json/verify 门禁全保留（只换宿主不换防线）', '状态机步数不动'],
  },
  'task-05': {
    title: "'文档收口——镜像机械重生成+模块卡增补+docs-check 重锚'",
    title_zh: "'文档收口（镜像重生成+模块卡增补+重锚）'",
    priority: 'P1', dep: "['task-01', 'task-02', 'task-03', 'task-04']", req: '[FR-01, FR-02, FR-03, FR-04]', dec: '[D-001@v1, D-002@v2, D-003@v1, D-004@v1]',
    ap: ['docs/prompt/plan.md', 'docs/prompt/execute.md', 'docs/prompt/_extracted.json', '.sillyspec/docs/sillyspec/modules/stages.md', '.sillyspec/docs/sillyspec/modules/stages.changelog.md', '.sillyspec/docs/sillyspec/modules/core-engine.md', '.sillyspec/docs/sillyspec/modules/core-engine.changelog.md'],
    tf: ['docs/prompt/plan.md', 'docs/prompt/execute.md', 'docs/prompt/_extracted.json', '.sillyspec/docs/sillyspec/modules/stages.md', '.sillyspec/docs/sillyspec/modules/stages.changelog.md', '.sillyspec/docs/sillyspec/modules/core-engine.md', '.sillyspec/docs/sillyspec/modules/core-engine.changelog.md'],
    goal: 'W1+W2 源码落地后收口文档面',
    im: [
      'node docs/prompt/_extract.mjs 重生成镜像（plan.md/execute.md/_extracted.json 与 src 逐字一致）',
      'stages.md 增补行为行（M1 指纹增量/M3 分组默认化/M4 execution_mode 渲染分支）+ changelog 边车；core-engine 卡视 recommendWaveGroups 落位增补',
      'docs-check 按提示重锚收口',
    ],
    ac: ['镜像与源逐字一致（_verify.mjs 不低于主仓基线）', '模块卡行为行锚点有效', 'docs-check 无新增漂移告警'],
    ve: ['node docs/prompt/_verify.mjs', 'sillyspec docs check', 'npm test'],
    co: ['镜像只由 _extract.mjs 机械生成禁手编', '模块卡只写主仓'],
  },
};
const now = '2026-09-21 17:20:00';
for (const [id, c] of Object.entries(cards)) {
  const num = id.slice(5);
  const lines = [
    '---',
    `id: ${id}`,
    `title: ${c.title}`,
    `title_zh: ${c.title_zh}`,
    "author: 'qinyi'",
    'generated_by: sillyspec-taskcard',
    `created_at: ${now}`,
    `priority: ${c.priority}`,
    `depends_on: ${c.dep}`,
    'blocks: []',
    `requirement_ids: ${c.req}`,
    `decision_ids: ${c.dec}`,
    'allowed_paths:',
    ...c.ap.map(x => `  - ${x}`),
    'target_files:',
    ...c.tf.map(x => `  - ${x}`),
    'goal: >',
    `  ${c.goal}`,
    'implementation:',
    ...c.im.map(x => `  - ${x}`),
    'acceptance:',
    ...c.ac.map(x => `  - ${x}`),
    'verify:',
    ...c.ve.map(x => `  - ${x}`),
    'constraints:',
    ...c.co.map(x => `  - ${x}`),
    '---',
    '',
  ];
  fs.writeFileSync(base + `${id}.md`, lines.join('\n'), 'utf8');
  console.log('OK ' + id);
}
console.log('done');
