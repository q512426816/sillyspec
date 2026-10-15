---
author: flow-machine-draft
created_at: 2026-10-15T12:14:56.287Z
---
# 设计记录（Design Record）— 2026-10-15-session-forensics

## 做法概述

新增只读命令 `sillyspec diagnose --change <名>`，对照 obra/superpowers diagnosing-superpowers 的取证形态做 SillySpec 原生版。分工沿本仓哲学：**CLI 装配证据包（机械事实），agent 做取证判断（语义）**——新模块 `src/forensics.js` 两个导出（`assembleForensicsPack` 纯装配 + `renderForensicsTaskbook` 任务书渲染）+ `cmdForensics` 命令入口；`src/index.js` 增一个 `case 'diagnose':` 分支（动态 import，与 case 'agent-log' 同款）+ 帮助行。

证据包六面全部来自既有数据源，零新数据格式：agent-session-log.json（按变更名过滤 lastCommand）、friction-ledger（readFrictionLedger 既有 API）、verify-runs/*/test-result.json（mtime 近序）、变更目录 review 轮次（review.json + superseded-*）、flow-state.yaml 身份面、取证任务书。任务书六维度（时间线重建/计划遵从/重复工作/停等与重试/成本与轮次/门禁摩擦）是**结构骨架**——与 review_probes 的 scope 枚举同判例（CLI 自有任务书面集合，非内容枚举）；取证纪律钉死 diagnosing-superpowers 的核心铁律：每条 finding 必须 `path:line` 锚、无锚不成立。

选「只读命令 + 任务书」而非「CLI 自动分析」的理由：①诊断是语义判断，CLI 机械分类只会产出占位结论；②D-unmapped-153 死路（CLI 检测派发能力=伪检测比声明制更假）——任务书始终输出，执行方式由宿主 agent 自行决定；③与评审任务书同哲学（CLI 单源生产任务书，agent 按书作答），复用已实证的纪律条款（时间盒收敛、禁全量扫读）。

## 接口契约

- **新增命令**：`sillyspec diagnose --change <名> [--detect] [--json] [--spec-dir <路径>]`。只读、零状态写入、无门禁（不进 run 状态机，不产生进度/事件/tick）。exit 0=证据包产出（含空清单降级面）；参数缺失 exit 2 带用法（与 patch-reanchor 同款守卫）。
- **新增模块** `src/forensics.js`：`assembleForensicsPack({ specBase, runtimeRoot, changeName })` → `{ identity, agentLogs, friction, verifyRuns, reviews, taskbook }`（纯读函数，fail-soft——单数据源缺失/损坏返回空清单+注记，不抛错）；`renderForensicsTaskbook(pack)` → markdown 字符串；`cmdForensics(args, opts)` → 命令入口（打印/JSON 输出）。
- **index.js 面最小化**：一个 case 分支（6 行）+ 帮助文本一行 + `topCommands` 数组不加（diagnose 属查询类，进 topCommands 会改 platform 命令面板面——不加）。帮助文本用法行挂在「查询/诊断类」段（doctor 附近）。
- **不改**：agent-session-log.js、friction-ledger.js、timeline.js 等既有模块零改动（只 import 读取）。
- **报告产物**（agent 执行任务书后产出，非本命令写入）：`<变更目录>/diagnosis-report.md`，固定章节：问题陈述/时间线/findings（分维度）/无法证实面。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/forensics.js | 证据包装配 + 任务书渲染 + 命令入口（只读，fail-soft） |
| 修改 | src/index.js | case 'diagnose' 分支（7 行）+ 顶层帮助 diagnose 用法行 |
| 新增 | NEW:test/forensics.test.mjs | 8 用例：六面/排序确定性/零写入/降级/归档/任务书/--json/用法 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | src/forensics.js 归入 runtime 模块 paths（src 录图 lint 门；证据源同域） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. **乱序/迟到到达**：证据源全是事后读取的静态文件；verify-runs 按 mtime 排序在文件系统 mtime 粒度内稳定（同秒并列按路径字典序破平，测试钉死排序确定性）。会话日志过滤走登记面既有 `change_key` 键**精确相等**（登记时由 run 命令写入的唯一键），无子串误命中面；登记文件被并行会话高频重写时 JSON.parse 失败走 fail-soft 空清单+注记。
2. **并发写**：本命令零写，无并发写面。读取中的文件被并行会话写入（agent-session-log.json 高频更新）→ JSON.parse 失败走 fail-soft 空清单+注记，不抛错不重试（取证本来就该容忍现场变动）。
3. **切换/生命周期**：diagnose 不依赖步骤态、可在变更任意生命周期点调用（含归档后——归档变更传 --change 指向 archive/ 路径时如实报「变更已归档」注记并列归档件路径，任务书照常输出）。无跨会话状态。
4. **作用域**：specBase/runtimeRoot/cwd 三参显式传入（与 run 族同源解析），平台模式（--spec-root 指向外部目录）下 runtimeRoot 经 resolveRuntimeRoot 既有口径解析；单仓假设与 status/doctor 同级，不新增跨仓面。

## 风险与死路

- **最大风险：证据包与「真相」之间隔着 transcript 本体**——agent-session-log 只登记路径，真正的模型 I/O 在各 harness 的日志文件里，格式因 harness 而异（claude jsonl/codex rollout/zcode model-io）。CLI 不解析 transcript 内容（解析器是三套格式 × 持续演化的维护泥潭，且 agent-session-log 注释已实证 fail-closed 立场），解读交给任务书里的 agent——这是设计意图不是缺陷，但意味着 diagnose 的价值上限取决于执行任务书的 agent 是否真读文件。缓解：任务书首条纪律即「先读证据包列出的文件本体再下结论」+ path:line 铁律使空谈结论无处遁形（报告评审时一眼可见）。
- **次风险：六维度骨架被当成完备清单**——真因可能不在六个维度里（如需求本身就是错的）。缓解：任务书明示「维度是常见失事面骨架不是封闭清单，证据指向维度外时照报，报告章节允许增设」。
- **第三风险：登记文件的 schema 演化**（agent-session-log.json 由平台协议文档约束，`change_key` 是既有键；若未来登记面废弃该键，过滤面静默变空）。缓解：空清单与「零命中」在输出里显式区分于「源缺失」，doctor/协议演进时会经过登记面自身的测试面；残余风险可接受（取证命令 fail-soft 不阻断任何主流程）。
- **放弃的方案**：
  - *CLI 解析 transcript 自动出报告*：三 harness 格式 × 演化维护泥潭 + 语义判断错位（见上）；diagnosing-superpowers 本体也是 agent 读 transcript、不是工具解析。
  - *进 run 状态机成为 diagnose 阶段*：取证是随时可调用的查询动作不是流程节点，进状态机会引入步骤态/门禁/进度上报面——收益为零成本为正。
  - *报告写到 .runtime*：取证报告是要给人读、随变更归档留档的产物——落变更目录（归档时随 change.patch 一起冻结）。
