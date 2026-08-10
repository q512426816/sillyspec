---
id: task-01
title: detect 核验增强——nodejs 读 scripts + gradle 核验 gradlew
title_zh: detect 核验增强
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: []
blocks: [task-02, task-09]
requirement_ids: [FR-01, FR-05]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/local-detect.js
provides:
  - contract: DetectResult
    fields: [project.type, commands]
expects_from: {}
---

## 验收标准

- Given nodejs `package.json` 含 `scripts.{build,test,lint}` 任意子集 → local.yaml `commands` 仅含真实存在的键，缺失键不写（不标 `unavailable`）
- Given nodejs `package.json` 无 scripts 字段（如 `{}`）→ `commands` 为空 `{}`
- Given gradle 项目有 `gradlew` → 前缀 `./gradlew`；无 `gradlew` 仅 `build.gradle` → 前缀 `gradle`
- Given `package.json` 非法 JSON → throw `package.json 解析失败：<path>`（CONVENTIONS #4）

## goal

`src/local-detect.js` detect 核验增强：nodejs 分支读 `package.json` scripts 逐键核验 build/test/lint 存在性才写键；gradle 分支核验 gradlew 决定 `./gradlew` vs `gradle` 前缀；消除「闭眼写死三件套」导致的 `Missing script: build` 实证 bug（design §1.1）。

## implementation

仅改 `src/local-detect.js`（已核验真实行号）：

- **nodejs 分支（行 59-68，命令块 62-66 现写死三件套）**：`readFileSync(package.json)` → `JSON.parse` 失败 `throw new Error('package.json 解析失败：' + path)`（CONVENTIONS #4）→ 取 `scripts` 对象逐键核验：`scripts.build` 存在才写 `commands.build='npm run build'`，`scripts.test` 存在才写 `commands.test='npm test'`，`scripts.lint` 存在才写 `commands.lint='npm run lint'`；无 scripts 字段 → `commands={}`
- **gradle 分支（行 83-92，命令块 86-90 现写死 `./gradlew`）**：`existsSync(gradlew)` 决定前缀 `./gradlew` vs `gradle`，build/test/check 三键统一拼前缀
- maven（行 71-80）/ make（行 95-103）/ generic（行 106-109）维持不变（lifecycle/Makefile 解析确定性已够）

## verify

- `npm test`（`test/local-detect.test.mjs` Case1/3/3b/nodejs-scripts 四类由 task-02 实现验收）
- 手测 `node bin/sillyspec.js local detect`：sillyspec 自身（无 build script）生成的 commands 不再出现 build 键
- `npm run lint` 通过

## constraints

- 只改 `src/local-detect.js`（allowed_paths 锁定）；纯 fs + JSON.parse，不引新依赖、不 spawn、不发网络、零 token
- `detectLocalYaml` 签名与返回结构形状不变（design §7.1 向后兼容），仅 commands 各键存在性语义改
- 命令缺失=不写键（非 `unavailable`）——consumer `verify-postcheck.extractTestCommand` 对无 test 键返回 null 降级 warning（FR-05 零回归）
- 不碰 platform/mcp 段——「已存在则跳过」由 `index.js:1427` 保护（D-002 边界）
