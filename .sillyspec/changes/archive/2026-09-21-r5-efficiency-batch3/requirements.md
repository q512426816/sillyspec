---
author: qinyi
created_at: 2026-09-21T22:56:00
generated_by: agent-handoff-session
---
# 需求规格（Requirements）— R5 效率第 3 批

## 角色
| 角色 | 说明 |
|---|---|
| agent 会话主代理 | 预检/收尾指令的执行者（回合成本直接受益方） |
| gate 预检层 | gate 命令装配（gates.js）与只读检查复用（verify-postcheck） |
| 测试账本层 | test-ledger 三键指纹与消费点 |
| 收尾编排层 | verify/archive 完成处理器（complete-handlers） |

## 功能需求

### FR-01: gate 预检补全（--full 只读档）
`sillyspec gate <stage> --full` 只读覆盖 --done 独有检查面：module 子集实测（经 FR-02 复用）、target_files reconcile 只读、stage review 缺失探测、quick 实测门同口径；与 --done 同引擎同源；默认档输出与现状逐字节一致。

### FR-02: 测试结果记账（fail-closed 复用）
三键指纹（codeFingerprint=HEAD+porcelain 摘要 × testSetHash=命令+测试面内容摘要 × envProfile=结构化探针，探针清单从 13 个 worktree-cwd 环境族测试判定条件源码推导）全等才复用；键分量不可得/失败结果/模糊匹配一律不复用；账本 per-change 落 .runtime；消费点=gate verify/verify --done/quick --done/--full。

### FR-03: 归档就绪度前置
verify --done 尾部输出就绪度报告：未-apply 交付面（checkOnly 含合并感知）+ manifest 缺行草拟（经 parseFileChangeList round-trip 校验）+ module-impact 归因草拟（均带「待确认」标记，不代写）；main 前进过基点且与交付面有交集时打 apply 即时强提示；无发现时零附加输出；归档门保持全查。

### FR-04: M1 缺省开
SILLYSPEC_STEP_GUIDE 未设=开（短输出+落盘），=0 显式关（逃生门）；stdout 确定性测试族前置迁移（逐例注记）；--json 全量与动态段永不缓存语义不变。

Given 全量测试在同一（代码×测试面×环境）态下重复执行
When gate/verify --done/quick --done 再次触发实测检查
Then 三键全等即复用最近结果（不重跑），任一分量变化或不可得即真跑——失败永不来自缓存

## 非功能需求
- 兼容性：默认档 gate 输出逐字节回归；quality-scan P0-1 复用机制共存不动
- 性能：--full 复用态耗时 <5s；账本读写毫秒级不进步骤热路径

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-02 | fail-closed 三键语义与三层缓解 |
| D-002@v1 | FR-01 | --full 只读档与同引擎口径承诺 |
| D-003@v1 | FR-03 | 草拟不代写+强提示触发条件 |
| D-004@v1 | FR-04 | 翻默认+逃生门+迁移硬门 |
