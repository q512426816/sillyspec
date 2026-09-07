---
author: qinyi
created_at: 2026-09-08T00:48:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: driver 化范围 = 四件编排负担下沉，不做外部 driver 重写
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 第四梯队「auto driver 化」做到什么深度？
- answer: runAutoMode 已有阶段链编排（firstOpenStage/nextInFlow/classify）；agent 残留四件负担逐一下沉——①requiresUser 判定从「agent 对 prompt 文本关键词猜」改为 CLI 按 step 定义元数据（requiresWait/conditionalWait/requiresConfirm）计算并随 prompt 尾部机器可读块输出；②--change 跨轮记忆消除（单活跃变更自动解析，多活跃才强制显式）；③wait 用户输入直通（TTY 下 CLI readline 原生收，agent 不当转抄员；非 TTY 保持三段式）；④流程收尾总结由 CLI 打印。不做「CLI 内调模型」或 SillyHub 外部 driver 重写——前者 CLI 无模型访问，后者属平台侧（machine-interface v1 地基已备）。
- normalized_requirement: 四件各自独立可测；非 auto 模式（单阶段 run）行为零变化
- impacts: [FR-01, FR-02, FR-03, FR-04]
- 模块域: runtime, cli-entry
- evidence: runAutoMode（command.js:1548 起已有 flowStages 链）；auto SKILL.md「判断是否需要用户确认：prompt 含『请用户选择/等待用户回答』→ 暂停」关键词猜；原分析报告第四节 auto 条目

## D-002@v1: requiresUser 元数据块 = prompt 尾部固定分隔注释块（非 --json 全量）
- type: interface
- priority: P0
- status: accepted
- source: docs
- question: 步骤元数据机器可读的载体形态？
- answer: auto 模式下 outputStep 渲染的 prompt 末尾追加固定格式块：`<!--SS-META:{"stage":...,"stepIndex":N,"stepName":"...","requiresUser":true|false,"doneCommand":"sillyspec run auto --done --change <名> --output \"...\"","waitHint":"..."}-->`——HTML 注释形态对 agent 是低噪提示、对脚本可正则提取；不选 --json 全量输出（auto 主路径是给 agent 读的 prose prompt，JSON 化会破坏现有 prompt 消费）。requiresUser 计算源（Grill P1-①修订）：requiresWait===true || conditionalWait===true || requiresConfirm===true || WAIT_MARKER_RE.test(prompt)（复用 prompt.js:1019 已消费的正文标记正则）；全缺兜底 **false**（auto 默认语义=继续驱动——审查实证 execute/verify 全文无三键，保守 true 会让 auto 退化为逐步人工确认）。
- normalized_requirement: 元数据块仅 auto 模式输出；单阶段 run 零输出
- impacts: [FR-01]
- 模块域: runtime
- evidence: outputStep 尾部现有「完成后执行」段（同点位追加）；stage 定义 requiresWait/conditionalWait/requiresConfirm 字段已存在（wait-gates 先例）

## D-003@v1: --change 免记忆 = 单活跃自动解析 + 拒绝多活跃隐式选择（沿用既有先例）
- type: behavior
- priority: P1
- status: accepted
- source: docs
- question: auto 循环的 --change 记忆如何消除？
- answer: `run auto` / `run auto --done` 不带 --change 时：恰好一个活跃变更 → 自动选中（**已存在**：pm.read(cwd,null) 单活跃自动采用 progress.js:304-311——本变更 delta 是 console 回显；Grill P1-②修订）；多活跃 → 报错列出候选 exit 2（既有守卫补 auto 专门文案，与 brainstorm :1076 先例同语义不隐式选择）；**零活跃 → 新增 auto 建变更**（复用 brainstorm :1082-1089 命名与 title 逻辑——SKILL.md 启动命令即 `run auto --input`，现状 exit 2 是断头路；非「现有路径」）。doneCommand 元数据块里直接带解析后的完整命令，agent 逐字复制即无记忆需求。
- normalized_requirement: 单活跃/多活跃/零活跃三态语义与既有 run 入口先例一致
- impacts: [FR-02]
- 模块域: cli-entry
- evidence: command.js:1074 brainstorm 多活跃 exit 2 先例；auto SKILL.md「每次 --done 都必须携带 --change」记忆负担原文

## D-004@v1: wait 直通仅 TTY，且是 opt-in 旗标
- type: behavior
- priority: P1
- status: accepted
- source: user
- question: wait 用户输入直通的边界？
- answer: 新旗标 `run auto --wait-interactive`：TTY 下 requiresUser 步的 --wait 输出选项后 readline 直收用户输入落 waitAnswer（等价 --continue --answer）；非 TTY 或未带旗标 → 三段式现状不变。默认不开（agent 驱动仍是主形态，直通是「人在终端自己跑 auto」的增强）。伪造回答防线不变（answer 有了真实 stdin 来源）。
- normalized_requirement: 不带旗标行为逐字节不变；TTY 探测失败 fail-open 回三段式
- impacts: [FR-03]
- 模块域: cli-entry, runtime
- evidence: 原 T2 分析「requiresWait 三段式 agent 当搬运工」；@inquirer/prompts 动态 import 先例（quick 交互分支）

## D-005@v1: 收尾总结 = CLI 在流程全完成时打印结构化摘要
- type: behavior
- priority: P2
- status: accepted
- source: docs
- question: auto 完成总结谁产出？
- answer: runAutoMode 检测 flowStages 全 completed 时打印固定摘要（变更名/各阶段耗时来源 lastActive 快照/任务数/tasks 勾选/产物清单/delta 模块清单——有 sidecar 就读），agent 免自撰。纯 console，无新文件。
- normalized_requirement: 仅全完成时输出；未完成不打印
- impacts: [FR-04]
- 模块域: cli-entry
- evidence: auto SKILL.md「完成时输出完整流程总结」；last-delta.json sidecar（2026-09-07-ir-hardening 已落）

## D-006@v1: auto skill 瘦身随元数据块同步（指令删减以块为准）
- type: docs
- priority: P2
- status: accepted
- source: docs
- question: auto SKILL.md 如何随动？
- answer: 元数据块上线后，skill 的「关键词判断是否需用户确认」「记录 Change 名称每次 --done 必带 --change」「完成时输出总结」三段指令删除，改为「读 prompt 尾部 <!--SS-META--> 块：requiresUser=true 停下等用户；逐字执行 doneCommand」。skill 行数预期 93→~50。
- normalized_requirement: skill 与块字段一一对应，无双重来源
- impacts: [FR-01, FR-02, FR-04]
- 模块域: docs-consistency
- evidence: auto SKILL.md 现文（.claude/skills/sillyspec-auto/SKILL.md）
