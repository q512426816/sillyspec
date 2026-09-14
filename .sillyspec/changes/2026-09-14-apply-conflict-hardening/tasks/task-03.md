---
id: task-03
title: 'doctor-manifest-drift-check-roadmap-sec64'
title_zh: '检测面——doctor manifest 漂移检查项（两态 sha256 三分支）+ ROADMAP 观察项 + troubleshooting §64 状态更新'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 14:05:33
priority: P1
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1, D-005@v1]
allowed_paths:
  - src/doctor-diagnostics.js
  - .sillyspec/ROADMAP.md
  - docs/sillyspec/troubleshooting.md
target_files:
  - src/doctor-diagnostics.js
  - .sillyspec/ROADMAP.md
  - docs/sillyspec/troubleshooting.md
expects_from:
  task-01:
    - contract: ApplyManifest
      needs: [manifest-schema]
provides:
  - contract: DoctorManifestCheck
    fields: [drift-check-item]
goal: >
  检测面——doctor 既有检查项形态追加 apply-manifest 漂移检测（活跃∪归档两目录收集，两态内容 sha256 三分支 advisory），ROADMAP 记 D-004 所有权登记观察项（不做+复潮条件），troubleshooting §64 标题状态改「已修复/落档」（FR-04，D-004@v1/D-005@v1）。
implementation:
  - doctor-diagnostics.js dimensions 数组（:958 区域）按既有 detect* 形态追加检查项——扫描面=活跃 changes/*/apply-manifest.json ∪ 归档 changes/archive/*/apply-manifest.json 两目录 glob 统一收集（目录移动即换扫描桶，R-03），按 appliedAt 降序取前 5
  - 两态均算内容 sha256（git blob hash 是 sha1 与指纹 sha256 异构不可直比）——staged 态=git show :<path> 内容 sha256；worktree 态=readFile 后 CRLF→LF 归一再算（防 autocrlf=true 工作区 CRLF 与 blob LF 恒异误报，与 task-01 哈希口径同基）
  - 三分支判定（advisory）——worktree≠manifest → 落盘面漂移（丢失/被改）；staged≠manifest → 暂存面漂移（index 被动过）；文件缺失 → 丢失；告警行含变更名×文件×期望/实际短 hash
  - .sillyspec/ROADMAP.md 追加 D-004 观察项一行（所有权登记不做；复潮条件=本护栏落地后仍实际损失 ≥2 次）；docs/sillyspec/troubleshooting.md §64 标题状态「护栏结论已立项方向」→「已修复/落档」（按实际落地态更新）
acceptance:
  - 篡改 manifest 覆盖文件一字节后跑 doctor 报漂移告警（行含变更名×文件×短 hash），落盘面/暂存面/缺失三分支各自可触发
  - 未篡改（worktree 与 staged 均与指纹一致）零告警；无 manifest 的变更目录零输出；doctor 退出码语义不变（advisory 不阻断）
verify:
  - npm test && npm run lint
constraints:
  - 既有 dimensions 检查项形态内追加，不新增命令/步骤/占位符；advisory 起步，升 blocking 另立变更
  - doctor 检查只读不写状态；不动 worktree-apply.js/index.js/quicklog.js（与 task-02 路径正交可并行）
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
