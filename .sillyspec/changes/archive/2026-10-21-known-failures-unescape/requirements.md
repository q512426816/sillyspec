---
author: flow-machine-draft
created_at: 2026-10-21T17:12:00.000Z
---
# 需求规格（Requirements）— 2026-10-21-known-failures-unescape

## 功能需求

### FR-01: 三读侧 YAML 双引号反转义对称（必须）

verify 判账（src/verify-postcheck.js extractKnownFailures）、docs-check 键提取、CLI 管理面（src/config-known-failures.js parseKnownFailureKeys）三处读侧必须对双引号条目执行 YAML 反转义（\→\、"→" 等标准双引号转义集），单引号条目 ''→'；用户经 config known-failures add 写入的含反斜杠锚定模式（如 doc-ref-check\.test\.mjs$）round-trip 后必须原样到达豁免匹配层（buildExemptPats 收到的正则文本与用户输入逐字一致）。修复前形态（反转义缺席导致豁免静默失配）必须由回归测试钉死不再复发。

#### 场景：round-trip

- Given：local.yaml 流式 known_failures: ["doc-ref-check\.test\.mjs$"]（add 写入的规范 YAML）
- When：extractKnownFailures 解析
- Then：返回 ['doc-ref-check\.test\.mjs$']（单反斜杠——用户原样），buildExemptPats 编译后命中行尾为 doc-ref-check.test.mjs 的 TAP not ok 行

#### 场景：三读侧一致

- Given：同一 local.yaml 文本（块式 + 流式、双引/单引/裸键混合 fixture）
- When：三读侧各自解析
- Then：三者结果逐项相等

### FR-02: CLI remove 诚实文案 + 原样键匹配（必须）

applyKnownFailureEdit 流式分支必须与块式分支统一返回 removedCount；runKnownFailuresCommand 的 remove 文案必须仅在存在未命中键时注记「未命中静默忽略」，全部命中时不得打印该括注；remove 匹配以读侧解析后的规范键（反转义后）与用户原样键比对。

#### 场景：remove 全命中

- Given：存储含 "a\.b$"（解析规范键 a\.b$），remove 传 a\.b$
- Then：removedCount=1、条目移除、输出无「未命中」括注

#### 场景：remove 部分未命中

- Given：remove 传两个键仅一个在库
- Then：命中者移除；输出仅对未命中键注记未命中

### FR-03: 测试与既有面（必须）

必须新增直测覆盖：round-trip 矩阵（含反斜杠锚定模式 add→parse→豁免命中真实失败行）、三读侧一致性、remove 命中/未命中文案分支；既有面（config-known-failures / verify-postcheck-known-failures / doctor-local-yaml）必须复跑 0 失败。

#### 场景：测试面

- Given：实现完成
- When：跑新增与既有面
- Then：0 失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/known-failures-unescape.test.mjs「round-trip：含反斜杠锚定模式 add→三读侧解析原样→judgeTapOutput 豁免命中」+「三读侧一致性：块/流式×双引/单引/裸键 fixture」
FR-02: test/known-failures-unescape.test.mjs「remove 诚实文案：全命中无未命中括注 / 部分未命中仅注记未命中键 + 原样键匹配」
FR-03: test/known-failures-unescape.test.mjs「回归面：config-known-failures / verify-postcheck-known-failures / doctor-local-yaml 复跑 0 失败」
