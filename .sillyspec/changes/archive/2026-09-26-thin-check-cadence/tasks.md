---
author: flow-machine-draft
created_at: 2026-09-26T06:24:50.289Z
---
# 任务注册表（Tasks）— 2026-09-26-thin-check-cadence

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。

- [x] task-01: detectBatchCheckCadence 纯函数（src/sentinel-assertions.js，具名+default export 键）+ test/sentinel-rules.test.mjs 新用例组（多格跳取最大/0→1 与逐格不判/无事件/坏 detail 容错）
- [x] task-02: flow.js cmdFlowDone ledger 子步接线勾选节奏 advisory（独立 try/catch fail-open）+ npm run test:core 186/186 与 lint 820 文件实测全绿（实测门由收口 CLI 亲测终裁）；本变更自身按单元逐格勾选（watcher 事件流 0→1、1→2 分拍在案）
