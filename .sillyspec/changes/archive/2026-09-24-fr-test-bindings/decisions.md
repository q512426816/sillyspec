---
author: qinyi
created_at: 2026-09-24 12:40:00
---

# 决策记录（Decisions）— 2026-09-24-fr-test-bindings

## D-001@v1: 变更期 trace 载体 = changes/<名>/test-trace.json
- type: architecture
- status: accepted
- **覆盖**: FR-01, FR-07
- **上下文**：验证期（归档前）绑定行放哪——verify-facts.json 内嵌 / 独立机器文件 /
  直接写活库。
- **裁定**：独立机器文件 `test-trace.json`，CLI 所有权、机器格式（JSON）。
- **理由**：归档前锚还是局部号，直接写活库会造未铸 id 的死行；verify-facts 是
  事实快照混入绑定会污染其语义；独立文件随变更目录自然进归档包。
- **否决**：内嵌 verify-facts——职责混杂，晋升/重放要二次拆包。
- **故障面**：trace 文件与 verify-result.md 判定列可能不同步（晋升后矩阵又被手改）
  ——护栏：晋升只在 --done 门后一次执行，重放幂等以 trace 为准。
- **退役判据**：读侧另案落空（绑定长期零消费）→ 提升停摆，trace.json 随归档包
  原样保存即可。

## D-002@v1: 两处真源 + 单点解析模块（src/test-bindings.js）
- type: architecture
- status: accepted
- **覆盖**: FR-03, FR-04, FR-06, FR-07
- **上下文**：绑定真源放哪、谁解析（方案 §3.2 真源裁定：FR 活库机器字段+ql 同构，
  禁第二目录）。
- **裁定**：FR=条目内「测试绑定:」机器子块（fr-index 蒸馏面内）；ql=quicklog 侧
  机器面 test-bindings.json；两者仅由 src/test-bindings.js 解析读写（叶子模块，
  fr-index 归档时调用做提升）。
- **理由**：方案裁定原文——每新增独立手写格式真源=一对解析税；ql 无活库条目可挂，
  同构机器面是其蒸馏面。单模块保住「一处解析」。
- **故障面**：两真源并存——若出现第三写点绕过模块，解析面失控（护栏：CLI/探针/
  归档全部经模块导出函数，lint 未引用导出检查兜底）。
- **退役判据**：绑定查询长期零消费（读侧另案落空）→ 条目子块停写，降级为
  test-trace.json 原样归档。

## D-003@v1: 晋升时机 = verify --done 矩阵门通过时
- type: definition
- status: accepted
- **覆盖**: FR-01, FR-02
- **上下文**：晋升放 verify --done / 归档时。
- **裁定**：verify --done——矩阵门通过即按判定列晋升；归档只做锚映射搬运。
- **理由**：判定列就是方案定义的 agent 复核面；归档期不再二次判定（归档无复核
  介入点，拖到归档=晋升永远滞后且无人负责）。

## D-004@v1: quick 行落 candidate（诚实优先）
- type: definition
- status: accepted
- **覆盖**: FR-05
- **上下文**：quick --done 机械落的 ql 行给什么状态——gate 已实测通过可视为确认？
- **裁定**：恒 candidate + discovery:machine + confirmed_by:null；确认走
  tests --bind。
- **理由**：gate 实测证明「测试跑过且过」，不证明「绑定关系正确」——方案红线
  「预填/机械产物≠确认」；消费口径（candidate 是否入读侧跑集）由另案裁定，不在此
  预支语义。

## D-005@v1: orphan 行身份 = acc-<index>-<textHash8>
- type: definition
- status: accepted
- **覆盖**: FR-01, FR-07
- **上下文**：row_id 的 acceptance 序号在 requirements.md 插行后会漂移（方案 §6.10
  + 第六轮钉死：禁易漂移纯序号作长期主键）。
- **裁定**：accRef = `acc-<index>-<sha256(acceptance 原文) 前 8 位>`；index 只作
  快照，身份判定走指纹。
- **理由**：纯序号插行后批量假悬空、修复噪声放大；指纹同文恒稳。
