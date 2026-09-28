---
author: flow-machine-draft
created_at: 2026-09-28T06:39:48.179Z
---
# 提案书（Proposal）— 2026-09-28-known-failures-hardening

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ac3807f8444fedff05bfba23d066a44a259eaa97733aa3fe77706781a7c2876e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
任务原话转写：背景：评审实证 M1 现行正确性风险——judgeWithKnownFailures 在 exitCode 非零且全部失败行命中豁免时判 passed，而 local.yaml 豁免清单含裸子串宽模式（双横线空格、AssertionError、summary 等），真实测试失败可被整批吞掉（go 的 FAIL 行、真实断言行均可命中）；且 local.yaml 为 gitignored 本地文件，豁免不可移植不可审计（P5）。
成功标准：
- 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正则匹配整行（trim 后），无锚定者维持子串（跨仓向后兼容）
- 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tests、行首 AssertionError 等形态）只能被锚定式模式豁免，裸子串模式一律不豁免——裸子串吞真失败（如双横线空格吞 go FAIL 行）的通路被物理关闭
- 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免（先例 redlines.yaml），loader 合并读取入库文件与 local.yaml（机器特有类留本地）；既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告落地后删
- 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
- 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go FAIL 行不被吞四个关键行为
- 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:6c3f8b99be47b6aaed8b7f0dd6040ae597d3116ab4b0ff46f939d396da64badb:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正则匹配整行（trim 后），无锚定者维持子串（跨仓向后兼容）
2. 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tests、行首 AssertionError 等形态）只能被锚定式模式豁免，裸子串模式一律不豁免——裸子串吞真失败（如双横线空格吞 go FAIL 行）的通路被物理关闭
3. 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免（先例 redlines.yaml），loader 合并读取入库文件与 local.yaml（机器特有类留本地）
4. 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告落地后删
5. 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
6. 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go FAIL 行不被吞四个关键行为
7. 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:dedf483335de004c6e20b985b3a5e9063540fd631605d5e239600f4d01f0a565:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
1. 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正则匹配整行（trim 后），无锚定者维持子串（跨仓向后兼容）
2. 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tests、行首 AssertionError 等形态）只能被锚定式模式豁免，裸子串模式一律不豁免——裸子串吞真失败（如双横线空格吞 go FAIL 行）的通路被物理关闭
3. 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免（先例 redlines.yaml），loader 合并读取入库文件与 local.yaml（机器特有类留本地）
4. 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告落地后删
5. 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
6. 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go FAIL 行不被吞四个关键行为
7. 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
