---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — change-management

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-change-management-005@v1 quicklog 标签切段先严格边界扫描再宽松兜底
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
原编号：D-905@v1
锚点：src/quicklog.js:493
最近确认：71a7fe6
理由：quicklog 单行四字段（需求：/根因：/方案：/结果：）切段必须两层——真实标签 = 上一标签之后首次出现且前导是串首/空白/句末标点（。；！？）的字样，正文引用标签字样（前导是「/（ 等弱字符）不构成新边界；严格扫描失败才退回宽松顺序扫描，缺标签返回 null 落单行兜底由 --done 契约校验拦截——残余边界（正文引用且前导恰为空白/句末标点）仍可能错位，改写标签语义时勿简化该两层逻辑。

## D-change-management-001@v1 : quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-004@v1
锚点：未记录
最近确认：3f22d6b
理由：用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。

## D-change-management-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-002@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-change-management-003@v1 归类闭环选型——agent 归类 + 人抽审（非全自动、非拆分）
状态：implemented
变更：2026-09-14-knowledge-loop-close
原编号：D-001@v1
锚点：未记录
最近确认：d8fd9ce
理由：选 agent 归类+人抽审：quick --done 收尾时 CLI 拿刚落盘条目根因字段跑 matchKnowledge 渲染归类提议；新子命令 knowledge classify 一次确认后落位（追加目标知识文件 + 更新 INDEX + 从 uncategorized 删除，均可逆）；人闸从逐条确认后置为 archive/doctor 抽审位；配 knowledge-baseline 棘轮（仿 docs-check-baseline 范式：uncategorized 条数 ≤ 基线放行、降则自动收紧）软警告起步。方案 B（全自动）被否——归类错误无审计面、违背"不信口头"主轴；方案 C（拆分延后）被否——归类与注入共享 matchKnowledge 基础设施，拆开则学习闭环两端各自不完整。

## D-change-management-004@v1 消费端从「建议读」升级为「机械注入 + 遥测」，不做消费硬门禁
状态：implemented
变更：2026-09-14-knowledge-loop-close
原编号：D-002@v1
锚点：未记录
最近确认：d8fd9ce
理由：CLI 在 prompt 组装时用任务描述跑 matchKnowledge，命中文件内容直接注入 prompt（top-3 限额，仿「📦 模块上下文」注入先例）+ 每次命中落 .runtime/knowledge-hits.jsonl（仿既有 decision-hits.json 遥测先例）+ 新子命令 knowledge stats 输出命中矩阵（从未命中的文件列死重清单）。明确不做「必须消费」硬门禁——先遥测后优化，数据说话再决定是否升级门禁。

## D-unmapped-201@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-title-and-agents-slim
原编号：D-001@v1
锚点：未记录
最近确认：263542670c49870b8376c23395b5d1e58f7cd4b9
理由：最大风险：AGENTS.md 瘦身后，无 skill 环境（如 codex 只读 AGENTS.md）的 agent 拿不到 --input 格式——已评估：flow start 清晰度门失败时 CLI 自己打印过门格式（运行时教学兜底），可接受。试过放弃：把标题写进 proposal 骨架 H1（# 提案书 — <中文>）——平台 normalize_display_title 把「类型词—任意后缀」全判模板回退英文 key，H1 通道不可靠，改走 body title 通道（SELECT 补列 + 平台侧收养）。已归档变更判无法回填标题（无后续推送面），留待需要时一次性脚本。

## D-unmapped-339@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-h2-repo-heading-parse
原编号：D-001@v1
锚点：未记录
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363
理由：最大风险：节扫描穿过段头后误延「文件变更清单」节边界——非段头的 ## 章节标题（如「## 接口契约」）仍必须截断。缓解：截断判定=^## 且不匹配 REPO_SECTION_HEADER_RE（精确形态：编号前缀+key+仓变更+括号备注+冒号可缺），普通标题形如「<词> 仓变更」的误写由 plan-postcheck 既有 LOOSE_RE 点名（不在本变更面）；测试钉死「非段头 ## 截断」回归。次风险：h3 段头（### <key> 仓变更）现在有 RE 命中与 detectRepoFromSubsection token 命中两条等价路径——实现上段头分支前置统一处理，### 分支保持原样，两路径不叠加执行。试过放弃的方案：①改四处文案弃段头形态（推荐 ### 子段/cross-repo: 两种）——与生态既定约定（厚道模板/覆盖对账/docs-check 三处解析器）制造第二套约定，agent 在厚薄两道间会拿到互相矛盾的指引；②在 flow.js 收口侧做段头归一化预处理——对账口径分散两处，plan-postcheck/design-facts 不受益。均否。

## D-unmapped-345@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-declared-paren-strip
原编号：D-001@v1
锚点：未记录
最近确认：badabe76c76ed3ab4005d51310ea8fcc122e952f
理由：最大风险：剥括号误伤真含括号的仓库路径（目录/文件名带括号，Windows 偶见）。缓解：只剥 trailing 后缀组（路径中段的括号不动）且需紧邻行尾；此类路径在仓内属病态命名，声明清单书写规范本就要求裸路径。次风险：合并层的等值匹配放过「同前缀不同文件」（a.ts 与 a.ts（x 残片剥后=a.ts 同值——正是要合并的形态；a.ts（x（y 双残片——剥两次需循环；实现循环至稳定）。试过放弃的方案：①只修解析不 加合并层——表格 cell 等其他入口的残片仍会产双行，消费方口径仍脏；②pathMatches 前缀容差合并——前缀匹配会把 a.ts 与 a.tsx 误并，必须精确等值；③存量归档件回填——违背审计冻结原则，读取侧如实呈现历史。均否。

## D-unmapped-415@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-short-change-title
原编号：D-001@v1
锚点：未记录
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e
理由：- 最大风险：截点启发式对无全角标点的长句（英文/长数字串）退化为硬切 30+…，可读性一般——有 --title 显式通道 + hardCut 软提示兜底，且标题是展示元信息非正确性面，接受。 - 放弃方案①：直接改 `deriveChangeTitle` 内部为提炼口径——motiveFromInput 模块变更索引摘要与其同源，会把 ≤50 摘要一并压成 ≤30（motive-from-input.test.mjs:37 锁定 ≤50 口径），爆炸半径失控；改为拆 Raw + 新函数单点切换。 - 放弃方案②：标题超 30 字时阻断启动或升级警告——标题是面板显示元信息，「阻断」违反其定位且会卡协议面；定为一行软提示（不阻断、不改退出码）。 - 放弃方案③：动机回退取整段再摘要——动机段可能多段多句，整段过提炼截点选择易落在次句腰部；定为首行（首句）提取，语义最接近「一句概括」。
