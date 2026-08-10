
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

## ql-20260808-005-b3ff | 2026-08-08 17:26:00 | 四维审查 3 处低风险缺陷：CLAUDE.md 幽灵命令 resume + worktree-guard Win 分隔符绕过 + migrate EISDIR
状态：已完成
关联变更：（无）
文件：
- CLAUDE.md（规则9 删幽灵命令 sillyspec resume、纠正 status 误述为存进度，改为进度由 --done 自动落盘 + 恢复用 progress show 查看、run stage 续跑）
- .claude/CLAUDE.md（同上镜像；两份 CLAUDE.md 并存且 init 会复制给所有用户项目，同步改）
- src/hooks/worktree-guard.js（shouldBlockWrite 第697行 relTarget 改 split(path.sep).join() 归一正斜杠、前缀比对 f + path.sep 改显式斜杠，修 Windows 下 path.relative 产反斜杠与 baseline 正斜杠不匹配致 quick 实时防护被静默绕过；src/hooks 在 DANGEROUS_PATTERNS，--done 审计 --force-baseline 显式解锁）
- src/migrate.js（import 补 statSync 与 cpSync；archive 段按 statSync(src).isDirectory() 分发——目录 cpSync recursive、文件 copyFileSync，外层 try/catch 单条失败不中断整体迁移，修对归档变更目录 copyFileSync 抛 EISDIR）
- .sillyspec/docs/sillyspec/modules/hooks.md（变更索引表追加 ql-005 行：worktree-guard 路径归一修 Win 防护绕过）
- .sillyspec/docs/sillyspec/modules/migration.md（关键逻辑 copyFileSync 描述更新为按目录或文件类型分发）
需求：修四维代码审查（逻辑/健壮/性能/驾驭）发现的三处低风险缺陷（驾驭 F1 CLAUDE.md 幽灵命令 + 健壮 P2-1 worktree-guard Windows 分隔符 + 健壮 P2-2 migrate EISDIR），均低风险、范围明确、不涉核心流程，走 quick
根因：① CLAUDE.md 规则9 引用幽灵命令 sillyspec resume（实测 unknown command）并误述 status 为存进度 ② worktree-guard baseline 比对在 Windows 产反斜杠与 baseline 正斜杠不匹配致 quick 实时防护被绕过 ③ migrate archive 段 copyFileSync 对归档变更目录抛 EISDIR 中断迁移
方案：① CLAUDE.md 两份规则9 改为准确表述，进度由 --done 自动落盘、恢复用 progress show 查看再 run stage 续跑 ② worktree-guard 把比对路径归一为正斜杠、分隔符改显式斜杠 ③ migrate import 补 statSync 与 cpSync，archive 段按目录或文件类型分发（目录 cpSync 递归）加 try/catch
结果：5 处源码或文档 Edit 落盘（含 2 个模块文档同步）；node --check worktree-guard/migrate 通过；lint 73 文件 exit0；npm test 全量 exit0 无失败文件无回归；--done 边界审计 src/hooks/worktree-guard.js 命中 DANGEROUS_PATTERNS，git diff --cached 确认系本次修复非并发误判，--force-baseline 显式解锁

## ql-20260808-006-43c6 | 2026-08-08 17:42:47 | 登记四维审查待决策项到 review-2026-08-08.md（P0 DB 并发写 + _write 重 + F2 status 语义 + F3 exit 127）
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/review-2026-08-08.md（新建：四维审查待决策项登记文档，5 节——已修 A 组一览 ql-005、待决策项 P0 DB 并发写 + _write 重 + F2 status 语义 + F3 exit 127、B 组 quick 候选 6 项、全维度发现索引、后续建议）
- .sillyspec/quicklog/QUICKLOG-qinyi.md（ql-20260808-006-43c6 条目，本次登记的 quicklog 记录）
需求：把四维审查的待决策项登记到 docs 供后续完整流程决策
根因：本次 4 子代理排查产出大量发现，A 组 3 处已 quick 修复，剩余 P0 与架构级与 F2 等不适合裸 quick，需有据可查的登记文档承接避免散落会话丢失
方案：新建 docs/sillyspec/review-2026-08-08.md 分五节登记——已修 A 组一览、待决策项（P0 DB 并发写、_write 重、F2 status 语义、F3 exit 127）、B 组可走 quick 候选 6 项、全维度发现索引、后续建议
结果：文档落盘约 70 行头部 author 与 created_at 齐全；纯文档无逻辑变更故未跑 lint 与 test；--done 边界审计新增文件 --allow-new 解锁；待 commit

## ql-20260808-007-1930 | 2026-08-08 18:13:46 | P0 DB 并发写兜底：db.js _atomicWriteSync tmp 名加 process.pid（对齐 fs-atomic.js，仅防 tmp 碰撞非治本）
状态：已完成
关联变更：（无）
文件：
- src/db.js（_atomicWriteSync 第107行 tmp 名从固定 sillyspec.db.tmp 改为 .basename.pid.tmp，对齐 fs-atomic.js writeAtomicSync 的同名模式；附 3 行注释说明仅防多进程 tmp 碰撞、DB 整体 last-writer-wins 进度丢失仍存、治本待套 withFileLock 或换引擎）
- .sillyspec/quicklog/QUICKLOG-qinyi.md（ql-20260808-007-1930 条目，本次兜底的 quicklog 记录）
需求：P0 DB 并发写兜底，消除多 agent 并发 --done 时 tmp 碰撞
根因：db.js _atomicWriteSync tmp 名固定 sillyspec.db.tmp 无 PID，两进程并发 _save 时 tmp 互覆盖（一进程把他者 tmp 当自己内容落盘的静默错存、或 rename 撞 ENOENT 崩）
方案：tmp 名改 .basename.pid.tmp 对齐 fs-atomic.js writeAtomicSync，附注释说明仅防 tmp 碰撞、last-writer-wins 仍存、治本待完整流程
结果：db.js 单行改加 PID 加注释说明兜底边界，node --check 通过，lint 73 文件 exit0，npm test 全量 exit0 无回归，db.js 在 DANGEROUS_PATTERNS 故 --force-baseline 解锁，治本套锁或换引擎仍登记 review-2026-08-08.md 待完整流程

## ql-20260808-008-6db2 | 2026-08-08 18:28:24 | B 组 P1-1 启动税优化：getVersion 抽 version.js + cmdInit/detectLocalYaml 动态 import（--version 140→91ms）
状态：已完成
关联变更：（无）
文件：
- src/version.js（新建：getVersion 抽出为轻量模块，只依赖 fs/path/url 读 package.json，供 index.js 静态 import 不拖 inquirer）
- src/index.js（顶部 import getVersion 改从 version.js；cmdInit 改 await import init.js 对齐 setup.js 模式；detectLocalYaml 改 await import local-detect.js 仅 local detect 子命令用——消除每次 CLI 进程加载 init.js 的 inquirer prompts 145ms + local-detect 78ms）
- src/init.js（删 getVersion 定义改 import version.js；加 export { getVersion } re-export 保持 API 兼容，让 init-claude-injection 测试仍从 init.js import 不破坏）
- .sillyspec/quicklog/QUICKLOG-qinyi.md（ql-20260808-008-6db2 条目）
需求：B 组 P1-1 启动税优化，省每次 CLI 调用加载 init.js 的 inquirer 重型交互库开销
根因：index.js 顶部静态 import init.js 仅为 getVersion 7 行函数，却每次 CLI 进程都加载 init.js 的 inquirer prompts 加 chalk 加 progress.js 实测 import init.js 单独 145ms，detectLocalYaml 静态 import 同理 78ms 仅 local detect 用
方案：新建 version.js 抽 getVersion 只依赖 fs 加 path 加 url，index.js 从 version.js 取 getVersion、cmdInit 改动态 import init.js 对齐 setup.js 模式、detectLocalYaml 改动态 import，init.js 删 getVersion 定义改 import 加 re-export 保持 API 兼容
结果：--version 实测 91ms（改前 140ms 省 49ms/次，全命令受益）；node --check 三文件通过；lint 74 文件 exit0；npm test 全量 exit0 无回归；重构致 init-claude-injection.test.mjs 从 init.js import getVersion 报错，加 re-export 后该测试 27 断言全过；version.js 新增故 --allow-new 解锁；模块文档同步跳过（启动 import 优化为内部性能改动）

## ql-20260809-001-4846 | 2026-08-09 06:34:03 | progress.js alignExecuteToPlan 去 async 残留同步化（修 doctor align r.ok 逻辑 bug）+ 清 src/ 5 处 gate-status 注释
状态：已完成
关联变更：2026-08-08-progress-db-concurrency（已归档；本条收尾其独立 review 遗留项）
文件：
- src/progress.js（alignExecuteToPlan 去 async 残留彻底同步化：730 去 async + 735/808 去 2 处冗余 await + JSDoc @returns 去 Promise 包装；修复调用方 index.js:532 未 await 致 r.ok 恒 undefined 的逻辑 bug）
- src/fs-atomic.js（writeAtomicSync JSDoc 例子 gate-status.json → local.yaml，保留 tmp 名含 pid 的实例信息量）
- src/machine-interface.js（2 处只读语义边界注释去「/ gate-status.json」：模块顶部设计原则 :10 + deriveFact JSDoc :324）
- src/run/gates.js（completeStageGates execute 并发预检注释 :552 去「gate-status.json /」）
- src/index.js（runtime list 的 D2 注释 :1413 枚举去 gate-status）
需求：收尾 2026-08-08-progress-db-concurrency（sql.js→better-sqlite3 + 废 gate-status 双源）独立 review 指出的装饰性问题——progress.js 两处「死 await」+ src/ 5 处 gate-status 注释残留。
根因：子代理只读分析修正了审查表述——read(240)/_write(385) 迁移后已同步化（非 async），两处 await 非 Promise 是恒等 unwrap，且 :735 返回值实际被下游消费（非「未使用」），故两处均非删整行而是去 await 留调用；更深一层，函数 730 行仍带 async 致总返回 Promise，而调用方 index.js:532 未 await，r.ok/r.reason 恒 undefined，doctor align 分支无论成败都走 else 误打印「已对齐」、--json 打印 {}——只去 await 留 async 毫无意义，须连 async 一起去才彻底同步化（规则11 修逻辑，从装饰性升级为逻辑修复）。5 处 gate-status 注释是把已废除的 gate-status.json 当活目标举例的旧引用残留（task-10 废除变更说明注释另 4 处合理保留）。
方案：委派 2 只读子代理并行（progress.js 死 await 安全论证 / 5 处注释定位 + 全仓 gate-status·sql.js 残留扫描），主代理统一 Edit 避免并行写撞 quick 全量 git status audit；progress.js 4 处（async+2 await+JSDoc）+ 5 处注释共 5 文件 9 处；runtime.md 变更索引追加 ql-ID 记 align 同步化核心修复（machine-interface/cli-entry/worktree 仅注释清理无行为变化不堆砌冗余条目）。
结果：npm run lint 74 文件通过；npm test 全量 143 通过 0 失败（去 async 改变 index.js:532 调用方行为、r.ok 从恒 undefined 变真实值，无回归）；src/ gate-status 仅剩 4 处 task-10 废除变更说明注释（progress.js:10 + worktree-guard×3）；progress.js/run/gates.js 属核心 DANGEROUS_PATTERNS 守卫拦截，--force-baseline 经 lint+test 实证合法解锁；QUICKLOG 本条手动精修。

## ql-20260809-002-38ea | 2026-08-09 06:54:54 | 本地版本号 3.25.9→3.25.10 区分 link 开发版（sillyspec --version 辨识本地 vs 发布）
状态：已完成
关联变更：（无）
文件：
- package.json（version 3.25.9→3.25.10；npm version patch --no-git-tag-version 写入）
- package-lock.json（version 字段同步 3.25.10；npm version 自动连带）
需求：全局 sillyspec 已 npm link 到本地仓库 main（ba13079，未发布），但 sillyspec --version 显示 3.25.9 与 npm 发布版同号，测试时无法区分当前跑的是本地开发版还是发布版，需升版本号辨识。
根因：仓库 package.json version 长期保持与 npm 发布版同步（3.25.9），link 后 --version 仍读该号，缺开发版标识。version 来源 src/version.js getVersion() 读 package.json（P1-1 启动税优化 fcc8c36 抽出），故改 package.json 即生效，无需改 version.js。
方案：npm version patch --no-git-tag-version（避免 npm 默认自动 git commit/tag 污染历史），3.25.9→3.25.10；package-lock.json 由 npm version 自动同步；src/version.js 无需改（动态读 package.json）；link 链路 sillyspec --version 立即反映。
结果：sillyspec --version=3.25.10 实证通过（link 链路 getVersion 读 package.json 立即生效）；2 文件改动（package.json/package-lock.json version 元数据，未触 src/test 不影响逻辑，跳过 lint/test 全量）；不命中运行时模块无需同步模块文档；package.json/package-lock.json 属核心配置 DANGEROUS_PATTERNS 守卫拦截，--force-baseline 经 --version 实证合法解锁；QUICKLOG 本条手动精修。

## ql-20260809-003-c88a | 2026-08-09 08:03:29 | 修复审查 #5 command.js next-action 读路径与 #6 progress.js allStages 常量化两处 bug
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（#5：第1115行 next-action.json 读路径由 brainstorm/ 子目录改为变更根目录，对齐 self-audit#3 的产物位置，还回 has_blocking_questions 门控）
- src/progress.js（#6：第563行 initChange 删 allStages 硬编码副本，改用顶部已 import 的 VALID_STAGES 单一源，避免新增 stage 漏建行）
- .sillyspec/docs/sillyspec/modules/core-engine.md（模块文档同步：VALID_STAGES「9个含propose」误述修正为8个无propose、两处 auto 流程去 propose、变更索引追加 ql-20260809-003-c88a）
需求：修复审查 #5 command.js next-action 读路径与 #6 progress.js allStages 常量化两处 bug。
根因：#5 为 self-audit#3 统一 auto 产物到变更根目录时漏改读端致 has_blocking_questions 门控失效；#6 为 initChange 硬编码与已 import 的 VALID_STAGES 重复。
方案：command.js 第1115行读路径由 brainstorm 子目录改为变更根目录；progress.js 第563行删 allStages 改用 VALID_STAGES；顺带修正 core-engine.md propose 阶段残留误述。
结果：npm run lint 通过 74 文件，npm test 全绿 143 通过 0 失败；quick 变更边界审计因两文件命中 DANGEROUS_PATTERNS（src/run/ 前缀与 progress barrel 本体）需 --force-baseline 显式确认解锁（git status 确认无他人夹带，非并发误判）。

## ql-20260809-004-cf65 | 2026-08-09 08:12:58 | 补 #9 assertSafeChangeName 路径穿越守卫对抗性测试 + #8 禁 console.assert lint 规则
状态：已完成
关联变更：（无）
文件：
- test/assert-safe-change-name.test.mjs（新建 #9：18 用例覆盖 null 不校验/空串/合法名/路径分隔符含 Windows \\../..穿越/非ASCII/命令注入字符各分支，锁定路径穿越硬门行为防重构回归）
- test/check-syntax.mjs（重写 #8：扩展 collect 扫描 src 74 + test 148 共 222 文件做语法检查，新增禁 console.assert 内容规则，BAD='console'+'.assert' 拆字定义避本文件自匹配）
- test/worktree-native-overlay.test.mjs（#8：import node:assert strict + 9 处 console.assert→assert，让该 flaky 测试的失败从静默绿变抛错可见）
需求：补 #9 assertSafeChangeName 路径穿越守卫对抗性测试 + #8 禁 console.assert lint 规则。
根因：#9 路径穿越唯一硬门零测试，重构回归 CI 发现不了；#8 console.assert 失败只打印不抛致 runner 误判静默绿，且原 lint 只扫 src 不扫 test。
方案：新增 assert-safe-change-name 18 用例测试覆盖各分支；重写 check-syntax.mjs 扫 test/ 加禁 console.assert 内容规则（BAD 拆字定义避自指）；worktree-native-overlay 9 处 console.assert 改 node:assert 让 flaky 失败可见。
结果：npm run lint 通过 222 文件（src 74 + test 148），npm test 144 全绿 0 失败。

## ql-20260809-005-491b | 2026-08-09 14:11:29 | brainstorm 规范文件模板内联 frontmatter（治 agent 照抄 H1 漏写 author/created_at）
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（「生成规范文件」step：proposal/requirements/tasks 三模板顶部各内联 author/created_at frontmatter 块；tasks 新增骨架模板插到 decisions 前；末尾注把「规范 md 第一行标题用中文」改为「标题用中文（frontmatter 在标题之前）」且文件列表补 tasks）
- docs/prompt/brainstorm.md（step8「提示词原文」块用正则从 _extracted.json 逐字同步，现含三模板 frontmatter + tasks 骨架 + 修正后末尾注）
- docs/prompt/_extracted.json（node docs/prompt/_extract.mjs 重跑刷新的机械镜像）
- .sillyspec/docs/sillyspec/modules/stages.md（MANUAL_NOTES 追加本 ql 变更索引）
需求：brainstorm 生成规范文件时 proposal.md/requirements.md（tasks.md 骨架同理）缺 author/created_at 元数据，要等 --done 的 validateMetadata 才打印警告，要求生成时即带上、不要事后补救
根因：通用 frontmatter 声明（brainstorm.js 末步「所有规范文件头部必须包含 YAML frontmatter」）与逐文件模板脱节——proposal/requirements 模板顶部直接是 H1 中文标题、tasks 无完整模板，agent 照抄模板就漏写；唯独 design.md 因被「frontmatter 不存在则补 author/created_at/scale」单独点名而未缺；叠加 validateMetadata 只在 --done 跑且仅 advisory console.log 不阻断，故事后才暴露
方案：治本——把 frontmatter 内联进每个可照抄的具体模板，agent 照抄即带。brainstorm.js 三模板顶部各嵌 author/created_at frontmatter 块，tasks 补骨架模板（# 任务清单 + task 示例）插 decisions 前；末尾注第一行标题改为标题（frontmatter 在前）避免误导；重跑 _extract.mjs 刷新 json，再用正则（header→首个 4+反引号围栏→非贪婪→结束围栏）从 json 逐字替换 brainstorm.md 的 step8 块；stages 模块文档 MANUAL_NOTES 追加变更索引。brainstorm-auto 仅为列表式描述无完整模板，不在本次范围
结果：npm test EXIT=0（全套件统计均失败0，含 worktree/CLI 等历史 flaky 套件本次全过）；npm run lint 通过 224 文件；改动 4 文件已 git add 暂存（显式 pathspec 隔离），他人 brainstorm 变更目录 2026-08-09-complete-gate-atomicity 未夹带（审计 advisory 确认）。可选后续增强：把 frontmatter 缺失从 --done 的 advisory 提升为「生成规范文件」step 的 postcheck 硬阻断（本次未做）

## ql-20260810-001-fba5 | 2026-08-10 08:35:43 | 修 review-2026-08-09 #7
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（三处 appendFileSync 包 try/catch+console.warn best-effort：:273 completeStep / :355 noAI末步 / :706 continueStep；:696 顺手修既有 1 空格缩进→2）
需求：修 review-2026-08-09 #7，complete.js 三处 appendFileSync 裸跑 EPERM 致卡死。
根因：:272/:349/:696 三处 appendFileSync 在 pm._write+triggerSync 后无 try/catch，Windows AV/索引 EPERM 冒顶（与 #2 叠加）。
方案：对齐 shared.js:330 triggerSync best-effort，三处包 try/catch+console.warn，历史日志写失败不阻断主流程。
结果：src/run/complete.js 三处 wrap（:273/355/706 在 try 内+3 处 warn）；npm test 148/0 零回归；npm run lint 227 文件绿；commit 10fba18（pathspec 隔离他者 src/ + test/）。EPERM 不再冒顶卡死，历史日志写失败降级 warn 不阻断主流程。

## ql-20260810-002-7b3a | 2026-08-10 08:56:44 | verify baseline checkpoint diff base 用 baselineCommit（治误测无关模块阻断归档）
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（resolveVerifyChangedFiles：diff base 由 meta.baseHash 改为 meta?.baselineCommit || meta?.actualBaseHash || meta?.baseHash，与 task-review.js:694 / worktree.js:1108 / worktree-apply.js:169 同源；补注释说明 baseline checkpoint 修复防回归）
- test/verify-postcheck-worktree.test.mjs（新增用例 5：baseline checkpoint fixture——meta 含 baseHash+baselineCommit+actualBaseHash，daemon/frontend overlay + ppm 真实改动，期望只返回 ppm；旧 baseHash..HEAD 实现必返回 3 文件，锁死修复）
需求：worktree+baseline checkpoint 模式下 verify 测试对账把 baseline 同步的跨模块 overlay 文件误算进 verify diff，命中无关模块（PPM-only 变更误测 daemon/frontend/llm_provider/sillyhub-daemon），daemon 大套件撞 SILLYSPEC_TEST_TIMEOUT_MS 10min，verify 永远过不去、无法归档。
根因：resolveVerifyChangedFiles 用 meta.baseHash（=baseline checkpoint 父提交，pre-baseline 分支点）做 git diff base，diff 含 baseline checkpoint 那笔（52 个跨模块 overlay 文件）+ 本 change 改动；同源 task-review.js:694 早用 baselineCommit||baseHash，唯独 verify-postcheck 漏。
方案：diff base 改 baselineCommit || actualBaseHash || baseHash（对齐 task-review/worktree/worktree-apply 四处同源）；补用例 5 回归锁死（baselineCommit 是 baseHash 之后的 commit、含 overlay，用它做 base 排除 overlay）。审查 stage-contract.js:613 checkExecuteCodeEvidence 同读裸 baseHash，但语义不同（只判 changed/unchanged/unknown 存在性、不挑模块不跑测试，overlay 算进来结论仍 changed 无危害）→ 不同病不改。
结果：verify-postcheck-worktree 5/5 绿（新用例 5 锁死）；npm test 全量 EXIT=0；npm run lint 227 文件绿；commit adf69d3（git commit -F - -- <pathspec> 隔离，未夹带并行 session 的 complete.js 10fba18 / brainstorm.js / QUICKLOG / prompt / debt.md）。issue 文件 verify-worktree-baseline-basehash-wrong-module-detect.md 改 status=done + 移 multi-agent-platform finished/。

## ql-20260810-003-866c | 2026-08-10 15:46:18 | execute run marker 漂移致 enforceReviewJsonGate 误报——正确修法（无视 marker 扫含 tasks/ 真实 run）
状态：已完成
关联变更：2026-08-10-enforce-review-gate-fallback
文件：
- src/task-review.js（新增 resolveLatestExecuteRunIdWithTasks：无视 marker，扫 execute-runs/ 取 mtime 最新且真正含 tasks/ 子目录的 runId；全无则 null）
- src/run/gates.js（enforceReviewJsonGate 集成兜底：读 marker 后若其 run 缺 tasks/ → 用上述 helper 重定位再校验，并打「marker 漂移」warn；无候选则维持原 marker 校验）
- test/execute-run-marker-drift.test.mjs（新增 9 用例：helper 空/跳过无 tasks/ 目录/多候选选合法 + 端到端「漂移 marker 不误报、真缺 review 仍阻断」）
需求：enforceReviewJsonGate（gates.js，每次 execute --done 早跑）在 execute run marker 漂移（marker 指向无 tasks/ 的新 run、真实齐备的 review.json 在旧 run）时误报「review.json 不存在」，阻断 --done。
根因：generateExecuteRunId 只写 marker 字符串、run 目录由 ensureTaskReviewDir 在写 review.json 时才建，marker 漂到新空 run 后旧 run 的 review 全部失联；enforceReviewJsonGate 直接 readFileSync(marker) 拿值就用、不校验目录不兜底。defer 债（prompt-control-debt gate-atom-a）提的方案 A「fallback resolveLatestExecuteRunId 对齐 gates.js:333-343」不成立——该函数见 marker 非空即原样返回（不校验目录），而 :333-343 只在 marker 为空时才 fallback，恰都接不住「marker 非空指向坏目录」这一漂移场景。
方案：新增 resolveLatestExecuteRunIdWithTasks，无视 marker、只认 execute-runs/ 下真实含 tasks/ 的最新目录；enforceReviewJsonGate 在 marker 指向的 run 缺 tasks/ 时用它重定位到真实 run 再校验；全部 run 都无 tasks/（真没写 review）返回 null，gate 维持原 marker 校验、不误放行。
结果：npm test 全量 151 绿（含新增 9 用例 execute-run-marker-drift）+ lint 230 文件绿；marker 漂移场景不再误报、真缺 review 仍阻断。模块文档：gates.js/task-review.js 未被任何模块卡收录（module-map schema v1 无 paths、收录不全），无归属命中故跳过同步。注：defer 债条目已按其原 defer 前提（complete-gate-atomicity 已归档 + 主仓干净）落地，但实现用的是「无视 marker 扫描」而非债条原文的「resolveLatestExecuteRunId fallback」，债务描述与正确修法有出入。
