---
id: task-02
title: 新增 local-detect.js — detectLocalYaml 纯 fs 嗅探 + 单测
title_zh: 新增 local-detect.js — detectLocalYaml 纯 fs 嗅探 + 单测
author: qinyi
created_at: 2026-07-10 22:51:30
priority: P0
depends_on: []
blocks: [task-04]
requirement_ids: []
decision_ids: [D-001@v1]
allowed_paths:
  - src/local-detect.js
  - test/local-detect.test.mjs
provides:
  - contract: detectLocalYaml
    fields: [type, build, test, lint]
---

## goal

把 local.yaml 的"项目类型嗅探"从 scan（半小时 + 大量 token）里抽出来，变成纯 fs 几秒可完成的独立探测。create/gate 只需 project.type + commands，不该被迫跑完整 scan；本 task 交付纯函数 `detectLocalYaml`，零 AI / 零 token，与 scan 完全解耦。

## implementation

- 新建 `src/local-detect.js`，命名导出 `detectLocalYaml(workdir)`，仅用 `node:fs` 同步读文件判定，绝不 spawn 子进程、绝不调 AI
- 嗅探规则（按顺序，命中即返回）：
  - `package.json` 存在 → `{ project:{type:'nodejs'}, commands:{build:'npm run build', test:'npm test', lint:'npm run lint'} }`
  - `pom.xml` 存在 → `{ project:{type:'maven'}, commands:{build:'mvn compile', test:'mvn test', lint:'mvn checkstyle:check'} }`
  - `build.gradle` 存在 → `{ project:{type:'gradle'}, commands:{build:'./gradlew build', test:'./gradlew test', lint:'./gradlew check'} }`
  - `Makefile` 存在 → 读其中 `test:` 目标行，`{ project:{type:'make'}, commands:{test:'make test'} }`（build/lint 无则省略该键）
  - 都没有 → `{ project:{type:'generic'}, commands:{} }`
- 返回结构固定形状：`{ project: { type }, commands: { build?, test?, lint? } }`（commands 缺省键不强制出现，但 task-04 expects_from 锚定 `[type, build, test, lint]` 语义）
- 新建 `test/local-detect.test.mjs`：用临时目录（`fs.mkdtempSync`）构造 4 种项目类型 + generic 共 5 个 case，断言返回结构与上述规则一致；Makefile case 断言从 `test:` 行解析出的命令；generic case 断言 `commands` 为空对象

## acceptance

- `detectLocalYaml` 对 nodejs/maven/gradle/make/generic 五种场景返回正确 `{project.type, commands}`
- 纯 fs 实现：不 spawn 任何子进程、不调用任何 AI/LLM、不消耗 token，执行耗时秒级
- `npm test` 包含并通过新增的 `test/local-detect.test.mjs`

## verify

- 运行 `npm test`，确认 local-detect 单测全绿且不影响现有用例

## constraints

- 纯 fs 探测，不引入 yaml 读写依赖（yaml 序列化与落盘归 task-04 / scan 负责）
- 本 task **不写 local.yaml 到磁盘**——只返回数据结构，落盘由调用方（task-04 的 CLI 路由、scan.js:193）负责
- 与 scan.js 解耦：本文件不 import scan，scan.js 的"生成本地配置"步骤改调 `detectLocalYaml` 属于 task-04 范围，不在本 task 改动
