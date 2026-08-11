---
id: task-10
title: 全量验证与安装冒烟——npm test 与 npm run lint 在 node:sqlite 下全绿，node 24 零 flag 零编译 npm install 装即用，行为等价 spot check（WAL 与 BUSY 退避与 transaction 回滚与 bak 回退与只读 fail-closed），progress 层调用面零改动核验
title_zh: 全量验证与安装冒烟
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-07, task-08, task-09]
blocks: []
requirement_ids: [FR-02, FR-05, FR-06]
decision_ids: []
allowed_paths:
  - package.json
goal: >
  全量验证 node:sqlite 迁移——npm test 与 lint 全绿，node 24 安装冒烟装即用无 binding 缺失，行为等价五项 spot check，progress 层 prepare/get/all/run 调用面零改动核验。
implementation:
  - 跑 npm test 与 npm run lint 在 node:sqlite 下
  - 安装冒烟临时目录 npm install 全局 sillyspec 在 node 24 零 flag 零编译，sillyspec version 出 4.0.0
  - 行为等价 spot check WAL 生效与 BUSY 退避与 transaction 回滚与 bak 回退与只读 fail-closed
  - progress 层零改动核验，progress.js 与 progress 子模块与 sync.js 的 prepare/get/all/run 调用面字面不变
acceptance:
  - npm test 与 npm run lint 全绿
  - node 24 npm install 全局装即用无 binding 缺失无误导 db 损坏错
  - 行为等价五项 spot check 通过
  - progress 层 prepare 调用面零改动
verify:
  - npm test 与 npm run lint 全绿
  - 临时目录 npm install 全局 sillyspec 与 sillyspec version
constraints:
  - 不改源码仅验证，若 smoke 发现回归回对应 task 修不在本 task 改
  - brownfield 现有 sillyspec.db 零迁移直读
  - 安装冒烟须在 node 24 零 flag 零编译
---
