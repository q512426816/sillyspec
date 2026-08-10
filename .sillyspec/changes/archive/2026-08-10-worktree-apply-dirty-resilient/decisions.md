---
author: qinyi
created_at: 2026-08-10 11:09:44
---

# 决策记录（Decisions）

> 本次变更的决策台账。仅记录有实现/验收影响的决策。

## D-001@v1 — 抗脏方向选型（cp 指令 / --files 子集 / 放宽 --3way）

- **type**: approach
- **status**: accepted
- **source**: 任务卡 C2 候选方案 + brainstorm step3 用户澄清 + 实证
- **question**: 主仓并发 tracked 脏文件致 worktree apply 全盘失败，走哪个方向？（A=cp指令 / B=--files子集 / C=放宽dirty用--3way重试）
- **answer**: A（cp 指令）。step4.5/5a fail-loud 拦截保留，拦截时额外输出逐文件 cp 指令清单（只针对 changedFiles 中不与脏文件冲突的子集）。不改 apply 行为，零风险 fail-loud。
- **normalized_requirement**: apply 被 dirty 拦截时，CLI 输出可执行逐文件 rescue 指令（cp/rm），让 agent 不必盲猜；fail-loud 安全边界完整保留。
- **impacts**: src/worktree-apply.js 新增 rescue 指令生成逻辑（不改 apply 决策路径）；新增 result.rescueCommands 字段；assess/checkOnly 也输出 rescue。
- **evidence**: 实证（autocrlf off 时 `git apply --3way` 在不重叠 dirty 树 Applied cleanly；autocrlf on 报 does-not-match-index；纯 git apply 不重叠脏树成功）→ step4.5 注释:243-245"git 本质限制"归因被驳斥为 CRLF 副作用，但 Windows 兼容性（规则13）使 fail-loud 仍有据。B 需放宽 step4.5 触碰安全边界且 Windows 下丢 --3way 合并；C 破坏 fail-loud 否决。
- **priority**: P0

## D-002@v1 — 实现层选型（轻量内联 / helper+result字段 / --rescue flag）

- **type**: implementation
- **status**: accepted
- **source**: brainstorm step4 用户选择
- **question**: 方向 A 的 rescue 逻辑实现层走哪种？
- **answer**: 方案 2（helper + result.rescueCommands 字段）。抽纯函数 `generateRescueCommands` + 新 additive 字段，step4.5/5a 拦截 + assess 三处共用。
- **normalized_requirement**: rescue 逻辑为可单测纯函数；assess(checkOnly) 也能预览 rescue 指令；result 新字段供 --json 程序化读取。
- **impacts**: src/worktree-apply.js 导出 `generateRescueCommands`；result 对象加 rescueCommands 字段；assessApplyRisk 透出。
- **evidence**: 方案 1（轻量内联）assess 看不到 rescue（agent 常先 assess 探路，关键劣势）；方案 3（--rescue flag）超任务卡 print-only 范围否决。方案 2 符现有代码风格（worktree-apply.js 已有 resolvePatchFiles/classifyAllowListViolations/filterDeliverableFiles 等导出纯函数）。
- **priority**: P1

## D-003@v1 — rescue cp 子集安全边界

- **type**: safety
- **status**: accepted
- **source**: brainstorm step3/5 设计澄清 + 风险登记
- **question**: rescue cp 指令覆盖哪些文件、排除哪些？
- **answer**: 逐文件分类——① dirty∩changedFiles（cp 覆盖脏工作）→ 排除 + 警告；② hashMismatchFiles（主干已提交推进，cp 丢主干改动）→ 排除 + 引导先 commit dirty 再正常 apply 走 --3way 合并；③ deletedFiles（worktree 删除）→ rm 指令；④ 其余干净子集（untracked 新建 + modified-tracked 主仓干净）→ cp 指令。
- **normalized_requirement**: rescue 只 cp 安全子集，自动排除会丢数据的文件（脏工作 / 主干推进），给风险标注；cpFileCount + excludedCount 供 agent 校验。
- **impacts**: generateRescueCommands 四分支分类逻辑；step2 扩展收集 deletedFiles（现 name-status 合并丢 D 状态）；路径正斜杠规范化（Git Bash 兼容）。
- **evidence**: R-02（覆盖脏工作）/ R-03（丢主干改动）均为 P0 数据丢失风险，必须自动排除；删除文件 cp 无法表达，给 rm。
- **priority**: P0

## D-004@v1 — Grill 修正三项（hashMismatch 时序 / dirtyFiles 口径 / --json 论断）

- **type**: correction（Design Grill 独立审查 review-2026-08-10-111056 判 FAIL 后修正）
- **status**: accepted
- **source**: 独立审查子代理（general-purpose，对抗式）+ 主 agent 实证复核（src/index.js:722-817 + worktree-apply.js:290-310）
- **question**: design v1 经独立审查发现三项缺陷如何修？
- **answer**:
  1. **hashMismatch 时序缺口（P0）**：原 `result.hashMismatchFiles` 仅 step5b（:290-310）填充，step4.5（:271）/step5a（:286）拦截 `if(!checkOnly) return` 短路在前 → rescue 调 generateRescueCommands 时 hashMismatchFiles 恒空 → EXCLUDE-MISMATCH 失效 → main 推进 fileA + fileB dirty 时 rescue 误判 fileA SAFE-CP 输出 cp → 回退他人已提交推进 = 数据丢失。**修**：hashMismatch 计算前移到 step3.5（step4.5 前；仅依赖 baseHash/HEAD blob 对比无 dirty 依赖，前移安全），原 step5b 改读前移结果；补专项回归测试（main 推进 fileA + fileB dirty → rescue 排除 fileA）。
  2. **dirtyFiles 口径不一致**：step4.5 触发（:252-255 排除 .sillyspec/.claude/docs/CLAUDE.md）/ step4.5 display（:262-265 tracked+untracked 排 .sillyspec/+meta.json）/ step5a（:277 仅 tracked）三套口径。**修**：rescue 用统一口径（main 工作区 tracked-modified∪untracked，排 .sillyspec/+meta.json），调用方一次性算好传入 generateRescueCommands；design 更正对排除范围的误述。
  3. **"--json 自动可见"论断错误**：worktree apply（index.js:722-768）/ assess（:769-817）不经 machine-interface.js、无 --json envelope，result.rescueCommands 结构化字段在所有 CLI 路径 dormant。**修**：撤回该论据；rescue 人类可见性走 errors 文本拼接（index.js 现有 `for(err of result.errors) console.error` 已输出，assess 经 reasons 打印）+ 补 index.js apply/assess 结构化 `Rescue commands (N/M)` 打印段。
- **normalized_requirement**: rescue 必须在 hashMismatch 已知的条件下分类（防 cp 覆盖主干推进）；dirtyFiles 口径单一明确；rescue 可见性通道真实存在（不依赖虚假 --json）。
- **impacts**: worktree-apply.js step 顺序调整（step3.5 前移）+ dirtyFiles 统一计算 + result.errors 拼接 rescue；src/index.js apply/assess 打印器补结构化 rescue 段；D-002@v1 的 "--json 可读" rationale 撤回（决策方案2 本身不变，仍 helper+字段）。
- **evidence**: 主 agent 逐行复核 src/index.js:722-817（apply 打印 result.errors :734；assess 打印 reasons :790；均无 machine-interface/--json）+ worktree-apply.js:290-310（hashMismatch 仅 getBlobHashMap baseHash/HEAD 对比）；独立审查子代理 21 tool-use 实证。
- **priority**: P0
