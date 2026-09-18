---
id: task-02
title: 'Create fr-index.js core (id assignment / supersede / digest / overlap)'
title_zh: '新建 src/fr-index.js 索引核心——FR_INDEX_EPOCH 常量 + parseChangeRequirements（FR 块/承接行/场景名）+ indexRequirements（域解析剥 NEW: 前缀/发号/翻链/unreferenced/幂等/warn 不阻断）+ readActiveFrDigest（superseded 藏）+ frTitleOverlap（bigram）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1, D-003@v1]
allowed_paths:
  - src/fr-index.js
target_files: [NEW:src/fr-index.js]
expects_from:
  task-01: '参数化四底座（splitKnowledgeSections 节头正则/syncIndexRoutingLines 节名与子目录/joinKnowledgeFile/discoverModuleIndex）'
provides:
  FR_INDEX_EPOCH: "常量 '2026-09-18'"
  parseChangeRequirements: '(changeDir) → {missing, frs:[{local,title,supersedes,scenarios}], malformed}'
  indexRequirements: '({changeDir,knowledgeRoot,headHash,cwd}) → {written,superseded,unreferenced,warnings}（幂等）'
  readActiveFrDigest: '(knowledgeRoot, domains) → [{domain,id,title,change,scenarios}]（superseded 藏）'
  frTitleOverlap: '(a,b) → 0..1 bigram'
goal: >
  L1 索引核心：归档发号/承接翻链/幂等写入/注入源/重叠检测，五导出按 design 接口定义。
implementation:
  - FR_INDEX_EPOCH 常量 + parseChangeRequirements：### FR-NN: 标题 + 承接[:：] 行（FR-[a-z0-9-]+-\d+ 列表）+ 场景名（#### 场景：X 或 **场景：X** 行，覆盖两种写法）
  - indexRequirements：域解析（change 自身 design.md 文件清单表行剥 NEW: 前缀 × discoverModuleIndex 的 paths 前缀匹配，unmapped 兜底）→ 已索引变更名命中（来源变更字段）= no-op 幂等 → 新 FR 按域 max+1 发号 → 承接引用全域扫描翻旧条目 superseded+superseded_by → unreferenced=触达域 active 数−承接引用数 → knowledge/fr/<域>.md 写入（复用 task-01 参数化底座）+ INDEX 路由行（FR 节）
  - 坏承接 id（不存在）→ warnings 收集不阻断；requirements.md 缺失 → skipped 语义返回
  - readActiveFrDigest / frTitleOverlap 纯函数（bigram 集合交集/并集，中英混排）
acceptance:
  - 同变更两次 indexRequirements：第二次 written/superseded 皆空
  - 承接引用后旧条目状态与 superseded_by 正确；坏 id 进 warnings 不抛
  - digest 不含 superseded 条目；overlap('导出数据','导出数据CSV')>0.6 且 overlap('导出','登录')<0.2
verify:
  - node --input-type=module -e "import('./src/fr-index.js').then(m=>console.assert(m.FR_INDEX_EPOCH==='2026-09-18'&&typeof m.indexRequirements==='function'))"
constraints:
  - 零依赖叶子（仅 import task-01 参数化底座与 fs/path）
  - 不写 db；不碰 decisions/ 域文件
  - CLI 单一写入方纪律：写入只发生在 indexRequirements 内部
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
