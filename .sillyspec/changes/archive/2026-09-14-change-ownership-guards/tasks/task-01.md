---
id: task-01
title: data-layer-schema-v6-owner-session-and-owner-api
title_zh: '数据层——schema v6 迁移（owner_session 列+四处版本 bump+幂等 ALTER）+config 键+example+owner 读写 API+同步投影扩列'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 20:00:04
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-005@v1]
allowed_paths:
  - test/platform-sync-serialization.test.mjs
  - src/db.js
  - src/progress/shared.js
  - src/progress.js
  - src/progress/change-registry.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - test/platform-sync-schema.test.mjs
target_files:
  - src/db.js
  - src/progress/shared.js
  - src/progress.js
  - src/progress/change-registry.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - test/platform-sync-schema.test.mjs
provides:
  - contract: OwnershipData
    fields: [owner-session-column, getChangeOwner, claimChangeOwner, heartbeat-config]
related_tests:
  - test/platform-sync-schema.test.mjs
  - path: test/platform-sync-serialization.test.mjs
    reason: :83 schema_version===5 断言随 v6 bump 必破（fixture 走 pm.init 写 CURRENT_VERSION）——一行改 6
goal: >
  数据层铺底——changes 表 v6 迁移加 owner_session 列（四处版本号同步 bump+幂等 ALTER）+owner 读写 API+同步投影扩列+heartbeat 配置键，为 task-02/03 所有权语义与收口提供载体（FR-01/D-005@v1）。
implementation:
  - db.js——DB_SCHEMA_VERSION 5→6（行10）+ _createSchema 的 changes DDL 加 owner_session TEXT 列 + project.schema_version DEFAULT 同步 bump（行255，Grill 次要项）
  - 仿 v5 先例 _migrateAddColumn（行49-84 区域）实现 v5→v6 幂等 ALTER TABLE——列已存在则跳过不报错，存量行保持 NULL（无主）
  - progress/shared.js CURRENT_VERSION=6（四处版本同步之二）
  - progress.js _version=6（之三）+ 新增 getChangeOwner(changeName) 与 claimChangeOwner(changeName, session)——首建写入、已有值不覆盖并返回实际 owner
  - progress.js serializeForSync 的 changes 投影（行462-463/509-512 现仅 6 列）扩 owner_session 列随 payload 带出 + import 侧回写容错（旧 payload 缺列跳过不阻断）
  - progress/change-registry.js 首建 INSERT OR IGNORE（行153 区域）带 owner_session 写入会话标识
  - config-schema.js 登记 change-ownership.heartbeat_minutes optional 键（缺省 15）+ .sillyspec/local.yaml.example 补 change-ownership 段注释示例
  - test/platform-sync-schema.test.mjs 五处硬断言版本 5（行54/61/155/174/192）随 bump 同步改 6
acceptance:
  - v5 库打开自动迁移到 v6 加 owner_session 列，重复执行幂等（列存在跳过不报错），存量数据无损
  - claimChangeOwner 首建写 own、已有值不覆盖返回实际 owner；getChangeOwner 读回一致
  - serializeForSync 的 changes 投影含 owner_session 列，import 无该列的旧 payload 不报错
  - 存量 owner_session 为 NULL 的 change 可正常读写操作（无主零回归）
verify:
  - npm test
constraints:
  - 只落数据载体与读写 API，不实现所有权判定/接管语义与接线（task-02/03 范围）
  - 四处版本号（db.js DDL+DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress.js _version）必须同步 bump 不允许错位
  - 迁移幂等向后兼容，不改 sillyhub 平台侧消费（投影扩列即可，消费端后续另议）
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
