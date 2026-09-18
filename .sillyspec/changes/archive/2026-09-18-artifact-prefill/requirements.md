---
author: qinyi
created_at: 2026-09-18 15:48:45
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 变更执行 agent | 拿到预填槽「核对改写」而非从零写 |
| 维护者 | 预填≠结论纪律可验收（注清零门禁） |

## 功能需求

### FR-01: 三槽预填引擎
覆盖决策：D-001@v1, D-002@v1
Given src/prefill.js 三纯函数（清单←target_files 并集/决策表←D-xxx 清单/ids←FR+D 抽取）
When 生成器或 refresh 调用
Then 白名单槽落预填值+来源行内注「(预填：核对后删本注)」；槽外一律不碰；无源文件时空槽+提示行（骨架行为不变）

#### 场景：核对改写
Given task 卡 target_files 已声明六文件
When prefill-refresh 运行
Then design 清单槽出六行（NEW: 保形）带注——agent 核对删注即确认

### FR-02: refresh 重放与已确认保护
覆盖决策：D-005@v1
Given sillyspec prefill-refresh --change <名>
When 槽内预填注在场
Then 重放预填（幂等）；注已删=已确认→跳过不覆盖人工内容

#### 场景：人工保护
Given 决策追踪表某行被 agent 改写且注已删
When refresh
Then 该槽跳过（confirmed 计数）

### FR-03: 门禁梯度与对表
覆盖决策：D-003@v1, D-004@v1
Given --done 门（brainstorm/plan）与归档前校验
When 白名单槽含未删注
Then --done advisory 提示；归档前 error 阻断（注清零=确认完成）；本变更对表数据（请求/上下文/摩擦 vs 基线 172/249k/9）落 baseline 附录

#### 场景：注清零校验
Given 归档前 design 清单槽仍有预填注
When verify 探针
Then error——预填未确认

## 非功能需求
- 兼容性：旧路径零新硬门（advisory 渐进）；定向回归绿；全量绿

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 白名单三槽 |
| D-002@v1 | FR-01 | 生成器归属 |
| D-003@v1 | FR-03 | 预填≠结论门禁 |
| D-004@v1 | FR-03 | 对表实测点 |
| D-005@v1 | FR-02 | refresh 语义 |
