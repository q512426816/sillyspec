---
id: task-03
title: stage-review-register test suite
title_zh: 新增 registerStageReview 单测套件
author: qinyi
created_at: 2026-08-10 12:16:03
priority: P0
depends_on:
  - task-01
  - task-02
blocks:
  - task-04
allowed_paths:
  - test/stage-review-register.test.mjs
expects_from:
  task-01:
    needs:
      - registerStageReview
goal: >
  新增 test/stage-review-register.test.mjs，用原生 node:test + node assert strict + tmpdir fixture
  覆盖 registerStageReview 的骨架模式 / fromFile adopt 模式 / 错误分支 / marker 行为 / stage 映射，
  共 11 用例。对齐现有 test/stage-review 三套件风格。
implementation:
  - import registerStageReview 来自 ../src/stage-review.js
  - 每用例用 os tmpdir 建临时 specBase 拼出 changes 子目录 写 design.md 或 plan.md fixture
  - 用例1 骨架字段全 断言 schemaVersion reviewType specVerdict qualityVerdict reviewedFiles requiredEvidence
  - 用例2 docHash 正确 手动重算 computeDocHash 比对 review.docHash
  - 用例3 marker 写盘 断言文件存在 内容等于 reviewRunId review- 前缀 getLatestStageReviewRunId 读到同值
  - 用例4 自检过 调 validateStageReview 对产出的 review.json 返回 ok true
  - 用例5 fromFile adopt 写 agent 草稿带错 docHash 加 verdict pass 加 checklist 跑后断言 verdict checklist 保留 docHash 被修正为真实值 reviewedFiles 首项规范化
  - 用例6 fromFile schema 不过 草稿缺 schemaVersion 断言 throw 中文
  - 用例7 非法 stage foobar 断言 throw 中文
  - 用例8 空 changeName 断言 throw 中文
  - 用例9 主文档缺失 change 目录无 design.md 断言 throw 中文
  - 用例10 marker 已存在 预置旧 marker 跑后断言新 marker 覆盖 warn 不抛错
  - 用例11 plan 和 execute 映射 plan 审 plan.md execute 审 design.md reviewType 对应
acceptance:
  - 11 用例全部通过 node --test 该文件 EXIT 0
  - 不依赖网络 不依赖真实 git 用纯 tmpdir fixture
  - 断言 throw 用 assert throws 检查中文消息
verify:
  - node --test test/stage-review-register.test.mjs 全过
  - npm test 全量 EXIT=0 新文件不破坏现有套件
constraints:
  - 原生 node:test node assert strict 自实现 runner 无第三方库 对齐 CONVENTIONS
  - tmpdir fixture 跨平台 Windows Linux macOS 一致
  - 覆盖 design §7 全部 11 用例 与 G-1 到 G-7 验收点对应
  - allowed_paths 仅本测试文件 不改其他测试
---

# task-03：registerStageReview 单测套件

用例清单见 change design.md §7。allowed_paths 仅 test/stage-review-register.test.mjs。依赖 task-01 函数 + task-02 CLI。
