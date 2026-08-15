---
author: qinyi
created_at: 2026-08-13 10:56:25
---

# SillySpec 工具驾驭 troubleshooting（agent 踩坑参考）

dogfood 实战中反复出现的工具使用坑 + 根因 + 解法。新 agent 接手前扫一遍，避免重蹈。每条都标了根因（不止给解法——知根因才能举一反三）。

---

## 1. Stage Review marker runId 格式（review- 前缀，CLI 自动生成）

**症状**：agent 手写 stage-review marker，runId 格式猜错（填 `exec-` ID 或裸时间戳），被 CLI 忽略、退回目录扫描兜底（不阻断但不整洁）。用户连续两次踩。

**根因**：runId/marker 本就由 CLI 自动生成写入，**agent 不该手算**：
- `src/run/prompt.js` review step 渲染时 `generateStageReviewRunId`（`review-` 前缀）+ 写 marker + echo 完整目录路径（"勿手拼 runId"）。
- 撞 gate 报"缺 review.json"时 `src/run/gates.js` 也自动 generate + 写 marker；`printStageReviewResult`（`src/stage-review.js`）FAILED 时 echo 完整 review.json 路径（含 runId）。

**解法**：
- review step 用 prompt 注入的 `{STAGE_REVIEW_RUN_ID}` + echo 的目录，直接派独立子代理把 review.json 写到该路径。
- 撞 gate 看 gate echo 的路径（含 runId），直接写，**勿手算 runId、勿手写 marker**。
- 卡住用 `sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute>` 一步生成 run 目录 + review.json 骨架 + marker + docHash 自算。
- 关联记忆：`[[sillyspec-execute-stage-review-marker]]`

---

## 2. docHash 漂移（design 改一字就要重算 sha256 + 续审）

**症状**：design.md 改后，stage review.json 的 docHash 对不上，gate 判伪造 fail-closed 阻断。改 PG 镜像那轮重跑了一遍审查。

**根因**：docHash 是 fail-closed 保真机制——review.json 的 `docHash` 必须等于 `reviewedFiles[0]`（主审查文档）当前 sha256。design 改了 sha256 必变，旧 docHash 失效。

**解法**：
- design 改后用 `sillyspec register-stage-review --change <名> --stage <stage>` 重算 docHash + 写 review.json 骨架（自动算 sha256），免手算。
- 或重跑审查子代理（独立上下文）产出新 review.json。
- 这是双刃剑：保真但费时，本质是 design 一致性代价——别为了省事跳过。

---

## 3. 子代理撞主模型 5h 限额（429 中断）

**症状**：opus 子代理（stage review / plan TaskCard）批量并发时撞 5h 限额，429 直接中断没产出。

**根因**：主模型（opus）5h 滚动限额，并发子代理突发消耗触发。

**解法**：子代理降级 `model: sonnet`（足够做 review/TaskCard，避开 opus 限额）。分批 ≤4 并发 + 降并发重试。CLI 层解不了（模型限额）。关联记忆：`[[sillyspec-plan-taskcard-parallel-529]]`

---

## 4. requiresWait 两段式（--wait/--continue + AskUserQuestion）

**症状**：requiresWait 步骤的 --wait/--continue 两段式 + AskUserQuestion 协调繁琐，容易绕错。

**根因**：wait 是用户决策点机制——步骤 `--wait` 暂停等用户决策，用户 AskUserQuestion 收集决策后，`--continue --answer` 中继恢复推进。

**解法**：`--wait` 暂停后用 AskUserQuestion 收用户决策，再 `sillyspec run <stage> --continue --answer "<决策>" --change <id>` 恢复。`--answer` 是中继（把 AskUserQuestion 答案喂回 CLI），不是绕过 wait。

---

## 5. _module-map.yaml schema_version=1 警告刷屏（已止血，根因待修）

**症状**：`_module-map.yaml schema_version=1（期望 2）` 警告每步渲染 prompt 刷屏。

**根因（双源）**：
- **生成端**：scan prompt 模板（`src/stages/scan.js:284/316`）仍写 `schema_version: 1`（旧），而 `modules rebuild`（`src/modules.js:121`）已写 v2。新 scan 永远产 v1。
- **读端**：`src/run/prompt.js loadModuleContextIndex` 对 `sv[1] !== '2'` 每步 warn（无去重 → 刷屏）。但读端 `buildModuleContextInjection` 已 v1/v2 双兼容（`data.paths || data.core_files`），v1 解析正常，warn 是过激噪声。

**解法（已止血 2026-08-13）**：读端 v1 warn 已去掉（`prompt.js loadModuleContextIndex`），仅缺 schema_version（真 malformed）才 warn。v1 不再刷屏。

**根因待修（建议单独 quick）**：scan prompt 模板升 v2——`scan.js` 的 `schema_version: 1` → `2` + 字段块对齐 modules.js 的 v2 字段集输出（`core_files/role/risk_level/verify_commands/related_docs`，见 src/modules.js 输出段）（`role/core_files/test_files/risk_level/verify_commands/related_docs` + 保留 `paths/depends_on/used_by/needs_review/review_reasons`）。改后新 scan 产 v2，与 modules rebuild 两个 writer 一致。注意改 scan.js prompt 要同步 `docs/prompt/scan.md`（规则19 提示词文档同步）。

---

## 6. QUICKLOG 轮转归档（提交时带上）

**症状**：QUICKLOG-<user>.md 超 500 行自动轮转出 QUICKLOG-<user>-<日期>.md（git 跟踪新文件），--done 静默生成，提交时容易漏（旧 ql 条目只在本地）。

**解法（已修 2026-08-13）**：`quicklog.js rotateIfNeeded` 轮转后 echo "已轮转 <user>.md → <archive>.md（提交时带上归档）"。提交 quick 时 pathspec 含轮转归档文件。关联记忆：`[[sillyspec-quicklog-is-tracked]]`

---

## 7. home 下长出平行 .sillyspec（读路径建库 + 向上解析无守卫，已根治）

**症状**：`~/.sillyspec/` 莫名出现整套进度库（sillyspec.db + 430+ quick change + quicklog），且持续被更新。

**根因（两层叠加）**：
- **读路径建库**：`ProgressManager._ensureDB` 在 db 不存在时 `db.init()` 建库落盘，除 gate/derive（machine-interface.js 只读契约守卫）外，`progress show`/`status`/quick 守卫等命令读到哪建到哪。
- **向上解析撞 home**：smoke 测试在 home 下临时目录跑 CLI 种下 `~/.sillyspec` 后，任何 home 子目录跑命令，`resolveSpecDir` 向上查找都会命中它——污染自我延续。

**解法（已修 2026-08-15）**：
- `resolveSpecDir`（`src/run/shared.js`）加 home 拒绝守卫：向上遍历时跳过 `os.homedir()` 一层，home 下 `.sillyspec` 恒不命中，回退 `cwd/.sillyspec`。
- 双源收敛：progress.js 里的同名拷贝删除，re-export run/shared.js 单一真相源。
- 存量清理：`~/.sillyspec` 整目录备份后删除（备份在 `~/.sillyspec-backup-20260815/`）。
- 测试：`test/spec-dir-home-guard.test.mjs`（8 断言，含 e2e：home 存在 .sillyspec 时子目录跑 CLI 不写 home 库）。
- 关联记忆：`[[sillyspec-cwd-correction-home-collision]]`

---

## 8. `run quick --help` 误开会话（--help 被静默吞，已修）

**症状**：`sillyspec run quick --help` 查询帮助却误开 quick 会话：新增 quick-sessions 目录 + QUICKLOG 骨架条目；`-h` 更是被当未知参数 exit 2。

**根因**：`--help` 在 runCommand 的 knownFlags 白名单里但**没有任何短路逻辑**，被静默吞掉后继续走 cwd 纠正 → 会话创建 → QUICKLOG 落盘。查询意图产生了写副作用。

**解法（已修 2026-08-15）**：runCommand 在 flag 校验通过后、任何副作用之前检测 `--help/-h` 短路，打印 stage 用法帮助（printStageUsage）退出 0；`-h` 补进 knownFlags。未知 flag 校验不变（`--halp` 仍 exit 2）。测试：`test/run-help-shortcircuit.test.mjs`（15 断言，含副作用零容忍：不增会话/不增 ql 条目）。
