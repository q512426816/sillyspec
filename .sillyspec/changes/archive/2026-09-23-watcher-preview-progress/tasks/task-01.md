---
id: task-01
title: '权威列迁移+读侧保险丝+读者走查钉'
title_zh: '权威列迁移+读侧保险丝+读者走查钉'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 16:10:27
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01,FR-03]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/db.js
  - src/progress/shared.js
  - src/progress.js
  - src/doctor-diagnostics.js
  - NEW:test/preview-migration.test.mjs
target_files: [src/db.js, src/progress.js, src/progress/shared.js, src/doctor-diagnostics.js, NEW:test/preview-migration.test.mjs]
goal: >
  authority 列迁移+读侧保险丝+读者走查钉——预览账本的地基
implementation:
  - db.js schema 版本戳递增一版；stages/steps 各 ADD COLUMN authority TEXT NOT NULL DEFAULT 'cli'（幂等：撞已存在列捕获忽略）
  - 建索引 (change_name, stage, authority)
  - progress.js 读查询单点（查询构造处）追加 AND (authority='cli' OR authority IS NULL)
  - progress.js stage 权威 upsert（约 :924）：INSERT 列清单与 DO UPDATE SET 均补 authority='cli'（影子审查 fail①——DEFAULT 只作用 INSERT 分支，不补则 CLI 命中预览行后权威数据永久盖 watcher 章被保险丝过滤）
  - doctor-diagnostics.js:1700 直读 join 旁路补同款 authority 过滤（gap②）
  - grep 审计 FROM stages|FROM steps 全出现点均经查询层，结论记 review
acceptance:
  - 迁移幂等重复跑零变化
  - 存量行 authority 全为 cli
  - 注入预览行后 serializeForSync 载荷与 progress show 默认输出逐字节一致
  - CLI --done 命中预览行后 authority 翻转为 'cli' 且数据可见（顶替闭合钉）
verify:
  - node --test test/preview-migration.test.mjs
constraints:
  - 迁移 fail-closed：不成功不进入读写
  - 加列不破坏旧版 CLI 按名列读
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
