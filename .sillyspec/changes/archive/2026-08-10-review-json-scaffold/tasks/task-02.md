---
id: task-02
title: register-stage-review CLI case in index.js
title_zh: index.js 新增 register-stage-review 命令分支
author: qinyi
created_at: 2026-08-10 12:16:03
priority: P0
depends_on:
  - task-01
blocks:
  - task-03
allowed_paths:
  - src/index.js
expects_from:
  task-01:
    needs:
      - registerStageReview
goal: >
  在 src/index.js 新增 case 'register-stage-review' 薄包装，镜像现有 backfill-reviews case
  （index.js 423-460），解析命令参数调用 task-01 产出的 registerStageReview，打印结果或错误。
implementation:
  - 新增 case 'register-stage-review' 分支 位置参考 backfill-reviews case 之后
  - 解析 --change --stage --from 三参数 用 args.indexOf 取值 缺则 null
  - 缺 --change 或 --stage 时 console.error 用法提示 + process.exit 2
  - 动态 import ./stage-review.js 取 registerStageReview
  - platformOpts 当 specDir 存在时设 specRoot 透传
  - try 调 registerStageReview 传 changeName stage fromFile cwd platformOpts
  - json 模式 stdout 写 JSON 含 ok command 及 result 各字段
  - 人类可读模式 console.log runId 路径 mode marker 及下一步提示 用 result.mainDoc
  - catch 错误 json 写 ok false 加 error 否则 console.error 中文消息 process.exitCode 1
acceptance:
  - sillyspec register-stage-review 缺 --change 或 --stage 时 exit 2 加用法提示
  - 成功执行打印 runId reviewPath mode markerPath mainDoc 下一步提示
  - registerStageReview throw 时 catch 打印中文错误 exit 1 不崩
  - 不改动 index.js 现有其他 case 分支
verify:
  - 手动跑 sillyspec register-stage-review --change 本变更 --stage brainstorm 产 review.json + marker
  - task-03 覆盖 CLI 行为后 npm test 全量 EXIT=0
constraints:
  - D-002 命令名 register-stage-review 对齐 exec-d 债单原名
  - D-004 仅手动 CLI case 不集成 execute --done 不改 gate 语义
  - 镜像 backfill-reviews index.js 423-460 风格 specDir json 透传对称
  - 用 result.mainDoc 不直接 import STAGE_MAIN_DOC 保持 case 薄 X-001
---

# task-02：register-stage-review CLI case

实现详见 change design.md §5.3（完整 case 代码示例）。allowed_paths 仅 src/index.js。依赖 task-01 的 registerStageReview 导出。
