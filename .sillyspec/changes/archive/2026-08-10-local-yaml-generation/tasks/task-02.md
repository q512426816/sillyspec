---
id: task-02
title: detect 测试契约更新
title_zh: detect 测试更新
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01]
decision_ids: []
allowed_paths:
  - test/local-detect.test.mjs
provides: []
expects_from:
  task-01:
    - contract: DetectResult
      needs: [commands]
---

## 验收标准
- Case1/Case3/Case3b/nodejs-scripts 四类 case 全过（`node test/local-detect.test.mjs` 退出码 0，failed=0）
- Case1：package.json `{}` → commands.build/test/lint 全 undefined（空对象）
- Case3：fixture 补 gradlew 文件 → 三命令前缀 `./gradlew`
- Case3b（新增）：build.gradle 无 gradlew → 三命令前缀 `gradle`
- nodejs-scripts（新增）：scripts 含 build/test/lint 子集 → 仅生成存在的键

## goal
test/local-detect.test.mjs 覆盖 task-01 核验驱动新契约（commands 键存在性 = scripts/gradlew 核验驱动），淘汰旧的「nodejs 闭眼写三件套」断言。

## implementation
- Case1（源码注释 :27，块 28-37，命令断言 :33-35）：fixture 不变（写 package.json `{}`），三条断言由 `==='npm run build'/'npm test'/'npm run lint'` 改为 `=== undefined`
- Case3（源码注释 :51，块 52-61，命令断言 :57-59）：现状 fixture 只写 build.gradle（无 gradlew）却断言 `./gradlew`——task-01 加 gradlew 核验后会 fail；**补写 gradlew 空文件**使 existsSync 成立，保留 `./gradlew` 前缀三条断言
- 新增 Case3b：fixture 仅 build.gradle（无 gradlew），断言三命令前缀 `gradle`
- 新增 nodejs-scripts case：package.json 含 `scripts:{build,test,lint}` 子集（如只写 build+test），断言仅生成存在键、缺键 undefined

## verify
- `npm test`（全量）；重点单跑 `node test/local-detect.test.mjs` 看 failed=0
- 依赖 task-01 已落地（detect 核验逻辑就位，否则新断言全 fail）

## constraints
- 仅改测试契约，不改 src（src 归 task-01）；allowed_paths 仅 test/local-detect.test.mjs
- CLAUDE.md 规则11：非测试逻辑本身有误时禁止改测试来「通过」——本 task 改测试是因 detect 逻辑变更（task-01）致契约变，非掩盖逻辑错误
