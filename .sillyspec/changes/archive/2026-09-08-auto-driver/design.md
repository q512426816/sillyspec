---
author: qinyi
created_at: 2026-09-08 06:28:44
scale: large
---

# 设计文档（Design）— 2026-09-08-auto-driver

## 背景

auto 模式的阶段链编排（flowStages 推进/classify/ensureAutoStage）已在 CLI（runAutoMode），但 agent 仍背着四件**编排负担**（auto SKILL.md 明文要求）：

1. **requiresUser 靠关键词猜**：skill 指令「prompt 含『请用户选择/等待用户回答/展示给用户/用户确认』→ 暂停」——对 prompt 文本做正则匹配，脆弱且与 step 定义脱钩（定义里 requiresWait/conditionalWait/requiresConfirm 是权威信号）。
2. **--change 跨轮记忆**：「记录 CLI 输出中显示的 Change 名称…每次 --done 都必须携带」——agent 当人肉状态寄存器。
3. **wait 用户输入转抄**：requiresWait 三段式（--wait → 用户答 → agent 把原话塞进 --continue --answer）——agent 是用户语音搬运工，且门只校验非空挡不住伪造。
4. **收尾总结 agent 自撰**：流程全完成时 skill 要求 agent「输出完整流程总结」——全部素材在 CLI 手里。

机器可读元数据的缺失是四件的共同根因：agent 每轮都在从 prose prompt 里反向工程「我在哪、下一步跑什么命令、要不要停」。

## 设计目标

- auto 模式下每步 prompt 尾部输出**机器可读元数据块**（requiresUser/doneCommand/waitHint），消灭关键词猜与命令记忆。
- `run auto` / `run auto --done` **单活跃变更免 --change**；多活跃显式报错（先例语义）。
- TTY 下 `--wait-interactive` **用户输入直通**（CLI readline 收，非 TTY 回三段式）。
- 流程全完成时 **CLI 打印结构化收尾总结**。
- 非 auto 路径（单阶段 run）行为**零变化**。

## 非目标

- 不做 CLI 内调模型的全自动执行（CLI 无模型访问）。
- 不做 SillyHub 外部 driver 重写（平台侧范畴；machine-interface v1 地基已备，另立项）。
- 不改单阶段 run 的 prompt 形态与 wait 门语义（三段式保留为非 TTY/默认路径）。
- 不动 brainstorm-auto 步骤定义本身（元数据块挂在渲染层）。

## 拆分判断

四件互相独立、共享一个渲染挂点（outputStep 的 auto 分支或 runAutoMode 尾部）与一个解析挂点（command.js auto 入口）。8 文件修改 + 1 测试新增 + 1 skill 重写，无批量模式特征，走常规 change。

## 总体方案

### Wave 1：元数据层（FR-01，一切的前提）

`run/prompt.js` outputStep 增 `autoMeta` 参数（runAutoMode 调用时传 `{ changeName, doneCommandBase }`；其他调用方缺省不输出——单阶段 run 零变化）。auto 模式渲染的每步 prompt 末尾追加：

```html
<!--SS-META:{"stage":"brainstorm","stepIndex":2,"stepName":"对话式探索与需求澄清","requiresUser":true,"doneCommand":"sillyspec run auto --done --change 2026-09-08-x --output \"...\"","waitHint":"需要用户输入时先 --wait 展示选项"}-->
```

**双命令消除（Grill P1-③）**：auto 模式（autoMeta 非空）下，prompt 正文「完成后执行」段（prompt.js:1026-1040 的 `run <stage> --done` 模板）与 SS-META 的 doneCommand **同源**——正文段直接改渲染 `run auto --done ...`（同一字符串两处引用），消灭「同一尾部两份逐字命令」歧义。

requiresUser 计算（Grill P1-①修订）：`step.requiresWait === true || step.conditionalWait === true || step.requiresConfirm === true || WAIT_MARKER_RE.test(prompt)`——四源前三来自 step 定义（wait-gates/契约引擎既有），第四源复用 prompt.js:1019 已消费的 WAIT_MARKER_RE（shared.js:29，捕获 prompt 正文显式 wait 类指令——execute/verify 的 step 定义无三键，纯三源会漏报真 wait 步）。**全缺兜底 false**（审查实证：execute.js/verify.js 全文无三键，保守 true 会让 auto 两阶段逐步人工确认、推翻 FR-01——auto 默认语义是继续驱动，真需停的步必有四源之一）。块为单行 HTML 注释：对 agent 是低噪提示，对脚本 `<!--SS-META:(.*)-->` 一行正则可提取。

### Wave 2：解析层 + 交互层 + 收尾层（FR-02/03/04）

- **FR-02 三态 --change**（command.js auto 入口，Grill P1-②修订）：单活跃自动选中**已存在**（pm.read(cwd,null) progress.js:304-311，本变更 delta 仅 console 回显 + 专门多活跃文案）；>1 → 报错列候选 exit 2（既有 :1090-1101/:991-1021 守卫，补 auto 专门文案对齐 :1076 先例）；**0 个 → 新增 auto 建变更**（复用 brainstorm :1082-1089 的 `date-new-change-hex` 命名与 title 逻辑——SKILL.md:28 的启动命令就是 `run auto --input`，现状 exit 2 是断头路；新行为进测试与文档）。doneCommand 元数据块内嵌解析后的完整命令，agent 逐字复制即无记忆。
- **FR-03 wait 直通（Grill P2-①补时序）**：新旗标 `run auto --wait-interactive`（runAutoMode 的 flags 解析 :1537-1548 增补）。时序：outputStep 返回后（command.js :1680 之后），若旗标开 && requiresUser && `process.stdin.isTTY` → `node:readline/promises` 直收一行 → 依次走既有 wait 落 waiting + `--continue --answer` 状态机路径（complete.js :1088 起，等价复用无新状态）；非 TTY / readline 异常 → console 提示回三段式（fail-open）。默认不开。
- **FR-04 收尾总结（Grill P2-②锁点）**：挂点 = command.js:1726（--done 后 next==null 的会话内自然收尾点；:1616 重进入分支复用同 helper），:1659「步骤全勾但阶段未关」仍提示 --done 收口。runAutoMode 检测 flowStages 全 completed → 打印固定摘要：变更名/各阶段状态/tasks 勾选计数（readPlanCheckboxStatus）/产物存在清单（proposal/design/tasks/plan/verify-result/delta）/最近归档模块（读 last-delta.json sidecar，缺失跳过）。纯 console 无新文件。

### Wave 3：skill 同步（FR-05）

`.claude/skills/sillyspec-auto/SKILL.md` 重写：删「关键词判断需用户确认」「记录 Change 名」「完成输出总结」三段；改为「每步读尾部 `<!--SS-META-->` 块：requiresUser=true → 停下与用户交互；否则执行任务后逐字跑 doneCommand」。终止条件同步修正（Grill P2-③）：现文等「全部流程已完成」（中文）但 CLI 实际输出英文——新 skill 以 SS-META/实际完成信号（CLI 收尾总结出现）为准，不匹配字符串。预期 93→约 50 行。回归跑 output-step-render / prompt-injection-gaps / brainstorm-auto-step2-conditional-wait 既有套件（Grill P2-④）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/prompt.js | outputStep 增 autoMeta 参数 + SS-META 块渲染（缺省不输出） |
| 修改 | src/run/command.js | runAutoMode：autoMeta 透传 + 三态 --change 解析 + --wait-interactive + 收尾总结 |
| 修改 | .claude/skills/sillyspec-auto/SKILL.md | 三段指令删除改 SS-META 块消费（约 93→50 行） |
| 修改 | docs/prompt/README.md | SS-META 块文档（auto 专属注入） |
| 修改 | docs/sillyspec/file-lifecycle.md | 批次注记 |
| 修改 | docs/sillyspec/platform-interface-map.md | 执行期偏差：index.js/command.js 改动后行号重锚（docs check --fix 自愈） |
| 新增 | test/auto-driver-meta.test.mjs | SS-META 块（requiresUser 三源/单阶段零输出/doneCommand 嵌名）+ 三态 --change + 收尾总结触发 |
| 新增 | test/auto-wait-interactive.test.mjs | TTY 直通（伪 TTY 探测 stub）/非 TTY 回退/旗标缺省零变化 |

## 接口定义

```js
// run/prompt.js
outputStep(stageName, stepIndex, steps, cwd, changeName, dbProjectName, platformOpts,
           prevStepAnswer, waitHistory, autoMeta = null)
// autoMeta = { changeName: string }（形状统一，Grill P2-④）——非 null 时（仅 runAutoMode 传）每步 prompt 尾部渲染 SS-META 块；noAI 步不渲染 prompt（天然无块）
// requiresUser(step) => boolean —— prompt.js 导出纯函数（requiresWait/conditionalWait/requiresConfirm 三源，
//   undefined 字段全缺时保守 true——宁停勿跳）

// SS-META 块 schema（单行 HTML 注释内 JSON）
{ stage: string, stepIndex: number, stepName: string, requiresUser: boolean,
  doneCommand: string, waitHint: string }

// command.js auto 入口
run auto [--change <名>]           // 缺省：1 活跃自动选中；>1 报错 exit 2；0 走建变更
run auto --wait-interactive        // TTY 下 requiresUser 步 readline 直收（等价自动 --continue --answer）
```

## 生命周期契约表

本变更不涉及生命周期契约（不含 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 语义——元数据块是无状态渲染产物，readline 直通是一次性 stdin 读取无会话保持）。

## 数据模型

无 db schema 变更。SS-META 块是 prompt 渲染内嵌产物（不入库不落盘）；收尾总结消费既有数据（progress/readPlanCheckboxStatus/last-delta.json）。

## 兼容策略（brownfield 必填）

- **单阶段 run 零变化**：autoMeta 缺省 null，SS-META 块仅在 runAutoMode 路径输出。
- **skill 旧版消费者**：块是 additive（prompt 多一行注释），旧 skill 指令在新 CLI 下仍可工作（关键词猜照旧命中，只是冗余）；新 skill 需要 CLI ≥ 本版本。
- **--wait-interactive**：默认不开；非 TTY fail-open 回三段式。
- **多活跃 --change**：报错语义与 brainstorm 入口先例一致，不新增隐式选择。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | requiresUser 误判（漏报真 wait 步 / 误停执行步） | P1 | 四源公式（三键 + WAIT_MARKER_RE 正文扫描）；全缺兜底 false（Grill P1-①修订——execute/verify 无三键实证，true 会退化 auto）；测试锁定四源各一例 + execute Wave 全缺步断言 false |
| R-02 | SS-META 单行 JSON 含中文/引号被 agent 复制损坏 | P2 | JSON.stringify 标准转义；块内 doneCommand 的 --output 值是占位符（agent 填摘要），实测三平台（claude/codex/zcode）由测试 fixture 模拟锁定格式 |
| R-03 | readline 直通在 Windows TTY 的行为差异 | P1 | TTY 探测（process.stdin.isTTY）失败即回退；直通仅显式旗标；非交互 CI 场景永不触发 |
| R-04 | 收尾总结与平台 sync 输出交错可读性差 | P2 | 摘要块前后加分隔线；sync 输出在 stderr 已隔离 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案全节；FR-01~04 | 已覆盖 |
| D-002@v1 | 总体方案 Wave 1；FR-01 | 已覆盖 |
| D-003@v1 | 总体方案 Wave 2 前段；FR-02 | 已覆盖 |
| D-004@v1 | 总体方案 Wave 2 中段；FR-03 | 已覆盖 |
| D-005@v1 | 总体方案 Wave 2 后段；FR-04 | 已覆盖 |
| D-006@v1 | 总体方案 Wave 3；FR-05 | 已覆盖 |

无未解决决策与剩余风险（R-01~R-04 均有应对且进测试）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-001@v1 ~ D-006@v1
- [x] 生命周期关键词豁免——本变更不涉及生命周期契约（豁免短语见「生命周期契约表」节）
- [x] UI 原型分级核对——无前端文件，跳过
- [x] 不确定的问题标注——无存疑项（requiresUser 三源在 wait-gates/契约引擎的字段已实证存在）
