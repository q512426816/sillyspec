---
author: flow-machine-draft
created_at: 2026-09-30T06:52:12.313Z
---
# 需求规格（Requirements）— 2026-09-30-verify-done-green-reuse

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
Given 系统就绪
When 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
Then 行为符合本条标准描述

### FR-02: verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等
Given 系统就绪
When verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑，输出明示 cac
Then 行为符合本条标准描述

### FR-03: verify --done 的 lint 实测同指纹复用（同上口径）
Given 系统就绪
When verify --done 的 lint 实测同指纹复用（同上口径）
Then 行为符合本条标准描述

### FR-04: 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
Given 系统就绪
When 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
Then 行为符合本条标准描述

### FR-05: 全量测试回归绿，含新增的文案断言与复用命中
Given 测试 相关模块就绪
When 全量测试回归绿，含新增的文案断言与复用命中
Then 行为符合本条标准描述

### FR-06: 未命中用例
Given 系统就绪
When 未命中用例
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/api-coverage-matrix.test.mjs（4c 泛化分诊用例：断言文案含「证据列（矩阵第 5 列）缺锚点」与「第 3 列『用例依据』不计」；8b 对照用例：covered 行缺锚走新文案） -->

<!--AGENT:测试绑定FR-02 test/green-cache.test.mjs（T2 store/lookup 往返命中、T2b 逃生阀与 TTL、T3 指纹口径——命中免真跑的契约层）；test/stage-completion-atomicity.test.mjs（h 段：GREEN_CACHE_OFF=1 下真跑分支保持调用——接线在场的负控） -->

<!--AGENT:测试绑定FR-03 test/green-cache.test.mjs（T1 文档面剔除不击穿指纹、T2 同指纹命中——lint 与 test 共用同套缓存函数契约） -->

<!--AGENT:测试绑定FR-04 test/green-cache.test.mjs（T2 异指纹 miss / TTL 过期 miss / OFF=1 双向关、T3 非 git 目录 null → 全部回退真跑的 fail-open 契约） -->

<!--AGENT:测试绑定FR-05 不适用：全量回归是门禁实测（flow done 亲测 deps 子集 30 个 + npm run lint，见 verify-runs/20260930072624/test-result.json），非单测用例可绑定；变更前手动全量 npm test exit 0、npm run lint 通过 -->

<!--AGENT:测试绑定FR-06 不适用：FR-06 为机器骨架残留占位条目（无对应行为面） -->
