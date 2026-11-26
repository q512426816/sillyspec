---
author: qinyi
created_at: 2026-11-26 09:41:41
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）— 2026-11-26-verify-stage-retire

## 动机

verify 阶段实测无拦截价值：884 个归档变更产出 788 份报告（4.4MB，截至 2026-11-26）、结论零 FAIL、friction-ledger 无拦截账，轮均成本约为 brainstorm 段 3-4 倍。上一变更 2026-11-26-verify-skip-switch 已用 `verify.mode: skip` 关停止血（本仓已启用）；本变更是终局——删除阶段本身，收口实测门按 D-008「机制保留、本仓关闭态」并入 archive 前置门。

## 关键问题

1. **skip 只是关停不是删除**：阶段壳、7 步 prompt、52 个消费面、文档镜像全部还在，维护成本照付；删壳需处理枚举/契约/门三层耦合，此前无迁移清单。
2. **语义验收与机器门耦合在同一阶段**：无法只删语义面（探针/矩阵/证据门）保留机器面（测试实测/PID 回收）——本方案按 D-001 拆耦。
3. **完整流程与轻量道的验收强度已趋同**（D-007 裁决）：verify 的独立存在价值不复存在。

## 变更范围

- 删除 verify 阶段：定义、注册、TRANSITION 边、四处常量枚举、REVIEW_STAGES、命令族、prompt 组装、探针/facts/矩阵工具族（52 个 src 消费面逐一迁移或清理）
- archive 前置门：noAI 首步「收口实测门」（3→4 步），复用 verify-quality-scan 的 runner/三源推断/指纹缓存（更名 archive-quality-scan.js）——**机制保留、本仓 `unavailable` 关闭态归 CI（D-008）**
- PID 登记/回收整体退役（D-008）：登记源头随 verify prompt 消亡，`reapVerifyServices` 与 pids 读逻辑删除，execute 不迁登记指引
- doctor：在途 verify 变更检测 + 一次性 legacy 盖完成戳（`legacyCompleteRetiredStage` 底层通路）
- 本变更自举路径：本仓 `verify: {mode: skip}` 已启用——本变更走到 verify 自动短路 completed → archive，自洽；**执行纪律：本变更合入前不得删除本仓 local.yaml 的 verify 段**（删了 skip 而 verify.js 尚在 → 本变更要走真 verify，撞上正被删除的门）
- 文档镜像：file-lifecycle、prompt 提取、AGENTS/CLAUDE 五阶段→四阶段、skills、module-map、conventions.md:52

## 不在范围内（显式清单）

- 不动轻量道（flow start/done 协议与其实测门）
- 不删除归档区 787 份历史 verify-result（只读）
- 不实现平台侧（multi-agent-platform）stage enum 镜像同步——移交项（R-01）
- 不做独立 `gate close` 命令（D-006 rejected）
- 不发 npm 版本（D-003：与后续改进合并发版）

## 成功标准（可验证）

- `run verify` 命令族移除，调用时给出「阶段已退役，请 run archive」指路
- 完整流程四阶段流转：execute completed 后可直接 `run archive`（TRANSITION 合法边）
- archive 收口实测门：机制上 CLI 亲跑 commands.test 失败阻断归档；**本仓落点为 unavailable 关闭态留痕归 CI（D-008）**；lint 不在门内
- PID：登记/回收机制随阶段退役，存量 pids 残文件无害不清理
- `grep -rn "verify-result\|verify-probes\|'verify'" src --include=*.js` 按白名单清零
- doctor 能检测在途 verify 变更并经显式确认完成 legacy 盖戳
- 新增/改造测试全绿（archive 门两态、枚举、TRANSITION 边、legacy 盖戳、plan 消费回归）
