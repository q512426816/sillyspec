---
author: qinyi
created_at: 2026-09-21 01:06:55
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-21-flow-command-cards

<!-- 引用规范：全文源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## 背景

R4 对照实验（round4/result-S.md）实证 agent 上手税：OpenSpec init 生成的 opsx 命令卡让 agent 1.5 分钟零试错上手；sillyspec 侧同任务撞 worktree 守卫 3 次、四参数 --done 与 SESSION_ID 导出靠错误信息补课。sillyspec 每步指令已由 CLI 实时渲染，缺的是 bootstrap 层静态载体（命令面/参数形态/坑清单）。

## 设计目标

①新会话 agent 读卡即得七流程启动命令与坑清单，零试错；②卡与 CLI 同版本发布、init 幂等更新，不腐烂；③zcode/claude 双落点按需加载，不膨胀常驻 context。

## 非目标

doctor/explore/scan/progress 卡；codex 等 5 工具落点；卡镜像步骤提示；发布期卡内容活文档锚（proposal 非目标清单同款）。

## 拆分判断

单能力单组件（资产+注入器+init 接线+测试），无需拆分。

## 总体方案

单一 Phase 两 Wave：
- Wave 1（串行）：assets/command-cards/ 七卡 + src/command-cards.js 注入器 + test/command-cards.test.mjs——注入器为卡的可执行契约，同 Wave 收口。
- Wave 2：src/init.js 接线（VALID_TOOLS 增 zcode、injectCommandCards 调用点、toolChoices 文案）+ platform-interface-map.md 活文档锚补 init 新导出面。

数据流：`injectCommandCards(projectDir, { tools, force })` → `new URL('../assets/command-cards/', import.meta.url)` 枚举包内 *.md → 对 tools 逐个映射落点（zcode → .zcode/commands/sillyspec/、claude → .claude/commands/sillyspec/）→ 三态写盘（Grill P1-3 修订：sha 基准=**落盘正文**非包资产——锚行记录写入时正文的 sha，重跑时剥离锚行重算比对，方能检测用户手改正文；「锚行 vs 包资产」字面比对检测不到正文手改，版本更新会静默丢用户改动）：
1. 目标不存在 → 写（正文 + 尾部锚行 `<!-- sillyspec-card: v<pkgVersion> sha256=<落盘正文sha> -->`，sha 为剥离锚行后的正文）
2. 目标存在且锚行在：剥离锚行重算正文 sha == 锚行记录 → **完好**：与包内资产正文一致 → 跳过（mtime 不动）；不一致（CLI 版本更新）→ 覆盖写新+更新锚行
3. 目标存在但锚行缺失（外来同名文件）或重算 sha ≠ 锚行记录（用户手改正文）→ `⚠️` warn 跳过，仅 `--force` 覆盖
判据源唯一：尾部锚行（frontmatter 保持工具原生可解析不承载管理面；requirements FR-02 同步统一）。
返回 `{ written, updated, skipped, warnings[] }` 供 init 汇总输出。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/command-cards.js | 注入器（读包内资产→三态幂等写盘；导出 COMMAND_CARD_TARGETS/NAMES/injectCommandCards） |
| 新增 | NEW:test/command-cards.test.mjs | 注入/幂等/手改跳过/force/资产齐全/双落点断言 |
| 新增 | NEW:assets/command-cards/run-brainstorm.md | 卡资产（四段契约；下同） |
| 新增 | NEW:assets/command-cards/run-plan.md | 卡资产 |
| 新增 | NEW:assets/command-cards/run-execute.md | 卡资产 |
| 新增 | NEW:assets/command-cards/run-verify.md | 卡资产 |
| 新增 | NEW:assets/command-cards/run-archive.md | 卡资产 |
| 新增 | NEW:assets/command-cards/run-quick.md | 卡资产 |
| 新增 | NEW:assets/command-cards/status.md | 卡资产 |
| 修改 | src/init.js | VALID_TOOLS 增 zcode、**AGENTS.md 注入条件扩展（init.js:447 `claude\|\|codex` → 增 zcode，FR-05 承诺 zcode 亦获 AGENTS.md，Grill P1-1）**、injectCommandCards 接线（挂点 L449 后、noSkills return 之前）、toolChoices 文案 |
| 修改 | src/index.js | --force-cards flag 解析与 cmdInit 透传（execute 审查 gap 2b 收口：warn 文案的 force 承诺 CLI 可达） |
| 修改 | .npmignore | 注释锚「不要忽略 assets/」（同 .claude/skills/ 先例）——现状黑名单模式且未排 assets/，天然进包；**不新增 package.json files**（翻转白名单效应：bin/src/templates 漏列即包残废，Grill P1-2） |
| 修改 | docs/sillyspec/platform-interface-map.md | 活文档锚补 init.js 新导出面（injectCommandCards） |

（路径存在性铁律注：NEW: 前缀=计划新建，已有文件写仓根相对路径。）

## 接口定义

```js
// src/command-cards.js
export const COMMAND_CARD_TARGETS = { zcode: '.zcode/commands/sillyspec', claude: '.claude/commands/sillyspec' }
export const COMMAND_CARD_NAMES = ['run-brainstorm','run-plan','run-execute','run-verify','run-archive','run-quick','status']
export function injectCommandCards(projectDir, { tools = [], force = false, version } = {})
// → Promise<{ written: string[], updated: string[], skipped: string[], warnings: string[] }>
// 内部：readCardAssets()（import.meta.url 相对 + readdir + sha256）；三态判据见总体方案。
```
卡资产 frontmatter：`name` / `description`（slash 命令索引面）；CLI 附加锚行：`<!-- sillyspec-card: v<版本> sha256=<落盘正文sha> -->` 置文件尾（sha=剥离锚行后的正文；frontmatter 保持工具原生可解析，管理面只在锚行单点）。

## 生命周期契约表

生命周期契约：不适用（本变更只做 init 时一次性文件注入，无 session/lease/daemon 事件；卡内容含「生命周期速查」是指 CLI 命令用法文档，非 lifecycle 契约）。

## 数据模型

无 schema 变更（纯文件产物 + init 进程内调用）。

## 兼容策略（brownfield 必填）

存量项目：不重跑 init 则零变化；重跑 init（不带 zcode/claude tools）行为同旧版。已存在的手写同名卡（无锚行）→ warn 跳过不覆盖（三态之 3），升级路径=删旧卡重跑 init 或 --force。AGENTS.md 注入机制零改动（仅扩展 tools 条件面）。
**noSkills/platformMode 定界（Grill P2-4）**：命令卡注入与 skills 复制同门——`--no-skills` / platformMode 场景跳过卡注入（工具目录零污染语义优先，平台工作区不落 .zcode/.claude）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | .npmignore 未来误排 assets/ → npm 包缺资产（init 白屏） | P1 | 黑名单模式维持（现状未排 assets/，天然进包）；.npmignore 加「不要忽略 assets/」注释锚（同 .claude/skills 先例）；发版跑 `npm pack --dry-run | grep assets/command-cards` 断言；test 断言 readdir 资产非空（本地 checkout 防线） |
| R-02 | 用户已 gitignore .zcode/.claude → 卡写入后不进版本库（团队其他成员拿不到） | P2 | 注入后 advisory 提示检测目标目录是否被 ignore（git check-ignore），提示不阻断 |
| R-03 | 卡内容与 CLI 命令演进漂移（参数改名/新增坑未进卡） | P2 | sha 锚+init 重跑覆盖（升级自动更新）；卡更新走正常 PR review |
| R-04 | Windows CRLF/路径差异 | P2 | join() 拼路径、writeAtomicSync LF 落盘（仓规 13） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
（design-init 在 decisions.md 填充前解析，预填空——人工补全覆盖矩阵，与 requirements.md 决策覆盖矩阵同源。）

- D-001（薄卡定位）→ FR-04 四段契约之边界声明；总体方案「卡内容不进实时渲染面」。
- D-002（包内静态资产）→ FR-01/02 标记机制；接口定义 readCardAssets；R-01/R-03 应对。措辞修正（Grill P2-5）：「零漂移窗口」降级为「同 PR 发布零窗口」——卡文写作期仍可能写错语义（如 954946ae 前后的 --linked-changes 行为差异），收口=task-01 验收条目锚定源码语义。
- D-003（zcode+claude 双落点）→ FR-03/05；COMMAND_CARD_TARGETS 映射表。
- 无未解决决策；剩余风险见 R-01~R-04。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语
- [x] UI 原型分级核对——不涉前端文件（纯 CLI/init 产物），跳过
- 无存疑项
