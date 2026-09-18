---
author: qinyi
created_at: 2026-09-18 20:05:00
---
# 成本优化波·基线锚（2026-09-18，批1-0 / ql-20260918-008）

> 度量先于修复：本文件在批 1 任何修复落地**之前**冻结刻度，批后归因以此为准。
> 数据源：`~/.zcode/cli/db/db.sqlite` model_usage 表直核（非转述）+ sillyspec 摩擦账本。
> 三次同题实验（任务② mi-diagnostic-codes）：旧版全仪（9-17）/ OpenSpec（9-17）/ 新版定价引擎重跑（9-18 replay）。

## 基线刻度（2026-09-18 冻结）

| 指标 | 旧版全仪 | OpenSpec | 新版定价（当前基线） | 本波目标（达标线） |
|---|---|---|---|---|
| 主会话请求 | 166 | 79 | **172** | ≤130 |
| 主会话 token | 39.2M | 10.9M | **42.9M** | **≤30M** |
| 评审子代理 token | 22.4M | 0 | 0.9M | 维持 |
| 总 token | 61.6M | 10.9M | **43.8M** | ≤31M |
| 核心耗时 | 65min | 36min | **53min**（剔除实验成本 19min） | **≤45min** |
| 摩擦事件 | 16 | —（无遥测） | 9 | 允许降 |
| 平均单请求上下文 | — | 137k | **249k** | ≤210k（批2 验收项） |

注：token 为 DB 直核窗口值（±1% 窗口噪声）；replay 的 9 次摩擦含 3 次 verify_run_failed（其中缺陷①误报占位——批1-1 修复后纠账）。

## 守恒红线（每批 --done 验收，不是附录）

1. **L1 拦截数不降**：机械门（探针/矩阵/docs-check/代码证据/CLI 亲测）拦截计数不得因降本减少——拦截从出口挪到进口（前置）总数应守恒。
2. **CLI 亲测照跑**：verify noAI 质量扫描的 test+lint 实测不动。
3. **单步 prompt 中位长度不反弹**（批 2 起测）：门禁前置注入不得把上下文因子顶回去。

## 本波非目标（章程）

- **不再触碰已上线的定价面**（ceremony_tier/双跑结算/影子期——7c7a85c+1899f80 已是存量，本波只做浪费削减，批 2/3 不得改判级与仪式映射）。
- 跨会话信用分、归档后硬 reopen：永久非目标（D-006 防复潮）。
- **剩余 ~2× 于 OpenSpec 的差距不再压缩**——那是真跑测试的门、可审计产物链、进度状态的本体，是本工具存在的原因。拆保险需用户明示裁决，任何"顺手再压一点"的提议据此驳回。

## 批次与验收

| 批 | 内容 | 验收 |
|---|---|---|
| 1 | ①本基线 ②quality-scan 模块命中修复（+假 NOTES 纠账）③server.js 词边界（假阳+真阳双回归钉）④wait 继承盖章 | 每项独立 quick；②后 D14/回放账纠正 |
| 2 | 门禁前置（失败清单本步相关+条数帽）+ 注入瘦身（阶段首步全量后续引用）+ 中间测选路 module 默认 | 单步中位长度不反弹；轮次 -15%+ |
| 3 | 产物预填（白名单槽：路径并集/ID 表/requirement_ids；非目标与取舍理由正文禁预填） | 写作轮次 -10%+；预填槽越界=fail |
| 4 | 步骤合并（状态机契约）——仅当批 2/3 后轮次仍 >140 再议 | 另开 brainstorm |

批后对表：同题前后对比（zcode db token + 摩擦账 + 步数），每批归因写回本文件附录。

## 附录 A：批 1-1 纠账记录（quality-scan 模块命中断链，2026-09-18）

回放实验（replay/task2-pricing）的 PASS WITH NOTES 唯一移交项=「native-worktree 模式模块命中 0」——**根因已修（ql-20260918-010）**：
- 根因①：native 收养态不写 worktrees/<change>/meta.json → resolveVerifyChangedFiles 的未提交/已提交两段全跳过，文件集只剩主 fallback 的未提交 CLI 再生文件（回放实测 4 个 .claude/skills/*.md）；
- 根因②：已提交补齐的主锚点在 cwd=worktree 时取自身 HEAD → merge-base 恒自身 → committed diff 恒空。
- 修复后实测同一回放 worktree：文件集 4 → **31**（含 machine-interface.js/diagnostic-codes.js/契约/测试全量）→ machine-interface 模块必命中 → integrationRan 链路恢复。
- **纠账结论**：该次 NOTES 的触发源是工具缺陷而非真实集成缺失；归档结论为终态不改写，本记录即为账面更正依据。同类场景由 §5/§5b 永久回归钉死（platform-dual-root-fixture.test.mjs）。

## 附录 B：批 3 对表（产物预填，2026-09-18-artifact-prefill）

批 3（产物预填：三槽白名单预填引擎+生成器接线+prefill-refresh+注清零门禁梯度）是批 1/2 机制的首个全流程实测变更。过程事实（主仓 git log + runtime 账本直核）：

**消费批 2 机制的实证**：
- 注入瘦身（10a6ee7 ①）：`.sillyspec/.runtime/prompt-inject-2026-09-18-artifact-prefill.json` 在账——brainstorm/plan/execute 三阶段全部走「首步全量注入+后续摘要行」分叉（digest 18b0a06e/0f8f054a/7c3ae27f），全程无全量重注入。
- 门禁前置 {PREFLIGHT_FAILURES}（10a6ee7 ②）：三阶段 --done 一次通过，无「带失败清单进下一步」的重试轮。
- 测选路引导（10a6ee7 ④）本变更**未被采纳为窄面**：task-01~03 卡 verify 均声明全量 npm test + npm run lint（引擎/接线/门禁三面都触全局面，窄面不适用）——守恒红线②CLI 亲测照跑因此全量保真。

**消费批 1/定价面机制的实证**：
- 摩擦账本（ceremony 第三键源，7c7a85c）：`friction-tally-2026-09-18-artifact-prefill.json` 记 3 次 review_rejected（均 stage-review——brainstorm/plan 收尾两次+execute 期一次），无 verify_run_failed。
- 档位文件兜底（1899f80）：本变更无 `ceremony-tier-2026-09-18-artifact-prefill.json`（无升降档事件，纯 blast/span/friction 定价）——兜底通道在场未被触发即为其零成本证据。
- 批 1-1 纠账（e47ab3a）惠及面：本变更在 worktree（`.sillyspec/.runtime/worktrees/`）内推进，native 收养态双根因修复后 verify 文件集不再归零（quality-scan 模块命中不盲）。

**批 3 自身机制的 dogfood 边界（如实记录）**：本变更自身的四任务卡（23:50）与 design.md（23:55）生成于 task-02 接线落地**之前**（plan 阶段产物，execute 23:58 才启动）——ids/决策表行走的仍是旧路径（骨架占位+agent 填写），预填直填的受益面是**后续变更**；本变更对机制的验证走 task-04 的 test/prefill.test.mjs（60 断言七组，含 CLI 层门双态与生成器回归）。三 task 落盘提交 ee1afd0 / ddc3eec / 20acbbb，stage-review 与 execute run 全程走链（review-2026-09-18-234813 / exec-2026-09-18-235859-79836b）。

**对表数据（验收线：写作轮次 -10%+；预填槽越界=fail）**：

| 指标 | 数值 | 备注 |
|---|---|---|
| 主会话请求 | 待填 | 归档后由 zcode db 对表填充（主代理收尾时填真实数字） |
| 主会话 token | 待填 | 同上 |
| 核心耗时 | 待填 | 同上 |
| 写作轮次（design/tasks/taskcard 三产物） | 待填 | 同上；批 3 验收主指标 |
| 预填槽越界计数 | 0 | D-001 白名单红线——全流程无越界记录（违反即 fail，非降级项） |

（占位说明：上表数字归档后由主代理从 `~/.zcode/cli/db/db.sqlite` model_usage 直核填入，与附录 A 同口径；本附录先落过程事实，数字缺位不是豁免。）

