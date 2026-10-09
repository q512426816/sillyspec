---
author: flow-machine-draft
created_at: 2026-10-09T00:27:19.171Z
---
# 提案书（Proposal）— 2026-10-09-graph-docrefs-noise

## 动机

任务原话转写：知识图文档引用检查降噪 + 平台侧文档真欠账处置。

动机与背景：
doctor graph-doc-dangling-ref 报 1439 条悬空，普查实证大部分是检查口径伪影：①813 条裸文件名引用（config.py 实指 backend/app/core/config.py 类短引用）——文档语境合法，且 438 种裸名中 304 种多义不可盲连，悬空判定对它们不成立；②约 260 条跨仓目标（backend/frontend/sillyhub-daemon 前缀——平台代码在独立仓 multi-agent-platform，本仓无目录）；③changelog 悬空 1 条是（P2）后缀没剥的解析 bug；④提取器少量空/纯数字产物。修完后剩余才是真文档欠账：平台侧 64 张缺卡（backend 14/frontend 18/daemon 15 等）与本仓可核实的失效引用。

成功标准：
- parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零
- graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成
- extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃
- 降噪后真图复跑：doc/scan 悬空降到真实数（本仓存在性可判的带路径引用）；平台侧 64 缺卡清单钉进 doctor 输出（已有 graph-module-doc-gap）并对其中本仓可产内容的部分（backend 14 张——scan STRUCTURE 目录职责表在场）补定位级卡片，跨仓不可产的（frontend/daemon 等源码不在本仓）留 doctor advisory 不伪造
- 全量测试与 lint 零回归

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零
2. graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成
3. extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃
4. 降噪后真图复跑：doc/scan 悬空降到真实数（本仓存在性可判的带路径引用）；平台侧 64 缺卡清单钉进 doctor 输出（已有 graph-module-doc-gap）并对其中本仓可产内容的部分（backend 14 张——scan STRUCTURE 目录职责表在场）补定位级卡片，跨仓不可产的（frontend/daemon 等源码不在本仓）留 doctor advisory 不伪造
5. 全量测试与 lint 零回归

## 成功标准（可验证）

1. parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零
2. graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成
3. extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃
4. 降噪后真图复跑：doc/scan 悬空降到真实数（本仓存在性可判的带路径引用）；平台侧 64 缺卡清单钉进 doctor 输出（已有 graph-module-doc-gap）并对其中本仓可产内容的部分（backend 14 张——scan STRUCTURE 目录职责表在场）补定位级卡片，跨仓不可产的（frontend/daemon 等源码不在本仓）留 doctor advisory 不伪造
5. 全量测试与 lint 零回归
