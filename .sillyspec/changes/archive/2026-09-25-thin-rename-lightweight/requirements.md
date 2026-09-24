---
author: flow-machine-draft
created_at: 2026-09-24T23:02:32.292Z
---
# 需求规格（Requirements）— 2026-09-25-thin-rename-lightweight

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:a851c34e32991d7da5accc045e968acce58c03c9d2653f4fe0625a314184be3b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-rename-lightweight 留痕重锚 -->
### FR-01: src 与 templates/SKILL/config-schema 的全部用
Given flow 薄跑道在跑
When flow done 裁决执行
Then src 与 templates/SKILL/config-schema 的全部用户面文案（console 输出、机器稿模板、任务书、简报、横幅、schema 描述）无薄流程族残留

### FR-02: 测试断言与新文案同步全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 测试断言与新文案同步全绿

### FR-03: 英文 thin 字面与行为零变化
Given flow 薄跑道在跑
When flow done 裁决执行
Then 英文 thin 字面与行为零变化
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
全套 flow 系 50 例 + test:core 176 例 + lint（文案断言随替换同步，绿即证 UI/测试一致）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
全套 flow 系 50 例 + test:core 176 例 + lint（文案断言随替换同步，绿即证 UI/测试一致）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
全套 flow 系 50 例 + test:core 176 例 + lint（文案断言随替换同步，绿即证 UI/测试一致）
