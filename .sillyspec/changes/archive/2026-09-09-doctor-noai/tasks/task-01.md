---
id: task-01
title: '三 detector + renderDoctorSummary'
title_zh: '三 detector + renderDoctorSummary'
author: 'qinyi'
created_at: 2026-09-09 05:28:58
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/doctor-diagnostics.js
  - NEW:test/doctor-noai-fold.test.mjs
target_files:
  - src/doctor-diagnostics.js
  - NEW:test/doctor-noai-fold.test.mjs
goal: >
  三类探测器（只读 fail-soft）+ 全新渲染契约，供 task-02 折叠消费。
implementation:
  - detectWorktreeHealth(cwd)：复用 WorktreeManager.doctor()（worktree.js:1207——薄适配 {issues,fixed,unfixable}→dimension 形状，不重复探测）+ 分支对账补充（git branch --list sillyspec/* vs changes/ 活跃目录）；锚定主仓根 .sillyspec/.runtime/worktrees
  - detectBuildEnv(cwd)：process.version vs package.json engines.node（^/>=/= 前缀简化比较，复杂区间标 unknown）；包管理器存在性（packageManager 字段/lockfile 推断 → existsSync which 探测）
  - detectMcpEndpoints(cwd)：.mcp.json/.cursor/mcp.json 项目级配置在场性（Context7/grep.app 键查找；零网络）；无配置 → skipped 注记
  - 三 detector 并入 runDoctorDiagnostics 数组；renderDoctorSummary(diagnostics) 渲染函数（格式设计定稿：逐维图标+label+findings 首行+safe_actions 提示）
  - test/doctor-noai-fold.test.mjs detector 用例：残留 worktree 目录 fixture/engines 不匹配/缺 mcp 配置 skipped/维度并入 --json 形状
acceptance:
  - worktree 残留 → findings 列明 + safe_actions 指向既有 cleanup
  - engines 前缀比较正反例；复杂区间 unknown 不判红
  - 探测异常 → skipped 注记维度（不缺项不阻断）
  - renderDoctorSummary 输出含逐维图标行
verify:
  - node --test test/doctor-noai-fold.test.mjs
  - node --test test/doctor-gc-unstamped-runs.test.mjs
constraints:
  - 全部只读零写盘（D-003）
  - 不 import run/stage.js（detector 层不依赖流程层）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
