---
author: qinyi
created_at: 2026-09-18 12:38:55
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 变更执行 agent | 拿着前置失败清单一轮修完，不再提交后被打回 |
| sillyspec 维护者 | 降本不暗降（守恒红线可验收） |

## 功能需求

### FR-01: 门禁前置失败清单注入
覆盖决策：D-001@v1, D-005@v1
Given 产出型步骤（brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）的 prompt 渲染
When 该步骤 --done 将消费的 validator 存在当前失败项
Then prompt 含前置失败清单——只注本步相关 validator、条数帽 5、超时帽 3s/validator、异常静默不注（fail-open）、尾部固定「完整清单：sillyspec gate <stage> --json」；清单头部明示「已知失败项（非全部要求），清单外仍需按步骤说明自检」（防应试打磨）

#### 场景：失败清单前移
Given design.md 清单有一行幻觉路径
When 进入 brainstorm 生成规范文件步
Then prompt 直接列出该 design_file_ref_invalid 项——agent 本轮即修，不再 --done 被打回重一轮

### FR-02: 阶段感知注入瘦身
覆盖决策：D-002@v1
Given .runtime/prompt-inject-<change>.json 账本（withFileLock 写入，archive 经 pruneArchivedChangeRuntime 登记回收）
When 同阶段非首步渲染
Then 模块上下文/scan 事实只注摘要行（digest 前 8 位+可 Read 路径引用）；账本读写异常回退每步全量（现状零回归）

#### 场景：摘要引用
Given brainstorm 已在第 2 步全量注入模块上下文
When 第 6 步渲染
Then 注入为「本阶段上下文已于步骤 2 注入（digest xxxxxxxx）；需要时 Read <路径>」一行

### FR-03: wait 继承盖章
覆盖决策：D-003@v2
Given run <stage> --wait --inherit-from D-xxx@vN（解析在 src/run/command.js，落账在 src/run/complete.js wait_answers）
When decisions.md 字面存在该 ID（hasDecisionId 机械校验）
Then 同命令落答案轮「由 D-xxx@vN 继承确认（CLI 盖章）」；不存在则 exit 2（fail-closed）；不带 --inherit-from 行为与现状逐字节一致

#### 场景：继承盖章
Given 方案选择已由 D-005@v1 裁决
When run plan --wait --inherit-from D-005@v1
Then 同命令完成 wait 记录+盖章轮（省一次 --done --answer 往返）

### FR-04: 测选路引导与守恒验收
覆盖决策：D-004@v1, D-005@v1
Given 任务卡规则模板（templates/prompts/taskcard-rules.md）与 execute 任务步 prompt
When 渲染
Then 含「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」；verify-result 验收段含守恒三红线（L1 拦截不降/CLI 亲测照跑/单步中位不反弹）

#### 场景：守恒验收
Given 批 2 落地后的首个变更
When verify
Then 摩擦账对比拦截数守恒、noAI 亲测双绿、prompt 中位统计不反弹

## 非功能需求
- 兼容性：不带 --inherit-from 逐字节一致；账本异常回退每步全量；全量测试零回归

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 前置注入+三约束 |
| D-002@v1 | FR-02 | 阶段感知瘦身+账本 |
| D-003@v2 | FR-03 | 继承盖章 fail-closed（@v1 问题+@v2 答案版本链） |
| D-004@v1 | FR-04 | 引导不改默认 |
| D-005@v1 | FR-01, FR-04 | 守恒红线进验收 |
