---
id: task-01
title: 'merge-writeback-staging-and-three-exit-apply-manifest'
title_zh: '收口层——merge 写回批末 git add + 三出口统一 writeApplyManifest + rescue 指引行'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 14:05:33
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-003@v1, D-005@v1]
allowed_paths:
  - src/worktree-apply.js
target_files:
  - src/worktree-apply.js
provides:
  - contract: ApplyManifest
    fields: [writeApplyManifest, manifest-schema, rescue-hint]
goal: >
  收口 apply 自动写链路——mergeDirtyOverlapThreeWay 写回批末补显式 pathspec git add（消灭唯一未暂存自动写点），applyWorktree 三条成功出口统一落 apply-manifest.json 指纹（哈希口径=staged blob LF 规范态），rescue 输出补「落地后立即 git add 锁定」指引行（FR-01/FR-02，D-001@v1/D-003@v1/D-005@v1）。
implementation:
  - mergeDirtyOverlapThreeWay（:111，clean 写回点 :143）写回批末统一 safeGit 数组形式 git add -- <显式 pathspec> 暂存全部写回文件（含新增）；add 失败 fail-open 不阻断 apply（warning 留痕），manifest 仍如实记录实际落盘面（FR-01）
  - 新增内部函数 writeApplyManifest（签名按 design.md 接口定义），applyWorktree 三条成功出口统一调用（withMainRepoLock 锁内）写 <changeDir>/apply-manifest.json（已存在则覆盖——重放 apply 以最新为准）——出口一 patch 主路径成功尾声（:1281 git apply --3way 之后）；出口二 applyByMerge 两条提前 return（显式 --merge :1026 与 ENOBUFS 自动降级 :1358-1364）；出口三 mergeDirtyOverlap 写回后的主流程继续；files 按各出口实际落盘清单（patch 面∪merge 写回面）
  - manifest schema 按 design.md 定案（schemaVersion/change/appliedAt/baseHash/files 数组，元素=path+sha256）；哈希口径=staged blob 内容（git show :<path> 的 LF 规范态，写侧在 git add 后取值），与 doctor staged 态比对天然同基（FR-02）
  - generateRescueCommands（:157）输出末尾补一行「落地后立即 git add -- <files> 锁定」指引（D-003@v1）
acceptance:
  - merge 写回批后 staged 名单（git diff --cached --name-only）含该批全部写回文件（含新增文件）；构造 add 失败时 warning 出现且 apply 不中断
  - 三条成功出口各自产出 apply-manifest.json 且 files 覆盖该出口实际落盘面（patch 主路径 / applyByMerge 两出口 / merge 写回后续）
  - manifest 内每条 sha256 与 git show :<path> 内容逐一一致（staged blob 口径）
  - rescue 输出末尾含「落地后立即 git add 锁定」指引行
verify:
  - npm test && npm run lint
constraints:
  - 不动 patch 主路径既有 git apply --3way（隐含 --index，零缺口）；不改 doctor-diagnostics.js/quicklog.js/index.js（归 task-02/03）
  - manifest 由 CLI 全权写（agent 勿手改，verify-facts 同款契约）；rescue 人工落地文件不进 manifest（design 非目标边界）
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
