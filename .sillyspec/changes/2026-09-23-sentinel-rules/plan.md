---
plan_level: full
execution_mode: main
---

# 实现计划（Plan）— 2026-09-23-sentinel-rules

## Spike 前置验证
无——技术方案纯增量（既有 watcher 管线 additive 扩展），无新技术栈/未验证集成，
不确定面已由 Grill 五项修正消化。

## Wave 1（并行，无依赖；文件不相交）
- task-01
- task-05

## Wave 2（依赖 Wave 1；watcher.js 串行面）
- task-02

## Wave 3（依赖 Wave 2；文件不相交并行）
- task-03
- task-04

## Wave 4（收尾登记门）
- task-06

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 快照四源扩展 | W1 | P0 | — | FR-01 | buildSnapshot 增 commits/dirtyCode/scanStatus/reviews/checkedTasks，全注入参数化 |
| task-02 | 四规则引擎+循环接线 | W2 | P0 | task-01 | FR-01~06, D-001@v1~D-004@v1 | applySentinelRules 纯函数+warning 事件+子进程接线 |
| task-03 | L0 纯函数 | W3 | P0 | task-01 | FR-07, D-002@v1 | sentinel-assertions.js 三态，本批不接线 |
| task-04 | 水位回补 | W3 | P1 | task-01/02 | FR-08, D-005@v1 | last-snapshot 落盘+重启补发 backfill，幂等 |
| task-05 | run 族挂点 | W1 | P1 | — | FR-09, D-006@v1 | runAutoMode 头部 spawnWatcher 最小挂点 |
| task-06 | 测试+登记门 | W4 | P0 | task-01~05 | 全 FR | sentinel-rules.test.mjs+module-map 补录+lint/全量绿 |

## 关键路径
task-01 → task-02 → task-04 → task-06（快照口径→引擎→回补→门）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- 恒 advisory：warning 事件恒带 provisional:true、severity:'warning'；不写 progress db
  （真相库只归协议调用——单写者纪律）
- 平台 events 端点契约不变，新字段 additive
- 既有 watcher.test.mjs 零改动（零回归验收钉）；既有事件 kind 语义不动
- SILLYSPEC_WATCHER=0 / SILLYSPEC_WATCHER_PUSH=0 / NODE_TEST_CONTEXT 护栏语义全部继承
- 规则引擎 try/catch 包裹 best-effort——引擎异常绝不杀 watcher、绝不阻断协议面
- 代码必须兼容 Windows / Linux / macOS（路径正斜杠、mtime 毫秒取整）
- task-05 挂点避开 src/run/command.js 1727/2073 一带；冲突 rebase 以并行会话 A 为先
- 本批不接线：--done 收口、flow pause、旧流程折叠均不碰

## 全局验收标准
1. 四规则各 ≥1 正 ≥1 负单测（fixture 快照序列，零 CLI 依赖）
2. detectFakeCheckCompletion 三态（真完成/假勾选/无勾选）+ token 边界钉
3. 水位回补幂等（同水位二次零事件）
4. 既有 watcher.test.mjs 零回归；全量 npm test 绿；npm run lint 绿
5. module-map 登记新文件（sync 模块 paths + sentinel-assertions.js）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02 | applySentinelRules 内嵌 watcher.js，四规则单测 |
| D-002@v1 | task-02/03 | R1 证据口径测试+三态测试（token 边界钉） |
| D-003@v1 | task-02 | R4 相位锁存单测（early/execute 阈值正负例） |
| D-004@v1 | task-02 | R3 声明面 fail-open+globMatch 正负例 |
| D-005@v1 | task-04 | 回补幂等测试 |
| D-006@v1 | task-05 | runAutoMode 挂点+auto 路径 spawn 单测 |
| FR-01 | task-01, task-02 | 引擎纯函数+四规则单测 |
| FR-02 | task-02 | 假勾选正负例（commit/review 双证据负例） |
| FR-03 | task-02 | 改测试凑绿三拍序列正例+两负例 |
| FR-04 | task-02 | 范围漂移正例+面内负例+无声明面跳过负例 |
| FR-05 | task-02 | 停滞 20/15min 阈值正负例+episode 去重 |
| FR-06 | task-02 | warning 事件形态断言（rule/severity/provisional） |
| FR-07 | task-03 | 三态+token 边界+无 id 行不入判 |
| FR-08 | task-04 | 回补幂等+水位缺失全新启动 |
| FR-09 | task-05 | auto 路径 spawnWatcher 接线 |
