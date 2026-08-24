---
id: task-02
title: add-cli-version-drift-doctor-check
title_zh: doctor CLI 版本漂移检测（双轨比较）
author: qinyi
created_at: 2026-08-24 02:45:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [G2]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - src/stages/doctor.js
  - docs/prompt/doctor.md
  - docs/prompt/_extracted.json
goal: doctor 新增 CLI 版本漂移检测——安装根独立解析加 git/version 双轨比较（D-004），全局安装源码与当前仓不一致时 advisory 警告，防旧引擎驱动新定义重演
implementation:
  - doctor.js 并入既有检查段——置于「决策待复核检查」之后/汇总报告前，步骤数保持六步不变（D-002，R-01）
  - prompt 内嵌 node 探测脚本定位安装根——command -v sillyspec → realpath → 向上找 package.json（name=sillyspec）；独立解析，勿复用决策待复核检查的 SRC_ROOT（sillyspec 仓场景恒等，Grill 实证陷阱）
  - git 轨（安装根有 .git）——rev-parse HEAD 双仓比较 + remote origin 归一化同源判定（https/ssh 归一、.git 后缀剥离、host 小写）
  - version 兜底轨（安装根无 .git，registry 安装/npm i -g . 恒排除 .git）——比较双仓 package.json version，不同即警告；同 version 不同 commit 热改盲区显式注释（R-04）
  - 漂移警告文案含 2026-08-23 归档实证场景（五步版 archive 驱动六步定义）并建议同步后重跑流程；非 sillyspec 仓静默跳过；探测失败/超时降级单行不阻断
  - 镜像同步——跑 docs/prompt/_extract.mjs 与 _sync.mjs 真实流水线更新 doctor.md 与 _extracted.json（R-02）
acceptance:
  - AC-3 漂移检测实测——version 不一致 fixture 触发警告；安装根=当前仓（npm link 自身）不误报；非 sillyspec 仓静默；探测失败降级单行
  - AC-4 node docs/prompt/_verify.mjs doctor 段 0 miss；npm test 全绿（既有断言无回归）
  - doctor 步骤数六步不变，stage-definitions 等既有 doctor 断言零改动
verify:
  - node --check src/stages/doctor.js
  - node docs/prompt/_verify.mjs（doctor 段 0 miss）
  - node --test test/stage-definitions.test.mjs test/doctor-align-execute-progress.test.mjs test/doctor-verify-feedback.test.mjs test/worktree-doctor.test.mjs（doctor 相关既有测试全绿）
  - npm test 全绿
constraints:
  - 检查项 advisory——探测失败/超时只降级单行，不阻断 doctor 其余检查
  - 步骤数不变（六步），不新增顶层命令、不动 archive/execute 结构
  - 安装根必须独立解析（勿复用 SRC_ROOT 恒等陷阱）
  - 同 version 不同 commit 热改盲区在代码注释显式声明（R-04）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
