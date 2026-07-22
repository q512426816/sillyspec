---
id: task-04
title: index.js local detect 路由 + scan.js 复用 detectLocalYaml
title_zh: index.js 加 local detect 子命令路由 + scan 生成本地配置步骤复用 detectLocalYaml
author: qinyi
created_at: 2026-07-10 22:51:30
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: []
decision_ids: [D-001@v1]
allowed_paths:
  - src/index.js
  - src/stages/scan.js
expects_from:
  - task-02:
      contract: detectLocalYaml
      needs: [type, build, test, lint]
provides: []
---

# TaskCard — task-04

## goal
把 task-02 的 detectLocalYaml 接到 CLI 与 scan 流程上：新增 `sillyspec local detect` 独立路由生成 local.yaml，scan.js:193 生成本地配置步骤改为复用 detectLocalYaml 而非 AI prompt 自行探测。

## implementation
- index.js `switch (command)` 新增 `case 'local':`（参照 case 'gate'/'derive' 模式，309-546 行附近）：
  - 子命令 `detect` → `import('./local-detect.js')` 取命名导出 `detectLocalYaml`，以 cwd（`dir`）为入参
  - 结果序列化为现有 local.yaml 格式（含 project.type / commands.build·test·lint / test_strategy 注释占位），原子写入：先写 tmp 再 rename（参照 scan.js:191 现有原子写约定）
  - 已存在 local.yaml 则跳过并提示
- scan.js:193「生成本地配置」步骤：AI prompt 改为"调用 detectLocalYaml 复用其探测结果"，不再让 AI 自行嗅探 package.json/pom.xml/build.gradle（探测逻辑唯一归属 task-02）
- printUsage（index.js 用法输出）增加 `sillyspec local detect` 说明行

## acceptance
- `sillyspec local detect` 可独立运行并生成 local.yaml，**不触发 scan**（轻量、几秒、零 token）
- scan.js 生成本地配置步骤复用 detectLocalYaml，**不重写探测逻辑**
- local.yaml 已存在时跳过生成（不覆盖）
- 输出 local.yaml 格式与现状向后兼容（project.type / commands / test_strategy 注释占位）
- `npm test` 通过

## verify
- `npm test`
- `node bin/sillyspec.js local detect` 冒烟（在本仓或临时目录跑一次，确认生成 local.yaml）

## constraints
- 不改 detectLocalYaml 内部实现——那是 task-02 的边界
- 保持现有 local.yaml 格式向后兼容（已 brownfield 项目不破）
- 原子写（tmp + rename）
