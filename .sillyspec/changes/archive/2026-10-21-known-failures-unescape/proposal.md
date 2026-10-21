---
author: flow-machine-draft
created_at: 2026-10-21T17:02:21.888Z
---
# 提案书（Proposal）— 2026-10-21-known-failures-unescape

## 动机

任务原话转写：known_failures 三读侧 YAML 反转义对称

动机（2026-10-21-verify-reuse-large-repo 收口实战转写）：config known-failures add 写侧 renderKey 按规范把模式转义为 YAML 双引号形态（doc-ref-check\.test\.mjs$ 之类带 \. 锚定正则写成 "…\.…"），但三个读侧——src/verify-postcheck.js extractKnownFailures（gate 判账豁免）、src/docs-check.js known_failures 提取、src/config-known-failures.js parseKnownFailureKeys（CLI list/remove）——都只剥引号不反转义：含反斜杠的锚定模式到达 buildExemptPats 时带字面双反斜杠，正则语义变成「字面反斜杠+任意字符」，豁免静默永不命中；CLI remove 用用户原样键匹配存储态转义键必然未命中（文案却恒打「已移除」+括注静默忽略）。实战被逼手改 local.yaml 绕过。

成功标准：
- 三读侧对双引号条目做 YAML 反转义（\→\、\"→" 等），单引号条目 ''→'；add→判账 round-trip 后用户模式原样到达豁免匹配层（含反斜杠锚定模式真实命中失败行）
- 三读侧对同一文件解析结果一致（新共享叶子 helper 单点实现，三处 import，不再各自拷贝）
- CLI remove 文案诚实：两形态统一返回 removedCount，仅未命中键注记未命中；remove 以用户原样键命中存储键
- 新增 round-trip/一致性直测 + 既有面（config-known-failures / verify-postcheck-known-failures / doctor-local-yaml / docs 相关）全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 三读侧对双引号条目做 YAML 反转义（\→\、\"→" 等），单引号条目 ''→'；add→判账 round-trip 后用户模式原样到达豁免匹配层（含反斜杠锚定模式真实命中失败行）
2. 三读侧对同一文件解析结果一致（新共享叶子 helper 单点实现，三处 import，不再各自拷贝）
3. CLI remove 文案诚实：两形态统一返回 removedCount，仅未命中键注记未命中；remove 以用户原样键命中存储键
4. 新增 round-trip/一致性直测 + 既有面（config-known-failures / verify-postcheck-known-failures / doctor-local-yaml / docs 相关）全绿

## 成功标准（可验证）

1. 三读侧对双引号条目做 YAML 反转义（\→\、\"→" 等），单引号条目 ''→'；add→判账 round-trip 后用户模式原样到达豁免匹配层（含反斜杠锚定模式真实命中失败行）
2. 三读侧对同一文件解析结果一致（新共享叶子 helper 单点实现，三处 import，不再各自拷贝）
3. CLI remove 文案诚实：两形态统一返回 removedCount，仅未命中键注记未命中；remove 以用户原样键命中存储键
4. 新增 round-trip/一致性直测 + 既有面（config-known-failures / verify-postcheck-known-failures / doctor-local-yaml / docs 相关）全绿
