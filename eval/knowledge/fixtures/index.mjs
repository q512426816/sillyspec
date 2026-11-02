/**
 * eval/knowledge/fixtures/index.mjs — 六类缺陷探针 fixture（合成最小知识库 + 正反例断言）
 *
 * 每个 fixture 的 files 相对 .sillyspec/knowledge/ 物化到 mkdtemp 仓根后跑真实引擎。
 * 断言语义（evaluateCase）：contains 必须全部命中、excludes 必须全部不命中、empty 指定空性、
 * score_contract 要求 search 视图 score === matchedTags.length、health 逐键对账 catalog。
 * 探针的 pass 语义是「修复后的期望」：缺陷存在时 pass=false（executor 检出缺陷），修复后转 true。
 */
export const PROBE_FIXTURES = [
  {
    defect: 'score-contract',
    files: {
      'INDEX.md': '# Knowledge Index\n\n## Handbook\n- alpha|beta|gamma|delta → [Alpha 手册](handbook.md#alpha)\n',
      'handbook.md': '# Handbook\n\n## Alpha\n\nalpha 的说明文字。\n',
    },
    cases: [
      {
        name: 'search score 必须等于实际命中标签数',
        kind: 'search',
        query: 'alpha 用法',
        expect: { score_contract: true, contains: ['handbook.md'] },
      },
    ],
  },
  {
    defect: 'word-boundary',
    files: {
      'INDEX.md': [
        '# Knowledge Index', '',
        '## Handbook',
        '- node → [Node 环境](env.md#node)',
        '- worktree → [Worktree](wt.md#wt)', '',
      ].join('\n'),
      'env.md': '# 环境\n\n## node\n\nnode 版本要求说明。\n',
      'wt.md': '# Worktree\n\n## wt\n\nworktree 隔离说明。\n',
    },
    cases: [
      { name: 'node 不得命中 node_modules（_ 是词字符）', kind: 'entries', query: '修复 node_modules junction', expect: { excludes: ['env.md'] } },
      { name: 'node 独立词仍命中', kind: 'entries', query: 'node 版本升级', expect: { contains: ['env.md'] } },
      { name: 'worktree 不得命中 worktree_apply（_ 是词字符）', kind: 'entries', query: 'worktree_apply 冲突', expect: { excludes: ['wt.md'] } },
    ],
  },
  {
    defect: 'route-rows',
    files: {
      'INDEX.md': [
        '# Knowledge Index', '',
        '## Manual',
        '- alpha|beta → [Alpha 手册](handbook.md#alpha)', '',
        '## Decisions',
        '- alpha|beta → [决策域](decisions/demo.md)', '',
        '## FR',
        '- alpha|beta → [FR 域](fr/demo.md)', '',
      ].join('\n'),
      'handbook.md': '# Handbook\n\n## Alpha\n\nalpha 手册内容。\n',
      'decisions/demo.md': '## D-001@v1 alpha 决策\n状态：implemented\n变更：fix-demo\n',
      'fr/demo.md': '## FR-demo-001 alpha 需求\n变更：fix-demo\n状态：active\n',
    },
    cases: [
      {
        name: 'entries 不得含 fr/decisions 路由行',
        kind: 'entries',
        query: 'alpha 功能',
        expect: { contains: ['handbook.md#alpha'], excludes: ['decisions/demo.md', 'fr/demo.md'] },
      },
      { name: 'decisionHits 通道不受影响', kind: 'decisions', query: 'alpha 功能', expect: { contains: ['decisions/demo.md#D-001@v1'] } },
    ],
  },
  {
    defect: 'scope-manual',
    files: {
      'INDEX.md': [
        '# Knowledge Index', '',
        '## Decisions',
        '- foo → [决策域](decisions/demo.md)', '',
        '## Gotchas',
        '- foo|junction → [Foo 坑](gotchas.md#foo-junction)',
        '- other → [Other 区](gotchas.md#other-section)', '',
      ].join('\n'),
      'gotchas.md': [
        '# Gotchas', '',
        '## foo junction 清理', '',
        '修 src/foo.js 时先解链 node_modules junction。', '',
        '## other section', '',
        '另一个模块维护 src/bar.js 的说明。', '',
      ].join('\n'),
      'decisions/demo.md': '## D-001@v1 foo 决策\n状态：implemented\n锚点：src/foo.js:10\n变更：fix-demo\n',
    },
    cases: [
      { name: '决策锚点强边可达（基础链路）', kind: 'scope', scope_files: ['src/foo.js'], expect: { contains: ['decisions/demo.md#D-001@v1'] } },
      { name: '手工条目正文路径可达（手工知识不短路）', kind: 'scope', scope_files: ['src/foo.js'], expect: { contains: ['gotchas.md#foo-junction'] } },
      { name: 'entries-only 正例（无决策锚点仍返回）', kind: 'scope', scope_files: ['src/bar.js'], expect: { contains: ['gotchas.md#other-section'] } },
      { name: 'section 隔离负例（异路径不串节）', kind: 'scope', scope_files: ['src/bar.js'], expect: { excludes: ['gotchas.md#foo-junction'] } },
    ],
  },
  {
    defect: 'fixed-entries',
    files: {
      'INDEX.md': [
        '# Knowledge Index', '',
        '## Known Issues',
        '- alpha → [alpha 已修复](known-issues.md#alpha-已修复)',
        '- beta → [beta 坑](known-issues.md#beta-坑)', '',
      ].join('\n'),
      'known-issues.md': [
        '# Known Issues', '',
        '## 🟢 alpha 问题已修复（commit abc）', '',
        '历史坑，已修复。', '',
        '## 🔴 beta 问题', '',
        '当前仍然存在的坑。', '',
      ].join('\n'),
    },
    cases: [
      { name: '已修复条目不进默认 entries', kind: 'entries', query: 'alpha 问题', expect: { excludes: ['known-issues.md#alpha-已修复'] } },
      { name: '未修复条目正常命中', kind: 'entries', query: 'beta 问题', expect: { contains: ['known-issues.md#beta-坑'] } },
    ],
  },
  {
    defect: 'linkage',
    files: {
      'INDEX.md': '# Knowledge Index\n\n## Decisions\n- demo|linkage → [决策域](decisions/demo.md)\n',
      'decisions/demo.md': [
        '## D-001@v1 有锚点', '状态：implemented', '锚点：src/foo.js:10', '',
        '## D-002@v1 有文件字段', '状态：implemented', '文件：src/bar.js', '',
        '## D-003@v1 无关联', '状态：implemented', '理由：纯决策记录', '',
      ].join('\n'),
    },
    cases: [
      { name: '语料健康报告关联率', kind: 'catalog', expect: { health: { total: 3, anchored: 1, files: 1, linked: 2 } } },
    ],
  },
]
