
## ql-20260807-011-d831 | 2026-08-07 19:20:30 | plan TaskCard 规则抽模板 include + 自检清单诚实化（sss.md B4+B5）
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（buildCoordinatorStep 删内联 ~60 行 TaskCard 规则，改 {{include: taskcard-rules}}）
- templates/prompts/taskcard-rules.md（新建：公共格式规则 + 自检清单硬校验 9 / 规范约定 5 分组）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新 plan coordinator 步）
- docs/prompt/plan.md（3 处子代理规则段替换为 include + include 指令说明）
- docs/prompt/README.md（include 指令表补 taskcard-rules）
- test/plan-taskcard-include.test.mjs（新建：8 断言回归，防规则内联回流 + include 注入完整性）
需求：落地 sss.md/sss1.md 审计剩余 P2 项 B4+B5——plan Step4 协调器 TaskCard 公共格式规则在 N 个 task 子代理 prompt 间逐字重复（改一处需同步 N 处），且自检清单未区分硬校验字段与规范约定字段（agent 白检 author/created_at/priority/depends_on/blocks）
根因：buildCoordinatorStep 对每个 task 拼相同 ~60 行格式规则字符串；P2.2.3 已建 {{include}} 机制（verify-probes 先例）可复用抽公共片段，收益=维护性 + 可单独校验（token 不省是机制固有）；自检清单 14 字段一锅列，而 validatePlanFeasibility 只硬校验 9 个
方案：新建 templates/prompts/taskcard-rules.md 抽公共规则，src/stages/plan.js buildCoordinatorStep 内联段替换为 {{include: taskcard-rules}}（resolvePromptIncludes 运行时全注入，agent 收到行为不变）；自检清单拆分硬校验 9 字段 vs 规范约定 5 字段；重跑 _extract.mjs 同步 docs/prompt 镜像（plan.md 3 处 + README include 表）；新增回归测试
结果：npm test 全量 0 失败（退出码 0）、lint 72 文件通过、plan 相关 6 测试全过（taskcard-include 8/8、task-numbering 4/4、plan-execute-contract 56/56、plan-optimization 13、plan-postcheck 15、brainstorm-plan-contract 11）；quick 变更边界审计 SAFE

## ql-20260807-012-2b86 | 2026-08-07 20:18:05 | modules rebuild dry-run 保护 + git add 精确 pathspec（multi-agent 2 坑）
状态：已完成
关联变更：（无）
文件：
- src/modules.js（rebuildModuleMap 加 {force}：默认 dry-run 不写盘 + 打印覆盖预警，--force 才覆盖；force 分支补 return）
- src/index.js（modules rebuild 路由解析 --force 传 options + help 文本加 [--force] 说明）
- src/stages/archive.js（步骤8 rebuild 改 --force 慎用说明；步骤5 git add 精确 pathspec：changes/archive/ + docs/<project>/modules/）
- src/stages/brainstorm.js（git add 改 {SPEC_ROOT}/changes/<change-name>/ 两处：scale 分支 + 多包分支）
- src/stages/brainstorm-auto.js（git add 改 {SPEC_ROOT}/changes/<change-name>/）
- src/stages/scan.js（git add 改 {DOCS_ROOT}/ + {KNOWLEDGE_ROOT}/，不裹挟 changes/）
- test/modules-rebuild-dryrun.test.mjs（新建：dry-run/force 两分支 6 断言）
- test/platform-scan-p0.test.mjs（scan git add 断言同步为精确 pathspec）
- docs/prompt/_extracted.json（重跑 _extract.mjs）
- docs/prompt/{archive,brainstorm,scan,brainstorm-auto}.md（prompt 镜像同步）
- docs/sillyspec/file-lifecycle.md（archive step5 git add 描述同步）
- .sillyspec/docs/sillyspec/modules/migration.md（rebuild 签名 + dry-run 行为同步）
需求：处理 multi-agent-platform/docs/sillyspec 剩余 2 个活跃坑——modules rebuild 破坏性覆盖手动维护字段、index-staged 跨变更 git add 整目录裹挟串台
根因：rebuildModuleMap 直接 writeFileSync 覆盖 _module-map.yaml 清空 tags/entrypoints/main_symbols/depends_on/used_by 手动字段且跑前无预警；brainstorm/scan/archive/brainstorm-auto 的 prompt 引导 git add .sillyspec/ 或 .sillyspec/changes/ 整目录，会把相邻活跃变更一并 stage 造成跨变更串台
方案：坑1 rebuild 改默认 dry-run 不写盘 + 打印覆盖预警，--force 显式覆盖（index.js 路由解析 --force 传 options + help 更新），archive.js 步骤8 rebuild 提示加 --force 慎用说明；坑2 四处 prompt 的 git add 改精确 pathspec，brainstorm 改 SPEC_ROOT/changes/<change>/、scan 改 DOCS_ROOT+KNOWLEDGE_ROOT、archive 改 changes/archive/ + docs/<project>/modules/
结果：npm test 全量 0 失败、lint 72 文件通过、新增 modules-rebuild-dryrun 测试 6 断言全过、rebuild dry-run/force 两分支实测正确

## ql-20260808-001-fd63 | 2026-08-08 08:13:03 | multi-agent-review P2 批安全子集：P4 铁律正向化 + L14/L15 execute SKILL 清理 + B3 评估登记
状态：已完成
关联变更：（无）
文件：
- src/run/prompt.js（通用铁律 5 条否定式改正向+理由附着：聚焦本步骤/已完成步骤只读/CLI 命令字面为准/落盘即 --done/改名用 change-rename；保留文档优先+文档头+构建前读 local 三条已正向）
- docs/prompt/README.md（铁律镜像逐字同步 prompt.js + 修正过期行号引用 L552-560→约 L540-548）
- .claude/skills/sillyspec-execute/SKILL.md（L14 删 reviewType 的 propose 残留对照 brainstorm/plan/propose→brainstorm/plan；L15 把「不要自行检查 git 状态」限定为 worktree 创建/进入不依赖 git 状态、apply 步以命令输出为准）
- docs/sillyspec/multi-agent-review-2026-08-08.md（新增「处置状态」表：#15 P4/#21 L14/#22 L15 已修，#16 B3 评估后保留⊘，#18-20 L1/L4/L8 并发让出，#17 P5 完整流程）
需求：修复 multi-agent-review P2 批次话术正向化与一致性低危项的安全子集（P4 铁律正向化、L14 删 propose、L15 限定 git 话术、B3 评估登记）
根因：通用铁律 8 条全反向禁止无理由附着，弱模型对否定指令遵从度系统性偏低；execute SKILL 残留已删除的 propose 对照，且「不要自行检查 git 状态」在 apply 阶段过度绝对
方案：prompt.js 5 条否定式铁律改正向+理由并同步 README 镜像；execute SKILL 删 propose、限定 git 话术；B3 评估后保留登记；L1/L4/L8 并发撞 stage.js/shared.js/complete.js 让出
结果：output-step-render 44/0、lint 72 文件通过；全量仅 spec-dir 1 失败属并发 P0/P1 Q3 fail-loud WIP 回归非本次引入；审计 --force-baseline/--allow-new 解锁（他人 Q5 改 DANGEROUS_PATTERNS 为 src/run 前缀致 prompt.js 误判危险+他人新测试误判新增），CLI 文件清单含他人 9 个并发脏文件属归属噪音，实际 commit 用精确 pathspec 仅落上述 4 文件

## ql-20260808-002-a2ff | 2026-08-08 08:15:58 | 修审查 P1 批 #8(P3) 对外 SKILL 泄露内部占位符 + #9(P2) auto SKILL 门控描述与实际机制不符
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-brainstorm/SKILL.md（#8 P3：删 {REVIEW_JSON_CONTRACT} 占位符字面，改述「运行时注入 schema 表+JSON 示例+docHash 算法，以注入版契约为权威」）
- .claude/skills/sillyspec-plan/SKILL.md（#8 P3：同上，删占位符改述运行时注入行为）
- .claude/skills/sillyspec-auto/SKILL.md（#9 P2：「阶段审核门控」段整段重写为 Stage Review Gate，删「简单/中等/复杂→0/1/2-3 子代理」启发式表，对齐真实 tier=self/independent + AC checklist 注入机制）
需求：修审查 P1 批 #8(P3) 对外 SKILL 泄露内部占位符 + #9(P2) auto SKILL 门控描述与实际机制不符
根因：#8 {REVIEW_JSON_CONTRACT} 是 prompt.js 内部占位符、运行时已替换，写进对外 SKILL 违反外部纯净性，弱模型可能误以为要在产出里写这串字面；#9 auto SKILL 教弱模型「复杂度→审核子代理数」启发式，与实际 brainstorm-auto.js 的 AC checklist + tier=self/independent 机制完全脱节
方案：#8 brainstorm/plan SKILL 删占位符字面，改述为「运行时 CLI 会把精确 schema 表+完整 JSON 示例+docHash 算法注入到该步 prompt，以实际收到的注入版契约为权威逐字模板」；#9 auto SKILL 整段重写「阶段审核门控」为 Stage Review Gate（tier=self 当前 agent 自审 / tier=independent 派独立 QA 子代理，AC checklist 由 CLI 注入、以注入版为准），删「简单/中等/复杂→0/1/2-3 子代理」表
结果：brainstorm/plan/auto 三个 SKILL.md 改完、占位符已清零；execute SKILL 两处（line109/113）因并发 agent 占用暂缓避 lost-update；纯文档无逻辑变更，lint 不扫 .claude/skills 故未跑

## ql-20260808-003-76e0 | 2026-08-08 11:23:45 | review P1 收尾 #8(P3) execute SKILL 删剩 2 处占位符 + #13(Q7) quick --done 不带 --change 时…
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-execute/SKILL.md（#8 P3：删 line109/113 剩 2 处 {REVIEW_JSON_CONTRACT} 占位符，改述运行时注入 schema 表+JSON 示例+docHash 算法行为）
- src/run/command.js（#13 Q7：加 quickFallbackUsed 标记 + 守卫置于 rule 655 前——fallback 命中 completed/无可推进会话则 exit 2 拒绝、文案提示并发污染+要求显式 --change）
- test/quick-done-fallback-guard.test.mjs（新建：Q7 守卫 8 断言回归，正向 fallback→completed→exit2 + 负向 fallback→pending→不拦截）
需求：review P1 收尾 #8(P3) execute SKILL 删剩 2 处占位符 + #13(Q7) quick --done 不带 --change 时 fallback 读 current-quick-run-id 命中他者/已完成会话的并发污染守卫
根因：#8 execute SKILL 仍泄露内部占位符 {REVIEW_JSON_CONTRACT}（与 brainstorm/plan 同病，运行时已替换、对外 SKILL 提它违反纯净性）；#13 current-quick-run-id 单文件 last-writer-wins，并发两 quick 会话 B 后启动覆盖 A 的 id，A 的 --done 不带 --change 会 fallback 读到他者/已完成的 sessionId 误操作 progress/QUICKLOG
方案：#8 execute SKILL 两处删占位符改述运行时注入行为（brainstorm/plan/execute 3 SKILL 占位符全清零）；#13 command.js 加 quickFallbackUsed 标记（仅 fallback 路径置位）+ 守卫置于 rule 655 前——fallback 命中会话若 status=completed 或无 pending/waiting/in-progress 步则 exit 2 拒绝、文案提示并发污染+要求显式 --change，替代 rule 655 在此场景误推 --reopen
结果：新增 test/quick-done-fallback-guard.test.mjs 8 断言全过（正向 fallback→completed→exit2、负向 fallback→pending→不拦截 step1 正常完成）；quick-cli-managed-e2e 15/15（显式 --change 流不被守卫误伤）、quick-session-isolation 23/23、lint 72 文件 exit0、node --check command.js OK

## ql-20260808-004-d72d | 2026-08-08 12:31:00 | review P1 收尾 #14(B2) brainstorm-auto AC checklist 补业务维度 + #10(Q6) quick 末步 --don…
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm-auto.js（#14 B2：AC checklist 补 AC-011「业务规则/产品范围/默认行为/用户可见行为」+ line6/100 引用 AC-001~AC-011 + line119 影响列表加「/业务」）
- src/run/complete-handlers.js（#10 Q6：handleQuickStageCompletion 加 isLastStep 守卫，末步 --done 缺 --output 则回退 pending+exit1+提示）
- docs/prompt/brainstorm-auto.md（#14 B2：AC 段镜像同步——AC-011 + 引用 + 影响列表）
- docs/prompt/_extracted.json（#14 B2：跑 _extract.mjs 刷新 brainstorm-auto 步）
- test/quick-laststep-output-required.test.mjs（新建：#10 Q6 守卫 4 断言，缺 --output→exit1 + 末步回退 pending）
需求：review P1 收尾 #14(B2) brainstorm-auto AC checklist 补业务维度 + #10(Q6) quick 末步 --done 强制带 --output
根因：#14 技术 checklist（AC-001~010）全✅ 仍含业务取舍会被 AUTO_DECIDED 吞掉（边界画错，低技术风险≠无需用户决策）；#10 末步 --done 缺 --output 时原 if(outputText) 跳过校验 + completeQuicklogEntry 用 outputText||'' 兜底，致结果块为空却翻已完成
方案：#14 补 AC-011「不涉及业务规则/产品范围/默认行为/用户可见行为变更」+ line6/100 引用 + line119 影响列表加「/业务」+ brainstorm-auto.md 镜像 + _extracted.json；#10 complete-handlers.js 加 isLastStep 守卫缺 --output 则回退 pending+exit1
结果：Q6 新测试 4/4（缺--output→exit1+回退pending）、quick-cli-managed-e2e 15/15（--output 正常流不误伤）、agent2 B1 测试通过（AC-011 未破坏 conditionalWait）、prompt-placeholders 11/11、lint 72 文件 exit0；agent2 已 commit P0 清场，文件无 entangle，正常编辑无需 isolation
