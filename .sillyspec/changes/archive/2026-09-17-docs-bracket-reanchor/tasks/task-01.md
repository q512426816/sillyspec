---
id: task-01
title: 'REF_RE/SYMBOL_REF_RE 文件段括号段并列（圆/方同权，D-006 展开循环形保持）+ 头注'
title_zh: 'REF_RE/SYMBOL_REF_RE 文件段括号段并列（圆/方同权，D-006 展开循环形保持）+ 头注'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 09:19:45
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-006@v1]
allowed_paths:
  - src/docs-check.js
target_files:
  - src/docs-check.js
provides:
  - contract: docs-check-bracket-segment
    fields: [file]
goal: >
  REF_RE（src/docs-check.js:125）与 SYMBOL_REF_RE（src/docs-check.js:174）文件段展开循环
  迭代体从单一圆括号段改为圆/方括号段并列同权，Next.js 动态路由 app/post/[id]/page.tsx
  类方括号路径引用可全量提取可精确校验（不再依赖 ... 模糊逃逸、skippedFuzzy 零核验），同步头注补方括号段说明。
implementation:
  - REF_RE（src/docs-check.js:125）：文件段迭代体 (?:\([类]+\)[类]*) 改为 (?:(?:\([类]+\)|\[[类]+\])[类]*)（类=[A-Za-z0-9_.\-\/]，普通段字符类本身不放宽——D-001@v1 完整括号对并列形态）；正则其余组（repo:// 前缀/扩展名/start-end/纯位置锚 ?）零改动
  - SYMBOL_REF_RE（src/docs-check.js:174）：文件段与 REF_RE 同款迭代体同步并列化；:: 后 ASCII 标识符组与 repo:// 前缀零改动
  - 头注更新（src/docs-check.js:106-124）：括号段说明扩为「圆/方括号段并列同权（路由组 (dashboard) + 动态路由 [id]）」；markdown 链接回落机理补方括号变体——[t](foo.js:12) 的 [t] 匹配方括号段后遇 ( 截止、扩展名组要求 . 失败 → 回落 foo.js:12（与圆括号段同族回落）；嵌套 [[x]]/[[...slug]] 内容含 [ 不属类 → 方括号段不成立、部分提取残段（与旧正则逐字节一致）——逐点补注释
  - SYMBOL_REF_RE 头注（src/docs-check.js:168-173）同步补方括号段同权一句
acceptance:
  - collectDocRefs 提取 app/post/[id]/page.tsx:12 全量：1 条引用，refs[0].file === 'app/post/[id]/page.tsx'、start === 12
  - 圆方混合段 app/(g)/[id]/z.tsx:3 全量提取：file === 'app/(g)/[id]/z.tsx'（同含 (g) 与 [id] 两段）
  - 段首方括号段 [id]/page.tsx:1 全量提取：file === '[id]/page.tsx'
  - 符号锚 app/[lang]/layout.tsx::sym 提取：kind === 'symbol'、file === 'app/[lang]/layout.tsx'、symbol === 'sym'
verify:
  - node --test test/docs-fix-capability.test.mjs（既有圆括号样板/markdown 链接/嵌套/ReDoS 用例全绿——存量行为零回归）
constraints:
  - 正则改动保持展开循环形（D-006@v1）：迭代体必含完整开闭同形括号对（划分唯一→线性），禁原子序列形 (?:A+|B+)+
  - 纯 Node 内置模块零依赖（docs-check 既有红线），不引 glob/escape 库；[ 与 ] 不进普通段字符类（D-001@v1 完整括号对形态）
  - 解析/校验/修复链零结构变化：resolveCandidates（join+existsSync 字面量语义）、findInTree、applyFixes 不动；collectDocRefs 返回对象字段零增减（仅 file 值域扩至可含方括号字面量）
  - 只改 src/docs-check.js；不加/不改测试（方括号用例组属 task-03）；不动 docs-gate.js（Phase B 面）
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
