---
id: task-02
title: 'cleanup 硬化（rmSync maxRetries/retryDelay + git worktree prune 兜注册）'
title_zh: 'cleanup 硬化（rmSync maxRetries/retryDelay + git worktree prune 兜注册）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 14:39:34
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/run/gate-snapshot.js
  - test/gate-snapshot-cleanup.test.mjs
target_files:
  - src/run/gate-snapshot.js
  - NEW:test/gate-snapshot-cleanup.test.mjs
goal: >
  硬化 src/run/gate-snapshot.js:601-605 的 cleanup 并抽出可注入的 cleanupSnapshot：rmSync 加
  Windows 重试（EPERM/junction 锁），git worktree remove 失败后补 prune 清注册，返回双清结果
  供 task-03 决定销账——用故障注入测试证明失败分支真实生效（不以回归绿代替）。
implementation:
  - 从 cleanup 闭包抽出模块级导出 cleanupSnapshot({snapshotRoot, cwd, runGit = defaultGit, removeDir = defaultRemoveDir})，返回 {dirRemoved, worktreeCleaned}；闭包改为调用它（行为等价重构，供 task-03 在其外层接销账判定）
  - cleanupSnapshot 内：git worktree remove --force 失败 → rmSync(snapshotRoot,{recursive:true,force:true,maxRetries:5,retryDelay:100}) → remove 失败且目录已不存在时补 git worktree prune --quiet 清注册；全失败不抛
  - removeDir 缺省实现用 fs.rmSync 并带上述重试参数；runGit 缺省走仓内既有 git 调用封装
  - 更新 catch 注释：不再声称「残留交 OS tmp 清理」（%TEMP% 不会被 OS 清），改为指向 task-03 账本回收路径
  - 新建 test/gate-snapshot-cleanup.test.mjs（故障注入，禁源码字符串匹配）：①remove 失败→prune 被调用且 worktreeCleaned 语义正确 ②removeDir 收到 maxRetries/retryDelay 选项 ③双失败不抛、dirRemoved=false ④正常路径不调 prune
acceptance:
  - test/gate-snapshot-cleanup.test.mjs 四组故障注入用例全绿（真实调用与失败分支断言，非文本钉）
  - 既有 gate-snapshot 族 9 文件全部零回归（copy/monorepo/layout-guard/lineage/import-smoke/e2e/commands/ancestor-trim/worktree-skip）
  - npm run lint 绿（cleanupSnapshot 导出有单测消费，未引用导出 0）
verify:
  - node --test test/gate-snapshot-cleanup.test.mjs test/gate-snapshot-copy.test.mjs test/gate-snapshot-monorepo.test.mjs test/gate-snapshot-layout-guard.test.mjs test/gate-snapshot-lineage.test.mjs test/gate-snapshot-import-smoke.test.mjs test/gate-snapshot-e2e.test.mjs test/gate-snapshot-commands.test.mjs test/gate-snapshot-ancestor-trim.test.mjs test/gate-snapshot-worktree-skip.test.mjs
constraints:
  - 不动 createGateSnapshot 建快照主体逻辑（task-03 范围）
  - 不改门禁判定语义与快照血统三态
  - 清理仍为 best-effort：双失败吞异常不抛
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
