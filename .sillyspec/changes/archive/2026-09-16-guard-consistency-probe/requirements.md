---
author: qinyi
created_at: 2026-09-16 20:15:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者 | sillyspec 维护者，消费探针9 结果定位守卫不一致 |
| agent | verify 执行者，逐条裁定 WARNING |

## 功能需求

### FR-01: 方法组聚类
覆盖决策：D-001@v1
Given 改动 .java 文件含 ≥2 个同实体变更方法（前缀动词×同实体名词）
When clusterMutationMethods 执行
Then 成组输出（方法名+行区间+体）；单方法不成组

### FR-02: 守卫信号检测
覆盖决策：D-001@v1
Given 方法体（注释掩码后）
When detectGuardSignals 执行
Then 四类信号（当前用户比对/角色判定调用形态/能力类调用/注解式签名前3行）任一命中→有守卫；纯标识符弱信号不计入（宁漏勿误）

### FR-03: 不一致告警（advisory）
覆盖决策：D-001@v1
Given 组内有守卫与无守卫方法并存
When runProbe9GuardConsistency 执行
Then inconsistentGroups 含 {entity, guarded, unguarded, signals}，WARNING 不阻断

### FR-04: 边界与豁免
Given 改动集无 .java / Java 文件首行 // probe9-skip
When 探针执行
Then 不适用注记 / 整文件跳过；fail-soft 单文件异常跳过

### FR-05: 渲染与 metrics
Given 探针执行
Then 渲染段「#### 探针 9」+ 口径注记；facts metrics 三键（javaFileCount/groupCount/inconsistentGroups）

### FR-06: 一致性抽查接线
Given verify 阶段一致性抽查
Then probe9 维度 WARNING 级参与（锚点正则汇总行 N 求和 + facts 基线对账，对齐 probe8 先例）

## 非功能需求
- 兼容性：探针 1-8 语义零变动；无 Java 变更零噪音
- 可回退：新增代码路径 revert 即回退
- 可测试：三导出纯函数化；fixture 独立可重复
- 性能：只扫清单 .java 文件单遍正则

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01~FR-06 | 同实体组比对+advisory+注解并入完整需求面 |
