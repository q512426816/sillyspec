---
id: task-04
title: '快照 copy 面——config-schema.js 登记 gate_snapshot.copy + gate-snapshot.js junction/copy 回退 + test/gate-snapshot-copy.test.mjs'
title_zh: '快照 copy 面——config-schema.js 登记 gate_snapshot.copy + gate-snapshot.js junction/copy 回退 + test/gate-snapshot-copy.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 11:39:03
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-002@v1]
allowed_paths:
  - src/config-schema.js
  - src/run/gate-snapshot.js
  - test/gate-snapshot-copy.test.mjs
target_files:
  - src/config-schema.js
  - src/run/gate-snapshot.js
  - NEW:test/gate-snapshot-copy.test.mjs
goal: >
  local.yaml gate_snapshot.copy 声明生成物路径，快照构建期从主仓 junction 链接（失败回退 copy），消除 lint/test 缺生成物环境性假败。
implementation:
  - 'config-schema.js 登记 gate_snapshot.copy（type: array of string，optional，status: live，readers: createGateSnapshot）——同步 renderExample() 示例段加 gate_snapshot: 块（config-schema.test.mjs:109/:111 防漂耦合）'
  - 'gate-snapshot.js createGateSnapshot 环境目录链接段之后：从主仓 cwd 读 .sillyspec/local.yaml（轻量行扫描，勿在快照内读——快照 local.yaml 是复制件且 copy 面须先于复制生效；实际 local.yaml 复制段在环境链接段之后，先读主仓再复制同文件不冲突，注意顺序）解析 gate_snapshot.copy 数组，逐条规整路径（反斜杠转正斜杠、拒 ../ 与绝对路径）：主仓存在 → symlinkSync(junction)，抛错回退递归 copy（目录）/ copyFileSync（文件），均失败 warn 不作废快照；主仓不存在 → warn 跳过；快照内已存在（overlay 已覆盖）跳过；成功 log 报备条目数'
acceptance:
  - '配置目录条目后快照内 existsSync(join(snapshotRoot, rel)) 为真'
  - '未配置时快照创建路径逐字节走旧逻辑'
  - 'junction 不可用时回退 copy'
  - '主仓不存在条目 warn 跳过，快照不作废'
verify:
  - 'npm test -- test/gate-snapshot-copy.test.mjs'
  - 'npm test（全量回归，test/config-schema.test.mjs 零回归）'
constraints:
  - '不动 detectSymlinkStoreLayout'
  - '不动 SNAPSHOT_OFF 逃生'
  - '不在快照内执行任何 gen 命令'
  - 'junction 写穿透语义（快照内再生成会写主仓）在配置注释明示'
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
