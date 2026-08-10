---
author: qinyi
created_at: 2026-08-10 12:15:00
plan_level: light
---

# 轻量计划（Light Plan）：register-stage-review 命令

## 来源
brainstorm design.md 方案 B（D-009@v1 函数入 stage-review.js + index.js 薄 case），复用已就绪原料函数（D-008@v1），scaffold 自动算 docHash（D-003@v1，翻 P6.1b defer 仅 scaffold 路径），仅手动触发（D-004@v1），仅 stage 级（D-001@v1）。

## 范围
- src/stage-review.js（新增 `registerStageReview()` 导出函数 + fs import 加 writeFileSync + 加 resolveRuntimeRoot import）
- src/index.js（新增 `case 'register-stage-review'` 薄包装）
- test/stage-review-register.test.mjs（新增）

## Tasks

- [x] task-01: stage-review.js 新增 `registerStageReview({changeName,stage,fromFile,cwd,platformOpts})` 导出函数 —— 实现 design §5.2 步骤 1-11（校验 stage/changeName → resolve specBase/runtimeRoot/changeDir/mainDocPath → 算 docHash=computeDocHash → 骨架 cannot_verify 或 --from adopt 保留 verdict+重算 hash → mkdir run dir + write review.json+'\n' → write marker（已存在 warn）→ validateStageReview 自检 → 返回含 mainDoc）；fs import 加 writeFileSync，加 `import { resolveRuntimeRoot } from './run/shared.js'`；非法 stage/空 changeName/主文档缺失/--from 不存在/schema 不过 throw 中文（覆盖：FR-01, FR-02, FR-04, FR-05, D-003@v1, D-005@v1, D-006@v1, D-008@v1, D-009@v1）
- [x] task-02: index.js 新增 `case 'register-stage-review'`（镜像 backfill-reviews index.js:423-460）—— 解析 --change/--stage/--from/--spec-dir/--json；缺必填 exit 2 + 用法；`await import('./stage-review.js')` 取 registerStageReview；try/catch 打印+exit 1；成功打印 runId/路径/mode/marker/下一步提示（用 result.mainDoc）（覆盖：FR-01, FR-05, D-002@v1, D-004@v1）
- [x] task-03: 新增 test/stage-review-register.test.mjs（11 用例：骨架字段全/docHash=computeDocHash/marker 写盘+getLatestStageReviewRunId 读到/validateStageReview 自检 ok/--from adopt 保留 verdict+重算 hash/--from schema 不过 throw/非法 stage throw/空 changeName throw/主文档缺失 throw/marker 已存在 warn+覆盖/plan+execute 映射）原生 node:test + tmpdir fixture（覆盖：FR-01, FR-02, FR-03, FR-04, FR-05）
- [x] task-04: npm test 全量 EXIT=0 + npm run lint 绿（含 test/ 内容规则）+ 查 index.js 是否有集中命令注册表/帮助文案需补登 register-stage-review（design §11 存疑#2）；触及 src/stages/* 否→文件生命周期/提示词文档无需同步（覆盖：FR-06, NFR-01~04）

## 关键路径
task-01 → task-02 → task-03 → task-04（单链，无并行：02 调 01 导出；03 测 01+02；04 全量回归）

## 验收
- `sillyspec register-stage-review --change <真实change> --stage brainstorm`（骨架）产出 review.json 通过 `validateStageReview`（含 docHash 真实性，gates.js Stage Review Gate 同源 schema）
- `--from <agent 草稿>` adopt 保留 verdict/checklist + 重算 docHash + 写 canonical run dir/marker + 自检过
- npm test EXIT=0；npm run lint 绿
- 纯新增不破坏：enforceReviewJsonGate / validateStageReview / getLatestStageReviewRunId / backfill-reviews / generateTaskReviewDrafts 零改动
- 跨平台（join 路径，无硬编码）

## D-xxx@vN / FR-xxx 覆盖矩阵（人类追溯）
| D / FR | task |
|---|---|
| D-001（仅 stage 级）/ FR-06 | task-04（回归确认未动 task 级） |
| D-002（命令名）/ FR-01 | task-02 |
| D-003（scaffold 算 docHash）/ FR-02 | task-01 |
| D-004（仅手动）/ FR-06 | task-02 |
| D-005（cannot_verify）/ FR-01 | task-01 |
| D-006（stage 映射）/ FR-01 | task-01 |
| D-007（--from）/ FR-04 | task-01, task-03 |
| D-008（复用原料）/ FR-01 | task-01 |
| D-009（方案 B）/ FR-06 | task-01 |
| FR-03（marker）/ FR-05（throw） | task-01, task-03 |
