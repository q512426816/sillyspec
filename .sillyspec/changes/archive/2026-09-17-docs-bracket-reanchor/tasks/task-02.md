---
id: task-02
title: 'docs-gate 陈旧分支自动重锚 + checkOpts 四键守卫 + reanchored 返回面 + 消息披露'
title_zh: 'docs-gate 陈旧分支自动重锚 + checkOpts 四键守卫 + reanchored 返回面 + 消息披露'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 09:19:45
priority: P0
depends_on: []
blocks: ['task-04', 'task-05']
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/docs-gate.js
target_files:
  - src/docs-gate.js
provides:
  - contract: docs-gate-reanchor
    fields: [reanchored, baseline]
    desc: runDocsGate 陈旧分支自动重锚（writeBaseline(current)+披露消息+reanchored 返回面）——给 task-04/task-05 消费
goal: >
  docs gate 陈旧分支（measured.originCount !== null && current <= measured.originCount）已付远端实测成本验证「本次不劣于远端」却从不落盘，同态下每次跑 gate 重复提示 + 重复实测（坑 ql-20260915-004，用户实证基线 404 < 远端 414 反复出现）——本 task 让已验证事实自动回流基线：口径守卫通过时 writeBaseline(specBase, current) + 消息披露 + 返回面增 reanchored，陈旧提示出现一次即消失（FR-02 / D-002@v1）。
implementation:
  - 'src/docs-gate.js:189-209 陈旧分支内加口径守卫（Grill CC-5/CC-9）：checkOpts.paths || checkOpts.skip || checkOpts.keywordAssert != null || checkOpts.crossRepoRoots 任一显式传入时不写盘，维持旧提示文案（手动 --init-baseline 建议）——只拦一次性异口径（子集/异口径计数写盘会错调基线），不拦 local.yaml 持久口径（measureRemoteBaselineCount 与本地 current 每次同读该配置（:105/:149），读写恒同口径自洽；本仓 local.yaml skip 非空，误拦 cfg 层则自动重锚永不触发）'
  - '守卫通过时 writeBaseline(specBase, current) 落盘，新基线 = current（本次实测值，已不劣于远端实测背书）'
  - '消息改写：从「建议 sillyspec docs gate --init-baseline 重锚锁定…」改为「已自动重锚 基线 X→Y（实测不劣于 <ref> Z，已落盘锁定）」形（X=旧基线、Y=current、<ref> Z=measured.ref 实测值），保留「基线陈旧」与「origin/main 实测 N」token（可读性与既有断言锚点）'
  - '返回面对齐 --init-baseline 分支形态（Grill CC-12）：结果对象增 reanchored: boolean（重锚分支 true，其余全分支缺省 false）；重锚分支 baseline 返新值（= current）；--json 消费者向后兼容（纯新增字段，index.js 透传 message/exitCode 不受影响）'
  - '零触碰三分支：首次立线 fail-closed（无基线 exit 2 要求显式 --init-baseline）、快路径（current ≤ baseline 零远端实测零变化）、真增量拦截（图文逐字不变）'
  - '头注补记（:15-20 坑 docs-gate-stale-baseline 段落就近）：陈旧分支已实测不劣于远端时自动重锚落盘 + 守卫边界（checkOpts 四键一次性覆盖不写盘），落款 2026-09-17-docs-bracket-reanchor'
acceptance:
  - '陈旧态（基线已存在 && current > baseline && 实测成功 && current ≤ originCount && 无 checkOpts 四键覆盖）跑 runDocsGate：exit 0、基线文件落盘值 = current、reanchored === true、baseline 返新值（= current）'
  - '披露消息含「已自动重锚」与「基线 X→Y」（旧基线→current）、远端 ref 与实测值（形如 origin/main 实测 N），并保留「基线陈旧」token'
  - '守卫：checkOpts 显式传 paths/skip/keywordAssert/crossRepoRoots 任一 → 基线文件不变、reanchored === false、维持旧建议文案（含 --init-baseline）；仅 local.yaml 持久口径不触发守卫（自动重锚照常）'
  - '其余全分支返回对象均含 reanchored: false（缺省）；首次立线（无基线 exit 2）、快路径（零远端实测）、真增量拦截（图文逐字不变）、--init-baseline、配置错误各分支行为与现状一致'
  - '同态第二次跑 gate 走快路径（current ≤ 新基线），陈旧提示与远端实测成本各只发生一次'
verify:
  - 'node --test test/docs-gate.test.mjs（全绿）'
constraints:
  - '不动 evaluateRatchet 纯判定（逻辑与文案）；不动 measureRemoteBaselineCount（含临时 worktree/清理容错）'
  - 'exit code 语义不变（重锚分支原就 exit 0；pre-push hook 只看 exit code，消息变更零影响）'
  - '不新增 gate flag/模式/阈值（D-003@v1 非复潮边界——重锚是既有陈旧分支内联行为）；首次立线 fail-closed 红线不破'
  - '测试面归 task-04（02→04 串行）：test/docs-gate.test.mjs:151-153 旧文案断言（--init-baseline 重锚）由 task-04 随行改写，本 task 不改测试文件'
  - '纯 Node 内置模块零依赖；Windows/Linux/macOS 兼容（路径全 join 无 shell 参与）'
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
