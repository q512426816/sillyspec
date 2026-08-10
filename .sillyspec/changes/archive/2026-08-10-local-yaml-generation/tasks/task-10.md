---
id: task-10
title: verify.js 行69/167 读 local.yaml 兜底引导
title_zh: verify 兜底
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/verify.js
provides: []
expects_from: {}
---

## 目标

`verify.js` 两处 `cat .sillyspec/local.yaml` 读取点——行69（step「加载规范并锚定」操作第4条「加载本地配置」）与行167（step「运行测试和质量扫描」操作第1条「读取 local.yaml 获取命令」）——追加缺失兜底引导「若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取」。仅改 prompt 文案，不动步骤增删/重排/wait 配置。

## 实现步骤

- 行69（「加载规范并锚定」step prompt 操作第4条 `4. 加载本地配置：cat .sillyspec/local.yaml 2>/dev/null（构建命令、测试命令、lint 命令等）`）条尾追加：若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取
- 行167（「运行测试和质量扫描」step prompt 操作第1条 `1. 读取 .sillyspec/local.yaml 获取构建、测试和 lint 命令`）条尾追加同款兜底引导
- 两处措辞一致；不引用 env 变量名、不引入新占位符

## 验收标准

- [x] verify 读 local.yaml 的 prompt 段（行69 + 行167）均含「先 `sillyspec local detect` 生成骨架再读取」兜底引导（FR-03 / D-004@v1）
- [x] 兜底措辞两处字面一致，未改动步骤名/步骤顺序/`outputHint`/`optional` 等结构字段
- [x] 未触碰 `_globalGuardrails`（verify 只读护栏保留原样）

## 验证方式

- `npm run lint` 通过（lint 扫 src/）
- grep `sillyspec local detect` 命中 src/stages/verify.js 两处（行69/167 附近）
- 镜像 `docs/prompt/verify.md` 由 task-12 跑 `node docs/prompt/_extract.mjs` 自动刷新，本步只改源码不手改镜像

## 约束

- 只改 `src/stages/verify.js`；prompt 引导 agent 主导（agent 自行判断缺失并执行 detect），非 CLI 隐式生成 local.yaml
- 兜底是「引导」不是「阻断」：local.yaml 缺失仍按现状 `2>/dev/null` 静默跳过，不强制阻塞 verify 流程
