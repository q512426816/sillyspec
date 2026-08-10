---
id: task-01
title: registerStageReview function in stage-review.js
title_zh: stage-review.js 新增 registerStageReview 导出函数
author: qinyi
created_at: 2026-08-10 12:16:03
priority: P0
depends_on: []
blocks:
  - task-02
  - task-03
allowed_paths:
  - src/stage-review.js
provides:
  fields:
    - registerStageReview
goal: >
  在 src/stage-review.js 新增 registerStageReview 导出函数，实现 design §5.2 的 11 步流程，
  复用已就绪原料函数 computeDocHash/generateStageReviewRunId/stageReviewMarkerPath/validateStageReview
  及常量 STAGE_REVIEW_TYPE/STAGE_MAIN_DOC/REVIEW_SCHEMA_VERSION，纯新增不改现有任何导出。
implementation:
  - 现有 fs import 行加 writeFileSync（现有 existsSync/readFileSync/mkdirSync/readdirSync）
  - 新增 import resolveRuntimeRoot 来自 ./run/shared.js
  - 新增 export function registerStageReview 接收 changeName stage fromFile cwd platformOpts
  - 校验 stage 属于 brainstorm plan execute 三选一 且 changeName 非空 否则 throw 中文
  - 解析 specBase 取 platformOpts.specRoot 否则 cwd 下 .sillyspec 目录
  - runtimeRoot 用 resolveRuntimeRoot 算 changeDir 和 mainDocPath 用 join 拼
  - reviewType 取 STAGE_REVIEW_TYPE stage 映射 主文档取 STAGE_MAIN_DOC stage 映射
  - 主文档 mainDocPath 不存在则 throw 中文 无法算 docHash
  - docHash 调 computeDocHash mainDocPath 得 sha256 hex
  - 骨架模式构造 cannot_verify verdict 加非空 requiredEvidence 加 reviewerNotes 标骨架来源
  - fromFile adopt 模式解析路径 existsSync 否则 join cwd 兜底 都不在 throw 中文 读 parse validateStageReviewSchema 不过 throw 中文 保留 verdict checklist reviewerNotes requiredEvidence 覆盖 docHash 规范化 reviewedFiles 首项
  - generateStageReviewRunId 生成 runId mkdir run 目录 写 review.json 加换行
  - marker 已存在则 console.warn 再 writeFileSync marker 内容 runId 加换行
  - validateStageReview 自检 searchDirs 含 specBase changeDir cwd 不过则 throw 中文
  - 返回 ok reviewRunId reviewPath markerPath mode mainDoc review
acceptance:
  - 骨架 review.json 通过 validateStageReviewSchema 含 docHash 真实性校验
  - docHash 等于 computeDocHash 主文档算出的 sha256 hex
  - marker 文件内容等于 reviewRunId 且 review- 前缀 getLatestStageReviewRunId 能读到同值
  - 非法 stage 空 changeName 主文档缺失 fromFile 不存在 fromFile schema 不过 均各自 throw 中文
  - 不改动 stage-review.js 现有任何已导出函数的签名或行为
verify:
  - task-03 产出 test/stage-review-register.test.mjs 后 node --test 该文件全过
  - npm test 全量 EXIT=0 含现有 stage-review 三套件零回归
constraints:
  - D-003 scaffold 自动算 docHash 翻 P6.1b defer 仅本 scaffold 路径确定性
  - D-005 骨架 verdict cannot_verify 因 schema 强制 无 needs_review
  - D-006 stage 映射复用 STAGE_REVIEW_TYPE STAGE_MAIN_DOC 不另写表
  - D-008 复用原料函数不另写字段表 事前给等于事后查
  - D-009 函数入 stage-review.js 方案 B 与 task 级 generateTaskReviewDrafts 对称
  - 本地校验 throw 中文 对齐 CONVENTIONS
---

# task-01：registerStageReview 导出函数

实现详见 change design.md §5.2（11 步流程）+ §4 复用表。函数签名与返回结构以 design §5.2 为准（返回含 mainDoc，X-001 修正）。allowed_paths 仅 src/stage-review.js。
