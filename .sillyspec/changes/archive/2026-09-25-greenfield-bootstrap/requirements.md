---
author: flow-machine-draft
created_at: 2026-09-25T16:03:45.339Z
---
# 需求规格（Requirements）— 2026-09-25-greenfield-bootstrap

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 绿地模块图草案起草
Given 无模块图仓 FR 域路由全落伪域/unmapped（R17 两臂实证）
When flow start 检测模块图缺席且 --input 有路径语料
When 机器起草初始 _module-map.yaml（目录段聚合、draft 标识、不含 blast、幂等不覆盖）并醒目提示校准路径

### FR-02: archive 侧域路由供清单
Given archive 侧 indexRequirements 不传 deliverableFiles（R17 臂3 落 unmapped 直接成因）
When 两调用点（archive-distill/complete-handlers）供 design 表∪apply-manifest 文件面
Then 全泛化段 design 单源形态落 auto-* 伪域而非 unmapped（与轻量道口径对齐）

### FR-03: 伪域升级提醒与 unmapped 超阈告警
Given 落伪域时升级路径只在文件头注释（无人看）、unmapped 720 条堆积无信号
When indexRequirements 尾部输出
Then 落 auto-*/unmapped 提示补模块卡路径；unmapped>50 告警配治理指引（不阻断）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/greenfield-bootstrap.test.mjs 用例①（聚合/draft 标识/不含 blast/幂等/全泛化段不建）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/greenfield-bootstrap.test.mjs 用例②③（两源并集 + 旧行为复现→供清单落伪域对照）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/greenfield-bootstrap.test.mjs 用例③（伪域路径实际触发提醒）+④（提醒不阻断返回钉）；超阈告警由本仓 720 条真实数据首跑实证

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
