
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

## ql-20260808-002-a2ff | 2026-08-08 08:15:58 | 修复 multi-agent-review P1 批 #8(P3)+#9(P2)：删 3 个 SKILL 泄露的 {REVIEW_JSON_CONTRACT} 内部占位符；重写 auto SKILL 门控段对齐 AC checklist+t…
状态：进行中
关联变更：（无）
文件：.claude/skills/sillyspec-brainstorm/SKILL.md, .claude/skills/sillyspec-plan/SKILL.md, .claude/skills/sillyspec-execute/SKILL.md, .claude/skills/sillyspec-auto/SKILL.md
