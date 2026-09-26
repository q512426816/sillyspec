---
author: flow-machine-draft
created_at: 2026-09-26T07:53:32.794Z
---
# 需求规格（Requirements）— 2026-09-26-binding-anchor-fidelity

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 绑定槽路径邻接用例锚提取保真（四形态）
- Given requirements 绑定槽作答含测试路径及其后紧邻的用例锚（「X」＋可选 组/用例 后缀、#id、::id、> name 四形态任一）；When flow done distill 执行 extractRequirementBindings；Then test-trace 行 tests 条目完整携带「路径＋用例锚」书写原形（只摘不译），不再截成纯文件级
### FR-02: 描述文字不误捕（降级语义）
- Given 路径后直接跟「：」引导的描述、或用例名与路径之间隔有其他文字（非邻接）；When 提取执行；Then 不捕任何锚——条目诚实降级为文件级（宁漏勿误）
### FR-03: 裸文件名/路径段解析项目相对全路径
- Given 作答引用裸文件名或残缺路径段（仓内该文件实际存在）；When 提取执行；Then 条目解析为项目相对全路径——直取存在优先，否则仓内扫描（排除 node_modules/.git/治理面）取后缀/基名唯一命中
### FR-04: 歧义与未命中原样保留
- Given 裸名/路径段在仓内零命中或多个命中；When 提取执行；Then 原样保留不猜（悬空由 dangling 校验自然暴露）
### FR-05: 文件面消费点统一剥锚
- Given tests 条目携带用例锚；When 残差实测（resolveTraceResidual）、watcher 归属（resolveTestFileOwners）、rot 覆盖判定（covHit/rotSuspectFlow）、tests --unbind 匹配消费；Then 一律经 testAnchorFile 剥锚按文件路径取值——锚点后缀不产生悬空/失联/误判；展示面（test-trace/FR 机器子块/tests 视图）保持完整锚点
### FR-06: 书写约定收紧
- Given 新变更的绑定槽模板与 flow 收口指引；Then 文案要求「项目相对全路径＋用例名」（如 test/foo.test.mjs「用例组」/#用例），不再接受裸文件名书写引导
### FR-07: 回归与门禁
- Given 本变更全部交付；When 新测试与既有锁定套件（flow-draft/test-bindings/verify-trace-residual/residual-runner-parity）及 test:core/lint 门禁运行；Then 全绿（新测试文件纳入 test:core 清单）
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: 绑定槽路径后紧邻的用例锚（「…」组 / #… / ::… / > …四形态）完整进 test-trace tests 行
FR-02: 「：」后的描述文字不误捕
FR-03: 裸文件名或路径段解析为项目相对全路径（存在性优先＋仓内唯一后缀命中
FR-04: 无唯一命中原样保留）
FR-05: 消费面（残差实测 resolveTraceResidual / watcher 归属 resolveTestFileOwners / rot 覆盖判定 covHit 与 rotSuspectFlow）按文件路径取值不受锚点后缀破坏
FR-06: 绑定槽模板与 flow 收口指引同步收紧书写约定（项目相对全路径＋用例名）
FR-07: npm run test:core 与 npm run lint 全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs#①

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs#①

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs#②

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs#②

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs#④；test/flow-draft-binding-extract.test.mjs#⑥；test/flow-draft-binding-extract.test.mjs#⑦

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：指引文案收紧无机器可验断言面；模板生成链路由既有 flow-draft.test.mjs 套件锁定不破

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft-binding-extract.test.mjs：套件整体（7 用例）＋test:core 208/lint 门禁亲测
