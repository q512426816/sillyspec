---
author: flow-machine-draft
created_at: 2026-10-03T05:50:33.844Z
---
# 需求规格（Requirements）— 2026-10-03-doc-anchor-refresh

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: platform-interface-map.md 行号锚与工作区实态对齐——失效引用归零
Given docs/sillyspec/platform-interface-map.md 四处 src/index.js 行号锚（4145/4097/3910/4007）因并行会话在 3175 区插行统一漂移 +6（HEAD 位原在容差窗内，归因实证）
When 机械刷新锚点到当前符号位（4151 pullList / 4103 collectStatus / 3916 probeSillyHub / 4013 POINTER_STATUS）
Then doc-ref-check 失效引用清单 4/93 → 0/93（关键词断言保留不降级——不加 ? 跳过位）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/doc-ref-check.test.mjs 全件——修复前「4/93 处引用失效」、修复后「93 处引用全通过（68 处带关键词断言）」实测对照
